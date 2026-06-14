import { NextRequest, NextResponse } from "next/server";
import { queryGroq, db } from "@/lib/services";

import { PRODUCT_CATALOG } from "@/lib/catalog";

function getDynamicSizeChart(sku: string) {
  const p = PRODUCT_CATALOG.find(x => x.sku === sku);
  if (!p) return null;
  
  const isApparel = p.sizes.includes("S") || p.sizes.includes("M") || p.sizes.includes("L") || p.sizes.includes("XL");
  const isFootwear = p.sizes.includes("7") || p.sizes.includes("8") || p.sizes.includes("9") || p.sizes.includes("10") || p.sizes.includes("11") || p.sizes.includes("12");

  if (isApparel) {
    return {
      name: p.name,
      brand: "UrbanEco",
      chart: [
        { size: "S", chest: "34-36 in", shoulders: "16.5 in", sleeves: "32.5 in" },
        { size: "M", chest: "38-40 in", shoulders: "17.5 in", sleeves: "33.5 in" },
        { size: "L", chest: "42-44 in", shoulders: "18.5 in", sleeves: "34.5 in" },
        { size: "XL", chest: "46-48 in", shoulders: "19.5 in", sleeves: "35.5 in" }
      ],
      dimensions: [
        { size: "S", chest: 35.0, shoulders: 16.5 },
        { size: "M", chest: 39.0, shoulders: 17.5 },
        { size: "L", chest: 43.0, shoulders: 18.5 },
        { size: "XL", chest: 47.0, shoulders: 19.5 }
      ]
    };
  } else if (isFootwear) {
    return {
      name: p.name,
      brand: "EcoStep",
      chart: [
        { size: "7", length: "9.2 in" },
        { size: "8", length: "9.5 in" },
        { size: "9", length: "9.8 in" },
        { size: "10", length: "10.2 in" },
        { size: "11", length: "10.5 in" },
        { size: "12", length: "10.8 in" }
      ],
      dimensions: [
        { size: "7", length: 9.2 },
        { size: "8", length: 9.5 },
        { size: "9", length: 9.8 },
        { size: "10", length: 10.2 },
        { size: "11", length: 10.5 },
        { size: "12", length: 10.8 }
      ]
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { image, brand, sku, sizes, sessionId } = await req.json();

    if (!sku || !image) {
      return NextResponse.json({ error: "Missing SKU or image data" }, { status: 400 });
    }

    const brandData = getDynamicSizeChart(sku);

    if (!brandData) {
      return NextResponse.json({
        error: "Category Mismatch: Sizing templates are currently optimized only for Tops, Jackets, and Footwear. Please enter your sizing manually."
      }, { status: 400 });
    }

    // Secure sessionId from client input
    let secureSessionId = sessionId;
    if (!secureSessionId || secureSessionId.trim() === "" || secureSessionId.includes("../") || secureSessionId.includes("session-temp")) {
      const crypto = require("crypto");
      secureSessionId = `session-${crypto.randomBytes(16).toString("hex")}`;
    }

    // Extract sizing dimension attributes to ask the LLM for
    const dimensionsSample = brandData.dimensions[0];
    const attributes = Object.keys(dimensionsSample).filter(k => k !== "size"); // e.g. ["chest", "shoulders"]

    // Construct Groq prompt asking the LLM to predict the user's numeric measurements
    const prompt = `You are a high-accuracy body-proportion analysis engine.
Analyze the uploaded photo of the customer and predict their physical body dimensions in inches for the following attributes:
${attributes.map(attr => `- ${attr}`).join("\n")}

Be realistic. Base your estimates on the subject's proportions relative to their environment.

You MUST respond ONLY with a JSON object in the following format:
{
  ${attributes.map(attr => `"${attr}": [predicted floating-point value in inches]`).join(",\n  ")},
  "confidenceScore": 0-100 (integer representing sizing prediction confidence),
  "reasoning": "A concise 2-sentence analysis explaining the visual markers (e.g. shoulder slope, torso height, posture) used to estimate these measurements."
}`;

    // Execute query using Groq Llama 4 Scout Vision
    const response = await queryGroq({
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

    const result = JSON.parse(response.content);
    if (response.fromMock) {
      result.chest = result.chest ?? 38.5;
      result.shoulders = result.shoulders ?? 17.2;
      result.length = result.length ?? 28.0;
      result.confidenceScore = result.confidenceScore ?? 94;
    }

    // Validate if a valid human subject was detected
    const isInvalidSubject = attributes.some(attr => {
      const val = parseFloat(result[attr]) || 0;
      return val <= 0 || (attr === "chest" && val < 20) || (attr === "shoulders" && val < 10);
    }) || (result.confidenceScore !== undefined && result.confidenceScore < 10);

    if (isInvalidSubject) {
      return NextResponse.json({ error: "Selfie Validation Failed: No valid human subject or proportions could be resolved in the image." }, { status: 400 });
    }

    let recommendedSize = "";
    let distanceBreakdown: Record<string, number> = {};
    let predictedDimensions: Record<string, number> = {};

    if (response.fromMock) {
      // Set realistic mock predictions for visual rendering
      const isFootwear = sku.includes("SHOE") || sku.includes("SNEAK") || sku.includes("BOOT") || sku.includes("SANDAL") || sku.includes("LOAFER") || sku.includes("CHELSEA") || sku.includes("TRAINER") || sku.includes("SLIP-ON") || sku.includes("OXFORD") || sku.includes("SLIPPER") || sku.includes("BROGUE") || sku.includes("ESPADRIL") || sku.includes("RUN-SHOE") || (brandData.dimensions[0] && (brandData.dimensions[0] as any).length !== undefined);

      if (isFootwear) {
        predictedDimensions = { length: 9.9 };
        distanceBreakdown = { "7": 2.7, "8": 1.7, "9": 0.7, "10": 0.3, "11": 1.3, "12": 2.3 };
        recommendedSize = "10";
      } else {
        predictedDimensions = { chest: 38.5, shoulders: 17.2 };
        distanceBreakdown = { S: 4.12, M: 0.58, L: 4.67, XL: 8.76 };
        recommendedSize = "M";
      }
    } else {
      // Local 1-NN Classification algorithm (Euclidean Distance Matcher)
      let minDistance = Infinity;
      brandData.dimensions.forEach((item: any) => {
        let sumOfSquares = 0;
        attributes.forEach((attr) => {
          const predictedVal = parseFloat(result[attr]) || 0;
          const chartVal = item[attr] || 0;
          sumOfSquares += Math.pow(predictedVal - chartVal, 2);
        });
        const distance = Math.sqrt(sumOfSquares);
        distanceBreakdown[item.size] = Math.round(distance * 100) / 100;
        if (distance < minDistance) {
          minDistance = distance;
          recommendedSize = item.size;
        }
      });

      attributes.forEach((attr) => {
        predictedDimensions[attr] = parseFloat(result[attr]) || 0;
      });
    }

    // Save bracketing detection log in mock database
    const dbRecord = await db.saveCartSession(secureSessionId || "session-temp", {
      sku,
      brand: brandData.brand,
      itemName: brandData.name,
      sizesBracketed: sizes,
      analyzedRecommendation: recommendedSize,
      confidenceScore: result.confidenceScore,
      resolved: false
    });

    return NextResponse.json({
      recommendedSize,
      confidenceScore: result.confidenceScore,
      reasoning: result.reasoning,
      predictedDimensions,
      distanceBreakdown,
      sessionRecord: dbRecord,
      sizeChart: brandData.chart,
      itemName: brandData.name,
      fromMock: response.fromMock
    });
  } catch (error: any) {
    console.error("Size Assist API Route Error:", error);
    return NextResponse.json({ error: "Failed to process size assistant request" }, { status: 500 });
  }
}
