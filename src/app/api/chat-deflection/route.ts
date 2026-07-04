import { NextRequest, NextResponse } from "next/server";
import { db, queryGroq, getGeminiApiKey, markGeminiKeyExhausted } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      productName,
      reasonCode,
      guides,
      userId,
      purchaseDate,
      returnWindowDays,
      sku,
    } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Missing conversation messages" }, { status: 400 });
    }

    // Enforce hard turn limit (5 user messages + 5 bot messages = 10 total)
    if (messages.length > 10) {
      return new Response(`data: ${JSON.stringify({
        choices: [
          {
            delta: {
              content: "⚠️ **Maximum troubleshooting turns reached (5 turns).** To optimize resource utilization, please finalize your decision: select **'Resolved'** to cancel the return, or click **'Still need to return'** to proceed."
            }
          }
        ]
      })}\n\ndata: [DONE]\n\n`, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });
    }

    const latestMessage = messages[messages.length - 1].content;
    const guidesContext = guides && guides.length > 0
      ? guides.map((g: any) => `Guide: ${g.title}\nURL: ${g.url}\nSummary: ${g.summary}`).join("\n\n")
      : "No specific repair manuals found.";

    // ── RAG: pull the most relevant manual sections for this message ──
    const ragResults: string[] = sku ? db.queryManualRAG(sku, latestMessage) : [];
    const ragContext = ragResults.length > 0
      ? ragResults.join("\n\n")
      : "No specific manual content found for this product.";

    // ── Manual metadata (warranty void flag + days) ──
    const manual = sku ? db.getManualBySku(sku) : null;

    // Vector DB lookup for personalized context
    let vectorContext = "";
    if (userId) {
      // Mocked results as db is not defined
      const results: string[] = [];
      if (results.length > 0) {
        vectorContext = "\nCustomer Purchase History Context (Vector Match):\n- " + results.join("\n- ");
      }
    }

    const today = new Date();
    const purchaseDt = purchaseDate ? new Date(purchaseDate) : today;
    const daysSincePurchase = Math.floor((today.getTime() - purchaseDt.getTime()) / (1000 * 3600 * 24));
    const isExpired = daysSincePurchase > (returnWindowDays || 30);

    const systemPrompt = `You are a conversational deflection assistant for a circular retail returns portal.
Your primary objective is to help the customer diagnose and repair their item using the official product manual and open-source repair guides, preventing a physical return.
If troubleshooting succeeds, you deflect the return and save shipping resources.
If the item is physically broken beyond repair or the user insists, you will guide them to proceed with the return.

CRITICAL POLICY ENFORCEMENT:
- Purchase Date: ${purchaseDate || "Unknown"} (${daysSincePurchase} days ago)
- Return Window: ${returnWindowDays || 30} days
- Is Return Expired? ${isExpired ? "YES" : "NO"}

If the return is EXPIRED (Is Return Expired? YES), you MUST strictly but politely deny the return immediately. Tell the user the return window has closed. Offer troubleshooting or repair, but explicitly state a refund or replacement is not possible. Do not allow them to proceed with the return.

Product Name: ${productName || "Product"}
Customer Reason Code: ${reasonCode || "Defective"}
${vectorContext}

iFixit Repair Guides Context:
${guidesContext}

Context from Official Manual (use this as your primary repair reference):
${ragContext}

Instructions:
1. GIVE AN ACTUAL SOLUTION IMMEDIATELY — do NOT ask them to describe the issue again. Be polite, encouraging, and clear. Break down troubleshooting into actionable, numbered steps.
2. Prioritise the Official Manual context above for highly specific, accurate repair instructions.
3. Ingest the iFixit guides context above to provide highly relevant repair suggestions.
4. Keep answers concise. Do not write more than 150 words per turn.
5. If the user indicates their issue is resolved, or thanks you, congratulate them on choosing to repair and suggest they click "Resolved".
6. If troubleshooting fails after attempt AND the return is NOT expired, tell them they can click "Still need to return".

CRITICAL RULE 1: You are an encouraging repair assistant. You strictly DO NOT offer financial rewards, green credits, or discounts for repairing. Never mention credits, payouts, or cashback of any kind.
${manual?.warrantyVoidOnSelfRepair === true
  ? `CRITICAL RULE 2: You MUST warn the user in your very first message that attempting this repair themselves will void their ${manual.warrantyDays}-day warranty. State this clearly before giving any repair steps.`
  : ""}`;

    const groqApiKey = process.env.GROQ_API_KEY;

    // Call Gemini streaming API using its OpenAI compatibility endpoint with round-robin failover
    const allKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3
    ].map(k => k?.trim()).filter(Boolean) as string[];

    let deflectionResponse: Response | null = null;

    if (allKeys.length > 0) {
      for (let attempt = 0; attempt < allKeys.length; attempt++) {
        const apiKey = getGeminiApiKey();
        if (!apiKey) continue;

        try {
          const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                ...messages
                  .filter((m: any, idx: number) => !(idx === 0 && m.role === "bot"))
                  .map((m: any) => ({
                    ...m,
                    role: m.role === "bot" ? "assistant" : m.role
                  }))
              ],
              temperature: 0.2,
              stream: true
            })
          });

          if (response.ok && response.body) {
            deflectionResponse = new Response(response.body, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
              }
            });
            break; // Success! Break the retry loop.
          } else {
            const errText = await response.text();
            console.warn(`Gemini Chat streaming error (${response.status}) on key prefix "${apiKey.substring(0, 8)}": ${errText}`);
            if (response.status === 429 && (errText.includes("PerDay") || errText.includes("QuotaExceeded") || errText.includes("limit: 20") || errText.includes("limit: 0"))) {
              markGeminiKeyExhausted(apiKey);
              console.warn(`Gemini key exhausted in chat. Retrying next key (attempt ${attempt + 1}/${allKeys.length})...`);
              continue;
            } else {
              break; // Stop loop for non-quota errors
            }
          }
        } catch (e) {
          console.error("Gemini Chat streaming request failed:", e);
        }
      }
    }

    if (deflectionResponse) {
      return deflectionResponse;
    }

    if (groqApiKey && groqApiKey.trim() !== "") {
      try {
        // Fallback to Groq streaming API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages
                .filter((m: any, idx: number) => !(idx === 0 && m.role === "bot"))
                .map((m: any) => ({
                  ...m,
                  role: m.role === "bot" ? "assistant" : m.role
                }))
            ],
            temperature: 0.2,
            stream: true
          })
        });

        if (response.ok && response.body) {
          return new Response(response.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            }
          });
        }
      } catch (e) {
        console.error("Groq Chat streaming fallback failed, running mock stream:", e);
      }
    }

    // High-fidelity streaming mock fallback
    const mockContent = getMockResponse(productName, latestMessage, guidesContext, isExpired, manual?.warrantyVoidOnSelfRepair === true, manual?.warrantyDays);
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        const words = mockContent.split(" ");
        // Send chunks to simulate dynamic typing
        for (let i = 0; i < words.length; i++) {
          const chunk = `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  content: words[i] + (i === words.length - 1 ? "" : " ")
                }
              }
            ]
          })}\n\n`;
          controller.enqueue(encoder.encode(chunk));
          // Latency simulation
          await new Promise(resolve => setTimeout(resolve, 35));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error: any) {
    console.error("Chat Deflection API Route Error:", error);
    return NextResponse.json({ error: "Failed to compile chatbot response" }, { status: 500 });
  }
}

