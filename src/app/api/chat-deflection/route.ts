import { NextRequest, NextResponse } from "next/server";
import { queryGroq } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const { messages, productName, reasonCode, guides } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Missing conversation messages" }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1].content;
    const guidesContext = guides && guides.length > 0 
      ? guides.map((g: any) => `Guide: ${g.title}\nURL: ${g.url}\nSummary: ${g.summary}`).join("\n\n")
      : "No specific repair manuals found.";

    const systemPrompt = `You are a conversational deflection assistant for a circular retail returns portal.
Your primary objective is to help the customer diagnose and repair their item using open-source repair guides, preventing a physical return.
If troubleshooting succeeds, you deflect the return and save shipping resources.
If the item is physically broken beyond repair or the user insists, you will guide them to proceed with the return.

Product Name: ${productName || "Product"}
Customer Reason Code: ${reasonCode || "Defective"}
iFixit Repair Manuals Context:
${guidesContext}

Instructions:
1. Be polite, encouraging, and clear. Break down troubleshooting into actionable, numbered steps.
2. Ingest the iFixit guides context above to provide highly relevant repair suggestions.
3. Keep answers concise. Do not write more than 150 words per turn.
4. If the user indicates their issue is resolved, or thanks you, congratulate them on circularity and suggest they click "Resolved".
5. If troubleshooting fails after attempt, tell them they can click "Still need to return".`;

    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey && apiKey.trim() !== "") {
      try {
        // We call Groq streaming API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages
            ],
            temperature: 0.5,
            stream: true
          })
        });

        if (response.ok && response.body) {
          // Pipe the readable stream directly to the output
          return new Response(response.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            }
          });
        }
      } catch (e) {
        console.error("Groq Chat streaming failed, running mock stream:", e);
      }
    }

    // High-fidelity streaming mock fallback
    const mockContent = getMockResponse(productName, latestMessage, guidesContext);
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

function getMockResponse(product: string, message: string, guides: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes("hello") || msg.includes("hi ") || msg.includes("hey")) {
    return `Hi there! I see you are returning your **${product}** due to functionality issues. Before we generate a shipping label, let's see if we can resolve this together! I've loaded the troubleshooting manual. Can you tell me if the device turns on at all when plugged in?`;
  }
  
  if (msg.includes("yes") || msg.includes("turn on") || msg.includes("on") || msg.includes("light")) {
    return `That's a great sign! Since it has power, the issue is likely a flow or thermal lock. Let's try a quick 1-minute reset: 
1. Unplug the **${product}** from the wall.
2. Hold down the Power/Brew button for 10 seconds to drain remaining capacitor energy.
3. Plug it back in and try running a cycle with plain warm water.

Give this a try and let me know if it helps clear the block!`;
  }

  if (msg.includes("work") || msg.includes("fixed") || msg.includes("resolved") || msg.includes("thank") || msg.includes("yes!")) {
    return `Fantastic! I'm so glad we got that sorted out. By repairing rather than returning, you've saved packaging and transport carbon emissions (approx 4.8kg CO2). 

Please click the green **"Resolved! Cancel Return"** button below to complete the process and claim your circularity bonus credits!`;
  }

  return `I understand. If the basic reset didn't work, we can check the next level: 
- For electronics, this is commonly caused by an air bubble or calcification block.
- Try checking the water lines and descaling the reservoir. 

If it's still completely unresponsive, no worries at all—I can help you process your return immediately. Simply click **"Still need to return"** below to generate your shipping options.`;
}
