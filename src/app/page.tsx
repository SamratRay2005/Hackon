"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShoppingBag, 
  AlertTriangle, 
  Compass, 
  ShieldCheck, 
  MessageSquare, 
  Leaf, 
  Award, 
  DollarSign, 
  CheckCircle, 
  RefreshCw, 
  Upload, 
  X, 
  Clock, 
  Truck, 
  ArrowRight,
  TrendingDown,
  Info,
  Layers,
  Heart,
  ChevronRight,
  UserCheck,
  Cpu
} from "lucide-react";
import confetti from "canvas-confetti";

// ----------------------------------------------------
// HUMAN-READABLE HIGH-FIDELITY MOCK SVG ILLUSTRATIONS
// ----------------------------------------------------
function svgToDataUrl(svgStr: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
}

const MOCK_SIZING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
  <rect width="640" height="480" fill="#0f111a"/>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.05)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="640" height="480" fill="url(#grid)"/>
  <circle cx="320" cy="240" r="180" fill="none" stroke="rgba(99, 102, 241, 0.1)" stroke-width="2" stroke-dasharray="10 5"/>
  <circle cx="320" cy="240" r="140" fill="none" stroke="rgba(99, 102, 241, 0.15)" stroke-width="1"/>
  <circle cx="320" cy="120" r="35" fill="#312e81" stroke="#6366f1" stroke-width="2"/>
  <path d="M 310 155 L 310 170 L 330 170 L 330 155 Z" fill="#312e81" stroke="#6366f1" stroke-width="2"/>
  <path d="M 270 170 C 240 220 250 380 270 440 L 370 440 C 390 380 400 220 370 170 Z" fill="#1e1b4b" stroke="#6366f1" stroke-width="3"/>
  <path d="M 270 170 C 230 200 220 280 230 330 C 235 340 245 340 250 330 C 255 300 255 230 270 200" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
  <path d="M 370 170 C 410 200 420 280 410 330 C 405 340 395 340 390 330 C 385 300 385 230 370 200" fill="#1e1b4b" stroke="#6366f1" stroke-width="2"/>
  <path d="M 255 185 L 385 185" stroke="#10b981" stroke-width="2" stroke-dasharray="4 4"/>
  <circle cx="255" cy="185" r="4" fill="#10b981"/>
  <circle cx="385" cy="185" r="4" fill="#10b981"/>
  <text x="320" y="178" fill="#10b981" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Shoulders: 17.5&quot;</text>
  <path d="M 265 240 L 375 240" stroke="#10b981" stroke-width="2" stroke-dasharray="4 4"/>
  <circle cx="265" cy="240" r="4" fill="#10b981"/>
  <circle cx="375" cy="240" r="4" fill="#10b981"/>
  <text x="320" y="233" fill="#10b981" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Chest: 38&quot;</text>
  <path d="M 450 85 L 450 440" stroke="#6366f1" stroke-width="1"/>
  <path d="M 445 85 L 455 85" stroke="#6366f1" stroke-width="2"/>
  <path d="M 445 440 L 455 440" stroke="#6366f1" stroke-width="2"/>
  <text x="465" y="260" fill="#6366f1" font-family="sans-serif" font-size="12" font-weight="bold" transform="rotate(90,465,260)" text-anchor="middle">Height: 5'10&quot;</text>
  <rect x="20" y="20" width="180" height="30" rx="6" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="1"/>
  <text x="30" y="39" fill="#a7f3d0" font-family="sans-serif" font-size="11" font-weight="bold">✓ FIT CALIBRATION PASS</text>
</svg>`;

const MOCK_DAMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
  <rect width="640" height="480" fill="#0f111a"/>
  <path d="M 200 120 L 220 100 L 420 100 L 440 120 L 460 380 L 180 380 Z" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
  <path d="M 280 100 L 320 140 L 360 100 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 220 100 L 280 120 M 420 100 L 360 120" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 200 120 L 120 280 L 150 300 L 210 200" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 440 120 L 520 280 L 490 300 L 430 200" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <line x1="320" y1="140" x2="320" y2="380" stroke="#38bdf8" stroke-dasharray="10 10" stroke-width="2"/>
  <circle cx="320" cy="180" r="6" fill="#f59e0b"/>
  <circle cx="320" cy="240" r="6" fill="#f59e0b"/>
  <circle cx="320" cy="300" r="6" fill="#f59e0b"/>
  <circle cx="320" cy="360" r="6" fill="#f59e0b"/>
  <circle cx="160" cy="230" r="28" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4 4"/>
  <path d="M 150 225 L 170 235 M 153 235 L 167 220 M 160 220 L 160 240" stroke="#f43f5e" stroke-width="3"/>
  <rect x="195" y="215" width="160" height="40" rx="6" fill="rgba(244, 63, 94, 0.15)" stroke="#f43f5e" stroke-width="1"/>
  <text x="205" y="232" fill="#fda4af" font-family="sans-serif" font-size="10" font-weight="bold">DEFECT DETECTED</text>
  <text x="205" y="247" fill="#94a3b8" font-family="sans-serif" font-size="9">Fiber rip on outer sleeve</text>
  <rect x="20" y="20" width="180" height="30" rx="6" fill="rgba(244, 63, 94, 0.2)" stroke="#f43f5e" stroke-width="1"/>
  <text x="30" y="39" fill="#fca5a5" font-family="sans-serif" font-size="11" font-weight="bold">⚠️ DAMAGE ANALYSIS SCAN</text>
</svg>`;

const MOCK_FRAUD_SUSPICIOUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
  <rect width="640" height="480" fill="#0f111a"/>
  <path d="M 200 120 L 220 100 L 420 100 L 440 120 L 460 380 L 180 380 Z" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
  <path d="M 280 100 L 320 140 L 360 100 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 200 120 L 120 280 L 150 300 L 210 200" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 440 120 L 520 280 L 490 300 L 430 200" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
  <path d="M 330 250 L 420 330 L 350 330 Z" fill="rgba(0,0,0,0.8)" />
  <circle cx="370" cy="300" r="35" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 3"/>
  <path d="M 350 285 L 390 315 M 350 315 L 390 285" stroke="#f43f5e" stroke-width="3"/>
  <rect x="235" y="350" width="220" height="50" rx="6" fill="rgba(244, 63, 94, 0.2)" stroke="#f43f5e" stroke-width="1"/>
  <text x="245" y="368" fill="#fda4af" font-family="sans-serif" font-size="10" font-weight="bold">SHADOW PROFILE MISMATCH</text>
  <text x="245" y="382" fill="#fda4af" font-family="sans-serif" font-size="9">Light source: 180° offset detected</text>
  <text x="245" y="394" fill="#e2e8f0" font-family="sans-serif" font-size="8">Staging artifacts visible in background</text>
  <rect x="20" y="20" width="220" height="30" rx="6" fill="rgba(244, 63, 94, 0.3)" stroke="#f43f5e" stroke-width="1"/>
  <text x="30" y="39" fill="#fecdd3" font-family="sans-serif" font-size="11" font-weight="bold">🚨 FRAUD DETECTOR WARNING</text>
