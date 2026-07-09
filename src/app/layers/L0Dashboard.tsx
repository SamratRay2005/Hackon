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
  Shirt,
  Star,
  ChevronDown,
  Camera,
  Upload,
  ScanLine,
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
  const [selectedSize, setSelectedSize] = React.useState<string>("");

  // Catalog State
  const [localCatalogSearch, setLocalCatalogSearch] = React.useState("");
  const [quickAddProduct, setQuickAddProduct] = React.useState<any>(null);

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
    setSelectedSize("");
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
    setSelectedSize("");
    try {
      const confetti = (window as any).confetti;
      if (confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    } catch {}
    setActiveTab("cart");
  };

  const handleQuickAdd = (p: any, isPreloved: boolean = false) => {
    const needsSize = (p.category === "Apparel" || p.category === "Footwear") && p.sizes && p.sizes.length > 0;
    if (needsSize) {
      const catalogInfo = PRODUCT_CATALOG.find(x => x.sku === p.sku) || p;
      setQuickAddProduct({ ...catalogInfo, ...p, isPreloved });
      setSelectedSize("");
    } else {
      setShoppingBag((prev: any) => [
        ...prev,
        {
          id: Math.random().toString(36).substr(2, 9),
          sku: p.sku,
          name: p.name,
          price: p.price,
          grade: isPreloved ? (p.grade || "B") : "A",
          originalPrice: p.originalPrice || p.price,
          isPreloved: !!isPreloved,
        }
      ]);
      try {
        const confetti = (window as any).confetti;
        if (confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      } catch {}
      setActiveTab("cart");
    }
  };

  return (
    <div className="flex flex-col gap-5 relative">
      <HeroCarousel onShopNow={(sku: string) => {
        const item = PRODUCT_CATALOG.find(p => p.sku === sku);
        if (item) openProductDetails(item, false);
      }} />

      {/* Promotional Banners */}
      {!searchQuery && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 mb-2">
          <img src="/header1.jpg" alt="Shop books" className="w-full aspect-[2/1] md:aspect-auto h-full rounded-md shadow-sm object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-200" onClick={() => setSearchQuery("Planner")} />
          <img src="/header2.jpg" alt="Gamers essentials" className="w-full aspect-[2/1] md:aspect-auto h-full rounded-md shadow-sm object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-200" onClick={() => setSearchQuery("Game")} />
          <img src="/header3.jpg" alt="Kitchen favorites" className="w-full aspect-[2/1] md:aspect-auto h-full rounded-md shadow-sm object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-200" onClick={() => setSearchQuery("Kitchen")} />
          <img src="/header4.jpg" alt="Lunar new year deals" className="w-full aspect-[2/1] md:aspect-auto h-full rounded-md shadow-sm object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-200" onClick={() => setSearchQuery("Apparel")} />
          <img src="/header5.jpg" alt="Beauty products" className="w-full aspect-[2/1] md:aspect-auto h-full rounded-md shadow-sm object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-200" onClick={() => setSearchQuery("Other")} />
          <img src="/header6.jpg" alt="New arrivals in Toys" className="w-full aspect-[2/1] md:aspect-auto h-full rounded-md shadow-sm object-cover cursor-pointer hover:opacity-90 transition-opacity border border-slate-200" onClick={() => setSearchQuery("Toy")} />
        </div>
      )}

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
        <div style={{marginBottom: "12px", display:"flex", alignItems:"center", gap:"16px", background: "#f0f2f2", padding: "8px 12px", borderRadius: "4px", border: "1px solid #D5D9D9"}}>
          <button onClick={() => setSearchQuery("")} className="text-[15px] font-bold text-[#007185] hover:text-[#c45500] hover:underline flex items-center gap-1.5" style={{letterSpacing: "0.02em"}}>
            <span style={{fontSize: "18px", lineHeight: 1}}>←</span> Back to Home
          </button>
          <div style={{height: "24px", width: "1px", background: "#DDD"}}></div>
          <h2 style={{fontSize:"18px", fontWeight:700, color:"#0F1111"}}>Search Results for "{searchQuery}"</h2>
        </div>
      )}

      {(shopTab === "catalog" || searchQuery) && (
        <div className="glass-card flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px"}}>
            <h2 style={{fontSize:"20px", fontWeight:700, color:"#0F1111"}}>Amazon Catalog</h2>
            <span style={{fontSize:"12px", background:"#007185", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>Brand New</span>
          </div>
          
          <div className="relative mb-2 w-full max-w-2xl">
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
                       <span className="text-[#007185] text-sm">{(p.reviewScore || 4.1).toFixed(1)}</span>
                       <div className="flex text-[#DE7921] text-sm leading-none">
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4" />
                       </div>
                       <ChevronDown className="w-3 h-3 text-[#565959]" />
                       <span className="text-sm text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">({(p.reviewCount || Math.random() * 5 + 1).toFixed(1)}k)</span>
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
                    className="w-full mt-auto h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-sm text-sm transition-colors flex items-center justify-center font-medium"
                    onClick={() => handleQuickAdd(p, false)}
                  >
                    Add to cart
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

          <div className="relative mb-2 w-full max-w-2xl">
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
                             <span className="text-[#007185] text-sm">{(item.reviewScore || 4.1).toFixed(1)}</span>
                             <div className="flex text-[#DE7921] text-sm leading-none">
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4" />
                             </div>
                             <ChevronDown className="w-3 h-3 text-[#565959]" />
                             <span className="text-sm text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">{(item.reviewCount || Math.random() * 5 + 1).toFixed(1)}k</span>
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
                          className="w-full mt-auto h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-sm text-sm transition-colors flex items-center justify-center font-medium"
                          onClick={() => handleQuickAdd(item, true)}
                        >
                          Add to cart
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
                         <span className="text-[#007185] text-sm">{(item.reviewScore || 4.1).toFixed(1)}</span>
                         <div className="flex text-[#DE7921] text-sm leading-none">
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4" />
                         </div>
                         <ChevronDown className="w-3 h-3 text-[#565959]" />
                         <span className="text-sm text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">{(item.reviewCount || Math.random() * 5 + 1).toFixed(1)}k</span>
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
                      className="w-full mt-auto h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-sm text-sm transition-colors flex items-center justify-center font-medium"
                      onClick={() => handleQuickAdd(item, true)}
                    >
                      Add to cart
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={() => setSelectedProductDetails(null)}>
          <div className="bg-white shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]" style={{borderRadius:"8px"}} onClick={e => e.stopPropagation()}>
            {/* Image Section */}
            <div className="md:w-1/2 flex items-center justify-center relative p-8 bg-white" style={{borderRight:"1px solid #DDD"}}>
              <button onClick={() => setSelectedProductDetails(null)} className="absolute top-4 left-4 md:hidden text-slate-500"><X className="w-6 h-6" /></button>
              <img src={getSKUReferenceImage(selectedProductDetails.sku)} alt={selectedProductDetails.name} className="w-full h-full object-contain mix-blend-multiply" />
              {selectedProductDetails.isPreloved && (
                <div className="absolute bottom-6 left-6 flex gap-2">
                  <span className={`text-[11px] font-bold px-2 py-1 rounded shadow-sm ${selectedProductDetails.grade?.startsWith("A") ? "bg-[#007600] text-white" : "bg-[#E47911] text-white"}`}>Grade {selectedProductDetails.grade}</span>
                  <span className="text-[11px] font-bold px-2 py-1 rounded shadow-sm bg-[#007185] text-white flex items-center gap-1"><Leaf className="w-3 h-3" /> -{selectedProductDetails.co2Saved || 8.5}kg CO₂</span>
                </div>
              )}
            </div>
            
            {/* Details Section */}
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto bg-white">
              <div className="flex justify-between items-start mb-1">
                <div className="text-[13px] text-[#007185] hover:text-[#c45500] hover:underline cursor-pointer">Visit the {selectedProductDetails.brand} Store</div>
                <button onClick={() => setSelectedProductDetails(null)} className="hidden md:flex text-slate-500 hover:text-slate-800"><X className="w-6 h-6" /></button>
              </div>
              
              <h2 className="text-[22px] text-[#0F1111] leading-tight mb-2 font-medium">{selectedProductDetails.name}</h2>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[#DE7921] text-[15px] leading-none">★★★★☆</span> 
                <span className="text-[13px] text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">{(Math.random() * 5 + 1).toFixed(1)}k ratings</span>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded ml-auto border border-slate-200">SKU: {selectedProductDetails.sku}</span>
              </div>
              
              <hr className="border-slate-200 mb-4" />

              <div className="flex items-end gap-2 mb-2">
                 <div className="flex items-start text-[#B12704]">
                   <span className="text-sm font-normal mt-[3px] mr-[1px]">$</span>
                   <span className="text-[32px] font-medium leading-none">{Math.floor(selectedProductDetails.price)}</span>
                   <span className="text-sm font-normal mt-[3px] ml-[1px]">{(selectedProductDetails.price % 1).toFixed(2).substring(2)}</span>
                 </div>
                 {selectedProductDetails.isPreloved && selectedProductDetails.originalPrice && (
                   <div className="flex flex-col mb-1.5 ml-2">
                     <span className="text-[#565959] text-[13px]">List Price: <span className="line-through">${selectedProductDetails.originalPrice.toFixed(2)}</span></span>
                   </div>
                 )}
              </div>
              <div className="text-[14px] text-[#565959] mb-4">
                <span className="text-[#007600] font-medium">{selectedProductDetails.isPreloved ? "Available Now." : "In Stock."}</span> FREE delivery for Prime members.
              </div>

              <div className="text-[14px] text-[#0F1111] leading-relaxed mb-6">
                {selectedProductDetails.description || "Experience the perfect blend of style and sustainability. This item has been verified for quality and authenticity."}
              </div>

              {/* AI Certificate for Pre-loved Items */}
              {selectedProductDetails.isPreloved && (
                <div className="mb-6 bg-[#F0F8FA] border border-[#007185] rounded-lg p-4 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3 relative z-10">
                    <CheckCircle className="w-5 h-5 text-[#007185]" />
                    <h3 className="font-bold text-[#0F1111] text-[14px]">
                      Amazon AI Certified: Grade {selectedProductDetails.grade || "B"}
                    </h3>
                  </div>
                  
                  <div className="flex flex-col gap-2 text-[13px] text-[#0F1111] relative z-10 bg-white p-3 rounded border border-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="font-bold w-24 flex-shrink-0">Screen:</span>
                      <span>No scratches detected by AI.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold w-24 flex-shrink-0">Body:</span>
                      <span>Minor scuff on the back left corner.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold w-24 flex-shrink-0">Functionality:</span>
                      <span>Passed all diagnostic tests.</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2 relative z-10 text-[12px] font-bold text-[#007185]">
                    <Award className="w-4 h-4" /> Backed by Amazon's 30-Day Money-Back Guarantee
                  </div>
                </div>
              )}
              
              {/* Sizing Logic */}
              {(selectedProductDetails.category === "Apparel" || selectedProductDetails.category === "Footwear") && (
                <div className="mb-6 flex flex-col gap-3">
                  <div className="text-[14px] font-bold text-[#0F1111] flex items-center gap-1.5">
                    Size: {selectedSize ? <span className="font-normal text-[#0F1111]">{selectedSize}</span> : <span className="text-[#B12704] font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Select a size</span>}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(selectedProductDetails.sizes || ["S", "M", "L", "XL"]).map((size: string) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[44px] px-3 h-10 rounded-md text-[14px] flex items-center justify-center transition-all shadow-sm ${
                          selectedSize === size
                            ? "bg-[#F3F8F9] text-[#0F1111] border-[2px] border-[#007185] font-bold"
                            : "bg-white text-[#0F1111] border border-[#D5D9D9] hover:bg-[#F7F8F8] font-medium"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center py-2 mt-2">
                    <div className="flex-grow border-t border-[#D5D9D9]"></div>
                    <span className="flex-shrink-0 mx-4 text-[12px] text-[#565959] uppercase tracking-wider font-semibold">or</span>
                    <div className="flex-grow border-t border-[#D5D9D9]"></div>
                  </div>

                  <button
                    onClick={() => routeToSizing(selectedProductDetails.sku)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md border border-[#D5D9D9] bg-white hover:bg-[#F7F8F8] text-[#0F1111] text-[13px] font-medium transition-all shadow-sm"
                  >
                    <Zap className="w-4 h-4 text-[#007185]" /> Use AI Body Scanner for Perfect Fit
                  </button>
                </div>
              )}

              <div className="mt-auto pt-2">
                {selectedProductDetails.isPreloved && (
                   <div className="flex items-start gap-2 text-[12px] text-[#0F1111] bg-[#F3F8F9] p-3 border border-[#007185] rounded-md mb-4 shadow-sm">
                     <Award className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#007185]" />
                     <span>Earn <strong className="text-[#007185]">Green Credits</strong> instantly when you buy this pre-loved item locally.</span>
                   </div>
                )}
                
                <button
                  className="w-full py-3 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-md shadow-[0_1px_2px_rgba(15,17,17,0.15)] hover:shadow-[0_2px_5px_rgba(15,17,17,0.2)] active:scale-[0.99] text-[14px] font-semibold flex items-center justify-center transition-all disabled:opacity-50 disabled:bg-[#F7F8F8] disabled:border-[#D5D9D9] disabled:text-[#565959] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleAddToCart}
                  disabled={(selectedProductDetails.category === "Apparel" || selectedProductDetails.category === "Footwear") && !selectedSize}
                >
                  {(selectedProductDetails.category === "Apparel" || selectedProductDetails.category === "Footwear") && !selectedSize 
                    ? "Select a Size to Add to Cart" 
                      : "Add to Cart"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {quickAddProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[520px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-bold text-[#0F1111]">Select Size & Add to Cart</h2>
              <button onClick={() => setQuickAddProduct(null)} className="text-gray-400 hover:text-black transition-colors p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Info */}
            <div className="flex gap-5 px-6 py-5 bg-[#FAFAFA] border-b border-gray-100">
              <div className="w-[100px] h-[100px] flex-shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                <img src={getSKUReferenceImage(quickAddProduct.sku)} alt={quickAddProduct.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col justify-center flex-1 gap-1">
                <h3 className="text-[15px] font-bold text-[#0F1111] leading-snug line-clamp-2">{quickAddProduct.name}</h3>
                <div className="text-[13px] text-[#565959]">
                  Colour: <span className="font-semibold text-[#0F1111]">{quickAddProduct.colors?.[0] || "Default"}</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[12px] text-[#B12704] leading-none">$</span>
                  <span className="text-[24px] text-[#B12704] font-medium leading-none">{Math.floor(quickAddProduct.price)}</span>
                  <span className="text-[12px] text-[#B12704]">.{(quickAddProduct.price % 1).toFixed(2).substring(2)}</span>
                  <span className="text-[12px] text-[#007600] font-medium ml-2">FREE Returns</span>
                </div>
                <div className="text-[12px] text-[#565959]">Prime <span className="text-[#007185] font-medium">FREE Delivery</span> Today</div>
                <div className="text-[12px] text-[#007185] hover:underline cursor-pointer font-medium mt-0.5">See all item details</div>
              </div>
            </div>

            {/* Size + AI Body */}
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Size label */}
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold text-[#0F1111]">
                  Size:&nbsp;
                  {selectedSize
                    ? <span className="text-[#007185]">{selectedSize} selected ✓</span>
                    : <span className="font-normal text-[#565959]">please select</span>
                  }
                </div>
              </div>

              {/* Size Buttons */}
              <div id="quick-add-sizes" className="flex flex-wrap gap-2 p-2 rounded-lg transition-all">
                {quickAddProduct.sizes.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s === selectedSize ? "" : s)}
                    className={`min-w-[54px] h-11 px-4 rounded-md border text-[14px] transition-all flex items-center justify-center ${
                      selectedSize === s
                        ? 'border-[#007185] ring-1 ring-[#007185] bg-[#F0F8FA] text-[#0F1111] font-bold shadow-sm'
                        : 'border-[#D5D9D9] bg-white text-[#0F1111] hover:border-[#007185] hover:bg-[#F7FAFA] font-medium'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {!selectedSize && (
                <div className="text-[12px] text-[#565959]">👆 Tap a size, or use AI to find your perfect fit below</div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-[#E3E6E6]" />
                <span className="text-[11px] text-[#888C8C] uppercase tracking-widest font-bold">or</span>
                <div className="flex-1 border-t border-[#E3E6E6]" />
              </div>

              {/* AI Scanner Row */}
              <button
                onClick={() => { setQuickAddProduct(null); routeToSizing(quickAddProduct.sku); }}
                className="flex items-center gap-3 w-full py-3 px-4 rounded-lg border border-[#D5D9D9] bg-white hover:bg-[#F7F8F8] text-left transition-all group"
              >
                <div className="w-9 h-9 rounded-full bg-[#F0F8FA] border border-[#BEE3F0] flex items-center justify-center flex-shrink-0 group-hover:bg-[#E0F4F8] transition-colors">
                  <Zap className="w-4 h-4 text-[#007185]" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-[#0F1111]">Use AI Body Scanner</div>
                  <div className="text-[12px] text-[#565959]">Get your perfect size from a selfie — 68% fewer returns</div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#888C8C] -rotate-90 flex-shrink-0" />
              </button>

            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-[#FAFAFA]">
              <button
                onClick={() => setQuickAddProduct(null)}
                className="flex-1 py-2.5 bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] rounded-full text-[13px] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedSize) {
                    // Flash the size section to prompt user
                    const sizeSection = document.getElementById("quick-add-sizes");
                    if (sizeSection) {
                      sizeSection.style.transition = "background 0.1s";
                      sizeSection.style.background = "#FFF3CD";
                      setTimeout(() => { sizeSection.style.background = ""; }, 600);
                    }
                    return;
                  }
                  setShoppingBag((prev: any) => [
                    ...prev,
                    {
                      id: Math.random().toString(36).substr(2, 9),
                      sku: quickAddProduct.sku,
                      name: quickAddProduct.name,
                      price: quickAddProduct.price,
                      grade: quickAddProduct.isPreloved ? (quickAddProduct.grade || "B") : "A",
                      originalPrice: quickAddProduct.originalPrice || quickAddProduct.price,
                      size: selectedSize,
                      isPreloved: !!quickAddProduct.isPreloved,
                    }
                  ]);
                  setQuickAddProduct(null);
                  try {
                    const confetti = (window as any).confetti;
                    if (confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
                  } catch {}
                  setActiveTab("cart");
                }}
                className="flex-[2] py-2.5 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded-full text-[13px] font-bold transition-colors"
              >
                {selectedSize ? `Add Size ${selectedSize} to Cart` : "Add to cart"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