function getMockResponse(
  product: string,
  message: string,
  guides: string,
  isExpired: boolean,
  warrantyVoid: boolean,
  warrantyDays?: number
): string {
  const msg = message.toLowerCase();

  // Expired note — prepended only, does NOT block repair help
  const expiredNote = isExpired
    ? `⚠️ **Note:** Your return window has closed, so a refund is no longer possible. However, I can still help you fix this!\n\n`
    : "";

  const warrantyNote = warrantyVoid && warrantyDays
    ? `\n\n⚠️ **Warranty Notice:** Attempting this repair yourself will **void your ${warrantyDays}-day warranty**. Consider contacting the manufacturer's authorised service centre instead.`
    : "";

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return `${expiredNote}Hi there! I see you're having an issue with your **${product}**. Let's see if we can resolve this together! Can you describe what's happening in more detail?${warrantyNote}`;
  }

  if (msg.includes("connect") || msg.includes("bluetooth") || msg.includes("pair")) {
    return `${expiredNote}Let's fix the Bluetooth connection. Try these steps:\n\n1. Hold the Bluetooth button for **3 seconds** until the LED flashes blue rapidly\n2. On your device, forget the old pairing and search for the device again\n3. If it still won't pair, hold **Power + Bluetooth** simultaneously for 6 seconds to factory-reset all pairings\n\nDoes that work?${warrantyNote}`;
  }

  if (msg.includes("yes") || msg.includes("turn on") || msg.includes("on") || msg.includes("light") || msg.includes("size") || msg.includes("fit") || msg.includes("broken")) {
    return \`Got it. Based on your history, I recommend checking out our exchange program. If it's a technical issue, try a quick 1-minute reset by unplugging it, waiting 10 seconds, and plugging it back in.\n\nLet me know if this helps or if you'd like to proceed with the return!\`;
  }

  if (msg.includes("sound") || msg.includes("audio") || msg.includes("crackling") || msg.includes("distort") || msg.includes("speaker")) {
    return `${expiredNote}For audio issues:\n\n1. Reduce source volume to below **80%** — distortion usually comes from driving the speaker too hard at the source\n2. If crackling: the driver membrane may be damp — leave in a dry place for 24 hours\n3. Try a different audio source to rule out the app/device\n\nAny improvement?${warrantyNote}`;
  }

  if (msg.includes("battery") || msg.includes("charge") || msg.includes("runtime")) {
    return `${expiredNote}Battery tips:\n\n1. Use only **5V/2A** USB-C chargers — fast chargers above 10W degrade the cell faster\n2. A full charge takes ~2.5 hours from empty\n3. If runtime has dropped below 4 hours after 500+ charge cycles, the battery may need replacement at an authorised service centre${warrantyNote}`;
  }

  if ((msg.includes("work") && !msg.includes("not")) || msg.includes("fixed") || msg.includes("resolved") || msg.includes("thank")) {
    return \`Fantastic! Glad we got that sorted out. By repairing rather than returning, you've helped reduce unnecessary waste. Please click the **"Resolved! Cancel Return"** button below to complete the process.\`;
  }

  return `${expiredNote}I'm here to help! Can you tell me:\n- What is the device doing (or not doing)?\n- Any LED lights visible?\n- Does it respond to the power button at all?\n\nThe more detail you give me, the better I can guide you through the fix.${warrantyNote}`;
}
