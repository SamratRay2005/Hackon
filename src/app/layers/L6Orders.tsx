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
  Sparkles,
  X,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Truck,
  CreditCard,
  ChevronRight
} from "lucide-react";
import { useApp, getSKUReferenceImage } from "./AppContext";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import { db } from "@/lib/services";

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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden max-w-3xl w-full animate-in fade-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#F0F2F2] border-b border-[#D5D9D9] px-6 py-4 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-[#0F1111] flex items-center gap-4">
            <img src="/nova_icon.png" alt="Nova" className="w-16 h-16 object-contain" />
            Want to try fixing it first?
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 transition-colors p-2 -mr-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6 text-left">
          <div>
            <p className="text-base text-slate-600 font-medium">
              Quick AI troubleshooting
            </p>
          </div>

          <div>
            <p className="text-[15px] text-slate-700 leading-relaxed">
              Our AI repair assistant has the official manual for your{" "}
              <strong>{orderName}</strong> and can walk you through a fix step-by-step.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirmDIM}
              className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] w-full h-11 rounded-md text-[15px] font-bold shadow-sm hover:shadow transition-all flex items-center justify-center"
            >
              Yes, get AI repair help!
            </button>
            <button
              onClick={onProceedToReason}
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 w-full h-11 rounded-md text-[15px] font-bold shadow-sm hover:shadow transition-all flex items-center justify-center"
            >
              No, proceed to return
            </button>
          </div>
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
        const manual = db.getManualBySku(order.sku);
        if (manual) {
          setShowChatbotModal(true);
          return;
        }
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
    <div className="font-sans w-full bg-white min-h-screen">
      <h1 style={{fontSize: "28px", fontWeight: 700, color: "#0F1111", marginBottom: "20px", marginTop: "0"}}>Choose items to return</h1>

      <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "24px", background: "#FFF", display: "flex", gap: "24px", marginBottom: "24px", maxWidth: "800px"}}>
        <img src={getSKUReferenceImage(order?.sku)} alt={order?.name} style={{width: "100px", height: "100px", objectFit: "contain", flexShrink: 0}} />
        
        <div style={{ flex: 1 }}>
          <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "6px"}}>{order?.name}</div>
          <div style={{fontSize: "14px", color: "#0F1111", marginBottom: "24px"}}>Qty: 1</div>
          
          <h3 style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Why are you returning this?</h3>
          
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
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-4">
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Please describe why you are returning this..."
                className="w-full border border-slate-300 rounded-[8px] p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#007185] focus:border-transparent min-h-[80px] resize-none"
              />
            </div>
          )}

          {error && <div className="text-xs text-[#C7511F] font-semibold bg-rose-50 p-2 rounded-lg mt-4">{error}</div>}
        </div>
      </div>
      
      <div style={{maxWidth: "800px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <button onClick={onBack} className="text-[#007185] text-[14px] hover:underline hover:text-[#C7511F]">
          Cancel return
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] px-12 py-[8px] rounded-[8px] text-[14px] font-[400] shadow-sm transition-colors"
        >
          {loading ? <span className="spinner border-slate-900 border-t-transparent w-4 h-4 mx-auto block" /> : "Continue"}
        </button>
      </div>

      {/* Chatbot Interstitial Modal */}
      {showChatbotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-lg w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#F0F2F2] border-b border-[#D5D9D9] px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-[#0F1111] flex items-center gap-4">
                <img src="/nova_icon.png" alt="Nova" className="w-16 h-16 object-contain" />
                Want to try fixing this?
              </h3>
            </div>
            <div className="p-8 flex flex-col gap-6 text-left">
              <div>
                <p className="text-base text-slate-600 font-medium">
                  Quick AI troubleshooting
                </p>
              </div>

              <div>
                <p className="text-[15px] text-slate-700 leading-relaxed">
                  Many common issues with <strong>{order.name}</strong> can be fixed in a few minutes. 
                  Would you like to chat with <strong>Nova</strong>, our tech support assistant, before proceeding with the return?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onRouteDecision("deflection")}
                  className="bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] w-full h-11 rounded-md text-[15px] font-bold shadow-sm hover:shadow transition-all flex items-center justify-center"
                >
                  Yes, chat with Nova
                </button>
                <button 
                  onClick={() => onRouteDecision("defective", "damaged_product")}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 w-full h-11 rounded-md text-[15px] font-bold shadow-sm hover:shadow transition-all flex items-center justify-center"
                >
                  No, proceed with return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Return Success View ──────────────────────────────────────────
function ReturnSuccessView({ order, onContinueShopping }: { order: any, onContinueShopping: () => void }) {
  const returnId = `408-${Math.floor(Math.random()*10000000)}-${Math.floor(Math.random()*10000000)}`;
  const orderDate = order?.purchaseDate || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  
  return (
    <div className="font-sans w-full bg-white min-h-screen">
      <h1 style={{fontSize: "28px", fontWeight: 700, color: "#0F1111", marginBottom: "8px", marginTop: "0"}}>Return initiated</h1>
      <p style={{fontSize: "14px", color: "#0F1111", marginBottom: "16px"}}>
        Your return request has been successfully initiated. Please check your email for return confirmation and next steps.
      </p>

      {/* Progress Bar */}
      <div className="relative mb-6 max-w-3xl" style={{ margin: "0 20px 20px 20px" }}>
        <div className="absolute top-[14px] left-[20px] right-[20px] h-[3px] bg-[#D5D9D9] z-0"></div>
        <div className="absolute top-[14px] left-[20px] h-[3px] bg-[#067D62] z-0" style={{ width: "33%" }}></div>
        
        <div className="relative z-10 flex justify-between">
          <div className="flex flex-col items-center">
            <div className="w-[30px] h-[30px] rounded-full bg-[#067D62] text-white flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div style={{fontSize: "12px", fontWeight: 700, textAlign: "center", color: "#0F1111"}}>1<br/>Initiated</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[30px] h-[30px] rounded-full bg-[#067D62] text-white flex items-center justify-center font-bold mb-2">
              2
            </div>
            <div style={{fontSize: "12px", fontWeight: 700, textAlign: "center", color: "#0F1111"}}>Pick up / Drop off</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[30px] h-[30px] rounded-full bg-[#EAEDED] text-[#565959] flex items-center justify-center font-bold mb-2 border border-[#D5D9D9]">
              3
            </div>
            <div style={{fontSize: "12px", fontWeight: 700, textAlign: "center", color: "#0F1111"}}>In transit</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-[30px] h-[30px] rounded-full bg-[#EAEDED] text-[#565959] flex items-center justify-center font-bold mb-2 border border-[#D5D9D9]">
              4
            </div>
            <div style={{fontSize: "12px", fontWeight: 700, textAlign: "center", color: "#0F1111"}}>Refunded</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "nowrap", gap: "24px", width: "100%", alignItems: "flex-start" }}>
        {/* Left Column */}
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
          
          <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF", display: "flex", gap: "24px"}}>
            <img src={getSKUReferenceImage(order?.sku)} alt={order?.name} style={{width: "80px", height: "80px", objectFit: "contain"}} />
            <div>
              <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "6px"}}>{order?.name}</div>
              <div style={{fontSize: "14px", color: "#0F1111", marginBottom: "12px"}}>Qty: 1</div>
              
              <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "2px"}}>Reason for return</div>
              <div style={{fontSize: "14px", color: "#0F1111", marginBottom: "12px"}}>Product not working as expected</div>
              
              <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "2px"}}>Refund method</div>
              <div style={{fontSize: "14px", color: "#0F1111"}}>Original Payment Method</div>
            </div>
          </div>

          <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", background: "#FFF"}}>
            <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>What happens next?</div>
            
            <div style={{display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "8px"}}>
              <div style={{flex: 1}}>
                <Package className="w-8 h-8 text-[#0F1111] mb-2" strokeWidth={1.5} />
                <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "4px"}}>Pick up / Drop off</div>
                <div style={{fontSize: "13px", color: "#0F1111"}}>We will pick up the item or you can drop it off at the nearest Amazon Drop-off location.</div>
              </div>
              
              <div style={{display: "flex", alignItems: "center", color: "#D5D9D9", paddingBottom: "12px"}}><ChevronRight className="w-5 h-5" /></div>
              
              <div style={{flex: 1}}>
                <Truck className="w-8 h-8 text-[#0F1111] mb-2" strokeWidth={1.5} />
                <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "4px"}}>Item in transit</div>
                <div style={{fontSize: "13px", color: "#0F1111"}}>Once we receive the item, it will go through a quick check.</div>
              </div>
              
              <div style={{display: "flex", alignItems: "center", color: "#D5D9D9", paddingBottom: "12px"}}><ChevronRight className="w-5 h-5" /></div>
              
              <div style={{flex: 1}}>
                <CreditCard className="w-8 h-8 text-[#0F1111] mb-2" strokeWidth={1.5} />
                <div style={{fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "4px"}}>Refund</div>
                <div style={{fontSize: "13px", color: "#0F1111"}}>Your refund will be initiated within 2-3 business days.</div>
              </div>
            </div>
          </div>
          
          <div style={{marginTop: "0px", display: "flex", justifyContent: "center"}}>
            <button onClick={onContinueShopping} style={{background: "#FFD814", color: "#0F1111", border: "1px solid #FCD200", borderRadius: "8px", padding: "8px 0", fontSize: "14px", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", width: "240px", textAlign: "center"}} className="hover:bg-[#F7CA00]">
              Continue Shopping
            </button>
          </div>
          
        </div>

        {/* Right Column */}
        <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
          
          <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px", background: "#FFF"}}>
            <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "16px"}}>Return Details</div>
            
            <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "8px"}}>
              <span>Return ID</span>
              <span>{returnId}</span>
            </div>
            <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "8px"}}>
              <span>Order ID</span>
              <span>{order?.orderId}</span>
            </div>
            <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "16px"}}>
              <span>Order Date</span>
              <span>{orderDate}</span>
            </div>
            
            <div className="cursor-pointer hover:underline hover:text-[#c45500]" style={{fontSize: "14px", color: "#007185"}}>View return policy</div>
          </div>

          <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px", background: "#FFF"}}>
            <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Refund summary</div>
            
            <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "8px"}}>
              <span>Item subtotal</span>
              <span>${order?.price?.toFixed(2) || "0.00"}</span>
            </div>
            <div className="flex justify-between" style={{fontSize: "14px", color: "#0F1111", marginBottom: "12px"}}>
              <span>Delivery charges</span>
              <span>$4.00</span>
            </div>
            
            <div style={{borderTop: "1px solid #D5D9D9", margin: "0 -12px 12px -12px"}} />
            
            <div className="flex justify-between items-center">
              <span style={{fontSize: "16px", fontWeight: 700, color: "#0F1111"}}>Refund amount</span>
              <span style={{fontSize: "18px", fontWeight: 700, color: "#067D62"}}>${((order?.price || 0) + 4.00).toFixed(2)}</span>
            </div>
          </div>

          <div style={{border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px", background: "#FFF"}}>
            <div style={{fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "12px"}}>Need help?</div>
            <div className="flex flex-col gap-3">
              <span className="cursor-pointer hover:underline hover:text-[#c45500]" style={{fontSize: "14px", color: "#007185"}}>View return policy</span>
              <span className="cursor-pointer hover:underline hover:text-[#c45500]" style={{fontSize: "14px", color: "#007185"}}>Contact Customer Service</span>
              <span className="cursor-pointer hover:underline hover:text-[#c45500]" style={{fontSize: "14px", color: "#007185"}}>Frequently asked questions</span>
            </div>
          </div>
          
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
    setDeflectOrderId,
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
    showReturnSuccess,
    setShowReturnSuccess,
  } = useApp() as any;

  const [getHelpOrder, setGetHelpOrder] = React.useState<any>(null);
  const [reasonOrder, setReasonOrder] = React.useState<any>(null);
  const [returnReason, setReturnReason] = React.useState("");

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
    setDeflectOrderId(order.orderId);
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
    setShowReturnSuccess(true);
  };

  const closeReturnSuccess = () => {
    setShowReturnSuccess(false);
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
      {!showReturnSuccess && (
        <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
          <h2 style={{fontSize:"24px", fontWeight:400, color:"#0F1111"}}>Your Orders</h2>
        </div>
      )}

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
      ) : showReturnSuccess ? (
        <ReturnSuccessView 
          order={inspectQueue && inspectQueue.length > 0 ? orders.find((o:any) => o.orderId === inspectQueue[inspectQueue.length - 1].orderId) || orders[0] : orders[0]} 
          onContinueShopping={() => { setShowReturnSuccess(false); setActiveTab("dashboard"); }} 
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
                    key={order.orderId || order.sku + Math.random()}
                    style={{border:"1px solid #D5D9D9", borderRadius:"8px", overflow:"hidden", background:"#FFF"}}
                  >
                    {/* Card Header */}
                    <div style={{background:"#F0F2F2", padding:"14px 18px", borderBottom:"1px solid #D5D9D9", display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#333333"}}>
                      <div style={{display:"flex", gap:"32px"}}>
                        <div className="flex flex-col">
                          <span style={{textTransform:"uppercase", fontWeight: 700}}>Order Placed</span>
                          <span style={{color:"#0F1111", fontWeight: 500}}>{order.purchaseDate}</span>
                        </div>
                        <div className="flex flex-col">
                          <span style={{textTransform:"uppercase", fontWeight: 700}}>Total</span>
                          <span style={{color:"#0F1111", fontWeight: 500}}>${order.price?.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col hidden sm:flex">
                          <span style={{textTransform:"uppercase", fontWeight: 700}}>Ship To</span>
                          <span className="cursor-pointer hover:underline hover:text-[#c45500]" style={{color:"#007185"}}>{profileUserId || "Customer"} <ChevronDown className="w-3 h-3 inline" /></span>
                        </div>
                      </div>
                      <div className="flex flex-col text-right">
                        <span style={{textTransform:"uppercase", fontWeight: 700}}>Order # {order.orderId}</span>
                        <div className="flex items-center gap-1 justify-end mt-1">
                           <span className="cursor-pointer hover:underline hover:text-[#c45500]" style={{color:"#007185"}}>View order details</span>
                           <span style={{color: "#D5D9D9", padding: "0 4px"}}>|</span>
                           <span className="cursor-pointer hover:underline hover:text-[#c45500] flex items-center" style={{color:"#007185"}}>Invoice <ChevronDown className="w-3 h-3 ml-0.5 inline" /></span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{padding:"18px", display:"flex", gap:"16px", flexWrap:"wrap"}}>
                      <div className="flex flex-col flex-1 min-w-0" style={{minWidth:"200px"}}>
                        
                        {/* Delivery Status */}
                        {returnStatus === "MANUAL_REVIEW" ? (
                          <>
                            <div style={{fontSize: "18px", fontWeight: 700, color: "#B12704", marginBottom: "2px"}}>
                              Return Under Manual Review
                            </div>
                            <div style={{fontSize: "13px", color: "#333333", marginBottom: "16px"}}>
                              We are reviewing your request. This may take up to 48 hours.
                            </div>
                          </>
                        ) : returnStatus === "APPROVED" ? (
                          <>
                            <div style={{fontSize: "18px", fontWeight: 700, color: "#067D62", marginBottom: "2px"}}>
                              Return Initiated
                            </div>
                            <div style={{fontSize: "13px", color: "#333333", marginBottom: "16px"}}>
                              Please hand over the item to the delivery agent.
                            </div>
                          </>
                        ) : returnStatus === "REJECTED" ? (
                          <>
                            <div style={{fontSize: "18px", fontWeight: 700, color: "#B12704", marginBottom: "2px"}}>
                              Return Denied
                            </div>
                            <div style={{fontSize: "13px", color: "#333333", marginBottom: "16px"}}>
                              Your return request could not be approved.
                            </div>
                          </>
                        ) : isReturned ? (
                          <>
                            <div style={{fontSize: "18px", fontWeight: 700, color: "#C7511F", marginBottom: "2px"}}>
                              Return in progress
                            </div>
                            <div style={{fontSize: "13px", color: "#333333", marginBottom: "16px"}}>
                              Your refund is being processed.
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{fontSize: "18px", fontWeight: 700, color: "#0F1111", marginBottom: "2px"}}>
                              Delivered
                            </div>
                            <div style={{fontSize: "13px", color: "#333333", marginBottom: "16px"}}>
                              Package was handed to a receptionist
                            </div>
                          </>
                        )}
                        
                        <div className="flex items-start gap-4">
                          <div style={{flexShrink:0}}>
                            <img src={getSKUReferenceImage(order.sku)} alt={order.name} style={{width:"80px", height:"80px", objectFit:"contain"}} />
                          </div>
                          <div className="flex flex-col">
                            <div className="cursor-pointer hover:underline hover:text-[#c45500]" style={{fontSize:"14px", color:"#007185", lineHeight:"1.4", fontWeight: 500}}>
                              {order.name}
                            </div>
                            <div style={{fontSize:"12px", color:"#333333", marginTop:"4px", marginBottom: "8px", fontWeight: 500}}>
                              Return window {isExpired ? "closed on" : "closes"} {new Date(new Date(order.purchaseDate).getTime() + (order.returnWindowDays || 30) * 86400000).toLocaleDateString()}
                            </div>
                            <button style={{border: "1px solid #888C8C", borderRadius: "100px", padding: "3px 10px", fontSize: "12px", background: "#FFF", width: "fit-content", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", color: "#0F1111", fontWeight: 500}}>
                              View your item
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer (Actions) */}
                      <div className="flex flex-col gap-2" style={{width:"240px", flexShrink:0}}>
                        <button style={{background: "#FFD814", color: "#0F1111", border: "1px solid #FCD200", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", fontWeight: 500}} className="hover:bg-[#F7CA00]">
                          Track package
                        </button>
                        
                        {!isReturned && (
                          hasManual(order.sku) ? (
                            <>
                              <button
                                onClick={() => handleDIM(order)}
                                disabled={isExpired}
                                style={{background: "#FFF", color: "#0F1111", border: "1px solid #888C8C", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", opacity: isExpired ? 0.5 : 1, fontWeight: 500}}
                                className="hover:bg-[#F7F8F8]"
                              >
                                Get product support
                              </button>
                              <button
                                onClick={() => setReasonOrder(order)}
                                disabled={isExpired}
                                style={{background: "#FFF", color: "#0F1111", border: "1px solid #888C8C", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", opacity: isExpired ? 0.5 : 1, fontWeight: 500}}
                                className="hover:bg-[#F7F8F8]"
                              >
                                Return or replace items
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setReasonOrder(order)}
                              disabled={isExpired}
                              style={{background: "#FFF", color: "#0F1111", border: "1px solid #888C8C", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", opacity: isExpired ? 0.5 : 1, fontWeight: 500}}
                              className="hover:bg-[#F7F8F8]"
                            >
                              Return or replace items
                            </button>
                          )
                        )}
                        
                        <button style={{background: "#FFF", color: "#0F1111", border: "1px solid #888C8C", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", fontWeight: 500}} className="hover:bg-[#F7F8F8]">Leave seller feedback</button>
                        <button style={{background: "#FFF", color: "#0F1111", border: "1px solid #888C8C", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", fontWeight: 500}} className="hover:bg-[#F7F8F8]">Leave delivery feedback</button>
                        <button style={{background: "#FFF", color: "#0F1111", border: "1px solid #888C8C", borderRadius: "100px", padding: "6px", fontSize: "13px", textAlign: "center", width: "100%", boxShadow: "0 1px 2px rgba(15,17,17,0.15)", fontWeight: 500}} className="hover:bg-[#F7F8F8]">Write a product review</button>
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
    </div>
  );
}
