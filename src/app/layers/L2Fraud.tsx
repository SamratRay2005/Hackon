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
  XCircle,
  Clock,
  PackageCheck,
  PackageX,
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
  const [manualCollapsed, setManualCollapsed] = React.useState(false);
  const [processedCollapsed, setProcessedCollapsed] = React.useState(false);
  const [filterResalable, setFilterResalable] = React.useState(false);
  const [visibleManualCount, setVisibleManualCount] = React.useState(5);
  const [visibleProcessedCount, setVisibleProcessedCount] = React.useState(5);

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

        // If the AI is unsure and recommends manual review, push to Manual Review Queue
        if (data && !data.shouldRetake && data.recommendedAction === "MANUAL_REVIEW") {
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
    defectExplanation: fraudResult.defectExplanation,
    isResalable: fraudResult.isResalable,
    claimType,
    orderId: fraudOrderId,
    timestamp: new Date().toISOString(),
    status: fraudResult.status
  } : null;

  const displayClaim = selectedClaim || activeFraudSession;

  const getRiskLevel = (score: number) => {
    if (score <= 25) return { label: "Low Risk", color: "#067D62", bg: "#F0FAF4", border: "#84C2A6" };
    if (score <= 60) return { label: "Medium Risk", color: "#CA8A04", bg: "#FEFCE8", border: "#FDE68A" };
    return { label: "High Risk", color: "#B12704", bg: "#FEE8E4", border: "#F5B5AD" };
  };

  const handleApprove = () => {
    if (selectedClaim) {
      setManualReviewQueue((prev: any[]) => prev.filter((c: any) => c.id !== selectedClaim.id));
      setProcessedFraudQueue((prev: any[]) => [{ ...selectedClaim, status: "APPROVED" }, ...prev]);
      if (selectedClaim.isResalable) {
        setInspectQueue((prev: any[]) => [{ ...selectedClaim, status: "APPROVED", source: "fraud" }, ...prev]);
      }
    }
    setFraudResult((prev: any) => prev ? ({ ...prev, status: "APPROVED" }) : null);
    setSelectedClaim(null);
  };

  const handleReject = () => {
    if (selectedClaim) {
      setManualReviewQueue((prev: any[]) => prev.filter((c: any) => c.id !== selectedClaim.id));
      setProcessedFraudQueue((prev: any[]) => [{ ...selectedClaim, status: "REJECTED" }, ...prev]);
      setWalletInfo((prev: any) => {
        const newScore = Math.max(0, (prev?.trustScore ?? 100) - 20);
        return { ...prev, trustScore: newScore, returnPrivileges: newScore < 50 ? "BANNED" : "INSTANT_ALLOWED" };
      });
    }
    setFraudResult((prev: any) => prev ? ({ ...prev, status: "REJECTED" }) : null);
    setSelectedClaim(null);
    setMetrics((prev: any) => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 }));
  };

  const totalProcessed = processedFraudQueue.length;
  const approvedCount = processedFraudQueue.filter((c: any) => c.status === "APPROVED").length;
  const rejectedCount = processedFraudQueue.filter((c: any) => c.status === "REJECTED").length;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F5F5F5", overflow: "hidden" }}>
      {/* ── Top Header ── */}
      <div style={{ background: "#FFF", borderBottom: "1px solid #DDD", padding: "8px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "1400px", margin: "0 auto", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0F1111", margin: 0, whiteSpace: "nowrap" }}>Returns Verification Console</h1>
            <span style={{ fontSize: "10px", background: "#C7511F", color: "#FFF", padding: "2px 7px", borderRadius: "4px", fontWeight: 700, flexShrink: 0 }}>Admin</span>
            <span style={{ fontSize: "11px", color: "#565959", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>— Review and verify return requests. AI handles most cases.</span>
          </div>
          {/* Metric Cards */}
          <div style={{ display: "flex", gap: "20px", flexShrink: 0 }}>
            {[
              { label: "Manual Review", value: manualReviewQueue.length, sub: "Requires review", subColor: "#565959" },
              { label: "AI Processed", value: totalProcessed, sub: "Auto-decided", subColor: "#565959" },
              { label: "Approved", value: approvedCount, sub: "+12% vs yesterday", subColor: "#067D62" },
              { label: "Rejected", value: rejectedCount, sub: "+3% vs yesterday", subColor: "#B12704" },
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center", minWidth: "60px" }}>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#0F1111", lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#0F1111", marginTop: "2px" }}>{m.label}</div>
                <div style={{ fontSize: "10px", color: m.subColor }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", flex: 1, minHeight: 0, maxWidth: "1400px", margin: "0 auto", width: "100%", padding: "12px", gap: "12px", boxSizing: "border-box", alignItems: "stretch", gridTemplateRows: "1fr" }}>

        <div style={{ background: "#FFF", border: "1px solid #DDD", borderRadius: "8px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {/* Inspect Queue Header */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #DDD", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inspect Queue</span>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#565959", padding: "2px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            </button>
          </div>

          {/* Search & Filter */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #F0F2F2", display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", background: "#F0F2F2", borderRadius: "4px", padding: "6px 10px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ fontSize: "12px", color: "#8D9098" }}>Search by order ID, SKU, customer…</span>
            </div>
            <button
              onClick={() => setFilterResalable(f => !f)}
              style={{ padding: "6px 10px", border: `1px solid ${filterResalable ? "#FF9900" : "#DDD"}`, borderRadius: "4px", background: filterResalable ? "#FFF8E7" : "#FFF", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: filterResalable ? "#C7511F" : "#565959" }}
            >
              ⚙ Filter
            </button>
          </div>

          {/* Scrollable Queue List */}
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* ── MANUAL REVIEW Section ── */}
            <div>
              {/* Collapsible Header */}
              <button
                onClick={() => setManualCollapsed(c => !c)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F7F8F8", border: "none", borderBottom: "1px solid #E8E8E8", cursor: "pointer", gap: "8px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "#0F1111", color: "#FFF", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "4px" }}>Manual Review</div>
                  <span style={{ background: "#F0F2F2", color: "#565959", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>{manualReviewQueue.length}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", color: "#565959", fontWeight: 500 }}>AI Processed</span>
                  <span style={{ background: "#E8E8E8", color: "#565959", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>{processedFraudQueue.length}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" strokeWidth="2.5" style={{ transform: manualCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </button>

              {/* Manual Review Items */}
              {!manualCollapsed && (
                <>
                  {manualReviewQueue.filter((c: any) => filterResalable ? c.isResalable : true).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 16px", color: "#8D9098" }}>
                      <AlertTriangle style={{ width: "24px", height: "24px", margin: "0 auto 6px", opacity: 0.3 }} />
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>No manual reviews pending.</div>
                    </div>
                  ) : (
                    <>
                      {manualReviewQueue
                        .filter((c: any) => filterResalable ? c.isResalable : true)
                        .slice(0, visibleManualCount)
                        .map((claim: any) => {
                          const risk = getRiskLevel(claim.riskScore);
                          const isSelected = selectedClaim?.id === claim.id;
                          return (
                            <div
                              key={claim.id}
                              onClick={() => setSelectedClaim(claim)}
                              style={{
                                padding: "12px", borderBottom: "1px solid #F0F2F2", cursor: "pointer",
                                background: isSelected ? "#FFF8E7" : "#FFF",
                                borderLeft: isSelected ? "3px solid #FF9900" : "3px solid transparent",
                                transition: "all 0.15s"
                              }}
                            >
                              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "6px", border: "1px solid #DDD", overflow: "hidden", flexShrink: 0, background: "#F7F8F8" }}>
                                  {claim.fraudImage
                                    ? <img src={claim.fraudImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Package style={{ width: "20px", height: "20px", color: "#C8CBCF" }} /></div>
                                  }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{claim.itemName}</div>
                                  <div style={{ fontSize: "11px", color: "#565959", marginTop: "2px" }}>Order: {claim.orderId || "N/A"}</div>
                                  <div style={{ fontSize: "11px", color: "#565959" }}>Customer: {claim.userId}</div>
                                  <div style={{ fontSize: "10px", color: "#8D9098", marginTop: "2px" }}>{new Date(claim.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0, minWidth: "72px" }}>
                                  <div style={{ fontSize: "20px", fontWeight: 900, color: risk.color, lineHeight: 1 }}>{claim.riskScore}</div>
                                  <div style={{ fontSize: "8px", fontWeight: 700, color: "#8D9098", textTransform: "uppercase", letterSpacing: "0.04em" }}>RISK SCORE</div>
                                  <span style={{ fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "99px", background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>{risk.label}</span>
                                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#FFF8E7", color: "#C7511F", border: "1px solid #FCD200", display: "flex", alignItems: "center", gap: "3px" }}>
                                    <Clock style={{ width: "9px", height: "9px" }} /> In Review
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {manualReviewQueue.filter((c: any) => filterResalable ? c.isResalable : true).length > visibleManualCount && (
                        <div style={{ padding: "10px", textAlign: "center", borderTop: "1px solid #F0F2F2" }}>
                          <button onClick={() => setVisibleManualCount(v => v + 5)} style={{ fontSize: "12px", color: "#007185", background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", margin: "0 auto" }}>Load more ↓</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* ── AI PROCESSED Section ── */}
            <div>
              {/* Collapsible Header */}
              <button
                onClick={() => setProcessedCollapsed(c => !c)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#F7F8F8", border: "none", borderBottom: "1px solid #E8E8E8", borderTop: "1px solid #DDD", cursor: "pointer", gap: "8px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "#E8E8E8", color: "#565959", fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "4px" }}>AI Processed</div>
                  <span style={{ background: "#F0F2F2", color: "#565959", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px" }}>{processedFraudQueue.length}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#565959" strokeWidth="2.5" style={{ transform: processedCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M6 9l6 6 6-6"/></svg>
              </button>

              {/* AI Processed Items */}
              {!processedCollapsed && (
                <>
                  {processedFraudQueue.filter((c: any) => filterResalable ? c.isResalable : true).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 16px", color: "#8D9098" }}>
                      <CheckCircle style={{ width: "24px", height: "24px", margin: "0 auto 6px", opacity: 0.3 }} />
                      <div style={{ fontSize: "12px", fontWeight: 600 }}>No AI-processed claims yet.</div>
                    </div>
                  ) : (
                    <>
                      {processedFraudQueue
                        .filter((c: any) => filterResalable ? c.isResalable : true)
                        .slice(0, visibleProcessedCount)
                        .map((claim: any) => {
                          const risk = getRiskLevel(claim.riskScore);
                          const isSelected = selectedClaim?.id === claim.id;
                          const itemStatus = claim.status || (claim.riskScore > 40 ? "REJECTED" : "APPROVED");
                          return (
                            <div
                              key={claim.id}
                              onClick={() => setSelectedClaim(claim)}
                              style={{
                                padding: "12px", borderBottom: "1px solid #F0F2F2", cursor: "pointer",
                                background: isSelected ? "#FFF8E7" : "#FFF",
                                borderLeft: isSelected ? "3px solid #FF9900" : "3px solid transparent",
                                transition: "all 0.15s"
                              }}
                            >
                              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "6px", border: "1px solid #DDD", overflow: "hidden", flexShrink: 0, background: "#F7F8F8" }}>
                                  {claim.fraudImage
                                    ? <img src={claim.fraudImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Package style={{ width: "20px", height: "20px", color: "#C8CBCF" }} /></div>
                                  }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{claim.itemName}</div>
                                  <div style={{ fontSize: "11px", color: "#565959", marginTop: "2px" }}>Order: {claim.orderId || "N/A"}</div>
                                  <div style={{ fontSize: "11px", color: "#565959" }}>Customer: {claim.userId}</div>
                                  <div style={{ fontSize: "10px", color: "#8D9098", marginTop: "2px" }}>{new Date(claim.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0, minWidth: "72px" }}>
                                  <div style={{ fontSize: "20px", fontWeight: 900, color: risk.color, lineHeight: 1 }}>{claim.riskScore}</div>
                                  <div style={{ fontSize: "8px", fontWeight: 700, color: "#8D9098", textTransform: "uppercase", letterSpacing: "0.04em" }}>RISK SCORE</div>
                                  <span style={{ fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "99px", background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>{risk.label}</span>
                                  {itemStatus === "REJECTED" ? (
                                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "#FEE8E4", color: "#B12704", border: "1px solid #F5B5AD", display: "flex", alignItems: "center", gap: "3px" }}>
                                      <XCircle style={{ width: "9px", height: "9px" }} /> Rejected
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: risk.bg, color: risk.color, border: `1px solid ${risk.border}`, display: "flex", alignItems: "center", gap: "3px" }}>
                                      <CheckCircle style={{ width: "9px", height: "9px" }} /> {itemStatus === "MANUAL_REVIEW" ? "In Review" : "Approved"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {processedFraudQueue.filter((c: any) => filterResalable ? c.isResalable : true).length > visibleProcessedCount && (
                        <div style={{ padding: "10px", textAlign: "center", borderTop: "1px solid #F0F2F2" }}>
                          <button onClick={() => setVisibleProcessedCount(v => v + 5)} style={{ fontSize: "12px", color: "#007185", background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", margin: "0 auto" }}>Load more ↓</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

          </div>
        </div>


        {/* ── Right: Claim Detail Panel ── */}
        <div style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: "10px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {!displayClaim ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9CA3AF", gap: "12px" }}>
              <Shield style={{ width: "48px", height: "48px", opacity: 0.2 }} />
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Select a claim to review</div>
              <div style={{ fontSize: "12px" }}>Submit a return on the user side, or select from the queue.</div>
            </div>
          ) : (() => {
            const risk = getRiskLevel(displayClaim.riskScore);
            const actualStatus = displayClaim.status || (adminTab === "manual" ? "MANUAL_REVIEW" : (displayClaim.riskScore > 40 ? "REJECTED" : "APPROVED"));
            const isResalable = displayClaim.isResalable && actualStatus !== "REJECTED";
            return (
              <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

                {/* ── Header ── */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    {/* Left: thumb + title */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <div style={{ width: "56px", height: "56px", borderRadius: "8px", border: "1px solid #E5E7EB", overflow: "hidden", flexShrink: 0, background: "#F9FAFB" }}>
                        {displayClaim.fraudImage
                          ? <img src={displayClaim.fraudImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Package style={{ width: "24px", height: "24px", color: "#D1D5DB" }} /></div>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayClaim.itemName}</h2>
                          <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: "3px" }}>
                            View product ↗
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "14px", marginTop: "4px", flexWrap: "wrap" }}>
                          {[
                            { label: "SKU", val: displayClaim.sku },
                            { label: "Type", val: displayClaim.claimType?.replace(/_/g, " ") },
                            { label: "User", val: displayClaim.userId },
                          ].map(m => (
                            <span key={m.label} style={{ fontSize: "11px", color: "#6B7280" }}>
                              <span style={{ color: "#374151", fontWeight: 600 }}>{m.label}:</span> {m.val}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Risk Score Box */}
                    <div style={{ textAlign: "center", flexShrink: 0, border: `2px solid ${risk.border}`, background: risk.bg, borderRadius: "10px", padding: "8px 14px", minWidth: "90px" }}>
                      <div style={{ fontSize: "28px", fontWeight: 900, color: risk.color, lineHeight: 1 }}>{displayClaim.riskScore}</div>
                      <div style={{ fontSize: "8px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>RISK SCORE</div>
                      <div style={{ marginTop: "5px" }}>
                        <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", background: risk.bg, color: risk.color, border: `1px solid ${risk.border}`, textTransform: "uppercase", letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          {actualStatus === "MANUAL_REVIEW" ? "In Review" : actualStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata pill row */}
                  <div style={{ display: "flex", gap: "20px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #F3F4F6", flexWrap: "wrap" }}>
                    {[
                      { Icon: CheckCircle, color: "#6B7280", label: "Order ID", val: displayClaim.orderId || "N/A" },
                      { Icon: CheckCircle, color: "#6B7280", label: "Return ID", val: `RET-${(displayClaim.id || "").slice(0, 8).toUpperCase()}` },
                      { Icon: CheckCircle, color: "#6B7280", label: "Return Date", val: new Date(displayClaim.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                      { Icon: AlertTriangle, color: "#CA8A04", label: "Reason", val: displayClaim.claimType === "different_product" ? "Item not as described" : "Damaged product" },
                    ].map(({ Icon, color, label, val }) => (
                      <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "5px" }}>
                        <Icon style={{ width: "12px", height: "12px", color, marginTop: "2px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                          <div style={{ fontSize: "11px", color: "#111827", fontWeight: 600 }}>{val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>

                  {/* Evidence Images */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #F3F4F6" }}>
                    {/* Customer Evidence */}
                    <div style={{ padding: "12px 16px", borderRight: "1px solid #F3F4F6" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                        <Camera style={{ width: "10px", height: "10px" }} /> Customer Evidence
                      </div>
                      <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden", background: "#F9FAFB", height: "130px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {displayClaim.fraudImage
                          ? <img src={displayClaim.fraudImage} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Customer evidence" />
                          : <div style={{ fontSize: "11px", color: "#9CA3AF" }}>No image</div>
                        }
                      </div>
                      {displayClaim.userDescription && (
                        <div style={{ marginTop: "6px" }}>
                          <div style={{ fontSize: "9px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: "2px" }}>Customer Comment</div>
                          <div style={{ fontSize: "11px", color: "#374151", fontStyle: "italic" }}>"{displayClaim.userDescription}"</div>
                        </div>
                      )}
                    </div>
                    {/* Catalog Reference */}
                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
                        <Package style={{ width: "10px", height: "10px" }} /> Catalog Reference
                      </div>
                      <div style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden", background: "#F9FAFB", height: "130px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={getSKUReferenceImage(displayClaim.sku)} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Catalog reference" />
                      </div>
                    </div>
                  </div>

                  {/* Analysis Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 190px", flex: 1 }}>

                    {/* Risk Breakdown */}
                    <div style={{ padding: "12px 16px", borderRight: "1px solid #F3F4F6" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Risk Breakdown</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                        {[
                          { label: "AI Generation Score", val: displayClaim.breakdown?.aiGenerationScore ?? 0 },
                          { label: "Photo Staging Signs", val: displayClaim.breakdown?.photoStagingSigns ?? 0 },
                          { label: "IP Rep Fraud (IPQS)", val: displayClaim.breakdown?.ipqsScore ?? 0 },
                          { label: "User Return Velocity", val: displayClaim.breakdown?.userVelocityScore ?? 0 },
                        ].map(({ label, val }) => {
                          const barColor = val > 70 ? "#DC2626" : val > 40 ? "#CA8A04" : "#16A34A";
                          return (
                            <div key={label}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#374151", marginBottom: "3px" }}>
                                <span>{label}</span>
                                <span style={{ fontWeight: 700, color: val > 70 ? "#DC2626" : val > 40 ? "#CA8A04" : "#374151" }}>{val}%</span>
                              </div>
                              <div style={{ height: "4px", background: "#F3F4F6", borderRadius: "99px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${val}%`, background: barColor, borderRadius: "99px", transition: "width 0.6s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Deduction & Reasoning */}
                    <div style={{ padding: "12px 16px", borderRight: "1px solid #F3F4F6", overflow: "hidden" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>AI Deduction & Reasoning</div>
                      <div style={{ fontSize: "12px", lineHeight: 1.55 }}>
                        <div style={{ fontWeight: 700, color: "#111827", marginBottom: "3px" }}>Reasoning Chain</div>
                        <div style={{ color: "#4B5563", fontSize: "11px" }}>
                          {(displayClaim.reasoning || "AI processed claim autonomously.").slice(0, 230)}
                          {(displayClaim.reasoning?.length ?? 0) > 230 && (
                            <span style={{ color: "#2563EB", cursor: "pointer", fontWeight: 500 }}> View full reasoning</span>
                          )}
                        </div>
                        {displayClaim.defectExplanation && (
                          <div style={{ marginTop: "7px" }}>
                            <div style={{ fontWeight: 700, color: "#111827", marginBottom: "3px" }}>Conclusion</div>
                            <div style={{ color: "#4B5563", fontSize: "11px" }}>{displayClaim.defectExplanation.slice(0, 180)}</div>
                          </div>
                        )}
                      </div>
                      {displayClaim.signals && displayClaim.signals.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Risk Signals</div>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {displayClaim.signals.map((sig: string, i: number) => (
                              <li key={i} style={{ fontSize: "11px", color: "#374151", display: "flex", alignItems: "flex-start", gap: "6px", lineHeight: 1.4 }}>
                                <CheckCircle style={{ width: "11px", height: "11px", color: "#16A34A", flexShrink: 0, marginTop: "1px" }} />
                                {sig}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Resalability */}
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Resalability</div>

                      {actualStatus === "REJECTED" ? (
                        /* Rejected: show blocked card, no resalability */
                        <div style={{ border: "1px solid #FECACA", borderRadius: "8px", background: "#FFF5F5", padding: "14px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                            <XCircle style={{ width: "36px", height: "36px", color: "#DC2626", opacity: 0.7 }} />
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#DC2626", marginBottom: "5px" }}>Return Rejected</div>
                          <div style={{ fontSize: "10px", color: "#6B7280", lineHeight: 1.5 }}>
                            This return was flagged and rejected by AI or admin. No restocking evaluation applies.
                          </div>
                        </div>
                      ) : (
                        <div style={{ border: `1px solid ${isResalable ? "#BBF7D0" : "#E5E7EB"}`, borderRadius: "8px", background: isResalable ? "#F0FAF4" : "#F9FAFB", padding: "12px", textAlign: "center" }}>
                          {/* 3D Box icon */}
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                            <svg viewBox="0 0 80 80" width="44" height="44" fill="none">
                              <path d="M40 10L70 25V55L40 70L10 55V25L40 10Z" fill={isResalable ? "#DCFCE7" : "#F3F4F6"} stroke={isResalable ? "#16A34A" : "#9CA3AF"} strokeWidth="2"/>
                              <path d="M40 10L40 40M40 40L10 25M40 40L70 25" stroke={isResalable ? "#16A34A" : "#9CA3AF"} strokeWidth="1.5" strokeDasharray="3 2"/>
                              <path d="M40 40V70" stroke={isResalable ? "#16A34A" : "#9CA3AF"} strokeWidth="1.5" strokeDasharray="3 2"/>
                            </svg>
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: isResalable ? "#16A34A" : "#1D4ED8", marginBottom: "5px" }}>
                            {isResalable ? "Resalable" : "Not Resalable"}
                          </div>
                          <div style={{ fontSize: "10px", color: "#6B7280", lineHeight: 1.6 }}>
                            {isResalable
                              ? "Item appears to be in good condition and eligible for Dark Store restocking."
                              : (() => {
                                  // Build a product-specific reason
                                  const ct = displayClaim.claimType;
                                  const isDmg = displayClaim.isDamaged;
                                  const expl = displayClaim.defectExplanation;
                                  const sigs = displayClaim.signals || [];
                                  if (expl && expl.length > 10) return expl.slice(0, 160);
                                  if (ct === "damaged_product" && isDmg) return "Physical damage or wear was detected on the returned item, making it unfit for resale.";
                                  if (ct === "damaged_product" && !isDmg) return "Item was claimed as damaged but appears undamaged — returned under incorrect claim type.";
                                  if (ct === "different_product") {
                                    const missing = sigs.find((s: string) => /missing|incomplete|one.*ear|half/i.test(s));
                                    if (missing) return "Returned item is an incomplete set (e.g. one earbud missing). Cannot be resold as a unit.";
                                    return "Returned item does not match the catalog product. Mismatch detected — item cannot be restocked.";
                                  }
                                  return "Item does not meet restocking standards based on AI analysis.";
                                })()
                            }
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* ── Action Buttons ── */}
                <div style={{ padding: "10px 16px", borderTop: "1px solid #E5E7EB", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", alignItems: "center", background: "#FFF", flexShrink: 0 }}>
                  <button
                    onClick={handleApprove}
                    style={{ padding: "11px", background: "#16A34A", color: "#FFF", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                  >
                    <CheckCircle style={{ width: "14px", height: "14px" }} />
                    {selectedClaim ? "Approve Return (Override AI)" : "Approve Return"}
                  </button>
                  <button
                    onClick={handleReject}
                    style={{ padding: "11px", background: "#DC2626", color: "#FFF", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                  >
                    <XCircle style={{ width: "14px", height: "14px" }} />
                    Reject Return & Block User
                  </button>
                  <button style={{ padding: "11px 14px", background: "#FFF", color: "#374151", border: "1px solid #E5E7EB", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}>
                    More Actions ▾
                  </button>
                </div>

              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
