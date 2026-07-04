import { NextRequest, NextResponse } from "next/server";
import { queryGroq, getGeminiApiKey, markGeminiKeyExhausted } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const { messages, productName, reasonCode, guides, userId, purchaseDate, returnWindowDays } = await req.json();

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
Your primary objective is to help the customer diagnose and repair their item using open-source repair guides, preventing a physical return.
If troubleshooting succeeds, you deflect the return and save shipping resources.
If the item is physically broken beyond repair or the user insists, you will guide them to proceed with the return.

CRITICAL POLICY ENFORCEMENT:
- Purchase Date: ${purchaseDate || "Unknown"} (${daysSincePurchase} days ago)
- Return Window: ${returnWindowDays || 30} days
- Is Return Expired? ${isExpired ? "YES" : "NO"}

If the return is EXPIRED (Is Return Expired? YES), you MUST strictly but politely deny the return immediately. Tell the user the return window has closed. Offer troubleshooting or repair, but explicitly state a refund or replacement is not possible. Do not allow them to proceed with the return.

Product Name: ${productName || "Product"}
Customer Reason Code: ${reasonCode || "Defective"}
iFixit Repair Manuals Context:
${guidesContext}${vectorContext}

Instructions:
1. GIVE AN ACTUAL SOLUTION IMMEDIATELY — do NOT ask them to describe the issue again. Be polite, encouraging, and clear. Break down troubleshooting into actionable, numbered steps.
2. Ingest the iFixit guides context above to provide highly relevant repair suggestions.
3. Keep answers concise. Do not write more than 150 words per turn.
4. If the user indicates their issue is resolved, or thanks you, congratulate them on circularity and suggest they click "Resolved".
5. If troubleshooting fails after attempt AND the return is NOT expired, tell them they can click "Still need to return".`;

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
    const mockContent = getMockResponse(productName, latestMessage, guidesContext, isExpired);
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

function getMockResponse(product: string, message: string, guides: string, isExpired: boolean): string {
  const msg = message.toLowerCase();

  if (isExpired) {
    return `I apologize, but your **${product}** is no longer eligible for a return or replacement as it is past the return window limit. However, we'd still love to help you repair it! Would you like me to walk you through some troubleshooting steps to get it working again?`;
  }

  if (msg.includes("hello") || msg.includes("hi ") || msg.includes("hey")) {
    return `Hi there! I see you are returning your **${product}**. Let's see if we can resolve this together! Can you provide more details about the issue?`;
  }

  if (msg.includes("yes") || msg.includes("turn on") || msg.includes("on") || msg.includes("light") || msg.includes("size") || msg.includes("fit") || msg.includes("broken")) {
    return `Got it. Based on your history, I recommend checking out our exchange program. If it's a technical issue, try a quick 1-minute reset by unplugging it, waiting 10 seconds, and plugging it back in.
    
Let me know if this helps or if you'd like to proceed with the return!`;
  }

  if (msg.includes("work") || msg.includes("fixed") || msg.includes("resolved") || msg.includes("thank") || msg.includes("yes!")) {
    return `Fantastic! I'm so glad we got that sorted out. By repairing rather than returning, you've saved packaging and transport carbon emissions. 

Please click the green **"Resolved! Cancel Return"** button below to complete the process and claim your circularity bonus credits!`;
  }

  return `I understand. If the suggestions didn't work, we can proceed with the return. Simply click **"Still need to return"** below to generate your shipping options.`;
}
