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
  } = useApp() as any;

  const [fraudLoading, setFraudLoading] = React.useState(false);
  const [selectedClaim, setSelectedClaim] = React.useState<any>(null);
  const [fraudImageName, setFraudImageName] = React.useState("uploaded_claim_evidence.jpg");
  const [fraudDemoCycle, setFraudDemoCycle] = React.useState(0);
  const [adminTab, setAdminTab] = React.useState<"manual" | "processed">("manual");

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
            claimType,
            timestamp: new Date().toISOString(),
            status: "APPROVED"
          };
          setProcessedFraudQueue((prev: any[]) => {
            if (prev.find((item: any) => item.sku === fraudSku)) return prev;
            return [claimObj, ...prev];
          });
          setInspectQueue((prev: any[]) => {
            if (prev.find((item: any) => item.sku === fraudSku)) return prev;
            return [...prev, { ...claimObj, source: "fraud" }];
          });
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
            claimType,
            timestamp: new Date().toISOString(),
            status: "REJECTED"
          };
          setProcessedFraudQueue((prev: any[]) => {
            if (prev.find((item: any) => item.sku === fraudSku)) return prev;
            return [claimObj, ...prev];
          });
        }

        // If the AI is unsure (score > 40), push to Manual Review Queue
        if (data && !data.shouldRetake && data.riskScore > 40) {
          setManualReviewQueue((prev: any[]) => {
            if (prev.find((item: any) => item.sku === fraudSku)) return prev;
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
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", background: "#FFF", padding: "20px", border: "1px solid #DDD", borderRadius: "4px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 400, color: "#0F1111", margin: 0 }}>Verify Your Return</h2>
          <span style={{ fontSize: "12px", background: "#067D62", color: "#FFF", padding: "2px 8px", borderRadius: "4px" }}>AI Verified</span>
        </div>
        <div style={{ background: "#F0FAF4", border: "1px solid #067D62", padding: "12px 16px", borderRadius: "4px", fontSize: "13px", color: "#0F1111", lineHeight: "1.5" }}>
          📸 To process your return, please upload a photo of the item and briefly describe the issue. Our AI verifies your claim in under 2 seconds.
        </div>

        {/* Two-column desktop grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

          {/* LEFT COLUMN — Photo Upload */}
          <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: fraudImage ? "#067D62" : "#FF9900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#FFF", fontSize: "11px", fontWeight: 700 }}>{fraudImage ? "✓" : "1"}</span>
              </div>
              <div>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F1111" }}>Upload Evidence Photo</span>
                <span style={{ display: "block", fontSize: "11px", color: "#565959" }}>Photo of item & close-up of defect</span>
              </div>
            </div>

            {/* Photo preview */}
            <div style={{ border: fraudImage ? "2px solid #067D62" : "2px dashed #D5D9D9", borderRadius: "6px", overflow: "hidden", background: "#F7F8F8", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {fraudImage ? (
                <img src={fraudImage} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Claim evidence" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "24px", textAlign: "center" }}>
                  <ImageIcon style={{ width: "32px", height: "32px", color: "#C8CBCF" }} />
                  <span style={{ fontSize: "12px", color: "#565959", fontWeight: 500 }}>No photo uploaded yet</span>
                  <span style={{ fontSize: "11px", color: "#8D9098" }}>Use Camera, Upload, or Demo below</span>
                </div>
              )}
            </div>

            <WebcamCapture
              onCapture={(base64: string) => { setFraudImage(base64); setFraudImageName("uploaded_claim_evidence.jpg"); setFraudResult(null); }}
              overlayType="damage"
            />
            <button
              style={{ background: "transparent", border: "1px solid #D5D9D9", borderRadius: "4px", padding: "7px 12px", fontSize: "12px", color: "#565959", cursor: "pointer", width: "100%" }}
              onClick={handleFraudDemoClick}
            >
              Load Sample Photo #{(fraudDemoCycle % 3) + 1}
            </button>
          </div>

          {/* RIGHT COLUMN — Description + Submit */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Step 2 */}
            <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: userDescription.trim() ? "#067D62" : "#FF9900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#FFF", fontSize: "11px", fontWeight: 700 }}>{userDescription.trim() ? "✓" : "2"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F1111" }}>Describe the Issue</span>
                  <span style={{ display: "block", fontSize: "11px", color: "#565959" }}>Context the AI cannot see from the photo alone</span>
                </div>
              </div>
              <textarea
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder={"Examples:\n• \"Received blue instead of black.\"\n• \"The zipper is broken on the front pocket.\"\n• \"Only one earbud was in the box — missing the right one.\"\n• \"Left shoe is size 8, right shoe is size 9.\""}
                style={{
                  width: "100%", boxSizing: "border-box", minHeight: "140px", padding: "10px 12px", fontSize: "13px",
                  border: "1px solid #D5D9D9", borderRadius: "6px", resize: "vertical", fontFamily: "inherit",
                  color: "#0F1111", background: "#FFF", lineHeight: 1.5, outline: "none"
                }}
              />
              <div style={{ fontSize: "11px", color: "#8D9098" }}>
                {userDescription.trim().length}/500 — More detail helps us process your return faster.
              </div>
            </div>

            {/* Step 3 — Result or Submit */}
            {fraudResult ? (
              <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                {fraudResult.shouldRetake ? (
                  <>
                    <AlertTriangle style={{ width: "36px", height: "36px", color: "#FF9900" }} />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#0F1111" }}>Photo Retake Required</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>{fraudResult.retakeReason || "Please provide a clearer photo of the item."}</p>
                    <button style={{ background: "#FF9900", color: "#111", border: "none", borderRadius: "4px", padding: "9px 22px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }} onClick={() => { setFraudImage(null); setFraudResult(null); }}>Retake Photo</button>
                  </>
                ) : fraudResult.status === "REJECTED" ? (
                  <>
                    <AlertTriangle style={{ width: "36px", height: "36px", color: "#dc2626" }} />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#dc2626" }}>Return Denied</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>Your return request for <strong>{fraudItemName}</strong> has been rejected by our team due to policy violations.</p>
                  </>
                ) : (fraudResult.status === "APPROVED" || fraudResult.riskScore <= 40) ? (
                  <>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#E6F4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package style={{ width: "22px", height: "22px", color: "#067D62" }} />
                    </div>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#0F1111" }}>Return Approved!</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>Your return for <strong>{fraudItemName}</strong> has been verified. A prepaid shipping label has been sent to <strong>{profileEmail}</strong>.</p>
                  </>
                ) : (
                  <>
                    <Shield style={{ width: "36px", height: "36px", color: "#C7511F" }} />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#0F1111" }}>Manual Review Required</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>Our team will review your claim and reach out to <strong>{profileEmail}</strong> shortly.</p>
                  </>
                )}
              </div>
            ) : (
              <button
                disabled={!fraudImage || fraudLoading}
                onClick={triggerFraudCheck}
                style={{ width: "100%", background: (!fraudImage || fraudLoading) ? "#E8E8E8" : "#FF9900", color: (!fraudImage || fraudLoading) ? "#8D9098" : "#0F1111", border: "none", borderRadius: "4px", padding: "14px 0", fontSize: "14px", fontWeight: 700, cursor: (!fraudImage || fraudLoading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s" }}
              >
                {fraudLoading ? (
                  <><span className="spinner" style={{ borderColor: "#8D9098", borderTopColor: "transparent" }} /> Verifying your return...</>
                ) : (
                  <><Shield style={{ width: "16px", height: "16px" }} /> Submit & Verify Return</>
                )}
              </button>
            )}
            {!fraudResult && !fraudImage && (
              <p style={{ fontSize: "11px", color: "#8D9098", textAlign: "center", margin: 0 }}>Upload a photo on the left to enable submission.</p>
            )}
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
           
           <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
             {(adminTab === "manual" ? manualReviewQueue : processedFraudQueue).length === 0 ? (
               <div className="text-center p-8 text-slate-400 my-auto">
                 <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                 <div className="text-xs font-medium">No claims in this queue.</div>
               </div>
             ) : (
               (adminTab === "manual" ? manualReviewQueue : processedFraudQueue).map((claim: any) => (
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
                     {claim.status && <span className="font-bold">{claim.status}</span>}
                   </div>
                   <div className="text-[10px] text-slate-400">{new Date(claim.timestamp).toLocaleString()}</div>
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
                             if (prev.find(p => p.id === selectedClaim.id)) return prev;
                             return [{...selectedClaim, status: "APPROVED"}, ...prev];
                           });
                           setInspectQueue((prev: any[]) => {
                             if (prev.find(p => p.id === selectedClaim.id)) return prev;
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
                             if (prev.find(p => p.id === selectedClaim.id)) return prev;
                             return [{...selectedClaim, status: "REJECTED"}, ...prev];
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