</svg>`;

const MOCK_GRADING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
  <rect width="640" height="480" fill="#0f111a"/>
  <rect x="240" y="360" width="160" height="30" rx="8" fill="#1e293b" stroke="#a78bfa" stroke-width="2"/>
  <rect x="250" y="370" width="140" height="10" rx="2" fill="#0f172a"/>
  <path d="M 250 160 L 250 360 L 290 360 L 290 160 Z" fill="#1e293b" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 230 130 L 370 130 L 350 160 L 250 160 Z" fill="#0f172a" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 295 230 L 385 230 C 395 270 395 320 385 350 L 295 350 Z" fill="rgba(255,255,255,0.08)" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 385 250 C 415 260 415 320 385 330" fill="none" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 310 320 C 330 330 350 320 370 330 L 370 350 L 310 350 Z" fill="rgba(255,255,255,0.15)"/>
  <circle cx="340" cy="330" r="15" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="3 3"/>
  <line x1="355" y1="330" x2="440" y2="300" stroke="#c084fc" stroke-width="1"/>
  <rect x="440" y="280" width="170" height="35" rx="4" fill="rgba(147, 51, 234, 0.15)" stroke="#c084fc" stroke-width="1"/>
  <text x="448" y="294" fill="#e9d5ff" font-family="sans-serif" font-size="9" font-weight="bold">DEFECT A: Hardwater stain</text>
  <text x="448" y="306" fill="#cbd5e1" font-family="sans-serif" font-size="8">Mineral deposit in carafe base</text>
  <circle cx="270" cy="200" r="12" fill="none" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="3 3"/>
  <line x1="258" y1="200" x2="100" y2="200" stroke="#c084fc" stroke-width="1"/>
  <rect x="20" y="180" width="160" height="35" rx="4" fill="rgba(147, 51, 234, 0.15)" stroke="#c084fc" stroke-width="1"/>
  <text x="28" y="194" fill="#e9d5ff" font-family="sans-serif" font-size="9" font-weight="bold">DEFECT B: Scuff marks</text>
  <text x="28" y="206" fill="#cbd5e1" font-family="sans-serif" font-size="8">Minor scuffs on heating column</text>
  <rect x="20" y="20" width="220" height="30" rx="6" fill="rgba(147, 51, 234, 0.2)" stroke="#a78bfa" stroke-width="1"/>
  <text x="30" y="39" fill="#e9d5ff" font-family="sans-serif" font-size="11" font-weight="bold">🔍 WAREHOUSE INSPECTION FEED</text>
</svg>`;

// SOLID MOCK IMAGE FALLBACK
const SAMPLE_MOCK_IMAGE = svgToDataUrl(MOCK_DAMAGE_SVG);

// ----------------------------------------------------
// WEBCAM & FILE UPLOADER UTILITY COMPONENT
// ----------------------------------------------------
interface WebcamCaptureProps {
  onCapture: (base64Image: string) => void;
  overlayType?: "sizing" | "damage" | "grading";
}

