"use client";

/**
 * L6Orders.tsx — My Orders Tab
 * ─────────────────────────────
 * Shows the user's full shopping history.
 * From here the user can initiate a return for any active order.
 */

import React from "react";
import {
  Package,
  RotateCcw,
  Clock,
  AlertCircle,
  Wrench,
  X,
  CheckCircle,
} from "lucide-react";
import { useApp } from "./AppContext";
import { PRODUCT_CATALOG } from "@/lib/catalog";

// ── Get Help (DIM) confirmation modal ──────────────────────────
interface GetHelpModalProps {
  orderName: string;
  onConfirmDIM: () => void;
  onProceedToReason: () => void;
  onClose: () => void;
}

function GetHelpModal({ orderName, onConfirmDIM, onProceedToReason, onClose }: GetHelpModalProps) {
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
            onClick={onProceedToReason}
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

// ── Return Reason Modal ──────────────────────────────────────────
interface ReturnReasonModalProps {
  order: any;
  onClose: () => void;
  onRouteDecision: (route: string, claimType?: string) => void;
}

const COMMON_REASONS = [
  { id: "damage", label: "Item arrived damaged or broken", route: "defective", claimType: "damaged_product" },
  { id: "wrong", label: "Received completely wrong item", route: "defective", claimType: "different_product" },
  { id: "fit", label: "Size or fit didn't work for me", route: "vibe_mismatch" },
  { id: "mind", label: "Changed my mind / Didn't like it", route: "vibe_mismatch" },
  { id: "other", label: "Other (Please specify)", route: "api" },
];

function ReturnReasonModal({ order, onClose, onRouteDecision }: ReturnReasonModalProps) {
  const [selectedReasonId, setSelectedReasonId] = React.useState(COMMON_REASONS[0].id);
  const [reasonText, setReasonText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async () => {
    const choice = COMMON_REASONS.find(r => r.id === selectedReasonId);
    
    if (choice?.route !== "api") {
      // Instant Routing for predefined choices
      onRouteDecision(choice!.route, choice!.claimType);
      return;
    }

    // Fallback to LLM Triage for "Other"
    if (reasonText.trim().length < 20) {
      setError("Please provide a bit more detail (minimum 20 characters) so we can process this instantly.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/return-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: order.sku, userReasonText: reasonText }),
      });
      const data = await res.json();
      onRouteDecision(data.classification, data.classification === "defective" ? "damaged_product" : undefined);
    } catch (e) {
      onRouteDecision("defective", "damaged_product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-base font-extrabold text-slate-800 pt-2">Why are you returning this?</h3>
        
        <div className="flex flex-col gap-2 mt-2">
          {COMMON_REASONS.map((reason) => (
            <label
              key={reason.id}
              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                selectedReasonId === reason.id ? "border-indigo-600 bg-indigo-50 shadow-sm" : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedReasonId === reason.id ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
              }`}>
                {selectedReasonId === reason.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <span className={`text-sm font-medium ${selectedReasonId === reason.id ? "text-indigo-900" : "text-slate-600"}`}>
                {reason.label}
              </span>
              <input
                type="radio"
                name="return_reason"
                value={reason.id}
                checked={selectedReasonId === reason.id}
                onChange={() => {
                  setSelectedReasonId(reason.id);
                  setError("");
                }}
                className="hidden"
              />
            </label>
          ))}
        </div>

        {selectedReasonId === "other" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Please describe why you are returning this..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-none"
            />
          </div>
        )}

        {error && <div className="text-[10px] text-rose-500 font-bold bg-rose-50 p-2 rounded-lg">{error}</div>}
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 mt-2"
        >
          {loading ? <span className="spinner" /> : "Confirm Reason"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function L6Orders() {
  const {
    walletInfo,
    profileUserId,
    setActiveTab,
    setDeflectProduct,
    setDeflectSku,
    setDeflectReason,
    setSelectedProductSku,
    setFraudSku,
    setFraudItemName,
    setRefundBaseAmount,
    setFraudClaimType,
    fetchGuidesForProduct,
    setChatMessages,
    setIfixitGuides,
    setInspectQueue,
    inspectQueue,
    ledgerRecords,
  } = useApp() as any;

  const [getHelpOrder, setGetHelpOrder] = React.useState<any>(null);
  const [reasonOrder, setReasonOrder] = React.useState<any>(null);
  const [returnReason, setReturnReason] = React.useState("");
  const [returnSuccess, setReturnSuccess] = React.useState(false);

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
  const routeToL2Fraud = (order: any, claimType: "damaged_product" | "different_product" = "damaged_product") => {
    setSelectedProductSku(order.sku);
    setFraudSku(order.sku);
    setFraudItemName(order.name);
    setRefundBaseAmount(order.price);
    setFraudClaimType(claimType);
    setGetHelpOrder(null);
    setReasonOrder(null);
    setActiveTab("fraud-mitigation");
  };

  const routeToL5DarkStore = (order: any) => {
    setGetHelpOrder(null);
    setReasonOrder(null);
    // Push to admin inspect queue
    setInspectQueue((prev: any[]) => {
      if (prev.find(item => item.orderId === order.orderId)) return prev;
      return [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        orderId: order.orderId,
        sku: order.sku,
        itemName: order.name,
        source: "vibe",
        timestamp: new Date().toISOString()
      }];
    });
    
    // Instead of alert, show our nice modal
    setReturnSuccess(true);
  };

  const closeReturnSuccess = () => {
    setReturnSuccess(false);
    setActiveTab("dashboard");
  };

  const handleReturnClick = (order: any) => {
    if (hasManual(order.sku)) {
      setGetHelpOrder(order);
    } else {
      setReasonOrder(order);
    }
  };

  return (
    <div className="glass-card flex flex-col gap-5">
      <div className="section-title-bar">
        <h2>My Orders</h2>
        <span className="section-badge badge-layer-6">Purchase History</span>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Shopping History
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order: any) => {
              const daysLeft = getDaysRemaining(order);
              const isExpired = daysLeft <= 0;
              const isReturned = inspectQueue?.some((i: any) => i.orderId === order.orderId);

              return (
                <div
                  key={order.sku}
                  className={`border rounded-2xl p-4 flex flex-col gap-4 transition-all ${
                    isExpired
                      ? "bg-slate-50 border-slate-200 opacity-80"
                      : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Order Placed
                      </span>
                      <span className="text-xs text-slate-600 font-medium">
                        {order.purchaseDate}
                      </span>
                    </div>
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
                  </div>

                  {/* Card Body */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 leading-tight">
                        {order.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        SKU: {order.sku}
                      </div>
                      <div className="text-xs font-bold text-emerald-700 font-mono mt-2">
                        ${order.price?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer (Actions) */}
                  <div className="pt-2 mt-auto">
                    {isReturned ? (
                      <div className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl">
                        <CheckCircle className="w-4 h-4" />
                        Return Initiated
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {hasManual(order.sku) ? (
                          <>
                            <button
                              onClick={() => handleDIM(order)}
                              disabled={isExpired}
                              className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border transition-all ${
                                isExpired
                                  ? "text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed"
                                  : "text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-300 shadow-sm"
                              }`}
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              Support
                            </button>
                            <button
                              onClick={() => setReasonOrder(order)}
                              disabled={isExpired}
                              className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border transition-all ${
                                isExpired
                                  ? "text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed"
                                  : "text-rose-700 bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-300 shadow-sm"
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Return
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setReasonOrder(order)}
                            disabled={isExpired}
                            className={`col-span-2 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border transition-all ${
                              isExpired
                                ? "text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed"
                                : "text-slate-700 bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm"
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Return Item
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Get Help (DIM) Modal */}
      {getHelpOrder && (
        <GetHelpModal
          orderName={getHelpOrder.name}
          onConfirmDIM={() => handleDIM(getHelpOrder)}
          onProceedToReason={() => {
            setGetHelpOrder(null);
            setReasonOrder(getHelpOrder);
          }}
          onClose={() => setGetHelpOrder(null)}
        />
      )}

      {/* Return Reason Modal */}
      {reasonOrder && (
        <ReturnReasonModal
          order={reasonOrder}
          onClose={() => setReasonOrder(null)}
          onRouteDecision={(classification, claimType) => {
            if (classification === "vibe_mismatch") {
              routeToL5DarkStore(reasonOrder);
            } else {
              routeToL2Fraud(reasonOrder, claimType as any);
            }
          }}
        />
      )}

      {/* Return Success Modal */}
      {returnSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">Return Initiated!</h3>
            <p className="text-sm text-slate-600">
              Your return has been approved. Please drop off your item at the nearest <strong>Dark Store</strong> for inspection.
            </p>
            <button
              className="btn btn-primary w-full py-3 mt-2 text-sm font-bold"
              onClick={closeReturnSuccess}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
