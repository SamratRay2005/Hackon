"use client";

/**
 * L6Wallet.tsx — My Wallet + My Orders Tab
 * ──────────────────────────────────────────
 * Owns: Refund selection, loyalty actions, refund processing, invoice display.
 *       My Orders panel — shows seeded order history with DIM / Return routing.
 * API: /api/wallet (POST)
 */

import React from "react";
import {
  Award,
  Leaf,
  DollarSign,
  Zap,
  CheckCircle,
  Wallet,
  Package,
  Wrench,
  RotateCcw,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { useApp } from "./AppContext";
import { PRODUCT_CATALOG } from "@/lib/catalog";

// ── Get Help (DIM) confirmation modal ──────────────────────────
interface GetHelpModalProps {
  orderName: string;
  onConfirmDIM: () => void;
  onDirectReturn: () => void;
  onClose: () => void;
}

function GetHelpModal({ orderName, onConfirmDIM, onDirectReturn, onClose }: GetHelpModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center shadow-sm">
            <Wrench className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Want to try fixing it first?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
              Our AI repair assistant has the official manual for your{" "}
              <strong className="text-slate-700">{orderName}</strong> and can
              walk you through a fix step-by-step.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mt-2">
          <button
            onClick={onConfirmDIM}
            className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Yes, get AI repair help!
          </button>
          <button
            onClick={onDirectReturn}
            className="btn btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 text-slate-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            No, proceed to return
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function L6Wallet() {
  const {
    walletInfo,
    profileUserId,
    refundBaseAmount,
    fetchWalletInfo,
    setActiveTab,
    setDeflectProduct,
    setDeflectSku,
    setDeflectReason,
    setSelectedProductSku,
    setFraudSku,
    setFraudItemName,
    setRefundBaseAmount,
    fetchGuidesForProduct,
    setChatMessages,
    setIfixitGuides,
  } = useApp() as any;

  const [refundSelection, setRefundSelection] = React.useState<"cash" | "credits">("credits");
  const [loyaltyActions, setLoyaltyActions] = React.useState<string[]>([]);
  const [refundLoading, setRefundLoading] = React.useState(false);
  const [refundResult, setRefundResult] = React.useState<any>(null);

  // Get Help modal state
  const [getHelpOrder, setGetHelpOrder] = React.useState<any>(null);


  const handleToggleLoyaltyAction = (actionId: string) => {
    setLoyaltyActions((prev) =>
      prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId]
    );
  };

  const processWalletRefund = async () => {
    setRefundLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: refundSelection,
          actions: refundSelection === "credits" ? loyaltyActions : [],
          baseAmount: refundBaseAmount,
          userId: profileUserId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRefundResult(data);
        fetchWalletInfo();
        try {
          const confetti = (window as any).confetti;
          if (confetti)
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors:
                refundSelection === "credits"
                  ? ["#10b981", "#34d399", "#6366f1"]
                  : ["#cbd5e1", "#94a3b8"],
            });
        } catch {}
      }
    } catch {}
    finally { setRefundLoading(false); }
  };

  // ── Order helpers ──────────────────────────────────────────────
  const orders: any[] = walletInfo?.orders ?? [];

  const getDaysRemaining = (order: any) => {
    const purchased = new Date(order.purchaseDate);
    const windowDays = order.returnWindowDays ?? 30;
    const expiry = new Date(purchased);
    expiry.setDate(expiry.getDate() + windowDays);
    const msLeft = expiry.getTime() - Date.now();
    return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  };

  const hasManual = (sku: string) => {
    const p = PRODUCT_CATALOG.find((x) => x.sku === sku);
    return p?.manualId != null;
  };

  // Route to DIM (L3 chatbot)
  const handleDIM = (order: any) => {
    setDeflectProduct(order.name);
    setDeflectSku(order.sku);
    setDeflectReason("Defective / Won't turn on");
    setChatMessages([]);
    const isElectrical =
      ["electronics", "home & kitchen"].includes(order.category?.toLowerCase() ?? "");
    if (isElectrical) fetchGuidesForProduct(order.name);
    else setIfixitGuides([]);
    setActiveTab("deflection");
  };

  // Route to direct return (L2 fraud check)
  const handleDirectReturn = (order: any) => {
    setSelectedProductSku(order.sku);
    setFraudSku(order.sku);
    setFraudItemName(order.name);
    setRefundBaseAmount(order.price);
    setGetHelpOrder(null);
    setActiveTab("fraud-mitigation");
  };

  // Called when user clicks "Return" on an order card
  const handleReturnClick = (order: any) => {
    if (hasManual(order.sku)) {
      setGetHelpOrder(order); // Opens the modal
    } else {
      handleDirectReturn(order); // Straight to return
    }
  };

  return (
    <div className="glass-card flex flex-col gap-5">
      <div className="section-title-bar">
        <h2>My Wallet — Refund &amp; Green Credits</h2>
        <span className="section-badge badge-layer-6">Rewards</span>
      </div>

      {/* Wallet summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Green Credits", value: walletInfo.credits, icon: Award, color: "indigo" },
          { label: "CO₂ Saved", value: `${walletInfo.sustainabilityScore} kg`, icon: Leaf, color: "emerald" },
          { label: "Refund Base", value: `$${refundBaseAmount.toFixed(2)}`, icon: DollarSign, color: "amber" },
          { label: "Augmented", value: `$${(refundBaseAmount * 1.3).toFixed(2)}`, icon: Zap, color: "violet" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="metric-strip-card flex flex-col gap-1 items-start py-3">
            <div className={`metric-strip-icon-box ${color} w-8 h-8`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{label}</div>
            <div className="text-base font-extrabold text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      {/* ── MY ORDERS ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              My Orders
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state-card">
            <Package className="icon" />
            <div className="text">No orders found for your account.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {orders.map((order: any) => {
              const daysLeft = getDaysRemaining(order);
              const isExpired = daysLeft <= 0;
              const canDIM = hasManual(order.sku);

              return (
                <div
                  key={order.sku}
                  className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${
                    isExpired
                      ? "bg-slate-50 border-slate-200 opacity-80"
                      : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                  }`}
                >
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Package className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {order.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {order.sku}
                          </span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-emerald-700 font-mono">
                            ${order.price?.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] text-slate-400">
                            {order.purchaseDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return window badge + actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                    {/* Window badge */}
                    {isExpired ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        Window closed
                      </span>
                    ) : (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          daysLeft <= 3
                            ? "text-rose-700 bg-rose-50 border-rose-200"
                            : daysLeft <= 7
                            ? "text-amber-700 bg-amber-50 border-amber-200"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {daysLeft}d left
                      </span>
                    )}

                    {/* Return button */}
                    <button
                      onClick={() => handleReturnClick(order)}
                      disabled={isExpired}
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                        isExpired
                          ? "text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed"
                          : "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 hover:border-rose-300"
                      }`}
                      title={isExpired ? "Return window has closed" : "Start return process"}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Return
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── REFUND SECTION ────────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Refund options */}
          <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-4">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Refund Options
            </div>

            <div className="grid grid-cols-2 gap-3 items-stretch h-full">
              <div
                className={`border-2 rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer relative transition-all ${
                  refundSelection === "cash"
                    ? "border-slate-800 bg-white shadow-md ring-1 ring-slate-800"
                    : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                }`}
                onClick={() => setRefundSelection("cash")}
              >
                <div
                  className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    refundSelection === "cash"
                      ? "border-slate-800 bg-slate-800"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {refundSelection === "cash" && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
                <DollarSign
                  className={`w-6 h-6 mb-1 ${
                    refundSelection === "cash" ? "text-slate-800" : "text-slate-400"
                  }`}
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Cash Refund
                </span>
                <span className="text-2xl font-extrabold text-slate-800 font-mono">
                  ${refundBaseAmount.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400">Standard return value</span>
              </div>

              <div
                className={`border-2 rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer relative transition-all ${
                  refundSelection === "credits"
                    ? "border-emerald-600 bg-emerald-50 shadow-md ring-1 ring-emerald-600"
                    : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300"
                }`}
                onClick={() => setRefundSelection("credits")}
              >
                <div
                  className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    refundSelection === "credits"
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-emerald-300 bg-white"
                  }`}
                >
                  {refundSelection === "credits" && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
                <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">
                  +30%
                </span>
                <Leaf
                  className={`w-6 h-6 mb-1 ${
                    refundSelection === "credits" ? "text-emerald-600" : "text-emerald-400"
                  }`}
                />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                  Green Credits
                </span>
                <span className="text-2xl font-extrabold text-emerald-800 font-mono">
                  ${(refundBaseAmount * 1.3).toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-600">Eco-augmented value</span>
              </div>
            </div>

            {refundSelection === "credits" && (
              <div className="flex flex-col gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                <span className="text-xs font-bold text-emerald-800">
                  Circular Action Multipliers
                </span>
                {[
                  { id: "p2p", label: "P2P Logistics routing", bonus: "+5%" },
                  { id: "swap", label: "Refurbished replacement swap", bonus: "+10%" },
                  { id: "repair", label: "Self-repair deflection", bonus: "+15%" },
                ].map(({ id, label, bonus }) => (
                  <label
                    key={id}
                    className="flex items-center gap-2.5 cursor-pointer bg-white border border-emerald-100 rounded-lg px-3 py-2.5 hover:border-emerald-300 hover:shadow-sm transition-all group"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        loyaltyActions.includes(id)
                          ? "bg-emerald-600 border-emerald-600"
                          : "border-emerald-300 bg-emerald-50 group-hover:border-emerald-400"
                      }`}
                    >
                      {loyaltyActions.includes(id) && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium flex-1 ${
                        loyaltyActions.includes(id) ? "text-emerald-800" : "text-slate-600"
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                        loyaltyActions.includes(id)
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {bonus}
                    </span>
                    <input
                      type="checkbox"
                      checked={loyaltyActions.includes(id)}
                      onChange={() => handleToggleLoyaltyAction(id)}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            )}

            <button
              className="btn btn-success w-full py-2.5 font-bold text-xs"
              onClick={processWalletRefund}
              disabled={refundLoading}
            >
              {refundLoading ? (
                <>
                  <span className="spinner" /> Processing...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" /> Confirm Resolution
                </>
              )}
            </button>
          </div>

          {/* Invoice */}
          <div className="border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Transaction Invoice
            </div>
            {refundResult ? (
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="success-callout py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-bold">Transaction cleared successfully</span>
                </div>

                {[
                  { label: "Method", value: refundResult.refundType },
                  refundResult.refundType === "green_credits"
                    ? {
                        label: "Credits Awarded",
                        value: `+${refundResult.creditsAwarded} credits`,
                        green: true,
                      }
                    : { label: "Amount Refunded", value: refundResult.amountRefunded },
                  refundResult.refundType === "green_credits"
                    ? {
                        label: "CO₂ Offset",
                        value: `+${refundResult.co2SavedAwarded} kg`,
                        green: true,
                      }
                    : null,
                  { label: "Wallet Balance", value: `${refundResult.walletBalance} Credits` },
                  {
                    label: "Net CO₂ Saved",
                    value: `${refundResult.sustainabilityScore} kg`,
                    green: true,
                  },
                ]
                  .filter(Boolean)
                  .map((item: any, i) => (
                    <div
                      key={i}
                      className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 last:pb-0"
                    >
                      <span className="text-slate-500">{item.label}:</span>
                      <span
                        className={`font-bold ${
                          item.green ? "text-emerald-600" : "text-slate-800"
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center text-slate-500 text-[11px] leading-relaxed italic mt-1">
                  {refundResult.message}
                </div>
              </div>
            ) : (
              <div className="empty-state-card flex-1 mt-2">
                <Wallet className="icon" />
                <div className="text">
                  Select a refund type and click Confirm Resolution to process the transaction.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Get Help (DIM) Modal */}
      {getHelpOrder && (
        <GetHelpModal
          orderName={getHelpOrder.name}
          onConfirmDIM={() => handleDIM(getHelpOrder)}
          onDirectReturn={() => handleDirectReturn(getHelpOrder)}
          onClose={() => setGetHelpOrder(null)}
        />
      )}
    </div>
  );
}

