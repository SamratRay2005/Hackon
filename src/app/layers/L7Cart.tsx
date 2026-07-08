"use client";

/**
 * L7Cart.tsx — My Cart & Rewards Tab
 * ────────────────────────────────────
 * Shows the user's shopping bag (pre-loved marketplace items),
 * their available cashback balance and vouchers,
 * and handles the full checkout flow calling /api/checkout.
 *
 * Cashback logic (inverted — lower grade = higher reward):
 *   Grade A → 3%  (Like New — sells itself)
 *   Grade B → 5%  (Very Good — moderate nudge)
 *   Grade C → 10% (Visible wear — biggest reward to offset hesitancy)
 */

import React from "react";
import {
  ShoppingBag,
  Wallet,
  Tag,
  CheckCircle,
  X,
  ArrowRight,
  Leaf,
  BadgePercent,
  ChevronDown,
  ChevronUp,
  Truck,
} from "lucide-react";
import { useApp, getSKUReferenceImage } from "./AppContext";
import { PRODUCT_CATALOG } from "@/lib/catalog";

// ── Constants ────────────────────────────────────────────────────
const GRADE_CASHBACK: Record<string, number> = { A: 3, B: 5 };
const VOUCHER_THRESHOLD = 50;

const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B: "bg-amber-50 text-amber-700 border-amber-200",
};

