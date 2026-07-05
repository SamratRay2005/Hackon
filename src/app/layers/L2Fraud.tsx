"use client";

/**
 * L2Fraud.tsx — Verify Return Tab
 * ──────────────────────────────────
 * Owns: Fraud claim upload, fraud analysis, risk evaluation dashboard.
 * API: /api/risk-mitigation (POST)
 */

import React from "react";
import {
  Shield,
  Camera,
  Package,
  AlertTriangle,
  ImageIcon,
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
    fraudItemName,
    profileUserId,
    profileEmail,
    profileIp,
    profilePriorReturns,
    setMetrics,
    fraudClaimType: claimType,
    setFraudClaimType: setClaimType,
    setActiveTab,
  } = useApp() as any;

  const [fraudLoading, setFraudLoading] = React.useState(false);
  const [fraudResult, setFraudResult] = React.useState<any>(null);
  const [fraudImageName, setFraudImageName] = React.useState("uploaded_claim_evidence.jpg");
  const [fraudDemoCycle, setFraudDemoCycle] = React.useState(0);
  const [isDamageVisible, setIsDamageVisible] = React.useState<boolean | null>(null);
  const [nonVisibleCategory, setNonVisibleCategory] = React.useState<"electronics" | "apparel" | "other">("electronics");
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

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
          isDamageVisible,
          nonVisibleCategory,
          questionnaireAnswers: answers
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFraudResult(data);
        if (data.recommendedAction === "BLOCK") setMetrics((prev: any) => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 }));
      }
    } catch { } finally { setFraudLoading(false); }
  };

  const handleFraudDemoClick = () => {
    const samples = [
      { img: svgToDataUrl(MOCK_DAMAGE_SVG), name: "sample_genuine_claim.svg" },
      { img: svgToDataUrl(MOCK_FRAUD_SUSPICIOUS_SVG), name: "sample_staged_claim.svg" },
      { img: svgToDataUrl(MOCK_DAMAGE_SVG), name: "sample_item_close_up.svg" }
    ];
    const index = fraudDemoCycle % samples.length;
    setFraudImage(samples[index].img);
    setFraudImageName(samples[index].name);
    setFraudDemoCycle(prev => prev + 1);
    setFraudResult(null);
  };

  return (
    <div className="glass-card flex flex-col gap-5">
      <div className="section-title-bar">
        <h2>Verify Return — Authenticity Scanner</h2>
        <span className="section-badge badge-layer-2">AI Scan</span>
      </div>

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-3.5 rounded-xl flex items-start gap-2.5 shadow-md">
        <Shield className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">Back-Office Returns Security Console</div>
          <div className="text-xs text-slate-300 font-medium leading-relaxed">
            AI vision models scan claim photos against product catalog for staging artifacts, shadow inconsistencies, and IP reputation. Risk decisions in under 2 seconds.
          </div>
        </div>
      </div>

      {/* Claim Type Selector Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-[360px] shadow-sm">
        <button
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            claimType === "damaged_product"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => { setClaimType("damaged_product"); setIsDamageVisible(null); setAnswers({}); setFraudResult(null); }}
        >
          Damaged Product Check
        </button>
        <button
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            claimType === "different_product"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
          onClick={() => { setClaimType("different_product"); setIsDamageVisible(null); setAnswers({}); setFraudResult(null); }}
        >
          Different Product Check
        </button>
      </div>

      {/* Split Panel: Customer Claim vs Catalog Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Claim Photo */}
        <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-3">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-400" /> Customer-Submitted Evidence Photo
            </span>
            {fraudImage && (
              <span className="text-[9px] font-mono text-slate-400 truncate max-w-[150px]" title={fraudImageName}>
                {fraudImageName}
              </span>
            )}
          </div>

          {claimType === "damaged_product" && isDamageVisible === null ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 shadow-sm my-auto min-h-[220px] justify-center">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-800 block mb-1">Is the product damage clearly visible?</span>
                <span className="text-[10px] text-slate-400">Specify if the claim involves external physical damage or internal functional failure.</span>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="btn btn-secondary py-2.5 text-xs font-bold w-full border border-slate-300 hover:bg-slate-50 text-slate-700"
                  onClick={() => { setIsDamageVisible(true); setFraudResult(null); }}
                >
                  Yes, clearly visible (cracks, tears, etc.)
                </button>
                <button
                  className="btn btn-secondary py-2.5 text-xs font-bold w-full border border-slate-300 hover:bg-slate-50 text-slate-700"
                  onClick={() => { setIsDamageVisible(false); setFraudResult(null); setAnswers({}); }}
                >
                  No, it's not visible (internal defect)
                </button>
              </div>
            </div>
          ) : claimType === "damaged_product" && isDamageVisible === false && !answers._completed ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 shadow-sm my-auto min-h-[220px] justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800">Diagnostic Intake</span>
                  <button
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                    onClick={() => { setIsDamageVisible(null); }}
                  >
                    ← Back
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  {/* Category Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Product Category</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      {(["electronics", "apparel", "other"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`flex-1 text-center py-1 text-[10px] font-bold capitalize rounded-md transition-all ${
                            nonVisibleCategory === cat
                              ? "bg-white text-slate-800 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                          onClick={() => { setNonVisibleCategory(cat); setAnswers({}); }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diagnostic Questions */}
                  {nonVisibleCategory === "electronics" && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Does the device power on?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.powerOn === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, powerOn: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Are there warning codes/indicators?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.errorWarning === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, errorWarning: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Is there an internal loose rattle?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.internalNoise === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, internalNoise: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {nonVisibleCategory === "apparel" && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Is it a size/fit issue?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.sizingMismatch === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, sizingMismatch: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Are seams, zippers or tags defective?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.stitchingBroken === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, stitchingBroken: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {nonVisibleCategory === "other" && (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Does it fail core functions?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.functionalFailure === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, functionalFailure: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">Are critical accessories missing?</span>
                        <div className="flex gap-1.5">
                          {(["Yes", "No"] as const).map(opt => (
                            <button
                              key={opt}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border ${answers.missingAccessory === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600"}`}
                              onClick={() => setAnswers(prev => ({ ...prev, missingAccessory: opt }))}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary py-2 text-xs font-bold w-full mt-4"
                onClick={() => setAnswers(prev => ({ ...prev, _completed: "true" }))}
              >
                Proceed to Photo Verification
              </button>
            </div>
          ) : (
            <>
              {/* Reset intake options back button */}
              {claimType === "damaged_product" && (
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Diagnostic Mode: {isDamageVisible ? "Visible Damage Scan" : `Non-Visible / Functional ${nonVisibleCategory} Scan`}
                  </span>
                  <button
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                    onClick={() => {
                      setIsDamageVisible(null);
                      setAnswers({});
                      setFraudImage(null);
                      setFraudResult(null);
                    }}
                  >
                    Reset Diagnostic Questions
                  </button>
                </div>
              )}

              {isDamageVisible === false && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-2.5 text-[10px] text-sky-700 font-semibold leading-relaxed flex items-start gap-1.5">
                  <span>💡</span>
                  <span>
                    Note: Since the defect is functional or internal, please upload a photo of the product showing the barcode, brand logo, or serial number label. We will verify that the correct item matches the catalog reference.
                  </span>
                </div>
              )}

              <div className="relative aspect-video w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                {fraudImage ? (
                  <img src={fraudImage} className="w-full h-full object-contain" alt="Customer evidence photo" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-500">No Claim Photo Loaded</span>
                    <span className="text-[10px] text-slate-400">Use camera, upload, or load a sample below</span>
                  </div>
                )}
              </div>

              <div className="mt-1">
                <WebcamCapture
                  onCapture={(base64: string) => {
                    setFraudImage(base64);
                    setFraudImageName("uploaded_claim_evidence.jpg");
                    setFraudResult(null);
                  }}
                  overlayType="damage"
                />
              </div>

              <button
                className="btn btn-secondary w-full py-2 text-xs font-bold"
                onClick={handleFraudDemoClick}
              >
                Load Sample Claim #{(fraudDemoCycle % 3) + 1}
              </button>
            </>
          )}
        </div>

        {/* Right: Catalog Reference */}
        <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-3">
          <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" /> Original Product Reference (Catalog)
            </span>
            <span className="mini-badge info text-[9px] font-mono font-bold">SKU: {fraudSku}</span>
          </div>

          <div className="relative aspect-video w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
            <img
              src={getSKUReferenceImage(fraudSku)}
              className="w-full h-full object-contain"
              alt={`Original product catalog for SKU ${fraudSku}`}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Product Catalog Title</span>
            <span className="text-xs font-bold text-slate-800">{fraudItemName}</span>
          </div>
        </div>
      </div>

      {/* Claim Evaluation Console */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        {/* Column 1: Metadata + Run Button */}
        <div className="md:col-span-1 bg-slate-50/60 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 justify-between">
          <div>
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Claim Intake Metadata</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Claim Product", value: fraudItemName },
                { label: "Claim SKU", value: fraudSku },
                { label: "Analyst ID", value: "T1-RETAIL-AUDIT" },
                { label: "Claimant User", value: profileUserId },
                { label: "Prior Return Count", value: String(profilePriorReturns) },
                { label: "Claim Network IP", value: profileIp },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-1.5 text-xs last:border-0">
                  <span className="text-slate-400 font-medium">{label}:</span>
                  <span className="font-bold text-slate-700 truncate max-w-[120px] font-mono" title={value}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary w-full py-2.5 font-bold text-xs mt-2"
            disabled={!fraudImage || fraudLoading}
            onClick={triggerFraudCheck}
          >
            {fraudLoading ? (
              <><span className="spinner" /> Performing Fraud Audit...</>
            ) : (
              <><Shield className="w-4 h-4" /> Run Fraud Analysis</>
            )}
          </button>
        </div>

        {/* Column 2 & 3: Results */}
        <div className="md:col-span-2 border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Risk Evaluation Dashboard</h3>

          {fraudLoading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10 gap-3">
              <div className="spinner w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500 font-medium animate-pulse">Running advanced pixel &amp; metadata auditing patterns...</span>
            </div>
          ) : fraudResult ? (
            <div className="flex flex-col gap-4 flex-1">
              {fraudResult.shouldRetake === true ? (
                <div className="flex flex-col gap-3 flex-1 justify-center">
                  <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl flex items-start gap-3 text-rose-700 shadow-sm">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-sm text-rose-800">Verification Failure — Photo Retake Required</div>
                      <div className="text-xs font-semibold leading-relaxed mt-1">
                        ⚠️ {fraudResult.retakeReason || "The submitted photo does not match the claim context. Please capture another image."}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-2">
                    <button className="btn btn-primary flex-1 py-2 text-xs font-bold" onClick={() => { setFraudImage(null); setFraudResult(null); }}>
                      Take Photo Again
                    </button>
                    <button className="btn btn-danger flex-1 py-2 text-xs font-bold" onClick={() => { alert("Claim escalated to Tier 2."); setFraudResult(null); }}>
                      Escalate to Tier 2
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 justify-between flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-black px-4 py-2 rounded-xl border-2 font-mono flex-shrink-0 ${fraudResult.riskScore > 70
                        ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                        : fraudResult.riskScore > 40
                          ? "bg-amber-50 border-amber-200 text-amber-600 shadow-sm"
                          : "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
                        }`}>
                        {fraudResult.riskScore}
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Fraud Risk Index</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">Range 0–100</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 sm:gap-6">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Analyst Verdict</span>
                        {fraudResult.riskScore > 70 ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 border border-rose-200 text-rose-800 text-xs font-extrabold px-3 py-1.5 rounded-full">🔴 High Suspicion — Block &amp; Escalate</span>
                        ) : fraudResult.riskScore > 40 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-extrabold px-3 py-1.5 rounded-full">🟡 Moderate Risk — Flag for Review</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold px-3 py-1.5 rounded-full">🟢 Genuine Claim — Approve Return</span>
                        )}
                      </div>

                      {claimType === "damaged_product" && (
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Damage Check</span>
                          {fraudResult.isDamageVisible === false && fraudResult.isDamaged ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-extrabold px-3 py-1.5 rounded-full">⚙️ Functional Defect (Internal)</span>
                          ) : fraudResult.isDamaged ? (
                            <span className="inline-flex items-center gap-1 bg-rose-100 border border-rose-200 text-rose-800 text-xs font-extrabold px-3 py-1.5 rounded-full">💥 Damage Detected</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-teal-100 border border-teal-200 text-teal-850 text-xs font-extrabold px-3 py-1.5 rounded-full">✨ No Damage Detected</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {fraudResult.breakdown && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-y border-slate-100 py-3">
                      {[
                        { label: "AI Image Generation Score", val: fraudResult.breakdown.aiGenerationScore },
                        { label: "Photo Staging Signs Index", val: fraudResult.breakdown.photoStagingSigns },
                        { label: "IP Rep Fraud Score (IPQS)", val: fraudResult.breakdown.ipqsScore },
                        { label: "User Return Velocity Index", val: fraudResult.breakdown.userVelocityScore },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col gap-1.5">
                          <div className="flex justify-between font-semibold text-slate-500 text-[10px] uppercase">
                            <span>{label}</span>
                            <span className="font-extrabold text-slate-800">{val}%</span>
                          </div>
                          <div className="progress-bar-container" style={{ height: "4px" }}>
                            <div className="progress-bar-fill" style={{ width: `${val}%`, background: val > 70 ? "linear-gradient(90deg,#dc2626,#ef4444)" : val > 40 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#059669,#10b981)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {fraudResult.signals && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">AI Signal Analysis</div>
                      <ul className="flex flex-col gap-1">
                        {fraudResult.signals.map((sig: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-indigo-400 mt-0.5">›</span> {sig}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* TODO: REMOVE THIS LATER - AI CoT REASONING BLOCK */}
                  {fraudResult.reasoning && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mt-2">
                      <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        🧠 Chain of Thought Reasoning
                      </div>
                      <div className="text-xs text-yellow-900 leading-relaxed italic">
                        "{fraudResult.reasoning}"
                      </div>
                    </div>
                  )}

                  {/* Admin Shortcut for Jury Demo */}
                  {fraudResult.riskScore <= 70 && (
                    <button
                      className="btn btn-secondary w-full py-2.5 mt-2 text-[11px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm"
                      onClick={() => setActiveTab("inspect")}
                    >
                      Admin: Process in Warehouse ➡
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state-card flex-1 mt-2">
              <Shield className="icon" />
              <div className="text">Load a claim photo on the left and click "Run Fraud Analysis" to evaluate authenticity.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
