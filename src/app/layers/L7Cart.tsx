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

  const StandaloneRewardsDashboard = () => (
    <div className="flex flex-col gap-6" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* Hero Banner */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(to right, #232F3E, #131A22)", padding: "40px", borderRadius: "12px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)" }}>
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none" style={{ transform: "translate(20%, -30%) rotate(15deg)" }}>
          <Leaf className="w-64 h-64 text-emerald-500" />
        </div>
        
        <div className="relative z-10">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ background: "rgba(20, 184, 166, 0.2)", padding: "8px", borderRadius: "8px" }}>
              <Leaf className="w-8 h-8 text-[#14b8a6]" />
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Amazon Green Rewards
            </h1>
          </div>
          <p style={{ fontSize: "16px", color: "#d1d5db", maxWidth: "400px", lineHeight: "1.5" }}>
            Shop Pre-loved. Save the planet. Earn rewards that you can spend on your next purchase.
          </p>
        </div>
        
        <div className="relative z-10" style={{ textAlign: "right", background: "rgba(255,255,255,0.08)", padding: "20px 30px", borderRadius: "12px", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", marginBottom: "4px" }}>
            <Wallet className="w-4 h-4 text-[#FF9900]" />
            <div style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: "#9ca3af", fontWeight: 700 }}>Green Credits Available</div>
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "#FF9900", lineHeight: "1", textShadow: "0 2px 10px rgba(255,153,0,0.3)" }}>
            {Math.round(cashbackBalance * 100)}
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>100 Credits = $1.00</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: How it works */}
        <div style={{ border: "1px solid #D5D9D9", borderRadius: "12px", padding: "24px", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F1111", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Info className="w-5 h-5 text-[#007185]" /> How to earn credits
          </h3>
          <ul style={{ fontSize: "14px", color: "#0F1111", display: "flex", flexDirection: "column", gap: "16px" }}>
            <li className="flex items-start gap-3">
              <div className="bg-[#E7F5E7] p-1.5 rounded-full mt-0.5"><CheckCircle className="w-4 h-4 text-[#007600]" /></div>
              <div><strong className="block text-[#0F1111]">Shop Pre-loved</strong>Buy verified pre-loved items from the marketplace.</div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-[#E7F5E7] p-1.5 rounded-full mt-0.5"><CheckCircle className="w-4 h-4 text-[#007600]" /></div>
              <div><strong className="block text-[#0F1111]">Grade C = 10% Back</strong>Heavily used items earn the highest cashback to offset wear.</div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-[#E7F5E7] p-1.5 rounded-full mt-0.5"><CheckCircle className="w-4 h-4 text-[#007600]" /></div>
              <div><strong className="block text-[#0F1111]">Grade A/B = 3-5% Back</strong>Like-new and Good condition items earn standard rates.</div>
            </li>
          </ul>
        </div>

        {/* Card 2: Your Vouchers */}
        <div style={{ border: "1px solid #D5D9D9", borderRadius: "12px", padding: "24px", background: "#fff", gridColumn: "span 2", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F1111", display: "flex", alignItems: "center", gap: "8px" }}>
              <Tag className="w-5 h-5 text-[#FF9900]" /> Your Vouchers
            </h3>
            <span style={{ fontSize: "13px", background: "#F0F8FA", color: "#007185", padding: "6px 12px", borderRadius: "20px", fontWeight: 800, border: "1px solid #BEE3F0" }}>
              {activeVouchers.length} Available
            </span>
          </div>
          
          {activeVouchers.length === 0 ? (
            <div className="text-center py-10 text-[#565959] bg-[#F7F8F8] rounded-lg border border-dashed border-[#D5D9D9]">
              <Tag className="w-10 h-10 mx-auto mb-3 text-[#C8CBCC]" />
              <p className="font-bold text-[15px] text-[#0F1111]">No vouchers yet</p>
              <p className="text-[13px] mt-1 mx-auto">Make qualifying pre-loved purchases over $50 to unlock special discounts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeVouchers.map((v: any) => (
                <div key={v.id} className="relative flex items-center border border-[#D5D9D9] rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group h-[90px]">
                  {/* Left Accent */}
                  <div className="w-1.5 h-full bg-[#007185]"></div>
                  
                  {/* Icon Area */}
                  <div className="px-4 flex items-center justify-center border-r border-dashed border-[#D5D9D9] h-full bg-[#F2F4F8]">
                    <Tag className="w-7 h-7 text-[#007185]" />
                  </div>
                  
                  {/* Content Area */}
                  <div className="flex-1 px-4 py-2 flex flex-col justify-center min-w-0">
                    <div className="font-bold text-[#0F1111] text-[15px] leading-tight mb-1 truncate" title={v.title}>
                      {v.title}
                    </div>
                    <div className="text-[12px] text-[#565959]">
                      Issued {new Date(v.issuedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Value Area */}
                  <div className="px-5 flex flex-col items-end justify-center bg-[#F8F9FA] h-full border-l border-[#E3E6E6]">
                    <div className="text-[10px] text-[#565959] uppercase tracking-wide font-bold mb-1">
                      Voucher Value
                    </div>
                    <div className="text-[22px] font-extrabold text-[#007600] leading-none tracking-tight">
                      ${v.discountAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────
  if (showOnlyRewards) {
    return (
      <div className="bg-[#F2F4F8] p-6 -mx-6 -mt-6">
        <StandaloneRewardsDashboard />
      </div>
    );
  }

  if (checkoutStep === "confirmed") {
    const displayOrderId = `407-${Math.floor(Math.random() * 10000000)}-${Math.floor(Math.random() * 10000000)}`;
    const orderDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const totalDiscount = voucherDiscount + cashbackDiscount;
    
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
                     <div style={{fontSize: "14px", color: "#0F1111"}}>${orderTotal.toFixed(2)}</div>
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
                    {shoppingBag.length > 0 && (
                      <>
                        <img src={getSKUReferenceImage(shoppingBag[0].sku)} alt="" style={{width: "70px", height: "70px", objectFit: "contain"}} />
                        <div>
                          <div style={{fontSize: "14px", color: "#0F1111"}}>{shoppingBag[0].name}</div>
                          <div style={{fontSize: "14px", color: "#B12704", fontWeight: 700, marginTop: "2px"}}>${shoppingBag[0].price.toFixed(2)}</div>
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
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Delivery:</span>
                <span>FREE</span>
              </div>
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Total:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "4px"}}>
                <span>Promotion Applied:</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
              
              <div style={{borderTop: "1px solid #D5D9D9", margin: "12px 0 10px 0"}} />
              
              <div className="flex justify-between items-center" style={{marginBottom: "4px"}}>
                <span style={{fontSize: "16px", fontWeight: 700, color: "#0F1111"}}>Order Total:</span>
                <span style={{fontSize: "18px", fontWeight: 700, color: "#B12704"}}>${orderTotal.toFixed(2)}</span>
              </div>
              <div style={{fontSize: "12px", color: "#565959"}}>Inclusive of all taxes</div>
            </div>

            {/* Amazon Pay Box */}
            <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF", display: "flex", gap: "12px", alignItems: "flex-start"}}>
              <img src="/amazon-pay-logo-2.png" alt="Amazon Pay" style={{width: "60px", objectFit: "contain", mixBlendMode: "multiply"}} />
              <div style={{fontSize: "12px", color: "#0F1111", lineHeight: "1.4"}}>
                <span style={{fontWeight: 700}}>You saved ${totalDiscount.toFixed(2)}</span> on this order with Amazon Pay balance.<br/>
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
