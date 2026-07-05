import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "user_samrat";
    const wallet = await db.getWallet(userId);
    const orders = await db.getOrders(userId);
    return NextResponse.json({ ...wallet, orders });
  } catch {
    return NextResponse.json({ error: "Failed to fetch wallet info" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { choice, userId } = await req.json();
    const activeUserId = userId || "user_samrat";

    if (choice === "init") {
      await db.initUser(activeUserId);
      const wallet = await db.getWallet(activeUserId);
      return NextResponse.json({ success: true, ...wallet });
    }

    return NextResponse.json({ error: "Unknown wallet action" }, { status: 400 });
  } catch (error: any) {
    console.error("Wallet API Route Error:", error);
    return NextResponse.json({ error: "Failed to process wallet request" }, { status: 500 });
  }
}
