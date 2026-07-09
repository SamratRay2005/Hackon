"use client";

/**
 * L2Fraud.tsx — Verify Return Tab
 * ──────────────────────────────────
 * Dual View: 
 * - Consumer: Uploads photo, describes issue, triggers AI verification.
 * - Admin: Views the Manual Review Queue and accepts/rejects returns.
 */

import React from "react";
import {
  Shield,
  ShieldCheck,
  Camera,
  Package,
  AlertTriangle,
  ImageIcon,
  CheckCircle,
} from "lucide-react";
import {
  useApp,
  WebcamCapture,
  getSKUReferenceImage,
  MOCK_DAMAGE_SVG,
  MOCK_FRAUD_SUSPICIOUS_SVG,
  svgToDataUrl,
} from "./AppContext";

export default function L2Fraud() {
  const {
    fraudImage,
    setFraudImage,
    fraudSku,
    fraudOrderId,
    fraudItemName,
    profileUserId,
    profileEmail,
    profileIp,
    profilePriorReturns,
    setMetrics,
    fraudClaimType: claimType,
    setFraudClaimType: setClaimType,
    setActiveTab,
    setInspectQueue,
    isAdminMode,
    fraudResult, 
    setFraudResult,
    userDescription, 
    setUserDescription,
    manualReviewQueue, 
    setManualReviewQueue,
    processedFraudQueue, 
    setProcessedFraudQueue,
    setWalletInfo,
  } = useApp() as any;

  const [fraudLoading, setFraudLoading] = React.useState(false);
  const [selectedClaim, setSelectedClaim] = React.useState<any>(null);
  const [fraudImageName, setFraudImageName] = React.useState("uploaded_claim_evidence.jpg");
  const [fraudDemoCycle, setFraudDemoCycle] = React.useState(0);
  const [adminTab, setAdminTab] = React.useState<"manual" | "processed">("manual");
  const [filterResalable, setFilterResalable] = React.useState(false);

  const triggerFraudCheck = async () => {
    if (!fraudImage) return;
    setFraudLoading(true);
    try {
      const res = await fetch("/api/risk-mitigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: fraudImage,
          imageName: fraudImageName,
          userId: profileUserId,
          email: profileEmail,
          ipAddress: profileIp,
          sku: fraudSku,
          itemName: fraudItemName,
          priorReturns: profilePriorReturns,
          claimType,
          isDamageVisible: null,
          nonVisibleCategory: "electronics",
          questionnaireAnswers: {}
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFraudResult(data);

        // If it's not a retake and score is <= 40 (Approved), push to processedFraudQueue and inspectQueue
        if (data && !data.shouldRetake && data.riskScore <= 40) {
          const claimObj = {
            id: Math.random().toString(36).substr(2, 9),
            orderId: fraudOrderId || Math.random().toString(36).substr(2, 9),
            sku: fraudSku,
            itemName: fraudItemName,
            userId: profileUserId,
            riskScore: data.riskScore,
            recommendedAction: data.recommendedAction,
            signals: data.signals || [],
            userDescription,
            fraudImage,
            breakdown: data.breakdown,
            reasoning: data.reasoning,
            defectExplanation: data.defectExplanation,
            isResalable: !!data.isResalable,
            claimType,
            timestamp: new Date().toISOString(),
            status: "APPROVED"
          };
          setProcessedFraudQueue((prev: any[]) => {
            return [claimObj, ...prev];
          });
          if (data.isResalable) {
            setInspectQueue((prev: any[]) => {
              return [...prev, { ...claimObj, source: "fraud" }];
            });
          }
        }
        
        // If blocked autonomously
        if (data && !data.shouldRetake && data.recommendedAction === "BLOCK") {
          const claimObj = {
            id: Math.random().toString(36).substr(2, 9),
            orderId: fraudOrderId || Math.random().toString(36).substr(2, 9),
            sku: fraudSku,
            itemName: fraudItemName,
            userId: profileUserId,
            riskScore: data.riskScore,
            recommendedAction: data.recommendedAction,
            signals: data.signals || [],
            userDescription,
            fraudImage,
            breakdown: data.breakdown,
            reasoning: data.reasoning,
            defectExplanation: data.defectExplanation,
            isResalable: !!data.isResalable,
            claimType,
            timestamp: new Date().toISOString(),
            status: "REJECTED"
          };
          setProcessedFraudQueue((prev: any[]) => {
            return [claimObj, ...prev];
          });
          
          // Trust Score Penalty for autonomous block
          setWalletInfo((prev: any) => {
            const newScore = Math.max(0, (prev?.trustScore ?? 100) - 20);
            return {
              ...prev,
              trustScore: newScore,
              returnPrivileges: newScore < 50 ? "BANNED" : "INSTANT_ALLOWED"
            };
          });
        }

        // If the AI is unsure (score > 40), push to Manual Review Queue
        if (data && !data.shouldRetake && data.riskScore > 40) {
          setManualReviewQueue((prev: any[]) => {
            return [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              orderId: fraudOrderId || Math.random().toString(36).substr(2, 9),
              sku: fraudSku,
              itemName: fraudItemName,
              userId: profileUserId,
              riskScore: data.riskScore,
              recommendedAction: data.recommendedAction,
              signals: data.signals || [],
              userDescription,
              fraudImage,
              breakdown: data.breakdown,
              reasoning: data.reasoning,
              defectExplanation: data.defectExplanation,
              isResalable: !!data.isResalable,
              claimType,
              timestamp: new Date().toISOString(),
              status: "MANUAL_REVIEW"
            }];
          });
        }

        if (data.recommendedAction === "BLOCK") setMetrics((prev: any) => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 }));
      }
    } catch { } finally { setFraudLoading(false); }
  };

  const handleFraudDemoClick = () => {
    const samples = [
      svgToDataUrl(MOCK_FRAUD_SUSPICIOUS_SVG),
      svgToDataUrl(MOCK_DAMAGE_SVG),
    ];
    setFraudImage(samples[fraudDemoCycle % samples.length]);
    setFraudDemoCycle(c => c + 1);
    setFraudImageName(fraudDemoCycle % 2 === 0 ? "sample_staged_claim.svg" : "sample_genuine_claim.svg");
    setFraudResult(null);
  };

  // ─── Consumer UI ───────────────────────────────────────────────
  if (!isAdminMode) {
    const resultCard = fraudResult ? (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px",
        background: fraudResult.shouldRetake ? "#FFFBF0" : (fraudResult.status === "REJECTED" || fraudResult.recommendedAction === "BLOCK") ? "#FFF5F5" : (fraudResult.status === "APPROVED" || fraudResult.riskScore <= 40) ? "#F0FAF4" : "#FFF7F0",
        border: fraudResult.shouldRetake ? "1px solid #FCD200" : (fraudResult.status === "REJECTED" || fraudResult.recommendedAction === "BLOCK") ? "1px solid #F5B5AD" : (fraudResult.status === "APPROVED" || fraudResult.riskScore <= 40) ? "1px solid #84C2A6" : "1px solid #F3D2C4",
        borderRadius: "8px", width: "100%", boxSizing: "border-box", marginTop: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
      }}>
        {fraudResult.shouldRetake ? (<>
          <AlertTriangle style={{ width: "24px", height: "24px", color: "#FF9900", flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F1111", marginBottom: "4px" }}>Photo Retake Required</div>
            <div style={{ fontSize: "13px", color: "#565959", marginBottom: "12px" }}>{fraudResult.retakeReason || "Please provide a clearer photo of the item."}</div>
            <button style={{ background: "#FFF", color: "#0F1111", border: "1px solid #D5D9D9", borderRadius: "64px", padding: "6px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }} onClick={() => { setFraudImage(null); setFraudResult(null); }}>Retake Photo</button>
          </div>
        </>) : fraudResult.status === "REJECTED" || fraudResult.recommendedAction === "BLOCK" ? (<>
          <AlertTriangle style={{ width: "24px", height: "24px", color: "#dc2626", flexShrink: 0, marginTop: "2px" }} />
          <div><div style={{ fontSize: "15px", fontWeight: 700, color: "#dc2626", marginBottom: "2px" }}>Return Denied</div><div style={{ fontSize: "13px", color: "#565959", lineHeight: "1.4" }}>Your request for <strong>{fraudItemName}</strong> was rejected due to policy violations.</div></div>
        </>) : (fraudResult.status === "APPROVED" || fraudResult.riskScore <= 40) ? (<>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#067D62", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
            <span style={{ color: "#FFF", fontSize: "14px", fontWeight: 700 }}>✓</span>
          </div>
          <div><div style={{ fontSize: "15px", fontWeight: 700, color: "#067D62", marginBottom: "2px" }}>Return Approved!</div><div style={{ fontSize: "13px", color: "#565959", lineHeight: "1.4" }}>Your return for <strong>{fraudItemName}</strong> has been verified.<br />A prepaid shipping label has been sent to <strong>{profileEmail}</strong>.</div></div>
        </>) : (<>
          <Shield style={{ width: "24px", height: "24px", color: "#C7511F", flexShrink: 0, marginTop: "2px" }} />
          <div><div style={{ fontSize: "15px", fontWeight: 700, color: "#0F1111", marginBottom: "2px" }}>Manual Review Required</div><div style={{ fontSize: "13px", color: "#565959", lineHeight: "1.4" }}>Our team will reach out to <strong>{profileEmail}</strong> shortly.</div></div>
        </>)}
      </div>
    ) : null;

    const GreenCheckCircle = () => (
      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#067D62", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#FFF", fontSize: "12px", fontWeight: 700 }}>✓</span>
      </div>
    );

    const OrangeNumberCircle = ({ num }: { num: number }) => (
      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#FF9900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#FFF", fontSize: "12px", fontWeight: 700 }}>{num}</span>
      </div>
    );

    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F5F5F5", overflowY: "auto", overflowX: "hidden" }}>
        
        <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: "#FFF", minHeight: "100%" }}>
          
          {/* Header Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "10px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 400, color: "#0F1111", margin: 0 }}>Verify Your Return</h2>
            <span style={{ fontSize: "13px", background: "#067D62", color: "#FFF", padding: "4px 10px", borderRadius: "6px", fontWeight: 700 }}>AI Verified</span>
          </div>

          {/* Top Full Width Green Info Box */}
          <div style={{ background: "#F0FAF4", border: "1px solid #067D62", borderRadius: "4px", padding: "16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <ShieldCheck style={{ width: "24px", height: "24px", color: "#067D62", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ color: "#0F1111", fontSize: "14px", lineHeight: "1.5" }}>
              <strong>We use AI to verify your claim and help process your return faster.</strong><br/>
              Please upload a clear, original photo of the item showing the issue. Our AI verifies your claim in under 2 seconds.
            </div>
          </div>

          {/* 2-Column Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "8px" }}>
            
            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {fraudImage ? <GreenCheckCircle /> : <OrangeNumberCircle num={1} />}
                <div>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F1111" }}>Upload Evidence Photo</span>
                  <span style={{ display: "block", fontSize: "12px", color: "#565959", marginTop: "2px" }}>Photo of item &amp; close-up of defect</span>
                </div>
              </div>

              <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ background: "#F7F8F8", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderBottom: fraudImage ? "1px solid #D5D9D9" : "none" }}>
                  {fraudImage ? (
                    <img src={fraudImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Claim evidence" />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "#565959" }}>
                      <ImageIcon style={{ width: "32px", height: "32px", color: "#C8CBCF" }} />
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>No photo uploaded yet</span>
                    </div>
                  )}
                </div>
                
                {fraudImage && (
                  <div style={{ background: "#F0FAF4", borderBottom: "1px solid #D5D9D9", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#067D62", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#FFF", fontSize: "10px", fontWeight: 700 }}>✓</span>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#067D62" }}>Photo uploaded successfully</div>
                      <div style={{ fontSize: "11px", color: "#565959" }}>Looks good! Your photo is clear and in focus.</div>
                    </div>
                  </div>
                )}

                <div style={{ padding: "16px", background: "#FFF" }}>
                  <WebcamCapture
                    onCapture={(base64: string) => { setFraudImage(base64); setFraudImageName("uploaded_claim_evidence.jpg"); setFraudResult(null); }}
                    overlayType="damage"
                  />
                  <button
                    style={{ marginTop: "12px", background: "transparent", border: "1px solid #D5D9D9", borderRadius: "64px", padding: "8px", fontSize: "12px", color: "#565959", cursor: "pointer", width: "100%", fontWeight: 600 }}
                    onClick={handleFraudDemoClick}
                  >
                    Load Sample Photo #{(fraudDemoCycle % 3) + 1}
                  </button>
                  <div style={{ textAlign: "center", marginTop: "16px", fontSize: "12px", color: "#565959" }}>
                    JPG, JPEG or PNG only. Max size 10MB.
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Step 2 — Product Reference */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {fraudImage ? <GreenCheckCircle /> : <OrangeNumberCircle num={2} />}
                  <div>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F1111" }}>Product Reference (From Amazon Catalogue)</span>
                    <span style={{ display: "block", fontSize: "12px", color: "#565959", marginTop: "2px" }}>This is how the product looks when new</span>
                  </div>
                </div>
                
                <div style={{ border: "1px solid #F0F2F2", borderRadius: "8px", background: "#F7F8F8", padding: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                  <img src={getSKUReferenceImage(fraudSku)} alt={fraudItemName} style={{ width: "80px", height: "80px", objectFit: "contain", flexShrink: 0, border: "1px solid #E8E8E8", borderRadius: "4px", background: "#FFF", padding: "4px" }} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "6px" }}>{fraudItemName}</div>
                    <div style={{ fontSize: "13px", color: "#565959", marginBottom: "4px" }}>Order ID: {fraudOrderId || "N/A"}</div>
                    <div style={{ fontSize: "13px", color: "#565959", marginBottom: "4px" }}>Delivered on: 12 May 2025</div>
                    <div style={{ fontSize: "13px", color: "#007185", fontWeight: 600, cursor: "pointer" }}>View Product Details &rsaquo;</div>
                  </div>
                </div>
                
                <div style={{ background: "#EEF4FF", border: "1px solid #C8D8F0", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#1a3a6b", display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#1a3a6b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#FFF", fontSize: "12px", fontWeight: "bold" }}>i</div>
                  <span>Compare your uploaded photo with the original product image.<br/>Make sure the issue is clearly visible.</span>
                </div>
              </div>

              {/* Step 3 — Describe the Issue */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {userDescription.trim() ? <GreenCheckCircle /> : <OrangeNumberCircle num={3} />}
                  <div>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#0F1111" }}>Describe the Issue</span>
                    <span style={{ display: "block", fontSize: "12px", color: "#565959", marginTop: "2px" }}>Context the AI cannot see from the photo alone</span>
                  </div>
                </div>
                
                <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <textarea
                    value={userDescription}
                    onChange={(e) => setUserDescription(e.target.value)}
                    placeholder={"E.g. Received blue instead of red, stain on front side, torn pocket, etc."}
                    style={{
                      flex: 1, width: "100%", boxSizing: "border-box", minHeight: "100px", padding: "0", fontSize: "14px",
                      border: "none", resize: "none", fontFamily: "inherit",
                      color: "#0F1111", background: "transparent", lineHeight: 1.5, outline: "none"
                    }}
                  />
                  <div style={{ fontSize: "12px", color: "#8D9098", textAlign: "right", marginTop: "8px" }}>{userDescription.trim().length}/500</div>
                </div>
              </div>

              {/* Submit Area in Right Column */}
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <button
                  disabled={!fraudImage || fraudLoading}
                  onClick={triggerFraudCheck}
                  style={{
                    width: "100%",
                    background: (!fraudImage || fraudLoading) ? "#E8E8E8" : "#FFD814",
                    color: (!fraudImage || fraudLoading) ? "#8D9098" : "#0F1111",
                    border: (!fraudImage || fraudLoading) ? "none" : "1px solid #FCD200",
                    borderRadius: "64px", padding: "8px", fontSize: "12px", fontWeight: 600,
                    cursor: (!fraudImage || fraudLoading) ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s",
                    boxShadow: (!fraudImage || fraudLoading) ? "none" : "0 2px 5px rgba(0,0,0,0.05)"
                  }}
                >
                  {fraudLoading ? (
                    <><span className="spinner" style={{ borderColor: "#8D9098", borderTopColor: "transparent" }} /> Verifying...</>
                  ) : (
                    "Submit & Verify Return"
                  )}
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#565959", fontSize: "12px" }}>
                  <Shield style={{ width: "12px", height: "12px" }} /> Secure and encrypted
                </div>

                {/* Result Card inline */}
                {resultCard}
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin UI ───────────────────────────────────────────────────
  const activeFraudSession = fraudResult ? {
    id: "active_session",
    sku: fraudSku,
    itemName: fraudItemName,
    userId: profileUserId,
    riskScore: fraudResult.riskScore,
    recommendedAction: fraudResult.recommendedAction,
    signals: fraudResult.signals || [],
    userDescription,
    fraudImage,
    breakdown: fraudResult.breakdown,
    reasoning: fraudResult.reasoning,
    claimType,
    timestamp: new Date().toISOString(),
    status: fraudResult.status
  } : null;

  const displayClaim = selectedClaim || activeFraudSession;

  return (
    <div style={{display:"flex", flexDirection:"column", gap:"20px", background:"#FFF", padding:"20px", border:"1px solid #DDD", borderRadius:"4px"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px"}}>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <h2 style={{fontSize:"24px", fontWeight:400, color:"#0F1111"}}>Returns Security Console</h2>
          <span style={{fontSize:"12px", background:"#C7511F", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>Admin Mode</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Left Column: Queues */}
        <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-slate-50 flex flex-col h-[700px] shadow-sm">
           
           {/* Queue Tabs */}
           <div className="flex border-b border-slate-200 bg-white rounded-t-xl">
              <button 
                onClick={() => { setAdminTab("manual"); setSelectedClaim(null); }}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 ${adminTab === "manual" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Manual Review 
                <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-[10px]">{manualReviewQueue.length}</span>
              </button>
              <button 
                onClick={() => { setAdminTab("processed"); setSelectedClaim(null); }}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 ${adminTab === "processed" ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Processed
                <span className="bg-slate-100 px-1.5 py-0.5 rounded-full text-[10px]">{processedFraudQueue.length}</span>
              </button>
           </div>
           
           {/* Resalable Filter */}
           <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 cursor-pointer flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   checked={filterResalable} 
                   onChange={(e) => setFilterResalable(e.target.checked)} 
                   className="cursor-pointer accent-emerald-600 w-3 h-3"
                 />
                 Show Only Resalable
              </label>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
             {(adminTab === "manual" ? manualReviewQueue : processedFraudQueue).filter((c: any) => filterResalable ? c.isResalable : true).length === 0 ? (
               <div className="text-center p-8 text-slate-400 my-auto">
                 <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                 <div className="text-xs font-medium">No claims in this queue.</div>
               </div>
             ) : (
               (adminTab === "manual" ? manualReviewQueue : processedFraudQueue)
                 .filter((claim: any) => filterResalable ? claim.isResalable : true)
                 .map((claim: any) => (
                 <div 
                   key={claim.id} 
                   onClick={() => setSelectedClaim(claim)}
                   className={`p-3 border rounded-xl cursor-pointer transition-all relative overflow-hidden ${selectedClaim?.id === claim.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                 >
                   {claim.status === "APPROVED" && <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-100 rounded-bl-full" />}
                   {claim.status === "REJECTED" && <div className="absolute top-0 right-0 w-8 h-8 bg-rose-100 rounded-bl-full" />}
                   
                   <div className="flex justify-between items-start mb-2 relative z-10">
                     <div className="font-bold text-sm text-slate-800 line-clamp-1">{claim.itemName}</div>
                     <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 ${claim.riskScore > 70 ? 'bg-rose-100 text-rose-700' : (claim.riskScore > 40 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}`}>
                       Score: {claim.riskScore}
                     </span>
                   </div>
                   <div className="text-[10px] text-slate-500 font-mono mb-1 flex justify-between relative z-10">
                     <span>User: {claim.userId}</span>
                     <span className={`font-bold uppercase ${claim.status === "APPROVED" ? "text-emerald-600" : (claim.status === "REJECTED" ? "text-rose-600" : "text-amber-500")}`}>
                       {claim.status === "MANUAL_REVIEW" ? "Pending" : claim.status}
                     </span>
                   </div>
                   <div className="text-[9px] text-slate-400 flex justify-between items-center relative z-10">
                     <span>{new Date(claim.timestamp).toLocaleString()}</span>
                     {claim.isResalable && (
                       <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">RESALABLE</span>
                     )}
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Right Column: Risk Dashboard */}
        <div className="lg:col-span-2 border border-slate-200 rounded-xl bg-white p-6 flex flex-col h-[700px] overflow-y-auto shadow-sm">
          {!displayClaim ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
               <Shield className="w-12 h-12 mb-4 opacity-20" />
               <div className="text-sm font-medium">No active claims</div>
               <div className="text-xs mt-1">Submit a return on the user side, or select from the queue.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Header Info */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                 <div>
                   <h2 className="text-xl font-bold text-slate-800">{displayClaim.itemName}</h2>
                   <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                     <span className="bg-slate-100 px-2 py-1 rounded">SKU: {displayClaim.sku}</span>
                     <span className="bg-slate-100 px-2 py-1 rounded">User: {displayClaim.userId}</span>
                     <span className="bg-slate-100 px-2 py-1 rounded">Type: {displayClaim.claimType?.replace('_', ' ')}</span>
                   </div>
                 </div>
                 <div className="flex flex-col items-end">
                   <div className={`text-3xl font-black px-4 py-2 rounded-xl border-2 font-mono flex-shrink-0 shadow-sm ${displayClaim.riskScore > 70 ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-amber-50 border-amber-200 text-amber-600"}`}>
                     {displayClaim.riskScore}
                   </div>
                   <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">Risk Score</span>
                 </div>
              </div>

              {/* Split Image Compare */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="flex flex-col gap-2">
                   <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Camera className="w-3.5 h-3.5"/> Customer Evidence</span>
                   <div className="aspect-square bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                     {displayClaim.fraudImage ? <img src={displayClaim.fraudImage} className="w-full h-full object-contain rounded-lg" /> : <div className="text-xs text-slate-400">No image</div>}
                   </div>
                 </div>
                 <div className="flex flex-col gap-2">
                   <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/> Catalog Reference</span>
                   <div className="aspect-square bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                     <img src={getSKUReferenceImage(displayClaim.sku)} className="w-full h-full object-contain rounded-lg" />
                   </div>
                 </div>
              </div>

              {/* Customer Description */}
              {displayClaim.userDescription && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 italic shadow-sm relative">
                  <span className="absolute -top-2.5 left-4 bg-slate-50 px-2 text-[9px] font-bold uppercase text-slate-400">Customer Comments</span>
                  "{displayClaim.userDescription}"
                </div>
              )}

              {/* Signals and Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Breakdown */}
                 {displayClaim.breakdown && (
                    <div className="flex flex-col gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Risk Breakdown</span>
                      {[
                        { label: "AI Generation Score", val: displayClaim.breakdown.aiGenerationScore },
                        { label: "Photo Staging Signs", val: displayClaim.breakdown.photoStagingSigns },
                        { label: "IP Rep Fraud (IPQS)", val: displayClaim.breakdown.ipqsScore },
                        { label: "User Return Velocity", val: displayClaim.breakdown.userVelocityScore },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col gap-2">
                          <div className="flex justify-between font-semibold text-slate-500 text-[10px] uppercase">
                            <span>{label}</span>
                            <span className="font-extrabold text-slate-800">{val}%</span>
                          </div>
                          <div className="progress-bar-container" style={{ height: "4px" }}>
                            <div className="progress-bar-fill" style={{ width: `${val}%`, background: val > 70 ? "linear-gradient(90deg,#dc2626,#ef4444)" : "linear-gradient(90deg,#d97706,#f59e0b)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                 )}

                 {/* Signals & Actions */}
                 <div className="flex flex-col gap-4">
                   <div className="flex flex-col gap-3">
                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Deduction & Reasoning</span>
                     <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900 leading-relaxed shadow-sm">
                       <strong className="block mb-1">Reasoning Chain:</strong>
                       {displayClaim.reasoning || "AI processed claim autonomously."}
                       
                       {displayClaim.defectExplanation && (
                         <div className="mt-2 pt-2 border-t border-indigo-200/50">
                           <strong className="block mb-1">Conclusion:</strong>
                           {displayClaim.defectExplanation}
                         </div>
                       )}
                     </div>

                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-2">Risk Signals</span>
                     <ul className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {displayClaim.signals?.map((sig: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-rose-400 mt-0.5">›</span> {sig}
                          </li>
                        ))}
                     </ul>
                   </div>
                   
                   <div className="mt-auto flex flex-col gap-2.5 pt-4 border-t border-slate-100">
                     <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors" onClick={() => { 
                         if (selectedClaim) {
                           setManualReviewQueue((prev: any[]) => prev.filter((c: any) => c.id !== selectedClaim.id)); 
                           setProcessedFraudQueue((prev: any[]) => {
                             return [{...selectedClaim, status: "APPROVED"}, ...prev];
                           });
                           setInspectQueue((prev: any[]) => {
                             return [{...selectedClaim, status: "APPROVED", source: "fraud"}, ...prev];
                           });
                         }
                         setFraudResult((prev: any) => prev ? ({ ...prev, status: "APPROVED" }) : null);
                         setSelectedClaim(null); 
                     }}>
                       Approve Return (Override AI)
                     </button>
                     <button className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors" onClick={() => { 
                         if (selectedClaim) {
                           setManualReviewQueue((prev: any[]) => prev.filter((c: any) => c.id !== selectedClaim.id)); 
                           setProcessedFraudQueue((prev: any[]) => {
                             return [{...selectedClaim, status: "REJECTED"}, ...prev];
                           });
                           // Trust Score Penalty for admin rejection
                           setWalletInfo((prev: any) => {
                             const newScore = Math.max(0, (prev?.trustScore ?? 100) - 20);
                             return {
                               ...prev,
                               trustScore: newScore,
                               returnPrivileges: newScore < 50 ? "BANNED" : "INSTANT_ALLOWED"
                             };
                           });
                         }
                         setFraudResult((prev: any) => prev ? ({ ...prev, status: "REJECTED" }) : null);
                         setSelectedClaim(null); 
                         setMetrics((prev: any) => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 })); 
                     }}>
                       Reject Return & Block User
                     </button>
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
