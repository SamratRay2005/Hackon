import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "user_samrat";
    const wallet = db.getWallet(userId);
    return NextResponse.json(wallet);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch wallet info" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { choice, actions, baseAmount, userId } = await req.json();

    const amt = parseFloat(baseAmount) || 100.0;
    
    // 1. Calculate financial details
    if (choice === "cash") {
      // Direct cash refund simulation (Stripe sandbox route)
      // Deduct zero, return success
      return NextResponse.json({
        success: true,
        refundType: "cash",
        amountRefunded: `$${amt.toFixed(2)}`,
        stripeStatus: "succeeded",
        message: `Stripe instant refund of $${amt.toFixed(2)} has been queued to your original payment card.`
      });
    }

    // Choice is "credits" (augmented amount: +30% base reward)
    // 100 credits = $10.00 USD value (1 credit = $0.10)
    let creditsAwarded = amt * 1.30 * 10; 
    let co2SavedAwarded = 0;

    const bonusesApplied = [];

    // Apply circularity bonus multipliers:
    // P2P delivery (+5% credits, +151kg CO2)
    if (actions && actions.includes("p2p")) {
      const p2pBonus = amt * 0.05 * 10;
      creditsAwarded += p2pBonus;
      co2SavedAwarded += 151.6;
      bonusesApplied.push({ name: "Direct P2P Shipping Bonus (+5%)", credits: p2pBonus });
    }

    // Refurbished swap (+10% credits)
    if (actions && actions.includes("swap")) {
      const swapBonus = amt * 0.10 * 10;
      creditsAwarded += swapBonus;
      co2SavedAwarded += 15.0; // standard refurbished manufacturing savings
      bonusesApplied.push({ name: "Product Swap Bonus (+10%)", credits: swapBonus });
    }

    // Self-troubleshooting / Repair (+15% credits, +4.8kg CO2)
    if (actions && actions.includes("repair")) {
      const repairBonus = amt * 0.15 * 10;
      creditsAwarded += repairBonus;
      co2SavedAwarded += 4.8;
      bonusesApplied.push({ name: "Self-Repair Interception Bonus (+15%)", credits: repairBonus });
    }

    // 2. Commit transaction to digital wallet (DynamoDB simulator)
    const newBalance = db.updateWallet(userId || "user_samrat", Math.round(creditsAwarded), Math.round(co2SavedAwarded));

    return NextResponse.json({
      success: true,
      refundType: "green_credits",
      creditsAwarded: Math.round(creditsAwarded),
      co2SavedAwarded: Math.round(co2SavedAwarded),
      bonusesApplied,
      walletBalance: newBalance.credits,
      sustainabilityScore: newBalance.sustainabilityScore,
      message: `Successfully issued ${Math.round(creditsAwarded)} Green Credits to your wallet, saving ${Math.round(co2SavedAwarded)}kg of greenhouse gases!`
    });
  } catch (error: any) {
    console.error("Wallet Ledger API Route Error:", error);
    return NextResponse.json({ error: "Failed to transact loyalty ledger credits" }, { status: 500 });
  }
}
