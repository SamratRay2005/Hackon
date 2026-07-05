import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services";
import { PRODUCT_CATALOG } from "@/lib/catalog";

export async function POST(req: NextRequest) {
  try {
    const { userId, productName, sku: requestSku, reasonCode, deflected } = await req.json();

    if (!userId || (!productName && !requestSku)) {
      return NextResponse.json({ error: "Missing required fields (userId, productName or sku)" }, { status: 400 });
    }

    const product = PRODUCT_CATALOG.find(p => p.sku === requestSku || p.name === productName) || PRODUCT_CATALOG[0];
    const sku = product.sku;
    const resolvedName = product.name;
    const price = product.price;

    if (deflected) {
      // 1. Deflection Lock Check: prevent double-claiming
      const claims = await db.getClaims(userId);
      const hasRecentDeflection = claims.some((c: any) => 
        c.sku === sku && 
        c.status === "DEFLECTED" &&
        (new Date().getTime() - new Date(c.date).getTime()) < 30 * 24 * 60 * 60 * 1000
      );
      
      if (hasRecentDeflection) {
        return NextResponse.json({ error: "Deflection Lock Active: This item has already been successfully deflected/repaired within the last 30 days." }, { status: 400 });
      }

      // 2. Verified Server-Side Payout Calculation
      let category = "Other";
      const skuUpper = sku.toUpperCase();
      if (skuUpper.includes("DENIM") || skuUpper.includes("TEE") || skuUpper.includes("HOODIE") || skuUpper.includes("FLANNEL") || skuUpper.includes("PNT") || skuUpper.includes("SWEATER") || skuUpper.includes("PARKA") || skuUpper.includes("SHORTS") || skuUpper.includes("BLAZER") || skuUpper.includes("DRESS") || skuUpper.includes("JOGGER") || skuUpper.includes("SKIRT") || skuUpper.includes("CARDIGAN") || skuUpper.includes("POLO") || skuUpper.includes("VEST") || skuUpper.includes("TRENCH") || skuUpper.includes("JEAN") || skuUpper.includes("SHIRT") || skuUpper.includes("OVERALLS") || skuUpper.includes("GLVS")) {
        category = "Apparel";
      } else if (skuUpper.includes("SHOE") || skuUpper.includes("SNEAK") || skuUpper.includes("BOOT") || skuUpper.includes("SANDAL") || skuUpper.includes("LOAFER") || skuUpper.includes("CHELSEA") || skuUpper.includes("TRAINER") || skuUpper.includes("SLIP-ON") || skuUpper.includes("OXFORD") || skuUpper.includes("SLIPPER") || skuUpper.includes("BROGUE") || skuUpper.includes("ESPADRIL")) {
        category = "Footwear";
      } else if (skuUpper.includes("CF-MKR") || skuUpper.includes("SPK-AIR") || skuUpper.includes("BUDS") || skuUpper.includes("HEADPHN") || skuUpper.includes("KB-") || skuUpper.includes("MOUSE") || skuUpper.includes("MONITOR") || skuUpper.includes("PWR-") || skuUpper.includes("CHRG-") || skuUpper.includes("HUB") || skuUpper.includes("MIC") || skuUpper.includes("WEBCAM") || skuUpper.includes("HDD") || skuUpper.includes("SSD") || skuUpper.includes("CBL") || skuUpper.includes("ROUTER") || skuUpper.includes("TABLET") || skuUpper.includes("E-READER") || skuUpper.includes("SOUND-BAR") || skuUpper.includes("TV-") || skuUpper.includes("BAND")) {
        category = "Electronics";
      } else if (skuUpper.includes("BLENDER") || skuUpper.includes("TOASTER") || skuUpper.includes("KETTLE") || skuUpper.includes("MUG") || skuUpper.includes("SKILLET") || skuUpper.includes("KNIFE") || skuUpper.includes("PAN") || skuUpper.includes("COOK") || skuUpper.includes("FRYER") || skuUpper.includes("JUICER") || skuUpper.includes("SCALE") || skuUpper.includes("OVEN") || skuUpper.includes("GRNDR") || skuUpper.includes("SLOW") || skuUpper.includes("MIXER") || skuUpper.includes("POT") || skuUpper.includes("WAFFLE") || skuUpper.includes("CONTAINR") || skuUpper.includes("SPICE") || skuUpper.includes("HUMID") || skuUpper.includes("PURIFY") || skuUpper.includes("VACUUM") || skuUpper.includes("ROBO") || skuUpper.includes("IRON") || skuUpper.includes("STEAMER") || skuUpper.includes("FAN") || skuUpper.includes("HEAT") || skuUpper.includes("DIFFUSE") || skuUpper.includes("LBL")) {
        category = "Home & Kitchen";
      }

      const co2Val = category === "Apparel" || category === "Footwear" ? 15 : (category === "Electronics" ? 12 : 5);
      const creditsVal = Math.min(300, Math.max(50, Math.round(price * 1.5)));
      const reward = { credits: creditsVal, co2: co2Val };

      // 3. Log deflection block in claims to enforce lock
      await db.saveClaim(userId, {
        sku,
        item: resolvedName,
        riskScore: 0,
        status: "DEFLECTED",
        imageUrl: "data:image/jpeg;base64,image_placeholder"
      });

      // 4. Log deflection event as a crypto ledger block
      const report = await db.saveProductHealthCard(userId, {
        sku,
        itemName: `${resolvedName} Deflection Interception`,
        grade: "A",
        defects: [
          `Deflected return via interactive chat diagnostics`,
          `Reason: ${reasonCode || "Defective"}`
        ],
        resaleCategory: "Kept by Customer (Repaired)",
        functionalScore: 10.0
      });

      // 5. Award cashback for self-repair deflection (replaces old green-credits system)
      // Deflection reward: same percentage as Grade B (5%) of product price, capped at $10
      const cashbackReward = parseFloat(Math.min(10, price * 0.05).toFixed(2));
      const newBalance = await db.addCashback(userId, cashbackReward);

      return NextResponse.json({
        success: true,
        report,
        wallet: { cashbackBalance: newBalance },
        message: `Chat deflection logged under ${userId}. Added $${cashbackReward.toFixed(2)} cashback to wallet for self-repair!`
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
