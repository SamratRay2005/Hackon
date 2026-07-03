"use client";

/**
 * L1Sizing.tsx — Find My Size Tab
 * ──────────────────────────────────
 * Owns: Selfie size scan, size chart display, bracketing explainer.
 * API: /api/size-assist (POST)
 */

import React from "react";
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  Search,
  Shirt,
} from "lucide-react";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import {
  useApp,
  WebcamCapture,
  getDynamicSizeChart,
} from "./AppContext";

export default function L1Sizing() {
  const {
    selectedProductSku,
    setSelectedProductSku,
    cart,
    sizingImage,
    setSizingImage,
    sizingResult,
    setSizingResult,
    setCart,
    setShowBracketingModal,
    setMetrics,
    walletInfo,
    searchQuery,
    setSearchQuery,
    showSuggestions,
    setShowSuggestions,
  } = useApp();

  const [sizingLoading, setSizingLoading] = React.useState(false);
  const selectedProduct = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);
  const isApparelOrFootwear = !!(selectedProduct && (selectedProduct.category === "Apparel" || selectedProduct.category === "Footwear"));

  const triggerSizeAssist = async () => {
    if (!sizingImage) return;
    setSizingLoading(true);
    const skuCounts: Record<string, number> = {};
    cart.forEach(item => { skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1; });
    const bracketedSku = Object.keys(skuCounts).find(sku => skuCounts[sku] > 1) || selectedProductSku;
    const bracketedSizes = cart.filter(item => item.sku === bracketedSku).map(item => item.size);
    try {
      const res = await fetch("/api/size-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: sizingImage, brand: "UrbanEco", sku: bracketedSku, sizes: bracketedSizes, sessionId: `session-${bracketedSku}` })
      });
      if (res.ok) setSizingResult(await res.json());
    } catch { } finally { setSizingLoading(false); }
  };

  const applySizeRecommendation = (recommendedSize: string) => {
    const skuCounts: Record<string, number> = {};
    cart.forEach(item => { skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1; });
    const bracketedSku = Object.keys(skuCounts).find(sku => skuCounts[sku] > 1) || selectedProductSku;
    const bracketedProd = PRODUCT_CATALOG.find(p => p.sku === bracketedSku) || PRODUCT_CATALOG[0];
    setCart([...cart.filter(item => item.sku !== bracketedSku), { id: "rec-size", sku: bracketedSku, name: bracketedProd.name, size: recommendedSize, price: bracketedProd.price }]);
    setShowBracketingModal(false);
    setSizingResult(null);
    setSizingImage(null);
    setMetrics(prev => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
    try {
      const confetti = (window as any).confetti;
      if (confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch { }
  };

  const chartData = getDynamicSizeChart(selectedProductSku);

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-card flex flex-col gap-4">
        <div className="section-title-bar">
          <h2>Find My Size — AI Fit Recommender</h2>
          <span className="section-badge badge-layer-1">Size AI</span>
        </div>

        {!isApparelOrFootwear ? (
          <div className="flex flex-col gap-3">
            <div className="warning-callout">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>{selectedProduct?.name}</strong> ({selectedProduct?.category}) doesn't use size selection.
                Pick an Apparel or Footwear item below to activate AI size scanning.
              </span>
            </div>

            {/* Quick-pick: apparel/footwear from user's orders */}
            {(walletInfo.orders || []).filter(o =>
              ["apparel", "footwear"].includes(o.category.toLowerCase())
            ).length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Apparel &amp; Footwear Orders</span>
                  <div className="flex flex-wrap gap-2">
                    {(walletInfo.orders || [])
                      .filter(o => ["apparel", "footwear"].includes(o.category.toLowerCase()))
                      .map(o => (
                        <button
                          key={o.sku}
                          className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                          onClick={() => setSelectedProductSku(o.sku)}
                        >
                          <Shirt className="w-3 h-3" />
                          {o.name.split(" ").slice(0, 3).join(" ")}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

            {/* Inline search filtered to apparel/footwear */}
            <div className="relative">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Or Search by Product Name / SKU</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-400 font-semibold"
                  placeholder="Search jackets, tees, shoes..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                />
              </div>
              {showSuggestions && searchQuery && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {PRODUCT_CATALOG
                    .filter(p =>
                      (p.category === "Apparel" || p.category === "Footwear") &&
                      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .slice(0, 8)
                    .map(p => (
                      <div
                        key={p.sku}
                        className="p-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between gap-2"
                        onClick={() => { setSelectedProductSku(p.sku); setSearchQuery(""); setShowSuggestions(false); }}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-indigo-500 font-mono">{p.category} · {p.sku}</div>
                        </div>
                        <span className="text-emerald-600 font-extrabold text-xs font-mono">${p.price.toFixed(2)}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="info-callout">
            <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Snap a selfie using the camera below. Our AI maps your body proportions to the size chart and picks your perfect fit — cutting size-related returns by up to 68%.</span>
          </div>
        )}

        {isApparelOrFootwear && (
          <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-4 flex flex-col gap-3">
            <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Selfie Size Scan
              <span className="text-[10px] font-normal text-indigo-500 ml-1">Maps your body to the size chart below</span>
            </div>
            <WebcamCapture
              onCapture={(base64) => {
                setSizingImage(base64);
                setSizingResult(null);
              }}
              overlayType="sizing"
            />
            {sizingImage && (
              <div className="flex flex-col gap-2">
                <span className="mini-badge success">Photo Ready — AI will analyse your proportions</span>
                <img src={sizingImage} className="upload-preview rounded-xl" alt="Sizing photo" />
                <button
                  className="btn btn-primary w-full py-2.5 text-xs font-bold"
                  disabled={sizingLoading}
                  onClick={triggerSizeAssist}
                >
                  {sizingLoading ? <><span className="spinner" /> Analysing proportions...</> : "Analyze & Recommend My Size →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Size chart for product */}
        {(() => {
          if (chartData) {
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700">{chartData.name} — {chartData.brand} Size Reference</h3>
                </div>
                <div className="overflow-x-auto horizontal-scroll">
                  <table className="size-chart-table">
                    <thead>
                      <tr>
                        {Object.keys(chartData.chart[0]).map(k => <th key={k} className="capitalize">{k}</th>)}
                        <th>AI Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.chart.map((row: any, i: number) => {
                        const isRecommended = sizingResult?.recommendedSize === row.size;
                        return (
                          <tr key={i} style={isRecommended ? { background: "#eff6ff" } : {}}>
                            {Object.values(row).map((v: any, j: number) => (
                              <td key={j} className={j === 0 ? "font-bold text-indigo-600 font-mono" : ""}>{v}</td>
                            ))}
                            <td>
                              {isRecommended ? (
                                <span className="mini-badge success">✓ Best Fit</span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          } else {
            return (
              <div className="warning-callout">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No sizing template required for this category. Only Apparel and Footwear items require sizing charts. Switch to an apparel product using the search bar.</span>
              </div>
            );
          }
        })()}

        {sizingResult && (
          <div className="success-callout">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Sizing Scan Ledger Entry</div>
              <div className="mt-0.5">Recommended: <strong>{sizingResult.recommendedSize}</strong> — Confidence: <strong>{sizingResult.confidenceScore}%</strong></div>
            </div>
          </div>
        )}

        {sizingResult && (
          <button className="btn btn-success w-full py-2.5 text-xs font-bold" onClick={() => applySizeRecommendation(sizingResult.recommendedSize)}>
            <CheckCircle className="w-4 h-4" /> Accept AI Recommendation
          </button>
        )}

        {/* How Bracketing Works */}
        <div className="border-t border-slate-100 pt-4">
          <h4 className="text-xs font-bold text-slate-700 mb-3">How Size Bracketing Works</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { step: "1", title: "Select 2 adjacent sizes", desc: "Use the buttons above to add 2 sizes (e.g. M + L) to your size cart on the left." },
              { step: "2", title: "Scan with your selfie", desc: "Use Camera or Upload above to submit a full-body photo for AI body mapping." },
              { step: "3", title: "Accept AI pick", desc: "AI maps your body to the size chart. Keep one, return the other — zero waste." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-2.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0">{step}</div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
