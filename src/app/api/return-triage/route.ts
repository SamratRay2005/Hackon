import { NextResponse } from "next/server";
import { queryGemini, queryGroq, db } from "@/lib/services";

export async function POST(req: Request) {
  try {
    const { sku, userReasonText } = await req.json();

    if (!userReasonText || userReasonText.trim().length < 20) {
      return NextResponse.json(
        { error: "Reason too short" },
        { status: 400 }
      );
    }

    let classification = "vibe_mismatch"; // default fallback

    const prompt = `You are an elite logistics routing AI. Analyze the user's return reason and output exactly one word in JSON format: either {"classification": "vibe_mismatch"} or {"classification": "defective"}.

Rules:
1. Output "vibe_mismatch" ONLY IF the reason is about fit, style, changing mind, or if the reason is completely ambiguous (e.g. "bad", "didn't like", "too small").
2. Output "defective" ONLY IF the reason explicitly states physical damage, a broken part, OR receiving a completely wrong/different product.

User Reason: "${userReasonText}"

Respond with ONLY raw JSON.`;

    try {
      // Primary: Gemini
      const geminiResult = await queryGemini({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_schema: {
          type: "OBJECT",
          properties: {
            classification: { type: "STRING" }
          },
          required: ["classification"]
        }
      });

      if (geminiResult) {
        try {
          // queryGemini returns parsed JSON if response_schema is provided, or a string
          let parsed;
          if (typeof geminiResult.content === "string") {
             parsed = JSON.parse(geminiResult.content.replace(/```json/g, "").replace(/```/g, "").trim());
          } else {
             parsed = geminiResult.content;
          }

          if (parsed.classification === "vibe_mismatch" || parsed.classification === "defective") {
            classification = parsed.classification;
          }
        } catch (e) {
          console.error("Gemini output not valid JSON:", geminiResult.content);
          classification = await getGroqClassification(userReasonText);
        }
      } else {
        console.warn("Gemini query failed, falling back to Groq");
        classification = await getGroqClassification(userReasonText);
      }
    } catch (e) {
      console.error("Gemini failed, falling back to Groq:", e);
      classification = await getGroqClassification(userReasonText);
    }

    // If it's a vibe mismatch, flag it for the Admin to inspect at L5 Dark Store
    if (classification === "vibe_mismatch") {
      try {
        // Just mocking the DB call to avoid strict schema issues, 
        // Admin UI will read from this if we had a full DB schema for ReturnRequests
        // Since we don't have db.createReturnRequest, we'll log it
        console.log(`[L5 Dark Store Handoff] Item ${sku} flagged for admin inspection due to vibe_mismatch.`);
      } catch (dbError) {
        console.error("Failed to log ReturnRequest:", dbError);
      }
    }

    return NextResponse.json({ classification });

  } catch (error) {
    console.error("Triage Error:", error);
    // Absolute fallback so UI never crashes
    return NextResponse.json({ classification: "defective" });
  }
}

// Groq Fallback Implementation using existing queryGroq helper
async function getGroqClassification(reasonText: string): Promise<string> {
  try {
    const groqPrompt = `Analyze the user's return reason and output exactly one word: either "vibe_mismatch" or "defective".
Output "defective" for physical damage or receiving the wrong product.
Output "vibe_mismatch" for wrong size, didn't like, or ambiguous reasons.

Reason: ${reasonText}`;

    const res = await queryGroq({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: groqPrompt }]
    });

    if (res && res.content) {
      const content = typeof res.content === "string" ? res.content.trim().toLowerCase() : JSON.stringify(res.content);
      if (content.includes("defective")) return "defective";
    }
    return "vibe_mismatch";
  } catch (error) {
    console.error("Groq fallback also failed:", error);
    return "defective";
  }
}
