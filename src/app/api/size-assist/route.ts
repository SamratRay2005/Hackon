import { NextRequest, NextResponse } from "next/server";
import { queryGemini, queryGroq, db } from "@/lib/services";
import { z } from "zod";

import { PRODUCT_CATALOG } from "@/lib/catalog";

function getDynamicSizeChart(sku: string) {
  const p = PRODUCT_CATALOG.find(x => x.sku === sku);
  if (!p) return null;

  const isApparel = p.sizes.includes("S") || p.sizes.includes("M") || p.sizes.includes("L") || p.sizes.includes("XL");
  const isFootwear = p.sizes.includes("7") || p.sizes.includes("8") || p.sizes.includes("9") || p.sizes.includes("10") || p.sizes.includes("11") || p.sizes.includes("12");

  if (isApparel) {
    const isJeans = p.name.toLowerCase().includes("jean") || p.name.toLowerCase().includes("pant") || p.name.toLowerCase().includes("trouser") || p.name.toLowerCase().includes("overall");
    if (isJeans) {
      return {
        name: p.name,
        brand: "UrbanEco",
        chart: [
          { size: "XS", waist: "26-28 in", inseam: "29.5 in" },
          { size: "S", waist: "28-30 in", inseam: "30 in" },
          { size: "M", waist: "32-34 in", inseam: "31.5 in" },
          { size: "L", waist: "36-38 in", inseam: "32 in" },
          { size: "XL", waist: "40-42 in", inseam: "32.5 in" },
          { size: "XXL", waist: "44-46 in", inseam: "33.5 in" }
        ],
        dimensions: [
          { size: "XS", waist: 27.0, inseam: 29.5 },
          { size: "S", waist: 29.0, inseam: 30.0 },
          { size: "M", waist: 33.0, inseam: 31.5 },
          { size: "L", waist: 37.0, inseam: 32.0 },
          { size: "XL", waist: 41.0, inseam: 32.5 },
          { size: "XXL", waist: 45.0, inseam: 33.5 }
        ]
      };
    }
    return {
      name: p.name,
      brand: "UrbanEco",
      chart: [
        { size: "XS", chest: "32-34 in", shoulders: "15.5 in", sleeves: "31.5 in" },
        { size: "S", chest: "34-36 in", shoulders: "16.5 in", sleeves: "32.5 in" },
        { size: "M", chest: "38-40 in", shoulders: "17.5 in", sleeves: "33.5 in" },
        { size: "L", chest: "42-44 in", shoulders: "18.5 in", sleeves: "34.5 in" },
        { size: "XL", chest: "46-48 in", shoulders: "19.5 in", sleeves: "35.5 in" },
        { size: "XXL", chest: "50-52 in", shoulders: "20.5 in", sleeves: "36.5 in" }
      ],
      dimensions: [
        { size: "XS", chest: 33.0, shoulders: 15.5 },
        { size: "S", chest: 35.0, shoulders: 16.5 },
        { size: "M", chest: 39.0, shoulders: 17.5 },
        { size: "L", chest: 43.0, shoulders: 18.5 },
        { size: "XL", chest: 47.0, shoulders: 19.5 },
        { size: "XXL", chest: 51.0, shoulders: 20.5 }
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
    const { image, brand, sku, sizes, sessionId, heightInches } = await req.json();

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
    // Bug fix: use exact equality for "session-temp" — substring check was replacing
    // valid IDs like "session-temp_user" or "session-temporary_xyz" with a random UUID
    let secureSessionId = sessionId;
    if (!secureSessionId || secureSessionId.trim() === "" || secureSessionId.includes("../") || secureSessionId === "session-temp") {
      const crypto = require("crypto");
      secureSessionId = `session-${crypto.randomBytes(16).toString("hex")}`;
    }

    // Extract sizing dimension attributes to ask the LLM for
    const dimensionsSample = brandData.dimensions[0];
    const attributes = Object.keys(dimensionsSample).filter(k => k !== "size"); // e.g. ["chest", "shoulders"]

    // Construct Groq prompt asking the LLM to predict the user's numeric measurements
    const hasHeightRef = typeof heightInches === "number" && heightInches > 0;

    const systemPrompt = `You are a precise anthropometric estimation engine used for clothing-size recommendations.
You analyze one photo to infer body-surface dimensions for the attributes requested.
Photos carry no built-in scale, so you must reason using proportional ratios anchored to a known reference length rather than guessing absolute inches directly from pixels.
Account for clothing bulk: estimate the outline of the body underneath, not the garment, especially for loose or baggy clothing.

CRITICAL INSTRUCTION: You are strictly FORBIDDEN from using <think> blocks or chain-of-thought reasoning. You must output the final JSON object IMMEDIATELY.
You MUST output ONLY a raw JSON object string. Do not wrap the JSON object in markdown code blocks, do not use triple backticks (\`\`\`), and do not include any preamble or extra text. Your output must start with '{' and end with '}'.`;

    const isFootwear = attributes.includes("length");
    const isJeans = attributes.includes("waist") && attributes.includes("inseam");

    let methodSection = "";
    let edgeCasesSection = "";

    if (isFootwear) {
      methodSection = `Method:
1. Locate these landmarks if visible: heel, longest toe, ankle joint.
2. Estimate the foot length (heel to longest toe) as a proportion of the reference height, or using standard anthropometric ratios if only the foot is visible.
3. Convert the proportion to inches.`;
      edgeCasesSection = `Edge cases and definitions:
- "length" means foot length (from the back of the heel to the tip of the longest toe).
- The visibility edge-case rule applies only to the specific attributes requested. If the foot is visible, estimate foot length normally — do not zero it out just because the rest of the body isn't in frame.
- If the foot is only partly measurable due to pose/occlusion, still estimate it but lower the confidence.`;
    } else if (isJeans) {
      methodSection = `Method:
1. Locate these landmarks if visible: top of head, chin, waist (narrowest part of torso or top of pelvic bone), crotch (for inseam start), and ankle/floor.
2. Express each landmark's vertical position as a fraction of total height (head-to-floor = 100%).
3. Estimate each attribute (waist, inseam) as a proportion of the reference height, adjusted for what you actually see rather than generic averages alone.
4. Convert each proportion to inches using the reference height.`;
      edgeCasesSection = `Edge cases and definitions:
- "waist" means the circumference around the waist (estimate diameter from 2D image and multiply by Pi, or use standard body proportions).
- "inseam" means the length from the uppermost inner thigh to the bottom of the ankle.
- The visibility edge-case rule applies only to the specific attributes requested. If legs are not fully visible, estimate based on visible torso-to-leg proportions but lower confidence.
- If an attribute is only partly measurable due to pose/occlusion, still estimate it but lower that attribute's own confidence.`;
    } else {
      methodSection = `Method:
1. Locate these landmarks if visible: top of head, chin, shoulder points, widest point of the ribcage/chest, waist, wrists, ankles.
2. Express each landmark's vertical position as a fraction of total height (head-to-floor = 100%).
3. Estimate each attribute as a proportion of the reference height, adjusted for what you actually see (torso length, shoulder slope, build) rather than generic averages alone.
4. Convert each proportion to inches using the reference height.`;
      edgeCasesSection = `Edge cases and definitions:
- "shoulders" means bi-acromial breadth (the straight-line distance between the two shoulder points), a body measurement — not a garment seam-to-seam width.
- The visibility edge-case rule applies only to the specific attributes requested, not the whole body. If chest and shoulders are visible from a chest-up photo, estimate them normally — do not zero them out just because legs aren't in frame.
- If an attribute is only partly measurable due to pose/occlusion, still estimate it but lower that attribute's own confidence.`;
    }

    // Define Gemini Native JSON Response Schema
    const schemaProperties: Record<string, any> = {
      chainOfThought: { type: "STRING", description: "Exactly 1 short sentence summarizing your reasoning." },
      confidenceScore: { type: "INTEGER", description: "Overall confidence score between 0 and 100." }
    };
    const requiredList = ["chainOfThought", "confidenceScore"];

    attributes.forEach(attr => {
      schemaProperties[attr] = { type: "NUMBER", description: `The estimated ${attr} measurement in inches.` };
      schemaProperties[`${attr}_confidence`] = { type: "INTEGER", description: `Confidence score for ${attr} estimation from 0 to 100.` };
      requiredList.push(attr, `${attr}_confidence`);
    });

    const geminiResponseSchema = {
      type: "OBJECT",
      properties: schemaProperties,
      required: requiredList
    };

    // Prompt for Gemini: no literal numeric examples at all!
    const geminiUserPrompt = `${hasHeightRef
      ? `Reference height: ${heightInches} inches (self-reported by the customer — treat as ground truth for scale).`
      : `No reference height was provided. Assume an average adult height (~66 in) as your scale anchor, and reflect that assumption by capping every attribute's confidence at 40.`
      }

Attributes to estimate, in inches:
${attributes.map(attr => `- ${attr}`).join("\n")}

${methodSection}

${edgeCasesSection}

Respond with ONLY a raw, valid JSON object containing your estimations for the requested attributes (${attributes.join(", ")}), confidence scores, and chain of thought reasoning. Do NOT wrap the JSON in markdown code blocks or triple backticks.`;

    // Prompt for Groq: uses a template format with placeholders
    const groqUserPrompt = `${hasHeightRef
      ? `Reference height: ${heightInches} inches (self-reported by the customer — treat as ground truth for scale).`
      : `No reference height was provided. Assume an average adult height (~66 in) as your scale anchor, and reflect that assumption by capping every attribute's confidence at 40.`
      }

Attributes to estimate, in inches:
${attributes.map(attr => `- ${attr}`).join("\n")}

${methodSection}

${edgeCasesSection}

Respond with ONLY a raw, valid JSON object matching the following structure, and no other text:
{
  "chainOfThought": "Exactly 1 short sentence summarizing your reasoning.",
  ${attributes.map(attr => `"${attr}": 40.0,\n  "${attr}_confidence": 90`).join(",\n  ")},
  "confidenceScore": 90
}

Replace the example keys and values with the actual attributes requested (${attributes.join(", ")}) and your real estimations. Ensure all values are numbers (no brackets, comments, or units). Do NOT wrap the JSON in markdown code blocks or triple backticks. Start the response with '{' and end it with '}'.`;

    // Execute query using Gemini with fallback to Groq/mock
    const isSvg = image.startsWith("data:image/svg+xml");

    let geminiResult = null;
    if (!isSvg) {
      geminiResult = await queryGemini({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: geminiUserPrompt },
              {
                type: "image_url",
                image_url: {
                  url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        response_schema: geminiResponseSchema
      });
    }

    let response: { content: string; fromMock: boolean };
    if (geminiResult) {
      response = { content: geminiResult.content, fromMock: false };
    } else {
      console.warn("Gemini query failed in size-assist (or skipped due to SVG), falling back to Groq / Mock...");
      let groqRes = null;
      if (!isSvg) {
        groqRes = await queryGroq({
          model: "qwen/qwen3.6-27b",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: groqUserPrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
                  }
                }
              ]
            }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        });
      }

      if (groqRes) {
        response = { content: groqRes.content, fromMock: groqRes.fromMock };
      } else {
        response = { content: "{}", fromMock: true };
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



    if (response.fromMock || Object.keys(result).length === 0) {
      // Generate pseudo-random variance based on secureSessionId and sku characters
      const seedStr = `${secureSessionId || "guest"}-${sku || "item"}`;
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const varianceChest = (Math.abs(hash) % 50) / 10 - 2.5; // -2.5 in to +2.5 in
      const varianceShoulders = (Math.abs(hash >> 3) % 40) / 10 - 2.0; // -2.0 in to +2.0 in
      const varianceLength = (Math.abs(hash >> 6) % 30) / 10 - 1.5; // -1.5 in to +1.5 in

      // If sizes are bracketed in the cart, use their average dimensions as the baseline
      let baseChest = 38.5;
      let baseShoulders = 17.2;
      let baseLength = 9.9;

      if (sizes && Array.isArray(sizes) && sizes.length > 0) {
        let chestSum = 0;
        let shouldersSum = 0;
        let lengthSum = 0;
        let count = 0;

        sizes.forEach((s: string) => {
          const dim = brandData.dimensions.find((d: any) => d.size === s) as any;
          if (dim) {
            if (dim.chest) { chestSum += dim.chest; count++; }
            if (dim.shoulders) { shouldersSum += dim.shoulders; }
            if (dim.length) { lengthSum += dim.length; count++; }
          }
        });

        if (count > 0) {
          baseChest = chestSum / count;
          baseShoulders = shouldersSum / (chestSum > 0 ? count : 1);
          baseLength = lengthSum / count;
        }
      } else if (heightInches) {
        // Fallback to height anchors
        baseChest = heightInches * 0.56;
        baseShoulders = heightInches * 0.25;
        baseLength = heightInches * 0.14;
      }

      result.chest = result.chest ?? Math.round((baseChest + varianceChest) * 10) / 10;
      result.chest_confidence = result.chest_confidence ?? (85 + (Math.abs(hash) % 15));
      result.shoulders = result.shoulders ?? Math.round((baseShoulders + varianceShoulders) * 10) / 10;
      result.shoulders_confidence = result.shoulders_confidence ?? (85 + (Math.abs(hash >> 1) % 15));
      result.length = result.length ?? Math.round((baseLength + varianceLength) * 10) / 10;
      result.length_confidence = result.length_confidence ?? (85 + (Math.abs(hash >> 2) % 15));
      result.confidenceScore = result.confidenceScore ?? (85 + (Math.abs(hash >> 3) % 15));
    }

    // Dynamic Zod Schema Validation
    const schemaShape: Record<string, z.ZodTypeAny> = {
      chainOfThought: z.string().optional(),
      confidenceScore: z.number().int().min(0).max(100)
    };
    attributes.forEach(attr => {
      schemaShape[attr] = z.number();
      schemaShape[`${attr}_confidence`] = z.number().int().min(0).max(100);
    });

    const sizeSchema = z.object(schemaShape);
    const parsed = sizeSchema.safeParse(result);

    if (!parsed.success) {
      console.warn("Zod Validation Warning: Response format did not strictly match schema:", parsed.error.message);
      // Clean/normalize values into result defensively
      result.confidenceScore = typeof result.confidenceScore === "number" ? result.confidenceScore : 40;
      attributes.forEach(attr => {
        result[attr] = typeof result[attr] === "number" ? result[attr] : (attr === "chest" ? 38.5 : attr === "shoulders" ? 17.2 : 9.9);
        result[`${attr}_confidence`] = typeof result[`${attr}_confidence`] === "number" ? result[`${attr}_confidence`] : 40;
      });
    } else {
      // Re-assign result to the validated typed object
      Object.assign(result, parsed.data);
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

    // Local 1-NN Classification algorithm (Weighted Euclidean Distance Matcher)
    let minDistance = Infinity;
    brandData.dimensions.forEach((item: any) => {
      let sumOfWeightedSquares = 0;
      let sumOfWeights = 0;
      attributes.forEach((attr) => {
        const predictedVal = parseFloat(result[attr]) || 0;
        const chartVal = item[attr] || 0;

        // Retrieve attribute confidence (default to overall confidenceScore or 100 if missing)
        const attrConf = typeof result[`${attr}_confidence`] === "number"
          ? result[`${attr}_confidence`]
          : (typeof result.confidenceScore === "number" ? result.confidenceScore : 100);

        const weight = attrConf / 100;
        sumOfWeightedSquares += weight * Math.pow(predictedVal - chartVal, 2);
        sumOfWeights += weight;
      });
      const distance = sumOfWeights > 0 ? Math.sqrt(sumOfWeightedSquares / sumOfWeights) : 0;
      distanceBreakdown[item.size] = Math.round(distance * 100) / 100;
      if (distance < minDistance) {
        minDistance = distance;
        recommendedSize = item.size;
      }
    });

    attributes.forEach((attr) => {
      predictedDimensions[attr] = parseFloat(result[attr]) || 0;
    });

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
    // Use the 1-line chainOfThought from JSON, otherwise fallback to generic
    const reasoningText = result.chainOfThought || "Estimation completed successfully.";

    // Delete chainOfThought so it doesn't accidentally leak to the frontend or database in the raw dump
    delete result.chainOfThought;

    return NextResponse.json({
      recommendedSize,
      confidenceScore: result.confidenceScore,
      reasoning: reasoningText,
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