// ── Main component ───────────────────────────────────────────────
export default function L7Cart() {
  const {
    profileUserId,
    walletInfo,
    setWalletInfo,
    fetchWalletInfo,
    shoppingBag,
    setShoppingBag,
  } = useApp() as any;

  // Reset checkout step whenever bag is empty or we come back to this tab
  const [checkoutStep, setCheckoutStep] = React.useState<"bag" | "summary" | "confirmed">("bag");
  const [selectedVoucherId, setSelectedVoucherId] = React.useState<string | null>(null);
  const [useCashback, setUseCashback] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [checkoutResult, setCheckoutResult] = React.useState<any>(null);
  const [showVoucherList, setShowVoucherList] = React.useState(false);

  // Sync: if bag is cleared externally, snap back to bag step
  React.useEffect(() => {
    if (shoppingBag.length === 0 && checkoutStep === "bag") {
      setSelectedVoucherId(null);
      setUseCashback(false);
    }
  }, [shoppingBag]);

  const cashbackBalance: number = walletInfo?.cashbackBalance ?? 0;
  const activeVouchers: any[] = (walletInfo?.vouchers ?? []).filter(
    (v: any) => v.status === "active"
  );

  const removeFromBag = (sku: string) => {
    setShoppingBag((prev: any[]) => prev.filter((b: any) => b.sku !== sku));
  };

  // ── Computed totals ───────────────────────────────────────────
  const subtotal = shoppingBag.reduce((s: number, i: any) => s + i.price, 0);
  const tax = parseFloat((subtotal * 0.08).toFixed(2));

  const selectedVoucher = activeVouchers.find((v: any) => v.id === selectedVoucherId) ?? null;
  const rawVoucherDiscount = selectedVoucher?.discountAmount ?? 0;
  const voucherDiscount = Math.min(subtotal + tax, rawVoucherDiscount);

  // Cashback usable = min(balance, remaining after voucher)
  const maxCashback = Math.max(0, subtotal + tax - voucherDiscount);
  const cashbackDiscount = useCashback ? Math.min(cashbackBalance, maxCashback) : 0;
  const orderTotal = Math.max(0, subtotal + tax - voucherDiscount - cashbackDiscount);

  // Projected rewards for each item in bag (pre-loved only)
  const projectedRewards = shoppingBag
    .filter((item: any) => item.isPreloved)
    .map((item: any) => {
      const grade = (item.grade ?? "B").toUpperCase();
      const rate = GRADE_CASHBACK[grade] ?? 5;
      const amount = parseFloat((item.price * rate / 100).toFixed(2));
      const isVoucher = item.price >= VOUCHER_THRESHOLD;
      return { name: item.name, grade, rate, amount, isVoucher };
    });

  // ── Toggle voucher selection ───────────────────────────────────
  const toggleVoucher = (id: string) => {
    setSelectedVoucherId(prev => (prev !== id ? id : null));
  };

  const toggleCashback = () => {
    if (cashbackBalance > 0) {
      setUseCashback((v) => !v);
    }
  };

  // ── Checkout ──────────────────────────────────────────────────
  const handleConfirmPurchase = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profileUserId,
          items: shoppingBag.map((i: any) => ({
            sku: i.sku,
            name: i.name,
            price: i.price,
            grade: i.grade ?? "B",
            isPreloved: !!i.isPreloved
          })),
          applyVoucher: selectedVoucherId ?? null,
          applyCashback: useCashback,
          currentWallet: walletInfo,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCheckoutResult(data);
        setCheckoutStep("confirmed");

        // ✔️ Update wallet DIRECTLY from the checkout response
        // Do NOT call fetchWalletInfo() — Next.js serverless instances have
        // separate in-memory state, so a fresh GET /api/wallet returns stale data.
        if (data.wallet) {
          // Push new orders to wallet directly so they appear in Orders tab
          const newOrders = shoppingBag.map((item: any) => {
            const catItem = PRODUCT_CATALOG.find(p => p.sku === item.sku);
            return {
              orderId: `ord-${Math.random().toString(36).substr(2, 9)}`,
              sku: item.sku,
              name: item.name,
              price: item.price,
              purchaseDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
              status: "Delivered",
              category: catItem?.category || "Apparel",
              returnWindowDays: 30
            };
          });

          setWalletInfo((prev: any) => ({
            ...prev,
            cashbackBalance: data.wallet.cashbackBalance,
            vouchers: data.wallet.activeVouchers,
            orders: [...newOrders, ...(prev.orders || [])]
          }));
        }

        // Reset local reward selections
        setUseCashback(false);
        setSelectedVoucherId(null);
        setShowVoucherList(false);

        try {
          const confetti = (window as any).confetti;
          if (confetti)
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ["#10b981", "#6366f1", "#f59e0b"],
            });
        } catch {}
      }
    } catch {}
    finally { setCheckoutLoading(false); }
  };

  const handleDone = () => {
    setShoppingBag([]);
    setCheckoutStep("bag");
    setCheckoutResult(null);
    setSelectedVoucherId(null);
    setUseCashback(false);
  };

  // ── Rewards Panel (always visible at top) ─────────────────────
  const RewardsPanel = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Cashback balance */}
      <div
        className="glass-card flex flex-col gap-2 cursor-pointer transition-all"
        style={{
          border: useCashback && cashbackBalance > 0 ? "2px solid #007185" : "1px solid #D5D9D9",
          padding: "16px",
          background: useCashback && cashbackBalance > 0 ? "#F0F8FA" : "#FFFFFF",
        }}
        onClick={toggleCashback}
        title={cashbackBalance > 0 ? "Click to toggle cashback redemption" : "No cashback balance yet"}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F1111]">
            <Wallet className="w-4 h-4 text-[#FF9900]" /> Green Credits
          </div>
          {cashbackBalance > 0 && (
            <span
              className="text-xs font-bold px-2 py-1 rounded"
              style={{
                background: useCashback ? "#007185" : "transparent",
                color: useCashback ? "#FFFFFF" : "#007185",
                border: useCashback ? "none" : "1px solid #007185"
              }}
            >
              {useCashback ? "Applied ✓" : "Tap to use"}
            </span>
          )}
        </div>
        <div className="text-2xl font-normal text-[#B12704]">
          {Math.round(cashbackBalance * 100)}
        </div>
        <div className="text-xs text-[#565959]">
          {cashbackBalance > 0 ? "Tap to apply at checkout" : "Buy pre-loved to earn credits"}
        </div>
      </div>

      {/* Vouchers */}
      <div 
        className="glass-card flex flex-col gap-2 cursor-pointer transition-all"
        style={{ padding: "16px", border: "1px solid #D5D9D9", background: "#FFFFFF" }}
        onClick={() => activeVouchers.length > 0 && setShowVoucherList((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F1111]">
            <Tag className="w-4 h-4 text-[#FF9900]" /> Vouchers
          </div>
          {activeVouchers.length > 0 && (
            <div className="text-xs font-bold text-[#007185] flex items-center gap-1">
              {showVoucherList ? "Hide" : "Show"}
              {showVoucherList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          )}
        </div>
        <div className="text-2xl font-normal text-[#B12704]">
          {activeVouchers.length}
        </div>
        <div className="text-xs text-[#565959]">
          {activeVouchers.length === 0
            ? "Buy Grade A/B items ≥$50 to earn"
            : selectedVoucherId
            ? "1 voucher selected ✓ (Click to change)"
            : "Click to select a voucher"}
        </div>
      </div>
    </div>
  );

  // ── Voucher Picker ────────────────────────────────────────────
  const VoucherPicker = () => {
    if (activeVouchers.length === 0 || !showVoucherList) return null;
    return (
      <div className="flex flex-col gap-2 bg-indigo-50/30 p-3 rounded-2xl border border-indigo-50">
        {activeVouchers.map((v: any) => {
          const selected = selectedVoucherId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => toggleVoucher(v.id)}
              className={`flex items-center justify-between gap-3 border rounded-xl px-3 py-2.5 w-full text-left transition-all ${
                selected
                  ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    selected ? "border-indigo-500 bg-indigo-500" : "border-slate-300"
                  }`}
                >
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-700 truncate">{v.title}</div>
                  <div className="text-[10px] text-slate-400">
                    Issued {new Date(v.issuedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-sm font-extrabold text-indigo-600 font-mono flex-shrink-0">
                -${v.discountAmount.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="glass-card flex flex-col gap-5">
      <div className="section-title-bar">
        <h2>My Cart &amp; Rewards</h2>
        {checkoutStep !== "confirmed" && (
          <span className="section-badge badge-layer-6">Checkout</span>
        )}
      </div>

      {/* Rewards summary — always shown except post-confirmation */}
      {checkoutStep !== "confirmed" && <RewardsPanel />}

      {/* ── BAG STEP ── */}
      {checkoutStep === "bag" && (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* LEFT COL: Cart items */}
          <div className="flex-1 w-full glass-card" style={{padding: "20px"}}>
            <h1 style={{fontSize: "28px", fontWeight: 400, color: "#0F1111", marginBottom: "4px"}}>Shopping Cart</h1>
            <p className="amz-free-link" style={{textAlign:"right", marginBottom:"8px"}}>Deselect all items</p>
            <div className="amz-divider" />

            <VoucherPicker />

            {shoppingBag.length === 0 ? (
              <div style={{padding:"20px", display:"flex", gap:"20px"}}>
                <div style={{flex:1}}>
                  <h2 style={{fontSize:"1.2rem", fontWeight:700, marginBottom:"8px"}}>Your Amazon Cart is empty.</h2>
                  <p style={{fontSize:"0.9rem", color:"#565959"}}>Browse <strong>Shop Pre-Loved</strong> to add items to your cart.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {shoppingBag.map((item: any) => {
                  const grade = (item.grade ?? "B").toUpperCase();
                  const rate = GRADE_CASHBACK[grade] ?? 5;
                  const rewardAmt = (item.price * rate / 100).toFixed(2);
                  const isVoucher = item.price >= VOUCHER_THRESHOLD;
                  return (
                    <div key={item.sku} style={{display:"flex", gap:"20px", padding:"16px 0", borderBottom:"1px solid #DDD"}}>
                      <img
                        src={getSKUReferenceImage(item.sku)}
                        alt={item.name}
                        style={{width:"120px", height:"120px", objectFit:"contain"}}
                      />
                      <div className="flex-1 flex flex-col gap-1">
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                          <div style={{fontSize:"18px", fontWeight:400, color:"#0F1111"}}>{item.name}</div>
                          <div style={{fontSize:"18px", fontWeight:700, color:"#0F1111"}}>${item.price.toFixed(2)}</div>
                        </div>
                        <div className="amz-instock">In Stock</div>
                        <div style={{fontSize:"12px", color:"#565959", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                          {item.isPreloved && (
                            <span className="amz-bestseller">Pre-Loved Grade {grade}</span>
                          )}
                          {item.size && (
                            <span style={{fontWeight:700}}>Size: {item.size}</span>
                          )}
                        </div>
                        <div className="amz-free-link" style={{fontSize:"12px", marginTop:"4px"}}>FREE Returns</div>
                        
                        {item.isPreloved && (
                          <div style={{fontSize:"12px", color:"#007185", marginTop:"4px", display:"flex", alignItems:"center", gap:"4px"}}>
                            {isVoucher ? <Tag className="w-3 h-3" /> : <BadgePercent className="w-3 h-3" />}
                            {isVoucher
                              ? `Earns $${rewardAmt} voucher (Grade ${grade}, ≥$50)`
                              : `Earns $${rewardAmt} cashback (${rate}%)`}
                          </div>
                        )}
                        <div style={{marginTop:"8px", display:"flex", gap:"12px", fontSize:"12px"}}>
                          <button onClick={() => removeFromBag(item.sku)} className="amz-free-link" style={{border:"none", background:"none", padding:0}}>Delete</button>
                          <span style={{color:"#DDD"}}>|</span>
                          <button className="amz-free-link" style={{border:"none", background:"none", padding:0}}>Save for later</button>
                          <span style={{color:"#DDD"}}>|</span>
                          <button className="amz-free-link" style={{border:"none", background:"none", padding:0}}>Share</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {shoppingBag.length > 0 && (
              <div style={{textAlign:"right", paddingTop:"12px", fontSize:"18px", color:"#0F1111"}}>
                Subtotal ({shoppingBag.length} item{shoppingBag.length !== 1 ? "s" : ""}): <span style={{fontWeight:700}}>${subtotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* RIGHT COL: Checkout Sidebar */}
          {shoppingBag.length > 0 && (
            <div className="w-full md:w-[300px] glass-card" style={{padding: "20px", display:"flex", flexDirection:"column", gap:"12px"}}>
              <div style={{fontSize:"14px", color:"#007600", display:"flex", alignItems:"center", gap:"4px"}}>
                <CheckCircle className="w-4 h-4" /> Your order qualifies for FREE Shipping.
              </div>
              <div style={{fontSize:"18px", color:"#0F1111", lineHeight:"1.3"}}>
                Subtotal ({shoppingBag.length} item{shoppingBag.length !== 1 ? "s" : ""}): <span style={{fontWeight:700}}>${subtotal.toFixed(2)}</span>
              </div>
              
              <div style={{fontSize:"14px", display:"flex", flexDirection:"column", gap:"4px"}}>
                <div style={{display:"flex", justifyContent:"space-between", color:"#565959"}}>
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {voucherDiscount > 0 && (
                  <div style={{display:"flex", justifyContent:"space-between", color:"#B12704"}}>
                    <span>Voucher Discount</span>
                    <span>-${voucherDiscount.toFixed(2)}</span>
                  </div>
                )}
                {useCashback && cashbackDiscount > 0 && (
                  <div style={{display:"flex", justifyContent:"space-between", color:"#007600"}}>
                    <span>Credits Applied</span>
                    <span>-${cashbackDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="amz-divider" style={{margin:"8px 0"}} />
                <div style={{display:"flex", justifyContent:"space-between", fontSize:"18px", fontWeight:700, color:"#B12704"}}>
                  <span>Order Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{width:"100%", padding:"10px", fontSize:"14px", fontWeight:400, marginTop:"8px"}}
                onClick={handleConfirmPurchase}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? <span className="spinner" /> : "Proceed to checkout"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRMED STEP ── */}
      {checkoutStep === "confirmed" && checkoutResult && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-emerald-600" />
          </div>
          <div className="text-center">
            <h4 className="font-extrabold text-slate-800 text-lg">Order Placed! 🎉</h4>
            <p className="text-xs text-slate-400 mt-1">Your pre-loved items are on their way.</p>
          </div>

          <div className="w-full flex flex-col gap-2.5 text-xs">
            {/* Receipt */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Receipt
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold font-mono">${checkoutResult.receipt.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax (8%)</span>
                <span className="font-bold font-mono">${checkoutResult.receipt.tax.toFixed(2)}</span>
              </div>
              {checkoutResult.receipt.discountApplied > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discounts Applied</span>
                  <span className="font-bold">-${checkoutResult.receipt.discountApplied.toFixed(2)}</span>
                </div>
              )}
              {checkoutResult.receipt.cashbackSpent > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600">
                  <span className="flex items-center gap-1.5 font-bold"><Wallet className="w-3.5 h-3.5" /> Applied {Math.round(checkoutResult.receipt.cashbackSpent * 100)} Green Credits</span>
                  <span className="font-mono">-${checkoutResult.receipt.cashbackSpent.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm pt-1.5 border-t border-slate-100 mt-0.5">
                <span>Total Charged</span>
                <span className="text-indigo-600 font-mono">${checkoutResult.receipt.orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Rewards earned */}
            {(checkoutResult.rewards.totalCashbackAdded > 0 ||
              checkoutResult.rewards.vouchersIssued.length > 0) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                  Rewards Earned
                </div>
                {checkoutResult.rewards.totalCashbackAdded > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="flex items-center gap-1">
                      <BadgePercent className="w-3 h-3" /> Cashback Added
                    </span>
                    <span className="font-bold">
                      +${checkoutResult.rewards.totalCashbackAdded.toFixed(2)}
                    </span>
                  </div>
                )}
                {checkoutResult.rewards.vouchersIssued.map((v: any) => (
                  <div key={v.id} className="flex justify-between text-indigo-700">
                    <span className="flex items-center gap-1 min-w-0">
                      <Tag className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{v.title}</span>
                    </span>
                    <span className="font-bold flex-shrink-0 ml-2">+${v.discountAmount.toFixed(2)} voucher</span>
                  </div>
                ))}
              </div>
            )}

            {/* New wallet balance */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
              <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                New Cashback Balance
              </div>
              <div className="text-2xl font-extrabold text-indigo-700 font-mono mt-0.5">
                ${checkoutResult.wallet.cashbackBalance.toFixed(2)}
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary w-full py-2.5 text-xs font-bold mt-4"
            onClick={handleDone}
          >
            Done — Continue Shopping
          </button>
        </div>
      )}
    </div>
  );
}
