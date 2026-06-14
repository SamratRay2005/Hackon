import { NextRequest, NextResponse } from "next/server";
import { queryGroq, db } from "@/lib/services";
import os from "os";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

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

    const prompt = `You are a professional warehouse grading inspector.
You are provided with:
1. The original catalog reference image of the product from the database (Image 1)
2. One or more returned item viewpoint photos (Image 2, Image 3, etc. representing different frames or angles of the same returned item)

Analyze and compare each viewpoint frame of the returned item side-by-side with the original catalog reference image (Image 1) to perform condition grading, detect missing components, incorrect product variants, or damage defects. Check specifically:
- Is this the correct product variant (compare shape, color, branding logos, design elements between the returned viewpoints and catalog reference)?
- Are any critical components, cables, lids, buttons, or accessories visible in the original reference missing in the returned viewpoints?
- Detect visible scratches, dents, scuffs, structural cracks, or wear on the returned item.

Defect taxonomy:
- Grade A: Like New. Item is in pristine condition. Fits the variant perfectly. No visible wear, scratching, or dents. No missing components.
- Grade B: Very Good. Light cosmetic scratches, scuffing, or smudges. No deep dents or cracked housing. 100% functional. Correct variant.
- Grade C: Functional / Worn. Visible heavy cosmetic wear, deep scratches, minor dents. Fully functional but looks used. Correct variant, but may have minor accessory missing.
- Grade D: Damaged / Salvage / Incorrect. Major physical defects (cracked casing, broken hinges, leaks), OR the returned item is the incorrect product variant, OR critical functional components are missing.

Provide your grading analysis in the following strict JSON format. If multiple returned item images are provided, you MUST evaluate each returned viewpoint separately under "viewpoints" and provide a score (0.0 to 10.0) and specific defects for that frame.
{
  "isCorrectVariant": true or false,
  "missingComponents": [
    "List of visible components or accessories from the catalog reference that are missing in the returned item"
  ],
  "viewpoints": [
    {
      "viewpointIndex": 1, 
      "functionalScore": 0.0 to 10.0,
      "defects": ["List of defects found in this specific photo angle"]
    }
  ],
  "overallGrade": "A or B or C or D (Assign based on the average/weakest score of all viewpoints)",
  "resaleCategory": "Excellent Open-Box / Refurbished / Discount Outlet / Liquidation Salvage"
}`;

    const messageContent: Array<any> = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: refImage
        }
      }
    ];

    activeImages.forEach((img: string) => {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`
        }
      });
    });

    const response = await queryGroq({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.content);

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
        viewpoints = activeImages.map((_, index) => {
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
        
        const totalScore = viewpoints.reduce((sum, v) => sum + v.functionalScore, 0);
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
        const totalScore = viewpoints.reduce((sum: number, v: any) => sum + (parseFloat(v.functionalScore) || 0), 0);
        functionalScore = Math.round((totalScore / viewpoints.length) * 100) / 100;
        defects = Array.from(new Set(viewpoints.flatMap((v: any) => v.defects || [])));

        if (isCorrectVariant === false) {
          grade = "D";
        } else {
          if (result.overallGrade) {
            grade = result.overallGrade;
          } else {
            if (functionalScore >= 9.0) grade = "A";
            else if (functionalScore >= 7.5) grade = "B";
            else if (functionalScore >= 5.0) grade = "C";
            else grade = "D";
          }
        }
      } else {
        functionalScore = parseFloat(result.functionalScore) || 8.0;
        defects = result.defects || [];
        grade = result.grade || "B";
        viewpoints = [{ viewpointIndex: 1, functionalScore, defects }];
      }
    }

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
      fromMock: response.fromMock
    });
  } catch (error: any) {
    console.error("Condition Grading API Route Error:", error);
    return NextResponse.json({ error: "Failed to grade returned product" }, { status: 500 });
  }
}

