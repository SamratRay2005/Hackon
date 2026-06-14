import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const { userId, productName, reasonCode, deflected, co2Saved, creditsAwarded } = await req.json();

    if (!userId || !productName) {
      return NextResponse.json({ error: "Missing required fields (userId, productName)" }, { status: 400 });
    }

    if (deflected) {
      // 1. Log deflection event as a crypto ledger block
      const report = db.saveProductHealthCard(userId, {
        sku: "DEFLECT-LOG",
        itemName: `${productName} Deflection Interception`,
        grade: "A",
        defects: [
          `Deflected return via interactive chat diagnostics`,
          `Reason: ${reasonCode || "Defective"}`
        ],
        resaleCategory: "Kept by Customer (Repaired)",
        functionalScore: 10.0
      });

      // 2. Update user green credits wallet balance
      const newBalance = db.updateWallet(
        userId,
        parseInt(creditsAwarded) || 150, 
        parseInt(co2Saved) || 5
      );

      return NextResponse.json({
        success: true,
        report,
        wallet: newBalance,
        message: `Chat deflection logged under ${userId}. Added ${creditsAwarded || 150} credits to wallet!`
      });
    }

    return NextResponse.json({
      success: true,
      message: "Deflection logged as unresolved. No credit modifications."
    });
  } catch (error: any) {
    console.error("Deflection Log API Error:", error);
    return NextResponse.json({ error: "Failed to log deflection record" }, { status: 500 });
  }
}
