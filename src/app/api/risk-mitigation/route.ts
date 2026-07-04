import { NextRequest, NextResponse } from "next/server";
import { queryGemini, queryGroq, db } from "@/lib/services";
import { PRODUCT_CATALOG } from "@/lib/catalog";

export async function POST(req: NextRequest) {
  try {
    const { image, userId, email, ipAddress, sku, itemName, priorReturns } = await req.json();

    if (!userId || !image || !sku) {
      return NextResponse.json({ error: "Missing required fields (userId, image, or SKU)" }, { status: 400 });
    }
    // 1. Run parallel processes: Groq Vision (Damage shadows & staging checking)
    const prompt = `You are a forensic image auditor specializing in retail returns fraud.
Analyze the uploaded damage claim photo. Assess the likelihood of fraud along three specific dimensions (score each 0-10 where 0 is pristine/legit, and 10 is clear fraud/staging):
1. aiGenerationScore: Probability that the photo contains AI-generated/modified elements or is entirely synthetic. Check for warping, repeating textures, or anatomical errors.
2. damagePlausibility: How likely it is that the defect was caused by shipping/wear versus intentional physical damage (like cutting, tearing with scissors).
3. photoStagingSigns: Evidence of staging, such as professional photography studio lighting, inconsistent shadows suggesting Photoshop, or multiple background artifacts.

Provide your analysis in the following strict JSON format:
{
  "aiGenerationScore": 0.0 to 10.0,
  "damagePlausibility": 0.0 to 10.0,
  "photoStagingSigns": 0.0 to 10.0,
  "defectExplanation": "A concise explanation of shadow analysis, lighting sources, staging indicators, and AI anomalies."
}`;

    // Parallel calls setup
    // Parallel calls setup: call Gemini with fallback to Groq/mock
    const isSvg = image.startsWith("data:image/svg+xml");

    const groqPromise = (async () => {
      if (isSvg) {
        return {
          content: JSON.stringify({
            aiGenerationScore: 0,
            photoStagingSigns: 0,
            damagePlausibility: 80,
            userVelocityScore: 100,
            ipqsScore: 0,
            recommendedAction: "APPROVE",
            defectExplanation: "Placeholder SVG image used."
          }),
          fromMock: true
        };
      }

      const geminiResult = await queryGemini({
        model: "gemini-2.5-flash",
        messages: [
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
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      if (geminiResult) {
        return { content: geminiResult.content, fromMock: false };
      }
      console.warn("Gemini query failed in risk-mitigation, falling back to Groq / Mock...");
      const groqRes = await queryGroq({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
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
            ]
          }
        ],
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
    const groqAiScore = Math.round(groqAnalysis.aiGenerationScore * 10);
    const groqDamagePlausibility = Math.round(groqAnalysis.damagePlausibility * 10);
    const groqStagingSigns = Math.round(groqAnalysis.photoStagingSigns * 10);

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

    // 6. Final Weighted Score Formula:
    // 50% AI Score (shadows + generation detector)
    // 30% User Velocity Score
    // 20% IPQS IP Risk Score
    const weightedRiskScore = Math.round(
      (finalAiScore * 0.5) +
      (velocityScore * 0.3) +
      (finalIpqsScore * 0.2)
    );

    // 7. Recommended Action thresholds based on dynamic item value
    const product = PRODUCT_CATALOG.find(p => p.sku === sku);
    const itemPrice = product ? product.price : 50.00;

    let recommendedAction: "APPROVE" | "MANUAL_REVIEW" | "BLOCK" = "APPROVE";
    if (itemPrice > 200) {
      // High value items are routed strictly
      if (weightedRiskScore > 50) {
        recommendedAction = "BLOCK";
      } else if (weightedRiskScore >= 15) {
        recommendedAction = "MANUAL_REVIEW";
      }
    } else {
      // Normal thresholds
      if (weightedRiskScore > 70) {
        recommendedAction = "BLOCK";
      } else if (weightedRiskScore >= 40) {
        recommendedAction = "MANUAL_REVIEW";
      }
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
      breakdown: {
        aiGenerationScore: finalAiScore,
        photoStagingSigns: groqStagingSigns,
        damagePlausibility: groqDamagePlausibility,
        userVelocityScore: velocityScore,
        ipqsScore: finalIpqsScore
      },
      defectExplanation: groqAnalysis.defectExplanation,
      claim: claimRecord,
      fromMock: groqRes.fromMock
    });
  } catch (error: any) {
    console.error("Risk Mitigation API Route Error:", error);
    return NextResponse.json({ error: "Failed to evaluate return risk" }, { status: 500 });
  }
}
