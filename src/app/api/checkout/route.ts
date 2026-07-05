import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services";

/**
 * POST /api/checkout
 *
 * Body:
 *   userId       — string
 *   items        — Array<{ sku, name, price, grade: "A" | "B" | "C" }>
 *   applyVoucher — string | null  (voucherId to redeem)
 *   applyCashback — boolean       (true = spend available cashback toward total)
 *
 * Cashback incentive rules (grade-based):
 *   Grade A → 7%  : price >= $50 → issue Voucher, else → direct cashback
 *   Grade B → 5%  : price >= $50 → issue Voucher, else → direct cashback
 *   Grade C → 3%  : always direct cashback regardless of price
 */

const CASHBACK_RATE: Record<string, number> = {
  A: 0.03,  // Like New — sells itself, minimal nudge needed
  B: 0.05,  // Very Good — moderate incentive
};

const VOUCHER_THRESHOLD = 50; // any item >= $50 gets a Voucher; below $50 gets direct cashback

export async function POST(req: NextRequest) {
  try {
    const { userId, items, applyVoucher, applyCashback, currentWallet } = await req.json();

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields: userId and items[]" }, { status: 400 });
    }

    if (currentWallet) {
      await db.seedWallet(userId, currentWallet.cashbackBalance ?? 0, currentWallet.vouchers ?? []);
    } else {
      await db.initUser(userId);
    }

    const wallet = await db.getWallet(userId);

    // ── 1. Calculate subtotal ──────────────────────────────────────
    const subtotal: number = items.reduce((sum: number, i: any) => sum + (i.price ?? 0), 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    let orderTotal = parseFloat((subtotal + tax).toFixed(2));
    let discountApplied = 0;

    // ── 2. Redeem voucher (if requested) ──────────────────────────
    let voucherApplied: { id: string; discountAmount: number } | null = null;
    if (applyVoucher) {
      const voucherDiscount = await db.redeemVoucher(userId, applyVoucher);
      if (voucherDiscount > 0) {
        discountApplied += voucherDiscount;
        voucherApplied = { id: applyVoucher, discountAmount: voucherDiscount };
      }
    }

    // ── 3. Spend cashback balance (if requested) ───────────────────
    let cashbackSpent = 0;
    if (applyCashback && wallet.cashbackBalance > 0) {
      const spendable = Math.min(wallet.cashbackBalance, orderTotal - discountApplied);
      cashbackSpent = parseFloat(spendable.toFixed(2));
      discountApplied += cashbackSpent;
      await db.spendCashback(userId, cashbackSpent);
    }

    orderTotal = parseFloat(Math.max(0, orderTotal - discountApplied).toFixed(2));

    // ── 4. Calculate & award grade-based cashback / vouchers ───────
    const cashbackEarned: Array<{ itemName: string; grade: string; rate: string; reward: "cashback" | "voucher"; amount: number }> = [];
    const vouchersIssued: Array<{ id: string; title: string; discountAmount: number }> = [];
    let totalCashbackAdded = 0;

    for (const item of items) {
      if (!item.isPreloved) continue;
      
      const grade = (item.grade ?? "B").toUpperCase();
      const rate = CASHBACK_RATE[grade] ?? CASHBACK_RATE["B"];
      const rewardAmount = parseFloat((item.price * rate).toFixed(2));

      // Price-only rule: ≥$50 → Voucher (drive re-engagement), <$50 → direct cashback
      const isVoucherEligible = item.price >= VOUCHER_THRESHOLD;

      if (isVoucherEligible) {
        // Issue a voucher for high-value Grade A/B purchases
        const voucher = await db.issueVoucher(
          userId,
          rewardAmount,
          `Amazon Pay Gift Card`
        );
        cashbackEarned.push({ itemName: item.name, grade, rate: `${(rate * 100).toFixed(0)}%`, reward: "voucher", amount: rewardAmount });
        vouchersIssued.push({ id: voucher.id, title: voucher.title, discountAmount: voucher.discountAmount });
      } else {
        // Add directly to cashback balance
        await db.addCashback(userId, rewardAmount);
        totalCashbackAdded += rewardAmount;
        cashbackEarned.push({ itemName: item.name, grade, rate: `${(rate * 100).toFixed(0)}%`, reward: "cashback", amount: rewardAmount });
      }
    }

    // ── 5. Return receipt ──────────────────────────────────────────
    const updatedWallet = await db.getWallet(userId);

    return NextResponse.json({
      success: true,
      receipt: {
        items: items.map((i: any) => ({ name: i.name, price: i.price, grade: i.grade })),
        subtotal,
        tax,
        discountApplied,
        voucherApplied,
        cashbackSpent,
        orderTotal,
      },
      rewards: {
        cashbackEarned,
        totalCashbackAdded: parseFloat(totalCashbackAdded.toFixed(2)),
        vouchersIssued,
      },
      wallet: {
        cashbackBalance: updatedWallet.cashbackBalance,
        activeVouchers: updatedWallet.vouchers.filter((v: { status: string }) => v.status === "active"),
      },
      message: `Order confirmed! You earned ${Math.round(totalCashbackAdded * 100)} Green Credits${vouchersIssued.length > 0 ? ` and ${vouchersIssued.length} voucher(s)` : ""}.`,
    });
  } catch (error: any) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: "Failed to process checkout" }, { status: 500 });
  }
}
