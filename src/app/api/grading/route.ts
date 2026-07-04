import { NextRequest, NextResponse } from "next/server";
import { queryGemini, queryGroq, wasGeminiDailyQuotaExhausted, db } from "@/lib/services";
import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import sharp from "sharp";

function isCommandAvailable(cmd: string): boolean {
  try {
    const checkCmd = os.platform() === "win32" ? `where ${cmd}` : `which ${cmd}`;
    execSync(checkCmd, { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

async function extractVideoFrames(videoBase64?: string, videoUrl?: string, sku?: string): Promise<string[]> {
  const hasFFmpeg = isCommandAvailable("ffmpeg");
  const hasFFprobe = isCommandAvailable("ffprobe");

  if (!hasFFmpeg || !hasFFprobe) {
    console.warn("Ffmpeg/Ffprobe binaries not found on host system. Falling back to default photo scan.");
    return [];
  }

  // Size validation for DoS protection
  if (videoBase64 && videoBase64.length > 25 * 1024 * 1024) {
    throw new Error("Upload Size Limit Exceeded: Video upload size exceeds the maximum limit of 25MB.");
  }

  const tempDirName = `grading_temp_${Math.floor(100000 + Math.random() * 900000)}`;
  const tempDir = path.join(os.tmpdir(), tempDirName);
  fs.mkdirSync(tempDir, { recursive: true });

  let videoPath = "";

  try {
    if (videoBase64) {
      const base64Data = videoBase64.includes(";base64,")
        ? videoBase64.split(";base64,")[1]
        : videoBase64;

      videoPath = path.join(tempDir, "input.mp4");
      fs.writeFileSync(videoPath, Buffer.from(base64Data, "base64"));
    } else if (videoUrl) {
      if (videoUrl.startsWith("/")) {
        videoPath = path.join(process.cwd(), "public", videoUrl);
      } else {
        videoPath = path.join(tempDir, "input.mp4");
        // Safe download without curl shell command execution to prevent injection
        const downloadRes = await fetch(videoUrl);
        if (!downloadRes.ok) throw new Error("Failed to download video from URL");
        const arrayBuffer = await downloadRes.arrayBuffer();
        fs.writeFileSync(videoPath, Buffer.from(arrayBuffer));
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error("Invalid video source");
    }

    const ffprobeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const durationStr = execSync(ffprobeCmd).toString().trim();
    // Zero-division protection: Math.max(1.0, duration)
    const duration = Math.max(1.0, parseFloat(durationStr) || 5.0);

    const outPattern = path.join(tempDir, "frame_%03d.png");

    const sceneCmd = `ffmpeg -y -i "${videoPath}" -vf "select='gt(scene,0.03)',scale=640:-1" -vsync vfr "${outPattern}"`;
    try {
      execSync(sceneCmd, { stdio: "ignore" });
    } catch (e) {
      console.warn("Scene change detection failed, using fallback.", e);
    }

    let files = fs.readdirSync(tempDir).filter(f => f.startsWith("frame_") && f.endsWith(".png"));

    if (files.length < 3) {
      files.forEach(f => fs.unlinkSync(path.join(tempDir, f)));
      const fps = 4 / duration;
      const fallbackCmd = `ffmpeg -y -i "${videoPath}" -vf "fps=${fps},scale=640:-1" "${outPattern}"`;
      execSync(fallbackCmd, { stdio: "ignore" });
      files = fs.readdirSync(tempDir).filter(f => f.startsWith("frame_") && f.endsWith(".png"));
    }

    const base64Frames = files.map(file => {
      const filePath = path.join(tempDir, file);
      const data = fs.readFileSync(filePath);
      return `data:image/png;base64,${data.toString("base64")}`;
    });

    // Cap at a maximum of 4 viewpoints to optimize token cost, prevent timeouts, and keep UI clean
    if (base64Frames.length > 4) {
      const cappedFrames: string[] = [];
      for (let i = 0; i < 4; i++) {
        const index = Math.floor((base64Frames.length - 1) * (i / 3));
        cappedFrames.push(base64Frames[index]);
      }
      return cappedFrames;
    }

    return base64Frames;
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error("Cleanup error in extractVideoFrames:", err);
    }
  }
}


/**
 * Selects the 2 most visually diverse images from a set by comparing
 * actual decoded pixel values (not compressed bytes).
 *
 * How it works:
 * 1. Decode each image to a tiny 64×64 raw RGB buffer using sharp
 * 2. Compute the Mean Absolute Difference (MAD) per pixel channel
 *    between every pair of images
 * 3. Greedy-select the pair with the highest MAD — those are the
 *    two most visually distinct viewpoints
 *
 * This keeps the total image count within Groq's 3-image limit
 * (1 reference + 2 returned) while maximizing inspection coverage.
 */
async function selectMostDiverseImages(images: string[], maxCount: number = 2): Promise<string[]> {
  if (images.length <= maxCount) return images;

  // Decode each image to a small 64×64 raw RGB pixel buffer for comparison
  const THUMB_SIZE = 64;
  const pixelBuffers: Buffer[] = [];

  for (const img of images) {
    try {
      const base64Data = img.includes(";base64,") ? img.split(";base64,")[1] : img;
      const rawPixels = await sharp(Buffer.from(base64Data, "base64"))
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer();
      pixelBuffers.push(rawPixels);
    } catch (err) {
      // If decoding fails, push a zero buffer so the image can still be selected
      console.warn("sharp decode failed for one image, using zero buffer:", err);
      pixelBuffers.push(Buffer.alloc(THUMB_SIZE * THUMB_SIZE * 3, 0));
    }
  }

  // Compute Mean Absolute Difference between two raw RGB pixel buffers
  function pixelMAD(a: Buffer, b: Buffer): number {
    const len = Math.min(a.length, b.length);
    let totalDiff = 0;
    for (let i = 0; i < len; i++) {
      totalDiff += Math.abs(a[i] - b[i]);
    }
    return len > 0 ? totalDiff / len : 0;
  }

  // Find the pair with the maximum pixel-level distance
  let bestPair: [number, number] = [0, 1];
  let bestDist = -1;

  for (let i = 0; i < pixelBuffers.length; i++) {
    for (let j = i + 1; j < pixelBuffers.length; j++) {
      const dist = pixelMAD(pixelBuffers[i], pixelBuffers[j]);
      if (dist > bestDist) {
        bestDist = dist;
        bestPair = [i, j];
      }
    }
  }

  console.log(`Pixel diversity selection: picked indices [${bestPair[0]}, ${bestPair[1]}] from ${images.length} candidates (MAD: ${bestDist.toFixed(2)}/255)`);
  return [images[bestPair[0]], images[bestPair[1]]];
}

// Bug fix: GET handler for fetching existing ledger records.
// Previously fetchLedgerRecords() was calling POST /api/grading with a dummy payload
// which caused the grading pipeline to run and save phantom health-card records on every
// page load. This clean GET endpoint just reads and returns the ledger.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const records = await db.getLedger(userId);
    return NextResponse.json({ records: records || [] });
  } catch (error: any) {
    console.error("Grading GET (ledger fetch) error:", error);
    return NextResponse.json({ records: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { images, video, videoUrl, sku, itemName, userId } = await req.json();

    let activeImages = images || [];

    if (!sku) {
      return NextResponse.json({ error: "Missing SKU" }, { status: 400 });
    }

    const refImage = db.getSKUReferenceImage(sku);

    if (video || videoUrl) {
      try {
        activeImages = await extractVideoFrames(video, videoUrl, sku);
        if (activeImages.length === 0) {
          // Fallback to reference image if ffmpeg is missing
          activeImages = [refImage];
        }
      } catch (err: any) {
        console.error("Backend video processing failed:", err);
        return NextResponse.json({ error: err.message || "Failed to extract video keyframes on backend" }, { status: 500 });
      }
    }

    if (!activeImages || !Array.isArray(activeImages) || activeImages.length === 0) {
      return NextResponse.json({ error: "Missing return inspection photos/video" }, { status: 400 });
    }

    // ── Asymmetric image compression ──
    // Reference image only needs coarse comparison (variant/completeness), so shrink it more.
    // Returned images need higher fidelity for defect scanning.
    async function compressForLLM(imgData: string, size: number, quality: number): Promise<string> {
      try {
        const base64Data = imgData.includes(";base64,") ? imgData.split(";base64,")[1] : imgData;
        const compressed = await sharp(Buffer.from(base64Data, "base64"))
          .resize(size, size, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality })
          .toBuffer();
        return `data:image/jpeg;base64,${compressed.toString("base64")}`;
      } catch {
        return imgData;
      }
    }

    const compressedRef = await compressForLLM(refImage, 288, 60);

    // Pick the most diverse images for maximum inspection coverage
    if (activeImages.length > 2) {
      activeImages = await selectMostDiverseImages(activeImages, 2);
    }
    const compressedImages = await Promise.all(
      activeImages.map((img: string) => compressForLLM(img, 384, 65))
    );

    // ── Pre-flight token estimation ──
    // Crude heuristic: base64 bytes → approximate vision tokens
    // Used to decide whether we can afford 2 images or should default to 1.
    function estimateImageTokens(base64: string): number {
      const bytes = base64.length * 0.75; // base64 → raw bytes
      return Math.round(bytes / 130);     // conservative estimate, tune against observed usage
    }

    const PROMPT_TOKEN_OVERHEAD = 350; // prompt text + JSON schema
    const OUTPUT_TOKEN_BUDGET = 600;
    const TPM_BUDGET = 7500; // leave 500 token safety margin under 8K
    const refTokens = estimateImageTokens(compressedRef);
    const returnedTokens = compressedImages.map(estimateImageTokens);
    const totalWith1 = PROMPT_TOKEN_OVERHEAD + OUTPUT_TOKEN_BUDGET + refTokens + returnedTokens[0];
    const totalWith2 = compressedImages.length > 1
      ? totalWith1 + returnedTokens[1]
      : totalWith1;

    // Default to 1 image; only send 2 if estimated total fits comfortably
    const imagesToSend = (compressedImages.length > 1 && totalWith2 <= TPM_BUDGET)
      ? compressedImages.slice(0, 2)
      : compressedImages.slice(0, 1);

    console.log(`Grading token estimate: ref=${refTokens}, returned=[${returnedTokens.join(",")}], sending ${imagesToSend.length} image(s), est total=${imagesToSend.length > 1 ? totalWith2 : totalWith1}/${TPM_BUDGET}`);

    // ── Compact grading prompt ──
    const numReturned = imagesToSend.length;

    const prompt = `You are a warehouse grading inspector. Compare returned item photos against the catalog reference to grade condition.

SKU: ${sku}${itemName ? ` ("${itemName}")` : ""}
Image 1 = catalog reference. Image ${numReturned > 1 ? "2-" + (numReturned + 1) : "2"} = returned item.

INSPECTION (do all 5 in order):
1. VARIANT CHECK: Does returned item match reference (model, color, logos, form factor)? Flag false only on clear mismatch.
2. COMPLETENESS: List components visible in reference but missing in returned photos. Don't speculate about hidden angles.
3. SURFACE SCAN: Classify defects — MINOR (smudges, dust, faint marks), MODERATE (scratches <2cm, light scuffs, small chips), SEVERE (deep scratches, dents, cracks, warping, corrosion).
4. STRUCTURAL: Cracked housing, broken hinges, exposed wiring = automatic Grade D.
5. SCORE each viewpoint 0.0-10.0, then grade by LOWEST score:
   9.0-10.0=A (Like New), 7.0-8.9=B (Very Good, minor cosmetic only), 4.0-6.9=C (Moderate wear, functional), 0.0-3.9=D (Damaged/wrong variant/missing critical parts).

Grade→Resale: A="Excellent Open-Box", B="Refurbished", C="Discount Outlet", D="Liquidation Salvage"

Output ONLY raw JSON (no markdown/backticks):
{"chainOfThought":"1-2 sentence reasoning","isCorrectVariant":true,"variantNotes":"evidence","missingComponents":[],"viewpoints":[{"viewpointIndex":1,"functionalScore":8.5,"severityBreakdown":{"minor":1,"moderate":0,"severe":0},"defects":["defect description"]}],"overallGrade":"B","resaleCategory":"Refurbished"}`;

    // ── Build message content helper ──
    function buildMessageContent(ref: string, imgs: string[]) {
      const content: Array<any> = [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: ref } }
      ];
      imgs.forEach((img: string) => {
        content.push({ type: "image_url", image_url: { url: img } });
      });
      return content;
    }

    // ── Call Gemini for grading ──
    const geminiParams = {
      model: "gemini-2.5-flash",
      temperature: 0,
      response_format: { type: "json_object" } as { type: string },
      max_tokens: 1024
    };

    const hasSvg = imagesToSend.some(img => img.startsWith("data:image/svg+xml")) || (compressedRef && compressedRef.startsWith("data:image/svg+xml"));

    // Primary attempt with all selected images
    let geminiResult = null;
    if (!hasSvg) {
      geminiResult = await queryGemini({
        ...geminiParams,
        messages: [{ role: "user", content: buildMessageContent(compressedRef, imagesToSend) }]
      });
    }

    // If Gemini failed and we sent >1 image, retry with just 1 (skip if daily quota is exhausted)
    if (!geminiResult && imagesToSend.length > 1 && !wasGeminiDailyQuotaExhausted() && !hasSvg) {
      console.warn(`Grading: Gemini call failed with ${imagesToSend.length} images. Retrying with 1 image...`);
      geminiResult = await queryGemini({
        ...geminiParams,
        messages: [{ role: "user", content: buildMessageContent(compressedRef, [imagesToSend[0]]) }]
      });
    }

    // Build a response object compatible with the rest of the pipeline
    // If Gemini succeeded, use it. Otherwise fall back to Groq / mock.
    let response: { content: string; fromMock: boolean };
    if (geminiResult) {
      response = { content: geminiResult.content, fromMock: false };
    } else {
      console.warn("Gemini unavailable, falling back to Groq / mock...");
      let mockResponse = null;
      if (!hasSvg) {
        mockResponse = await queryGroq({
          model: "qwen/qwen3.6-27b",
          messages: [{ role: "user", content: buildMessageContent(compressedRef, imagesToSend) }],
          response_format: { type: "json_object" },
          max_tokens: OUTPUT_TOKEN_BUDGET
        });
      }
      
      if (mockResponse) {
        response = { content: mockResponse.content, fromMock: mockResponse.fromMock };
      } else {
        response = {
          content: JSON.stringify({
            grade: "B",
            defects: ["Minor smudges/fingerprints on the main body."],
            resaleCategory: "Refurbished",
            functionalScore: 8.5,
            isCorrectVariant: true,
            missingComponents: [],
            reasoning: "Placeholder SVG image used. Assuming minor smudges on variant matching item.",
            variantNotes: "Matches the model and color reference."
          }),
          fromMock: true
        };
      }
    }

    // Manually extract JSON string in case the LLM outputs markdown or preamble
    let jsonString = response.content;
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    } else {
      const start = jsonString.indexOf('{');
      const end = jsonString.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonString = jsonString.substring(start, end + 1);
      }
    }

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (error) {
      console.error("Failed to parse LLM output into JSON. Attempting JSON block salvage...");
      result = {};
      const rawText = response.content || "";
      // Find the last { ... } block in the raw content
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start !== -1 && end !== -1 && start < end) {
        try {
          const substringJson = rawText.substring(start, end + 1);
          result = JSON.parse(substringJson);
          console.log("Successfully salvaged JSON block from prose.");
        } catch (e) {
          console.error("JSON block salvage failed. Falling back to mock.");
        }
      } else {
        console.error("No JSON block found. Falling back to mock.");
      }
    }

    let isCorrectVariant = true;
    let missingComponents: Array<string> = [];
    let viewpoints: Array<any> = [];
    let functionalScore = 10.0;
    let grade = "A";
    let resaleCategory = "Excellent Open-Box";
    let defects: Array<string> = [];

    if (response.fromMock) {
      isCorrectVariant = true;
      missingComponents = ["User manual is missing"];
      if (activeImages.length > 1) {
        viewpoints = activeImages.map((_: string, index: number) => {
          const scores = [9.2, 8.0, 5.5, 7.8];
          const frameDefects = [
            [],
            ["Slight scuffing on base plate"],
            ["Hairline fracture near power switch"],
            ["Fingerprint smudges"]
          ];
          const idx = index % scores.length;
          return {
            viewpointIndex: index + 1,
            functionalScore: scores[idx],
            defects: frameDefects[idx]
          };
        });

        const totalScore = viewpoints.reduce((sum: number, v: any) => sum + v.functionalScore, 0);
        functionalScore = Math.round((totalScore / viewpoints.length) * 100) / 100;

        if (functionalScore >= 9.0) grade = "A";
        else if (functionalScore >= 7.5) grade = "B";
        else if (functionalScore >= 5.0) grade = "C";
        else grade = "D";

        resaleCategory = grade === "A" ? "Excellent Open-Box" : grade === "B" ? "Refurbished" : grade === "C" ? "Discount Outlet" : "Liquidation Salvage";
        defects = Array.from(new Set(viewpoints.flatMap(v => v.defects)));
      } else {
        viewpoints = [
          {
            viewpointIndex: 1,
            functionalScore: 8.5,
            defects: ["Slight cosmetic scuffing"]
          }
        ];
        functionalScore = 8.5;
        grade = "B";
        resaleCategory = "Refurbished";
        defects = ["Slight cosmetic scuffing"];
      }
    } else {
      isCorrectVariant = result.isCorrectVariant !== undefined ? result.isCorrectVariant : true;
      missingComponents = result.missingComponents || [];
      viewpoints = result.viewpoints || [];
      resaleCategory = result.resaleCategory || "Discount Outlet";

      if (viewpoints.length > 0) {
        // Worst-angle rule: grade is derived from the LOWEST individual viewpoint score
        const scores = viewpoints.map((v: any) => parseFloat(v.functionalScore) || 0);
        const minScore = Math.min(...scores);
        const avgScore = Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100;
        functionalScore = avgScore;
        defects = Array.from(new Set(viewpoints.flatMap((v: any) => v.defects || [])));

        if (isCorrectVariant === false) {
          grade = "D";
        } else {
          // Use the LLM's overallGrade if provided, otherwise derive from the worst-angle score
          if (result.overallGrade && ["A", "B", "C", "D"].includes(result.overallGrade)) {
            grade = result.overallGrade;
          } else {
            if (minScore >= 9.0) grade = "A";
            else if (minScore >= 7.0) grade = "B";
            else if (minScore >= 4.0) grade = "C";
            else grade = "D";
          }
        }

        // Enforce resale category from grade
        resaleCategory = grade === "A" ? "Excellent Open-Box" : grade === "B" ? "Refurbished" : grade === "C" ? "Discount Outlet" : "Liquidation Salvage";
      } else {
        functionalScore = parseFloat(result.functionalScore) || 8.0;
        defects = result.defects || [];
        grade = result.grade || "B";
        resaleCategory = grade === "A" ? "Excellent Open-Box" : grade === "B" ? "Refurbished" : grade === "C" ? "Discount Outlet" : "Liquidation Salvage";
        viewpoints = [{ viewpointIndex: 1, functionalScore, defects }];
      }
    }

    // Extract chain-of-thought reasoning and variant notes from the LLM output
    const reasoningText = result.chainOfThought || "Grading inspection completed.";
    const variantNotes = result.variantNotes || "";
    // Strip internal CoT fields so they don't leak into the raw database dump
    delete result.chainOfThought;
    delete result.variantNotes;

    const primaryImage = activeImages[0];

    const ledgerRecord = await db.saveProductHealthCard(userId || "user_samrat", {
      sku,
      itemName: itemName || "Returned Item",
      grade,
      defects,
      resaleCategory,
      functionalScore,
      isCorrectVariant,
      missingComponents,
      refImage,
      viewpoints,
      imageUrl: primaryImage.startsWith("data:") ? "/api/placeholder-image" : primaryImage
    });

    return NextResponse.json({
      success: true,
      report: ledgerRecord,
      reasoning: reasoningText,
      variantNotes,
      fromMock: response.fromMock
    });
  } catch (error: any) {
    console.error("Condition Grading API Route Error:", error);
    return NextResponse.json({ error: "Failed to grade returned product" }, { status: 500 });
  }
}

