"use client";

/**
 * L4Grading.tsx — Inspect Item Tab
 * ──────────────────────────────────
 * Owns: Video upload/demo, AI grading trigger, condition report card, ledger write.
 * After listing: Inline P2P eco-route simulator (Leaflet map + Shippo label).
 * API: /api/grading (POST), /api/p2p-logistics (POST)
 */

import React, { useEffect } from "react";
import {
  Camera,
  Package,
  Upload,
  Zap,
  BarChart2,
  Truck,
  CheckCircle,
  Compass,
  Leaf,
} from "lucide-react";
import { useApp } from "./AppContext";

export default function L4Grading() {
  const {
    gradingSku,
    gradingItemName,
    profileUserId,
    profileZip,
    setLedgerRecords,
    setMetrics,
    setResaleListings,
    inspectQueue,
    setInspectQueue,
    setGradingSku,
    setGradingItemName,
  } = useApp() as any;

  // ── Grading state ──
  const [gradingVideoUrl, setGradingVideoUrl] = React.useState("");
  const [gradingVideoBase64, setGradingVideoBase64] = React.useState("");
  const [gradingLoading, setGradingLoading] = React.useState(false);
  const [gradingResult, setGradingResult] = React.useState<any>(null);
  const [gradingFraudImage, setGradingFraudImage] = React.useState<string | null>(null);

  // ── Post-listing state ──
  const [listedItem, setListedItem] = React.useState<any>(null);

  // ── Inline P2P Logistics state ──
  const [buyerZip, setBuyerZip] = React.useState("98004");
  const [logisticsLoading, setLogisticsLoading] = React.useState(false);
  const [logisticsResult, setLogisticsResult] = React.useState<any>(null);
  const [labelGenerated, setLabelGenerated] = React.useState(false);

  // ── Leaflet map rendering (inline, unique id "l4-map") ──
  useEffect(() => {
    if (typeof window === "undefined" || !logisticsResult) return;
    const L = (window as any).L;
    if (!L) return;
    const mapContainer = document.getElementById("l4-map");
    if (!mapContainer) return;
    (mapContainer as any)._leaflet_id = null;
    mapContainer.innerHTML = "";
    const origin = logisticsResult.p2pRoute.origin.coords;
    const dest = logisticsResult.p2pRoute.destination.coords;
    const centralWh = logisticsResult.warehouseRoute.destination.coords;
    const map = L.map("l4-map").setView(origin, 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "© OpenStreetMap"
    }).addTo(map);
    L.marker(origin).addTo(map)
      .bindPopup(`<b>Dark Store Origin</b><br>${logisticsResult.p2pRoute.origin.label}`)
      .openPopup();
    L.marker(dest).addTo(map)
      .bindPopup(`<b>Local Buyer</b><br>${logisticsResult.p2pRoute.buyerName}<br>${logisticsResult.p2pRoute.destination.label}`);
    L.marker(centralWh).addTo(map)
      .bindPopup(`<b>Central Warehouse (avoided)</b><br>${logisticsResult.warehouseRoute.destination.label}`);
    // Green = P2P direct, Red = old warehouse route
    L.polyline([origin, dest], { color: "#10b981", weight: 4, dashArray: "6 10", opacity: 0.9 }).addTo(map);
    L.polyline([origin, centralWh], { color: "#f43f5e", weight: 2, opacity: 0.45 }).addTo(map);
    map.fitBounds(L.latLngBounds([origin, dest, centralWh]), { padding: [40, 40] });
  }, [logisticsResult]);

  // ── API: Grade product ──
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
          userId: profileUserId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGradingResult(data.report);
        setLedgerRecords((prev: any) => [data.report, ...prev]);
        setMetrics((prev: any) => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
      }
    } catch { } finally { setGradingLoading(false); }
  };

  // ── API: P2P route calculation ──
  const triggerP2PRoute = async () => {
    if (!listedItem) return;
    setLogisticsLoading(true);
    setLabelGenerated(false);
    try {
      const res = await fetch("/api/p2p-logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: listedItem.sku, returnerZip: profileZip, buyerZip }),
      });
      if (res.ok) {
        const data = await res.json();
        setLogisticsResult(data);
        setMetrics((prev: any) => ({ ...prev, p2pMatched: prev.p2pMatched + 1 }));
      }
    } catch { } finally { setLogisticsLoading(false); }
  };

  const getProductImage = (sku: string) => {
    if (sku === "CF-Mkr-99") return "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500";
    if (sku === "DENIM-JKT-001") return "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500";
    if (sku === "SPK-AIR-12") return "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500";
    if (sku === "YRDLY-GNTLMN-001") return "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500";
    return "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500";
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── TOP ROW: QUEUE + GRADING STATION ── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── LEFT COLUMN: INSPECT QUEUE ── */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">
          <div style={{display:"flex", flexDirection:"column", gap:"8px", height:"100%", background:"#FFF", padding:"16px", border:"1px solid #DDD", borderRadius:"4px"}}>
            <div style={{fontSize:"11px", fontWeight:700, color:"#565959", textTransform:"uppercase", borderBottom:"1px solid #DDD", paddingBottom:"8px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <span>Inspect Queue</span>
              <span style={{background:"#F0F8FA", color:"#007185", padding:"2px 6px", borderRadius:"12px", fontSize:"10px", border:"1px solid #007185"}}>{inspectQueue?.length || 0}</span>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
              {inspectQueue && inspectQueue.length > 0 ? inspectQueue.map((item: any) => (
                <div
                  key={item.id}
                  className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all ${gradingSku === item.sku ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
                >
                  {/* Product thumbnail from customer evidence photo */}
                  {item.fraudImage && (
                    <div className="w-full h-20 rounded-lg overflow-hidden mb-2 bg-slate-100">
                      <img src={item.fraudImage} alt={item.itemName} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="font-bold text-slate-800 truncate w-full">{item.itemName}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-[9px] text-slate-500">SKU: {item.sku}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      item.isResalable
                        ? "bg-emerald-100 text-emerald-700"
                        : item.source === "vibe"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {item.isResalable
                        ? "Resalable"
                        : item.source === "vibe"
                        ? "Vibe"
                        : item.claimType === "different_product"
                        ? "Wrong Item"
                        : "Returned"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setGradingSku(item.sku);
                      setGradingItemName(item.itemName);
                      setGradingFraudImage(item.fraudImage || null);
                      setGradingResult(null);
                      setGradingVideoUrl("");
                      setGradingVideoBase64("");
                      setListedItem(null);
                      setLogisticsResult(null);
                      setLabelGenerated(false);
                    }}
                    className={`mt-2 w-full py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                      gradingSku === item.sku
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {gradingSku === item.sku ? "✓ Inspecting" : "Inspect This Item"}
                  </button>
                </div>
              )) : (
                <div className="text-[10px] text-slate-400 text-center py-6 italic">Queue is empty</div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: GRADING STATION ── */}
        <div style={{display:"flex", flexDirection:"column", gap:"20px", flex:1, minWidth:0, background:"#FFF", padding:"20px", border:"1px solid #DDD", borderRadius:"4px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
            <h2 style={{fontSize:"24px", fontWeight:400, color:"#0F1111"}}>Inspect Item — Condition Grader</h2>
            <span style={{fontSize:"12px", background:"#C7511F", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>AI Grade</span>
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

              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {gradingSku ? (
                    // Priority: customer's evidence photo > catalog image
                    <img
                      src={gradingFraudImage || getProductImage(gradingSku)}
                      alt={gradingItemName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-1">Product Context</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">SKU</span>
                      <span className="text-[10px] font-mono text-slate-800 font-medium truncate">{gradingSku || "None"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">User</span>
                      <span className="text-[10px] text-slate-800 font-medium truncate">{profileUserId || "None"}</span>
                    </div>
                    <div className="col-span-2 text-xs font-medium text-slate-700 truncate" title={gradingItemName}>
                      {gradingItemName}
                    </div>
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
                    <div className={`text-2xl font-extrabold px-3.5 py-1.5 rounded-xl border-2 font-mono ${
                      gradingResult.grade === "A" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                      gradingResult.grade === "B" ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                      gradingResult.grade === "C" ? "bg-amber-50 border-amber-200 text-amber-700" :
                      "bg-rose-50 border-rose-200 text-rose-700"
                    }`}>
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

                  <button
                    className="btn btn-success w-full py-2 text-xs font-bold"
                    onClick={() => {
                      const grade: string = gradingResult.grade ?? "D";
                      const gradeUpper = grade.toUpperCase();

                      if (gradeUpper === "D" || gradeUpper === "F") {
                        setInspectQueue((prev: any[]) => prev.filter((q: any) => q.sku !== gradingSku));
                        setGradingResult(null);
                        setGradingVideoUrl("");
                        setGradingVideoBase64("");
                        return;
                      }

                      const isReturnedProduct = gradeUpper !== "A";
                      setResaleListings((prev: any[]) => {
                        if (prev.some((r: any) => r.sku === gradingSku)) return prev;
                        return [
                          ...prev,
                          {
                            sku: gradingSku,
                            name: gradingItemName,
                            price: parseFloat((gradingResult.price ?? 29.99).toFixed(2)),
                            originalPrice: parseFloat((gradingResult.price ?? 29.99).toFixed(2)),
                            brand: gradingResult.brand ?? "Returned Item",
                            grade: gradeUpper,
                            co2Saved: gradeUpper === "A" ? 4 : gradeUpper === "B" ? 6 : 8,
                            distance: "2.1 km",
                            trust: gradeUpper === "A" ? 96 : gradeUpper === "B" ? 84 : 72,
                            addedToStoreAt: Date.now(),
                            isReturnedProduct,
                          },
                        ];
                      });

                      setInspectQueue((prev: any[]) => prev.filter((q: any) => q.sku !== gradingSku));
                      setListedItem({ sku: gradingSku, name: gradingItemName, grade: gradeUpper });
                      setLogisticsResult(null);
                      setLabelGenerated(false);
                      setGradingResult(null);
                      setGradingVideoUrl("");
                      setGradingVideoBase64("");
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    {gradingResult.grade === "D" || gradingResult.grade === "F"
                      ? "Flag: Poor Quality → Deep Warehouse"
                      : `List in Dark Store (Grade ${gradingResult.grade})`}
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
      </div>

      {/* ── POST-LISTING: SUCCESS + INLINE P2P MAP ── */}
      {listedItem && (
        <div className="glass-card border-2 border-emerald-200 bg-emerald-50/40 flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-extrabold text-emerald-800 text-sm">Listed to Dark Store Marketplace!</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">
                <span className="font-mono font-bold">{listedItem.name}</span> · Grade{" "}
                <span className={`font-extrabold ${listedItem.grade === "A" ? "text-emerald-700" : listedItem.grade === "B" ? "text-indigo-700" : "text-amber-700"}`}>
                  {listedItem.grade}
                </span>{" "}
                · Now visible in Pre-Loved Marketplace
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-emerald-100 rounded-xl p-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
              <div className="text-xs font-bold text-emerald-700 mt-0.5">🟢 Live</div>
            </div>
            <div className="bg-white border border-emerald-100 rounded-xl p-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Grade</div>
              <div className="text-xs font-extrabold text-indigo-700 font-mono mt-0.5">{listedItem.grade}</div>
            </div>
            <div className="bg-white border border-emerald-100 rounded-xl p-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Radius</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">100 km</div>
            </div>
          </div>

          {/* P2P Eco-Route Section */}
          <div className="border-t border-emerald-200 pt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-700" />
              <div className="text-[11px] text-emerald-800 font-extrabold uppercase tracking-wider">Pre-Assign P2P Eco-Shipping Route</div>
            </div>
            <p className="text-[11px] text-slate-600">
              Configure the direct local dispatch route now. When a buyer purchases this item, the Dark Store ships P2P — bypassing the central warehouse entirely and saving up to 62% CO₂.
            </p>

            {/* ZIP inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Dark Store ZIP (Origin)</label>
                <input type="text" value={profileZip} disabled className="bg-slate-100 cursor-not-allowed text-xs w-full border border-slate-200 rounded-lg px-2 py-1.5" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Nearest Buyer ZIP</label>
                <input
                  type="text"
                  value={buyerZip}
                  onChange={e => setBuyerZip(e.target.value)}
                  placeholder="98004"
                  className="text-xs w-full border border-slate-200 rounded-lg px-2 py-1.5"
                />
              </div>
            </div>

            <button
              className="btn btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              onClick={triggerP2PRoute}
              disabled={logisticsLoading}
            >
              {logisticsLoading
                ? <><span className="spinner" /> Calculating eco-route...</>
                : <><Compass className="w-4 h-4" /> Calculate P2P Eco-Route</>}
            </button>

            {/* Inline Leaflet map + stats */}
            {logisticsResult && (
              <div className="flex flex-col gap-3">
                {/* Map */}
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: "260px" }}>
                  <div id="l4-map" style={{ height: "100%", width: "100%" }} />
                </div>

                {/* Route comparison cards */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                    <div className="font-bold text-emerald-700 mb-1.5 flex items-center gap-1">
                      <Leaf className="w-3 h-3" /> P2P Direct Route
                    </div>
                    <div className="text-emerald-700">📍 {logisticsResult.p2pRoute.distance}</div>
                    <div className="text-emerald-700">💵 {logisticsResult.p2pRoute.cost}</div>
                    <div className="text-emerald-700">🌱 {logisticsResult.p2pRoute.co2}</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl">
                    <div className="font-bold text-rose-700 mb-1.5">🔴 Central Warehouse</div>
                    <div className="text-rose-700">📍 {logisticsResult.warehouseRoute.distance}</div>
                    <div className="text-rose-700">💵 {logisticsResult.warehouseRoute.cost}</div>
                    <div className="text-rose-700">🌱 {logisticsResult.warehouseRoute.co2}</div>
                  </div>
                </div>

                {/* CO2 savings highlight */}
                <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-3 text-center">
                  <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">CO₂ Saved by P2P</div>
                  <div className="text-2xl font-extrabold text-emerald-700 font-mono">{logisticsResult.co2Savings}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">vs traditional central warehouse routing</div>
                </div>

                {/* Shippo label */}
                {labelGenerated ? (
                  <div className="bg-white p-3 rounded-xl border-2 border-black flex flex-col items-center gap-1 font-mono text-black text-[9px] shadow-sm">
                    <div className="font-bold text-[10px] tracking-wider">RELOOP DIRECT P2P DISPATCH</div>
                    <div className="border-y border-black w-full text-center py-1 my-0.5 text-[10px]">
                      SHIP TO: {logisticsResult.p2pRoute.buyerName} — {buyerZip}
                    </div>
                    <div className="font-bold text-sm tracking-widest">{logisticsResult.label?.trackingNumber || "1Z999AA1012345678"}</div>
                    <svg className="w-44 h-7 mt-1" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100" height="20" fill="white" />
                      {[5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56,59,62,65,68,71,74,77,80,83,86,89,92].map((x, i) => (
                        <rect key={x} x={x} y="2" width={i % 3 === 0 ? 3 : 1} height="16" fill="black" />
                      ))}
                    </svg>
                    <div className="text-[8px] text-slate-500 mt-1">Generated via Shippo API • ReLoop Dark Store Network</div>
                  </div>
                ) : (
                  <button className="btn btn-success w-full py-2 text-xs font-bold" onClick={() => setLabelGenerated(true)}>
                    <Truck className="w-4 h-4" /> Generate Shippo Dispatch Label
                  </button>
                )}
              </div>
            )}

            <button
              className={`btn w-full py-2.5 text-xs font-bold ${labelGenerated ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setListedItem(null); setLogisticsResult(null); setLabelGenerated(false); }}
            >
              {labelGenerated ? "Dispatch P2P Item & Grade Next" : "Grade Next Item"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
