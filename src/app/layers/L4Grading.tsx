"use client";

/**
 * L4Grading.tsx — Inspect Item Tab
 * ──────────────────────────────────
 * Owns: Video upload/demo, AI grading trigger, condition report card, ledger write.
 * API: /api/grading (POST)
 */

import React from "react";
import {
  Camera,
  Package,
  Upload,
  Zap,
  BarChart2,
  Truck,
} from "lucide-react";
import { useApp } from "./AppContext";

export default function L4Grading() {
  const {
    gradingSku,
    gradingItemName,
    profileUserId,
    setActiveTab,
    setLedgerRecords,
    setMetrics,
  } = useApp();

  const [gradingVideoUrl, setGradingVideoUrl] = React.useState("");
  const [gradingVideoBase64, setGradingVideoBase64] = React.useState("");
  const [gradingLoading, setGradingLoading] = React.useState(false);
  const [gradingResult, setGradingResult] = React.useState<any>(null);

  const triggerWarehouseGrading = async () => {
    if (!gradingVideoUrl && !gradingVideoBase64) return;
    setGradingLoading(true);
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video: gradingVideoBase64 || undefined,
          videoUrl: gradingVideoUrl.startsWith("blob:") ? undefined : gradingVideoUrl || undefined,
          sku: gradingSku,
          itemName: gradingItemName,
          userId: profileUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGradingResult(data.report);
        setLedgerRecords((prev: any) => [data.report, ...prev]);
        setMetrics((prev: any) => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
      }
    } catch { } finally { setGradingLoading(false); }
  };

  return (
    <div className="glass-card flex flex-col gap-5">
      <div className="section-title-bar">
        <h2>Inspect Item — Condition Grader</h2>
        <span className="section-badge badge-layer-4">AI Grade</span>
      </div>

      <div className="warning-callout">
        <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Upload a 360° rotation video of the returned product. Our vision AI extracts keyframes, identifies defects, assigns a resale grade (A–D), and writes an immutable ledger block with a SHA-256 hash.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload column */}
        <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-3">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Product Inspection Video
          </div>

          <div className="flex gap-2">
            <label className="btn btn-secondary flex-1 py-2 text-[11px] font-bold text-center cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Upload Video
              <input type="file" accept="video/*" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setGradingVideoUrl(URL.createObjectURL(file));
                  const reader = new FileReader();
                  reader.onloadend = () => { if (reader.result) setGradingVideoBase64(reader.result as string); };
                  reader.readAsDataURL(file);
                }
              }} className="hidden" />
            </label>
            <button
              className="btn btn-secondary flex-1 py-2 text-[11px] font-bold"
              onClick={() => { setGradingVideoUrl("/demo_return.mp4"); setGradingVideoBase64(""); }}
            >
              <Zap className="w-3.5 h-3.5" /> Load Demo Video
            </button>
          </div>

          {gradingVideoUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black shadow-sm">
              <video src={gradingVideoUrl} controls autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300">
              <Camera className="w-10 h-10" />
              <span className="text-xs font-medium">No video loaded</span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-3">
            <div className="font-bold text-slate-600 mb-2 text-[10px] uppercase tracking-wider">Product Context</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">SKU</span>
                <span className="text-xs font-mono text-slate-800 font-medium">{gradingSku}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">User</span>
                <span className="text-xs text-slate-800 font-medium">{profileUserId}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Product</span>
                <span className="text-xs text-slate-800 font-medium truncate" title={gradingItemName}>{gradingItemName}</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary w-full py-2.5 font-bold text-xs mt-1"
            disabled={(!gradingVideoUrl && !gradingVideoBase64) || gradingLoading}
            onClick={triggerWarehouseGrading}
          >
            {gradingLoading ? <><span className="spinner" /> Extracting keyframes &amp; grading...</> : <><BarChart2 className="w-4 h-4" /> Grade Product Condition</>}
          </button>
        </div>

        {/* Result column */}
        <div className="border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Condition Report Card</div>
          {gradingResult ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{gradingResult.itemName}</h4>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">SKU: {gradingResult.sku}</span>
                </div>
                <div className={`text-2xl font-extrabold px-3.5 py-1.5 rounded-xl border-2 font-mono ${gradingResult.grade === "A" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : gradingResult.grade === "B" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : gradingResult.grade === "C" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                  {gradingResult.grade}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs border-y border-slate-100 py-3">
                {[
                  { label: "Variant Check", value: gradingResult.isCorrectVariant ? "✓ MATCHED" : "✗ MISMATCH", colored: true },
                  { label: "Defects Found", value: gradingResult.defects?.join(", ") || "None", colored: false },
                  { label: "Resale Channel", value: gradingResult.resaleCategory, colored: false },
                  { label: "Functional Score", value: `${gradingResult.functionalScore}/10`, colored: false },
                ].map(({ label, value, colored }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500">{label}:</span>
                    <span className={`font-bold text-right text-slate-800 ${colored && value.startsWith("✓") ? "text-emerald-600" : colored && value.startsWith("✗") ? "text-rose-600" : ""}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Ledger Block SHA-256</div>
                <div className="font-mono text-[9px] text-indigo-700 break-all leading-relaxed">{gradingResult.hash}</div>
              </div>

              <button className="btn btn-success w-full py-2 text-xs font-bold" onClick={() => setActiveTab("logistics")}>
                <Truck className="w-4 h-4" /> Route to L5 P2P Logistics
              </button>
            </div>
          ) : (
            <div className="empty-state-card flex-1 mt-2">
              <Package className="icon" />
              <div className="text">Load a video and run grading to see the condition report here.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
