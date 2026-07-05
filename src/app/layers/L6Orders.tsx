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
    fetchGuidesForProduct,
    setChatMessages,
    setIfixitGuides,
  } = useApp() as any;

  const [getHelpOrder, setGetHelpOrder] = React.useState<any>(null);

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

  const handleDirectReturn = (order: any) => {
    setSelectedProductSku(order.sku);
    setFraudSku(order.sku);
    setFraudItemName(order.name);
    setRefundBaseAmount(order.price);
    setGetHelpOrder(null);
    setActiveTab("fraud-mitigation");
  };

  const handleReturnClick = (order: any) => {
    if (hasManual(order.sku)) {
      setGetHelpOrder(order);
    } else {
      handleDirectReturn(order);
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
          <div className="flex flex-col gap-2.5">
            {orders.map((order: any) => {
              const daysLeft = getDaysRemaining(order);
              const isExpired = daysLeft <= 0;

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