function WebcamCapture({ onCapture, overlayType }: WebcamCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      setStream(mediaStream);
      setActive(true);
    } catch (e: any) {
      console.error("Camera access failed:", e);
      setError("Webcam access denied or unavailable. Please use file upload/demo fallback below.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setActive(false);
  };

  // Bind the camera stream to the video element once it is mounted in the DOM
  useEffect(() => {
    if (active && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [active, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        let isBlack = true;
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 0; i < imgData.length; i += 40) {
            if (imgData[i] > 10 || imgData[i + 1] > 10 || imgData[i + 2] > 10) {
              isBlack = false;
              break;
            }
          }
        } catch (e) {
          isBlack = false;
        }

        if (isBlack) {
          let fallbackUrl = SAMPLE_MOCK_IMAGE;
          if (overlayType === "sizing") fallbackUrl = svgToDataUrl(MOCK_SIZING_SVG);
          else if (overlayType === "damage") fallbackUrl = svgToDataUrl(MOCK_DAMAGE_SVG);
          else if (overlayType === "grading") fallbackUrl = svgToDataUrl(MOCK_GRADING_SVG);
          onCapture(fallbackUrl);
        } else {
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          onCapture(base64);
        }
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          onCapture(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-3 items-center w-full mt-2">
      {active ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-indigo-500/30 bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* Alignment CSS framing boxes */}
          {overlayType === "sizing" && (
            <div className="absolute inset-0 border-2 border-dashed border-indigo-400/40 pointer-events-none flex flex-col justify-between p-6">
              <div className="border-b border-indigo-400/30 h-1/3 w-full flex justify-between">
                <div className="text-[9px] text-indigo-300 bg-black/60 px-1 py-0.5 rounded">ALIGN SHOULDERS</div>
                <div className="text-[9px] text-indigo-300 bg-black/60 px-1 py-0.5 rounded">ALIGN SHOULDERS</div>
              </div>
              <div className="border-y border-indigo-400/30 h-1/3 w-full flex items-center justify-center">
                <span className="text-[9px] text-indigo-300 bg-black/60 px-1 py-0.5 rounded">ALIGN CHEST</span>
              </div>
              <div className="h-1/3 w-full flex items-end justify-center">
                <span className="text-[9px] text-indigo-300 bg-black/60 px-1 py-0.5 rounded">FULL FRAME BODY VIEW</span>
              </div>
            </div>
          )}

          {overlayType === "damage" && (
            <div className="absolute inset-0 border-2 border-dashed border-rose-400/40 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-3/4 border-2 border-dashed border-rose-500/50 rounded flex items-center justify-center">
                <span className="text-[9px] text-rose-300 bg-black/60 px-1.5 py-0.5 rounded">PLACE DAMAGED COMPONENT IN BOX</span>
              </div>
            </div>
          )}

          {overlayType === "grading" && (
            <div className="absolute inset-0 border-2 border-dashed border-purple-400/40 pointer-events-none flex items-center justify-center">
              <div className="w-5/6 h-5/6 border border-dashed border-purple-500/50 flex flex-col justify-between p-4">
                <span className="text-[9px] text-purple-300 bg-black/60 self-start">Returned item casing align</span>
                <span className="text-[9px] text-purple-300 bg-black/60 self-end">Barcodes / label profile</span>
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            <button type="button" className="btn btn-success py-1 px-3 text-[11px] font-semibold" onClick={captureSnapshot}>
              📸 Snap Image
            </button>
            <button type="button" className="btn btn-secondary py-1 px-3 text-[11px] font-semibold" onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full items-center">
          {error && <p className="text-[10px] text-rose-400 text-center font-medium">{error}</p>}
          <div className="flex gap-2 w-full">
            <button type="button" className="btn btn-primary flex-1 py-1.5 text-xs" onClick={startCamera}>
              🎥 Enable Webcam
            </button>
            <label className="btn btn-secondary flex-1 py-1.5 text-xs text-center cursor-pointer">
              📁 Choose File
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button type="button" className="btn btn-secondary flex-1 py-1.5 text-xs" onClick={() => {
              let demoUrl = SAMPLE_MOCK_IMAGE;
              if (overlayType === "sizing") demoUrl = svgToDataUrl(MOCK_SIZING_SVG);
              else if (overlayType === "damage") demoUrl = svgToDataUrl(MOCK_DAMAGE_SVG);
              else if (overlayType === "grading") demoUrl = svgToDataUrl(MOCK_GRADING_SVG);
              onCapture(demoUrl);
            }}>
              💡 Load Demo
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ----------------------------------------------------
// MAIN DASHBOARD COMPONENT
// ----------------------------------------------------
export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  // Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [authZip, setAuthZip] = useState("98101");
  const [authPriorReturns, setAuthPriorReturns] = useState(2);
  const [authError, setAuthError] = useState<string | null>(null);

  // Header Profile Personalizations
  const [profileUserId, setProfileUserId] = useState("user_samrat");
  const [profileEmail, setProfileEmail] = useState("samrat.ray@example.com");
  const [profileIp, setProfileIp] = useState("184.22.109.5");
  const [profileZip, setProfileZip] = useState("98101");
  const [profilePriorReturns, setProfilePriorReturns] = useState(2);
  const [showProfileConfig, setShowProfileConfig] = useState(false);

  // Dashboard Metrics
  const [metrics, setMetrics] = useState({
    totalProcessed: 142,
    deflectedRate: 41,
    p2pMatched: 28,
    co2Saved: 85,
    walletCredits: 1250,
    fraudAttemptsBlocked: 8
  });

  // Layer 1 - Sizing Cart State
  const [cart, setCart] = useState<Array<{ id: string; sku: string; name: string; size: string; price: number }>>([
    { id: "1", sku: "DENIM-JKT-001", name: "Classic Denim Jacket", size: "M", price: 120.00 }
  ]);
  const [showBracketingModal, setShowBracketingModal] = useState(false);
  const [sizingImage, setSizingImage] = useState<string | null>(null);
  const [sizingLoading, setSizingLoading] = useState(false);
  const [sizingResult, setSizingResult] = useState<any>(null);

  // Layer 2 - Fraud State
  const [fraudSku, setFraudSku] = useState("DENIM-JKT-001");
  const [fraudItemName, setFraudItemName] = useState("Classic Denim Jacket");
  const [fraudImage, setFraudImage] = useState<string | null>(null);
  const [fraudImageType, setFraudImageType] = useState<string>("genuine"); // "genuine" | "staged" | "custom"
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<any>(null);

  // Layer 3 - Chat Deflection State
  const [deflectProduct, setDeflectProduct] = useState("Smart Drip Coffee Maker");
  const [deflectSku, setDeflectSku] = useState("CF-Mkr-99");
  const [deflectReason, setDeflectReason] = useState("Defective / Won't turn on");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string; hasGuide?: boolean }>>([
    { role: "bot", content: "Hi there! I see you want to return your **Smart Drip Coffee Maker** because it won't turn on. Before we issue a return label, let's see if we can resolve this together! I've loaded the troubleshooting guide. Can you check if the power indicator light is blinking when you plug it in?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [ifixitGuides, setIfixitGuides] = useState<Array<any>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Layer 4 - Warehouse Grading State
  const [gradingSku, setGradingSku] = useState("CF-Mkr-99");
  const [gradingItemName, setGradingItemName] = useState("Smart Drip Coffee Maker");
  const [gradingPhotos, setGradingPhotos] = useState<Array<string>>([]);
  const [gradingSampleType, setGradingSampleType] = useState("scratched"); // "pristine" | "scratched" | "custom"
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [ledgerRecords, setLedgerRecords] = useState<Array<any>>([]);

  // Layer 5 - P2P Logistics State
  const [logisticsSku, setLogisticsSku] = useState("DENIM-JKT-001");
  const [returnerZip, setReturnerZip] = useState("98101");
  const [buyerZip, setBuyerZip] = useState("98004");
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [logisticsResult, setLogisticsResult] = useState<any>(null);
  const [labelGenerated, setLabelGenerated] = useState(false);

  // Layer 6 - Green Credits Loyalty State
  const [walletInfo, setWalletInfo] = useState({ credits: 1250, sustainabilityScore: 48 });
  const [refundSelection, setRefundSelection] = useState<"cash" | "credits">("credits");
  const [loyaltyActions, setLoyaltyActions] = useState<Array<string>>(["p2p", "repair"]);
  const [refundBaseAmount, setRefundBaseAmount] = useState(120.00);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);

  // Cookie / LocalStorage persistence check
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
          setReturnerZip(parsed.zip);
          setIsLoggedIn(true);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Fetch balances when profileUserId is updated
  useEffect(() => {
    if (isLoggedIn) {
      fetchWalletInfo();
      fetchLedgerRecords();
      fetchGuidesForProduct("coffee maker");
    }
  }, [profileUserId, isLoggedIn]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Handle Login authentication validation
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail || !authPassword) {
      setAuthError("All fields are required.");
      return;
    }

    // Inferred user details based on inputs
    const inferredUsername = authEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user_guest";
    const userSession = {
      userId: inferredUsername,
      email: authEmail,
      zip: "98101",
      priorReturns: 1
    };

    setProfileUserId(userSession.userId);
    setProfileEmail(userSession.email);
    setProfileZip(userSession.zip);
    setProfilePriorReturns(userSession.priorReturns);
    setReturnerZip(userSession.zip);

    if (typeof window !== "undefined") {
      localStorage.setItem("activeUser", JSON.stringify(userSession));
    }

    setIsLoggedIn(true);
    confetti({ particleCount: 50, spread: 30 });
  };

  // Handle Sign Up registration and seeding
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!authUserId || !authEmail || !authPassword || !authZip) {
      setAuthError("Please complete all signup fields.");
      return;
    }

    const cleanedUsername = authUserId.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanedUsername) {
      setAuthError("Username must be alphanumeric.");
      return;
    }

    const userSession = {
      userId: cleanedUsername,
      email: authEmail,
      zip: authZip,
      priorReturns: authPriorReturns
    };

    // Seed database profile
    try {
      await fetch(`/api/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: "credits",
          actions: [],
          baseAmount: 100.0,
          userId: userSession.userId
        })
      });
    } catch (err) {
      console.error("Failed to seed new wallet during signup:", err);
    }

    setProfileUserId(userSession.userId);
    setProfileEmail(userSession.email);
    setProfileZip(userSession.zip);
    setProfilePriorReturns(userSession.priorReturns);
    setReturnerZip(userSession.zip);

    if (typeof window !== "undefined") {
      localStorage.setItem("activeUser", JSON.stringify(userSession));
    }

    setIsLoggedIn(true);
    confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
  };

  // Handle Logout cleanups
  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("activeUser");
    }
    setIsLoggedIn(false);
    setAuthEmail("");
    setAuthPassword("");
    setAuthUserId("");
    setSizingResult(null);
    setFraudResult(null);
    setLogisticsResult(null);
    setRefundResult(null);
  };

  // Load wallet info from API
  const fetchWalletInfo = async () => {
    try {
      const res = await fetch(`/api/wallet?userId=${profileUserId}`);
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
        setMetrics(prev => ({
          ...prev,
          walletCredits: data.credits,
          co2Saved: data.sustainabilityScore
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load ledger records
  const fetchLedgerRecords = async () => {
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [SAMPLE_MOCK_IMAGE], sku: "INIT_QUERY", itemName: "query", userId: profileUserId })
      });
      setLedgerRecords([
        {
          id: "ph-771",
          sku: "CF-Mkr-99",
          itemName: "Smart Drip Coffee Maker",
          grade: "B",
          defects: ["Minor scuffing on base", "Reservoir has hardwater lines"],
          resaleCategory: "Open Box - Very Good",
          hash: "5d7ee02bca5cf0b04c8614578efbdca9e79435b80a187e148e658a5be89dbf7c0",
          timestamp: "2026-06-13T10:15:00Z"
        }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch guides from iFixit
  const fetchGuidesForProduct = async (query: string) => {
    try {
      if (query.toLowerCase().includes("coffee")) {
        setIfixitGuides([
          { id: 101, title: "Drip Coffee Maker Heating Element Replacement", url: "https://www.ifixit.com/Guide/Drip+Coffee+Maker+Heating+Element+Replacement/10292", summary: "Replace the heating element inside your standard drip coffee maker." },
          { id: 102, title: "How to Descale a Coffee Machine", url: "https://www.ifixit.com/Guide/How+to+Descale+a+Coffee+Machine/11883", summary: "Descale the water pathways to clear hard mineral blockage." }
        ]);
      } else {
        setIfixitGuides([
          { id: 201, title: "Bluetooth Speaker Battery Swap", url: "https://www.ifixit.com/Guide/Bluetooth+Speaker+Battery+Replacement/8844", summary: "Swap the lithium battery inside your portable Bluetooth speaker." }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- LAYER 1 SIZING CART HANDLERS ---
  const handleAddToCart = (size: string) => {
    const isAlreadyBracketed = cart.some(item => item.sku === "DENIM-JKT-001");
    const newCart = [...cart, { 
      id: Math.random().toString(), 
      sku: "DENIM-JKT-001", 
      name: "Classic Denim Jacket", 
      size, 
      price: 120.00 
    }];
    setCart(newCart);

    if (isAlreadyBracketed) {
      setShowBracketingModal(true);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const triggerSizeAssist = async () => {
    if (!sizingImage) return;
    setSizingLoading(true);
    try {
      const res = await fetch("/api/size-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: sizingImage,
          brand: "UrbanEco",
          sku: "DENIM-JKT-001",
          sizes: cart.map(i => i.size),
          sessionId: `session-${profileUserId}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSizingResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSizingLoading(false);
    }
  };

  const applySizeRecommendation = (recommendedSize: string) => {
    const filteredCart = cart.filter(item => item.sku !== "DENIM-JKT-001");
    setCart([
      ...filteredCart,
      { id: "rec-size", sku: "DENIM-JKT-001", name: "Classic Denim Jacket", size: recommendedSize, price: 120.00 }
    ]);
    setShowBracketingModal(false);
    setSizingResult(null);
    setSizingImage(null);
    setMetrics(prev => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
    confetti({ particleCount: 65, spread: 50, origin: { y: 0.8 } });
  };

  // --- LAYER 2 FRAUD SHIELD HANDLERS ---
  const triggerFraudCheck = async () => {
    if (!fraudImage) return;
    setFraudLoading(true);
    try {
      const res = await fetch("/api/risk-mitigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: fraudImage,
          userId: profileUserId,
          email: profileEmail,
          ipAddress: profileIp,
          sku: fraudSku,
          itemName: fraudItemName,
          priorReturns: profilePriorReturns
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFraudResult(data);
        if (data.recommendedAction === "BLOCK") {
          setMetrics(prev => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFraudLoading(false);
    }
  };

  // --- LAYER 3 INTERCEPT CHAT HANDLERS ---
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat-deflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg }
          ],
          productName: deflectProduct,
          reasonCode: deflectReason,
          guides: ifixitGuides
        })
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        if (reader) {
          let botMessage = "";
          setChatMessages(prev => [...prev, { role: "bot", content: "" }]);
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const lines = text.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim();
                if (dataStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const chunk = parsed.choices[0]?.delta?.content || "";
                  botMessage += chunk;
                  
                  setChatMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { role: "bot", content: botMessage };
                    return next;
                  });
                } catch (e) {}
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const resolveDeflection = async () => {
    try {
      const res = await fetch("/api/deflection-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profileUserId,
          productName: deflectProduct,
          reasonCode: deflectReason,
          deflected: true,
          co2Saved: 5,
          creditsAwarded: 150
        })
      });
      if (res.ok) {
        fetchWalletInfo();
        fetchLedgerRecords();
      }
    } catch (e) {
      console.error("Deflection logging failed:", e);
    }

    setMetrics(prev => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      deflectedRate: Math.round(((prev.totalProcessed * prev.deflectedRate / 100) + 1) / (prev.totalProcessed + 1) * 100)
    }));
    setChatMessages(prev => [...prev, {
      role: "bot",
      content: "🎉 **Deflection Successful!** Your return has been cancelled. We've logged this deflection to the cryptographic database registry and rewarded your loyalty credits. Thank you for choosing to repair!"
    }]);
    confetti({ colors: ["#10b981", "#6366f1"], particleCount: 80 });
  };

  // --- LAYER 4 AUTO INSPECTOR GRADING HANDLERS ---
  const triggerWarehouseGrading = async () => {
    if (gradingPhotos.length === 0) return;
    setGradingLoading(true);
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: gradingPhotos,
          sku: gradingSku,
          itemName: gradingItemName,
          userId: profileUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGradingResult(data.report);
        setLedgerRecords(prev => [data.report, ...prev]);
        setMetrics(prev => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGradingLoading(false);
    }
  };

  // --- LAYER 5 LOGISTICS HANDLERS ---
  const triggerP2PRouteCalculation = async () => {
    setLogisticsLoading(true);
    setLabelGenerated(false);
    try {
      const res = await fetch("/api/p2p-logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: logisticsSku,
          returnerZip: profileZip,
          buyerZip
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLogisticsResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogisticsLoading(false);
    }
  };

  // Leaflet Rendering
  useEffect(() => {
    if (typeof window === "undefined" || !logisticsResult) return;
    const L = (window as any).L;
    if (!L) return;

    const mapContainer = document.getElementById("map-element");
    if (!mapContainer) return;
    (mapContainer as any)._leaflet_id = null;
    mapContainer.innerHTML = "";

    const origin = logisticsResult.p2pRoute.origin.coords;
    const dest = logisticsResult.p2pRoute.destination.coords;
    const centralWh = logisticsResult.warehouseRoute.destination.coords;

    const map = L.map("map-element").setView(origin, 9);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    L.marker(origin).addTo(map)
      .bindPopup(`<b>Returns Origin</b><br>${logisticsResult.p2pRoute.origin.label}`)
      .openPopup();

    L.marker(dest).addTo(map)
      .bindPopup(`<b>Matched Local Buyer</b><br>${logisticsResult.p2pRoute.buyerName}<br>${logisticsResult.p2pRoute.destination.label}`);

    L.marker(centralWh).addTo(map)
      .bindPopup(`<b>Louisville Central Warehouse</b><br>${logisticsResult.warehouseRoute.destination.label}`);

    L.polyline([origin, dest], {
      color: "#10b981",
      weight: 4,
      dashArray: "5, 10",
      opacity: 0.9
    }).addTo(map);

    L.polyline([origin, centralWh], {
      color: "#f43f5e",
      weight: 2,
      opacity: 0.4
    }).addTo(map);

    const bounds = L.latLngBounds([origin, dest, centralWh]);
    map.fitBounds(bounds, { padding: [40, 40] });

  }, [logisticsResult]);

  // --- LAYER 6 WALLET HANDLERS ---
  const handleToggleLoyaltyAction = (actionId: string) => {
    if (loyaltyActions.includes(actionId)) {
      setLoyaltyActions(loyaltyActions.filter(a => a !== actionId));
    } else {
      setLoyaltyActions([...loyaltyActions, actionId]);
    }
  };

  const processWalletRefund = async () => {
    setRefundLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choice: refundSelection,
          actions: refundSelection === "credits" ? loyaltyActions : [],
          baseAmount: refundBaseAmount,
          userId: profileUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRefundResult(data);
        fetchWalletInfo();
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: refundSelection === "credits" ? ["#10b981", "#34d399", "#6366f1"] : ["#cbd5e1", "#94a3b8"]
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefundLoading(false);
    }
  };

  // ----------------------------------------------------
  // AUTHENTICATION OVERLAY LAYOUT
  // ----------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2 className="auth-title">Project Anti-Gravity</h2>
            <p className="auth-subtitle">
              {authMode === "signin" 
                ? "Sign in to access your circular returns portal" 
                : "Register account to initialize green credits ledger"}
            </p>
          </div>

          {authError && <div className="auth-error mb-4">{authError}</div>}

          {authMode === "signin" ? (
            <form onSubmit={handleSignIn} className="auth-form">
              <div className="auth-field">
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  placeholder="name@example.com" 
                />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input 
                  type="password" 
                  required 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full py-2.5 mt-2">
                Sign In to Account
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="auth-form">
              <div className="auth-field">
                <label>User ID (Username)</label>
                <input 
                  type="text" 
                  required 
                  value={authUserId} 
                  onChange={(e) => setAuthUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} 
                  placeholder="e.g. user_samrat" 
                />
              </div>
              <div className="auth-field">
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  placeholder="name@example.com" 
                />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input 
                  type="password" 
                  required 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="auth-field">
                  <label>Home Zipcode</label>
                  <input 
                    type="text" 
                    required 
                    value={authZip} 
                    onChange={(e) => setAuthZip(e.target.value)} 
                    placeholder="98101" 
                  />
                </div>
                <div className="auth-field">
                  <label>Prior Returns</label>
                  <input 
                    type="number" 
                    required 
                    value={authPriorReturns} 
                    onChange={(e) => setAuthPriorReturns(parseInt(e.target.value) || 0)} 
                    placeholder="2" 
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-success w-full py-2.5 mt-2">
                Create Circular Account
              </button>
            </form>
          )}

          <div className="auth-footer">
            {authMode === "signin" ? (
              <>
                Need a new account?{" "}
                <span className="auth-link" onClick={() => { setAuthMode("signup"); setAuthError(null); }}>
                  Register here
                </span>
              </>
            ) : (
              <>
                Already registered?{" "}
                <span className="auth-link" onClick={() => { setAuthMode("signin"); setAuthError(null); }}>
                  Log In
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGGED IN DASHBOARD LAYOUT
  // ----------------------------------------------------
  return (
    <div className="dashboard-container">
      {/* HEADER SECTION */}
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Project Anti-Gravity</h1>
          <div className="dashboard-subtitle">Intelligent Circular Returns Bridge — Groq & Free API Core</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card flex items-center gap-3 py-2 px-4 border border-indigo-500/20 bg-indigo-950/10 rounded-full">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <div className="text-sm font-medium">
              <span className="text-emerald-400 font-bold">{walletInfo.sustainabilityScore} kg</span> CO₂ saved
            </div>
          </div>
          <div className="glass-card flex items-center gap-3 py-2 px-4 border border-emerald-500/20 bg-emerald-950/10 rounded-full">
            <Award className="w-5 h-5 text-indigo-400" />
            <div className="text-sm font-medium">
              <span className="text-indigo-400 font-bold">{walletInfo.credits}</span> Green Credits
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary py-2 px-4 text-xs font-semibold hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/5 transition duration-150 rounded-full"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* PERSONALIZED SESSION REGISTRY CARD */}
      <div className="glass-card mb-6 border-indigo-500/10 bg-indigo-950/5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4.5 h-4.5 text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-300">
              Authenticated Session: <span className="text-white font-bold">{profileUserId}</span> | ZIP: <span className="text-white font-bold">{profileZip}</span>
            </span>
          </div>
          <button 
            onClick={() => setShowProfileConfig(!showProfileConfig)}
            className="btn btn-secondary py-1 px-3 text-xs"
          >
            {showProfileConfig ? "Close Profile Config" : "Inspect Session Variables"}
          </button>
        </div>
        
        {showProfileConfig && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-indigo-500/10 text-xs">
            <div>
              <label className="text-[10px] text-indigo-400 uppercase font-semibold">User Registry ID</label>
              <input 
                type="text" 
                value={profileUserId} 
                onChange={(e) => {
                  const newId = e.target.value;
                  setProfileUserId(newId);
                }} 
                className="py-1 px-2 text-xs mt-1" 
              />
            </div>
            <div>
              <label className="text-[10px] text-indigo-400 uppercase font-semibold">Registered Email</label>
              <input 
                type="text" 
                value={profileEmail} 
                onChange={(e) => setProfileEmail(e.target.value)} 
                className="py-1 px-2 text-xs mt-1" 
              />
            </div>
            <div>
              <label className="text-[10px] text-indigo-400 uppercase font-semibold">Current IP address</label>
              <input 
                type="text" 
                value={profileIp} 
                onChange={(e) => setProfileIp(e.target.value)} 
                className="py-1 px-2 text-xs mt-1" 
              />
            </div>
            <div>
              <label className="text-[10px] text-indigo-400 uppercase font-semibold">Location Zipcode</label>
              <input 
                type="text" 
                value={profileZip} 
                onChange={(e) => {
                  const newZip = e.target.value;
                  setProfileZip(newZip);
                  setReturnerZip(newZip);
                }} 
                className="py-1 px-2 text-xs mt-1" 
              />
            </div>
            <div>
              <label className="text-[10px] text-indigo-400 uppercase font-semibold">Prior 30-Day Returns</label>
              <input 
                type="number" 
                value={profilePriorReturns} 
                onChange={(e) => setProfilePriorReturns(parseInt(e.target.value) || 0)} 
                className="py-1 px-2 text-xs mt-1" 
              />
            </div>
          </div>
        )}
      </div>

      {/* METRICS SUMMARY GRID */}
      <section className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper indigo">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Processed Audits</span>
            <span className="metric-value">{metrics.totalProcessed}</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper emerald">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Return Deflection</span>
            <span className="metric-value">{metrics.deflectedRate}%</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper amber">
            <Compass className="w-5 h-5" />
          </div>
          <div className="metric-content">
            <span className="metric-label">P2P Route Matches</span>
            <span className="metric-value">{metrics.p2pMatched}</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper rose">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="metric-content">
            <span className="metric-label">Fraud Blocked</span>
            <span className="metric-value">{metrics.fraudAttemptsBlocked} attempts</span>
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="main-grid">
        <aside className="glass-card flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">Architecture Layers</h3>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <Layers className="w-4 h-4" />
              <span>Core Ledger Hub</span>
            </button>

            <button 
              className={`nav-item ${activeTab === "size-assist" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("size-assist");
                setSizingResult(null);
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>L1: Sizing Assist</span>
            </button>

            <button 
              className={`nav-item ${activeTab === "fraud-mitigation" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("fraud-mitigation");
                setFraudResult(null);
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>L2: Fraud Shield</span>
            </button>

            <button 
              className={`nav-item ${activeTab === "deflection" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("deflection");
                fetchGuidesForProduct("coffee maker");
              }}
            >
              <MessageSquare className="w-4 h-4" />
              <span>L3: Intercept Chat</span>
            </button>

            <button 
              className={`nav-item ${activeTab === "grading" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("grading");
                setGradingResult(null);
                fetchLedgerRecords();
              }}
            >
              <Cpu className="w-4 h-4" />
              <span>L4: Auto Inspector</span>
            </button>

            <button 
              className={`nav-item ${activeTab === "logistics" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("logistics");
                setLogisticsResult(null);
              }}
            >
              <Compass className="w-4 h-4" />
              <span>L5: P2P Logistics</span>
            </button>

            <button 
              className={`nav-item ${activeTab === "wallet" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("wallet");
                setRefundResult(null);
              }}
            >
              <Award className="w-4 h-4" />
              <span>L6: Loyalty Wallet</span>
            </button>
          </nav>
        </aside>

        <main className="flex flex-col gap-6">
          {/* TAB 0 - LEDGER CHAIN */}
          {activeTab === "dashboard" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>Product Health & Circular Ledger</h2>
                <span className="section-badge badge-layer-4">Ledger Overview</span>
              </div>
              <p className="text-gray-400 text-sm">
                Immutable registry chain recording circular transactions for active User ID **{profileUserId}**. Tracks returns, grading taxonomy results, and deflection resolutions.
              </p>

              <div>
                <table className="size-chart-table">
                  <thead>
                    <tr>
                      <th>Ledger Block ID</th>
                      <th>Product SKU</th>
                      <th>Condition Grade</th>
                      <th>Identified Defects</th>
                      <th>Immutability SHA-256 Hash Proof</th>
                      <th>Resale Output Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-gray-500 py-4">No records found for active user {profileUserId}.</td>
                      </tr>
                    ) : (
                      ledgerRecords.map((record, index) => (
                        <tr key={record.id || index}>
                          <td className="font-mono text-indigo-400 text-xs">{record.id}</td>
                          <td>{record.sku}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-400`}>
                              Grade {record.grade}
                            </span>
                          </td>
                          <td className="text-left text-xs text-gray-300">
                            {record.defects && record.defects.join(", ")}
                          </td>
                          <td className="font-mono text-xs text-gray-500 max-w-xs truncate">{record.hash}</td>
                          <td className="text-gray-300 text-xs">{record.resaleCategory}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 1 - SIZING ASSIST */}
          {activeTab === "size-assist" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>Pre-Purchase Bracketing Intervention</h2>
                <span className="section-badge badge-layer-1">Layer 1</span>
              </div>
              
              <div className="demo-split-grid">
                <div className="glass-card flex flex-col gap-4 border-indigo-500/10 bg-indigo-950/5">
                  <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                    <ShoppingBag className="w-4.5 h-4.5" />
                    Personalized Cart ({profileUserId})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                        <div>
                          <div className="font-semibold text-sm">{item.name}</div>
                          <div className="text-xs text-gray-400">SKU: {item.sku} | Size: <span className="text-indigo-300 font-bold">{item.size}</span></div>
                        </div>
                        <button className="text-gray-500 hover:text-rose-400 transition" onClick={() => handleRemoveFromCart(item.id)}>
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-800">
                    <label>Simulate Bracketing - Add Duplicate Size:</label>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary flex-1 py-1.5 text-xs" onClick={() => handleAddToCart("M")}>Add Size M</button>
                      <button className="btn btn-secondary flex-1 py-1.5 text-xs" onClick={() => handleAddToCart("L")}>Add Size L</button>
                    </div>
                  </div>
                </div>

                <div className="glass-card flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-200">Sizing selfie Capture Engine</h3>
                  {showBracketingModal ? (
                    <div className="p-3 border border-indigo-500/20 bg-indigo-950/10 rounded-xl flex flex-col gap-3">
                      <WebcamCapture onCapture={(base64) => setSizingImage(base64)} overlayType="sizing" />
                      
                      {sizingImage && (
                        <div className="text-center mt-2">
                          <span className="mini-badge success">✓ Live Selfie Captured</span>
                          <img src={sizingImage} className="upload-preview mt-2 border border-gray-800" alt="Selfie" />
                        </div>
                      )}

                      <button 
                        className="btn btn-primary w-full py-2" 
                        disabled={!sizingImage || sizingLoading}
                        onClick={triggerSizeAssist}
                      >
                        {sizingLoading ? "Llama Vision Analyzing..." : "Run Llama 4 Vision Sizing Check"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-900/60 p-6 rounded-lg text-center text-xs text-gray-500 my-auto">
                      Add a duplicate size in the shopping cart to prompt hardware sizing interception modal.
                    </div>
                  )}

                  {sizingResult && (
                    <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-indigo-300 uppercase">Proportions Result</span>
                        <span className="text-[10px] text-gray-500">{sizingResult.fromMock ? "Simulated" : "Live Groq Vision"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-emerald-400 bg-emerald-500/10 py-1 px-3 rounded-lg">
                          {sizingResult.recommendedSize}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Confidence:</span>
                            <span className="font-bold">{sizingResult.confidenceScore}%</span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${sizingResult.confidenceScore}%` }}></div>
                          </div>
                        </div>
                      </div>
                      
                      {sizingResult.predictedDimensions && (
                        <div className="text-xs border-t border-gray-800 pt-3 mt-1">
                          <span className="font-bold text-gray-300 block mb-1.5">Estimated Body Metrics:</span>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {Object.entries(sizingResult.predictedDimensions).map(([key, val]: any) => (
                              <div key={key} className="bg-indigo-950/20 border border-indigo-500/10 p-2 rounded-lg text-center">
                                <span className="text-[9px] text-indigo-400 block uppercase font-semibold">{key}</span>
                                <span className="text-xs font-bold text-indigo-300">{val} in</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sizingResult.distanceBreakdown && (
                        <div className="text-xs border-t border-gray-800 pt-3">
                          <span className="font-bold text-gray-300 block mb-1.5">Euclidean Sizing Distance Matcher (1-NN):</span>
                          <div className="flex justify-between items-center gap-1.5 overflow-x-auto">
                            {Object.entries(sizingResult.distanceBreakdown).map(([size, dist]: any) => (
                              <div key={size} className={`flex-1 p-2 rounded-lg text-center border ${
                                size === sizingResult.recommendedSize 
                                  ? "bg-emerald-950/30 border-emerald-500/35 text-emerald-400 font-bold" 
                                  : "bg-gray-950/40 border-gray-800 text-gray-400"
                              }`}>
                                <span className="text-xs block">{size}</span>
                                <span className="text-[8px] block opacity-75">d = {dist}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-300 italic mt-1 font-sans">"{sizingResult.reasoning}"</p>
                      <button className="btn btn-success w-full py-1.5 text-xs font-semibold mt-1" onClick={() => applySizeRecommendation(sizingResult.recommendedSize)}>
                        Accept recommendation & Keep size {sizingResult.recommendedSize}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 - FRAUD SHIELD */}
          {activeTab === "fraud-mitigation" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>AI Fraud Shield & Risk Mitigator</h2>
                <span className="section-badge badge-layer-2">Layer 2</span>
              </div>

              <div className="demo-split-grid">
                <div className="glass-card flex flex-col gap-4 border-rose-500/10 bg-rose-950/5">
                  <h3 className="text-sm font-semibold text-rose-300">Personalized Risk Profile ({profileUserId})</h3>
                  <div className="flex flex-col gap-2 text-xs text-gray-400">
                    <div>User Email: <span className="text-gray-200">{profileEmail}</span></div>
                    <div>User IP: <span className="text-gray-200">{profileIp}</span></div>
                    <div>Zipcode: <span className="text-gray-200">{profileZip}</span></div>
                    <div>Prior 30-Day returns count: <span className="text-amber-400 font-bold">{profilePriorReturns}</span></div>
                  </div>

                  <div className="p-3 border border-rose-500/10 rounded-xl bg-gray-950/40">
                    <label className="text-[10px] text-rose-300 font-semibold mb-2">Scan Damage Claim Photo:</label>
                    <WebcamCapture onCapture={(base64) => {
                      setFraudImageType("custom");
                      setFraudImage(base64);
                    }} overlayType="damage" />
                    
                    {fraudImage && (
                      <div className="text-center mt-3">
                        <span className="mini-badge success">✓ Image Loaded Successfully</span>
                        <img src={fraudImage} className="upload-preview mt-2 border border-gray-800" alt="Claim" />
                      </div>
                    )}
                  </div>

                  {/* Demo presets inside Layer 2 */}
                  <div className="text-xs mt-1">
                    <span className="text-gray-500 block mb-1">Or Choose Preset Demo Scenarios:</span>
                    <div className="flex gap-2">
                      <button 
                        className={`btn btn-secondary flex-1 py-1.5 text-[10px] ${fraudImageType === "genuine" ? "border-indigo-500 text-indigo-400" : ""}`}
                        onClick={() => {
                          setFraudImageType("genuine");
                          setFraudImage(svgToDataUrl(MOCK_DAMAGE_SVG));
                        }}
                      >
                        ✅ Genuine Preset
                      </button>
                      <button 
                        className={`btn btn-secondary flex-1 py-1.5 text-[10px] ${fraudImageType === "staged" ? "border-rose-500 text-rose-400" : ""}`}
                        onClick={() => {
                          setFraudImageType("staged");
                          setFraudImage(svgToDataUrl(MOCK_FRAUD_SUSPICIOUS_SVG));
                        }}
                      >
                        ⚠️ Suspicious Preset
                      </button>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary w-full py-2"
                    disabled={!fraudImage || fraudLoading}
                    onClick={triggerFraudCheck}
                  >
                    {fraudLoading ? "Auditing image..." : "Scan Claim Risk & Shadows"}
                  </button>
                </div>

                <div className="glass-card flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-200">Fraud Assessment Output</h3>
                  {fraudResult ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl font-bold font-display px-4 py-2 rounded-xl border ${
                          fraudResult.riskScore > 70 ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
                          fraudResult.riskScore >= 40 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                          "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        }`}>
                          {fraudResult.riskScore}/100
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-200">Action: {fraudResult.recommendedAction}</div>
                          <span className="text-[10px] text-gray-400">
                            {fraudResult.recommendedAction === "BLOCK" ? "Suspected return fraud. Refund blocked." :
                             fraudResult.recommendedAction === "MANUAL_REVIEW" ? "Flagged for manual investigation." :
                             "Clean status. Eligible for instant green credit payout."}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-xs border-t border-gray-800 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">AI image Generation Index:</span>
                          <span className="font-semibold text-gray-200">{fraudResult.breakdown.aiGenerationScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Photographic Staging Indicators:</span>
                          <span className="font-semibold text-gray-200">{fraudResult.breakdown.photoStagingSigns}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">User Returns Velocity Index:</span>
                          <span className="font-semibold text-gray-200">{fraudResult.breakdown.userVelocityScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">IP / Email Fraud Reputation (IPQS):</span>
                          <span className="font-semibold text-gray-200">{fraudResult.breakdown.ipqsScore}%</span>
                        </div>
                      </div>

                      <div className="bg-gray-900/80 p-3 rounded-lg text-xs italic text-gray-300 border border-gray-800">
                        "{fraudResult.defectExplanation}"
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900/60 p-6 rounded-lg text-center text-xs text-gray-500 my-auto">
                      Initiate risk scan to run parallel evaluations.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 - INTERCEPT CHAT */}
          {activeTab === "deflection" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>Interception & Deflection Chat Portal</h2>
                <span className="section-badge badge-layer-3">Layer 3</span>
              </div>

              <div className="demo-split-grid">
                <div className="glass-card flex flex-col gap-4 border-amber-500/10 bg-amber-950/5">
                  <h3 className="text-sm font-semibold text-amber-300">Product Selection</h3>
                  <div>
                    <label>Appliance Category</label>
                    <select 
                      value={deflectProduct}
                      onChange={(e) => {
                        const prod = e.target.value;
                        setDeflectProduct(prod);
                        const sku = prod.includes("Coffee") ? "CF-Mkr-99" : "SPK-AIR-12";
                        setDeflectSku(sku);
                        fetchGuidesForProduct(prod.includes("Coffee") ? "coffee maker" : "speaker");
                        setChatMessages([{
                          role: "bot",
                          content: `Hi there! I see you want to return your **${prod}** due to functionality issues. Before we generate a shipping label, let's see if we can resolve this together! I've loaded the troubleshooting guide. Can you tell me if the device turns on at all when plugged in?`
                        }]);
                      }}
                    >
                      <option value="Smart Drip Coffee Maker">Smart Drip Coffee Maker</option>
                      <option value="HiFi Wireless Speaker">HiFi Wireless Speaker</option>
                    </select>
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-indigo-300 block mb-1">Loaded iFixit Context:</span>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {ifixitGuides.map(guide => (
                        <div key={guide.id} className="bg-gray-900/60 p-2 rounded border border-gray-800 text-[11px]">
                          <span className="font-semibold text-gray-300">{guide.title}</span>
                          <p className="text-gray-500 text-[9px] mt-0.5">{guide.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="chat-window">
                  <div className="chat-header">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Groq Llama 3 Deflector Agent
                    </span>
                  </div>
                  <div className="chat-messages">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`chat-bubble ${msg.role}`}>
                        <div className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 p-2 bg-gray-950/80 border-t border-gray-800">
                    <button className="btn btn-success flex-1 py-1.5 text-xs font-semibold" onClick={resolveDeflection}>
                      👍 Resolved! Cancel Return
                    </button>
                    <button className="btn btn-secondary py-1.5 text-xs font-semibold" onClick={() => {
                      setChatMessages(prev => [...prev, {
                        role: "bot",
                        content: "Understood. Proceeding to circular logistics router. Select your refund routing options in L5/L6."
                      }]);
                    }}>
                      Still need to return
                    </button>
                  </div>
                  <form onSubmit={handleSendChatMessage} className="chat-input-area">
                    <input 
                      type="text" 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)} 
                      placeholder="Type diagnostic response (e.g. yes)..."
                      className="text-xs"
                      disabled={chatLoading}
                    />
                    <button type="submit" className="btn btn-primary py-1.5 text-xs" disabled={chatLoading}>Send</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4 - WAREHOUSE AUTO GRADING */}
          {activeTab === "grading" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>Automated Product Inspection & Grading</h2>
                <span className="section-badge badge-layer-4">Layer 4</span>
              </div>

              <div className="demo-split-grid">
                <div className="glass-card flex flex-col gap-4 border-purple-500/10 bg-purple-950/5">
                  <h3 className="text-sm font-semibold text-purple-300">Inspector Camera Feed ({profileUserId})</h3>
                  <div>
                    <label>Returned Item SKU</label>
                    <input type="text" value={`${gradingItemName} (${gradingSku})`} disabled />
                  </div>

                  <div className="p-3 border border-purple-500/10 rounded-xl bg-gray-950/40">
                    <label className="text-[10px] text-purple-300 font-semibold mb-2">Capture Return Condition Snap:</label>
                    <WebcamCapture onCapture={(base64) => {
                      setGradingSampleType("custom");
                      setGradingPhotos([base64]);
                    }} overlayType="grading" />
                    
                    {gradingPhotos.length > 0 && (
                      <div className="text-center mt-3">
                        <span className="mini-badge success">✓ Photo Loaded Successfully</span>
                        <img src={gradingPhotos[0]} className="upload-preview mt-2 border border-gray-800" alt="Grading" />
                      </div>
                    )}
                  </div>

                  <button 
                    className="btn btn-primary w-full py-2.5" 
                    disabled={gradingPhotos.length === 0 || gradingLoading}
                    onClick={triggerWarehouseGrading}
                  >
                    {gradingLoading ? "Analyzing defect textures..." : "Grade Product Conditions"}
                  </button>
                </div>

                <div className="glass-card flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-200">Product Health Card</h3>
                  {gradingResult ? (
                    <div className="bg-gray-900 border border-purple-500/20 p-4 rounded-xl flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-gray-100">{gradingResult.itemName}</h4>
                          <span className="text-[10px] text-gray-500">SKU: {gradingResult.sku}</span>
                        </div>
                        <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 font-extrabold text-sm">
                          Grade {gradingResult.grade}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-purple-300 block mb-1">Defect Taxonomy Findings:</span>
                        <ul className="list-disc pl-4 text-gray-300 flex flex-col gap-1">
                          {gradingResult.defects.map((d: string, i: number) => <li key={i}>{d}</li>)}
                        </ul>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-gray-800">
                        <span className="text-gray-500">Functional Score:</span>
                        <span className="font-bold text-emerald-400">{gradingResult.functionalScore}/10</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Resale channel:</span>
                        <span className="font-bold text-gray-200">{gradingResult.resaleCategory}</span>
                      </div>
                      <div className="bg-indigo-950/10 border border-indigo-500/10 p-2 rounded text-[9px] mt-1">
                        <span className="font-mono text-indigo-400 block mb-0.5">LEDGER BLOCK SHA-256 SIGNATURE:</span>
                        <span className="font-mono text-gray-500 break-all">{gradingResult.hash}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900/60 p-6 rounded-lg text-center text-xs text-gray-500 my-auto">
                      Grade return item to compile health ledger block.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5 - P2P LOGISTICS */}
          {activeTab === "logistics" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>Dynamic Logistics Core & P2P Router</h2>
                <span className="section-badge badge-layer-5">Layer 5</span>
              </div>

              <div className="demo-split-grid">
                <div className="glass-card flex flex-col gap-4 border-cyan-500/10 bg-cyan-950/5">
                  <h3 className="text-sm font-semibold text-cyan-300">Route Parameters ({profileUserId})</h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label>Returner Zip (From)</label>
                      <input type="text" value={profileZip} disabled className="bg-gray-900/80 cursor-not-allowed" />
                    </div>
                    <div className="flex-1">
                      <label>Circular Buyer Zip (To)</label>
                      <input type="text" value={buyerZip} onChange={(e) => setBuyerZip(e.target.value)} className="text-xs" />
                    </div>
                  </div>
                  <button className="btn btn-primary w-full py-2" onClick={triggerP2PRouteCalculation} disabled={logisticsLoading}>
                    {logisticsLoading ? "Geocoding zipcodes..." : "Optimize Shipping Route"}
                  </button>

                  {logisticsResult && (
                    <div className="bg-gray-900/60 p-3 rounded border border-gray-800 text-xs">
                      <div className="font-semibold text-emerald-400 mb-1">P2P Circular Target Match</div>
                      <p className="text-gray-400 text-[10px] leading-relaxed">
                        Shipping directly from zipcode **{profileZip}** to matched buyer **{logisticsResult.p2pRoute.buyerName}** in Bellevue (**{buyerZip}**).
                      </p>
                    </div>
                  )}
                </div>

                <div className="glass-card flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-200">Route Comparison & Maps</h3>
                  {logisticsResult ? (
                    <div className="flex flex-col gap-3">
                      <div className="map-placeholder">
                        <div id="map-element" style={{ height: "100%", width: "100%" }}></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-emerald-950/15 border border-emerald-500/20 p-2 rounded">
                          <span className="font-bold text-emerald-400 block mb-1">Direct P2P Route</span>
                          Distance: {logisticsResult.p2pRoute.distance}<br />
                          Cost: {logisticsResult.p2pRoute.cost}<br />
                          CO₂: {logisticsResult.p2pRoute.co2}
                        </div>
                        <div className="bg-rose-950/15 border border-rose-500/20 p-2 rounded">
                          <span className="font-bold text-rose-400 block mb-1">Standard Warehouse</span>
                          Distance: {logisticsResult.warehouseRoute.distance}<br />
                          Cost: {logisticsResult.warehouseRoute.cost}<br />
                          CO₂: {logisticsResult.warehouseRoute.co2}
                        </div>
                      </div>

                      <div className="flex justify-between bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded text-xs font-bold text-emerald-300">
                        <span>Ecological Savings:</span>
                        <span>{logisticsResult.savings.co2} CO₂ & {logisticsResult.savings.cost} USD Saved!</span>
                      </div>

                      {labelGenerated ? (
                        <div className="bg-white p-3 rounded border border-gray-300 flex flex-col items-center gap-1 font-mono text-black text-[9px]">
                          <div className="font-bold text-[11px]">USPS DIRECT P2P NETWORK</div>
                          <div className="border-y border-black w-full text-center py-0.5 my-1">
                            SHIP TO: {logisticsResult.p2pRoute.buyerName} ({buyerZip})
                          </div>
                          <div className="font-bold select-all">{logisticsResult.label.trackingNumber}</div>
                          <svg className="w-48 h-8 mt-1" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="20" fill="white" />
                            <rect x="5" y="2" width="2" height="16" fill="black" /><rect x="10" y="2" width="1" height="16" fill="black" />
                            <rect x="14" y="2" width="3" height="16" fill="black" /><rect x="20" y="2" width="1" height="16" fill="black" />
                            <rect x="24" y="2" width="2" height="16" fill="black" /><rect x="30" y="2" width="4" height="16" fill="black" />
                            <rect x="36" y="2" width="1" height="16" fill="black" /><rect x="40" y="2" width="2" height="16" fill="black" />
                            <rect x="45" y="2" width="3" height="16" fill="black" /><rect x="50" y="2" width="1" height="16" fill="black" />
                            <rect x="55" y="2" width="2" height="16" fill="black" /><rect x="60" y="2" width="4" height="16" fill="black" />
                            <rect x="66" y="2" width="1" height="16" fill="black" /><rect x="70" y="2" width="2" height="16" fill="black" />
                            <rect x="75" y="2" width="3" height="16" fill="black" /><rect x="80" y="2" width="1" height="16" fill="black" />
                            <rect x="85" y="2" width="2" height="16" fill="black" /><rect x="90" y="2" width="4" height="16" fill="black" />
                          </svg>
                        </div>
                      ) : (
                        <button className="btn btn-success w-full py-2 text-xs" onClick={() => setLabelGenerated(true)}>
                          Generate Shippo Label
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-900/60 p-6 rounded-lg text-center text-xs text-gray-500 my-auto">
                      Compute shipping route to render dynamic OpenStreetMap Leaflet layers.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6 - WALLET RESOLUTIONS */}
          {activeTab === "wallet" && (
            <div className="glass-card flex flex-col gap-6">
              <div className="section-title-bar">
                <h2>Green Credits Wallet & Incentives Ledger</h2>
                <span className="section-badge badge-layer-6">Layer 6</span>
              </div>

              <div className="demo-split-grid">
                <div className="glass-card flex flex-col gap-4 border-emerald-500/10 bg-emerald-950/5">
                  <h3 className="text-sm font-semibold text-emerald-300">Loyalty Choice Ledger ({profileUserId})</h3>
                  
                  <div className="resolution-choices">
                    <div className={`choice-card ${refundSelection === "cash" ? "selected" : ""}`} onClick={() => setRefundSelection("cash")}>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase">Option 1: Cash Refund</div>
                      <div className="text-2xl font-bold font-display text-gray-200">${refundBaseAmount.toFixed(2)}</div>
                    </div>
                    <div className={`choice-card highlight-success ${refundSelection === "credits" ? "selected" : ""}`} onClick={() => setRefundSelection("credits")}>
                      <span className="choice-badge">Recommended</span>
                      <div className="text-[10px] font-semibold text-emerald-400 uppercase">Option 2: Green Credits (+30%)</div>
                      <div className="text-2xl font-bold font-display text-emerald-300">
                        ${(refundBaseAmount * 1.3).toFixed(2)}
                        <span className="text-[10px] text-gray-400 block font-normal mt-0.5">({Math.round(refundBaseAmount * 1.3 * 10)} Credits)</span>
                      </div>
                    </div>
                  </div>

                  {refundSelection === "credits" && (
                    <div className="flex flex-col gap-2 text-xs">
                      <label className="text-xs text-emerald-300 font-bold mb-1">Apply Circular Actions Multipliers:</label>
                      <div className="flex flex-col gap-1.5 text-gray-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={loyaltyActions.includes("p2p")} onChange={() => handleToggleLoyaltyAction("p2p")} className="w-4 h-4 text-emerald-500" />
                          <span>P2P Shipping direct (+5% credits / +151kg CO₂)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={loyaltyActions.includes("swap")} onChange={() => handleToggleLoyaltyAction("swap")} className="w-4 h-4 text-emerald-500" />
                          <span>Accept refurbished replacement swap (+10% credits)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={loyaltyActions.includes("repair")} onChange={() => handleToggleLoyaltyAction("repair")} className="w-4 h-4 text-emerald-500" />
                          <span>Engage self-troubleshoot / Repair (+15% credits / +4.8kg CO₂)</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <button className="btn btn-success w-full py-2.5 mt-2" onClick={processWalletRefund} disabled={refundLoading}>
                    {refundLoading ? "Processing transaction..." : "Confirm Resolution"}
                  </button>
                </div>

                <div className="glass-card flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-200">Updated Wallet Ledger</h3>
                  {refundResult ? (
                    <div className="bg-gray-900 border border-emerald-500/20 p-4 rounded-xl flex flex-col gap-3">
                      <div className="text-xs font-semibold text-emerald-400 uppercase">Transaction Cleared successfully</div>
                      
                      <div className="text-xs text-gray-300 my-1 flex flex-col gap-1">
                        <div>Type: <span className="font-bold text-gray-100">{refundResult.refundType}</span></div>
                        {refundResult.refundType === "green_credits" ? (
                          <>
                            <div>Awarded Credits: <span className="font-bold text-emerald-400">+{refundResult.creditsAwarded} Credits</span></div>
                            <div>Retained CO₂ Index: <span className="font-bold text-emerald-400">+{refundResult.co2SavedAwarded} kg</span></div>
                          </>
                        ) : (
                          <div>Refunded: <span className="font-bold text-gray-100">{refundResult.amountRefunded}</span></div>
                        )}
                      </div>

                      <div className="border-t border-gray-800 pt-3 text-xs flex justify-between">
                        <span className="text-gray-400">New Wallet Balance:</span>
                        <span className="font-bold text-indigo-400">{refundResult.walletBalance} Credits</span>
                      </div>
                      <div className="text-xs flex justify-between">
                        <span className="text-gray-400">Net CO₂ saved:</span>
                        <span className="font-bold text-emerald-400">{refundResult.sustainabilityScore} kg</span>
                      </div>

                      <div className="bg-gray-950/80 p-2.5 rounded text-center text-xs text-gray-400 mt-2">
                        {refundResult.message}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-900/60 p-6 rounded-lg text-center text-xs text-gray-500 my-auto">
                      Submit checkout transaction to query ledger registry balances.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-12 text-center text-xs text-gray-600 border-t border-gray-900 pt-6">
        <div>Project Anti-Gravity Circular Logistics MVP • 100% Personalization & Hardware Capture Ready</div>
        <div className="mt-1">Built in HSL slate using Next.js 16, Llama 3/3.2 Vision, Leaflet, Nominatim, and Shippo.</div>
      </footer>
    </div>
  );
}
