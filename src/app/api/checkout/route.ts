import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Simulate an in-memory queue/lock system for the "Rapido" style race condition
const lockedItems = new Map<string, number>(); // sku -> timestamp

export async function POST(req: NextRequest) {
  try {
    const { sku, name, price, priorityQueue } = await req.json();

    if (!sku || !price) {
      return NextResponse.json({ error: "Missing product details" }, { status: 400 });
    }

    const now = Date.now();
    const lockTime = lockedItems.get(sku);

    // If item is locked by someone else and it hasn't expired (e.g. 5 mins)
    // AND the user hasn't opted to pay the Priority Routing Fee (Rapido style jump)
    if (lockTime && (now - lockTime < 5 * 60 * 1000) && !priorityQueue) {
      return NextResponse.json({ locked: true, message: "Item is currently being purchased by someone nearby." });
    }

    // Lock the item
    lockedItems.set(sku, now);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isLocalhost = req.headers.get("origin")?.includes("localhost") || true; 
    const successUrl = `${req.headers.get("origin") || "http://localhost:3000"}?checkout=success`;
    const cancelUrl = `${req.headers.get("origin") || "http://localhost:3000"}?checkout=cancel`;

    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" as any });
      
      const lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Circular Re-Commerce: ${name}`,
              description: "Locally sourced returned item. Saved 4.8kg CO2.",
            },
            unit_amount: Math.round(price * 100), // cents
          },
          quantity: 1,
        }
      ];

      // Add Priority Fee
      if (priorityQueue) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Priority P2P Routing Fee",
              description: "Jump the queue for highly contested local items.",
            },
            unit_amount: 500, // $5.00
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: session.url });
    } else {
      // Mock Stripe Checkout for hackathon demo if no keys are provided
      console.warn("No STRIPE_SECRET_KEY found. Simulating successful checkout.");
      return NextResponse.json({ url: successUrl });
    }

  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "Failed to generate checkout session" }, { status: 500 });
  }
}
