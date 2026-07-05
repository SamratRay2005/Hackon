"use client";

import React, { useEffect } from "react";
import {
  Search,
  Map,
  ShoppingBag,
  Leaf,
  Award,
  AlertTriangle,
  CheckCircle,
  Settings,
  Clock,
  RotateCcw,
  Zap,
  X,
  Info,
  Shirt
} from "lucide-react";
import { PRODUCT_CATALOG } from "@/lib/catalog";
import {
  useApp,
  HeroCarousel,
  getSKUReferenceImage,
} from "./AppContext";

export default function L0Dashboard() {
  const {
    setActiveTab,
    setSelectedProductSku,
    profileUserId,
    profileZip,
    searchQuery,
    setSearchQuery,
    resaleListings,
    setResaleListings,
    isAdminMode,
    setIsAdminMode,
    setShoppingBag
  } = useApp() as any;

  const [shopTab, setShopTab] = React.useState<"catalog" | "preloved">("catalog");
  const [selectedProductDetails, setSelectedProductDetails] = React.useState<any>(null);
  const [selectedSize, setSelectedSize] = React.useState<string | null>(null);

  // Catalog State
  const filteredCatalog = PRODUCT_CATALOG.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  }).slice(0, 30); // show 30 items max

  // Preloved State
  const [marketplaceFeed, setMarketplaceFeed] = React.useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = React.useState(false);
  const [marketSearch, setMarketSearch] = React.useState("");

  useEffect(() => {
    if (profileUserId && profileZip && shopTab === "preloved") {
      const timer = setTimeout(() => {
        fetchMarketplaceFeed(marketSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [profileUserId, profileZip, marketSearch, shopTab]);

  const fetchMarketplaceFeed = async (query: string = "") => {
    setMarketplaceLoading(true);
    try {
      const res = await fetch(`/api/marketplace?userId=${profileUserId}&zipCode=${profileZip}&query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setMarketplaceFeed(data.items || []);
      }
    } catch { } finally {
      setMarketplaceLoading(false);
    }
  };

  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const activeResale = resaleListings.filter((r: any) => (now - r.addedToStoreAt) < SEVEN_DAYS_MS);

  const routeToSizing = (sku: string) => {
    setSelectedProductDetails(null);
    setSelectedProductSku(sku);
    setActiveTab("size-assist");
  };

  const openProductDetails = (item: any, isPreloved: boolean = false) => {
    // Merge catalog info with preloved info if needed
    const catalogInfo = PRODUCT_CATALOG.find(p => p.sku === item.sku) || item;
    setSelectedProductDetails({
      ...catalogInfo,
      ...item,
      isPreloved
    });
    setSelectedSize(null);
  };

  const handleAddToCart = () => {
    if (!selectedProductDetails) return;
    
    setShoppingBag((prev: any) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        sku: selectedProductDetails.sku,
        name: selectedProductDetails.name,
        price: selectedProductDetails.price,
        grade: selectedProductDetails.isPreloved ? (selectedProductDetails.grade || "B") : "A",
        originalPrice: selectedProductDetails.originalPrice || selectedProductDetails.price,
        size: selectedSize || undefined,
        isPreloved: !!selectedProductDetails.isPreloved,
      }
    ]);
    
    setSelectedProductDetails(null);
    setSelectedSize(null);
    try {
      const confetti = (window as any).confetti;
      if (confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5 relative">
      <HeroCarousel onShopNow={(sku: string) => {
        const item = PRODUCT_CATALOG.find(p => p.sku === sku);
        if (item) openProductDetails(item, false);
      }} />

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl">
        <button
          onClick={() => setShopTab("catalog")}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${shopTab === "catalog" ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
        >
          <ShoppingBag className="w-4 h-4" /> Amazon Catalog (New)
        </button>
        <button
          onClick={() => setShopTab("preloved")}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${shopTab === "preloved" ? "bg-emerald-50 shadow text-emerald-700 border border-emerald-200" : "text-slate-500 hover:text-emerald-600"}`}
        >
          <Leaf className="w-4 h-4" /> Shop Pre-Loved
        </button>
      </div>

      {shopTab === "catalog" && (
        <div className="glass-card flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="section-title-bar">
            <h2>Amazon Catalog</h2>
            <span className="section-badge badge-catalog">Brand New</span>
          </div>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold"
              placeholder="Search 150+ products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatalog.map((p) => (
              <div key={p.sku} className="marketplace-item-card group relative flex flex-col">
                <div className="marketplace-item-image">
                  <img src={getSKUReferenceImage(p.sku)} className="w-full h-full object-cover" alt={p.name} />
                </div>
                <div className="p-4 flex flex-col flex-1 pt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{p.brand}</div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] text-indigo-500 font-mono">SKU: {p.sku}</span>
                  </div>
                  <div className="mt-3 mb-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                     <span className="text-slate-800 font-extrabold text-lg font-mono">${p.price.toFixed(2)}</span>
                     {p.baseTrustScore >= 90 && (
                       <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 shadow-sm">
                         <CheckCircle className="w-3 h-3 text-emerald-500" />
                         <span className="font-bold uppercase tracking-wider">Verified</span>
                       </div>
                     )}
                  </div>
                  
                  <button
                    className="btn btn-primary w-full py-2.5 text-xs font-bold mt-auto shadow-sm"
                    onClick={() => openProductDetails(p, false)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shopTab === "preloved" && (
        <div className="glass-card flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="section-title-bar">
            <h2>Shop Pre-Loved — Buy Near You</h2>
            <div className="flex items-center gap-2">
              <span className="section-badge badge-layer-5">Local Feed</span>
            </div>
          </div>
          
          <div className="info-callout mb-2">
            <ShoppingBag className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Items shown below have been returned by users within a 100km radius. By purchasing locally, you earn Green Credits and save shipping emissions.</span>
          </div>

          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search Pre-Loved items..."
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>

          {/* Dark Store Resale Section */}
          {activeResale.length > 0 && (
            <div className="flex flex-col gap-4 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">⚡ Dark Store — Available Now</span>
                </div>
                <button
                  onClick={() => setIsAdminMode((v: boolean) => !v)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                    isAdminMode
                      ? "bg-violet-600 text-white border-violet-600 shadow"
                      : "bg-white text-slate-500 border-slate-200 hover:border-violet-300"
                  }`}
                >
                  <Settings className="w-3 h-3" />
                  {isAdminMode ? "Admin Mode ON" : "Admin Mode"}
                </button>
              </div>

              {isAdminMode && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Admin — Dark Store Time Simulator
                  </div>
                  <p className="text-[10px] text-violet-600">Simulate time passing to see how product tags evolve.</p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-300 rounded-lg py-2 hover:bg-violet-200 transition-all flex items-center justify-center gap-1.5"
                      onClick={() => {
                        setResaleListings((prev: any[]) => prev.map((r: any) => r.grade === "A" && !r.isReturnedProduct ? { ...r, isReturnedProduct: true } : r));
                      }}
                    >
                      <RotateCcw className="w-3 h-3" /> +2 Days
                    </button>
                    <button
                      className="flex-1 text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded-lg py-2 hover:bg-rose-200 transition-all flex items-center justify-center gap-1.5"
                      onClick={() => setResaleListings([])}
                    >
                      <Zap className="w-3 h-3" /> +7 Days
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeResale.map((item: any, i: number) => {
                  const ageMs = now - item.addedToStoreAt;
                  const isReturnedProduct = item.isReturnedProduct || ageMs >= TWO_DAYS_MS;
                  return (
                    <div key={item.sku + i} className="marketplace-item-card group relative border-2 border-emerald-200 flex flex-col">
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <span className={`mini-badge ${item.grade === "A" ? "success" : item.grade === "B" ? "warning" : "danger"}`}>Grade {item.grade}</span>
                        {isReturnedProduct && (
                          <span className="flex items-center gap-1 text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow">
                            <RotateCcw className="w-2.5 h-2.5" /> Returned Product
                          </span>
                        )}
                      </div>
                      <div className="marketplace-item-image">
                        <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      <div className="p-4 flex flex-col flex-1 pt-8">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{item.brand}</div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</h3>
                        <div className="flex items-end justify-between mt-3 mb-3 border-t border-slate-100 pt-3">
                          <div>
                            <span className="text-emerald-600 font-extrabold text-lg font-mono">${item.price.toFixed(2)}</span>
                            <span className="text-slate-400 text-[10px] line-through ml-2">${item.originalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                        {isReturnedProduct && (
                          <div className="text-[10px] text-indigo-700 font-medium mb-3 bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex items-start gap-1.5">
                            <Award className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>Buying returned products earns you <strong>Green Credits</strong>.</span>
                          </div>
                        )}
                        <button
                          className="btn btn-primary w-full py-2.5 text-xs font-bold mt-auto shadow-sm"
                          onClick={() => openProductDetails(item, true)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <hr className="border-slate-200" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {marketplaceLoading ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <span className="spinner mb-3" />
                <div>Discovering local circular deals in {profileZip}...</div>
              </div>
            ) : (
              marketplaceFeed.map((item, i) => (
                <div key={i} className="marketplace-item-card group relative flex flex-col">
                  {item.trust < 40 && (
                    <div className="absolute top-2 right-2 bg-rose-100 text-rose-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-200 z-10 shadow-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> High Risk Seller
                    </div>
                  )}
                  <div className="marketplace-item-image">
                    <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-cover" alt={item.name} />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className={`mini-badge ${item.grade.startsWith("A") ? "success" : "warning"}`}>Grade {item.grade}</span>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      <span className="mini-badge bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><Leaf className="w-2.5 h-2.5" /> -{item.co2Saved}kg CO₂</span>
                      <span className="mini-badge bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1"><Map className="w-2.5 h-2.5" /> {item.distance} away</span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{item.brand}</div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</h3>

                    <div className="flex items-end justify-between mt-3 mb-4 border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-emerald-600 font-extrabold text-lg font-mono">${item.price.toFixed(2)}</span>
                        <span className="text-slate-400 text-[10px] line-through ml-2">${item.originalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-700 font-medium mb-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5 mt-auto">
                      <Award className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-500" />
                      <span><strong>Earn ${(item.price * (item.grade === "A" ? 0.03 : 0.05)).toFixed(2)} Cashback</strong> instantly.</span>
                    </div>

                    <button
                      className="btn btn-primary w-full py-2.5 text-xs font-bold mt-auto shadow-sm"
                      onClick={() => openProductDetails(item, true)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Product Details Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setSelectedProductDetails(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Image Section */}
            <div className="md:w-1/2 bg-slate-100 flex items-center justify-center relative p-6">
              <button onClick={() => setSelectedProductDetails(null)} className="absolute top-4 left-4 md:hidden w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-slate-500 z-10"><X className="w-5 h-5" /></button>
              <img src={getSKUReferenceImage(selectedProductDetails.sku)} alt={selectedProductDetails.name} className="w-full h-full object-contain max-h-64 md:max-h-full mix-blend-multiply drop-shadow-md" />
              {selectedProductDetails.isPreloved && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <span className={`mini-badge shadow-sm bg-white border border-slate-200 ${selectedProductDetails.grade?.startsWith("A") ? "text-emerald-600" : "text-amber-600"}`}>Grade {selectedProductDetails.grade}</span>
                  <span className="mini-badge shadow-sm bg-emerald-600 text-white border border-emerald-700 flex items-center gap-1"><Leaf className="w-3 h-3" /> -{selectedProductDetails.co2Saved || 8.5}kg CO₂</span>
                </div>
              )}
            </div>
            
            {/* Details Section */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedProductDetails.brand}</div>
                <button onClick={() => setSelectedProductDetails(null)} className="hidden md:flex text-slate-400 hover:text-slate-700 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <h2 className="text-2xl font-extrabold text-slate-800 leading-tight mb-2">{selectedProductDetails.name}</h2>
              
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                <span className="text-2xl font-extrabold text-emerald-600 font-mono">${selectedProductDetails.price.toFixed(2)}</span>
                {selectedProductDetails.isPreloved && selectedProductDetails.originalPrice && (
                  <span className="text-sm font-medium text-slate-400 line-through">${selectedProductDetails.originalPrice.toFixed(2)}</span>
                )}
                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-md ml-auto">SKU: {selectedProductDetails.sku}</span>
              </div>
              
              <div className="text-sm text-slate-600 leading-relaxed mb-6">
                {selectedProductDetails.description || "Experience the perfect blend of style and sustainability. This item has been verified for quality and authenticity."}
              </div>
              
              {/* Sizing Logic */}
              {(selectedProductDetails.category === "Apparel" || selectedProductDetails.category === "Footwear") && (
                <div className="mb-6 flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Select Size</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(selectedProductDetails.sizes || ["S", "M", "L", "XL"]).map((size: string) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-10 h-10 rounded-xl border text-sm font-bold flex items-center justify-center transition-all ${
                          selectedSize === size
                            ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-105"
                            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    onClick={() => routeToSizing(selectedProductDetails.sku)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-sm"
                  >
                    <Zap className="w-4 h-4 text-amber-500" /> Use AI Body Scanner for Perfect Fit
                  </button>
                </div>
              )}

              <div className="mt-auto pt-4">
                {selectedProductDetails.isPreloved && (
                   <div className="flex items-start gap-2 text-[10px] text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-3">
                     <Award className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                     <span>Earn <strong>Green Credits</strong> instantly when you buy this pre-loved item locally.</span>
                   </div>
                )}
                
                <button
                  className="btn btn-primary w-full py-3.5 text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddToCart}
                  disabled={(selectedProductDetails.category === "Apparel" || selectedProductDetails.category === "Footwear") && !selectedSize}
                >
                  <ShoppingBag className="w-4 h-4" />
                  {(selectedProductDetails.category === "Apparel" || selectedProductDetails.category === "Footwear") && !selectedSize 
                    ? "Select a Size to Add to Cart" 
                    : "Add to Cart"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

