"use client";

/**
 * LMarketplace.tsx — Shop Pre-Loved Tab
 * ──────────────────────────────────────────
 * Owns: Marketplace feed fetch, shopping bag, checkout modal.
 * API: /api/marketplace (GET)
 */

import React, { useEffect } from "react";
import {
  ShoppingBag,
  Leaf,
  Map,
  Award,
  Heart,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  X,
} from "lucide-react";
import {
  useApp,
  getSKUReferenceImage,
} from "./AppContext";

export default function LMarketplace() {
  const {
    profileUserId,
    profileZip,
    setSelectedProductSku,
    walletInfo,
    setWalletInfo,
    shoppingBag,
    setShoppingBag,
    showCheckoutModal,
    setShowCheckoutModal,
    checkoutStep,
    setCheckoutStep,
  } = useApp();

  const [marketplaceFeed, setMarketplaceFeed] = React.useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = React.useState(false);

  useEffect(() => {
    if (profileUserId && profileZip) {
      fetchMarketplaceFeed();
    }
  }, [profileUserId, profileZip]);

  const fetchMarketplaceFeed = async () => {
    setMarketplaceLoading(true);
    try {
      const res = await fetch(`/api/marketplace?userId=${profileUserId}&zipCode=${profileZip}`);
      if (res.ok) {
        const data = await res.json();
        setMarketplaceFeed(data.items || []);
      }
    } catch { } finally {
      setMarketplaceLoading(false);
    }
  };

  const addToBag = (item: any) => {
    setShoppingBag((prev: any[]) => {
      if (prev.some(b => b.sku === item.sku)) return prev;
      return [...prev, item];
    });
  };

  const removeFromBag = (sku: string) => {
    setShoppingBag((prev: any[]) => prev.filter(b => b.sku !== sku));
  };

  const bagSubtotal = shoppingBag.reduce((s: number, i: any) => s + i.price, 0);
  const bagTax = bagSubtotal * 0.08;
  const bagTotal = bagSubtotal + bagTax;

  return (
    <>
      <div className="glass-card flex flex-col gap-5">
        <div className="section-title-bar">
          <h2>Shop Pre-Loved — Buy Near You</h2>
          <div className="flex items-center gap-2">
            <span className="section-badge badge-layer-5">Local Feed</span>
            <button
              className="relative btn btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
              onClick={() => { setCheckoutStep("bag"); setShowCheckoutModal(true); }}
            >
              <ShoppingBag className="w-4 h-4" />
              My Bag
              {shoppingBag.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow">
                  {shoppingBag.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="info-callout mb-2">
          <ShoppingBag className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Items shown below have been returned by users within a 100km radius. By purchasing locally, you earn Green Credits and save shipping emissions.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {marketplaceLoading ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <span className="spinner mb-3" />
              <div>Discovering local circular deals in {profileZip}...</div>
            </div>
          ) : (
            marketplaceFeed.map((item, i) => (
              <div key={i} className="marketplace-item-card group relative">
                {item.trust < 40 && (
                  <div className="absolute top-2 right-2 bg-rose-100 text-rose-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-200 z-10 shadow-sm flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> High Risk Seller
                  </div>
                )}
                <div className="marketplace-item-image">
                  <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-cover" alt={item.name} />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className={`mini-badge ${item.grade.startsWith("A") ? "success" : "warning"}`}>Grade {item.grade}</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    <span className="mini-badge bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><Leaf className="w-2.5 h-2.5" /> -{item.co2Saved}kg CO₂</span>
                    <span className="mini-badge bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1"><Map className="w-2.5 h-2.5" /> {item.distance} away</span>
                  </div>

                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{item.brand}</div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</h3>

                  <div className="flex items-end justify-between mt-3 mb-4 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-emerald-600 font-extrabold text-lg font-mono">${item.price.toFixed(2)}</span>
                      <span className="text-slate-400 text-[10px] line-through ml-2">${item.originalPrice.toFixed(2)}</span>
                    </div>
                    {item.trust >= 90 && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 shadow-sm">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span className="font-bold uppercase tracking-wider">Verified Trusted Seller</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-emerald-700 font-medium mb-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5 mt-auto">
                    <Award className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-500" />
                    <span><strong>Earn ${(item.price * (item.grade === "A" ? 0.03 : 0.05)).toFixed(2)} Cashback (Green Credits)</strong> instantly by choosing this circular item.</span>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button
                      className="btn btn-primary flex-1 py-2 text-xs font-bold"
                      onClick={() => addToBag(item)}
                      disabled={shoppingBag.some((b: any) => b.sku === item.sku)}
                    >
                      {shoppingBag.some((b: any) => b.sku === item.sku)
                        ? <><CheckCircle className="w-3.5 h-3.5" /> Added to Bag</>
                        : <><ShoppingBag className="w-3.5 h-3.5" /> Add to Bag</>
                      }
                    </button>
                    <button
                      className="btn btn-secondary py-2 px-3 text-xs font-bold"
                      onClick={() => setSelectedProductSku(item.sku)}
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SHOPPING BAG / CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
                {checkoutStep === "bag" && "Your Circular Bag"}
                {checkoutStep === "summary" && "Order Summary"}
                {checkoutStep === "confirmed" && "Purchase Confirmed 🎉"}
              </h3>
              <button onClick={() => { setShowCheckoutModal(false); setCheckoutStep("bag"); }} className="text-slate-300 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Bag Contents */}
            {checkoutStep === "bag" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  {shoppingBag.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-300">
                      <ShoppingBag className="w-12 h-12" />
                      <p className="text-sm font-medium text-slate-400">Your bag is empty</p>
                      <p className="text-xs text-slate-300">Browse the marketplace and add circular items.</p>
                    </div>
                  ) : (
                    shoppingBag.map((item: any) => (
                      <div key={item.sku} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <img src={getSKUReferenceImage(item.sku)} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-100" alt={item.name} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.brand} · Grade {item.grade}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-emerald-600 font-extrabold text-sm font-mono">${item.price.toFixed(2)}</span>
                            <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">-{item.co2Saved}kg CO₂</span>
                          </div>
                        </div>
                        <button onClick={() => removeFromBag(item.sku)} className="text-slate-200 hover:text-rose-400 transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {shoppingBag.length > 0 && (
                  <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">Subtotal</span>
                      <span className="font-extrabold text-slate-800 font-mono">${bagSubtotal.toFixed(2)}</span>
                    </div>
                    <button className="btn btn-primary w-full py-2.5 font-bold text-sm" onClick={() => setCheckoutStep("summary")}>
                      <ArrowRight className="w-4 h-4" /> Review Order
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Order Summary */}
            {checkoutStep === "summary" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  {shoppingBag.map((item: any) => (
                    <div key={item.sku} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                      <div>
                        <div className="font-bold text-slate-700">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Grade {item.grade} · {item.brand}</div>
                      </div>
                      <span className="font-bold text-slate-800 font-mono">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-bold text-slate-700 font-mono">${bagSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax (8%)</span>
                      <span className="font-bold text-slate-700 font-mono">${bagTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 pt-2 border-t border-slate-100">
                      <span className="font-extrabold text-slate-800">Total</span>
                      <span className="font-extrabold text-indigo-600 font-mono text-base">${bagTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 flex items-start gap-2 mt-1">
                    <Leaf className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>By buying circular, you're saving <strong>{shoppingBag.reduce((s: number, i: any) => s + i.co2Saved, 0)} kg CO₂</strong> and earning <strong>{Math.round(bagSubtotal * 0.3)} Green Credits</strong>.</span>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                  <button className="btn btn-secondary flex-1 py-2.5 text-xs font-bold" onClick={() => setCheckoutStep("bag")}>Edit Bag</button>
                  <button className="btn btn-success flex-1 py-2.5 text-xs font-bold" onClick={() => {
                    setCheckoutStep("confirmed");
                    try {
                      const confetti = (window as any).confetti;
                      if (confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#6366f1", "#f59e0b"] });
                    } catch { }
                    setWalletInfo((prev: any) => ({ ...prev, credits: prev.credits + Math.round(bagSubtotal * 0.3) }));
                  }}>
                    <CheckCircle className="w-4 h-4" /> Confirm Purchase
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmed */}
            {checkoutStep === "confirmed" && (
              <div className="flex flex-col items-center gap-5 px-5 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="text-center">
                  <h4 className="font-extrabold text-slate-800 text-base">Order Placed!</h4>
                  <p className="text-xs text-slate-400 mt-1">Your circular items are on their way.</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 text-center w-full">
                  <strong>+{Math.round(bagSubtotal * 0.3)} Green Credits</strong> added to your wallet!
                </div>
                <button className="btn btn-secondary w-full py-2.5 text-xs font-bold" onClick={() => {
                  setShowCheckoutModal(false);
                  setCheckoutStep("bag");
                  setShoppingBag([]);
                }}>
                  Done — Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
