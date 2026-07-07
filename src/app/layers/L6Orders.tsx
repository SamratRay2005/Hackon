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
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { useApp, getSKUReferenceImage } from "./AppContext";
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
  { id: "defective", label: "Defective / doesn't work properly", route: "defective", claimType: "damaged_product" },
  { id: "wrong", label: "Wrong item was sent", route: "defective", claimType: "different_product" },
  { id: "damaged", label: "Arrived damaged", route: "defective", claimType: "damaged_product" },
  { id: "size", label: "Size issue / doesn't fit", route: "vibe_mismatch" },
  { id: "mind", label: "Changed my mind", route: "vibe_mismatch" },
  { id: "price", label: "Better price available", route: "vibe_mismatch" },
  { id: "unneeded", label: "No longer needed", route: "vibe_mismatch" },
  { id: "other", label: "Other", route: "api" },
];

function ReturnReasonView({ order, onBack, onRouteDecision }: { order: any, onBack: () => void, onRouteDecision: (r: string, c?: string) => void }) {
  const [selectedReasonId, setSelectedReasonId] = React.useState(COMMON_REASONS[0].id);
  const [reasonText, setReasonText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showChatbotModal, setShowChatbotModal] = React.useState(false);

  const handleSubmit = async () => {
    const choice = COMMON_REASONS.find(r => r.id === selectedReasonId);
    
    if (choice?.route !== "api") {
      if (choice?.id === "defective") {
        setShowChatbotModal(true);
        return;
      }
      onRouteDecision(choice!.route, choice!.claimType);
      return;
    }

    if (reasonText.trim().length < 10) {
      setError("Please provide a bit more detail (minimum 10 characters).");
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
    <div className="flex flex-col w-full max-w-2xl mx-auto mt-4">
      <div className="flex flex-col mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0F1111] text-white flex items-center justify-center font-bold text-lg leading-none">3</div>
          <h2 className="text-xl font-bold text-[#0F1111]">Choose a Reason</h2>
        </div>
        <p className="text-[#0F1111] ml-11 mt-1 text-[15px]">User selects the reason for return from a list.</p>
      </div>

      <div className="border border-slate-200 rounded-[12px] bg-white p-6 shadow-sm flex flex-col gap-4 ml-11">
        <button onClick={onBack} className="text-[14px] font-bold text-[#0F1111] flex items-center hover:underline self-start mb-2">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>
        
        <h3 className="text-lg font-bold text-[#0F1111] mb-2">Why are you returning this?</h3>
        
        <div className="flex flex-col gap-4">
          {COMMON_REASONS.map((reason) => (
            <label
              key={reason.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className={`w-[20px] h-[20px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${
                selectedReasonId === reason.id ? "border-[#007185]" : "border-slate-400 group-hover:border-[#007185]"
              }`}>
                {selectedReasonId === reason.id && <div className="w-[10px] h-[10px] bg-[#007185] rounded-full" />}
              </div>
              <span className="text-[15px] text-[#0F1111] font-[400]">
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
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Please describe why you are returning this..."
              className="w-full border border-slate-300 rounded-[8px] p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#007185] focus:border-transparent min-h-[80px] resize-none"
            />
          </div>
        )}

        {error && <div className="text-xs text-[#C7511F] font-semibold bg-rose-50 p-2 rounded-lg mt-2">{error}</div>}
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] w-full py-[10px] rounded-[8px] text-[14px] font-[400] shadow-sm transition-colors mt-4"
        >
          {loading ? <span className="spinner border-slate-900 border-t-transparent w-4 h-4 mx-auto block" /> : "Continue"}
        </button>
      </div>

      {/* Chatbot Interstitial Modal */}
      {showChatbotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Want to try fixing this?</h3>
            <p className="text-slate-600 mb-6">
              Many common issues with {order.name} can be fixed in a few minutes. 
              Would you like to chat with <b>Nova</b>, our tech support assistant, before proceeding with the return?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onRouteDecision("deflection")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Yes, chat with Nova
              </button>
              <button 
                onClick={() => onRouteDecision("defective", "damaged_product")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
              >
                No, proceed with return
              </button>
            </div>
          </div>
        </div>
      )}
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
    setFraudOrderId,
    setFraudItemName,
    setRefundBaseAmount,
    setFraudClaimType,
    fetchGuidesForProduct,
    setChatMessages,
    setIfixitGuides,
    setInspectQueue,
    setFraudImage,
    setFraudResult,
    setUserDescription,
    manualReviewQueue,
    processedFraudQueue,
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
    setFraudOrderId(order.orderId);
    setFraudItemName(order.name);
    setRefundBaseAmount(order.price);
    setFraudClaimType(claimType);
    // Clear stale photo/result from previous return session
    setFraudImage(null);
    setFraudResult(null);
    setUserDescription("");
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
    <div style={{display:"flex", flexDirection:"column", gap:"20px"}}>
      <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
        <h2 style={{fontSize:"24px", fontWeight:400, color:"#0F1111"}}>Your Orders</h2>
      </div>

      {reasonOrder ? (
        <ReturnReasonView
          order={reasonOrder}
          onBack={() => setReasonOrder(null)}
          onRouteDecision={(classification, claimType) => {
            if (classification === "vibe_mismatch") {
              routeToL5DarkStore(reasonOrder);
            } else if (classification === "deflection") {
              handleDIM(reasonOrder);
            } else {
              routeToL2Fraud(reasonOrder, claimType as any);
            }
          }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.length === 0 ? (
            <div style={{padding:"20px", display:"flex", gap:"20px", background:"#FFF", border:"1px solid #DDD", borderRadius:"4px"}}>
              <div style={{flex:1}}>
                <h2 style={{fontSize:"1.2rem", fontWeight:700, marginBottom:"8px"}}>You have no orders.</h2>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((order: any) => {
                const daysLeft = getDaysRemaining(order);
                const isExpired = daysLeft <= 0;
                const manualItem = manualReviewQueue?.find((i: any) => i.orderId === order.orderId);
                const processedItem = processedFraudQueue?.find((i: any) => i.orderId === order.orderId);
                const inspectItem = inspectQueue?.find((i: any) => i.orderId === order.orderId);
                
                let returnStatus = null;
                if (manualItem) returnStatus = "MANUAL_REVIEW";
                else if (processedItem) returnStatus = processedItem.status;
                else if (inspectItem) returnStatus = "APPROVED";
                
                const isReturned = !!returnStatus || inspectItem;

                return (
                  <div
                    key={order.sku}
                    style={{border:"1px solid #D5D9D9", borderRadius:"8px", overflow:"hidden", background:"#FFF"}}
                  >
                    {/* Card Header */}
                    <div style={{background:"#F0F2F2", padding:"14px 18px", borderBottom:"1px solid #D5D9D9", display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#565959"}}>
                      <div style={{display:"flex", gap:"32px"}}>
                        <div className="flex flex-col">
                          <span style={{textTransform:"uppercase"}}>Order Placed</span>
                          <span style={{color:"#0F1111"}}>{order.purchaseDate}</span>
                        </div>
                        <div className="flex flex-col">
                          <span style={{textTransform:"uppercase"}}>Total</span>
                          <span style={{color:"#0F1111"}}>${order.price?.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col hidden sm:flex">
                          <span style={{textTransform:"uppercase"}}>Ship To</span>
                          <span className="amz-free-link" style={{color:"#007185"}}>Samrat Ray <ChevronDown className="w-3 h-3 inline" /></span>
                        </div>
                      </div>
                      <div className="flex flex-col text-right">
                        <span style={{textTransform:"uppercase"}}>Order # {order.orderId}</span>
                        <span className="amz-free-link" style={{color:"#007185"}}>View order details</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{padding:"18px", display:"flex", gap:"16px", flexWrap:"wrap"}}>
                      <div style={{flexShrink:0}}>
                        <img src={getSKUReferenceImage(order.sku)} alt={order.name} style={{width:"90px", height:"90px", objectFit:"contain"}} />
                      </div>
                      
                      <div className="flex flex-col flex-1 min-w-0" style={{minWidth:"200px"}}>
                        <div className="amz-free-link" style={{fontSize:"14px", fontWeight:700, color:"#007185", lineHeight:"1.4"}}>
                          {order.name}
                        </div>
                        <div style={{fontSize:"12px", color:"#565959", marginTop:"4px"}}>
                          Return window {isExpired ? "closed on" : "closes"} {new Date(new Date(order.purchaseDate).getTime() + (order.returnWindowDays || 30) * 86400000).toLocaleDateString()}
                        </div>
                        
                        {returnStatus === "MANUAL_REVIEW" ? (
                          <div style={{marginTop:"8px", fontSize:"13px", fontWeight:700, color:"#B12704", display:"flex", alignItems:"center", gap:"4px"}}>
                            ⏳ Under Manual Review
                          </div>
                        ) : returnStatus === "APPROVED" ? (
                          <div style={{marginTop:"8px", fontSize:"13px", fontWeight:700, color:"#067D62", display:"flex", alignItems:"center", gap:"4px"}}>
                            ✅ Return Approved
                          </div>
                        ) : returnStatus === "REJECTED" ? (
                          <div style={{marginTop:"8px", fontSize:"13px", fontWeight:700, color:"#B12704", display:"flex", alignItems:"center", gap:"4px"}}>
                            ❌ Return Denied
                          </div>
                        ) : isReturned ? (
                          <div style={{marginTop:"8px", fontSize:"13px", fontWeight:700, color:"#C7511F"}}>
                            Return in progress
                          </div>
                        ) : null}
                      </div>

                      {/* Card Footer (Actions) */}
                      <div className="flex flex-col gap-2" style={{width:"220px", flexShrink:0}}>
                        <button className="btn btn-secondary" style={{padding:"6px", fontSize:"13px", textAlign:"center", width:"100%"}}>Track package</button>
                        
                        {!isReturned && (
                          hasManual(order.sku) ? (
                            <>
                              <button
                                onClick={() => handleDIM(order)}
                                disabled={isExpired}
                                className="btn btn-secondary"
                                style={{padding:"6px", fontSize:"13px", textAlign:"center", width:"100%", opacity: isExpired ? 0.5 : 1}}
                              >
                                Get product support
                              </button>
                              <button
                                onClick={() => setReasonOrder(order)}
                                disabled={isExpired}
                                className="btn btn-secondary"
                                style={{padding:"6px", fontSize:"13px", textAlign:"center", width:"100%", opacity: isExpired ? 0.5 : 1}}
                              >
                                Return or replace items
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setReasonOrder(order)}
                              disabled={isExpired}
                              className="btn btn-secondary"
                              style={{padding:"6px", fontSize:"13px", textAlign:"center", width:"100%", opacity: isExpired ? 0.5 : 1}}
                            >
                              Return or replace items
                            </button>
                          )
                        )}
                        
                        <button className="btn btn-secondary" style={{padding:"6px", fontSize:"13px", textAlign:"center", width:"100%"}}>Leave seller feedback</button>
                        <button className="btn btn-secondary" style={{padding:"6px", fontSize:"13px", textAlign:"center", width:"100%"}}>Write a product review</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
