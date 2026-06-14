import { NextRequest, NextResponse } from "next/server";
import { queryGroq, db } from "@/lib/services";

// Curated Static Size Chart Database with explicit numeric dimensions
const SIZE_CHARTS: Record<string, {
  name: string;
  brand: string;
  chart: Array<any>;
  dimensions: Array<{ size: string; chest: number; shoulders?: number; length?: number }>;
}> = {
  "DENIM-JKT-001": {
    name: "Classic Denim Jacket",
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
  },
  "SLIM-FIT-TEE": {
    name: "Eco-Cotton Tee",
    brand: "EarthLoom",
    chart: [
      { size: "S", chest: "35-37 in", length: "27 in" },
      { size: "M", chest: "38-40 in", length: "28 in" },
      { size: "L", chest: "41-43 in", length: "29 in" },
      { size: "XL", chest: "44-46 in", length: "30 in" }
    ],
    dimensions: [
      { size: "S", chest: 36.0, length: 27.0 },
      { size: "M", chest: 39.0, length: 28.0 },
      { size: "L", chest: 42.0, length: 29.0 },
      { size: "XL", chest: 45.0, length: 30.0 }
    ]
  }
};

export async function POST(req: NextRequest) {
  try {
    const { image, brand, sku, sizes, sessionId } = await req.json();

    if (!sku || !image) {
      return NextResponse.json({ error: "Missing SKU or image data" }, { status: 400 });
    }

    const brandData = SIZE_CHARTS[sku] || {
      name: "Standard Fitted Item",
      brand: brand || "Generic",
      chart: [
        { size: "S", chest: "35 in" },
        { size: "M", chest: "38 in" },
        { size: "L", chest: "41 in" }
      ],
      dimensions: [
        { size: "S", chest: 35.0 },
        { size: "M", chest: 38.0 },
        { size: "L", chest: 41.0 }
      ]
    };

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

    let recommendedSize = "";
    let distanceBreakdown: Record<string, number> = {};
    let predictedDimensions: Record<string, number> = {};

    if (response.fromMock) {
      // Set realistic mock predictions for visual rendering
      if (sku === "DENIM-JKT-001") {
        predictedDimensions = { chest: 38.5, shoulders: 17.2 };
        distanceBreakdown = { S: 4.12, M: 0.58, L: 4.67, XL: 8.76 };
        recommendedSize = "M";
      } else {
        predictedDimensions = { chest: 38.0, length: 28.0 };
        distanceBreakdown = { S: 2.24, M: 1.00, L: 3.16, XL: 6.08 };
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
    const dbRecord = db.saveCartSession(sessionId || "session-temp", {
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
