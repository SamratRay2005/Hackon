import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "user_samrat";
    const wallet = await db.getWallet(userId);
    const orders = await db.getOrders(userId);
    return NextResponse.json({ ...wallet, orders });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch wallet info" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { choice, actions, baseAmount, userId, claimId } = await req.json();

    const amt = parseFloat(baseAmount) || 100.0;
    const activeUserId = userId || "user_samrat";

    if (choice === "init") {
      await db.initUser(activeUserId);
      const wallet = await db.getWallet(activeUserId);
      return NextResponse.json({ success: true, ...wallet });
    }

    // 1. Mutual Exclusivity Check on circularity actions
    if (actions && actions.includes("repair")) {
      if (actions.includes("p2p") || actions.includes("swap")) {
        return NextResponse.json({ 
          error: "Circularity Violation: Self-Repair and product returns (P2P/Swap) are mutually exclusive circular actions. You cannot claim both." 
        }, { status: 400 });
      }
    }
    
    // 2. Calculate financial details
    if (choice === "cash") {
      // Direct cash refund simulation (Stripe sandbox route)
      return NextResponse.json({
        success: true,
        refundType: "cash",
        amountRefunded: `$${amt.toFixed(2)}`,
        stripeStatus: "succeeded",
        message: `Stripe instant refund of $${amt.toFixed(2)} has been queued to your original payment card.`
      });
    }

    // 3. Required Claim verification (payout matching logic)
    let targetClaimId = claimId;
    if (!targetClaimId) {
      const claims = await db.getClaims(activeUserId);
      const latestClaim = claims.find((c: any) => c.status === "APPROVED" || c.status === "DEFLECTED");
      if (latestClaim) {
        targetClaimId = latestClaim.id;
      }
    }

    if (!targetClaimId) {
      return NextResponse.json({ error: "Missing required claimId verification parameter." }, { status: 400 });
    }

    const claims = await db.getClaims(activeUserId);
    const verifiedClaim = targetClaimId ? claims.find((c: any) => c.id === targetClaimId) : null;

    if (targetClaimId && !verifiedClaim) {
      return NextResponse.json({ error: "Claim Verification Failed: No matching return claim record found." }, { status: 404 });
    }

    if (verifiedClaim && verifiedClaim.status === "REFUNDED") {
      return NextResponse.json({ error: "Claim Verification Failed: Refund has already been processed for this claim." }, { status: 400 });
    }

    // Choice is "credits" (augmented amount: +30% base reward)
    // 100 credits = $10.00 USD value (1 credit = $0.10)
    let creditsAwarded = amt * 1.30 * 10; 
    let co2SavedAwarded = 0;

    const bonusesApplied = [];

    // Apply circularity bonus multipliers:
    // P2P delivery (+5% credits, +151.6kg CO2)
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

    // Mark claim as refunded to prevent double refunding
    if (verifiedClaim) {
      verifiedClaim.status = "REFUNDED";
      await db.saveClaim(activeUserId, verifiedClaim);
    }

    // 4. Commit transaction to digital wallet (DynamoDB simulator)
    const newBalance = await db.updateWallet(activeUserId, Math.round(creditsAwarded), Math.round(co2SavedAwarded));

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
