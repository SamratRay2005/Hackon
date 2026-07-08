"use client";

/**
 * page.tsx — Shell / Context Provider
 * ──────────────────────────────────────
 * This file is intentionally slim (~350 lines).
 * It owns:
 *   - All shared state (so it can pass it via AppContext)
 *   - Auth overlay UI
 *   - Navbar, Sidebar, Product Card, Metrics strip
 *   - Renders <L0Dashboard />, <L1Sizing />, ... based on activeTab
 *   - Modals: X-Ray, Bracketing
 *
 * To edit a specific layer, open the matching file in src/app/layers/:
 *   L0Dashboard.tsx  L1Sizing.tsx  L2Fraud.tsx  L3Deflection.tsx
 *   L4Grading.tsx    L5Logistics.tsx  L6Wallet.tsx  LMarketplace.tsx
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShoppingBag, AlertTriangle, Compass, ShieldCheck, MessageSquare,
  Leaf, Award, TrendingDown, Layers, Heart, ChevronRight,
  UserCheck, Camera, Zap, BarChart2, Shield, Wallet, Search,
  ChevronDown, Shirt, X, Truck, Map, ShoppingCart,
} from "lucide-react";
import confetti from "canvas-confetti";
import { PRODUCT_CATALOG } from "@/lib/catalog";

import {
  AppContext,
  getSKUReferenceImage,
  WebcamCapture,
} from "./layers/AppContext";

import L0Dashboard from "./layers/L0Dashboard";
import L1Sizing from "./layers/L1Sizing";
import L2Fraud from "./layers/L2Fraud";
import L3Deflection from "./layers/L3Deflection";
import L4Grading from "./layers/L4Grading";
import L5Logistics from "./layers/L5Logistics";
import L6Orders from "./layers/L6Orders";
import L7Cart from "./layers/L7Cart";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showXRayModal, setShowXRayModal] = useState(false);

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [authZip, setAuthZip] = useState("98101");
  const [authPriorReturns, setAuthPriorReturns] = useState(2);
  const [authError, setAuthError] = useState<string | null>(null);

  // Profile
  const [profileUserId, setProfileUserId] = useState("user_samrat");
  const [profileEmail, setProfileEmail] = useState("samrat.ray@example.com");
  const [profileIp, setProfileIp] = useState("184.22.109.5");
  const [profileZip, setProfileZip] = useState("98101");
  const [profilePriorReturns, setProfilePriorReturns] = useState(2);
  const [showProfileConfig, setShowProfileConfig] = useState(false);

  // Metrics
  const [metrics, setMetrics] = useState({
    totalProcessed: 142, deflectedRate: 41, p2pMatched: 28,
    co2Saved: 85, walletCredits: 1250, fraudAttemptsBlocked: 8
  });

  // L1 Sizing
  const [cart, setCart] = useState<Array<{ id: string; sku: string; name: string; size: string; price: number }>>([]);
  const [selectedProductSku, setSelectedProductSku] = useState("DENIM-JKT-001");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [showBracketingModal, setShowBracketingModal] = useState(false);
  const [sizingImage, setSizingImage] = useState<string | null>(null);
  const [sizingResult, setSizingResult] = useState<any>(null);

  // L2 Fraud
  const [fraudSku, setFraudSku] = useState("DENIM-JKT-001");
  const [fraudOrderId, setFraudOrderId] = useState("");
  const [fraudItemName, setFraudItemName] = useState("Classic Denim Jacket");
  const [fraudImage, setFraudImage] = useState<string | null>(null);
  const [fraudImageType, setFraudImageType] = useState<string>("genuine");

  // L3 Chat
  const [deflectProduct, setDeflectProduct] = useState("Smart Drip Coffee Maker");
  const [deflectSku, setDeflectSku] = useState("CF-Mkr-99");
  const [deflectOrderId, setDeflectOrderId] = useState("");
  const [deflectReason, setDeflectReason] = useState("Defective / Won't turn on");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "bot", content: "Hi there! I'm Nova. I see you want to return your **Smart Drip Coffee Maker** because it won't turn on. Before we issue a return label, let's see if we can resolve this together! Can you check if the power indicator light is blinking when you plug it in?" }
  ]);
  const [ifixitGuides, setIfixitGuides] = useState<Array<any>>([]);

  // L4 Grading
  const [gradingSku, setGradingSku] = useState("CF-Mkr-99");
  const [gradingItemName, setGradingItemName] = useState("Smart Drip Coffee Maker");
  const [gradingQueueId, setGradingQueueId] = useState("");
  const [ledgerRecords, setLedgerRecords] = useState<Array<any>>([]);
  const [showReturnSuccess, setShowReturnSuccess] = useState(false);

  // L5 Logistics
  const [logisticsSku, setLogisticsSku] = useState("DENIM-JKT-001");

  // L6 Wallet
  const [walletInfo, setWalletInfo] = useState<{
    cashbackBalance: number;
    vouchers: Array<{ id: string; title: string; discountAmount: number; status: string; issuedAt: string }>;
    trustScore: number;
    returnPrivileges: "INSTANT_ALLOWED" | "REVOKED";
    orders?: Array<{ sku: string; name: string; price: number; purchaseDate: string; category: string; returnWindowDays?: number; status?: string }>;
  }>({ cashbackBalance: 0, vouchers: [], trustScore: 100, returnPrivileges: "INSTANT_ALLOWED", orders: [] });

  // Hydrate wallet from localStorage on mount (since serverless memory resets on hot-reload)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reloop_wallet");
      if (saved) {
        setWalletInfo(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save wallet to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("reloop_wallet", JSON.stringify(walletInfo));
      setMetrics((prev: any) => ({ ...prev, walletCredits: Math.round((walletInfo.cashbackBalance ?? 0) * 100) }));
    } catch {}
  }, [walletInfo]);

  const [refundBaseAmount, setRefundBaseAmount] = useState(120.00);

  // Marketplace / Shopping bag
  const [shoppingBag, setShoppingBag] = useState<Array<{ sku: string; name: string; price: number; grade: string; brand: string; co2Saved: number }>>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"bag" | "summary" | "confirmed">("bag");

  // Dark Store Resale Pipeline
  const [resaleListings, setResaleListings] = useState<any[]>([]);

  // Fraud Claim Type
  const [fraudClaimType, setFraudClaimType] = useState<"damaged_product" | "different_product">("damaged_product");
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [userDescription, setUserDescription] = useState("");

  // Global Modes & Inspect Queue
  const [globalMode, setGlobalMode] = useState<"user" | "admin">("user");
  const isAdminMode = globalMode === "admin";
  const [inspectQueue, setInspectQueue] = useState<any[]>([]);
  const [manualReviewQueue, setManualReviewQueue] = useState<any[]>([]);
  const [processedFraudQueue, setProcessedFraudQueue] = useState<any[]>([]);

  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate queues from localStorage on mount
  useEffect(() => {
    try {
      const inspectSaved = localStorage.getItem("reloop_inspect_queue");
      if (inspectSaved) setInspectQueue(JSON.parse(inspectSaved));

      const manualSaved = localStorage.getItem("reloop_manual_queue");
      if (manualSaved) setManualReviewQueue(JSON.parse(manualSaved));

      const processedSaved = localStorage.getItem("reloop_processed_queue");
      if (processedSaved) setProcessedFraudQueue(JSON.parse(processedSaved));

      const bagSaved = localStorage.getItem("reloop_shopping_bag");
      if (bagSaved) setShoppingBag(JSON.parse(bagSaved));
    } catch {}
    setIsHydrated(true);
  }, []);

  // Save queues to localStorage whenever they change
  useEffect(() => {
    if (isHydrated) {
      try { localStorage.setItem("reloop_inspect_queue", JSON.stringify(inspectQueue)); } catch {}
    }
  }, [inspectQueue, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      try { localStorage.setItem("reloop_manual_queue", JSON.stringify(manualReviewQueue)); } catch {}
    }
  }, [manualReviewQueue, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      try { localStorage.setItem("reloop_processed_queue", JSON.stringify(processedFraudQueue)); } catch {}
    }
  }, [processedFraudQueue, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      try { localStorage.setItem("reloop_shopping_bag", JSON.stringify(shoppingBag)); } catch {}
    }
  }, [shoppingBag, isHydrated]);


  // ── SEARCH CLICK-OUTSIDE ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── PERSISTENCE ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeUser = localStorage.getItem("activeUser");
      if (activeUser) {
        try {
          const parsed = JSON.parse(activeUser);
          setProfileUserId(parsed.userId);
          setProfileEmail(parsed.email);
          setProfileZip(parsed.zip);
          setProfilePriorReturns(parsed.priorReturns);
          setIsLoggedIn(true);
        } catch { }
      }
    }
  }, []);

  // ── ON LOGIN ──
  useEffect(() => {
    if (isLoggedIn) {
      fetchWalletInfo();
      fetchLedgerRecords();
      fetchGuidesForProduct("coffee maker");
    }
  }, [profileUserId, isLoggedIn]);

  // ── CROSS-LAYER SKU SYNC ──
  useEffect(() => {
    const p = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);
    if (p) {
      setFraudSku(p.sku);
      setFraudItemName(p.name);
      setLogisticsSku(p.sku);
      setGradingSku(p.sku);
      setGradingItemName(p.name);
      setRefundBaseAmount(p.price);
      setDeflectProduct(p.name);
      setDeflectSku(p.sku);
      const isElectrical = p.category === "Electronics" || p.category === "Home & Kitchen";
      if (isElectrical) fetchGuidesForProduct(p.name);
      else setIfixitGuides([]);
    }
  }, [selectedProductSku]);

  // ── LOAD FROM WALLET ORDERS ──
  useEffect(() => {
    if (walletInfo.orders && walletInfo.orders.length > 0) {
      const firstOrder = walletInfo.orders[0];
      setSelectedProductSku(firstOrder.sku);
      setFraudSku(firstOrder.sku);
      setFraudItemName(firstOrder.name);
      setLogisticsSku(firstOrder.sku);
      setRefundBaseAmount(firstOrder.price);
      setGradingSku(firstOrder.sku);
      setGradingItemName(firstOrder.name);
      setDeflectProduct(firstOrder.name);
      setDeflectSku(firstOrder.sku);
      const isElectrical = ["electronics", "home & kitchen"].includes(firstOrder.category.toLowerCase());
      const isApparelOrFootwear = ["apparel", "footwear"].includes(firstOrder.category.toLowerCase());
      if (isElectrical) {
        fetchGuidesForProduct(firstOrder.name);
        setChatMessages([{ role: "bot", content: `Hi there! I see you want to return your **${firstOrder.name}** due to functionality issues. Before we generate a shipping label, let's troubleshoot together! Can you tell me if the device turns on at all when plugged in?` }]);
      } else if (isApparelOrFootwear) {
        setIfixitGuides([]);
        setChatMessages([{ role: "bot", content: `Hi there! I see you want to return your **${firstOrder.name}**. Since this is an apparel/footwear item, most returns are due to sizing or fit. Would you like to exchange this for a different size or color instead?` }]);
      } else {
        setIfixitGuides([]);
        setChatMessages([{ role: "bot", content: `Hi there! We're sorry your **${firstOrder.name}** didn't meet your expectations. Is there a specific defect or missing component, or did you simply change your mind?` }]);
      }
    }
  }, [walletInfo.orders]);

  // ── API CALLS ──
  const fetchWalletInfo = async () => {
    // Skip fetching from server since serverless memory drops it on reload.
    // We strictly use localStorage + checkout sync for Hackathon demo purposes.
    /*
    try {
      const res = await fetch(`/api/wallet?userId=${profileUserId}&t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        // setWalletInfo(data);
      }
    } catch { }
    */
  };

  const fetchLedgerRecords = async () => {
    try {
      const res = await fetch(`/api/grading?userId=${profileUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          setLedgerRecords(data.records);
        } else {
          setLedgerRecords([{
            id: "ph-771", sku: "CF-Mkr-99", itemName: "Smart Drip Coffee Maker",
            grade: "B", defects: ["Minor scuffing on base", "Reservoir has hardwater lines"],
            resaleCategory: "Open Box - Very Good",
            hash: "5d7ee02bca5cf0b04c8614578efbdca9e79435b80a187e148e658a5be89dbf7c0",
            timestamp: "2026-06-13T10:15:00Z"
          }]);
        }
      }
    } catch { }
  };

  const fetchGuidesForProduct = async (query: string) => {
    try {
      const response = await fetch(`https://www.ifixit.com/api/2.0/guides?query=${encodeURIComponent(query)}&limit=3`);
      if (response.ok) {
        const data = await response.json();
        const guides = data.guides?.map((g: any) => ({
          id: g.guideid, title: g.title, url: g.url,
          summary: g.summary || "", imageUrl: g.image?.medium || null
        })) || [];
        if (guides.length > 0) { setIfixitGuides(guides); return; }
      }
    } catch { }
    const fallbackDB: Record<string, any[]> = {
      coffee: [
        { id: 101, title: "Drip Coffee Maker Heating Element Replacement", url: "https://www.ifixit.com/Guide/Drip+Coffee+Maker+Heating+Element+Replacement/10292", summary: "Replace the heating element inside your standard drip coffee maker." },
        { id: 102, title: "How to Descale a Coffee Machine", url: "https://www.ifixit.com/Guide/How+to+Descale+a+Coffee+Machine/11883", summary: "Descale the water pathways to clear hard mineral blockage." }
      ],
      speaker: [
        { id: 201, title: "Bluetooth Speaker Battery Swap", url: "https://www.ifixit.com/Guide/Bluetooth+Speaker+Battery+Replacement/8844", summary: "Swap the lithium battery inside your portable Bluetooth speaker." }
      ]
    };
    const norm = query.toLowerCase();
    if (norm.includes("coffee") || norm.includes("maker")) setIfixitGuides(fallbackDB.coffee);
    else if (norm.includes("speaker") || norm.includes("sound")) setIfixitGuides(fallbackDB.speaker);
    else setIfixitGuides([{ id: 99, title: `General Troubleshooting for ${query}`, url: "https://www.ifixit.com/Device/Electronics", summary: "Follow standard diagnostics for electrical and power issues." }]);
  };

  // ── L1 CART ──
  const handleAddToCart = (size: string) => {
    const selectedProd = PRODUCT_CATALOG.find(p => p.sku === selectedProductSku) || PRODUCT_CATALOG[0];
    const isActuallyBracketing = cart.some(item => item.sku === selectedProd.sku && item.size !== size);
    setCart(prev => [...prev, { id: Math.random().toString(36).slice(2), sku: selectedProd.sku, name: selectedProd.name, size, price: selectedProd.price }]);
    if (isActuallyBracketing) setShowBracketingModal(true);
  };
  const handleRemoveFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

  // ── AUTH ──
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) { setAuthError("All fields are required."); return; }
    const inferredUsername = authEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user_guest";
    const userSession = { userId: inferredUsername, email: authEmail, zip: "98101", priorReturns: 1 };
    setProfileUserId(userSession.userId); setProfileEmail(userSession.email);
    setProfileZip(userSession.zip); setProfilePriorReturns(userSession.priorReturns);
    if (typeof window !== "undefined") localStorage.setItem("activeUser", JSON.stringify(userSession));
    setIsLoggedIn(true);
    confetti({ particleCount: 80, spread: 50, origin: { y: 0.6 } });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authUserId || !authEmail || !authPassword || !authZip) { setAuthError("Please complete all fields."); return; }
    const cleanedUsername = authUserId.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanedUsername) { setAuthError("Username must be alphanumeric."); return; }
    const userSession = { userId: cleanedUsername, email: authEmail, zip: authZip, priorReturns: authPriorReturns };
    try { await fetch(`/api/wallet`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: "init", userId: userSession.userId }) }); } catch { }
    setProfileUserId(userSession.userId); setProfileEmail(userSession.email);
    setProfileZip(userSession.zip); setProfilePriorReturns(userSession.priorReturns);
    if (typeof window !== "undefined") localStorage.setItem("activeUser", JSON.stringify(userSession));
    setIsLoggedIn(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#4f46e5", "#10b981", "#7c3aed"] });
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.removeItem("activeUser");
    setIsLoggedIn(false);
    setAuthEmail(""); setAuthPassword(""); setAuthUserId("");
    setSizingResult(null); setFraudImage(null);
  };

  // ── FILTERED SUGGESTIONS ──
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return PRODUCT_CATALOG.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)).slice(0, 4);
  }, [searchQuery]);

  const [prelovedSuggestions, setPrelovedSuggestions] = useState<any[]>([]);
  
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      fetch(`/api/marketplace?query=${encodeURIComponent(searchQuery.trim())}&zipCode=${profileZip}&userId=${profileUserId}`)
        .then(res => res.json())
        .then(data => {
           if (data.items) setPrelovedSuggestions(data.items.slice(0, 4));
        }).catch(err => console.error(err));
    } else {
      setPrelovedSuggestions([]);
    }
  }, [searchQuery, profileZip, profileUserId]);

  const selectedProduct = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);
  const isApparelOrFootwear = !!(selectedProduct && (selectedProduct.category === "Apparel" || selectedProduct.category === "Footwear"));

  const navItems = [
    { id: "dashboard", icon: BarChart2, label: "Home", subtitle: "Dashboard & orders" },
    { id: "fraud-mitigation", icon: ShieldCheck, label: "Verify Return", subtitle: "Scan & authenticate" },
    { id: "deflection", icon: MessageSquare, label: "Get Help", subtitle: "Chat before you return" },
    { id: "grading", icon: Camera, label: "Inspect Item", subtitle: "Grade condition" },
    { id: "logistics", icon: Truck, label: "Arrange Shipping", subtitle: "Eco-route optimizer" },
    { id: "orders", icon: ShoppingBag, label: "My Orders", subtitle: "Purchase history" },
    { id: "cart", icon: Wallet, label: "My Cart & Rewards", subtitle: "Bag, cashback & vouchers" },
  ];

  // ── CONTEXT VALUE ──
  const contextValue = {
    profileUserId, setProfileUserId,
    profileEmail, setProfileEmail,
    profileIp, setProfileIp,
    profileZip, setProfileZip,
    profilePriorReturns, setProfilePriorReturns,
    activeTab, setActiveTab,
    selectedProductSku, setSelectedProductSku,
    walletInfo, setWalletInfo, fetchWalletInfo,
    metrics, setMetrics,
    fraudSku, setFraudSku, fraudOrderId, setFraudOrderId,
    fraudItemName, setFraudItemName,
    deflectProduct, setDeflectProduct,
    deflectSku, setDeflectSku,
    deflectOrderId, setDeflectOrderId,
    deflectReason, setDeflectReason,
    logisticsSku, setLogisticsSku,
    gradingSku, setGradingSku,
    gradingItemName, setGradingItemName,
    gradingQueueId, setGradingQueueId,
    refundBaseAmount, setRefundBaseAmount,
    sizingResult, setSizingResult,
    sizingImage, setSizingImage,
    chatMessages, setChatMessages,
    ifixitGuides, setIfixitGuides,
    fetchGuidesForProduct,
    ledgerRecords, setLedgerRecords,
    fetchLedgerRecords,
    shoppingBag, setShoppingBag,
    showCheckoutModal, setShowCheckoutModal,
    checkoutStep, setCheckoutStep,
    showReturnSuccess, setShowReturnSuccess,
    cart, setCart,
    showBracketingModal, setShowBracketingModal,
    searchQuery, setSearchQuery,
    showSuggestions, setShowSuggestions,
    searchContainerRef,
    fraudImage, setFraudImage,
    fraudImageType, setFraudImageType,
    fraudClaimType, setFraudClaimType,
    fraudResult, setFraudResult,
    userDescription, setUserDescription,
    resaleListings, setResaleListings,
    isAdminMode,
    manualReviewQueue, setManualReviewQueue,
    processedFraudQueue, setProcessedFraudQueue,
    inspectQueue, setInspectQueue,
    globalMode, setGlobalMode,
    // extra fields consumed by L3 via any-cast
    chatInput: "",
  };

  // ── AUTH OVERLAY ──
  if (!isLoggedIn) {
    return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',background:'#FFFFFF'}}>
        {/* Top nav bar */}
        <div style={{width:'100%',background:'#131921',padding:'10px 0',display:'flex',justifyContent:'center'}}>
          <div style={{fontSize:'1.8rem',fontWeight:900,color:'#FFFFFF',letterSpacing:'-0.05em'}}>
            Re<span style={{color:'#FF9900'}}>Loop</span>
          </div>
        </div>
        <div style={{width:'100%',height:'1px',background:'#DDD'}} />

        <div style={{width:'100%',maxWidth:'350px',margin:'20px auto 0',padding:'0 16px'}}>
          {/* Main card */}
          <div style={{border:'1px solid #D5D9D9',borderRadius:'4px',padding:'24px',background:'#fff',marginBottom:'16px'}}>
            <h1 style={{fontSize:'1.5rem',fontWeight:400,color:'#0F1111',marginBottom:'16px'}}>{authMode === "signin" ? "Sign in" : "Create account"}</h1>

            {authError && <div style={{background:'#FEF0EF',border:'1px solid #F5B5AD',borderRadius:'3px',padding:'8px 12px',fontSize:'0.8rem',color:'#B12704',marginBottom:'12px'}}>{authError}</div>}

            {authMode === "signin" ? (
              <form onSubmit={handleSignIn} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <div>
                  <label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111',display:'block',marginBottom:'4px'}}>Email or mobile phone number</label>
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} />
                </div>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111'}}>Password</label>
                  </div>
                  <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="At least 6 characters" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} />
                </div>
                <button type="submit" style={{width:'100%',padding:'8px',background:'linear-gradient(to bottom,#f0c14b,#c89411)',color:'#111',border:'1px solid #a88734',borderRadius:'3px',fontSize:'0.875rem',cursor:'pointer',fontWeight:400}}>Sign in</button>
                <p style={{fontSize:'0.72rem',color:'#565959'}}>By continuing, you agree to ReLoop's <span style={{color:'#0066C0',cursor:'pointer'}}>Conditions of Use</span> and <span style={{color:'#0066C0',cursor:'pointer'}}>Privacy Notice.</span></p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                <div><label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111',display:'block',marginBottom:'4px'}}>Your name</label><input type="text" required value={authUserId} onChange={e => setAuthUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="e.g. user_samrat" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} /></div>
                <div><label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111',display:'block',marginBottom:'4px'}}>Email address</label><input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} /></div>
                <div><label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111',display:'block',marginBottom:'4px'}}>Password</label><input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="At least 6 characters" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} /></div>
                <div style={{display:'flex',gap:'10px'}}>
                  <div style={{flex:1}}><label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111',display:'block',marginBottom:'4px'}}>Home ZIP</label><input type="text" required value={authZip} onChange={e => setAuthZip(e.target.value)} placeholder="98101" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} /></div>
                  <div style={{flex:1}}><label style={{fontSize:'0.82rem',fontWeight:700,color:'#0F1111',display:'block',marginBottom:'4px'}}>Prior Returns</label><input type="number" required value={authPriorReturns} onChange={e => setAuthPriorReturns(parseInt(e.target.value) || 0)} placeholder="2" style={{width:'100%',padding:'6px 8px',border:'1px solid #a0a0a0',borderRadius:'3px',fontSize:'0.875rem',outline:'none'}} /></div>
                </div>
                <button type="submit" style={{width:'100%',padding:'8px',background:'linear-gradient(to bottom,#f0c14b,#c89411)',color:'#111',border:'1px solid #a88734',borderRadius:'3px',fontSize:'0.875rem',cursor:'pointer'}}>Create your ReLoop account</button>
                <p style={{fontSize:'0.72rem',color:'#565959'}}>By creating an account, you agree to ReLoop's <span style={{color:'#0066C0',cursor:'pointer'}}>Conditions of Use</span>.</p>
              </form>
            )}
          </div>

          {/* Toggle */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',margin:'0 0 12px',color:'#767676',fontSize:'0.8rem'}}>
            <div style={{flex:1,height:'1px',background:'#DDD'}} />
            <span>{authMode === "signin" ? "New to ReLoop?" : "Already have an account?"}</span>
            <div style={{flex:1,height:'1px',background:'#DDD'}} />
          </div>
          <button onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(null); }}
            style={{width:'100%',padding:'7px',fontSize:'0.82rem',background:'linear-gradient(to bottom,#f7f8fa,#e7e9ec)',border:'1px solid #ADB1B8',borderRadius:'3px',cursor:'pointer',color:'#0F1111'}}>
            {authMode === "signin" ? "Create your ReLoop account" : "Sign in to your account"}
          </button>
          <p style={{fontSize:'0.7rem',color:'#aaa',textAlign:'center',marginTop:'16px'}}>Demo: use any email + password to sign in instantly</p>
        </div>

        {/* Footer */}
        <div style={{width:'100%',marginTop:'auto',paddingTop:'24px'}}>
          <div style={{height:'1px',background:'linear-gradient(to right,transparent,#DDD,transparent)',marginBottom:'10px'}} />
          <div style={{display:'flex',justifyContent:'center',gap:'20px',fontSize:'0.75rem',color:'#007185',marginBottom:'8px'}}>
            <span style={{cursor:'pointer'}}>Conditions of Use</span>
            <span style={{cursor:'pointer'}}>Privacy Notice</span>
            <span style={{cursor:'pointer'}}>Help</span>
          </div>
          <p style={{textAlign:'center',fontSize:'0.72rem',color:'#767676',paddingBottom:'12px'}}>© 2024-2025 ReLoop.ai</p>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  return (
    <AppContext.Provider value={contextValue as any}>
      <>
        <div className="min-h-screen">

          {/* ── AMAZON NAVBAR (row 1: dark navy) ── */}
          <nav className="navbar" style={{gap:'0.5rem'}}>
            <a href="#" className="navbar-logo" style={{padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none'}}>
              <img src="/amazon_logo.png" alt="Amazon" style={{ height: '26px', objectFit: 'contain', marginTop: '4px' }} />
              <div style={{height: '18px', width: '1px', background: 'rgba(255, 255, 255, 0.4)', margin: '0 4px', marginTop: '2px'}} />
              <span style={{color: '#fff', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '2px'}}>
                Re<span style={{color: '#FF9900'}}>Loop</span>
              </span>
            </a>

            {/* Deliver to */}
            <div className="hidden md:flex flex-col text-white cursor-pointer px-2 py-1 rounded border-2 border-transparent hover:border-white" style={{lineHeight:'1.1'}}>
              <span style={{fontSize:'0.65rem',color:'#ccc'}}>Deliver to</span>
              <span style={{fontSize:'0.78rem',fontWeight:700, display: 'flex', alignItems: 'center', gap: '2px'}}>
                <img src="/location_icon.png" alt="" style={{width: '14px', height: '14px'}} /> {profileZip}
              </span>
            </div>

            {/* Search bar */}
            <div className="amz-search hidden md:flex flex-1 relative" ref={searchContainerRef}>
              <div className="amz-search-category" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                All <img src="/dropdown_icon.png" alt="" style={{width: '10px', height: '10px', opacity: 0.6}} />
              </div>
              <input
                type="text"
                className="amz-search-input"
                placeholder="Search Amazon & Pre-Loved"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setShowSuggestions(false);
                    setActiveTab("dashboard");
                  }
                }}
                style={{width:'auto',padding:'0 10px',border:'none',outline:'none',fontSize:'0.9rem'}}
              />
              <button 
                className="amz-search-btn"
                style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                onClick={() => {
                  setShowSuggestions(false);
                  setActiveTab("dashboard");
                }}
              >
                <img src="/search_icon.png" alt="Search" style={{width: '20px', height: '20px'}} />
              </button>

              {/* Search Dropdown */}
              {showSuggestions && searchQuery.trim().length > 0 && (filteredSuggestions.length > 0 || prelovedSuggestions.length > 0) && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl border border-slate-200 mt-1 rounded-md z-50 overflow-hidden flex flex-col max-h-[80vh] overflow-y-auto">
                  
                  {filteredSuggestions.length > 0 && (
                    <div className="flex flex-col">
                      <div className="px-3 py-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 flex items-center gap-1.5">
                        Amazon Catalog
                      </div>
                      {filteredSuggestions.map(p => (
                        <div key={`amz-${p.sku}`} className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 flex items-center justify-between" onClick={() => {
                          setSelectedProductSku(p.sku);
                          setSearchQuery(p.name);
                          setShowSuggestions(false);
                          setActiveTab("dashboard");
                        }}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-slate-500">Brand New • {p.category}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">${p.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {prelovedSuggestions.length > 0 && (
                    <div className="flex flex-col">
                      <div className="px-3 py-1.5 bg-amber-50 text-[10px] font-bold text-amber-700 uppercase tracking-wider border-b border-amber-200 flex items-center gap-1.5">
                        ♻️ Pre-Loved (Near You)
                      </div>
                      {prelovedSuggestions.map((p, i) => (
                        <div key={`pre-${p.sku}-${i}`} className="px-4 py-2 hover:bg-amber-50 cursor-pointer border-b border-amber-100 flex items-center justify-between" onClick={() => {
                          setSelectedProductSku(p.sku);
                          setSearchQuery(p.name);
                          setShowSuggestions(false);
                          setActiveTab("dashboard");
                        }}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-800">{p.name}</span>
                            <span className="text-[10px] text-emerald-600 font-bold">{p.distance} away • Grade {p.grade} • {p.trust}% Trust</span>
                          </div>
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">${p.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {/* Architecture X-Ray */}
              <button
                onClick={() => setShowXRayModal(true)}
                className="navbar-link hidden lg:flex items-center gap-1"
                style={{flexDirection:'column',lineHeight:'1.1',padding:'4px 8px'}}
              >
                <span style={{fontSize:'0.65rem',color:'#ccc'}}>Explore</span>
                <span style={{fontSize:'0.78rem',fontWeight:700}}>Architecture</span>
              </button>

              {/* Green Credits */}
              <div className="navbar-link hidden sm:flex flex-col" style={{lineHeight:'1.1',padding:'4px 8px',cursor:'default'}}>
                <span style={{fontSize:'0.65rem',color:'#ccc'}}>🌿 Credits</span>
                <span style={{fontSize:'0.78rem',fontWeight:700,color:'#FF9900'}}>{Math.round((walletInfo.cashbackBalance ?? 0) * 100)}</span>
              </div>

              {/* Returns & Orders */}
              <div className="navbar-link hidden sm:flex flex-col" style={{lineHeight:'1.1',padding:'4px 8px',cursor:'default'}}>
                <span style={{fontSize:'0.65rem',color:'#ccc'}}>Returns</span>
                <span style={{fontSize:'0.78rem',fontWeight:700}}>& Orders</span>
              </div>

              {/* Account + mode toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
                  className="navbar-link flex flex-col"
                  style={{lineHeight:'1.1',padding:'4px 8px'}}
                >
                  <span style={{fontSize:'0.65rem',color:'#ccc'}}>Hello, {profileUserId}</span>
                  <span style={{fontSize:'0.78rem',fontWeight:700, display: 'flex', alignItems: 'center', gap: '2px'}}>
                    Account & Lists <img src="/dropdown_icon.png" alt="" style={{width:'8px',height:'8px', filter: 'brightness(0) invert(1)', opacity: 0.7}} />
                  </span>
                </button>

                {showLogoutDropdown && (
                  <div className="absolute right-0 mt-1 w-52 bg-white shadow-xl border border-gray-200 py-2 z-50" style={{borderRadius:'4px',minWidth:'200px'}}>
                    <div style={{padding:'8px 14px',borderBottom:'1px solid #eee'}}>
                      <div style={{fontSize:'0.7rem',color:'#565959',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>Signed in as</div>
                      <div style={{fontSize:'0.78rem',fontWeight:700,color:'#0F1111',marginTop:'2px'}}>{profileEmail}</div>
                    </div>
                    <div style={{padding:'6px 14px'}}>
                      <button
                        style={{display:'block',width:'100%',textAlign:'left',padding:'6px 0',fontSize:'0.82rem',color:'#0066C0',background:'none',border:'none',cursor:'pointer',fontWeight:600}}
                        onClick={() => {
                          const newMode = globalMode === "user" ? "admin" : "user";
                          setGlobalMode(newMode);
                          setActiveTab(newMode === "user" ? "dashboard" : "fraud-mitigation");
                          setShowLogoutDropdown(false);
                        }}
                      >
                        {globalMode === "user" ? "🔧 Switch to Admin Mode" : "🛍️ Switch to User Mode"}
                      </button>
                      <button
                        style={{display:'block',width:'100%',textAlign:'left',padding:'6px 0',fontSize:'0.82rem',color:'#0F1111',background:'none',border:'none',cursor:'pointer'}}
                        onClick={() => { setShowLogoutDropdown(false); setActiveTab("dashboard"); }}
                      >
                        Your Account
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{display:'block',width:'100%',textAlign:'left',padding:'6px 0',fontSize:'0.82rem',color:'#B12704',background:'none',border:'none',cursor:'pointer',fontWeight:600}}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <button
                onClick={() => setActiveTab("cart")}
                className="navbar-link flex items-end gap-1.5"
                style={{padding:'4px 8px',position:'relative'}}
              >
                <div className="relative flex items-center">
                  <ShoppingCart className="w-[30px] h-[25px] text-white" />
                  <span style={{
                    position:'absolute',
                    top:'-6px',
                    left:'14px',
                    background:'#F08804',
                    color:'#FFF',
                    borderRadius:'50%',
                    width:'16px',
                    height:'16px',
                    fontSize:'0.65rem',
                    fontWeight:900,
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center'
                  }}>
                    {shoppingBag.length}
                  </span>
                </div>
                <span style={{fontSize:'0.78rem',fontWeight:700, marginBottom: '2px'}}>Cart</span>
              </button>
            </div>
          </nav>

          {/* ── AMAZON SUB-NAV (row 2: dark gray) ── */}
          <div className="amz-subnav">
            <div className="amz-subnav-item" style={{gap:'4px',fontWeight:700}}>
              <img src="/menu_icon.png" alt="Menu" style={{width: '18px', height: '18px'}} /> All
            </div>
            {/* Mode badge */}
            <div style={{display:'flex',alignItems:'center',marginLeft:'4px',marginRight:'8px'}}>
              <span style={{background: globalMode==='admin'?'#FF9900':'#007600',color:'#0F1111',fontSize:'0.65rem',fontWeight:900,padding:'2px 8px',borderRadius:'3px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                {globalMode === 'admin' ? '🔧 Admin Mode' : '🛍️ Customer Mode'}
              </span>
            </div>
            {navItems
              .filter(item => globalMode === 'user'
                ? ['dashboard','fraud-mitigation','orders','cart'].includes(item.id)
                : ['dashboard', 'fraud-mitigation', 'grading'].includes(item.id)
              )
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`amz-subnav-item ${activeTab === item.id ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              ))
            }
            <div style={{position:'relative', marginLeft:'8px'}}>
              <button
                onClick={() => setShowProfileConfig(!showProfileConfig)}
                className="amz-subnav-item"
                style={{gap:'4px'}}
              >
                ⚙️ Config <ChevronDown style={{width:'12px',height:'12px',transform:showProfileConfig?'rotate(180deg)':'none',transition:'transform 0.2s'}} />
              </button>
              {showProfileConfig && (
                <div style={{position:'absolute', top:'100%', left:0, background:'#FFF', color:'#0F1111', padding:'16px', borderRadius:'4px', border:'1px solid #DDD', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', minWidth:'250px', zIndex:100}}>
                  <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', borderBottom:'1px solid #DDD', paddingBottom:'8px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#232F3E',display:'flex',alignItems:'center',justifyContent:'center',color:'#FF9900',fontSize:'1rem',fontWeight:900,flexShrink:0}}>
                      {profileUserId.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontSize:'0.85rem',fontWeight:700}}>{profileUserId}</div>
                      <div style={{fontSize:'0.75rem',color:'#565959'}}>📍 ZIP {profileZip}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {[
                      { label: "User ID", value: profileUserId, setter: setProfileUserId, type: "text" },
                      { label: "Email", value: profileEmail, setter: setProfileEmail, type: "email" },
                      { label: "IP Address", value: profileIp, setter: setProfileIp, type: "text" },
                      { label: "Zipcode", value: profileZip, setter: (v: string) => { setProfileZip(v); }, type: "text" },
                      { label: "Prior Returns", value: String(profilePriorReturns), setter: (v: string) => setProfilePriorReturns(parseInt(v) || 0), type: "number" },
                    ].map(field => (
                      <div key={field.label}>
                        <label style={{fontSize:'0.75rem',fontWeight:700,color:'#565959',display:'block',marginBottom:'2px'}}>{field.label}</label>
                        <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} style={{padding:'4px 8px',fontSize:'0.85rem',border:'1px solid #a0a0a0',borderRadius:'3px',width:'100%'}} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="amz-subnav-item" onClick={() => setShowXRayModal(true)} style={{marginLeft:'auto',cursor:'pointer',color:'#FF9900'}}>
              ⚡ Architecture X-Ray
            </div>
          </div>

          <div className="dashboard-container">



            {/* ── MAIN CONTENT ── */}
            <main className="flex flex-col gap-5 min-w-0 min-h-[85vh]">

              {/* ── PRODUCT CARD HAS BEEN MOVED TO INDIVIDUAL LAYERS ── */}

              {/* ── SIZING RESULT CARD ── */}
              {sizingResult && (
                <div className="glass-card flex flex-col gap-4">
                  <div className="section-title-bar">
                    <h2>AI Fit Proportions Breakdown</h2>
                    <span className="section-badge badge-layer-1">L1: Sizing Result</span>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
                    <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-0.5">Powered by Amazon Bedrock Insights</div>
                      <div className="text-xs text-amber-700 font-medium leading-relaxed"><strong>Predictive Warning:</strong> This exact SKU has a <strong>24% higher return velocity</strong> across Amazon fulfillment centers due to shoulder width mismatches. We highly recommend accepting the AI size below.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 py-2 px-5 rounded-xl font-mono">{sizingResult.recommendedSize}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-slate-600">Match Confidence</span><span className="text-indigo-600">{sizingResult.confidenceScore}%</span></div>
                      <div className="progress-bar-container"><div className="progress-bar-fill" style={{ width: `${sizingResult.confidenceScore}%` }} /></div>
                    </div>
                  </div>
                  {sizingResult.predictedDimensions && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(sizingResult.predictedDimensions).map(([key, val]: any) => (
                        <div key={key} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">{key}</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">{val} in</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">"{sizingResult.reasoning}"</p>
                </div>
              )}

              {/* ── METRICS STRIP ── */}
              <div className="metrics-card-strip">
                {[
                  { icon: ShoppingBag, color: "indigo", label: "Processed Audits", value: metrics.totalProcessed.toString() },
                  { icon: TrendingDown, color: "emerald", label: "Return Deflection", value: `${metrics.deflectedRate}%` },
                  { icon: Compass, color: "amber", label: "P2P Route Matches", value: metrics.p2pMatched.toString() },
                  { icon: ShieldCheck, color: "rose", label: "Fraud Blocked", value: `${metrics.fraudAttemptsBlocked} blocked` },
                ].map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className="metric-strip-card">
                    <div className={`metric-strip-icon-box ${color}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <div style={{fontSize:'0.68rem',color:'#565959',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
                      <div style={{fontSize:'1rem',fontWeight:800,color:'#0F1111'}}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── LAYER PANELS ── */}
              {activeTab === "dashboard" && <L0Dashboard />}
              {activeTab === "size-assist" && <L1Sizing />}
              {activeTab === "fraud-mitigation" && <L2Fraud />}
              {activeTab === "deflection" && <L3Deflection />}
              {activeTab === "grading" && <L4Grading />}
              {activeTab === "logistics" && <L5Logistics />}
              {activeTab === "orders" && <L6Orders />}
              {activeTab === "cart" && <L7Cart />}

            </main>
          </div>

          {/* X-Ray Architecture Modal */}
          {showXRayModal && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowXRayModal(false)}>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
                  <div>
                    <h3 className="font-extrabold text-white text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Platform Architecture X-Ray</h3>
                    <p className="text-xs text-slate-400 mt-1">How ReLoop scales using advanced Cloud and AI infrastructure.</p>
                  </div>
                  <button onClick={() => setShowXRayModal(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto flex flex-col gap-6 bg-slate-900">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { layer: "L1 & L2: Predictive & Vision", stack: "Proprietary Vision Engine", desc: "Computer vision models analyze images for fraud artifacts. Predictive LLMs provide proactive return velocity warnings." },
                      { layer: "L3: Generative AI Chat", stack: "LLM Streaming API", desc: "Streams interactive troubleshooting via Edge API → Lambda → LLM to deflect returns before they happen." },
                      { layer: "L4: Grading Ledger", stack: "Distributed Ledger DB", desc: "Immutable grading records stored in high-throughput NoSQL for fast retrieval, powering dynamic Seller Trust scores." },
                      { layer: "L5: Distributed Routing", stack: "Geospatial Service", desc: "Calculates local buyer proximity and routes items directly to neighborhood drops, bypassing Central Warehouses." },
                      { layer: "L6: Green Economy Engine", stack: "Event Queue Manager", desc: "Asynchronous queues manage the Priority Jump ('Rapido') locks and Stripe payment events at massive scale." },
                      { layer: "MKT: Circular Marketplace", stack: "Radius-Match Feed Engine", desc: "Local re-commerce feed matched within 100km radius with trust scores, CO₂ savings, and grading ledger integration." },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{item.layer}</div>
                        <div className="text-sm font-extrabold text-white font-mono flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {item.stack}</div>
                        <div className="text-xs text-slate-400 leading-relaxed">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 border-t border-slate-800 bg-slate-900/80 text-center">
                  <button className="btn btn-secondary py-2.5 px-8 text-xs font-bold border-slate-700 text-white hover:bg-slate-800" onClick={() => setShowXRayModal(false)}>Close X-Ray</button>
                </div>
              </div>
            </div>
          )}

          {/* BRACKETING MODAL */}
          {showBracketingModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Size Bracketing Activated 🎯</h3>
                    <p className="text-xs text-slate-500 mt-1">You've added 2 sizes — this triggers the AI sizing scan to determine your perfect fit.</p>
                  </div>
                  <button onClick={() => setShowBracketingModal(false)} className="text-slate-300 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-medium text-indigo-700">Select a product and use the <strong>AI Size Recommender</strong> directly from the product details.</div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary w-full py-2 text-xs" onClick={() => setShowBracketingModal(false)}>Got it</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </>
    </AppContext.Provider>
  );
}
