"use client";

/**
 * L0Dashboard.tsx — Dashboard Tab
 * ──────────────────────────────────
 * Owns: Order history, ledger table, product search, sizing recommendation summary, hero carousel.
 * API: none (reads from AppContext — ledgerRecords fetched in page.tsx on mount)
 */

import React, { useRef } from "react";
import {
  Shirt,
  Search,
  X,
  ArrowRight,
  Info,
  Copy,
} from "lucide-react";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import {
  useApp,
  HeroCarousel,
  getSKUReferenceImage,
} from "./AppContext";

export default function L0Dashboard() {
  const {
    walletInfo,
    setActiveTab,
    setSelectedProductSku,
    setDeflectProduct,
    setDeflectSku,
    setChatMessages,
    fetchGuidesForProduct,
    sizingResult,
    ledgerRecords,
    profileUserId,
    searchQuery,
    setSearchQuery,
    showSuggestions,
    setShowSuggestions,
    searchContainerRef,
  } = useApp();

  const filteredSuggestions = PRODUCT_CATALOG.filter(p => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  }).slice(0, 8);

  return (
    <div className="flex flex-col gap-5">

      {/* ── HERO CAROUSEL ── */}
      <HeroCarousel
        onShopNow={(sku) => {
          setSelectedProductSku(sku);
          setActiveTab("marketplace");
        }}
      />

      {/* Recommendation + Blueprint */}
      <div className="glass-card flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 flex-shrink-0">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                AI Recommended Size: <span className="text-indigo-600">{sizingResult?.recommendedSize || "L"}</span>
              </h3>
              <div className="text-xs font-bold text-slate-500 mt-0.5">
                Match Confidence: <span className="text-indigo-600 font-extrabold">{sizingResult?.confidenceScore || 94}%</span>
              </div>
            </div>
          </div>
        </div>
        <p className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-medium text-slate-500 leading-relaxed">
          {sizingResult?.reasoning || "Body proportions evaluated relative to catalog. Standard sizing charts suggest size L for relaxed premium fitting."}
        </p>
      </div>

      {/* Product Search */}
      <div ref={searchContainerRef} className="glass-card flex flex-col gap-3 relative">
        <div className="section-title-bar py-1">
          <h2>E-Commerce Product Search</h2>
          <span className="section-badge badge-catalog">Catalog</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-9 pr-8 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] placeholder-slate-400 transition-all font-semibold"
            placeholder="Search 150+ products by name or SKU..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
          />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600" onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredSuggestions.map(p => (
              <div
                key={p.sku}
                className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between gap-2"
                onClick={() => {
                  setSelectedProductSku(p.sku);
                  setSearchQuery(`${p.name} (${p.sku})`);
                  setShowSuggestions(false);
                }}
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-indigo-500 font-mono">SKU: {p.sku}</div>
                </div>
                <span className="text-emerald-600 font-extrabold text-sm font-mono">${p.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="glass-card flex flex-col gap-4">
        <div className="section-title-bar">
          <h2>Circular Return Center</h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order History</span>
        </div>
        {(walletInfo.orders || []).length === 0 ? (
          <div className="info-callout">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>No order history found. Sign up and seed your wallet to see past orders appear here automatically.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
            {(walletInfo.orders || []).map(order => (
              <div key={order.sku} className="glass-card flex flex-col justify-between gap-3 hover:shadow-md transition-all cursor-default" style={{ padding: "1rem" }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">{order.category}</span>
                    <h4 className="font-bold text-xs text-slate-800 mt-1.5 leading-tight line-clamp-2">{order.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{order.purchaseDate}</span>
                  </div>
                  <span className="text-emerald-600 font-extrabold font-mono text-sm flex-shrink-0">${order.price.toFixed(2)}</span>
                </div>
                <button
                  className="btn btn-secondary w-full py-1.5 text-[11px] font-bold mt-auto"
                  onClick={() => {
                    setSelectedProductSku(order.sku);
                    if (["apparel", "footwear"].includes(order.category.toLowerCase())) {
                      setActiveTab("size-assist");
                    } else {
                      setDeflectProduct(order.name);
                      setDeflectSku(order.sku);
                      fetchGuidesForProduct(order.sku === "CF-Mkr-99" ? "coffee maker" : order.name);
                      setChatMessages([{ role: "bot", content: `Hi! I see you want to return your **${order.name}**. Let's troubleshoot before issuing a label. Does the device power on at all?` }]);
                      setActiveTab("deflection");
                    }
                  }}
                >
                  {["apparel", "footwear"].includes(order.category.toLowerCase()) ? "Troubleshoot/Return" : "Troubleshoot/Return"}
                </button>
              </div>
            ))}
            <div className="glass-card flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 border-dashed" style={{ padding: "1rem" }}>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500">View all orders</span>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="glass-card flex flex-col gap-4">
        <div className="section-title-bar">
          <h2>Product Health &amp; Circular Ledger</h2>
          <span className="section-badge badge-layer-4">Blockchain</span>
        </div>
        <div className="overflow-x-auto w-full horizontal-scroll">
          <table className="size-chart-table">
            <thead>
              <tr>
                <th>Ledger Block ID</th>
                <th>SKU</th>
                <th>Grade</th>
                <th>Defects</th>
                <th>SHA-256 Hash</th>
                <th>Resale Channel</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRecords.length === 0 ? (
                <tr><td colSpan={6} className="text-slate-400 py-6 text-center font-medium text-xs italic">No records for {profileUserId}. Grade a returned product in L4 to populate this ledger.</td></tr>
              ) : (
                ledgerRecords.map((record, index) => (
                  <tr key={record.id || index}>
                    <td className="font-mono text-indigo-600 text-xs font-bold">{record.id}</td>
                    <td className="font-bold text-slate-700 text-xs">{record.sku}</td>
                    <td><span className={`mini-badge ${record.grade?.startsWith("A") ? "success" : record.grade?.startsWith("B") ? "warning" : "danger"}`}>{record.grade}</span></td>
                    <td className="text-[10px] text-slate-500 max-w-[120px] truncate">{record.defects?.join(", ")}</td>
                    <td className="font-mono text-[10px] text-slate-500">
                      <div className="flex items-center gap-1.5" title={record.hash}>
                        <span>{record.hash?.substring(0, 6)}...{record.hash?.substring(record.hash.length - 4)}</span>
                        <button className="text-slate-300 hover:text-indigo-500 transition-colors" onClick={() => navigator.clipboard.writeText(record.hash)}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="text-xs font-bold text-slate-600">{record.resaleCategory}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
