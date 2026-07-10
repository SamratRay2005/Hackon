"use client";

/**
 * L1Sizing.tsx — Find My Size Tab (Redesigned)
 * ──────────────────────────────────────────────
 * Premium retail-style AI size recommender.
 */

import React from "react";
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  Search,
  Shirt,
  X,
  Zap,
  Ruler,
  ChevronRight,
  ScanLine,
  ArrowRight,
  ShoppingBag,
  User,
} from "lucide-react";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import {
  useApp,
  WebcamCapture,
  getDynamicSizeChart,
  getSKUReferenceImage,
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
    setWalletInfo,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    showSuggestions,
    setShowSuggestions,
    setShoppingBag,
  } = useApp();

  const [sizingLoading, setSizingLoading] = React.useState(false);
  const [heightInches, setHeightInches] = React.useState<number | "">("");
  const [acceptedSize, setAcceptedSize] = React.useState<string | null>(null);
  const [selectedSize, setSelectedSize] = React.useState<string>("");
  const selectedProduct = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);
  const isApparelOrFootwear = !!(selectedProduct && (selectedProduct.category === "Apparel" || selectedProduct.category === "Footwear"));

  const handleAddSizeToCart = (size: string) => {
    if (!selectedProduct) return;
    const isActuallyBracketing = cart.some((item: any) => item.sku === selectedProduct.sku && item.size !== size);
    setCart((prev: any[]) => [...prev, { id: Math.random().toString(36).slice(2), sku: selectedProduct.sku, name: selectedProduct.name, size, price: selectedProduct.price }]);
    if (isActuallyBracketing) setShowBracketingModal(true);
  };
  const handleRemoveFromCart = (id: string) => setCart((prev: any[]) => prev.filter((item: any) => item.id !== id));

  const triggerSizeAssist = async () => {
    if (!sizingImage) return;
    setSizingLoading(true);
    const skuCounts: Record<string, number> = {};
    cart.forEach((item: any) => { skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1; });
    const bracketedSku = Object.keys(skuCounts).find(sku => skuCounts[sku] > 1) || selectedProductSku;
    const bracketedSizes = cart.filter((item: any) => item.sku === bracketedSku).map((item: any) => item.size);
    try {
      const res = await fetch("/api/size-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: sizingImage,
          brand: "UrbanEco",
          sku: bracketedSku,
          sizes: bracketedSizes,
          sessionId: `session-${bracketedSku}`,
          heightInches: heightInches !== "" ? Number(heightInches) : undefined
        })
      });
      if (res.ok) setSizingResult(await res.json());
    } catch { } finally { setSizingLoading(false); }
  };

  const applySizeRecommendation = (recommendedSize: string) => {
    setAcceptedSize(recommendedSize);
    setSelectedSize(recommendedSize);
  };

  const handleAddToCart = () => {
    if (!acceptedSize) return;
    const skuCounts: Record<string, number> = {};
    cart.forEach((item: any) => { skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1; });
    const bracketedSku = Object.keys(skuCounts).find(sku => skuCounts[sku] > 1) || selectedProductSku;
    const bracketedProd = PRODUCT_CATALOG.find(p => p.sku === bracketedSku) || PRODUCT_CATALOG[0];

    setShoppingBag((prev: any) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        sku: bracketedProd.sku,
        name: bracketedProd.name,
        price: bracketedProd.price,
        grade: "A",
        originalPrice: bracketedProd.price,
        size: acceptedSize,
        isPreloved: false
      }
    ]);

    setShowBracketingModal(false);
    setSizingResult(null);
    setSizingImage(null);
    setAcceptedSize(null);
    setMetrics((prev: any) => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
    try {
      const confetti = (window as any).confetti;
      if (confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch { }
    setActiveTab("cart");
  };

  const chartData = getDynamicSizeChart(selectedProductSku);

  return (
    <div className="flex flex-col gap-0 bg-[#F7F8F8] min-h-screen">
      {/* ── Page Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E3E6E6", padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Ruler className="w-5 h-5" style={{ color: "#007185" }} />
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0F1111" }}>Size Recommender</h1>
          <span style={{ fontSize: "11px", background: "#C7511F", color: "#FFF", padding: "2px 8px", borderRadius: "3px", fontWeight: 700, letterSpacing: "0.05em" }}>AI POWERED</span>
        </div>
        <p style={{ fontSize: "13px", color: "#565959", marginTop: "4px" }}>
          Get your perfect fit in seconds. Our AI scans your body proportions and recommends the right size — reducing returns by up to 68%.
        </p>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── Product Context Card ── */}
        {selectedProduct ? (
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "16px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ width: "80px", height: "80px", flexShrink: 0, border: "1px solid #E3E6E6", borderRadius: "4px", overflow: "hidden", background: "#F7F8F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={getSKUReferenceImage(selectedProductSku)} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt={selectedProduct.name} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "#565959", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Finding size for</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F1111", marginBottom: "4px" }}>{selectedProduct.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px", fontWeight: 400, color: "#0F1111" }}>
                  <span style={{ fontSize: "12px", verticalAlign: "top", lineHeight: "22px" }}>$</span>
                  {Math.floor(selectedProduct.price)}
                  <span style={{ fontSize: "12px" }}>.{(selectedProduct.price % 1).toFixed(2).substring(2)}</span>
                </span>
                <span style={{ fontSize: "12px", color: "#007600", fontWeight: 500 }}>Free Returns</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedProductSku("")}
              style={{ fontSize: "12px", color: "#007185", fontWeight: 500, border: "1px solid #007185", borderRadius: "3px", padding: "4px 10px", background: "none", cursor: "pointer" }}
            >
              Change
            </button>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "16px" }}>
            <div style={{ fontSize: "13px", color: "#565959", marginBottom: "10px", fontWeight: 600 }}>Search for an Apparel or Footwear product to get started:</div>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#888C8C" }} />
              <input
                type="text"
                style={{ width: "100%", padding: "8px 10px 8px 32px", border: "1px solid #888C8C", borderRadius: "4px", fontSize: "13px", color: "#0F1111", outline: "none", boxSizing: "border-box" }}
                placeholder="Search jackets, tees, shoes..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            {showSuggestions && searchQuery && (
              <div style={{ marginTop: "4px", border: "1px solid #D5D9D9", borderRadius: "4px", background: "#fff", maxHeight: "200px", overflowY: "auto" }}>
                {PRODUCT_CATALOG
                  .filter(p => (p.category === "Apparel" || p.category === "Footwear") && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())))
                  .slice(0, 8)
                  .map(p => (
                    <div
                      key={p.sku}
                      style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", borderBottom: "1px solid #F0F2F2" }}
                      onClick={() => { setSelectedProductSku(p.sku); setSearchQuery(""); setShowSuggestions(false); }}
                      className="hover:bg-[#F7F8F8]"
                    >
                      <img src={getSKUReferenceImage(p.sku)} style={{ width: "36px", height: "36px", objectFit: "contain", flexShrink: 0 }} alt={p.name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F1111" }}>{p.name}</div>
                        <div style={{ fontSize: "11px", color: "#565959" }}>{p.category} · {p.sku}</div>
                      </div>
                      <span style={{ fontSize: "14px", color: "#0F1111", fontWeight: 600 }}>${p.price.toFixed(2)}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {isApparelOrFootwear && (
          <>
            {/* ── Two-column layout: Size Picker + AI Scanner ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* LEFT: Manual Size Selection */}
              <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ width: "24px", height: "24px", background: "#232F3E", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111" }}>Select Your Size</div>
                    <div style={{ fontSize: "12px", color: "#565959" }}>Choose manually or let AI decide below</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                  {(selectedProduct?.sizes || ["XS", "S", "M", "L", "XL", "XXL"]).map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size === selectedSize ? "" : size)}
                      style={{
                        minWidth: "48px", height: "48px", padding: "0 12px",
                        border: selectedSize === size ? "2px solid #007185" : "1px solid #D5D9D9",
                        borderRadius: "4px",
                        background: selectedSize === size ? "#F0F8FA" : "#fff",
                        color: "#0F1111",
                        fontSize: "14px",
                        fontWeight: selectedSize === size ? 700 : 400,
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>

                {selectedSize && (
                  <div style={{ background: "#F0F8FA", border: "1px solid #007185", borderRadius: "4px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", color: "#007185", fontWeight: 600 }}>✓ Size <strong>{selectedSize}</strong> selected</div>
                  </div>
                )}

                <button
                  disabled={!selectedSize}
                  onClick={() => {
                    if (!selectedSize || !selectedProduct) return;
                    setShoppingBag((prev: any) => [
                      ...prev,
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        sku: selectedProduct.sku,
                        name: selectedProduct.name,
                        price: selectedProduct.price,
                        grade: "A",
                        originalPrice: selectedProduct.price,
                        size: selectedSize,
                        isPreloved: false
                      }
                    ]);
                    try { const c = (window as any).confetti; if (c) c({ particleCount: 60, spread: 50, origin: { y: 0.7 } }); } catch {}
                    setActiveTab("cart");
                  }}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "20px",
                    background: selectedSize ? "#FFD814" : "#F7F8F8",
                    border: selectedSize ? "1px solid #FCD200" : "1px solid #D5D9D9",
                    color: selectedSize ? "#0F1111" : "#888",
                    fontSize: "14px", fontWeight: 600, cursor: selectedSize ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {selectedSize ? `Add Size ${selectedSize} to Cart` : "Select a size first"}
                </button>
              </div>

              {/* RIGHT: AI Scanner */}
              <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: "24px", height: "24px", background: "#232F3E", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>2</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111" }}>AI Body Scanner</div>
                    <div style={{ fontSize: "12px", color: "#565959" }}>68% fewer size-related returns</div>
                  </div>
                  <span style={{ fontSize: "10px", background: "#C7511F", color: "#fff", padding: "2px 7px", borderRadius: "2px", fontWeight: 700, letterSpacing: "0.05em" }}>BETA</span>
                </div>

                <div style={{ background: "#F0F8FA", border: "1px solid #BEE3F0", borderRadius: "4px", padding: "10px 12px", marginBottom: "14px", fontSize: "12px", color: "#0F1111", lineHeight: 1.6 }}>
                  📸 Take a quick selfie. Our AI maps your body proportions against the size chart and picks your perfect fit — no measuring tape needed.
                </div>

                {/* Height Input */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#0F1111", display: "block", marginBottom: "4px" }}>
                    Height (inches) <span style={{ fontWeight: 400, color: "#565959" }}>(Optional but recommended)</span>
                  </label>
                  <input
                    type="number" min="36" max="96" placeholder="e.g. 68"
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #888C8C", borderRadius: "4px", background: "#fff", color: "#0F1111", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    value={heightInches}
                    onChange={e => setHeightInches(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                  {heightInches !== "" && (
                    <div style={{ fontSize: "11px", color: "#007185", marginTop: "3px" }}>
                      ✓ {Math.floor(Number(heightInches) / 12)}'{Number(heightInches) % 12}" — AI will calibrate to this height
                    </div>
                  )}
                </div>

                <WebcamCapture
                  onCapture={(base64: string) => {
                    setSizingImage(base64);
                    setSizingResult(null);
                  }}
                  overlayType="sizing"
                />

                {sizingImage && (
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#007600", fontWeight: 600 }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Photo captured — ready to analyse
                    </div>
                    <img src={sizingImage} style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid #D5D9D9" }} alt="Selfie preview" />
                    <button
                      disabled={sizingLoading}
                      onClick={triggerSizeAssist}
                      style={{
                        width: "100%", padding: "10px", borderRadius: "20px",
                        background: sizingLoading ? "#F7F8F8" : "#FFD814",
                        border: sizingLoading ? "1px solid #D5D9D9" : "1px solid #FCD200",
                        color: "#0F1111", fontSize: "13px", fontWeight: 700,
                        cursor: sizingLoading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                      }}
                    >
                      {sizingLoading ? (
                        <><span className="spinner" /> Mapping your proportions...</>
                      ) : (
                        <><ScanLine className="w-4 h-4" /> Analyze & Recommend My Size</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── AI Result Banner ── */}
            {sizingResult && (
              <div style={{
                background: "#fff",
                border: "2px solid #007600",
                borderRadius: "6px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                gap: "16px"
              }}>
                <div style={{ width: "48px", height: "48px", background: "#E7F5E7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <CheckCircle className="w-6 h-6" style={{ color: "#007600" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", color: "#007600", fontWeight: 700, marginBottom: "2px" }}>AI Recommendation Ready</div>
                  <div style={{ fontSize: "15px", color: "#0F1111", fontWeight: 400 }}>
                    Your perfect size is <strong style={{ fontSize: "20px" }}>{sizingResult.recommendedSize}</strong>
                  </div>
                  {sizingResult.notes && (
                    <div style={{ fontSize: "12px", color: "#565959", marginTop: "4px" }}>{sizingResult.notes}</div>
                  )}
                </div>
                {!acceptedSize ? (
                  <button
                    onClick={() => applySizeRecommendation(sizingResult.recommendedSize)}
                    style={{
                      padding: "10px 20px", background: "#FFD814", border: "1px solid #FCD200",
                      borderRadius: "20px", fontSize: "13px", fontWeight: 700, color: "#0F1111",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0
                    }}
                  >
                    Accept & Add to Cart <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    style={{
                      padding: "10px 20px", background: "#FFD814", border: "1px solid #FCD200",
                      borderRadius: "20px", fontSize: "13px", fontWeight: 700, color: "#0F1111",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0
                    }}
                  >
                    <ShoppingBag className="w-4 h-4" /> Add Size {acceptedSize} to Cart
                  </button>
                )}
              </div>
            )}

            {/* ── Size Chart ── */}
            {chartData && (
              <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #E3E6E6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F1111" }}>Size Chart</div>
                    <div style={{ fontSize: "12px", color: "#565959" }}>{chartData.name} · {chartData.brand}</div>
                  </div>
                  <span style={{ fontSize: "11px", color: "#007185", fontWeight: 600, border: "1px solid #007185", borderRadius: "3px", padding: "2px 8px" }}>All measurements in inches</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#F7F8F8", borderBottom: "1px solid #D5D9D9" }}>
                        {Object.keys(chartData.chart[0]).map((k: string) => (
                          <th key={k} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#0F1111", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</th>
                        ))}
                        <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#0F1111", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>AI Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.chart.map((row: any, i: number) => {
                        const isRecommended = sizingResult?.recommendedSize === row.size;
                        const isSelected = selectedSize === row.size;
                        return (
                          <tr
                            key={i}
                            onClick={() => setSelectedSize(row.size)}
                            style={{
                              background: isRecommended ? "#F0FFF0" : isSelected ? "#F0F8FA" : i % 2 === 0 ? "#fff" : "#FAFAFA",
                              borderBottom: "1px solid #E3E6E6",
                              cursor: "pointer",
                              transition: "background 0.1s"
                            }}
                            className="hover:bg-[#F7F8F8]"
                          >
                            {Object.values(row).map((v: any, j: number) => (
                              <td key={j} style={{
                                padding: "12px 16px",
                                fontWeight: j === 0 ? 700 : 400,
                                color: j === 0 ? (isRecommended ? "#007600" : "#007185") : "#0F1111",
                                fontSize: j !== 0 && isRecommended ? "13px" : "13px"
                              }}>{v}</td>
                            ))}
                            <td style={{ padding: "12px 16px" }}>
                              {isRecommended ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#E7F5E7", color: "#007600", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "3px" }}>
                                  <CheckCircle className="w-3 h-3" /> Best Fit
                                </span>
                              ) : isSelected ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#F0F8FA", color: "#007185", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "3px" }}>
                                  Selected
                                </span>
                              ) : (
                                <span style={{ color: "#C8CBCC", fontSize: "13px" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: "10px 16px", background: "#F7F8F8", borderTop: "1px solid #E3E6E6", fontSize: "12px", color: "#565959" }}>
                  💡 <strong>Tip:</strong> Click a row to select that size, or use the AI scanner above for a personalized recommendation.
                </div>
              </div>
            )}

            {/* ── How It Works Strip ── */}
            <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "16px" }}>How AI Size Recommender Works</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {[
                  { step: "1", icon: <Ruler className="w-5 h-5" />, title: "Check the size chart", desc: "Browse measurements above. Click any row to manually pick a size.", color: "#007185" },
                  { step: "2", icon: <ScanLine className="w-5 h-5" />, title: "Take a body scan selfie", desc: "Our AI analyses your proportions from a single photo — takes 5 seconds.", color: "#C7511F" },
                  { step: "3", icon: <CheckCircle className="w-5 h-5" />, title: "Accept your perfect fit", desc: "AI recommends a size. Keep it, return it for free if it's wrong — zero risk.", color: "#007600" },
                ].map(({ step, icon, title, desc, color }) => (
                  <div key={step} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Step {step}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0F1111", marginBottom: "4px" }}>{title}</div>
                      <div style={{ fontSize: "12px", color: "#565959", lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </>
        )}

        {/* ── Non-apparel warning ── */}
        {!isApparelOrFootwear && selectedProduct && (
          <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "20px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#FFA41C" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F1111", marginBottom: "4px" }}>Size selection not available for this product</div>
              <div style={{ fontSize: "13px", color: "#565959" }}>
                <strong>{selectedProduct?.name}</strong> ({selectedProduct?.category}) doesn't require size selection.
                Use the search above to find an Apparel or Footwear product instead.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
