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
  Trash2,
  Plus,
  Info,
  Truck

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
export default function L7Cart({ showOnlyRewards = false }: { showOnlyRewards?: boolean }) {
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
  const [orderSummary, setOrderSummary] = React.useState<any>(null);

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
    setSelectedVoucherId(prev => {
      const next = prev !== id ? id : null;
      if (next) setUseCashback(false); // Mutually exclusive
      return next;
    });
  };

  const toggleCashback = () => {
    if (cashbackBalance > 0) {
      setUseCashback((v) => {
        const next = !v;
        if (next) setSelectedVoucherId(null); // Mutually exclusive
        return next;
      });
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

        // Save order summary and clear cart
        setOrderSummary({
          items: shoppingBag,
          subtotal,
          tax,
          voucherDiscount,
          cashbackDiscount,
          orderTotal,
          totalDiscount: voucherDiscount + cashbackDiscount
        });
        setShoppingBag([]);

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
    setOrderSummary(null);
  };

  // ── Rewards Panel (always visible at top) ─────────────────────
  const RewardsPanel = () => {
    return (
      <div className="mb-6 mt-4">
        <div style={{fontSize: "12px", fontWeight: 700, color: "#565959", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px"}}>
          Recommended Offers & Rewards
        </div>
        
        <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", background: "#FFF", overflow: "hidden" }}>
          
          {/* Option 1: Green Credits */}
          <label 
            className="flex flex-col cursor-pointer transition-all" 
            style={{ 
              borderBottom: "1px solid #D5D9D9", 
              background: useCashback ? "#FCF5EE" : "#FFF",
              padding: "16px",
              opacity: cashbackBalance > 0 ? 1 : 0.6
            }}
          >
             <div className="flex items-start gap-3">
               <input 
                 type="radio" 
                 checked={useCashback} 
                 disabled={cashbackBalance === 0}
                 onChange={() => {
                   if (cashbackBalance > 0) {
                     setUseCashback(true);
                     setSelectedVoucherId(null);
                   }
                 }} 
                 style={{width: "18px", height: "18px", accentColor: "#007185", marginTop: "2px", cursor: cashbackBalance > 0 ? "pointer" : "default"}} 
               />
               <div className="flex-1">
                 <div style={{fontSize: "15px", fontWeight: 700, color: "#0F1111"}}>
                   Green Credits Balance: <span className="font-sans">${(cashbackBalance).toFixed(2)}</span>
                 </div>
                 {cashbackBalance > 0 ? (
                   <div style={{fontSize: "13px", color: "#007185", marginTop: "4px"}}>
                     Includes {Math.round(cashbackBalance * 100)} credits. Apply to reduce order total.
                   </div>
                 ) : (
                   <div style={{fontSize: "13px", color: "#565959", marginTop: "4px"}}>
                     You have 0 credits. Buy pre-loved items to earn!
                   </div>
                 )}
               </div>
               <Wallet className="w-6 h-6 text-[#565959]" />
             </div>
          </label>

          {/* Option 2: Vouchers */}
          <label 
            className="flex flex-col cursor-pointer transition-all" 
            style={{ 
              background: selectedVoucherId !== null ? "#FCF5EE" : "#FFF",
              padding: "16px",
              opacity: activeVouchers.length > 0 ? 1 : 0.6
            }}
          >
             <div className="flex items-start gap-3">
               <input 
                 type="radio" 
                 checked={selectedVoucherId !== null} 
                 disabled={activeVouchers.length === 0}
                 onChange={(e) => {
                   if (e.target.checked && activeVouchers.length > 0) {
                     setUseCashback(false);
                     if (!selectedVoucherId) {
                       setSelectedVoucherId(activeVouchers[0].id);
                     }
                   }
                 }} 
                 style={{width: "18px", height: "18px", accentColor: "#007185", marginTop: "2px", cursor: activeVouchers.length > 0 ? "pointer" : "default"}} 
               />
               <div className="flex-1">
                 <div style={{fontSize: "15px", fontWeight: 700, color: "#0F1111"}}>
                   Amazon Vouchers ({activeVouchers.length})
                 </div>
                 {activeVouchers.length > 0 ? (
                   <div style={{fontSize: "13px", color: "#007185", marginTop: "4px"}}>
                     Select a voucher to apply to this order.
                   </div>
                 ) : (
                   <div style={{fontSize: "13px", color: "#565959", marginTop: "4px"}}>
                     Buy Grade A/B items ≥$50 to earn vouchers.
                   </div>
                 )}
               </div>
               <Tag className="w-6 h-6 text-[#565959]" />
             </div>

             {/* Expanded Voucher List (Only visible when voucher option is selected) */}
             {selectedVoucherId !== null && activeVouchers.length > 0 && (
               <div className="mt-4 ml-[30px] flex flex-col gap-3">
                 {activeVouchers.map((v: any) => {
                   const isSelected = selectedVoucherId === v.id;
                   return (
                     <label key={v.id} className="flex items-center gap-3 cursor-pointer p-3 rounded border bg-white transition-all" style={{borderColor: isSelected ? "#007185" : "#D5D9D9", boxShadow: isSelected ? "0 0 0 1px #007185" : "none"}}>
                       <input 
                         type="radio" 
                         checked={isSelected} 
                         onChange={() => {
                           setUseCashback(false);
                           setSelectedVoucherId(v.id);
                         }} 
                         style={{width: "16px", height: "16px", accentColor: "#007185"}} 
                       />
                       <div className="flex-1">
                         <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111"}}>{v.title}</div>
                         <div style={{fontSize: "12px", color: "#565959"}}>Expires in 30 days</div>
                       </div>
                       <div style={{fontSize: "16px", fontWeight: 800, color: "#B12704"}}>
                         -${v.discountAmount.toFixed(2)}
                       </div>
                     </label>
                   );
                 })}
               </div>
             )}
          </label>

          {/* Option 3: None */}
          <label 
            className="flex flex-col cursor-pointer transition-all" 
            style={{ 
              borderTop: "1px solid #D5D9D9",
              background: (!useCashback && selectedVoucherId === null) ? "#FCF5EE" : "#FFF",
              padding: "16px"
            }}
          >
             <div className="flex items-center gap-3">
               <input 
                 type="radio" 
                 checked={!useCashback && selectedVoucherId === null} 
                 onChange={() => {
                   setUseCashback(false);
                   setSelectedVoucherId(null);
                 }}
                 style={{width: "18px", height: "18px", accentColor: "#007185", cursor: "pointer"}} 
               />
               <div style={{fontSize: "15px", fontWeight: 700, color: "#0F1111"}}>
                 Do not use any rewards for this order
               </div>
             </div>
          </label>
        </div>
      </div>
    );
  };

  const StandaloneRewardsDashboard = () => {
    const totalCredits = Math.round(cashbackBalance * 100);
    const recentActivity = [
      { date: "12 May 2025", activity: "Purchased Grade C item", credits: 45 },
      { date: "08 May 2025", activity: "Purchased Grade A item", credits: 12 },
      { date: "02 May 2025", activity: "Purchased Grade B item", credits: 8 },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "calc(100vh - 128px)", overflow: "hidden", background: "#F2F4F8" }}>

        {/* ── ROW 1: Hero ── */}
        <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ background: "#1a6b3c", borderRadius: "10px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0F1111", lineHeight: 1.2, margin: 0 }}>Amazon Green Rewards</h1>
              <p style={{ fontSize: "13px", color: "#565959", margin: "3px 0 0", lineHeight: 1.4 }}>Shop Pre-loved. Save the planet. Earn rewards that you can spend on your next purchase.</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            {/* Credits Box — live from walletInfo */}
            <div style={{ background: "#F7F8F8", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "12px 20px", textAlign: "left", minWidth: "150px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Green Credits Available</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "36px", fontWeight: 800, color: "#0F1111", lineHeight: 1 }}>{totalCredits}</span>
                <Leaf className="w-4 h-4 text-[#1a6b3c]" />
              </div>
              <div style={{ fontSize: "11px", color: "#565959", marginTop: "4px" }}>100 Credits = $1.00</div>
            </div>

            {/* Globe SVG */}
            <svg viewBox="0 0 120 95" style={{ width: "110px", height: "88px", flexShrink: 0 }}>
              <ellipse cx="65" cy="48" rx="44" ry="44" fill="#d1e8d1" opacity="0.7" />
              <ellipse cx="56" cy="37" rx="16" ry="10" fill="#9cc49c" opacity="0.8" />
              <ellipse cx="78" cy="52" rx="12" ry="16" fill="#9cc49c" opacity="0.7" />
              <ellipse cx="48" cy="58" rx="9" ry="7" fill="#9cc49c" opacity="0.6" />
              <ellipse cx="65" cy="48" rx="44" ry="44" fill="none" stroke="#a8d5a8" strokeWidth="1.5" />
              <ellipse cx="65" cy="48" rx="44" ry="15" fill="none" stroke="#b8d8b8" strokeWidth="0.7" opacity="0.5" />
              <rect x="20" y="70" width="26" height="19" rx="2.5" fill="#c8a96e" />
              <rect x="20" y="70" width="26" height="6" rx="2.5" fill="#a07840" />
              <line x1="33" y1="70" x2="33" y2="89" stroke="#a07840" strokeWidth="0.8" />
              <ellipse cx="22" cy="63" rx="8" ry="4" fill="#6aad6a" transform="rotate(-30 22 63)" />
              <ellipse cx="45" cy="60" rx="8" ry="4" fill="#5a9d5a" transform="rotate(25 45 60)" />
            </svg>
          </div>
        </div>

        {/* ── ROW 2: How to earn + Vouchers (side by side, flex-1) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.55fr", gap: "10px", flex: "1 1 0", minHeight: 0 }}>

          {/* How to earn */}
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", flexShrink: 0 }}>
              <Info className="w-3.5 h-3.5 text-[#565959]" /> How to earn credits
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {[
                { icon: <ShoppingBag className="w-3.5 h-3.5 text-[#0F1111]" />, title: "Shop Pre-loved", desc: "Buy verified pre-loved items from the marketplace." },
                { icon: <BadgePercent className="w-3.5 h-3.5 text-[#007185]" />, title: "Grade C = 10% Back", desc: "Heavily used items earn the highest cashback." },
                { icon: <CheckCircle className="w-3.5 h-3.5 text-[#007600]" />, title: "Grade A/B = 3–5% Back", desc: "Like-new and Good condition earn standard rates." },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "7px", border: "1.5px solid #D5D9D9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#F7F8F8" }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111", marginBottom: "1px" }}>{title}</div>
                    <div style={{ fontSize: "12px", color: "#565959", lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #E3E6E6", flexShrink: 0 }}>
              <button style={{ fontSize: "12px", color: "#007185", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                View full terms &amp; conditions <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Your Vouchers — live from walletInfo */}
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "16px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexShrink: 0 }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                <Tag className="w-3.5 h-3.5 text-[#565959]" /> Your Vouchers
              </h3>
              <span style={{ fontSize: "12px", color: "#007185", background: "#F0F8FA", border: "1px solid #BEE3F0", borderRadius: "20px", padding: "3px 10px", fontWeight: 700 }}>
                {activeVouchers.length} Available
              </span>
            </div>

            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: activeVouchers.length === 0 ? "center" : "flex-start" }}>
              {activeVouchers.length === 0 ? (
                <div style={{ textAlign: "center", border: "1px solid #D5D9D9", borderRadius: "8px", padding: "20px 16px" }}>
                  <Tag style={{ width: "32px", height: "32px", color: "#C8CBCC", display: "block", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "4px" }}>No vouchers yet</div>
                  <div style={{ fontSize: "12px", color: "#565959" }}>Make qualifying pre-loved purchases over $50 to unlock special discounts.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflow: "auto" }}>
                  {activeVouchers.map((v: any) => (
                    <div key={v.id} style={{ border: "1px solid #D5D9D9", borderRadius: "8px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F7FAFD" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111" }}>{v.title}</div>
                        <div style={{ fontSize: "11px", color: "#565959" }}>Issued {new Date(v.issuedAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#007600" }}>${v.discountAmount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #E3E6E6", flexShrink: 0 }}>
              <button style={{ fontSize: "12px", color: "#007185", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                How vouchers work <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Recent Activity + Good for you (side by side, flex-1) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "10px", flex: "1 1 0", minHeight: 0 }}>

          {/* Recent Activity */}
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "14px 18px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", flexShrink: 0 }}>
              <Wallet className="w-3.5 h-3.5 text-[#565959]" /> Recent activity
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E3E6E6" }}>
                  {["DATE", "ACTIVITY", "CREDITS EARNED", "TOTAL BALANCE"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "#565959", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #F2F4F8" }}>
                    <td style={{ padding: "9px 10px", color: "#0F1111" }}>{row.date}</td>
                    <td style={{ padding: "9px 10px", color: "#0F1111" }}>{row.activity}</td>
                    <td style={{ padding: "9px 10px", color: "#007600", fontWeight: 700 }}>+{row.credits}</td>
                    <td style={{ padding: "9px 10px", color: "#0F1111" }}>0</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "auto", paddingTop: "10px", borderTop: "1px solid #E3E6E6" }}>
              <button style={{ fontSize: "12px", color: "#007185", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                View all activity <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Good for you */}
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "16px 18px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <svg viewBox="0 0 100 90" style={{ width: "70px", height: "63px", marginBottom: "10px" }}>
              <path d="M35 65 L40 85 L60 85 L65 65 Z" fill="#c8945a" />
              <ellipse cx="50" cy="65" rx="15" ry="5" fill="#a07440" />
              <ellipse cx="50" cy="64" rx="14" ry="4" fill="#6b4226" />
              <line x1="50" y1="64" x2="50" y2="38" stroke="#4a8c3f" strokeWidth="3" strokeLinecap="round" />
              <path d="M50 52 Q32 42 30 28 Q44 32 50 44" fill="#5aad50" />
              <path d="M50 45 Q68 35 70 20 Q56 26 50 40" fill="#6abf60" />
              <path d="M50 38 Q50 22 44 16 Q52 18 56 30 Q54 36 50 38" fill="#4a9e42" />
              <circle cx="50" cy="72" r="3" fill="white" />
            </svg>
            <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0F1111", lineHeight: 1.3, marginBottom: "8px" }}>Good for you.<br />Good for the planet.</h3>
            <p style={{ fontSize: "12px", color: "#565959", lineHeight: 1.5, marginBottom: "12px" }}>Every pre-loved purchase helps reduce waste and build a greener future.</p>
            <button style={{ fontSize: "12px", color: "#007185", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
              Learn more about ReLoop <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── ROW 4: Footer trust strip ── */}
        <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "10px", padding: "12px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", flexShrink: 0 }}>
          {[
            { icon: <Info className="w-4 h-4 text-[#565959]" />, title: "Secure & Private", desc: "Your data is encrypted and never shared." },
            { icon: <BadgePercent className="w-4 h-4 text-[#565959]" />, title: "Fewer Returns", desc: "Find the right size and shop with confidence." },
            { icon: <Wallet className="w-4 h-4 text-[#565959]" />, title: "Need help?", desc: <span>Visit Help Center <ArrowRight className="inline w-3 h-3" /></span> },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{ flexShrink: 0, marginTop: "1px" }}>{icon}</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111", marginBottom: "1px" }}>{title}</div>
                <div style={{ fontSize: "12px", color: "#565959" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────
  if (showOnlyRewards) {
    return (
      <div style={{ background: "#F2F4F8", padding: "16px", margin: "-24px" }}>
        <StandaloneRewardsDashboard />
      </div>
    );
  }


  if (checkoutStep === "confirmed") {
    const displayOrderId = `407-${Math.floor(Math.random() * 10000000)}-${Math.floor(Math.random() * 10000000)}`;
    const orderDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    
    const displayItems = orderSummary?.items || shoppingBag;
    const displaySubtotal = orderSummary?.subtotal || subtotal;
    const displayTotalDiscount = orderSummary?.totalDiscount || (voucherDiscount + cashbackDiscount);
    const displayOrderTotal = orderSummary?.orderTotal || orderTotal;
    
    return (
      <div className="font-sans w-full" style={{ padding: "0 10px" }}>
        
        <div style={{ display: "flex", flexWrap: "nowrap", gap: "24px", width: "100%" }}>
          {/* LEFT COLUMN */}
          <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
            
            {/* Box 1: Thank You */}
            <div style={{border: "1px solid #78c067", borderRadius: "8px", padding: "16px", background: "#FFF"}}>
              <div className="flex items-center gap-3 mb-2">
                <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#067D62", display: "flex", alignItems: "center", justifyContent: "center"}}>
                   <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 style={{fontSize: "20px", color: "#067D62", fontWeight: 700, margin: 0}}>Thank you, your order has been placed.</h2>
              </div>
              <div style={{fontSize: "14px", color: "#0F1111", marginBottom: "12px", marginLeft: "40px"}}>
                We've sent you an email confirmation. <span style={{color: "#067D62"}}>New</span>
              </div>
              
              <div style={{marginLeft: "40px"}}>
                <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Order Number: {displayOrderId}</div>
                 <div className="flex gap-20 mb-4">
                   <div>
                     <div style={{fontSize: "14px", color: "#565959", marginBottom: "2px"}}>Order Date</div>
                     <div style={{fontSize: "14px", color: "#0F1111"}}>{orderDate}</div>
                   </div>
                   <div>
                     <div style={{fontSize: "14px", color: "#565959", marginBottom: "2px"}}>Total</div>
                     <div style={{fontSize: "14px", color: "#0F1111"}}>${displayOrderTotal.toFixed(2)}</div>
                   </div>
                </div>
                <div style={{fontSize: "14px", color: "#0F1111"}}>
                  You can check your order status in <span onClick={() => { handleDone(); window.location.hash = "#orders"; }} className="cursor-pointer hover:underline" style={{color: "#007185"}}>Your Orders</span>.
                </div>
              </div>
            </div>

            {/* Box 2: Item and Delivery */}
            <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF"}}>
               <div style={{fontSize: "14px", color: "#0F1111", marginBottom: "16px"}}>
                 Your item has been placed. We'll send a confirmation when it ships.
               </div>
               
               <div className="flex flex-col sm:flex-row gap-8 mb-6">
                 {/* Product Info */}
                 <div className="flex-1 flex gap-4">
                    {displayItems.length > 0 && (
                      <>
                        <img src={getSKUReferenceImage(displayItems[0].sku)} alt="" style={{width: "70px", height: "70px", objectFit: "contain"}} />
                        <div>
                          <div style={{fontSize: "14px", color: "#0F1111"}}>{displayItems[0].name}</div>
                          <div style={{fontSize: "14px", color: "#B12704", fontWeight: 700, marginTop: "2px"}}>${displayItems[0].price.toFixed(2)}</div>
                          <div style={{fontSize: "12px", color: "#565959", marginTop: "2px"}}>Sold by: Amazon Pre-loved Marketplace</div>
                        </div>
                      </>
                    )}
                 </div>
                 
                 {/* Delivery Info */}
                 <div className="w-full sm:w-[250px]">
                   <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "2px"}}>Delivery to:</div>
                   <div style={{fontSize: "14px", color: "#0F1111", lineHeight: "1.4"}}>
                     {profileUserId || "Shravani Wange"}<br/>
                     123 Demo Street, Suite 400<br/>
                     Seattle, WA 98109<br/>
                     United States
                   </div>
                   <div style={{fontSize: "14px", color: "#007185", marginTop: "4px", cursor: "pointer"}} className="hover:underline">Change delivery address</div>
                 </div>
               </div>

               {/* Buttons */}
               <div className="flex gap-4">
                 <button onClick={() => { handleDone(); window.location.hash = "#orders"; }} style={{background: "#FFD814", color: "#0F1111", border: "1px solid #FCD200", borderRadius: "8px", padding: "6px 0", fontSize: "14px", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", width: "180px", textAlign: "center"}} className="hover:bg-[#F7CA00]">
                   View or manage order
                 </button>
                 <button onClick={() => { handleDone(); window.location.hash = "#"; }} style={{background: "#FFF", color: "#0F1111", border: "1px solid #D5D9D9", borderRadius: "8px", padding: "6px 0", fontSize: "14px", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", width: "180px", textAlign: "center"}} className="hover:bg-[#F7F8F8]">
                   Continue shopping
                 </button>
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Prime Box */}
            <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px 16px", background: "#FFF"}}>
              <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "4px"}}>Want faster delivery?</div>
              <div style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>Get One-Day Delivery on millions of items with</div>
              <img src="/prime-logo-2.png" alt="Prime" style={{height: "20px", marginBottom: "12px", mixBlendMode: "multiply"}} />
              <button onClick={(e) => e.preventDefault()} style={{background: "#FFD814", color: "#0F1111", border: "1px solid #FCD200", borderRadius: "8px", padding: "6px", fontSize: "14px", width: "100%", textAlign: "center", boxShadow: "0 1px 2px rgba(15,17,17,0.15)"}} className="hover:bg-[#F7CA00]">
                Join Prime
              </button>
            </div>
            
            {/* Order Summary */}
            <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF"}}>
              <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Order Summary</div>
              
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Items:</span>
                <span>${displaySubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Delivery:</span>
                <span>FREE</span>
              </div>
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Total:</span>
                <span>${displaySubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Promotion Applied:</span>
                <span>-${displayTotalDiscount.toFixed(2)}</span>
              </div>
              
              <div style={{borderTop: "1px solid #D5D9D9", margin: "12px 0 10px 0"}} />
              
              <div className="flex justify-between items-center" style={{marginBottom: "4px"}}>
                <span style={{fontSize: "16px", fontWeight: 700, color: "#0F1111"}}>Order Total:</span>
                <span style={{fontSize: "18px", fontWeight: 700, color: "#B12704"}}>${displayOrderTotal.toFixed(2)}</span>
              </div>
              <div style={{fontSize: "12px", color: "#565959"}}>Inclusive of all taxes</div>
            </div>

            {/* Amazon Pay Box */}
            <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF", display: "flex", gap: "12px", alignItems: "flex-start"}}>
              <img src="/amazon-pay-logo-2.png" alt="Amazon Pay" style={{width: "60px", objectFit: "contain", mixBlendMode: "multiply"}} />
              <div style={{fontSize: "12px", color: "#0F1111", lineHeight: "1.4"}}>
                <span style={{fontWeight: 700}}>You saved ${displayTotalDiscount.toFixed(2)}</span> on this order with Amazon Pay balance.<br/>
                <span className="cursor-pointer hover:underline hover:text-[#007185]" style={{color: "#007185"}}>View Amazon Pay balance</span>
              </div>
            </div>

            {/* Need help? */}
            <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF"}}>
              <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Need help?</div>
              <div className="flex flex-col gap-2">
                <span className="cursor-pointer hover:underline hover:text-[#007185]" style={{fontSize: "14px", color: "#007185"}}>How do I check my order status?</span>
                <span className="cursor-pointer hover:underline hover:text-[#007185]" style={{fontSize: "14px", color: "#007185"}}>Can I change or cancel my order?</span>
                <span className="cursor-pointer hover:underline hover:text-[#007185]" style={{fontSize: "14px", color: "#007185"}}>How do I return an item?</span>
                <span className="cursor-pointer hover:underline hover:text-[#007185]" style={{fontSize: "14px", color: "#007185"}}>View more help topics</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col gap-5">
      <div className="section-title-bar">
        <h2>My Cart &amp; Rewards</h2>
        <span className="section-badge badge-layer-6">Checkout</span>
      </div>

      {/* Rewards summary — always shown except post-confirmation */}
      <RewardsPanel />

      {/* ── BAG STEP ── */}
      {checkoutStep === "bag" && (
        <div className="flex flex-col md:flex-row gap-5 items-start mt-4">
          
          {/* LEFT COL: Cart items */}
          <div className="flex-1 w-full bg-white" style={{padding: "20px 20px", border: "1px solid #DDD", borderRadius: "0px"}}>
            <div className="flex justify-between items-end mb-1">
              <div>
                <h1 style={{fontSize: "28px", fontWeight: 400, color: "#0F1111", lineHeight: "36px"}}>Shopping Cart</h1>
                <p style={{fontSize: "14px", color: "#007185", cursor: "pointer", marginTop: "2px"}}>Deselect all items</p>
              </div>
              <div style={{fontSize: "14px", color: "#565959", paddingBottom: "4px"}}>Price</div>
            </div>
            
            <div style={{borderBottom: "1px solid #DDD", marginBottom: "16px"}} />

            {shoppingBag.length === 0 ? (
              <div style={{padding:"20px", display:"flex", gap:"20px"}}>
                <div style={{flex:1}}>
                  <h2 style={{fontSize:"1.2rem", fontWeight:700, marginBottom:"8px"}}>Your Amazon Cart is empty.</h2>
                  <p style={{fontSize:"0.9rem", color:"#565959"}}>Browse <strong>Shop Pre-Loved</strong> to add items to your cart.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {shoppingBag.map((item: any, idx: number) => {
                  return (
                    <div key={item.sku + idx} style={{display:"flex", gap:"16px", paddingBottom:"16px", borderBottom:"1px solid #DDD", position: "relative"}}>
                      
                      <div style={{paddingTop: "40px"}}>
                        <input 
                          type="checkbox" 
                          defaultChecked 
                          onChange={(e) => {
                            if (!e.target.checked) {
                              removeFromBag(item.sku);
                            }
                          }}
                          style={{width: "16px", height: "16px", accentColor: "#007185", cursor: "pointer"}} 
                        />
                      </div>

                      <img
                        src={getSKUReferenceImage(item.sku)}
                        alt={item.name}
                        style={{width:"130px", height:"130px", objectFit:"contain"}}
                      />
                      
                      <div className="flex-1 flex flex-col gap-1">
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
                          <div style={{fontSize:"16px", fontWeight:400, color:"#0F1111", lineHeight:"1.4", paddingRight: "20px", maxWidth: "600px"}}>
                            {item.name}
                          </div>
                          <div style={{textAlign: "right", flexShrink: 0}}>
                            <div style={{fontSize:"18px", fontWeight:700, color:"#0F1111"}}>
                              <span style={{fontSize: "14px", fontWeight: 400, verticalAlign: "top", marginRight: "1px"}}>$</span>
                              {Math.floor(item.price)}
                              <span style={{fontSize: "14px", fontWeight: 400, verticalAlign: "top", marginLeft: "1px"}}>.{(item.price % 1).toFixed(2).substring(2)}</span>
                            </div>
                            
                            <div style={{marginTop: "8px", border: "1px solid #DDD", borderRadius: "4px", padding: "4px 8px", display: "inline-block", backgroundColor: "#FFF", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"}}>
                               <div style={{fontSize: "12px", color: "#0F1111"}}>Save 2% <ChevronDown className="w-3 h-3 inline text-[#565959] ml-1" /></div>
                               <div style={{fontSize: "11px", color: "#007185"}}>Collect Coupon</div>
                            </div>
                            
                            <div style={{fontSize: "11px", color: "#0F1111", marginTop: "6px"}}>
                              Up to 5% back with Amazon Pay<br/>ICICI card <span style={{color: "#007185"}}>Terms</span>
                            </div>
                          </div>
                        </div>
                        
                        <div style={{fontSize: "12px", color: "#007600", marginTop: "2px"}}>In stock</div>
                        <div style={{fontSize: "14px", color: "#0F1111"}}>
                          FREE delivery <span style={{fontWeight: 700}}>Wed, 22 Jul</span>
                        </div>
                        
                        <div>
                           <img src="/amz-fulfilled.png" alt="Fulfilled by Amazon" style={{height: "18px", marginTop: "2px"}} onError={(e) => {
                             e.currentTarget.style.display = 'none';
                             const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                             if (fallback) fallback.style.display = 'inline-block';
                           }} />
                           <span style={{display:"none", background:"#232F3E", color:"#FFF", fontSize:"11px", padding:"2px 5px", borderRadius:"2px", marginTop:"4px", fontWeight: "bold", fontFamily: "Arial, sans-serif"}}>
                             <span style={{color:"#FF9900", fontStyle:"italic", marginRight:"2px", fontSize:"12px", display:"inline-block", transform:"rotate(-5deg)"}}>a</span>
                             <span style={{color:"#FFF"}}>Fulfilled</span>
                           </span>
                        </div>
                        
                        <div style={{display: "flex", alignItems: "center", gap: "6px", marginTop: "4px"}}>
                          <input type="checkbox" style={{width: "13px", height: "13px"}} />
                          <span style={{fontSize: "12px", color: "#0F1111"}}>This will be a gift <span style={{color: "#007185"}}>Learn more</span></span>
                        </div>

                        {(item.size || item.colors) && (
                          <div style={{fontSize: "12px", color: "#0F1111", marginTop: "6px"}}>
                            {item.size && <div><span style={{fontWeight: 700}}>Size:</span> {item.size}</div>}
                            {item.colors && item.colors.length > 0 && <div><span style={{fontWeight: 700}}>Colour:</span> {item.colors[0]}</div>}
                          </div>
                        )}
                        
                        <div style={{marginTop:"12px", display:"flex", alignItems:"center", gap:"12px", fontSize:"13px"}}>
                          <div style={{display: "flex", alignItems: "center", border: "2px solid #FFD814", borderRadius: "100px", background: "#FFF", overflow: "hidden", height: "30px", boxShadow: "0 1px 3px rgba(15,17,17,0.15)"}}>
                             <button style={{padding: "0 10px", background: "#F0F2F2", height: "100%", display: "flex", alignItems: "center", borderRight: "1px solid #D5D9D9", cursor: "pointer", transition: "background 0.2s"}} onClick={() => removeFromBag(item.sku)} className="hover:bg-[#E3E6E6]">
                               <Trash2 className="w-3.5 h-3.5 text-[#0F1111]" />
                             </button>
                             <span style={{padding: "0 14px", fontSize: "14px", color: "#0F1111", fontWeight: 700}}>1</span>
                             <button style={{padding: "0 10px", background: "#F0F2F2", height: "100%", display: "flex", alignItems: "center", borderLeft: "1px solid #D5D9D9", cursor: "pointer", transition: "background 0.2s"}} className="hover:bg-[#E3E6E6]">
                               <Plus className="w-3.5 h-3.5 text-[#0F1111]" />
                             </button>
                          </div>
                          
                          <div style={{display: "flex", gap: "12px", color: "#007185"}}>
                            <span style={{color: "#DDD"}}>|</span>
                            <button onClick={() => removeFromBag(item.sku)} className="hover:underline hover:text-[#c45500]">Delete</button>
                            <span style={{color: "#DDD"}}>|</span>
                            <button className="hover:underline hover:text-[#c45500]">Save for later</button>
                            <span style={{color: "#DDD"}}>|</span>
                            <button className="hover:underline hover:text-[#c45500]">See more like this</button>
                            <span style={{color: "#DDD"}}>|</span>
                            <button className="hover:underline hover:text-[#c45500]">Share</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {shoppingBag.length > 0 && (
              <div style={{textAlign:"right", paddingTop:"12px", fontSize:"18px", color:"#0F1111", paddingBottom: "10px"}}>
                Subtotal ({shoppingBag.length} item{shoppingBag.length !== 1 ? "s" : ""}): <span style={{fontWeight:700}}>${subtotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* RIGHT COL: Checkout Sidebar */}
          {shoppingBag.length > 0 && (
            <div className="w-full md:w-[320px] flex flex-col gap-5">
              
              <div className="bg-white" style={{padding: "20px", border: "1px solid #DDD", borderRadius: "0px"}}>
                
                {/* Progress bar area */}
                <div style={{marginBottom: "16px"}}>
                  <div style={{height: "8px", background: "#E3E6E6", borderRadius: "4px", overflow: "hidden", marginBottom: "8px", display: "flex"}}>
                     <div style={{background: "#007600", width: "100%", height: "100%"}}></div>
                  </div>
                  <div style={{display: "flex", alignItems: "flex-start", gap: "6px"}}>
                    <CheckCircle className="w-4 h-4 text-[#007600] flex-shrink-0 mt-0.5" />
                    <div>
                      <div style={{fontSize: "12px", color: "#007600"}}><span style={{fontWeight: 700}}>Your order is eligible for FREE Delivery.</span></div>
                      <div style={{fontSize: "12px", color: "#565959"}}>Choose <span style={{color: "#007185"}}>FREE Delivery</span> option at checkout.</div>
                    </div>
                  </div>
                </div>

                <div style={{fontSize:"15px", color:"#0F1111", lineHeight:"1.3", marginBottom: "12px"}}>
                  <div style={{display: "flex", justifyContent: "space-between", marginBottom: "4px"}}>
                    <span>Items ({shoppingBag.length}):</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {(voucherDiscount > 0 || cashbackDiscount > 0) && (
                    <div style={{paddingBottom: "8px", borderBottom: "1px solid #D5D9D9", marginBottom: "8px"}}>
                      {voucherDiscount > 0 && (
                        <div style={{display: "flex", justifyContent: "space-between", color: "#B12704", marginBottom: "2px"}}>
                          <span>Voucher Discount:</span>
                          <span>-${voucherDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      {cashbackDiscount > 0 && (
                        <div style={{display: "flex", justifyContent: "space-between", color: "#B12704"}}>
                          <span>Green Credits:</span>
                          <span>-${cashbackDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 700, color: "#B12704"}}>
                    <span>Order Total:</span>
                    <span>${orderTotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <div style={{display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px"}}>
                  <input type="checkbox" style={{width: "13px", height: "13px"}} />
                  <span style={{fontSize: "13px", color: "#0F1111"}}>This order contains a gift</span>
                </div>

                <button
                  className="w-full py-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-[0_1px_2px_rgba(15,17,17,0.15)] text-[13px] font-medium transition-all"
                  onClick={handleConfirmPurchase}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? <span className="spinner" /> : "Proceed to Buy"}
                </button>
              </div>

              {/* Prime Box */}
              <div style={{background: "#0071E3", padding: "16px", color: "#FFF"}}>
                <div style={{fontSize: "16px", lineHeight: "1.4", marginBottom: "16px"}}>
                  Enjoy faster deliveries, offers and so much more!<br/><br/>
                  Join Prime now for FREE deliveries, cancel anytime!
                </div>
                <button style={{width: "100%", padding: "10px", background: "#FFD814", color: "#0F1111", borderRadius: "100px", border: "1px solid #FCD200", fontSize: "12px", fontWeight: 400, boxShadow: "0 1px 2px rgba(0,0,0,0.15)"}}>
                  Join Prime Shopping Edition at<br/>$4.99/year
                </button>
              </div>

              {/* Related Products */}
              <div className="bg-white" style={{padding: "16px", border: "1px solid #DDD", borderRadius: "0px"}}>
                <h3 style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Products related to items in your cart</h3>
                <div style={{fontSize: "11px", color: "#565959", marginBottom: "12px", display: "flex", alignItems: "center", gap: "4px"}}>
                  Sponsored <Info className="w-3 h-3" />
                </div>
                
                <div style={{display: "flex", gap: "12px"}}>
                  <div style={{width: "80px", height: "80px", background: "#F7F7F7", flexShrink: 0}}>
                    <img src="/sunglasses.jpg" alt="" style={{width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply"}} onError={(e) => { e.currentTarget.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="%23ddd"><rect width="80" height="80"/></svg>'}} />
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: "13px", color: "#007185", lineHeight: "1.3", marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"}}>
                      Vincent Chase By Lenskart
                    </div>
                    <div className="flex text-[#DE7921] text-xs leading-none mb-1">
                       ★★★★<span style={{color: "#DDD"}}>★</span>
                    </div>
                    <div style={{fontSize: "11px", color: "#007185"}}>5,647 ratings</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
