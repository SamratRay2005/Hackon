import { NextRequest, NextResponse } from "next/server";
import { queryGemini, queryGroq, db } from "@/lib/services";
import { PRODUCT_CATALOG } from "@/lib/catalog";

export async function POST(req: NextRequest) {
  try {
    const { image, imageName, userId, email, ipAddress, sku, itemName, priorReturns, claimType = "damaged_product", isDamageVisible, questionnaireAnswers, nonVisibleCategory } = await req.json();

    if (!userId || !image || !sku) {
      return NextResponse.json({ error: "Missing required fields (userId, image, or SKU)" }, { status: 400 });
    }

    // 1. Run parallel processes: Groq Vision (Damage shadows & staging checking)
    const prompt = claimType === "different_product" 
      ? `You are a retail return fraud image auditor.
We are providing you with up to two images in this exact order:
1. Customer-submitted return photo.
2. Catalog reference image (if available).

Analyze the customer-submitted return photo to verify if the product is DIFFERENT from the purchased item and its catalog reference:
Purchased Product Name: "${itemName || "Product"}" (SKU: "${sku}").

Verify if the returned product in the photo is a DIFFERENT product.
First, execute a chain of thought reasoning process:
- Describe the visual characteristics of the product in the customer-submitted photo (e.g., shape, color, apparent material, defining features).
- Describe the visual characteristics of the product in the catalog reference image.
- Compare the two descriptions. Do the core product type, model, and form factor match exactly?
- Conclude whether the customer photo shows a different product.

Set "isRelevant" to false if the product in the customer photo is visually DIFFERENT in model, form factor, design, brand, or category from the catalog reference image (e.g. returning a black electric drip coffee machine instead of a white manual ceramic pour-over kettle setup, or a deodorant spray can instead of a glass perfume bottle). They must match precisely in product type, model design, and style.
Set "isRelevant" to true only if the product in the customer photo appears to be the correct product matching the visual model type and design of the catalog reference image.
Set "isDamaged" to false.

Assess the likelihood of fraud along three specific dimensions (score each 0-10 where 0 is pristine/legit, and 10 is clear fraud/staging):
1. aiGenerationScore: Probability that the photo contains AI-generated/modified elements or is entirely synthetic.
2. damagePlausibility: Set to 0 since we are focusing on product verification.
3. photoStagingSigns: Evidence of staging, professional lighting, or multiple background artifacts.

Provide your analysis in the following strict JSON format:
{
  "reasoning": "Your step-by-step chain of thought comparing the customer image and catalog reference image.",
  "aiGenerationScore": 0.0 to 10.0,
  "damagePlausibility": 0.0,
  "photoStagingSigns": 0.0 to 10.0,
  "isRelevant": true/false,
  "isDamaged": false,
  "productVerificationNotes": "Evidence confirming or disproving whether the item is a different product by comparing it to the catalog reference image (color, style, category mismatches).",
  "defectExplanation": "A concise explanation of whether the item is different from the catalog item and any staging/AI anomalies."
}`
      : (isDamageVisible === false 
        ? `You are a retail return fraud image auditor.
We are providing you with up to two images in this exact order:
1. Customer-submitted return photo.
2. Catalog reference image (if available).

Analyze the customer-submitted return photo to verify if the correct product is returned matching the catalog reference image:
Purchased Product Name: "${itemName || "Product"}" (SKU: "${sku}").

Note: The user reports that the product has an INTERNAL/FUNCTIONAL defect that is NOT visible on the outside.
User Diagnostic Details: ${JSON.stringify(questionnaireAnswers || {})}

Perform a Product Check. First, execute a chain of thought reasoning process:
- Describe the visual characteristics of the product in the customer-submitted photo (e.g., shape, color, apparent material, defining features).
- Describe the visual characteristics of the product in the catalog reference image.
- Compare the two descriptions. Do the core product type, model, and form factor match exactly?
- Conclude whether the customer photo shows the correct product.

Set "isRelevant" to false if the product in the customer photo is visually DIFFERENT in model, form factor, design, brand, or category from the catalog reference image (e.g. returning a black electric drip coffee machine instead of a glass cup of iced coffee beverage or a pour-over dripper setup). They must match precisely in product type, model design, and style.
Set "isRelevant" to true only if the product in the customer photo appears to be the correct product matching the visual model type and design of the catalog reference image.
Since the defect is internal, do not search for physical cracks/tears. Mark "isDamaged" as true because of the reported functional issue.

Assess the likelihood of fraud along three specific dimensions (score each 0-10 where 0 is pristine/legit, and 10 is clear fraud/staging):
1. aiGenerationScore: Probability that the photo contains AI-generated/modified elements or is entirely synthetic.
2. damagePlausibility: Set to 0 since the damage is functional/internal.
3. photoStagingSigns: Evidence of staging, professional lighting, or multiple background artifacts.

Provide your analysis in the following strict JSON format:
{
  "reasoning": "Your step-by-step chain of thought comparing the customer image and catalog reference image.",
  "aiGenerationScore": 0.0 to 10.0,
  "damagePlausibility": 0.0,
  "photoStagingSigns": 0.0 to 10.0,
  "isRelevant": true/false,
  "isDamaged": true,
  "productVerificationNotes": "Evidence verifying correct product identity against the catalog reference.",
  "defectExplanation": "A concise explanation confirming that the product identity matches (or doesn't match) the catalog reference and summarizing the user's reported functional defect."
}`
        : `You are a retail return fraud image auditor.
We are providing you with up to two images in this exact order:
1. Customer-submitted return photo.
2. Catalog reference image (if available).

Analyze the customer-submitted return photo to verify if the correct product is returned matching the catalog reference image, and if it is actually damaged:
Purchased Product Name: "${itemName || "Product"}" (SKU: "${sku}").

Perform two main checks:
1. Product check: 
   First, execute a chain of thought reasoning process:
   - Describe the visual characteristics of the product in the customer-submitted photo (e.g., shape, color, apparent material, defining features).
   - Describe the visual characteristics of the product in the catalog reference image.
   - Compare the two descriptions. Do the core product type, model, and form factor match exactly?
   - Conclude whether the customer photo shows the correct product.
   Set "isRelevant" to false if the product in the customer photo is visually DIFFERENT in model, form factor, design, brand, or category from the catalog reference image (e.g. returning a black electric drip coffee machine instead of a glass cup of iced coffee beverage or a pour-over dripper setup). They must match precisely in product type, model design, and style.
   Set "isRelevant" to true only if the product in the customer photo appears to be the correct product matching the visual model type and design of the catalog reference image.
2. Damage check: Assess if there is visible physical damage (like tears, cracks, dents, broken parts, scuffs, etc.) on the returned item. Set "isDamaged" to true if you see clear visual evidence of defect or damage. Set "isDamaged" to false if the product appears pristine, brand new, or shows no damage.

Assess the likelihood of fraud along three specific dimensions (score each 0-10 where 0 is pristine/legit, and 10 is clear fraud/staging):
1. aiGenerationScore: Probability that the photo contains AI-generated/modified elements or is entirely synthetic.
2. damagePlausibility: How likely the defect was caused by shipping/wear (0) versus intentional physical damage like cuts or tears (10).
3. photoStagingSigns: Evidence of staging, professional lighting, or multiple background artifacts.

Provide your analysis in the following strict JSON format:
{
  "reasoning": "Your step-by-step chain of thought comparing the customer image and catalog reference image, and analyzing for damage.",
  "aiGenerationScore": 0.0 to 10.0,
  "damagePlausibility": 0.0 to 10.0,
  "photoStagingSigns": 0.0 to 10.0,
  "isRelevant": true/false,
  "isDamaged": true/false,
  "productVerificationNotes": "Evidence verifying correct product identity against the catalog reference.",
  "defectExplanation": "A concise explanation of whether the product matches the catalog reference, whether clear damage is visible, and any staging/AI anomalies."
}`);

    // Define Gemini Response Schema
    const geminiResponseSchema = {
      type: "OBJECT",
      properties: {
        reasoning: { type: "STRING", description: "Step-by-step chain of thought reasoning." },
        aiGenerationScore: { type: "NUMBER", description: "Score from 0.0 to 10.0 for AI generation." },
        damagePlausibility: { type: "NUMBER", description: "Score from 0.0 to 10.0 for damage plausibility." },
        photoStagingSigns: { type: "NUMBER", description: "Score from 0.0 to 10.0 for photo staging signs." },
        isRelevant: { type: "BOOLEAN", description: "Whether the product in the photo matches the SKU/item description." },
        isDamaged: { type: "BOOLEAN", description: "Whether there is visible physical damage or defect on the product." },
        productVerificationNotes: { type: "STRING", description: "Evidence confirming or disproving whether the item is the correct product." },
        defectExplanation: { type: "STRING", description: "A concise explanation of the analysis." }
      },
      required: ["reasoning", "aiGenerationScore", "damagePlausibility", "photoStagingSigns", "isRelevant", "isDamaged", "productVerificationNotes", "defectExplanation"]
    };

    // Parallel calls setup: call Gemini with fallback to Groq/mock
    const isSvg = image.startsWith("data:image/svg+xml");

    const groqPromise = (async () => {
      if (isSvg) {
        // Let sample_item_close_up.svg act as the wrong product mock for verification testing
        let isRelevant = true;
        let isDamaged = true;
        let shouldRetake = false;

        if (claimType === "different_product") {
          // If different product was claimed:
          // Let sample_genuine_claim.svg and sample_staged_claim.svg represent SAME product (isRelevant: true -> causes shouldRetake: true)
          // Let sample_item_close_up.svg represent DIFFERENT product (isRelevant: false -> claim validated -> shouldRetake: false)
          const isSame = imageName !== "sample_item_close_up.svg";
          isRelevant = isSame;
          isDamaged = false;
          shouldRetake = isSame;
        } else {
          // If damaged product was claimed:
          // Let sample_item_close_up.svg represent DIFFERENT product (isRelevant: false -> causes shouldRetake: true)
          // Let sample_genuine_claim.svg represent correct product + damaged (isRelevant: true, isDamaged: true -> shouldRetake: false)
          // Let sample_staged_claim.svg represent correct product + pristine/no damage (isRelevant: true, isDamaged: false -> shouldRetake: false)
          if (imageName === "sample_item_close_up.svg") {
            isRelevant = false;
            isDamaged = false;
            shouldRetake = true;
          } else if (imageName === "sample_staged_claim.svg") {
            isRelevant = true;
            isDamaged = isDamageVisible === false ? true : false; // If functional, we treat it as damaged
            shouldRetake = false;
          } else {
            isRelevant = true;
            isDamaged = true;
            shouldRetake = false;
          }
        }

        return {
          content: JSON.stringify({
            reasoning: "Mock chain of thought evaluation. Comparing mock image signatures with catalog reference.",
            aiGenerationScore: shouldRetake ? 8.0 : 0.0,
            photoStagingSigns: 0.0,
            damagePlausibility: isDamaged ? 8.0 : 0.0,
            isRelevant,
            isDamaged,
            productVerificationNotes: isRelevant
              ? "Product aligns with catalog reference format."
              : `The scanned return photo shows a different visual profile than the purchased "${itemName || "Product"}" (SKU: ${sku}).`,
            defectExplanation: shouldRetake
              ? "Verification mismatch triggered. Photo retake required."
              : "Demo scan completed."
          }),
          fromMock: true
        };
      }

      const refImageUrl = db.getSKUReferenceImage(sku);

      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
              }
            }
          ] as any[]
        }
      ];

      if (refImageUrl) {
        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: refImageUrl
          }
        });
      }

      const geminiResult = await queryGemini({
        model: "gemini-2.5-flash",
        messages: messages,
        response_format: { type: "json_object" },
        response_schema: geminiResponseSchema
      });
      if (geminiResult) {
        return { content: geminiResult.content, fromMock: false };
      }
      console.warn("Gemini query failed in risk-mitigation, falling back to Groq / Mock...");
      const groqRes = await queryGroq({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: messages,
        response_format: { type: "json_object" }
      });
      return { content: groqRes.content, fromMock: groqRes.fromMock };
    })();

    // 2. Call Hive Moderation API (AI Image Detection)
    // Using a promise so it executes in parallel
    const hivePromise = (async () => {
      const hiveKey = process.env.HIVE_MODERATION_API_KEY;
      if (hiveKey && hiveKey.trim() !== "") {
        try {
          // Hive API accepts base64 or URL
          const res = await fetch("https://api.thehive.ai/api/v2/media/scan", {
            method: "POST",
            headers: {
              "Authorization": `token ${hiveKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              media: {
                data: image.split(",")[1] || image
              }
            })
          });
          if (res.ok) {
            const data = await res.json();
            // Hive response has classes for ai_generated
            const aiClass = data.status.output[0].classes.find((c: any) => c.class === "ai_generated");
            return aiClass ? Math.round(aiClass.score * 100) : 0;
          }
        } catch (e) {
          console.error("Hive Moderation API call failed:", e);
        }
      }
      return null; // Signals fallback
    })();

    // 3. Call IPQS API (IP and Email risk)
    const ipqsPromise = (async () => {
      const ipqsKey = process.env.IPQS_API_KEY;
      if (ipqsKey && ipqsKey.trim() !== "") {
        try {
          const formattedIp = ipAddress || "8.8.8.8";
          const res = await fetch(`https://www.ipqualityscore.com/api/json/ip/${ipqsKey}/${formattedIp}?strictness=1&allow_public_access_points=true`);
          if (res.ok) {
            const data = await res.json();
            return data.fraud_score || 0; // returns 0-100
          }
        } catch (e) {
          console.error("IPQS API call failed:", e);
        }
      }
      return null;
    })();

    // Await all parallel signals
    const [groqRes, hiveScore, ipqsScore] = await Promise.all([
      groqPromise,
      hivePromise,
      ipqsPromise
    ]);

    let cleanContent = groqRes.content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    const groqAnalysis = JSON.parse(cleanContent);

    // Scale Groq scores from 0-10 to 0-100
    const groqAiScore = Math.round((groqAnalysis.aiGenerationScore || 0) * 10);
    const groqDamagePlausibility = Math.round((groqAnalysis.damagePlausibility || 0) * 10);
    const groqStagingSigns = Math.round((groqAnalysis.photoStagingSigns || 0) * 10);
    const isRelevant = groqAnalysis.isRelevant !== false;
    const isDamaged = groqAnalysis.isDamaged === true;
    const productNotes = groqAnalysis.productVerificationNotes || "";

    // Determine if photo should be retaken based on claimType rules:
    // 1. different_product claim + Gemini flags same product (isRelevant === true) -> shouldRetake
    // 2. damaged_product claim + Gemini flags different product (isRelevant === false) -> shouldRetake
    let shouldRetake = false;
    let retakeReason = "";

    if (claimType === "different_product") {
      if (isRelevant) {
        shouldRetake = true;
        retakeReason = `The photo shows the correct "${itemName || "Product"}", but you claimed a different product was returned. Please take a new photo clearly showing the different product.`;
      }
    } else {
      // damaged_product
      if (!isRelevant) {
        shouldRetake = true;
        retakeReason = `The photo shows a different product, but you claimed the product is damaged. Please take a new photo clearly showing the correct damaged product.`;
      }

      // Check category mismatch for functional claims
      if (isDamageVisible === false) {
        const product = PRODUCT_CATALOG.find(p => p.sku === sku);
        const cat = product ? product.category : "Other";
        let hasMismatch = false;
        if (nonVisibleCategory === "electronics") {
          if (cat !== "Electronics" && cat !== "Home & Kitchen") {
            hasMismatch = true;
          }
        } else if (nonVisibleCategory === "apparel") {
          if (cat !== "Apparel" && cat !== "Footwear") {
            hasMismatch = true;
          }
        }

        if (hasMismatch) {
          shouldRetake = true;
          retakeReason = `Category Mismatch: You selected '${nonVisibleCategory}' diagnostics, but the purchased product '${itemName}' is classified under category '${cat}'. Please correct your diagnostic category.`;
        }
      }
    }

    // Combine Hive signal and Groq AI signal
    const finalAiScore = hiveScore !== null ? Math.max(hiveScore, groqAiScore) : groqAiScore;

    // 4. Calculate User Return Velocity Score (with Sybil Aggregation check)
    const allClaims = await db.getClaims();
    const emailDomain = email && email.includes("@") ? email.split("@")[1] : "";

    const matchingClaims = allClaims.filter((c: any) => {
      const isSameUser = c.userId === userId;
      const isSameDomain = emailDomain && c.email && c.email.endsWith(emailDomain);
      return isSameUser || isSameDomain;
    });

    const userHistory = await db.getUserReturnHistory(userId, parseInt(priorReturns) || 0);
    // Combine local claims count with historical domain matching
    const totalVelocityCount = Math.max(userHistory.totalReturns30Days, matchingClaims.length);
    const velocityScore = Math.min(100, totalVelocityCount * 25);

    // 5. Calculate IPQS Risk Score (fallback to simulated IP score if null)
    const finalIpqsScore = ipqsScore !== null ? ipqsScore : (email && email.includes("fraud") ? 95 : 15);

    // 6. Final Weighted Score Formula & Verdict
    let weightedRiskScore = 0;
    let recommendedAction: "APPROVE" | "MANUAL_REVIEW" | "BLOCK" = "APPROVE";

    if (shouldRetake) {
      weightedRiskScore = 100;
      recommendedAction = "BLOCK";
    } else if (claimType === "different_product") {
      // Validated: different product claimed, and it IS different
      weightedRiskScore = 10;
      recommendedAction = "APPROVE";
    } else {
      // damaged_product
      if (!isDamaged) {
        // Pristine item returned but claimed damaged
        weightedRiskScore = 85;
        recommendedAction = "MANUAL_REVIEW";
      } else {
        // Correct item returned and is indeed damaged
        weightedRiskScore = Math.round(
          (finalAiScore * 0.5) +
          (velocityScore * 0.3) +
          (finalIpqsScore * 0.2)
        );
        const product = PRODUCT_CATALOG.find(p => p.sku === sku);
        const itemPrice = product ? product.price : 50.00;
        if (itemPrice > 200) {
          if (weightedRiskScore > 50) recommendedAction = "BLOCK";
          else if (weightedRiskScore >= 15) recommendedAction = "MANUAL_REVIEW";
        } else {
          if (weightedRiskScore > 70) recommendedAction = "BLOCK";
          else if (weightedRiskScore >= 40) recommendedAction = "MANUAL_REVIEW";
        }
      }
    }

    // Dynamic AI Signal list for back-office returns console
    const signals: string[] = [];
    if (shouldRetake) {
      signals.push("RETAKE REQUIRED: Photo content conflicts with claims context.");
    } else if (claimType === "different_product") {
      signals.push("VERIFIED: Returned item is different from purchased catalog product.");
    } else {
      signals.push("VERIFIED: Product matches catalog reference identity.");
      if (isDamaged) {
        if (isDamageVisible === false) {
          signals.push("INTAKE DETAILS: User reported functional/internal defect (no external physical damage visible).");
        } else {
          signals.push("VERIFIED: Clear physical damage/defects detected.");
        }
      } else {
        signals.push("WARNING: Product shows no visible physical damage (claims pristine).");
      }
    }

    if (finalAiScore > 65) {
      signals.push(`High probability of synthetic modifications / image manipulation (${finalAiScore}%).`);
    } else if (finalAiScore > 35) {
      signals.push("Minor texture inconsistencies detected by AI image analyzer.");
    }

    if (groqStagingSigns > 60) {
      signals.push("Staging indicators: artificial lighting setups or inconsistent drop-shadows.");
    }

    if (velocityScore > 50) {
      signals.push(`User returns frequency is elevated (${totalVelocityCount} claims in 30d).`);
    }

    // Save claim record in DynamoDB return ledger
    const claimRecord = await db.saveClaim(userId, {
      sku,
      item: itemName || "Product",
      riskScore: weightedRiskScore,
      email,
      status: recommendedAction === "APPROVE" ? "APPROVED" : (recommendedAction === "BLOCK" ? "BLOCKED" : "MANUAL_REVIEW"),
      imageUrl: "data:image/jpeg;base64,image_placeholder" // in-memory placeholder
    });

    return NextResponse.json({
      success: true,
      riskScore: weightedRiskScore,
      recommendedAction,
      isRelevant,
      isDamaged,
      isDamageVisible,
      shouldRetake,
      retakeReason,
      productVerificationNotes: productNotes,
      signals,
      breakdown: {
        aiGenerationScore: finalAiScore,
        photoStagingSigns: groqStagingSigns,
        damagePlausibility: groqDamagePlausibility,
        userVelocityScore: velocityScore,
        ipqsScore: finalIpqsScore
      },
      reasoning: groqAnalysis.reasoning,
      defectExplanation: groqAnalysis.defectExplanation,
      claim: claimRecord,
      fromMock: groqRes.fromMock
    });
  } catch (error: any) {
    console.error("Risk Mitigation API Route Error:", error);
    return NextResponse.json({ error: "Failed to evaluate return risk" }, { status: 500 });
  }
}
