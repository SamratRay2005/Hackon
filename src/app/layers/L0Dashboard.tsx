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
  ChevronRight,
  Camera,
  Upload,
  ScanLine,
  Trash2,
  Plus,
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
    shoppingBag,
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
            {filteredCatalog.map((p) => {
              const ratingCount = ((p.sku.length * 113) % 4000) + 120;
              const isBestSeller = (p.sku.length + Math.floor(p.price)) % 10 > 5;
              const isAmazonChoice = !isBestSeller && (p.sku.length + Math.floor(p.price)) % 10 > 2;
              const isLimitedTime = (p.sku.length + Math.floor(p.price)) % 10 < 5;
              const boughtPastMonth = ((p.sku.length * 7) % 9) + 1;
              const countInCart = shoppingBag?.filter((b: any) => b.sku === p.sku).length || 0;

              return (
              <div key={p.sku} className="marketplace-item-card group relative flex flex-col" style={{border:"1px solid #DDD", borderRadius:"4px", overflow:"hidden"}}>
                {/* Badges */}
                <div className="absolute top-0 left-0 z-10 flex flex-col gap-1 w-full">
                  {isBestSeller && (
                    <div className="bg-[#E67A00] text-white text-[12px] px-2 py-1 inline-block self-start shadow-sm whitespace-nowrap">
                      Best seller
                    </div>
                  )}
                  {isAmazonChoice && (
                    <div className="bg-[#232F3E] text-white text-[12px] px-2 py-1 inline-block self-start shadow-sm whitespace-nowrap">
                      Amazon's Choice
                    </div>
                  )}
                </div>

                <div className="marketplace-item-image" style={{background:"#F7F7F7", padding:"16px", paddingTop: "40px"}}>
                  <img src={getSKUReferenceImage(p.sku)} className="w-full h-full object-contain mix-blend-multiply" alt={p.name} />
                </div>
                <div className="p-4 flex flex-col flex-1 bg-white gap-1.5 text-left">
                  <h3 className="text-[15px] font-medium text-[#0F1111] leading-snug line-clamp-2 hover:text-[#c45500] cursor-pointer" onClick={() => openProductDetails(p, false)}>{p.name}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                     <div className="flex items-center gap-0.5">
                       <span className="text-[#0F1111] text-[13px] font-bold">{(p.reviewScore || 4.1).toFixed(1)}</span>
                       <div className="flex text-[#DE7921] text-sm leading-none">
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4 fill-current stroke-current" />
                         <Star className="w-4 h-4" />
                       </div>
                       <ChevronDown className="w-3 h-3 text-[#565959]" />
                       <span className="text-[13px] text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">({ratingCount})</span>
                     </div>
                  </div>
                  <div className="text-[13px] text-[#565959]">{boughtPastMonth}K+ bought in past month</div>

                  {isLimitedTime && (
                    <div className="bg-[#CC0C39] text-white text-[11px] px-2 py-1 rounded-sm self-start mt-1 mb-1 font-bold">
                      Limited time deal
                    </div>
                  )}

                  <div className="flex items-end gap-1.5 mt-1">
                     <div className="flex items-start text-[#0F1111]">
                       <span className="text-[12px] font-normal mt-[3px] mr-[1px]">$</span>
                       <span className="text-[28px] font-medium leading-none">{Math.floor(p.price)}</span>
                       <span className="text-[12px] font-normal mt-[3px] ml-[1px]">{(p.price % 1).toFixed(2).substring(2)}</span>
                     </div>
                     <span className="text-[12px] text-[#565959] mb-1">M.R.P: <span className="line-through">${(p.price * 1.2).toFixed(2)}</span> (16% off)</span>
                  </div>

                  {/* Prime icon */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[#FF9900] text-[13px] font-bold">✓</span>
                    <img src="/prime-logo-2.png" alt="Prime" style={{ height: "14px", objectFit: "contain", mixBlendMode: "multiply" }} />
                    <span className="text-[13px] text-[#0F1111]">FREE delivery <span className="font-bold">Tomorrow</span></span>
                  </div>
                  
                  <div className="mt-auto pt-3">
                    {countInCart > 0 ? (
                      <div className="w-full flex items-center h-9" style={{ border: "2px solid #FFD814", borderRadius: "100px", overflow: "hidden", background: "white" }}>
                        <button
                          className="flex items-center justify-center hover:bg-[#FFF3CD] transition-colors h-full px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShoppingBag((prev: any) => {
                              const items = [...prev];
                              const idx = items.map((b: any, i: number) => b.sku === p.sku ? i : -1).filter((i: number) => i >= 0).pop() ?? -1;
                              if (idx !== -1) items.splice(idx, 1);
                              return items;
                            });
                          }}
                        ><Trash2 className="w-4 h-4 text-[#0F1111]" /></button>
                        <span className="flex-1 text-center text-[14px] font-bold text-[#0F1111]">
                          {countInCart} in cart
                        </span>
                        <button
                          className="flex items-center justify-center hover:bg-[#FFF3CD] transition-colors h-full px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShoppingBag((prev: any) => [...prev, { id: Math.random().toString(36).substr(2, 9), sku: p.sku, name: p.name, price: p.price, grade: "A", originalPrice: p.price, size: p.sizes?.[0] || "M", isPreloved: false }]);
                          }}
                        ><Plus className="w-4 h-4 text-[#0F1111]" /></button>
                      </div>
                    ) : (
                      <button
                        className="w-full h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-[0_1px_2px_rgba(15,17,17,0.15)] hover:shadow-[0_2px_5px_rgba(15,17,17,0.2)] active:scale-[0.99] text-sm transition-all flex items-center justify-center font-medium"
                        onClick={() => handleQuickAdd(p, false)}
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )})}
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
                  const ratingCount = ((item.sku.length * 113) % 4000) + 120;
                  const boughtPastMonth = ((item.sku.length * 7) % 9) + 1;
                  const countInCart = shoppingBag?.filter((b: any) => b.sku === item.sku && b.isPreloved).length || 0;
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
                      <div className="marketplace-item-image" style={{background:"#F7F7F7", padding:"16px", paddingTop: "40px"}}>
                        <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-contain mix-blend-multiply" alt={item.name} />
                      </div>
                      <div className="p-4 flex flex-col flex-1 bg-white gap-1.5 text-left">
                        <h3 className="text-[15px] font-medium text-[#0F1111] leading-snug line-clamp-2 hover:text-[#c45500] cursor-pointer" onClick={() => openProductDetails(item, true)}>{item.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                           <div className="flex items-center gap-0.5">
                             <span className="text-[#0F1111] text-[13px] font-bold">{(item.reviewScore || 4.1).toFixed(1)}</span>
                             <div className="flex text-[#DE7921] text-sm leading-none">
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4 fill-current stroke-current" />
                               <Star className="w-4 h-4" />
                             </div>
                             <ChevronDown className="w-3 h-3 text-[#565959]" />
                             <span className="text-[13px] text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">({ratingCount})</span>
                           </div>
                           <span className="bg-[#007185] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Certified Local</span>
                        </div>
                        <div className="text-[13px] text-[#565959]">{boughtPastMonth}K+ bought in past month</div>
                        
                        <div className="flex items-end gap-1.5 mt-1">
                           <div className="flex items-start text-[#B12704]">
                             <span className="text-[12px] font-normal mt-[3px] mr-[1px]">$</span>
                             <span className="text-[28px] font-medium leading-none">{Math.floor(item.price)}</span>
                             <span className="text-[12px] font-normal mt-[3px] ml-[1px]">{(item.price % 1).toFixed(2).substring(2)}</span>
                           </div>
                           <span className="text-[12px] text-[#565959] mb-1">M.R.P: <span className="line-through">${item.originalPrice.toFixed(2)}</span> ({Math.round(100 - (item.price/item.originalPrice)*100)}% off)</span>
                        </div>

                        <div className="flex flex-col gap-1 mb-2 mt-1">
                          {isReturnedProduct ? (
                            <div className="text-[13px] text-[#007600] flex items-center gap-1">
                              <Award className="w-4 h-4" /> Earn ${(item.price * 0.05).toFixed(2)} Cashback
                            </div>
                          ) : (
                            <div className="text-[13px] text-[#007600] font-medium">Available Now for local pickup.</div>
                          )}
                        </div>

                        <div className="mt-auto pt-3">
                          {countInCart > 0 ? (
                            <div className="w-full flex items-center h-9" style={{ border: "2px solid #FFD814", borderRadius: "100px", overflow: "hidden", background: "white" }}>
                              <button
                                className="flex items-center justify-center hover:bg-[#FFF3CD] transition-colors h-full px-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShoppingBag((prev: any) => {
                                    const items = [...prev];
                                    const idx = items.map((b: any, j: number) => b.sku === item.sku && b.isPreloved ? j : -1).filter((j: number) => j >= 0).pop() ?? -1;
                                    if (idx !== -1) items.splice(idx, 1);
                                    return items;
                                  });
                                }}
                              ><Trash2 className="w-4 h-4 text-[#0F1111]" /></button>
                              <span className="flex-1 text-center text-[14px] font-bold text-[#0F1111]">
                                1 in cart
                              </span>
                              <button
                                className="flex items-center justify-center h-full px-3 opacity-50 cursor-not-allowed"
                                disabled
                              ><Plus className="w-4 h-4 text-[#0F1111]" /></button>
                            </div>
                          ) : (
                            <button
                              className="w-full h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-[0_1px_2px_rgba(15,17,17,0.15)] hover:shadow-[0_2px_5px_rgba(15,17,17,0.2)] active:scale-[0.99] text-sm transition-all flex items-center justify-center font-medium"
                              onClick={() => handleQuickAdd(item, true)}
                            >
                              Add to cart
                            </button>
                          )}
                        </div>
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
              marketplaceFeed.map((item, i) => {
                const ratingCount = ((item.sku.length * 113) % 4000) + 120;
                const boughtPastMonth = ((item.sku.length * 7) % 9) + 1;
                const countInCart = shoppingBag?.filter((b: any) => b.sku === item.sku && b.isPreloved).length || 0;
                return (
                <div key={i} className="marketplace-item-card group relative flex flex-col" style={{border:"1px solid #DDD", borderRadius:"4px", overflow:"hidden"}}>
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 w-full px-2">
                    <div className="flex justify-between w-full">
                      <span style={{background:item.grade.startsWith("A") ? "#007600" : "#E47911", color:"#FFF", fontSize:"11px", fontWeight:700, padding:"2px 6px", borderRadius:"2px"}}>Grade {item.grade}</span>
                      {item.trust < 40 && (
                        <div className="bg-rose-100 text-rose-700 text-[9px] font-bold px-2 py-0.5 border border-rose-200 shadow-sm flex items-center gap-1" style={{borderRadius:"2px"}}>
                          <AlertTriangle className="w-3 h-3" /> High Risk Seller
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="marketplace-item-image" style={{background:"#F7F7F7", padding:"16px", paddingTop: "40px"}}>
                    <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-contain mix-blend-multiply" alt={item.name} />
                  </div>

                  <div className="p-4 flex flex-col flex-1 bg-white gap-1.5 text-left">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-[#007185] flex items-center gap-1"><Leaf className="w-3 h-3" /> -{item.co2Saved}kg CO₂</span>
                      <span className="text-xs text-[#565959] flex items-center gap-1"><Map className="w-3 h-3" /> {item.distance}</span>
                    </div>

                    <h3 className="text-[15px] font-medium text-[#0F1111] leading-snug line-clamp-2 hover:text-[#c45500] cursor-pointer" onClick={() => openProductDetails(item, true)}>{item.name}</h3>

                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                       <div className="flex items-center gap-0.5">
                         <span className="text-[#0F1111] text-[13px] font-bold">{(item.reviewScore || 4.1).toFixed(1)}</span>
                         <div className="flex text-[#DE7921] text-sm leading-none">
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4 fill-current stroke-current" />
                           <Star className="w-4 h-4" />
                         </div>
                         <ChevronDown className="w-3 h-3 text-[#565959]" />
                         <span className="text-[13px] text-[#007185] hover:underline cursor-pointer hover:text-[#c45500]">({ratingCount})</span>
                       </div>
                       <span className="bg-[#007185] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Certified Local</span>
                    </div>
                    <div className="text-[13px] text-[#565959]">{boughtPastMonth}K+ bought in past month</div>

                    <div className="flex items-end gap-1.5 mt-1">
                       <div className="flex items-start text-[#B12704]">
                         <span className="text-[12px] font-normal mt-[3px] mr-[1px]">$</span>
                         <span className="text-[28px] font-medium leading-none">{Math.floor(item.price)}</span>
                         <span className="text-[12px] font-normal mt-[3px] ml-[1px]">{(item.price % 1).toFixed(2).substring(2)}</span>
                       </div>
                       <span className="text-[12px] text-[#565959] mb-1">M.R.P: <span className="line-through">${item.originalPrice.toFixed(2)}</span> ({Math.round(100 - (item.price/item.originalPrice)*100)}% off)</span>
                    </div>

                    <div className="flex flex-col gap-1 mb-2 mt-1">
                      <div className="text-[13px] text-[#007600] font-medium">In Stock locally.</div>
                      <div className="text-[13px] text-[#007600] flex items-center gap-1">
                        <Award className="w-4 h-4 flex-shrink-0" />
                        <span>Earn ${(item.price * (item.grade === "A" ? 0.03 : 0.05)).toFixed(2)} Cashback</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-3">
                      {countInCart > 0 ? (
                        <div className="w-full flex items-center h-9" style={{ border: "2px solid #FFD814", borderRadius: "100px", overflow: "hidden", background: "white" }}>
                          <button
                            className="flex items-center justify-center hover:bg-[#FFF3CD] transition-colors h-full px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShoppingBag((prev: any) => {
                                const items = [...prev];
                                const idx = items.map((b: any, j: number) => b.sku === item.sku && b.isPreloved ? j : -1).filter((j: number) => j >= 0).pop() ?? -1;
                                if (idx !== -1) items.splice(idx, 1);
                                return items;
                              });
                            }}
                          ><Trash2 className="w-4 h-4 text-[#0F1111]" /></button>
                          <span className="flex-1 text-center text-[14px] font-bold text-[#0F1111]">
                            1 in cart
                          </span>
                          <button
                            className="flex items-center justify-center h-full px-3 opacity-50 cursor-not-allowed"
                            disabled
                          ><Plus className="w-4 h-4 text-[#0F1111]" /></button>
                        </div>
                      ) : (
                        <button
                          className="w-full h-9 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] text-[#0F1111] rounded-full shadow-[0_1px_2px_rgba(15,17,17,0.15)] hover:shadow-[0_2px_5px_rgba(15,17,17,0.2)] active:scale-[0.99] text-sm transition-all flex items-center justify-center font-medium"
                          onClick={() => handleQuickAdd(item, true)}
                        >
                          Add to cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )})
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setQuickAddProduct(null); setSelectedSize(""); }}>
          <div className="bg-white shadow-xl w-full max-w-[580px] overflow-y-auto" style={{ maxHeight: "94vh", borderRadius: "12px" }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4">
              <h2 className="text-[24px] font-bold text-[#0F1111]">Select Size</h2>
              <button onClick={() => { setQuickAddProduct(null); setSelectedSize(""); }} className="text-[#0F1111] hover:opacity-60">
                <X className="w-7 h-7" />
              </button>
            </div>
            <div style={{ height: "1px", background: "#E3E6E6", margin: "0" }} />

            {/* Product Info */}
            <div className="flex gap-6 px-8 py-6">
              <div className="w-[150px] h-[150px] flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center bg-[#F7F8F8]">
                <img src={getSKUReferenceImage(quickAddProduct.sku)} alt={quickAddProduct.name} className="w-full h-full object-contain mix-blend-multiply p-2" />
              </div>
              <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
                <div className="text-[18px] font-bold text-[#0F1111] leading-snug">{quickAddProduct.name}</div>
                <div className="text-[15px] text-[#565959]">Colour: <span className="font-semibold text-[#0F1111]">{quickAddProduct.colors?.[0] || "Navy"}</span></div>
                {/* Price + FREE Returns */}
                <div className="flex items-baseline gap-3 flex-wrap mt-1">
                  <div className="flex items-start text-[#B12704]">
                    <span className="text-[16px] mt-[2px]">₹</span>
                    <span className="text-[26px] font-bold leading-none">{Math.floor(quickAddProduct.price * 83).toLocaleString("en-IN")}</span>
                  </div>
                  <span className="text-[14px] text-[#007600] font-semibold">FREE Returns</span>
                </div>
                {/* Prime */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[#FF9900] text-[15px] font-bold">✓</span>
                  <img src="/prime-logo-2.png" alt="Prime" style={{ height: "15px", objectFit: "contain", mixBlendMode: "multiply" }} />
                  <span className="text-[14px] text-[#0F1111]">FREE Delivery Today</span>
                </div>
                <span className="text-[14px] text-[#007185] hover:underline cursor-pointer font-medium mt-1 inline-flex items-center gap-0.5">
                  See all details <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
            <div style={{ height: "1px", background: "#E3E6E6", margin: "0" }} />

            {/* Size Picker */}
            <div className="px-8 pt-8 pb-10">
              <div className="text-[20px] font-bold text-[#0F1111] mb-5">Choose your size</div>

              <div id="quick-add-sizes" className="flex flex-wrap gap-5 mb-8 transition-all rounded-lg">
                {quickAddProduct.sizes.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s === selectedSize ? "" : s)}
                    style={{
                      minWidth: "96px", height: "56px", borderRadius: "8px",
                      border: selectedSize === s ? "1.5px solid #E47911" : "1px solid #D5D9D9",
                      background: selectedSize === s ? "#FFF6ED" : "white", fontSize: "16px",
                      fontWeight: selectedSize === s ? 700 : 400,
                      color: selectedSize === s ? "#E47911" : "#0F1111", cursor: "pointer", transition: "all 0.15s",
                      boxShadow: selectedSize === s ? "0 0 0 1px #E47911" : "none"
                    }}
                  >{s}</button>
                ))}
              </div>

              {/* Not sure / View size chart */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2.5 text-[15px] text-[#565959]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E47911" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:"rotate(45deg)"}}><path d="M21 16H3"/><path d="M21 8H3"/><path d="M7 16V8"/><path d="M11 16V8"/><path d="M15 16V8"/><path d="M19 16V8"/></svg>
                  <span>Not sure which size is right for you?</span>
                </div>
                <button
                  onClick={() => { setQuickAddProduct(null); setSelectedSize(""); routeToSizing(quickAddProduct.sku); }}
                  className="text-[15px] text-[#007185] hover:underline flex items-center gap-0.5 font-medium whitespace-nowrap"
                >View size chart <ChevronRight className="w-4 h-4" /></button>
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-4 mb-8 relative">
                <div className="flex-1 border-t border-[#E3E6E6]" />
                <span className="text-[13px] text-[#767676] font-bold uppercase bg-white px-3 tracking-wide">OR</span>
                <div className="flex-1 border-t border-[#E3E6E6]" />
              </div>

              {/* AI Body Scanner Banner */}
              <button
                onClick={() => { setQuickAddProduct(null); setSelectedSize(""); routeToSizing(quickAddProduct.sku); }}
                className="w-full flex items-center gap-5 px-6 py-5 mb-2 rounded-xl text-left transition-all hover:bg-[#F3F8FC]"
                style={{ background: "#F5F9FE", border: "1px solid #D6E6F8" }}
              >
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#71A2F6", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
                  {/* Dashed circular outline */}
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "rotate(-45deg)" }} viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="30" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="16 4" fill="none" />
                  </svg>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 1 }}>
                    <path d="M12 4a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM7.5 7.5A1.5 1.5 0 019 6h6a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H14v6.5a1.5 1.5 0 01-1.5 1.5h-1a1.5 1.5 0 01-1.5-1.5V16.5H9.5a1.5 1.5 0 01-1.5-1.5v-7.5z" fill="white"/>
                  </svg>
                </div>
                <div className="flex-1 ml-1">
                  <div className="text-[18px] font-bold text-[#0F1111] mb-1">Find your perfect fit with AI</div>
                  <div className="text-[15px] text-[#565959] leading-relaxed">
                    Use our AI Body Scanner to get your best size<br/>
                    — <span className="text-[#007185] font-semibold">68% fewer returns</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-[#0F1111] flex-shrink-0" strokeWidth={2.5} />
              </button>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 flex gap-5 bg-white border-t border-[#E3E6E6]">
              {selectedSize && shoppingBag?.some((b: any) => b.sku === quickAddProduct.sku && b.size === selectedSize) ? (
                /* "X in cart" state */
                <>
                  <button
                    onClick={() => { setQuickAddProduct(null); setSelectedSize(""); }}
                    className="flex-1 py-3 bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] text-[15px] font-medium transition-colors"
                    style={{ borderRadius: "8px", color: "#0F1111" }}
                  >Cancel</button>
                  <div className="flex-1 flex items-center" style={{ border: "1px solid #FCD200", borderRadius: "8px", overflow: "hidden", background: "#FFD814", height: "48px" }}>
                    <button
                      className="flex items-center justify-center hover:bg-[#F7CA00] transition-colors h-full"
                      style={{ width: "48px" }}
                      onClick={() => {
                        setShoppingBag((prev: any) => {
                          const items = [...prev];
                          const idx = items.map((b: any, i: number) => b.sku === quickAddProduct.sku && b.size === selectedSize ? i : -1).filter((i: number) => i >= 0).pop() ?? -1;
                          if (idx !== -1) items.splice(idx, 1);
                          return items;
                        });
                      }}
                    ><Trash2 className="w-5 h-5 text-[#0F1111]" /></button>
                    <span className="flex-1 text-center text-[15px] font-bold text-[#0F1111]">
                      {shoppingBag?.filter((b: any) => b.sku === quickAddProduct.sku && b.size === selectedSize).length} in cart
                    </span>
                    <button
                      className="flex items-center justify-center hover:bg-[#F7CA00] transition-colors h-full"
                      style={{ width: "48px" }}
                      onClick={() => setShoppingBag((prev: any) => [...prev, { id: Math.random().toString(36).substr(2, 9), sku: quickAddProduct.sku, name: quickAddProduct.name, price: quickAddProduct.price, grade: quickAddProduct.isPreloved ? (quickAddProduct.grade || "B") : "A", originalPrice: quickAddProduct.originalPrice || quickAddProduct.price, size: selectedSize, isPreloved: !!quickAddProduct.isPreloved }])}
                    ><Plus className="w-5 h-5 text-[#0F1111]" /></button>
                  </div>
                </>
              ) : (
                /* Normal state */
                <>
                  <button
                    onClick={() => { setQuickAddProduct(null); setSelectedSize(""); }}
                    className="flex-[0.8] py-3.5 bg-white border border-[#D5D9D9] hover:bg-[#F7F8F8] text-[16px] font-medium transition-colors"
                    style={{ borderRadius: "8px", color: "#0F1111" }}
                  >Cancel</button>
                  <button
                    onClick={() => {
                      if (!selectedSize) {
                        const sizeSection = document.getElementById("quick-add-sizes");
                        if (sizeSection) { sizeSection.style.background = "#FFF3CD"; setTimeout(() => { sizeSection.style.background = ""; }, 600); }
                        return;
                      }
                      setShoppingBag((prev: any) => [...prev, { id: Math.random().toString(36).substr(2, 9), sku: quickAddProduct.sku, name: quickAddProduct.name, price: quickAddProduct.price, grade: quickAddProduct.isPreloved ? (quickAddProduct.grade || "B") : "A", originalPrice: quickAddProduct.originalPrice || quickAddProduct.price, size: selectedSize, isPreloved: !!quickAddProduct.isPreloved }]);
                      try { const confetti = (window as any).confetti; if (confetti) confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } }); } catch {}
                    }}
                    className="flex-[1.2] py-3.5 text-[16px] font-bold transition-all hover:bg-[#F7CA00]"
                    style={{ background: "#FFD814", border: "1px solid #FCD200", borderRadius: "8px", color: "#0F1111" }}
                  >Add to cart</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


