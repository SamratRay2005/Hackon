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
  ChevronDown, Shirt, X, Truck, Map,
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
import LMarketplace from "./layers/LMarketplace";

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
  const [fraudItemName, setFraudItemName] = useState("Classic Denim Jacket");
  const [fraudImage, setFraudImage] = useState<string | null>(null);
  const [fraudImageType, setFraudImageType] = useState<string>("genuine");

  // L3 Chat
  const [deflectProduct, setDeflectProduct] = useState("Smart Drip Coffee Maker");
  const [deflectSku, setDeflectSku] = useState("CF-Mkr-99");
  const [deflectReason, setDeflectReason] = useState("Defective / Won't turn on");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "bot", content: "Hi there! I see you want to return your **Smart Drip Coffee Maker** because it won't turn on. Before we issue a return label, let's see if we can resolve this together! Can you check if the power indicator light is blinking when you plug it in?" }
  ]);
  const [ifixitGuides, setIfixitGuides] = useState<Array<any>>([]);

  // L4 Grading
  const [gradingSku, setGradingSku] = useState("CF-Mkr-99");
  const [gradingItemName, setGradingItemName] = useState("Smart Drip Coffee Maker");
  const [ledgerRecords, setLedgerRecords] = useState<Array<any>>([]);

  // L5 Logistics
  const [logisticsSku, setLogisticsSku] = useState("DENIM-JKT-001");

  // L6 Wallet
  const [walletInfo, setWalletInfo] = useState<{
    cashbackBalance: number;
    vouchers: Array<{ id: string; title: string; discountAmount: number; status: string; issuedAt: string }>;
    orders?: Array<{ sku: string; name: string; price: number; purchaseDate: string; category: string; returnWindowDays?: number }>;
  }>({ cashbackBalance: 0, vouchers: [], orders: [] });

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
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Fraud Claim Type
  const [fraudClaimType, setFraudClaimType] = useState<"damaged_product" | "different_product">("damaged_product");

  // Global Modes & Inspect Queue
  const [globalMode, setGlobalMode] = useState<"user" | "admin">("user");
  const [inspectQueue, setInspectQueue] = useState<any[]>([]);

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
    return PRODUCT_CATALOG.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  const selectedProduct = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);
  const isApparelOrFootwear = !!(selectedProduct && (selectedProduct.category === "Apparel" || selectedProduct.category === "Footwear"));

  const navItems = [
    { id: "dashboard", icon: BarChart2, label: "Home", subtitle: "Dashboard & orders" },
    { id: "size-assist", icon: Shirt, label: "Find My Size", subtitle: "AI size recommender" },
    { id: "fraud-mitigation", icon: ShieldCheck, label: "Verify Return", subtitle: "Scan & authenticate" },
    { id: "deflection", icon: MessageSquare, label: "Get Help", subtitle: "Chat before you return" },
    { id: "grading", icon: Camera, label: "Inspect Item", subtitle: "Grade condition" },
    { id: "logistics", icon: Truck, label: "Arrange Shipping", subtitle: "Eco-route optimizer" },
    { id: "orders", icon: ShoppingBag, label: "My Orders", subtitle: "Purchase history" },
    { id: "cart", icon: Wallet, label: "My Cart & Rewards", subtitle: "Bag, cashback & vouchers" },
    { id: "marketplace", icon: Map, label: "Shop Pre-Loved", subtitle: "Buy near you" },
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
    fraudSku, setFraudSku,
    fraudItemName, setFraudItemName,
    deflectProduct, setDeflectProduct,
    deflectSku, setDeflectSku,
    deflectReason, setDeflectReason,
    logisticsSku, setLogisticsSku,
    gradingSku, setGradingSku,
    gradingItemName, setGradingItemName,
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
    cart, setCart,
    showBracketingModal, setShowBracketingModal,
    searchQuery, setSearchQuery,
    showSuggestions, setShowSuggestions,
    searchContainerRef,
    fraudImage, setFraudImage,
    fraudImageType, setFraudImageType,
    fraudClaimType, setFraudClaimType,
    resaleListings, setResaleListings,
    isAdminMode, setIsAdminMode,
    inspectQueue, setInspectQueue,
    // extra fields consumed by L3 via any-cast
    chatInput: "",
  };

  // ── AUTH OVERLAY ──
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>
            </div>
            <h2 className="auth-title">ReLoop Portal</h2>
            <p className="auth-subtitle">
              {authMode === "signin" ? "Sign in to access your circular returns dashboard" : "Register to initialize your green credits ledger"}
            </p>
          </div>

          {authError && <div className="auth-error mb-4">{authError}</div>}

          <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => { setAuthMode("signin"); setAuthError(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${authMode === "signin" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>Sign In</button>
            <button onClick={() => { setAuthMode("signup"); setAuthError(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${authMode === "signup" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>Register</button>
          </div>

          {authMode === "signin" ? (
            <form onSubmit={handleSignIn} className="auth-form">
              <div className="auth-field"><label>Email Address</label><input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" /></div>
              <div className="auth-field"><label>Password</label><input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" /></div>
              <button type="submit" className="btn btn-primary w-full py-2.5 mt-1">Sign In to Dashboard</button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="auth-form">
              <div className="auth-field"><label>Username</label><input type="text" required value={authUserId} onChange={e => setAuthUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="e.g. user_samrat" /></div>
              <div className="auth-field"><label>Email Address</label><input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" /></div>
              <div className="auth-field"><label>Password</label><input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="••••••••" /></div>
              <div className="flex gap-3">
                <div className="auth-field flex-1"><label>Home ZIP</label><input type="text" required value={authZip} onChange={e => setAuthZip(e.target.value)} placeholder="98101" /></div>
                <div className="auth-field flex-1"><label>Prior Returns</label><input type="number" required value={authPriorReturns} onChange={e => setAuthPriorReturns(parseInt(e.target.value) || 0)} placeholder="2" /></div>
              </div>
              <button type="submit" className="btn btn-success w-full py-2.5 mt-1">Create Circular Account</button>
            </form>
          )}

          <div className="auth-footer">
            <p className="text-[10px] text-slate-400 mt-3">Demo: Use any email + password to sign in instantly</p>
          </div>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  return (
    <AppContext.Provider value={contextValue as any}>
      <>
        <div className="min-h-screen">

          {/* ── NAVBAR ── */}
          <nav className="navbar">
            <a href="#" className="navbar-logo">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                </svg>
              </div>
              ReLoop
            </a>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => setShowXRayModal(true)} className="flex items-center gap-2 text-[11px] font-extrabold text-amber-800 bg-amber-100 px-4 py-2 rounded-full border border-amber-300 shadow hover:shadow-md hover:-translate-y-0.5 hover:bg-amber-200 transition-all active:scale-95">
                <Zap className="w-4 h-4 text-amber-600" /> Architecture X-Ray
              </button>
              <button onClick={() => setActiveTab("marketplace")} className="flex items-center gap-2 text-[11px] font-extrabold text-indigo-800 bg-indigo-100 px-4 py-2 rounded-full border border-indigo-300 shadow hover:shadow-md hover:-translate-y-0.5 hover:bg-indigo-200 transition-all active:scale-95">
                <ShoppingBag className="w-4 h-4 text-indigo-600" /> Shop Re-Commerce
              </button>
              <button onClick={() => alert("Collections feature coming soon!")} className="flex items-center gap-2 text-[11px] font-extrabold text-teal-800 bg-teal-100 px-4 py-2 rounded-full border border-teal-300 shadow hover:shadow-md hover:-translate-y-0.5 hover:bg-teal-200 transition-all active:scale-95">
                <Layers className="w-4 h-4 text-teal-600" /> Collections
              </button>
              <button onClick={() => alert("ReLoop is a circular retail engine. We intercept returns and route them directly to new buyers to save CO2 and logistics costs.")} className="flex items-center gap-2 text-[11px] font-extrabold text-rose-800 bg-rose-100 px-4 py-2 rounded-full border border-rose-300 shadow hover:shadow-md hover:-translate-y-0.5 hover:bg-rose-200 transition-all active:scale-95">
                <Heart className="w-4 h-4 text-rose-600" /> Our Mission
              </button>
            </div>

            <div className="navbar-actions flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100 shadow-sm cursor-help">
                  <Wallet className="w-3.5 h-3.5 text-emerald-500" /><span>{Math.round((walletInfo.cashbackBalance ?? 0) * 100)} Green Credits</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-full border border-indigo-100 shadow-sm cursor-help">
                  <Award className="w-3.5 h-3.5 text-indigo-500" /><span>{(walletInfo.vouchers ?? []).filter((v: any) => v.status === "active").length} Vouchers</span>
                </div>
              </div>

              <div className="relative ml-1">
                <button onClick={() => setShowLogoutDropdown(!showLogoutDropdown)} className="flex flex-row items-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm transition-all">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex flex-row items-center justify-center text-white text-[9px] uppercase">{profileUserId.charAt(0)}</div>
                  <span className="hidden sm:inline-block">{profileUserId}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showLogoutDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</div>
                      <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">{profileEmail}</div>
                      <button
                        className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        onClick={() => {
                          const newMode = globalMode === "user" ? "admin" : "user";
                          setGlobalMode(newMode);
                          setActiveTab(newMode === "user" ? "dashboard" : "grading");
                          setShowLogoutDropdown(false);
                        }}
                      >
                        Switch to {globalMode === "user" ? "Admin" : "User"} Mode
                      </button>
                    </div>
                    <div className="p-2 flex flex-col gap-1.5">
                      <button onClick={() => { setShowLogoutDropdown(false); setActiveTab("dashboard"); }} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:bg-white hover:border-indigo-300 hover:shadow transition-all flex items-center gap-2 group">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" /> Dashboard Profile
                      </button>
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg shadow-sm hover:bg-white hover:border-rose-300 hover:shadow transition-all flex items-center gap-2 group">
                        <ChevronRight className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-1 transition-transform" /> Secure Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>

          <div className="dashboard-container">

            {/* ── LEFT SIDEBAR ── */}
            <aside className="sidebar-container lg:sticky lg:top-20 h-fit">
              <div className="glass-card flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{profileUserId}</div>
                    <div className="text-[10px] text-slate-400 font-medium">ZIP: {profileZip}</div>
                  </div>
                </div>
                <button onClick={() => setShowProfileConfig(!showProfileConfig)} className="w-full py-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5">
                  {showProfileConfig ? "Close Config" : "Inspect Session"}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showProfileConfig ? "rotate-180" : ""}`} />
                </button>
                {showProfileConfig && (
                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
                    {[
                      { label: "User ID", value: profileUserId, setter: setProfileUserId, type: "text" },
                      { label: "Email", value: profileEmail, setter: setProfileEmail, type: "email" },
                      { label: "IP Address", value: profileIp, setter: setProfileIp, type: "text" },
                      { label: "Zipcode", value: profileZip, setter: (v: string) => { setProfileZip(v); }, type: "text" },
                      { label: "Prior Returns", value: String(profilePriorReturns), setter: (v: string) => setProfilePriorReturns(parseInt(v) || 0), type: "number" },
                    ].map(field => (
                      <div key={field.label}>
                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{field.label}</label>
                        <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} className="py-1 px-2 text-[11px] border border-slate-200 rounded-lg w-full mt-0.5" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card flex flex-col gap-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1.5 border-b border-slate-100">
                  {globalMode === "user" ? "Customer Flow" : "Admin Backoffice"}
                </div>
                <nav className="sidebar-nav-list">
                  {navItems
                    .filter((item) => {
                      if (globalMode === "user") {
                        return ["dashboard", "size-assist", "fraud-mitigation", "deflection", "logistics", "wallet", "marketplace"].includes(item.id);
                      } else {
                        // Admin mode
                        return ["grading", "fraud-mitigation"].includes(item.id);
                      }
                    })
                    .map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.id} onClick={() => setActiveTab(item.id)} className={`layer-sidebar-btn ${activeTab === item.id ? "active" : ""}`}>
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate flex flex-col text-left leading-none">
                          <span>{item.label}</span>
                          <span className="text-[9px] font-normal opacity-60 mt-0.5">{item.subtitle}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
                <div className="text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100 text-center">
                  Match Score: <span className="text-indigo-600 font-extrabold">94%</span>
                </div>
              </div>

              {cart.length > 0 && globalMode === "user" && (
                <div className="glass-card flex flex-col gap-2">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>Size Cart</span>
                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px]">{cart.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded text-[9px] flex-shrink-0">Size: {item.size}</span>
                          <span className="text-slate-600 truncate">{item.name.split(" ").slice(0, 2).join(" ")}</span>
                        </div>
                        <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0 ml-1"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex flex-col gap-5 min-w-0">

              {/* ── PRODUCT CARD ── */}
              {globalMode === "user" && (
                <div className="glass-card product-card-restructured">
                  <div className="product-image-container">
                    <img src={getSKUReferenceImage(selectedProductSku)} alt={selectedProduct?.name || "Product"} className="product-image" />
                  </div>

                  <div className="product-info-container">
                    <div>
                      <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        {isApparelOrFootwear ? "Sizing & Return Flow" : "Return Flow"}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-800 mt-1.5 leading-tight">{selectedProduct?.name || "Classic Denim Jacket"}</h2>
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-sm text-slate-500 font-medium">
                        <span className="text-2xl font-bold text-slate-900 font-mono">${(selectedProduct?.price || 68.00).toFixed(2)}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-400">SKU: {selectedProductSku}</span>
                        {selectedProduct?.category && (
                          <><span className="text-slate-300">•</span><span className="mini-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>{selectedProduct.category}</span></>
                        )}
                      </div>
                    </div>

                    {selectedProduct && selectedProduct.sizes.length > 1 && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Select Size (Add to cart to bracket)</span>
                        <div className="fit-chip-grid">
                          {selectedProduct.sizes.map(sz => {
                            const inCart = cart.some(x => x.sku === selectedProductSku && x.size === sz);
                            return (<button key={sz} onClick={() => handleAddToCart(sz)} className={`fit-chip ${inCart ? "active" : ""}`}>{sz}</button>);
                          })}
                        </div>
                      </div>
                    )}

                    {selectedProduct && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Camera className="w-3.5 h-3.5 text-indigo-500" />
                            {isApparelOrFootwear ? "Selfie Size Scan" : "Return Photo Capture"}
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium">{isApparelOrFootwear ? "Maps your body to the size chart" : "Photo for return verification"}</span>
                        </div>
                        <WebcamCapture
                          onCapture={(base64) => {
                            if (isApparelOrFootwear) { setSizingImage(base64); }
                            else { setFraudImage(base64); setFraudImageType("custom"); }
                          }}
                          overlayType={isApparelOrFootwear ? "sizing" : "damage"}
                          compact
                        />
                        {isApparelOrFootwear && sizingImage && (
                          <div className="mt-2">
                            <span className="mini-badge success mb-1.5">Image Ready</span>
                            <img src={sizingImage} className="upload-preview mt-1" alt="Sizing photo" />
                          </div>
                        )}
                        {!isApparelOrFootwear && fraudImage && (
                          <div className="mt-2"><span className="mini-badge success mb-1.5">Photo captured — head to Verify Return tab to scan</span></div>
                        )}
                      </div>
                    )}

                    {isApparelOrFootwear ? (
                      <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3">
                        <div className="text-2xl font-extrabold text-indigo-600 bg-white border border-indigo-200 py-1 px-3 rounded-xl font-mono min-w-[3rem] text-center shadow-sm">{sizingResult?.recommendedSize || "—"}</div>
                        <div className="flex-1 text-xs text-slate-500 font-medium leading-relaxed">{sizingResult?.reasoning || "Head to \"Find My Size\" tab → scan your selfie → get a personalised AI size recommendation."}</div>
                        {sizingResult && <span className="mini-badge info flex-shrink-0">AI Result</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5 text-slate-500" /></div>
                        <div className="flex-1 text-xs text-slate-500 font-medium leading-relaxed">Head to <strong className="text-slate-700">Verify Return</strong> tab to scan your return photo for AI fraud detection.</div>
                      </div>
                    )}

                    {/* Product Search */}
                    <div ref={searchContainerRef} className="relative mt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Search &amp; Change Product</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-8 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] placeholder-slate-400 transition-all font-semibold"
                          placeholder="Search 150+ products by name or SKU..."
                          value={searchQuery}
                          onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                          onFocus={() => setShowSuggestions(true)}
                        />
                        {searchQuery && (<button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600" onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}><X className="w-3 h-3" /></button>)}
                      </div>
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute z-[999] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {filteredSuggestions.map(p => (
                            <div key={p.sku} className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between gap-2" onClick={() => { setSelectedProductSku(p.sku); setSearchQuery(`${p.name} (${p.sku})`); setShowSuggestions(false); }}>
                              <div><div className="text-xs font-bold text-slate-800">{p.name}</div><div className="text-[10px] text-indigo-500 font-mono">SKU: {p.sku}</div></div>
                              <span className="text-emerald-600 font-extrabold text-xs font-mono">${p.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{label}</div>
                      <div className="text-base font-extrabold text-slate-800">{value}</div>
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
              {activeTab === "marketplace" && <LMarketplace />}

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
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-medium text-indigo-700">Head to the <strong>Find My Size</strong> tab, capture your photo and click "Analyze Photo" to get your AI size recommendation.</div>
                <div className="flex gap-2">
                  <button className="btn btn-primary flex-1 py-2 text-xs" onClick={() => { setShowBracketingModal(false); setActiveTab("size-assist"); }}>Go to Size Finder</button>
                  <button className="btn btn-secondary flex-1 py-2 text-xs" onClick={() => setShowBracketingModal(false)}>Continue Shopping</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </>
    </AppContext.Provider>
  );
}
