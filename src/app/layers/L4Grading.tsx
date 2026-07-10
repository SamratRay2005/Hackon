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
import { useApp, getSKUReferenceImage } from "./AppContext";

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
    gradingQueueId,
    setGradingQueueId,
    walletInfo,
    setWalletInfo,
    setActiveTab,
    setLogisticsSku,
  } = useApp() as any;

  // ── Grading state ──
  const [gradingVideoUrl, setGradingVideoUrl] = React.useState("");
  const [gradingVideoBase64, setGradingVideoBase64] = React.useState("");
  const [gradingLoading, setGradingLoading] = React.useState(false);
  const [gradingResult, setGradingResult] = React.useState<any>(null);
  const [gradingFraudImage, setGradingFraudImage] = React.useState<string | null>(null);
  const [gradingReasoning, setGradingReasoning] = React.useState<string>("");
  const [gradingVariantNotes, setGradingVariantNotes] = React.useState<string>("");
  // Graded history stored locally for admin filter view
  const [gradedHistory, setGradedHistory] = React.useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("reloop_graded_history") || "[]"); } catch { return []; }
  });
  const [historyFilter, setHistoryFilter] = React.useState<string>("ALL");

  // ── Post-listing state ──
  const [listedItem, setListedItem] = React.useState<any>(null);
  const [scrappedItem, setScrappedItem] = React.useState<any>(null);

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

  // Persist graded history
  React.useEffect(() => {
    try { localStorage.setItem("reloop_graded_history", JSON.stringify(gradedHistory)); } catch { }
  }, [gradedHistory]);

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
          // If this item came through Verify Return, pass the customer's evidence photo
          // as the reference. The fraud check already confirmed it's the correct product,
          // so we compare the physical arrival against what the customer claimed to send.
          evidenceImage: gradingFraudImage || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();

        // Grab the original claim info from the queue to know if it was a "different product"
        const currentItem = inspectQueue?.find((q: any) => q.sku === gradingSku);
        const enhancedReport = {
          ...data.report,
          claimType: currentItem?.claimType
        };

        setGradingResult(enhancedReport);
        setGradingReasoning(data.reasoning || "");
        setGradingVariantNotes(data.variantNotes || "");
        setLedgerRecords((prev: any) => [enhancedReport, ...prev]);
        setMetrics((prev: any) => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));

        // Add to persistent graded history for admin view
        setGradedHistory((prev: any[]) => [{
          ...enhancedReport,
          reasoning: data.reasoning || "",
          variantNotes: data.variantNotes || "",
          gradedAt: new Date().toISOString(),
        }, ...prev]);

        // Remove from inspect queue immediately once graded
        setInspectQueue((prev: any[]) => prev.filter((q: any) => q.sku !== gradingSku));
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


  // ── API: P2P route calculation ──


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#F5F5F5", minHeight: "100vh" }}>

      {/* ── TOP: Inspect Queue + Grading Station ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, flex: 1, minHeight: 0 }}>

        {/* ── LEFT SIDEBAR: INSPECT QUEUE ── */}
        <div style={{ background: "#FFF", borderRight: "1px solid #DDD", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Header */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #E8E8E8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inspect Queue</span>
            <span style={{ background: "#F0F8FA", color: "#007185", fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "12px", border: "1px solid #007185" }}>
              {inspectQueue?.length || 0}
            </span>
          </div>

          {/* Queue Tabs rendered inside IIFE to keep useState local */}
          {(() => {
            const [queueTab, setQueueTab] = React.useState<"evidence" | "direct">("evidence");
            const evidenceItems = (inspectQueue || []).filter((i: any) => i.source === "fraud");
            const directItems = (inspectQueue || []).filter((i: any) => i.source === "vibe");

            const renderItem = (item: any) => {
              const itemKey = item.id || item.orderId || item.sku;
              return (
              <div key={itemKey} style={{ borderBottom: "1px solid #F0F2F2" }}>
                <div style={{
                  padding: "12px", cursor: "pointer",
                  background: gradingQueueId === itemKey ? "#FFF8E7" : "#FFF",
                  borderLeft: gradingQueueId === itemKey ? "3px solid #FF9900" : "3px solid transparent",
                  transition: "all 0.15s"
                }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    {/* Thumbnail */}
                    <div style={{ width: "44px", height: "44px", borderRadius: "6px", border: "1px solid #DDD", overflow: "hidden", flexShrink: 0, background: "#F7F8F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={item.fraudImage || getSKUReferenceImage(item.sku)} alt={item.itemName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.itemName}</div>
                      <div style={{ fontSize: "10px", color: "#565959", marginTop: "2px" }}>SKU: {item.sku}</div>
                      <div style={{ fontSize: "10px", color: "#8D9098" }}>
                        {new Date(item.timestamp || Date.now()).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {/* Badge */}
                    <div style={{ flexShrink: 0 }}>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                        background: item.isResalable ? "#F0FAF4" : "#FFF8E7",
                        color: item.isResalable ? "#067D62" : "#C7511F",
                        border: `1px solid ${item.isResalable ? "#84C2A6" : "#FCD200"}`
                      }}>
                        {item.isResalable ? "✓ Resalable" : item.claimType === "different_product" ? "Wrong Item" : "Returned"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setGradingQueueId(itemKey);
                      setGradingSku(item.sku);
                      setGradingItemName(item.itemName);
                      setGradingFraudImage(item.fraudImage || null);
                      setGradingResult(null);
                      setGradingVideoUrl("");
                      setGradingVideoBase64("");
                      setListedItem(null);
                      setScrappedItem(null);
                      setLogisticsResult(null);
                      setLabelGenerated(false);
                    }}
                    style={{
                      marginTop: "8px", width: "100%", padding: "6px",
                      background: gradingQueueId === itemKey ? "#FF9900" : "#FFF",
                      color: gradingQueueId === itemKey ? "#0F1111" : "#007185",
                      border: gradingQueueId === itemKey ? "1px solid #e88c01" : "1px solid #007185",
                      borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    {gradingQueueId === itemKey ? "✓ Inspecting" : "INSPECT THIS ITEM"}
                  </button>
                </div>
              </div>
            );
            };

            return (
              <>
                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "1px solid #DDD" }}>
                  {([
                    { id: "evidence" as const, label: "With Evidence", count: evidenceItems.length },
                    { id: "direct" as const, label: "Direct Return", count: directItems.length },
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setQueueTab(tab.id)}
                      style={{
                        flex: 1, padding: "9px 4px", fontSize: "11px", fontWeight: 700,
                        border: "none", background: "transparent", cursor: "pointer",
                        color: queueTab === tab.id ? "#0F1111" : "#565959",
                        borderBottom: queueTab === tab.id ? "2px solid #FF9900" : "2px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "5px"
                      }}
                    >
                      {tab.label}
                      <span style={{ background: "#F0F2F2", color: "#565959", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "99px" }}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Description */}
                <div style={{ padding: "6px 12px", background: "#FAFAFA", borderBottom: "1px solid #F0F2F2" }}>
                  <p style={{ fontSize: "10px", color: "#8D9098", margin: 0, lineHeight: 1.4 }}>
                    {queueTab === "evidence"
                      ? "Customer submitted a photo via Verify Return. Compare video against their evidence."
                      : "Customer returned directly (vibe mismatch). Use catalog image as sole reference."}
                  </p>
                </div>
                {/* Items */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {(queueTab === "evidence" ? evidenceItems : directItems).length > 0
                    ? (queueTab === "evidence" ? evidenceItems : directItems).map(renderItem)
                    : (
                      <div style={{ textAlign: "center", padding: "40px 16px", color: "#8D9098" }}>
                        <Package style={{ width: "28px", height: "28px", margin: "0 auto 8px", opacity: 0.25 }} />
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>No items in this queue.</div>
                        <div style={{ fontSize: "11px", marginTop: "4px" }}>Submit a return to see items here.</div>
                      </div>
                    )
                  }
                </div>
              </>
            );
          })()}
        </div>

        {/* ── RIGHT: GRADING STATION ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "#FFF", overflow: "hidden" }}>

          {/* Station Header */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #E8E8E8", display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#0F1111", margin: 0 }}>Inspect Item — Condition Grader</h1>
            <span style={{ fontSize: "10px", background: "#C7511F", color: "#FFF", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>AI Grade</span>
          </div>

          {/* Info banner */}
          <div style={{ margin: "12px 20px 0", background: "#FFF8F0", border: "1px solid #F5CBA7", borderRadius: "4px", padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <Camera style={{ width: "14px", height: "14px", color: "#C7511F", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "12px", color: "#0F1111", margin: 0, lineHeight: 1.5 }}>
              Upload a 360° rotation video of the returned product. Our vision AI extracts keyframes, identifies defects, assigns a resale grade (A–D), and writes an immutable ledger block with a SHA-256 hash.
            </p>
          </div>

          {/* Two-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", flex: 1, margin: "12px 20px 0", border: "1px solid #DDD", borderRadius: "4px", overflow: "hidden", background: "#DDD" }}>

            {/* LEFT: Upload column */}
            <div style={{ background: "#FFF", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "5px" }}>
                <Package style={{ width: "11px", height: "11px" }} /> Product Inspection Video
              </div>

              {/* Upload/Demo buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <label style={{
                  flex: 1, padding: "8px 12px", textAlign: "center", fontSize: "12px", fontWeight: 700,
                  background: "#FFF", border: "1px solid #D5D9D9", borderRadius: "4px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#0F1111",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                }}>
                  <Upload style={{ width: "13px", height: "13px" }} /> Upload Video
                  <input type="file" accept="video/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setGradingVideoUrl(URL.createObjectURL(file));
                      const reader = new FileReader();
                      reader.onloadend = () => { if (reader.result) setGradingVideoBase64(reader.result as string); };
                      reader.readAsDataURL(file);
                    }
                  }} style={{ display: "none" }} />
                </label>
                <button
                  onClick={() => { setGradingVideoUrl("/demo_return.mp4"); setGradingVideoBase64(""); }}
                  style={{
                    flex: 1, padding: "8px 12px", fontSize: "12px", fontWeight: 700,
                    background: "#FFF", border: "1px solid #D5D9D9", borderRadius: "4px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", color: "#0F1111",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                  }}
                >
                  <Zap style={{ width: "13px", height: "13px" }} /> Load Demo Video
                </button>
              </div>

              {/* Video preview */}
              {gradingVideoUrl ? (
                <div style={{ aspectRatio: "16/9", borderRadius: "4px", overflow: "hidden", border: "1px solid #DDD", background: "#000" }}>
                  <video src={gradingVideoUrl} controls autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{
                  aspectRatio: "16/9", borderRadius: "4px", border: "1.5px dashed #D5D9D9",
                  background: "#F7F8F8", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "8px", color: "#C8CBCF"
                }}>
                  <Camera style={{ width: "28px", height: "28px" }} />
                  <span style={{ fontSize: "12px", fontWeight: 500 }}>No video loaded</span>
                </div>
              )}

              {/* Product context strip */}
              <div style={{ borderTop: "1px solid #E8E8E8", paddingTop: "12px", display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ width: "54px", height: "54px", border: "1px solid #DDD", borderRadius: "4px", overflow: "hidden", flexShrink: 0, background: "#F7F8F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {gradingSku
                    ? <img src={gradingFraudImage || getSKUReferenceImage(gradingSku)} alt={gradingItemName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <Package style={{ width: "22px", height: "22px", color: "#C8CBCF" }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Product Context</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "#8D9098", fontWeight: 600 }}>SKU</div>
                      <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#0F1111", fontWeight: 700, marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gradingSku || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", color: "#8D9098", fontWeight: 600 }}>User</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "1px" }}>
                        <span style={{ fontSize: "11px", color: "#0F1111", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileUserId || "—"}</span>
                        <span style={{
                          fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", flexShrink: 0,
                          background: (walletInfo.trustScore ?? 100) >= 80 ? "#F0FAF4" : (walletInfo.trustScore ?? 100) >= 50 ? "#FFF8E7" : "#FFF0EF",
                          color: (walletInfo.trustScore ?? 100) >= 80 ? "#067D62" : (walletInfo.trustScore ?? 100) >= 50 ? "#C7511F" : "#B12704",
                          border: `1px solid ${(walletInfo.trustScore ?? 100) >= 80 ? "#84C2A6" : (walletInfo.trustScore ?? 100) >= 50 ? "#FCD200" : "#F5B5AD"}`
                        }}>Trust: {walletInfo.trustScore ?? 100}</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <div style={{ fontSize: "11px", color: "#0F1111", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{gradingItemName}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grade button */}
              <button
                disabled={(!gradingVideoUrl && !gradingVideoBase64) || gradingLoading}
                onClick={triggerWarehouseGrading}
                style={{
                  width: "100%", padding: "11px",
                  background: (!gradingVideoUrl && !gradingVideoBase64) || gradingLoading ? "#E8E8E8" : "linear-gradient(to bottom,#f0c14b,#c89411)",
                  color: (!gradingVideoUrl && !gradingVideoBase64) || gradingLoading ? "#8D9098" : "#111",
                  border: "1px solid #a88734", borderRadius: "4px",
                  fontSize: "13px", fontWeight: 700, cursor: (!gradingVideoUrl && !gradingVideoBase64) || gradingLoading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                }}
              >
                {gradingLoading
                  ? <><span className="spinner" style={{ borderColor: "#8D9098", borderTopColor: "transparent" }} /> Extracting keyframes &amp; grading...</>
                  : <><BarChart2 style={{ width: "15px", height: "15px" }} /> Grade Product Condition</>
                }
              </button>
            </div>

            {/* RIGHT: Condition Report column */}
            <div style={{ background: "#FFF", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em" }}>Condition Report Card</div>

              {gradingResult ? (
                <>
                  {/* Item name + grade badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111" }}>
                        {gradingResult.isCorrectVariant === false || gradingResult.claimType === "different_product" ? "Unknown Product (Variant Mismatch)" : gradingResult.itemName}
                      </div>
                      <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#565959", marginTop: "2px" }}>SKU: {gradingResult.sku}</div>
                    </div>
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                      padding: "8px 14px", border: "2px solid",
                      borderColor: gradingResult.grade === "A" ? "#6ee7b7" : gradingResult.grade === "B" ? "#a5b4fc" : gradingResult.grade === "C" ? "#fcd34d" : "#fda4af",
                      background: gradingResult.grade === "A" ? "#ecfdf5" : gradingResult.grade === "B" ? "#eef2ff" : gradingResult.grade === "C" ? "#fffbeb" : "#fff1f2",
                      borderRadius: "8px", flexShrink: 0
                    }}>
                      <span style={{
                        fontSize: "26px", fontWeight: 900, fontFamily: "monospace", lineHeight: 1,
                        color: gradingResult.grade === "A" ? "#065f46" : gradingResult.grade === "B" ? "#3730a3" : gradingResult.grade === "C" ? "#92400e" : "#9f1239"
                      }}>{gradingResult.grade}</span>
                      <span style={{
                        fontSize: "8px", fontWeight: 700, textTransform: "uppercase",
                        color: gradingResult.grade === "A" ? "#065f46" : gradingResult.grade === "B" ? "#3730a3" : gradingResult.grade === "C" ? "#92400e" : "#9f1239",
                        opacity: 0.7
                      }}>
                        {gradingResult.grade === "A" ? "Like New" : gradingResult.grade === "B" ? "Very Good" : gradingResult.grade === "C" ? "Moderate" : "Rejected"}
                      </span>
                    </div>
                  </div>

                  {/* Grading scale */}
                  <div style={{ background: "#F7F8F8", border: "1px solid #E8E8E8", borderRadius: "4px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#8D9098", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Grading Scale</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px" }}>
                      {[
                        { g: "A", label: "Like New", sub: "9–10/10", bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46" },
                        { g: "B", label: "Very Good", sub: "7–8.9/10", bg: "#eef2ff", border: "#a5b4fc", text: "#3730a3" },
                        { g: "C", label: "Moderate", sub: "4–6.9/10", bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
                        { g: "D", label: "Rejected", sub: "0–3.9/10", bg: "#fff1f2", border: "#fda4af", text: "#9f1239" },
                      ].map(({ g, label, sub, bg, border, text }) => (
                        <div key={g} style={{
                          background: bg, border: `1.5px solid ${border}`, borderRadius: "4px",
                          padding: "5px 4px", textAlign: "center",
                          boxShadow: gradingResult.grade === g ? `0 0 0 2px ${border}` : "none",
                          opacity: gradingResult.grade === g ? 1 : 0.45
                        }}>
                          <div style={{ fontSize: "15px", fontWeight: 900, color: text, fontFamily: "monospace" }}>{g}</div>
                          <div style={{ fontSize: "8px", fontWeight: 700, color: text }}>{label}</div>
                          <div style={{ fontSize: "7px", color: text, opacity: 0.7 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disposition channel */}
                  <div style={{
                    background: gradingResult.grade === "A" ? "#F0FAF4" : gradingResult.grade === "B" ? "#EEF2FF" : gradingResult.grade === "C" ? "#EFF6FF" : "#FFF0EF",
                    border: `1px solid ${gradingResult.grade === "A" ? "#84C2A6" : gradingResult.grade === "B" ? "#a5b4fc" : gradingResult.grade === "C" ? "#93c5fd" : "#F5B5AD"}`,
                    borderRadius:"4px", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between"
                  }}>
                    <div>
                      <div style={{fontSize:"9px", fontWeight:700, color:"#565959", textTransform:"uppercase", letterSpacing:"0.06em"}}>Disposition Channel</div>
                      <div style={{fontSize:"15px", fontWeight:700, marginTop:"2px",
                        color: gradingResult.grade === "A" ? "#067D62" : gradingResult.grade === "B" ? "#3730a3" : gradingResult.grade === "C" ? "#1D4ED8" : "#B12704"
                      }}>{gradingResult.resaleCategory}</div>
                      <div style={{fontSize:"10px", marginTop:"2px", color:"#565959"}}>
                        {gradingResult.grade === "A" ? "Lists directly in Dark Store marketplace" :
                         gradingResult.grade === "B" ? "Cleaned & tested before discounted listing" :
                         gradingResult.grade === "C" ? "Routed to NGO / charity donation partner" :
                         "Sent to materials recycling facility"}
                      </div>
                    </div>
                    <span style={{fontSize:"26px"}}>{gradingResult.grade === "A" ? "🏪" : gradingResult.grade === "B" ? "🔧" : gradingResult.grade === "C" ? "💙" : "♻️"}</span>
                  </div>

                  {/* Key metrics */}
                  <div style={{ border: "1px solid #E8E8E8", borderRadius: "4px", overflow: "hidden" }}>
                    {[
                      { label: "Variant Check", value: gradingResult.isCorrectVariant ? "✓ Matched" : "✗ Mismatch", color: gradingResult.isCorrectVariant ? "#067D62" : "#B12704" },
                      { label: "Functional Score", value: `${gradingResult.functionalScore}/10`, color: "#0F1111" },
                      { label: "Defects Found", value: gradingResult.defects?.join(", ") || "None", color: "#0F1111" },
                      ...(gradingResult.missingComponents?.length > 0
                        ? [{ label: "⚠️ Missing Components", value: gradingResult.missingComponents.join(", "), color: "#B12704" }]
                        : [])
                    ].map(({ label, value, color }, i, arr) => (
                      <div key={label} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", fontSize: "12px",
                        borderBottom: i < arr.length - 1 ? "1px solid #F0F2F2" : "none",
                        background: i % 2 === 0 ? "#FAFAFA" : "#FFF"
                      }}>
                        <span style={{ color: "#565959" }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* AI Reasoning */}
                  {gradingReasoning && (
                    <div style={{ background: "#F7F8F8", border: "1px solid #DDD", borderRadius: "4px", padding: "10px 12px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>🤖 AI Inspector Reasoning</div>
                      <div style={{ fontSize: "11px", color: "#0F1111", lineHeight: 1.6 }}>{gradingReasoning}</div>
                      {gradingVariantNotes && (
                        <div style={{ fontSize: "10px", color: "#565959", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #E8E8E8" }}>
                          <span style={{ fontWeight: 700 }}>Variant notes: </span>{gradingVariantNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ledger hash */}
                  <div style={{ background: "#EEF4FF", border: "1px solid #C8D8F0", borderRadius: "4px", padding: "8px 12px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#1a3a6b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>Ledger Block (SHA-256)</div>
                    <div style={{ fontSize: "9px", fontFamily: "monospace", color: "#2563EB", wordBreak: "break-all", lineHeight: 1.5 }}>{gradingResult.hash}</div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      onClick={() => {
                        const grade: string = gradingResult.grade ?? "D";
                        const gradeUpper = grade.toUpperCase();

                        if (gradeUpper === "C" || gradeUpper === "D" || gradeUpper === "F") {
                          setScrappedItem({ sku: gradingSku, name: gradingItemName, grade: gradeUpper, reason: gradingResult.resaleCategory || "Recycled" });
                          setListedItem(null); setLogisticsResult(null); setLabelGenerated(false);
                          const currentItem = inspectQueue?.find((q: any) => q.id === gradingQueueId);
                          const orderIdToRemove = currentItem?.orderId;
                          setInspectQueue((prev: any[]) => prev.filter((q: any) => q.id !== gradingQueueId));
                          
                          if (orderIdToRemove) {
                            const isFraud = gradingResult.isCorrectVariant === false || currentItem?.claimType === "different_product";
                            setWalletInfo((prev: any) => {
                              if (!prev) return prev;
                              
                              if (isFraud) {
                                const newScore = Math.max(0, (prev.trustScore || 100) - 50);
                                return {
                                  ...prev, trustScore: newScore, returnPrivileges: newScore < 50 ? "REVOKED" : prev.returnPrivileges,
                                  orders: prev.orders ? prev.orders.map((o: any) => o.orderId === orderIdToRemove ? { ...o, status: "Refund Denied (Fraud)" } : o) : []
                                };
                              } else {
                                // Genuine wear/damage - just remove from queue and allow refund to process normally
                                return {
                                  ...prev,
                                  orders: prev.orders ? prev.orders.filter((o: any) => o.orderId !== orderIdToRemove) : []
                                };
                              }
                            });
                          }
                          setGradingResult(null); setGradingVideoUrl(""); setGradingVideoBase64("");
                          return;
                        }

                        setResaleListings((prev: any[]) => {
                          if (prev.some((r: any) => r.sku === gradingSku)) return prev;
                          return [...prev, {
                            sku: gradingSku, name: gradingItemName, price: parseFloat((gradingResult.price ?? 29.99).toFixed(2)),
                            originalPrice: parseFloat((gradingResult.price ?? 29.99).toFixed(2)), brand: gradingResult.brand ?? "Returned Item",
                            grade: gradeUpper, co2Saved: gradeUpper === "A" ? 4 : gradeUpper === "B" ? 6 : 8,
                            distance: "2.1 km", trust: gradeUpper === "A" ? 96 : gradeUpper === "B" ? 84 : 72,
                            addedToStoreAt: Date.now(), isReturnedProduct: gradeUpper !== "A"
                          }];
                        });
                        const currentItem = inspectQueue?.find((q: any) => q.id === gradingQueueId);
                        const orderIdToRemove = currentItem?.orderId;
                        setInspectQueue((prev: any[]) => prev.filter((q: any) => q.id !== gradingQueueId));
                        if (orderIdToRemove) {
                          setWalletInfo((prev: any) => {
                            if (!prev || !prev.orders) return prev;
                            return { ...prev, orders: prev.orders.filter((o: any) => o.orderId !== orderIdToRemove) };
                          });
                        }
                        setListedItem({ sku: gradingSku, name: gradingItemName, grade: gradeUpper });
                        setLogisticsResult(null); setLabelGenerated(false);
                        setGradingResult(null); setGradingVideoUrl(""); setGradingVideoBase64("");
                        setLogisticsSku(gradingSku); setActiveTab("logistics");
                      }}
                      style={{
                        width: "100%", padding: "11px",
                        background: (gradingResult.grade === "C" || gradingResult.grade === "D" || gradingResult.grade === "F") ? "#DC2626" : "#067D62",
                        color: "#FFF", border: "none", borderRadius: "4px",
                        fontSize: "13px", fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "7px"
                      }}
                    >
                      <Zap style={{ width: "14px", height: "14px" }} />
                      {gradingResult.grade === "C" || gradingResult.grade === "D" || gradingResult.grade === "F"
                        ? `Route to ${gradingResult.resaleCategory || "Recycled"}`
                        : `List in Dark Store (Grade ${gradingResult.grade})`}
                    </button>
                    <button
                      onClick={() => { setGradingResult(null); setGradingVideoUrl(""); setGradingVideoBase64(""); }}
                      style={{
                        width: "100%", padding: "8px",
                        background: "#FFF", color: "#0F1111",
                        border: "1px solid #D5D9D9", borderRadius: "4px",
                        fontSize: "12px", fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      ↺ Re-grade / Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  color: "#C8CBCF", gap: "8px", padding: "40px 0"
                }}>
                  <Package style={{ width: "36px", height: "36px" }} />
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#8D9098" }}>Load a video and run grading</div>
                  <div style={{ fontSize: "11px", color: "#C8CBCF" }}>to see the condition report here.</div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom padding */}
          <div style={{ height: "20px" }} />
        </div>
      </div>

      {/* ── POST-SCRAPPING BANNER ── */}
      {scrappedItem && (
        <div style={{ margin: "12px 0 0", background: "#FFF", border: "1px solid #DDD", borderRadius: "4px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#F0F2F2", border: "1px solid #DDD", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Package style={{ width: "18px", height: "18px", color: "#565959" }} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111" }}>Item Routed to {scrappedItem.reason}</div>
            <div style={{ fontSize: "12px", color: "#565959", marginTop: "2px" }}>
              <strong>{scrappedItem.name}</strong> · Grade <strong style={{ color: "#B12704" }}>{scrappedItem.grade}</strong> · Removed from active inventory
            </div>
          </div>
        </div>
      )}

      {/* ── GRADED HISTORY ── */}
      <div style={{ background: "#FFF", border: "1px solid #DDD", borderRadius: "4px", padding: "20px", marginTop: "12px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0F1111", margin: 0 }}>Graded History</h3>
            <div style={{ fontSize: "11px", color: "#565959", marginTop: "3px" }}>All inspected items · stored locally · {gradedHistory.length} records</div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            {["ALL", "A", "B", "C", "D"].map(f => {
              const counts: Record<string, number> = {
                ALL: gradedHistory.length,
                A: gradedHistory.filter((r: any) => r.grade === "A").length,
                B: gradedHistory.filter((r: any) => r.grade === "B").length,
                C: gradedHistory.filter((r: any) => r.grade === "C").length,
                D: gradedHistory.filter((r: any) => r.grade === "D").length,
              };
              const active = historyFilter === f;
              const activeColors: Record<string, { bg: string, color: string, border: string }> = {
                ALL: { bg: "#0F1111", color: "#FFF", border: "#0F1111" },
                A: { bg: "#065f46", color: "#FFF", border: "#065f46" },
                B: { bg: "#3730a3", color: "#FFF", border: "#3730a3" },
                C: { bg: "#92400e", color: "#FFF", border: "#92400e" },
                D: { bg: "#9f1239", color: "#FFF", border: "#9f1239" },
              };
              return (
                <button key={f} onClick={() => setHistoryFilter(f)} style={{
                  padding: "4px 12px", fontSize: "11px", fontWeight: 700, borderRadius: "20px",
                  border: `1.5px solid ${active ? activeColors[f].border : "#DDD"}`,
                  background: active ? activeColors[f].bg : "#FFF",
                  color: active ? activeColors[f].color : "#565959",
                  cursor: "pointer", transition: "all 0.15s"
                }}>
                  {f === "ALL" ? "All" : `Grade ${f}`} <span style={{ opacity: 0.75 }}>({counts[f]})</span>
                </button>
              );
            })}
            {gradedHistory.length > 0 && (
              <button onClick={() => setGradedHistory([])} style={{
                padding: "4px 10px", fontSize: "10px", fontWeight: 600, borderRadius: "20px",
                border: "1px solid #fca5a5", background: "#fff1f2", color: "#dc2626", cursor: "pointer"
              }}>Clear</button>
            )}
          </div>
        </div>

        {gradedHistory.filter((r: any) => historyFilter === "ALL" || r.grade === historyFilter).length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: "#8D9098", fontSize: "12px", fontStyle: "italic" }}>
            No graded items yet. Run a grading inspection to see results here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px", border: "1px solid #DDD", borderRadius: "4px", overflow: "hidden" }}>
            {gradedHistory
              .filter((r: any) => historyFilter === "ALL" || r.grade === historyFilter)
              .map((record: any, i: number, arr: any[]) => {
                const gradeColors: Record<string, { bg: string, border: string, text: string, badge: string }> = {
                  A: { bg: "#F0FAF4", border: "#84C2A6", text: "#067D62", badge: "#059669" },
                  B: { bg: "#EEF2FF", border: "#a5b4fc", text: "#3730a3", badge: "#4f46e5" },
                  C: { bg: "#EFF6FF", border: "#93c5fd", text: "#1D4ED8", badge: "#d97706" },
                  D: { bg: "#FFF0EF", border: "#F5B5AD", text: "#B12704", badge: "#e11d48" },
                };
                const gc = gradeColors[record.grade] || gradeColors["D"];
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "auto 1fr auto",
                    alignItems: "flex-start", gap: "16px",
                    background: "#FFF",
                    borderBottom: i < arr.length - 1 ? "1px solid #E8E8E8" : "none",
                    padding: "16px 20px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#FFF"}
                  >
                    {/* Grade badge */}
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "8px", flexShrink: 0,
                      background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text, 
                      fontWeight: 900, fontSize: "22px", fontFamily: "monospace", 
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                    }}>{record.grade}</div>

                    {/* Info */}
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#0F1111" }}>
                          {record.isCorrectVariant === false || record.claimType === "different_product" ? "Unknown Product (Variant Mismatch)" : record.itemName}
                        </span>
                        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#565959", background: "#F7F8F8", padding: "3px 6px", borderRadius: "4px", border: "1px solid #E8E8E8" }}>SKU: {record.sku}</span>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: gc.text, background: gc.bg, border: `1px solid ${gc.border}`, padding: "2px 8px", borderRadius: "12px" }}>
                          {record.resaleCategory}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: "12px", color: "#565959", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span>Score: <strong style={{ color: gc.text, fontSize: "13px" }}>{record.functionalScore}/10</strong></span>
                        {record.defects?.length > 0 && (
                          <span style={{ color: "#C8CBCF" }}>•</span>
                        )}
                        {record.defects?.length > 0 && (
                          <span>Defects: <strong style={{color: "#0F1111"}}>{record.defects.join(", ")}</strong></span>
                        )}
                        {record.missingComponents?.length > 0 && (
                          <span style={{ color: "#C8CBCF" }}>•</span>
                        )}
                        {record.missingComponents?.length > 0 && (
                          <span style={{ color: "#B12704", fontWeight: 600 }}>⚠️ Missing: {record.missingComponents.join(", ")}</span>
                        )}
                      </div>
                      
                      {record.reasoning && (
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "#0F1111", lineHeight: 1.5, background: "#F7F8F8", padding: "8px 12px", borderRadius: "6px", border: "1px solid #E8E8E8" }}>
                          <strong style={{ color: "#565959", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "6px" }}>AI Reasoning:</strong> 
                          {record.reasoning}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: "11px", color: "#8D9098", flexShrink: 0, textAlign: "right", whiteSpace: "nowrap", fontWeight: 500, marginTop: "2px" }}>
                      {record.gradedAt ? new Date(record.gradedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }) : ""}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

    </div>
  );
}
