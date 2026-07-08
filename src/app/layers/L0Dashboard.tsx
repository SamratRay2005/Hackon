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
  const [localCatalogSearch, setLocalCatalogSearch] = React.useState("");

  const filteredCatalog = PRODUCT_CATALOG.filter(p => {
    const activeSearch = searchQuery || localCatalogSearch;
    if (!activeSearch) return true;
    const q = activeSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
  }).slice(0, 30); // show 30 items max

  // Preloved State
  const [marketplaceFeed, setMarketplaceFeed] = React.useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = React.useState(false);
  const [marketSearch, setMarketSearch] = React.useState("");

  useEffect(() => {
    if (profileUserId && profileZip) {
      if (shopTab === "preloved" || searchQuery) {
        const timer = setTimeout(() => {
          fetchMarketplaceFeed(searchQuery || marketSearch);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [profileUserId, profileZip, marketSearch, searchQuery, shopTab]);

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
  const activeResale = resaleListings.filter((r: any) => {
    if ((now - r.addedToStoreAt) >= SEVEN_DAYS_MS) return false;
    const activeSearch = searchQuery || marketSearch;
    if (!activeSearch) return true;
    const q = activeSearch.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q) || r.brand?.toLowerCase().includes(q);
  });

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
      {!searchQuery && (
        <div style={{display:"flex", gap:"16px", borderBottom:"1px solid #DDD", paddingBottom:"0px", marginBottom:"8px", overflowX:"auto"}}>
          <button
            onClick={() => setShopTab("catalog")}
            style={{padding:"8px 12px", fontSize:"14px", fontWeight: shopTab === "catalog" ? 700 : 400, color: shopTab === "catalog" ? "#0F1111" : "#007185", borderBottom: shopTab === "catalog" ? "2px solid #E47911" : "2px solid transparent", whiteSpace:"nowrap", cursor:"pointer", background:"none"}}
          >
            Amazon Catalog (New)
          </button>
          <button
            onClick={() => setShopTab("preloved")}
            style={{padding:"8px 12px", fontSize:"14px", fontWeight: shopTab === "preloved" ? 700 : 400, color: shopTab === "preloved" ? "#0F1111" : "#007185", borderBottom: shopTab === "preloved" ? "2px solid #E47911" : "2px solid transparent", whiteSpace:"nowrap", cursor:"pointer", background:"none"}}
          >
            Shop Pre-Loved
          </button>
        </div>
      )}

      {searchQuery && (
        <div style={{marginBottom: "8px"}}>
          <h2 style={{fontSize:"20px", fontWeight:700, color:"#0F1111"}}>Search Results for "{searchQuery}"</h2>
        </div>
      )}

      {(shopTab === "catalog" || searchQuery) && (
        <div className="glass-card flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px"}}>
            <h2 style={{fontSize:"20px", fontWeight:700, color:"#0F1111"}}>Amazon Catalog</h2>
            <span style={{fontSize:"12px", background:"#007185", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>Brand New</span>
          </div>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              style={{width:"100%", background:"#FFF", border:"1px solid #888C8C", borderRadius:"4px", padding:"8px 10px 8px 32px", fontSize:"14px", color:"#0F1111", outline:"none"}}
              placeholder="Search 150+ products..."
              value={localCatalogSearch}
              onChange={e => {
                setLocalCatalogSearch(e.target.value);
                if (searchQuery) setSearchQuery("");
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatalog.map((p) => (
              <div key={p.sku} className="marketplace-item-card group relative flex flex-col" style={{border:"1px solid #DDD", borderRadius:"4px", overflow:"hidden"}}>
                <div className="marketplace-item-image" style={{background:"#F7F7F7", padding:"16px"}}>
                  <img src={getSKUReferenceImage(p.sku)} className="w-full h-full object-contain mix-blend-multiply" alt={p.name} />
                </div>
                <div className="p-4 flex flex-col flex-1 bg-white gap-1.5 text-left">
                  <div className="text-[11px] text-[#565959] uppercase tracking-wide">{p.brand}</div>
                  <h3 className="text-base font-bold text-[#0F1111] leading-snug line-clamp-2 hover:text-[#c45500] cursor-pointer" onClick={() => openProductDetails(p, false)}>{p.name}</h3>
                  <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1">
                       <span className="text-[#DE7921] text-base leading-none">★★★★☆</span> 
                       <span className="text-sm text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">{(Math.random() * 5 + 1).toFixed(1)}k</span>
                     </div>
                     <span className="bg-[#232F3E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Prime</span>
                  </div>
                  <div className="flex items-end gap-2 mt-1">
                     <div className="flex items-start text-[#0F1111]">
                       <span className="text-sm font-normal mt-[2px] mr-[1px]">$</span>
                       <span className="text-[28px] font-normal leading-none">{Math.floor(p.price)}</span>
                       <span className="text-sm font-normal mt-[2px] ml-[1px]">{(p.price % 1).toFixed(2).substring(2)}</span>
                     </div>
                     <div className="flex flex-col mb-0.5">
                       <span className="text-[#565959] text-xs">Typical: <span className="line-through">${(p.price * 1.2).toFixed(2)}</span></span>
                     </div>
                  </div>
                  <div className="text-xs text-[#565959] mb-2 leading-relaxed">
                    <span className="text-[#007600] font-medium">In Stock.</span> FREE delivery on qualifying orders.
                  </div>
                  
                  <button
                    className="w-full mt-auto h-10 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#a88734] text-[#111] rounded shadow-sm text-sm transition-colors flex items-center justify-center"
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

      {(shopTab === "preloved" || searchQuery) && (
        <div className="glass-card flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px"}}>
            <h2 style={{fontSize:"20px", fontWeight:700, color:"#0F1111"}}>Shop Pre-Loved — Buy Near You</h2>
            <span style={{fontSize:"12px", background:"#C7511F", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>Local Feed</span>
          </div>
          
          <div style={{border:"1px solid #007185", background:"#F0F8FA", padding:"12px", borderRadius:"4px", fontSize:"13px", color:"#0F1111", display:"flex", alignItems:"start", gap:"8px", marginBottom:"8px"}}>
            <ShoppingBag className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#007185]" />
            <span>Items shown below have been returned by users within a 100km radius. By purchasing locally, you earn Green Credits and save shipping emissions.</span>
          </div>

          <div className="relative mb-2">
            <input
              type="text"
              placeholder="Search Pre-Loved items..."
              value={marketSearch}
              onChange={(e) => {
                setMarketSearch(e.target.value);
                if (searchQuery) setSearchQuery("");
              }}
              style={{width:"100%", background:"#FFF", border:"1px solid #888C8C", borderRadius:"4px", padding:"8px 10px 8px 32px", fontSize:"14px", color:"#0F1111", outline:"none"}}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                    <div key={item.sku + i} className="marketplace-item-card group relative flex flex-col" style={{border:"2px solid #E47911", borderRadius:"4px", overflow:"hidden"}}>
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <span style={{background:"#CC0C39", color:"#FFF", fontSize:"11px", fontWeight:700, padding:"2px 6px", borderRadius:"2px"}}>Grade {item.grade}</span>
                        {isReturnedProduct && (
                          <span style={{background:"#007185", color:"#FFF", fontSize:"11px", fontWeight:700, padding:"2px 6px", borderRadius:"2px", display:"flex", alignItems:"center", gap:"2px"}}>
                            <RotateCcw className="w-2.5 h-2.5" /> Returned
                          </span>
                        )}
                      </div>
                      <div className="marketplace-item-image" style={{background:"#F7F7F7", padding:"16px"}}>
                        <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-contain mix-blend-multiply" alt={item.name} />
                      </div>
                      <div className="p-4 flex flex-col flex-1 bg-white gap-1.5 text-left">
                        <div className="text-[11px] text-[#565959] uppercase tracking-wide">{item.brand}</div>
                        <h3 className="text-base font-bold text-[#0F1111] leading-snug line-clamp-2 hover:text-[#c45500] cursor-pointer" onClick={() => openProductDetails(item, true)}>{item.name}</h3>
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-1">
                             <span className="text-[#DE7921] text-base leading-none">★★★★☆</span> 
                             <span className="text-sm text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">{(Math.random() * 5 + 1).toFixed(1)}k</span>
                           </div>
                           <span className="bg-[#007185] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Certified</span>
                        </div>
                        <div className="flex items-end gap-2 mt-1">
                           <div className="flex items-start text-[#B12704]">
                             <span className="text-sm font-normal mt-[2px] mr-[1px]">$</span>
                             <span className="text-[28px] font-normal leading-none">{Math.floor(item.price)}</span>
                             <span className="text-sm font-normal mt-[2px] ml-[1px]">{(item.price % 1).toFixed(2).substring(2)}</span>
                           </div>
                           <div className="flex flex-col mb-0.5">
                             <span className="text-[#565959] text-xs">New: <span className="line-through">${item.originalPrice.toFixed(2)}</span></span>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1 mb-2">
                          <div className="text-xs text-[#565959] leading-relaxed">
                            <span className="text-[#007600] font-medium">Available Now.</span> Ready for local pickup or fast delivery.
                          </div>
                          {isReturnedProduct && (
                            <div className="text-xs text-[#007600] flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" /> Earn ${(item.price * 0.05).toFixed(2)} Cashback
                            </div>
                          )}
                        </div>
                        <button
                          className="w-full mt-auto h-10 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#a88734] text-[#111] rounded shadow-sm text-sm transition-colors flex items-center justify-center"
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
                <div key={i} className="marketplace-item-card group relative flex flex-col" style={{border:"1px solid #DDD", borderRadius:"4px", overflow:"hidden"}}>
                  {item.trust < 40 && (
                    <div className="absolute top-2 right-2 bg-rose-100 text-rose-700 text-[9px] font-bold px-2 py-0.5 border border-rose-200 z-10 shadow-sm flex items-center gap-1" style={{borderRadius:"2px"}}>
                      <AlertTriangle className="w-3 h-3" /> High Risk Seller
                    </div>
                  )}
                  <div className="marketplace-item-image" style={{background:"#F7F7F7", padding:"16px"}}>
                    <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-contain mix-blend-multiply" alt={item.name} />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span style={{background:item.grade.startsWith("A") ? "#007600" : "#E47911", color:"#FFF", fontSize:"11px", fontWeight:700, padding:"2px 6px", borderRadius:"2px"}}>Grade {item.grade}</span>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 bg-white gap-1.5 text-left">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-[#007185] flex items-center gap-1"><Leaf className="w-3 h-3" /> -{item.co2Saved}kg CO₂</span>
                      <span className="text-xs text-[#565959] flex items-center gap-1"><Map className="w-3 h-3" /> {item.distance}</span>
                    </div>

                    <div className="text-[11px] text-[#565959] uppercase tracking-wide">{item.brand}</div>
                    <h3 className="text-base font-bold text-[#0F1111] leading-snug line-clamp-2 hover:text-[#c45500] cursor-pointer" onClick={() => openProductDetails(item, true)}>{item.name}</h3>

                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1">
                         <span className="text-[#DE7921] text-base leading-none">★★★★☆</span> 
                         <span className="text-sm text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">{(Math.random() * 5 + 1).toFixed(1)}k</span>
                       </div>
                       <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Local</span>
                    </div>

                    <div className="flex flex-col mt-1 gap-1">
                       <div className="flex items-end gap-2">
                         <div className="flex items-start text-[#B12704]">
                           <span className="text-sm font-normal mt-[2px] mr-[1px]">$</span>
                           <span className="text-[28px] font-normal leading-none">{Math.floor(item.price)}</span>
                           <span className="text-sm font-normal mt-[2px] ml-[1px]">{(item.price % 1).toFixed(2).substring(2)}</span>
                         </div>
                         <div className="flex flex-col mb-0.5">
                           <span className="text-[#565959] text-xs">New: <span className="line-through">${item.originalPrice.toFixed(2)}</span></span>
                         </div>
                       </div>

                       <div className="flex flex-col gap-1 mb-2">
                         <div className="text-xs text-[#565959] leading-relaxed">
                           <span className="text-[#007600] font-medium">In Stock locally.</span> Available for immediate pickup.
                         </div>
                         <div className="text-xs text-[#007600] flex items-start gap-1">
                           <Award className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                           <span><strong>Earn ${(item.price * (item.grade === "A" ? 0.03 : 0.05)).toFixed(2)} Cashback</strong> instantly.</span>
                         </div>
                       </div>
                    </div>

                    <button
                      className="w-full mt-auto h-10 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#a88734] text-[#111] rounded shadow-sm text-sm transition-colors flex items-center justify-center"
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

              {/* AI Certificate for Pre-loved Items */}
              {selectedProductDetails.isPreloved && (
                <div className="mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-emerald-900 text-sm">
                      Amazon AI Certified: Grade {selectedProductDetails.grade || "B"}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 text-xs text-slate-700 relative z-10 bg-white/60 p-3 rounded-xl border border-emerald-100/50">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 w-24 flex-shrink-0">Screen:</span>
                      <span>No scratches detected by AI.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 w-24 flex-shrink-0">Body:</span>
                      <span>Minor scuff on the back left corner.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-900 w-24 flex-shrink-0">Functionality:</span>
                      <span>Passed all diagnostic tests.</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-2 relative z-10">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Backed by Amazon's 30-Day Money-Back Guarantee</span>
                  </div>
                </div>
              )}
              
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

