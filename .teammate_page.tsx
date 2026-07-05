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
  Cpu,
  Camera,
  Package,
  Zap,
  Star,
  BarChart2,
  Shield,
  Map,
  Wallet,
  Search,
  ChevronDown,
  ExternalLink,
  Image as ImageIcon,
  Copy,
  Shirt,
} from "lucide-react";
import confetti from "canvas-confetti";
import { PRODUCT_CATALOG } from "@/lib/catalog";

// ----------------------------------------------------
// MOCK SVG ILLUSTRATIONS
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
  <text x="30" y="39" fill="#a7f3d0" font-family="sans-serif" font-size="11" font-weight="bold">Γ£ô FIT CALIBRATION PASS</text>
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
  <text x="30" y="39" fill="#fca5a5" font-family="sans-serif" font-size="11" font-weight="bold">ΓÜá∩╕Å DAMAGE ANALYSIS SCAN</text>
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
  <text x="245" y="382" fill="#fda4af" font-family="sans-serif" font-size="9">Light source: 180┬░ offset detected</text>
  <text x="245" y="394" fill="#e2e8f0" font-family="sans-serif" font-size="8">Staging artifacts visible in background</text>
  <rect x="20" y="20" width="220" height="30" rx="6" fill="rgba(244, 63, 94, 0.3)" stroke="#f43f5e" stroke-width="1"/>
  <text x="30" y="39" fill="#fecdd3" font-family="sans-serif" font-size="11" font-weight="bold">≡ƒÜ¿ FRAUD DETECTOR WARNING</text>
</svg>`;

const MOCK_IRRELEVANT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
  <rect width="640" height="480" fill="#1e1b4b"/>
  <defs>
    <linearGradient id="pizzaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>
  </defs>
  <path d="M 320 120 L 220 320 Q 320 350 420 320 Z" fill="url(#pizzaGrad)" stroke="#78350f" stroke-width="4"/>
  <path d="M 220 320 Q 320 350 420 320 Q 320 370 220 320 Z" fill="#d97706" stroke="#78350f" stroke-width="2"/>
  <circle cx="280" cy="220" r="12" fill="#ef4444"/>
  <circle cx="350" cy="240" r="14" fill="#ef4444"/>
  <circle cx="310" cy="290" r="10" fill="#ef4444"/>
  <text x="320" y="80" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="extrabold" text-anchor="middle" letter-spacing="2">IRRELEVANT PHOTO DETECTED</text>
  <text x="320" y="410" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Loaded File: sample_irrelevant_claim.svg (Food Category)</text>
</svg>`;

const MOCK_GRADING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
  <rect width="640" height="480" fill="#0f111a"/>
  <rect x="240" y="360" width="160" height="30" rx="8" fill="#1e293b" stroke="#a78bfa" stroke-width="2"/>
  <rect x="250" y="370" width="140" height="10" rx="2" fill="#0f172a"/>
  <path d="M 250 160 L 250 360 L 290 360 L 290 160 Z" fill="#1e293b" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 230 130 L 370 130 L 350 160 L 250 160 Z" fill="#0f172a" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 295 230 L 385 230 C 395 270 395 320 385 350 L 295 350 Z" fill="rgba(255,255,255,0.08)" stroke="#a78bfa" stroke-width="2"/>
  <path d="M 385 250 C 415 260 415 320 385 330" fill="none" stroke="#a78bfa" stroke-width="2"/>
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
  <text x="30" y="39" fill="#e9d5ff" font-family="sans-serif" font-size="11" font-weight="bold">≡ƒöì WAREHOUSE INSPECTION FEED</text>
</svg>`;

const SAMPLE_MOCK_IMAGE = svgToDataUrl(MOCK_DAMAGE_SVG);

const SKU_REFERENCE_IMAGES: Record<string, string> = {
  "DENIM-JKT-001": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500",
  "SLIM-FIT-TEE": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500",
  "CF-Mkr-99": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
  "SPK-AIR-12": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500",
  "KNIFE-SET-85": "https://images.unsplash.com/photo-1593113630400-ea4288922497?w=500"
};

const getSKUReferenceImage = (sku: string) => {
  if (SKU_REFERENCE_IMAGES[sku]) return SKU_REFERENCE_IMAGES[sku];
  const p = PRODUCT_CATALOG.find(x => x.sku === sku);
  if (p) {
    const name = p.name.toLowerCase();
    if (name.includes("hoodie") || name.includes("pullover")) return "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500";
    if (name.includes("shirt") || name.includes("polo") || name.includes("tee")) return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500";
    if (name.includes("jacket") || name.includes("parka") || name.includes("windbreaker") || name.includes("vest")) return "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500";
    if (name.includes("jean") || name.includes("pants") || name.includes("chinos") || name.includes("cargo") || name.includes("jogger") || name.includes("skirt")) return "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500";
    if (name.includes("shoe") || name.includes("sneaker") || name.includes("boot") || name.includes("sandal") || name.includes("loafer") || name.includes("chelsea") || name.includes("oxford")) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";
    if (name.includes("coffee") || name.includes("kettle") || name.includes("grinder") || name.includes("press")) return "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500";
    if (name.includes("speaker") || name.includes("headphone") || name.includes("earbuds") || name.includes("soundbar")) return "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500";
    if (name.includes("keyboard") || name.includes("mouse") || name.includes("monitor") || name.includes("webcam")) return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500";
    if (name.includes("blender") || name.includes("toaster") || name.includes("fryer") || name.includes("juicer") || name.includes("cooker") || name.includes("mixer")) return "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500";
    if (name.includes("backpack") || name.includes("bag") || name.includes("duffel") || name.includes("bottle")) return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";
    if (name.includes("knife") || name.includes("block set") || name.includes("cutlery")) return "https://images.unsplash.com/photo-1593113630400-ea4288922497?w=500";

    // Category fallbacks to avoid the placeholder man photo
    if (p.category === "Apparel") return "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500";
    if (p.category === "Footwear") return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";
    if (p.category === "Electronics") return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500";
    if (p.category === "Home & Kitchen") return "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500";
    if (p.category === "Recreation & Lifestyle") return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";
  }
  return "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500";
};

function getDynamicSizeChart(sku: string) {
  const p = PRODUCT_CATALOG.find(x => x.sku === sku);
  if (!p) return null;
  const isApparel = p.sizes.some(s => ["S","M","L","XL","XXL","XS"].includes(s));
  const isFootwear = p.sizes.some(s => ["7","8","9","10","11","12"].includes(s));

  if (isApparel) {
    return {
      name: p.name, brand: "UrbanEco",
      chart: [
        { size: "XS", chest: "32-34 in", shoulders: "15.5 in", sleeves: "31.5 in" },
        { size: "S",  chest: "34-36 in", shoulders: "16.5 in", sleeves: "32.5 in" },
        { size: "M",  chest: "38-40 in", shoulders: "17.5 in", sleeves: "33.5 in" },
        { size: "L",  chest: "42-44 in", shoulders: "18.5 in", sleeves: "34.5 in" },
        { size: "XL", chest: "46-48 in", shoulders: "19.5 in", sleeves: "35.5 in" },
        { size: "XXL",chest: "50-52 in", shoulders: "20.5 in", sleeves: "36.5 in" },
      ]
    };
  } else if (isFootwear) {
    return {
      name: p.name, brand: "EcoStep",
      chart: [
        { size: "7",  length: "9.2 in", eu: "40" },
        { size: "8",  length: "9.5 in", eu: "41" },
        { size: "9",  length: "9.8 in", eu: "42" },
        { size: "10", length: "10.2 in", eu: "43" },
        { size: "11", length: "10.5 in", eu: "44" },
        { size: "12", length: "10.8 in", eu: "45" },
      ]
    };
  }
  return null;
}

// Simple markdown bold/italic renderer
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ----------------------------------------------------
// WEBCAM & FILE UPLOADER UTILITY COMPONENT
// ----------------------------------------------------
interface WebcamCaptureProps {
  onCapture: (base64Image: string, fileName?: string) => void;
  overlayType?: "sizing" | "damage" | "grading";
  compact?: boolean;
  demoLabel?: string;
  onDemoClick?: () => void;
}

function WebcamCapture({ onCapture, overlayType, compact, demoLabel, onDemoClick }: WebcamCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 }
      });
      setStream(mediaStream);
      setActive(true);
    } catch (e: any) {
      setError("Camera unavailable. Use file upload or demo image below.");
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setActive(false);
  };

  useEffect(() => {
    if (active && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [active, stream]);

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
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
          const imgData = ctx.getImageData(0, 0, Math.min(canvas.width, 50), Math.min(canvas.height, 50)).data;
          for (let i = 0; i < imgData.length; i += 4) {
            if (imgData[i] > 15 || imgData[i+1] > 15 || imgData[i+2] > 15) { isBlack = false; break; }
          }
        } catch { isBlack = false; }

        if (isBlack) {
          const fallback = overlayType === "sizing" ? svgToDataUrl(MOCK_SIZING_SVG)
            : overlayType === "damage" ? svgToDataUrl(MOCK_DAMAGE_SVG)
            : overlayType === "grading" ? svgToDataUrl(MOCK_GRADING_SVG)
            : SAMPLE_MOCK_IMAGE;
          onCapture(fallback, "camera_capture.svg");
        } else {
          onCapture(canvas.toDataURL("image/jpeg", 0.85), "camera_capture.jpg");
        }
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { if (reader.result) onCapture(reader.result as string, file.name); };
      reader.readAsDataURL(file);
    }
  };

  const loadDemo = () => {
    if (onDemoClick) {
      onDemoClick();
      return;
    }
    const demoUrl = overlayType === "sizing" ? svgToDataUrl(MOCK_SIZING_SVG)
      : overlayType === "damage" ? svgToDataUrl(MOCK_DAMAGE_SVG)
      : overlayType === "grading" ? svgToDataUrl(MOCK_GRADING_SVG)
      : SAMPLE_MOCK_IMAGE;
    onCapture(demoUrl, "demo_image.svg");
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {active ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-indigo-500/30 bg-black shadow-lg">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {overlayType === "sizing" && (
            <div className="absolute inset-0 border-2 border-dashed border-indigo-400/40 pointer-events-none flex flex-col justify-between p-4">
              <div className="border-b border-indigo-400/30 h-1/3 w-full flex justify-between items-start">
                <span className="text-[9px] text-indigo-200 bg-black/60 px-1.5 py-0.5 rounded">ALIGN SHOULDERS</span>
                <span className="text-[9px] text-indigo-200 bg-black/60 px-1.5 py-0.5 rounded">ALIGN SHOULDERS</span>
              </div>
              <div className="border-y border-indigo-400/30 h-1/3 w-full flex items-center justify-center">
                <span className="text-[9px] text-indigo-200 bg-black/60 px-1.5 py-0.5 rounded">ALIGN CHEST LEVEL</span>
              </div>
              <div className="h-1/3 w-full flex items-end justify-center">
                <span className="text-[9px] text-indigo-200 bg-black/60 px-1.5 py-0.5 rounded">FULL BODY FRAME</span>
              </div>
            </div>
          )}
          {overlayType === "damage" && (
            <div className="absolute inset-0 border-2 border-dashed border-rose-400/40 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-3/4 border-2 border-dashed border-rose-500/50 rounded flex items-center justify-center">
                <span className="text-[9px] text-rose-200 bg-black/60 px-2 py-1 rounded">CENTER DAMAGED ITEM</span>
              </div>
            </div>
          )}
          {overlayType === "grading" && (
            <div className="absolute inset-0 border-2 border-dashed border-purple-400/40 pointer-events-none flex items-center justify-center">
              <div className="w-5/6 h-5/6 border border-dashed border-purple-500/50 flex flex-col justify-between p-3">
                <span className="text-[9px] text-purple-200 bg-black/60 self-start px-1 py-0.5 rounded">CASING ALIGN</span>
                <span className="text-[9px] text-purple-200 bg-black/60 self-end px-1 py-0.5 rounded">LABEL ALIGN</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
            <button type="button" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 px-4 rounded-full shadow-lg text-[11px] flex items-center gap-1.5 transition-all" onClick={captureSnapshot}>
              <Camera className="w-3.5 h-3.5" /> Snap
            </button>
            <button type="button" className="bg-white/90 hover:bg-white text-slate-800 font-bold py-1.5 px-4 rounded-full shadow-lg text-[11px] transition-all" onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          {error && <p className="text-[10px] text-rose-500 font-medium bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-lg">{error}</p>}
          <div className={`flex gap-2 w-full ${compact ? "" : "flex-col sm:flex-row"}`}>
            <button type="button" className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 rounded-xl border border-indigo-200 shadow-sm text-xs flex items-center justify-center gap-1.5 transition-all" onClick={startCamera}>
              <Camera className="w-3.5 h-3.5" />
              Camera
            </button>
            <label className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl border border-slate-200 shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" />
              Upload
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button type="button" className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2 rounded-xl border border-amber-200 shadow-sm text-xs flex items-center justify-center gap-1.5 transition-all" onClick={loadDemo}>
              <Zap className="w-3.5 h-3.5" />
              {demoLabel || "Demo"}
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
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [showXRayModal, setShowXRayModal] = useState(false);

  // Auth states
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
    totalProcessed: 142,
    deflectedRate: 41,
    p2pMatched: 28,
    co2Saved: 85,
    walletCredits: 1250,
    fraudAttemptsBlocked: 8
  });

  // Layer 1 - Sizing
  const [cart, setCart] = useState<Array<{ id: string; sku: string; name: string; size: string; price: number }>>([]);
  const [selectedProductSku, setSelectedProductSku] = useState("DENIM-JKT-001");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [showBracketingModal, setShowBracketingModal] = useState(false);
  const [sizingImage, setSizingImage] = useState<string | null>(null);
  const [sizingLoading, setSizingLoading] = useState(false);
  const [sizingResult, setSizingResult] = useState<any>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSuggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return PRODUCT_CATALOG.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  // Layer 2 - Fraud
  const [fraudSku, setFraudSku] = useState("DENIM-JKT-001");
  const [fraudItemName, setFraudItemName] = useState("Classic Denim Jacket");
  const [fraudImage, setFraudImage] = useState<string | null>(null);
  const [fraudImageType, setFraudImageType] = useState<string>("genuine");
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [fraudImageName, setFraudImageName] = useState<string>("");
  const [fraudDemoCycle, setFraudDemoCycle] = useState(0);

  // Layer 3 - Chat
  const [deflectProduct, setDeflectProduct] = useState("Smart Drip Coffee Maker");
  const [deflectSku, setDeflectSku] = useState("CF-Mkr-99");
  const [deflectReason, setDeflectReason] = useState("Defective / Won't turn on");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "bot", content: "Hi there! I see you want to return your **Smart Drip Coffee Maker** because it won't turn on. Before we issue a return label, let's see if we can resolve this together! Can you check if the power indicator light is blinking when you plug it in?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [ifixitGuides, setIfixitGuides] = useState<Array<any>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Layer 4 - Grading
  const [gradingSku, setGradingSku] = useState("CF-Mkr-99");
  const [gradingItemName, setGradingItemName] = useState("Smart Drip Coffee Maker");
  const [gradingPhotos, setGradingPhotos] = useState<Array<string>>([]);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [ledgerRecords, setLedgerRecords] = useState<Array<any>>([]);
  const [gradingVideoUrl, setGradingVideoUrl] = useState<string>("");
  const [gradingVideoBase64, setGradingVideoBase64] = useState<string>("");

  // Layer 5 - Logistics
  const [logisticsSku, setLogisticsSku] = useState("DENIM-JKT-001");
  const [buyerZip, setBuyerZip] = useState("98004");
  const [logisticsLoading, setLogisticsLoading] = useState(false);
  const [logisticsResult, setLogisticsResult] = useState<any>(null);
  const [labelGenerated, setLabelGenerated] = useState(false);

  // Marketplace Feed
  const [marketplaceFeed, setMarketplaceFeed] = useState<Array<any>>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);

  // Shopping Bag State
  const [shoppingBag, setShoppingBag] = useState<Array<{ sku: string; name: string; price: number; grade: string; brand: string; co2Saved: number }>>([]);
  const [showBagPanel, setShowBagPanel] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"bag" | "summary" | "confirmed">("bag");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const addToBag = (item: any) => {
    if (shoppingBag.some(b => b.sku === item.sku)) return; // prevent duplicates
    setShoppingBag(prev => [...prev, { sku: item.sku, name: item.name, price: item.price, grade: item.grade, brand: item.brand, co2Saved: item.co2Saved }]);
  };

  const removeFromBag = (sku: string) => {
    setShoppingBag(prev => prev.filter(b => b.sku !== sku));
  };

  const bagSubtotal = shoppingBag.reduce((sum, i) => sum + i.price, 0);
  const bagTax = bagSubtotal * 0.08;
  const bagTotal = bagSubtotal + bagTax;

  const [walletInfo, setWalletInfo] = useState<{
    credits: number;
    sustainabilityScore: number;
    orders?: Array<{ sku: string; name: string; price: number; purchaseDate: string; category: string; returnWindowDays?: number; }>;
  }>({ credits: 1000, sustainabilityScore: 0, orders: [] });
  const [refundSelection, setRefundSelection] = useState<"cash" | "credits">("credits");
  const [loyaltyActions, setLoyaltyActions] = useState<Array<string>>(["p2p", "repair"]);
  const [refundBaseAmount, setRefundBaseAmount] = useState(120.00);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<any>(null);

  // Persistence
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
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchWalletInfo();
      fetchLedgerRecords();
      fetchGuidesForProduct("coffee maker");
      fetchMarketplaceFeed();
    }
  }, [profileUserId, isLoggedIn]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Cross-layer sync when SKU changes
  useEffect(() => {
    const p = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);
    if (p) {
      setFraudSku(p.sku);
      setFraudItemName(p.name);
      setLogisticsSku(p.sku);
      setGradingSku(p.sku);
      setGradingItemName(p.name);
      setRefundBaseAmount(p.price);
      
      const isElectrical = p.category === "Electronics" || p.category === "Home & Kitchen";
      const isApparel = p.category === "Apparel" || p.category === "Footwear";
      
      setDeflectProduct(p.name);
      setDeflectSku(p.sku);
      
      if (isElectrical) {
        fetchGuidesForProduct(p.name);
      } else {
        setIfixitGuides([]); // Clear electrical guides for non-electrical items
      }
    }
  }, [selectedProductSku]);

  // Load wallet orders into return flow
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
      const isElectrical = ["electronics", "home & kitchen"].includes(firstOrder.category.toLowerCase());
      const isApparelOrFootwear = ["apparel", "footwear"].includes(firstOrder.category.toLowerCase());
      
      setDeflectProduct(firstOrder.name);
      setDeflectSku(firstOrder.sku);
      
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

  // Re-render Leaflet map when logistics result changes
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
      maxZoom: 18, attribution: "┬⌐ OpenStreetMap"
    }).addTo(map);
    L.marker(origin).addTo(map).bindPopup(`<b>Returns Origin</b><br>${logisticsResult.p2pRoute.origin.label}`).openPopup();
    L.marker(dest).addTo(map).bindPopup(`<b>Matched Buyer</b><br>${logisticsResult.p2pRoute.buyerName}<br>${logisticsResult.p2pRoute.destination.label}`);
    L.marker(centralWh).addTo(map).bindPopup(`<b>Central Warehouse</b><br>${logisticsResult.warehouseRoute.destination.label}`);
    L.polyline([origin, dest], { color: "#10b981", weight: 4, dashArray: "6 10", opacity: 0.9 }).addTo(map);
    L.polyline([origin, centralWh], { color: "#f43f5e", weight: 2, opacity: 0.45 }).addTo(map);
    map.fitBounds(L.latLngBounds([origin, dest, centralWh]), { padding: [40, 40] });
  }, [logisticsResult]);

  // ---- AUTH ----
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) { setAuthError("All fields are required."); return; }
    const inferredUsername = authEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user_guest";
    const userSession = { userId: inferredUsername, email: authEmail, zip: "98101", priorReturns: 1 };
    setProfileUserId(userSession.userId);
    setProfileEmail(userSession.email);
    setProfileZip(userSession.zip);
    setProfilePriorReturns(userSession.priorReturns);
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
    try {
      await fetch(`/api/wallet`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: "init", userId: userSession.userId }) });
    } catch {}
    setProfileUserId(userSession.userId);
    setProfileEmail(userSession.email);
    setProfileZip(userSession.zip);
    setProfilePriorReturns(userSession.priorReturns);
    if (typeof window !== "undefined") localStorage.setItem("activeUser", JSON.stringify(userSession));
    setIsLoggedIn(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#4f46e5","#10b981","#7c3aed"] });
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") localStorage.removeItem("activeUser");
    setIsLoggedIn(false);
    setAuthEmail(""); setAuthPassword(""); setAuthUserId("");
    setSizingResult(null); setFraudResult(null); setLogisticsResult(null); setRefundResult(null);
  };

  // ---- API CALLS ----
  const fetchWalletInfo = async () => {
    try {
      const res = await fetch(`/api/wallet?userId=${profileUserId}`);
      if (res.ok) {
        const data = await res.json();
        setWalletInfo(data);
        setMetrics(prev => ({ ...prev, walletCredits: data.credits, co2Saved: data.sustainabilityScore }));
      }
    } catch {}
  };

  const fetchLedgerRecords = async () => {
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [SAMPLE_MOCK_IMAGE], sku: "INIT_QUERY", itemName: "query", userId: profileUserId })
      });
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
    } catch {}
  };

  const fetchMarketplaceFeed = async () => {
    setMarketplaceLoading(true);
    try {
      const res = await fetch(`/api/marketplace?userId=${profileUserId}&zipCode=${profileZip}`);
      if (res.ok) {
        const data = await res.json();
        setMarketplaceFeed(data.items || []);
      }
    } catch {} finally {
      setMarketplaceLoading(false);
    }
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
    } catch {}

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

  // ---- L1 SIZING ----
  const handleAddToCart = (size: string) => {
    const selectedProd = PRODUCT_CATALOG.find(p => p.sku === selectedProductSku) || PRODUCT_CATALOG[0];
    const isAlreadyBracketed = cart.some(item => item.sku === selectedProd.sku);
    setCart(prev => [...prev, { id: Math.random().toString(36).slice(2), sku: selectedProd.sku, name: selectedProd.name, size, price: selectedProd.price }]);
    if (isAlreadyBracketed) setShowBracketingModal(true);
  };

  const handleRemoveFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

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
        body: JSON.stringify({ image: sizingImage, brand: "UrbanEco", sku: bracketedSku, sizes: bracketedSizes, sessionId: `session-${profileUserId}` })
      });
      if (res.ok) setSizingResult(await res.json());
    } catch {} finally { setSizingLoading(false); }
  };

  const applySizeRecommendation = (recommendedSize: string) => {
    const skuCounts: Record<string, number> = {};
    cart.forEach(item => { skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1; });
    const bracketedSku = Object.keys(skuCounts).find(sku => skuCounts[sku] > 1) || selectedProductSku;
    const bracketedProd = PRODUCT_CATALOG.find(p => p.sku === bracketedSku) || PRODUCT_CATALOG[0];
    setCart([...cart.filter(item => item.sku !== bracketedSku), { id: "rec-size", sku: bracketedSku, name: bracketedProd.name, size: recommendedSize, price: bracketedProd.price }]);
    setShowBracketingModal(false); setSizingResult(null); setSizingImage(null);
    setMetrics(prev => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  };

  // ---- L2 FRAUD ----
  const triggerFraudCheck = async () => {
    if (!fraudImage) return;
    setFraudLoading(true);
    try {
      const res = await fetch("/api/risk-mitigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: fraudImage, 
          imageName: fraudImageName,
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
        if (data.recommendedAction === "BLOCK") setMetrics(prev => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 }));
      }
    } catch {} finally { setFraudLoading(false); }
  };

  const handleFraudDemoClick = () => {
    const samples = [
      { img: svgToDataUrl(MOCK_DAMAGE_SVG), name: "sample_genuine_claim.svg" },
      { img: svgToDataUrl(MOCK_FRAUD_SUSPICIOUS_SVG), name: "sample_staged_claim.svg" },
      { img: svgToDataUrl(MOCK_IRRELEVANT_SVG), name: "sample_irrelevant_claim.svg" }
    ];
    const index = fraudDemoCycle % samples.length;
    setFraudImage(samples[index].img);
    setFraudImageName(samples[index].name);
    setFraudImageType("demo_" + index);
    setFraudDemoCycle(prev => prev + 1);
    setFraudResult(null); // Clear previous results when loading a new photo
  };

  // ---- L3 CHAT ----
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      // Find the specific order context
      const order = walletInfo.orders?.find(o => o.sku === deflectSku);
      const purchaseDate = order?.purchaseDate || "2026-06-01";
      const returnWindowDays = order?.returnWindowDays || 30;

      const res = await fetch("/api/chat-deflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...chatMessages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMsg }], 
          productName: deflectProduct, 
          reasonCode: deflectReason, 
          guides: ifixitGuides, 
          userId: profileUserId,
          purchaseDate,
          returnWindowDays
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
            for (const line of text.split("\n")) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim();
                if (dataStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const chunk = parsed.choices[0]?.delta?.content || "";
                  botMessage += chunk;
                  setChatMessages(prev => { const next = [...prev]; next[next.length-1] = { role: "bot", content: botMessage }; return next; });
                } catch {}
              }
            }
          }
        }
      }
    } catch {} finally { setChatLoading(false); }
  };

  const resolveDeflection = async () => {
    try {
      await fetch("/api/deflection-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId, productName: deflectProduct, sku: deflectSku, reasonCode: deflectReason, deflected: true })
      });
      fetchWalletInfo();
    } catch {}
    setMetrics(prev => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      deflectedRate: Math.round(((prev.totalProcessed * prev.deflectedRate / 100) + 1) / (prev.totalProcessed + 1) * 100)
    }));
    setChatMessages(prev => [...prev, { role: "bot", content: "≡ƒÄë **Deflection Successful!** Your return has been cancelled. We've logged this to the cryptographic ledger and rewarded your green loyalty credits. Thank you for choosing to repair!" }]);
    confetti({ colors: ["#10b981","#6366f1"], particleCount: 100, spread: 70 });
  };

  // ---- L4 GRADING ----
  const triggerWarehouseGrading = async () => {
    if (!gradingVideoUrl && !gradingVideoBase64) return;
    setGradingLoading(true);
    try {
      const res = await fetch("/api/grading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video: gradingVideoBase64 || undefined, videoUrl: gradingVideoUrl.startsWith("blob:") ? undefined : gradingVideoUrl || undefined, sku: gradingSku, itemName: gradingItemName, userId: profileUserId })
      });
      if (res.ok) {
        const data = await res.json();
        setGradingResult(data.report);
        setLedgerRecords(prev => [data.report, ...prev]);
        setMetrics(prev => ({ ...prev, totalProcessed: prev.totalProcessed + 1 }));
      }
    } catch {} finally { setGradingLoading(false); }
  };

  // ---- L5 LOGISTICS ----
  const triggerP2PRouteCalculation = async () => {
    setLogisticsLoading(true);
    setLabelGenerated(false);
    try {
      const res = await fetch("/api/p2p-logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: logisticsSku, returnerZip: profileZip, buyerZip })
      });
      if (res.ok) setLogisticsResult(await res.json());
    } catch {} finally { setLogisticsLoading(false); }
  };

  // ---- L6 WALLET ----
  const handleToggleLoyaltyAction = (actionId: string) => {
    setLoyaltyActions(prev => prev.includes(actionId) ? prev.filter(a => a !== actionId) : [...prev, actionId]);
  };

  const processWalletRefund = async () => {
    setRefundLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: refundSelection, actions: refundSelection === "credits" ? loyaltyActions : [], baseAmount: refundBaseAmount, userId: profileUserId })
      });
      if (res.ok) {
        const data = await res.json();
        setRefundResult(data);
        fetchWalletInfo();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: refundSelection === "credits" ? ["#10b981","#34d399","#6366f1"] : ["#cbd5e1","#94a3b8"] });
      }
    } catch {} finally { setRefundLoading(false); }
  };

  // ============================================
  // AUTH OVERLAY
  // ============================================
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2 L2 22 L22 22 Z" />
                  <circle cx="12" cy="14" r="4" strokeDasharray="3 2" />
                </svg>
              </div>
            </div>
            <h2 className="auth-title">ReLoop Portal</h2>
            <p className="auth-subtitle">
              {authMode === "signin" ? "Sign in to access your circular returns dashboard" : "Register to initialize your green credits ledger"}
            </p>
          </div>

          {authError && <div className="auth-error mb-4">{authError}</div>}

          {/* Tab toggles */}
          <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => { setAuthMode("signin"); setAuthError(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${authMode === "signin" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>
              Sign In
            </button>
            <button onClick={() => { setAuthMode("signup"); setAuthError(null); }} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${authMode === "signup" ? "bg-white shadow text-indigo-600" : "text-slate-500"}`}>
              Register
            </button>
          </div>

          {authMode === "signin" ? (
            <form onSubmit={handleSignIn} className="auth-form">
              <div className="auth-field">
                <label>Email Address</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" />
              </div>
              <button type="submit" className="btn btn-primary w-full py-2.5 mt-1">
                Sign In to Dashboard
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="auth-form">
              <div className="auth-field">
                <label>Username</label>
                <input type="text" required value={authUserId} onChange={e => setAuthUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="e.g. user_samrat" />
              </div>
              <div className="auth-field">
                <label>Email Address</label>
                <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" />
              </div>
              <div className="flex gap-3">
                <div className="auth-field flex-1">
                  <label>Home ZIP</label>
                  <input type="text" required value={authZip} onChange={e => setAuthZip(e.target.value)} placeholder="98101" />
                </div>
                <div className="auth-field flex-1">
                  <label>Prior Returns</label>
                  <input type="number" required value={authPriorReturns} onChange={e => setAuthPriorReturns(parseInt(e.target.value) || 0)} placeholder="2" />
                </div>
              </div>
              <button type="submit" className="btn btn-success w-full py-2.5 mt-1">
                Create Circular Account
              </button>
            </form>
          )}

          <div className="auth-footer">
            <p className="text-[10px] text-slate-400 mt-3">
              Demo: Use any email + password to sign in instantly
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // LOGGED IN DASHBOARD
  // ============================================
  const selectedProduct = PRODUCT_CATALOG.find(x => x.sku === selectedProductSku);

  const navItems = [
    { id: "dashboard",        icon: BarChart2,  label: "Core Ledger Hub",   badge: "" },
    { id: "size-assist",      icon: Layers,     label: "L1: Sizing Assist", badge: "L1" },
    { id: "fraud-mitigation", icon: Shield,     label: "L2: Fraud Shield",  badge: "L2" },
    { id: "deflection",       icon: MessageSquare, label: "L3: Intercept Chat", badge: "L3" },
    { id: "grading",          icon: Camera,     label: "L4: Auto Inspector",badge: "L4" },
    { id: "logistics",        icon: Map,        label: "L5: P2P Logistics", badge: "L5" },
    { id: "wallet",           icon: Wallet,     label: "L6: Loyalty Wallet",badge: "L6" },
    { id: "marketplace",      icon: ShoppingBag,label: "Circular Marketplace",badge: "NEW" },
  ];

  return (
    <>
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 40%, #f0fdf4 100%)" }}>

      {/* ΓöÇΓöÇ NAVBAR ΓöÇΓöÇ */}
      <nav className="navbar">
        <a href="#" className="navbar-logo">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </div>
          ReLoop
        </a>

        {/* Vibrant Pill Navigation Links */}
        <div className="hidden md:flex items-center gap-4">
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
              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              <span>{walletInfo.sustainabilityScore} kg COΓéé</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-full border border-indigo-100 shadow-sm cursor-help">
              <Award className="w-3.5 h-3.5 text-indigo-500" />
              <span>{walletInfo.credits} Credits</span>
            </div>
          </div>
          
          <div className="relative ml-1">
            <button 
              onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
              className="flex flex-row items-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex flex-row items-center justify-center text-white text-[9px] uppercase">
                {profileUserId.charAt(0)}
              </div>
              <span className="hidden sm:inline-block">{profileUserId}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            
            {showLogoutDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed in as</div>
                  <div className="text-[11px] font-bold text-slate-800 truncate mt-0.5">{profileEmail}</div>
                </div>
                <div className="p-2 flex flex-col gap-1.5">
                  <button onClick={() => { setShowLogoutDropdown(false); setActiveTab("dashboard"); }} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:bg-white hover:border-indigo-300 hover:shadow transition-all flex items-center gap-2 group">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" /> Dashboard Profile
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg shadow-sm hover:bg-white hover:border-rose-300 hover:shadow transition-all flex items-center gap-2 group">
                    <ArrowRight className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-1 transition-transform" /> Secure Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dashboard-container">

        {/* ΓöÇΓöÇ LEFT SIDEBAR ΓöÇΓöÇ */}
        <aside className="sidebar-container lg:sticky lg:top-20 h-fit">

          {/* Session Card */}
          <div className="glass-card flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{profileUserId}</div>
                <div className="text-[10px] text-slate-400 font-medium">ZIP: {profileZip}</div>
              </div>
            </div>
            <button
              onClick={() => setShowProfileConfig(!showProfileConfig)}
              className="w-full py-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
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
                  { label: "Prior Returns", value: String(profilePriorReturns), setter: (v: string) => setProfilePriorReturns(parseInt(v)||0), type: "number" },
                ].map(field => (
                  <div key={field.label}>
                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{field.label}</label>
                    <input type={field.type} value={field.value} onChange={e => field.setter(e.target.value)} className="py-1 px-2 text-[11px] border border-slate-200 rounded-lg w-full mt-0.5" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Architecture Nav */}
          <div className="glass-card flex flex-col gap-2">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1.5 border-b border-slate-100">
              Architecture Layers
            </div>
            <nav className="sidebar-nav-list">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`layer-sidebar-btn ${activeTab === item.id ? "active" : ""}`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100 text-center">
              Match Score: <span className="text-indigo-600 font-extrabold">94%</span>
            </div>
          </div>

          {/* Mini Cart (if items) */}
          {cart.length > 0 && (
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
                      <span className="text-slate-600 truncate">{item.name.split(" ").slice(0,2).join(" ")}</span>
                    </div>
                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ΓöÇΓöÇ MAIN CONTENT ΓöÇΓöÇ */}
        <main className="flex flex-col gap-5 min-w-0">

          {/* ΓöÇΓöÇ PRODUCT CARD ΓöÇΓöÇ */}
          <div className="glass-card product-card-restructured">
            {/* Left: Product Image */}
            <div className="product-image-container">
              <img
                src={getSKUReferenceImage(selectedProductSku)}
                alt={selectedProduct?.name || "Product"}
                className="product-image"
              />
            </div>

            {/* Right: Product Info */}
            <div className="product-info-container">
              <div>
                <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Selected for Return Audit
                </span>
                <h2 className="text-xl font-extrabold text-slate-800 mt-1.5 leading-tight">
                  {selectedProduct?.name || "Classic Denim Jacket"}
                </h2>
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap text-sm text-slate-500 font-medium">
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    ${(selectedProduct?.price || 68.00).toFixed(2)}
                  </span>
                  <span className="text-slate-300">ΓÇó</span>
                  <span className="font-mono text-slate-400">
                    SKU: {selectedProductSku}
                  </span>
                  {selectedProduct?.category && (
                    <>
                      <span className="text-slate-300">ΓÇó</span>
                      <span className="mini-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        {selectedProduct.category}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Global Product Search */}
              <div ref={searchContainerRef} className="relative mt-2 mb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Search & Change Selected Product</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-8 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(79,70,229,0.08)] placeholder-slate-400 transition-all font-semibold"
                    placeholder="Search 150+ products by name or SKU..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {searchQuery && (
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600" onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-[999] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredSuggestions.map(p => (
                      <div
                        key={p.sku}
                        className="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-between gap-2"
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
                        <span className="text-emerald-600 font-extrabold text-xs font-mono">${p.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sizing options are now moved to the Layer 1 Sizing Assist tab below to keep tab interfaces focused. */}
            </div>
          </div>

          {/* ΓöÇΓöÇ SIZING RESULT CARD (full breakdown) ΓöÇΓöÇ */}
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
                  <div className="text-xs text-amber-700 font-medium leading-relaxed">
                    <strong>Predictive Warning:</strong> This exact SKU has a <strong>24% higher return velocity</strong> across Amazon fulfillment centers due to shoulder width mismatches. We highly recommend accepting the AI size below.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 py-2 px-5 rounded-xl font-mono">
                  {sizingResult.recommendedSize}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Match Confidence</span>
                    <span className="text-indigo-600">{sizingResult.confidenceScore}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${sizingResult.confidenceScore}%` }} />
                  </div>
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
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                "{sizingResult.reasoning}"
              </p>
              <button className="btn btn-success w-full py-2.5 text-xs font-bold" onClick={() => applySizeRecommendation(sizingResult.recommendedSize)}>
                <CheckCircle className="w-4 h-4" /> Accept AI Recommendation
              </button>
            </div>
          )}

          {/* ΓöÇΓöÇ METRICS STRIP ΓöÇΓöÇ */}
          <div className="metrics-card-strip">
            {[
              { icon: ShoppingBag, color: "indigo",  label: "Processed Audits",  value: metrics.totalProcessed.toString() },
              { icon: TrendingDown,color: "emerald", label: "Return Deflection",  value: `${metrics.deflectedRate}%` },
              { icon: Compass,     color: "amber",   label: "P2P Route Matches", value: metrics.p2pMatched.toString() },
              { icon: ShieldCheck, color: "rose",    label: "Fraud Blocked",      value: `${metrics.fraudAttemptsBlocked} blocked` },
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

          {/* ΓöÇΓöÇ TAB PANELS ΓöÇΓöÇ */}

          {/* TAB: CORE LEDGER HUB */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-5">
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
                            if (["apparel","footwear"].includes(order.category.toLowerCase())) {
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
                          {["apparel","footwear"].includes(order.category.toLowerCase()) ? "Troubleshoot/Return" : "Troubleshoot/Return"}
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
                  <h2>Product Health & Circular Ledger</h2>
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
          )}

          {/* TAB: L1 SIZING */}
          {activeTab === "size-assist" && (
            <div className="flex flex-col gap-5">
              <div className="glass-card flex flex-col gap-4">
                <div className="section-title-bar">
                  <h2>L1: AI Sizing Chart & Fit Assistant</h2>
                  <span className="section-badge badge-layer-1">Layer 1</span>
                </div>

                <div className="info-callout">
                  <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Use the selfie scanner below to capture a body photo. The AI will map your proportions to the size chart and recommend your optimal fit ΓÇö reducing size-related returns by up to 68%.</span>
                </div>

                {/* Sizing Capture & Selector block */}
                {selectedProduct && getDynamicSizeChart(selectedProductSku) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm mb-2">
                    {/* Left side: Size buttons */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">1. Select Adjacent Sizes to Bracket</span>
                      {selectedProduct.sizes.length > 1 ? (
                        <div className="fit-chip-grid mt-1">
                          {selectedProduct.sizes.map(sz => {
                            const inCart = cart.some(x => x.sku === selectedProductSku && x.size === sz);
                            return (
                              <button key={sz} onClick={() => handleAddToCart(sz)} className={`fit-chip ${inCart ? "active" : ""}`}>
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-slate-500">Standard single size. No bracketing required.</div>
                      )}
                    </div>

                    {/* Right side: Webcam scanner */}
                    <div className="flex flex-col gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">2. Capture Sizing Selfie (Selfie Scan)</span>
                      <div className="mt-1">
                        <WebcamCapture onCapture={(base64) => setSizingImage(base64)} overlayType="sizing" compact={true} />
                        {sizingImage && (
                          <div className="mt-3 flex flex-col gap-2">
                            <span className="mini-badge success self-start">Image Ready</span>
                            <img src={sizingImage} className="upload-preview max-w-[220px] rounded-xl border border-slate-200 shadow-sm" alt="Sizing photo" />
                            <button
                              className="btn btn-primary w-full py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                              disabled={sizingLoading}
                              onClick={triggerSizeAssist}
                            >
                              {sizingLoading ? <><span className="spinner" /> Analyzing...</> : "Analyze Photo & Recommend Size"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Size chart for product */}
                {(() => {
                  const chartData = getDynamicSizeChart(selectedProductSku);
                  if (chartData) {
                    return (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{chartData.name} ΓÇö {chartData.brand} Size Reference Chart</h3>
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
                                        <span className="mini-badge success">Γ£ô Best Fit</span>
                                      ) : (
                                        <span className="text-slate-300 text-xs">ΓÇö</span>
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
                      <div className="mt-0.5">Recommended: <strong>{sizingResult.recommendedSize}</strong> | Confidence: <strong>{sizingResult.confidenceScore}%</strong></div>
                      <div className="mt-0.5 opacity-80">{sizingResult.reasoning}</div>
                    </div>
                  </div>
                )}

                {/* Bracketing flow info */}
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">How Bracketing Works</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { step: "1", title: "Select 2 sizes", desc: "Add adjacent sizes (e.g. M + L) to the cart using the size buttons above." },
                      { step: "2", title: "Scan your photo", desc: "Use the webcam or upload a full-body photo in the Selfie Scan section above." },
                      { step: "3", title: "Accept AI pick", desc: "AI maps your body to the size chart. Keep one, return the other ΓÇö zero waste." },
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
          )}

          {/* TAB: L2 FRAUD SHIELD */}
          {activeTab === "fraud-mitigation" && (
            <div className="glass-card flex flex-col gap-5">
              <div className="section-title-bar">
                <h2>L2: Admin Return Review Console</h2>
                <span className="section-badge badge-layer-2 font-bold">Fraud Shield Terminal</span>
              </div>

              <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-3.5 rounded-xl flex items-start gap-2.5 shadow-md">
                <Shield className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Back-Office Returns Security Console</div>
                  <div className="text-xs text-slate-300 font-medium leading-relaxed font-sans">
                    This console is for Returns Analysts to cross-reference customer claim photos against product specifications. AI analysis automatically reports on image generation indicators, shadow profile inconsistencies, and network risk profiles.
                  </div>
                </div>
              </div>

              {/* Split-Panel Layout: Customer Claim Image vs Catalog Reference */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Panel ΓÇö Claim Photo (Customer Submitted) */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-3">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-slate-400" /> Customer-Submitted Evidence Photo
                    </span>
                    {fraudImage && (
                      <span className="text-[9px] font-mono text-slate-400 truncate max-w-[150px]" title={fraudImageName}>
                        {fraudImageName}
                      </span>
                    )}
                  </div>

                  <div className="relative aspect-video w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                    {fraudImage ? (
                      <img src={fraudImage} className="w-full h-full object-contain" alt="Customer-Submitted Evidence Photo" />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2">
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-500">No Claim Photo Loaded</span>
                        <span className="text-[10px] text-slate-400">Capture with camera or load sample photo below</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-1">
                    <WebcamCapture 
                      onCapture={(base64, fileName) => { 
                        setFraudImageType("custom"); 
                        setFraudImage(base64);
                        setFraudImageName(fileName || "uploaded_claim_evidence.jpg");
                        setFraudResult(null);
                      }} 
                      overlayType="damage" 
                      demoLabel="Load Sample Claim Photo"
                      onDemoClick={handleFraudDemoClick}
                    />
                  </div>
                </div>

                {/* Right Panel ΓÇö Original Product Reference */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-3">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" /> Original Product Reference (Catalog)
                    </span>
                    <span className="mini-badge info text-[9px] font-mono font-bold">
                      SKU: {fraudSku}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
                    <img 
                      src={getSKUReferenceImage(fraudSku)} 
                      className="w-full h-full object-contain" 
                      alt={`Original product reference catalog for SKU ${fraudSku}`} 
                    />
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Product Catalog Title</span>
                    <span className="text-xs font-bold text-slate-800">{fraudItemName}</span>
                  </div>
                </div>
              </div>

              {/* Claim Evaluation Console & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                {/* Column 1: Analyst Context Details */}
                <div className="md:col-span-1 bg-slate-50/60 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 justify-between">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Claim Intake Metadata</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Claim Product:</span>
                        <span className="font-bold text-slate-700 truncate max-w-[120px]" title={fraudItemName}>{fraudItemName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Claim SKU:</span>
                        <span className="font-bold font-mono text-slate-700">{fraudSku}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Analyst ID:</span>
                        <span className="font-bold text-slate-700 font-mono">T1-RETAIL-AUDIT</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Claimant User:</span>
                        <span className="font-bold text-slate-700">{profileUserId}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 text-xs">
                        <span className="text-slate-400 font-medium">Prior Return Count:</span>
                        <span className="font-bold text-slate-700">{profilePriorReturns}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-medium">Claim Network IP:</span>
                        <span className="font-bold font-mono text-slate-700">{profileIp}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-full py-2.5 font-bold text-xs mt-2"
                    disabled={!fraudImage || fraudLoading}
                    onClick={triggerFraudCheck}
                  >
                    {fraudLoading ? (
                      <><span className="spinner" /> Performing Fraud Auditing...</>
                    ) : (
                      <><Shield className="w-4 h-4" /> Run Fraud Analysis</>
                    )}
                  </button>
                </div>

                {/* Column 2 & 3: Audit Results & Analyst Decision Dashboard */}
                <div className="md:col-span-2 border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Risk Evaluation Dashboard</h3>
                  
                  {fraudLoading ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-10 gap-3">
                      <div className="spinner w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-slate-500 font-medium animate-pulse">Running advanced pixel & metadata auditing patterns...</span>
                    </div>
                  ) : fraudResult ? (
                    <div className="flex flex-col gap-4 flex-1">
                      {/* Relevance Warning Check */}
                      {fraudResult.isRelevant === false ? (
                        <div className="flex flex-col gap-3 flex-1 justify-center">
                          <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-xl flex items-start gap-3 text-rose-700 shadow-sm">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-600 mt-0.5" />
                            <div>
                              <div className="font-extrabold text-sm text-rose-800">Claim Evidence Rejected</div>
                              <div className="text-xs font-semibold leading-relaxed mt-1">
                                ΓÜá∩╕Å Image Rejected: The submitted photo does not appear to contain the claimed return product. Manual escalation required.
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2.5 mt-2">
                            <button className="btn btn-danger flex-1 py-2 text-xs font-bold" onClick={() => { alert("Claim escalated to Tier 2."); setFraudResult(null); }}>
                              Escalate to Tier 2
                            </button>
                            <button className="btn btn-secondary flex-1 py-2 text-xs font-bold" onClick={() => { alert("Photo re-request sent to customer."); setFraudResult(null); }}>
                              Request Correct Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Fraud Analysis Results */
                        <div className="flex flex-col gap-4 justify-between flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                            {/* Score circular indicators */}
                            <div className="flex items-center gap-3">
                              <div className={`text-3xl font-black px-4.5 py-2.5 rounded-xl border-2 font-mono flex-shrink-0 flex items-center justify-center ${
                                fraudResult.riskScore > 70 
                                  ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm" 
                                  : fraudResult.riskScore > 40 
                                    ? "bg-amber-50 border-amber-200 text-amber-600 shadow-sm" 
                                    : "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
                              }`}>
                                {fraudResult.riskScore}
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Fraud Risk Index</span>
                                <span className="text-xs font-bold text-slate-700 font-mono">Range 0-100</span>
                              </div>
                            </div>

                            {/* Verdict Badge */}
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">Analyst Verdict</span>
                              {fraudResult.riskScore > 70 ? (
                                <span className="inline-flex items-center gap-1 bg-rose-100 border border-rose-200 text-rose-800 text-xs font-extrabold px-3 py-1.5 rounded-full">
                                  ≡ƒö┤ High Suspicion ΓÇö Block & Escalate
                                </span>
                              ) : fraudResult.riskScore > 40 ? (
                                <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-200 text-amber-800 text-xs font-extrabold px-3 py-1.5 rounded-full">
                                  ≡ƒƒí Moderate Risk ΓÇö Flag for Secondary Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold px-3 py-1.5 rounded-full">
                                  ≡ƒƒó Genuine Claim ΓÇö Approve Return
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Breakdown Section */}
                          {fraudResult.breakdown && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-y border-slate-100 py-3">
                              {[
                                { label: "AI Image Generation Score", val: fraudResult.breakdown.aiGenerationScore },
                                { label: "Photo Staging Signs Index", val: fraudResult.breakdown.photoStagingSigns },
                                { label: "IP Rep Fraud Score (IPQS)", val: fraudResult.breakdown.ipqsScore },
                                { label: "User Return Velocity Index", val: fraudResult.breakdown.userVelocityScore },
                              ].map(({ label, val }) => (
                                <div key={label} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex flex-col gap-1.5">
                                  <div className="flex justify-between font-semibold text-slate-500 text-[10px] uppercase">
                                    <span>{label}</span>
                                    <span className="font-extrabold text-slate-800">{val}%</span>
                                  </div>
                                  <div className="progress-bar-container" style={{ height: "4px" }}>
                                    <div className="progress-bar-fill" style={{ width: `${val}%`, background: val > 70 ? "linear-gradient(90deg,#dc2626,#ef4444)" : val > 40 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "linear-gradient(90deg,#059669,#10b981)" }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Explanation Card */}
                          <div className={`p-3 rounded-xl border text-xs leading-relaxed font-medium ${
                            fraudResult.recommendedAction === "BLOCK" 
                              ? "bg-rose-50 border-rose-100 text-rose-700 italic" 
                              : "bg-slate-50 border-slate-100 text-slate-600"
                          }`}>
                            <span className="font-bold block uppercase text-[8px] tracking-wider text-slate-400 mb-1">Audit Log reasoning:</span>
                            "{fraudResult.defectExplanation}"
                          </div>

                          {/* Decisions */}
                          <div className="flex gap-2 mt-auto pt-2">
                            <button className="btn btn-success flex-1 py-2 text-xs font-bold" onClick={() => { alert("Claim Approved. Refund processed."); setFraudResult(null); }}>
                              Approve Return
                            </button>
                            <button className="btn btn-secondary flex-1 py-2 text-xs font-bold" onClick={() => { alert("Claim flagged for manual investigation."); setFraudResult(null); }}>
                              Escalate to Tier 2
                            </button>
                            <button className="btn btn-danger flex-1 py-2 text-xs font-bold" onClick={() => { alert("Return Request Denied. Claimant blocked."); setFraudResult(null); }}>
                              Block Claim
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-12 text-center gap-3">
                      <Shield className="w-10 h-10 text-slate-200" />
                      <span className="text-xs text-slate-400 italic">No claimant photo has been scanned yet. Select an intake image and trigger "Run Fraud Analysis".</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: L3 INTERCEPT CHAT */}
          {activeTab === "deflection" && (
            <div className="glass-card flex flex-col gap-4">
              <div className="section-title-bar">
                <h2>L3: Intercept Chat ΓÇö Repair Deflector</h2>
                <span className="section-badge badge-layer-3">Layer 3</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-4">
                {/* Guides panel */}
                <div className="flex flex-col gap-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">iFixit Repair Guides</div>
                  {ifixitGuides.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-4 text-center bg-slate-50 border border-slate-100 rounded-xl">
                      Guides load automatically based on the selected product.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {ifixitGuides.map(guide => (
                        <a key={guide.id} href={guide.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-50 hover:bg-indigo-50 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 text-[11px] leading-relaxed transition-all group">
                          <span className="font-bold text-slate-800 group-hover:text-indigo-700 block">{guide.title}</span>
                          {guide.summary && <span className="text-slate-400 block mt-0.5 text-[10px] leading-relaxed">{guide.summary.slice(0, 80)}...</span>}
                          <span className="text-indigo-500 text-[9px] mt-1 flex items-center gap-0.5 font-medium"><ExternalLink className="w-2.5 h-2.5" /> View Guide</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-2">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Return Reason</div>
                    <select
                      value={deflectReason}
                      onChange={e => setDeflectReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                      <option>Defective / Won't turn on</option>
                      <option>Wrong size</option>
                      <option>Not as described</option>
                      <option>Damaged on arrival</option>
                      <option>Changed my mind</option>
                    </select>
                  </div>
                </div>

                {/* Chat window */}
                <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[450px] overflow-hidden shadow-sm">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-700">AI Repair Assistant</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]" title={deflectProduct}>{deflectProduct}</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                          <div className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="mt-auto flex flex-col flex-shrink-0">
                    <div className="flex gap-2 px-3 py-2 bg-slate-50 border-t border-slate-100">
                      <button className="btn btn-success flex-1 py-1.5 text-[11px] font-bold" onClick={resolveDeflection}>
                        <CheckCircle className="w-3 h-3" /> Resolved! Claim Payout
                      </button>
                      <button className="btn btn-secondary flex-1 py-1.5 text-[11px] font-bold" onClick={() => {
                        setChatMessages(prev => [...prev, { role: "bot", content: "Understood. Proceeding to circular logistics router. Head to L5 for shipping options, or L6 for refund routing." }]);
                        setTimeout(() => setActiveTab("logistics"), 1500);
                      }}>
                        Still Return
                      </button>
                    </div>

                    <form onSubmit={handleSendChatMessage} className="flex gap-2 p-3 bg-white border-t border-slate-200">
                      <input
                        type="text"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Describe your issue..."
                        disabled={chatLoading}
                      />
                      <button type="submit" className="btn btn-primary py-2 px-5 text-xs font-bold" disabled={chatLoading || !chatInput.trim()}>
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: L4 AUTO INSPECTOR */}
          {activeTab === "grading" && (
            <div className="glass-card flex flex-col gap-5">
              <div className="section-title-bar">
                <h2>L4: Warehouse Rotation Inspector & Condition Grader</h2>
                <span className="section-badge badge-layer-4">Layer 4</span>
              </div>

              <div className="warning-callout">
                <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Upload a 360┬░ rotation video of the returned product. Our vision AI extracts keyframes, identifies defects, assigns a resale grade (AΓÇôD), and writes an immutable ledger block with a SHA-256 hash.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload column */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Product Inspection Video
                  </div>

                  <div className="flex gap-2">
                    <label className="btn btn-secondary flex-1 py-2 text-[11px] font-bold text-center cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Upload Video
                      <input type="file" accept="video/*" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setGradingVideoUrl(URL.createObjectURL(file));
                          const reader = new FileReader();
                          reader.onloadend = () => { if (reader.result) setGradingVideoBase64(reader.result as string); };
                          reader.readAsDataURL(file);
                        }
                      }} className="hidden" />
                    </label>
                    <button
                      className="btn btn-secondary flex-1 py-2 text-[11px] font-bold"
                      onClick={() => { setGradingVideoUrl("/demo_return.mp4"); setGradingVideoBase64(""); }}
                    >
                      <Zap className="w-3.5 h-3.5" /> Load Demo Video
                    </button>
                  </div>

                  {gradingVideoUrl ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black shadow-sm">
                      <video src={gradingVideoUrl} controls autoPlay muted playsInline className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-300">
                      <Camera className="w-10 h-10" />
                      <span className="text-xs font-medium">No video loaded</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3">
                    <div className="font-bold text-slate-600 mb-2 text-[10px] uppercase tracking-wider">Product Context</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">SKU</span>
                        <span className="text-xs font-mono text-slate-800 font-medium">{gradingSku}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">User</span>
                        <span className="text-xs text-slate-800 font-medium">{profileUserId}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex flex-col col-span-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Product</span>
                        <span className="text-xs text-slate-800 font-medium truncate" title={gradingItemName}>{gradingItemName}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-full py-2.5 font-bold text-xs mt-1"
                    disabled={(!gradingVideoUrl && !gradingVideoBase64) || gradingLoading}
                    onClick={triggerWarehouseGrading}
                  >
                    {gradingLoading ? <><span className="spinner" /> Extracting keyframes & grading...</> : <><BarChart2 className="w-4 h-4" /> Grade Product Condition</>}
                  </button>
                </div>

                {/* Result column */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Condition Report Card</div>
                  {gradingResult ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{gradingResult.itemName}</h4>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">SKU: {gradingResult.sku}</span>
                        </div>
                        <div className={`text-2xl font-extrabold px-3.5 py-1.5 rounded-xl border-2 font-mono ${gradingResult.grade === "A" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : gradingResult.grade === "B" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : gradingResult.grade === "C" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                          {gradingResult.grade}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-xs border-y border-slate-100 py-3">
                        {[
                          { label: "Variant Check", value: gradingResult.isCorrectVariant ? "Γ£ô MATCHED" : "Γ£ù MISMATCH", colored: true },
                          { label: "Defects Found", value: gradingResult.defects?.join(", ") || "None", colored: false },
                          { label: "Resale Channel", value: gradingResult.resaleCategory, colored: false },
                          { label: "Functional Score", value: `${gradingResult.functionalScore}/10`, colored: false },
                        ].map(({ label, value, colored }) => (
                          <div key={label} className="flex justify-between gap-2">
                            <span className="text-slate-500">{label}:</span>
                            <span className={`font-bold text-right text-slate-800 ${colored && value.startsWith("Γ£ô") ? "text-emerald-600" : colored && value.startsWith("Γ£ù") ? "text-rose-600" : ""}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Ledger Block SHA-256</div>
                        <div className="font-mono text-[9px] text-indigo-700 break-all leading-relaxed">{gradingResult.hash}</div>
                      </div>

                      <button className="btn btn-success w-full py-2 text-xs font-bold" onClick={() => setActiveTab("logistics")}>
                        <Truck className="w-4 h-4" /> Route to L5 P2P Logistics
                      </button>
                    </div>
                  ) : (
                    <div className="empty-state-card flex-1 mt-2">
                      <Package className="icon" />
                      <div className="text">Load a video and run grading to see the condition report here.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: L5 LOGISTICS */}
          {activeTab === "logistics" && (
            <div className="glass-card flex flex-col gap-5">
              <div className="section-title-bar">
                <h2>L5: Geocoded P2P Logistics Router</h2>
                <span className="section-badge badge-layer-5">Layer 5</span>
              </div>

              <div className="success-callout">
                <Truck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Enter your ZIP code and the buyer's ZIP. Our geocoding engine (Nominatim + Haversine) calculates the optimal direct P2P shipping route ΓÇö skipping the central warehouse and saving up to 62% COΓéé per return.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Settings column */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Route Configuration</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Returner ZIP</label>
                      <input type="text" value={profileZip} disabled className="bg-slate-100 cursor-not-allowed text-xs" />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Your profile ZIP</span>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Hub Locker ZIP</label>
                      <input type="text" value={buyerZip} onChange={e => setBuyerZip(e.target.value)} placeholder="98004" className="text-xs" />
                      <span className="text-[9px] text-slate-400 mt-0.5 block">Matched local Hub Locker</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 border border-slate-100 bg-white p-2.5 rounded-xl">
                    <div className="font-bold text-slate-600 mb-1">Routing for:</div>
                    <div className="font-mono"><span className="text-slate-400">SKU:</span> <span className="font-bold">{logisticsSku}</span></div>
                    <div className="font-mono"><span className="text-slate-400">User:</span> <span className="font-bold">{profileUserId}</span></div>
                  </div>

                  <button className="btn btn-primary w-full py-2.5 font-bold text-xs" onClick={triggerP2PRouteCalculation} disabled={logisticsLoading}>
                    {logisticsLoading ? <><span className="spinner" /> Calculating routes...</> : <><Compass className="w-4 h-4" /> Optimize Shipping Route</>}
                  </button>

                  {logisticsResult && (
                    <div className="success-callout">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Local P2P Match Confirmed!</div>
                        <div className="mt-0.5">Dropping off at <strong>{logisticsResult.p2pRoute.buyerName}</strong> ΓÇö no warehouse stop.</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map + results column */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Route Comparison Map</div>
                  {logisticsResult ? (
                    <div className="flex flex-col gap-3">
                      <div className="map-placeholder">
                        <div id="map-element" style={{ height: "100%", width: "100%" }} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                          <div className="font-bold text-emerald-700 mb-1.5">≡ƒƒó P2P Direct Route</div>
                          <div className="text-emerald-700">≡ƒôì {logisticsResult.p2pRoute.distance}</div>
                          <div className="text-emerald-700">≡ƒÆ╡ {logisticsResult.p2pRoute.cost}</div>
                          <div className="text-emerald-700">≡ƒî▒ {logisticsResult.p2pRoute.co2}</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                          <div className="font-bold text-rose-700 mb-1.5">≡ƒö┤ Central Warehouse</div>
                          <div className="text-rose-700">≡ƒôì {logisticsResult.warehouseRoute.distance}</div>
                          <div className="text-rose-700">≡ƒÆ╡ {logisticsResult.warehouseRoute.cost}</div>
                          <div className="text-rose-700">≡ƒî▒ {logisticsResult.warehouseRoute.co2}</div>
                        </div>
                      </div>

                      {labelGenerated ? (
                        <div className="bg-white p-3 rounded-xl border-2 border-black flex flex-col items-center gap-1 font-mono text-black text-[9px] shadow-sm">
                          <div className="font-bold text-[10px] tracking-wider">USPS DIRECT P2P NETWORK</div>
                          <div className="border-y border-black w-full text-center py-1 my-0.5 text-[10px]">
                            SHIP TO: {logisticsResult.p2pRoute.buyerName} ΓÇö {buyerZip}
                          </div>
                          <div className="font-bold text-sm tracking-widest">{logisticsResult.label?.trackingNumber || "1Z999AA1012345678"}</div>
                          <svg className="w-44 h-7 mt-1" viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="20" fill="white" />
                            {[5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56,59,62,65,68,71,74,77,80,83,86,89,92].map((x, i) => (
                              <rect key={x} x={x} y="2" width={i%3===0?3:1} height="16" fill="black" />
                            ))}
                          </svg>
                          <div className="text-[8px] text-slate-500 mt-1">Generated via Shippo API</div>
                        </div>
                      ) : (
                        <button className="btn btn-success w-full py-2 text-xs font-bold" onClick={() => setLabelGenerated(true)}>
                          <Truck className="w-4 h-4" /> Generate Shippo Label
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state-card flex-1 mt-2">
                      <Map className="icon" />
                      <div className="text">Enter ZIP codes and click Optimize to see the route map and cost comparison.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: L6 WALLET */}
          {activeTab === "wallet" && (
            <div className="glass-card flex flex-col gap-5">
              <div className="section-title-bar">
                <h2>L6: Loyalty Wallet & Refund Routing Engine</h2>
                <span className="section-badge badge-layer-6">Layer 6</span>
              </div>

              {/* Wallet summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Green Credits", value: walletInfo.credits, icon: Award, color: "indigo" },
                  { label: "COΓéé Saved", value: `${walletInfo.sustainabilityScore} kg`, icon: Leaf, color: "emerald" },
                  { label: "Refund Base", value: `$${refundBaseAmount.toFixed(2)}`, icon: DollarSign, color: "amber" },
                  { label: "Augmented", value: `$${(refundBaseAmount * 1.3).toFixed(2)}`, icon: Zap, color: "violet" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="metric-strip-card flex flex-col gap-1 items-start py-3">
                    <div className={`metric-strip-icon-box ${color} w-8 h-8`}><Icon className="w-4 h-4" /></div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{label}</div>
                    <div className="text-base font-extrabold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Refund options */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col gap-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Refund Options</div>

                  <div className="grid grid-cols-2 gap-3 items-stretch h-full">
                    <div className={`border-2 rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer relative transition-all ${refundSelection === "cash" ? "border-slate-800 bg-white shadow-md ring-1 ring-slate-800" : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"}`} onClick={() => setRefundSelection("cash")}>
                      <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${refundSelection === "cash" ? "border-slate-800 bg-slate-800" : "border-slate-300 bg-white"}`}>
                        {refundSelection === "cash" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <DollarSign className={`w-6 h-6 mb-1 ${refundSelection === "cash" ? "text-slate-800" : "text-slate-400"}`} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cash Refund</span>
                      <span className="text-2xl font-extrabold text-slate-800 font-mono">${refundBaseAmount.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400">Standard return value</span>
                    </div>

                    <div className={`border-2 rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer relative transition-all ${refundSelection === "credits" ? "border-emerald-600 bg-emerald-50 shadow-md ring-1 ring-emerald-600" : "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300"}`} onClick={() => setRefundSelection("credits")}>
                      <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${refundSelection === "credits" ? "border-emerald-600 bg-emerald-600" : "border-emerald-300 bg-white"}`}>
                        {refundSelection === "credits" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm">+30%</span>
                      <Leaf className={`w-6 h-6 mb-1 ${refundSelection === "credits" ? "text-emerald-600" : "text-emerald-400"}`} />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Green Credits</span>
                      <span className="text-2xl font-extrabold text-emerald-800 font-mono">${(refundBaseAmount * 1.3).toFixed(2)}</span>
                      <span className="text-[10px] text-emerald-600">Eco-augmented value</span>
                    </div>
                  </div>

                  {refundSelection === "credits" && (
                    <div className="flex flex-col gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                      <span className="text-xs font-bold text-emerald-800">Circular Action Multipliers</span>
                      {[
                        { id: "p2p", label: "P2P Logistics routing", bonus: "+5%" },
                        { id: "swap", label: "Refurbished replacement swap", bonus: "+10%" },
                        { id: "repair", label: "Self-repair deflection", bonus: "+15%" },
                      ].map(({ id, label, bonus }) => (
                        <label key={id} className="flex items-center gap-2.5 cursor-pointer bg-white border border-emerald-100 rounded-lg px-3 py-2.5 hover:border-emerald-300 hover:shadow-sm transition-all group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${loyaltyActions.includes(id) ? "bg-emerald-600 border-emerald-600" : "border-emerald-300 bg-emerald-50 group-hover:border-emerald-400"}`}>
                            {loyaltyActions.includes(id) && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs font-medium flex-1 ${loyaltyActions.includes(id) ? "text-emerald-800" : "text-slate-600"}`}>{label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${loyaltyActions.includes(id) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{bonus}</span>
                          <input type="checkbox" checked={loyaltyActions.includes(id)} onChange={() => handleToggleLoyaltyAction(id)} className="hidden" />
                        </label>
                      ))}
                    </div>
                  )}

                  <button className="btn btn-success w-full py-2.5 font-bold text-xs" onClick={processWalletRefund} disabled={refundLoading}>
                    {refundLoading ? <><span className="spinner" /> Processing...</> : <><Award className="w-4 h-4" /> Confirm Resolution</>}
                  </button>
                </div>

                {/* Invoice */}
                <div className="border border-slate-200 p-4 rounded-2xl bg-white flex flex-col gap-3">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Transaction Invoice</div>
                  {refundResult ? (
                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="success-callout py-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="font-bold">Transaction cleared successfully</span>
                      </div>

                      {[
                        { label: "Method", value: refundResult.refundType },
                        refundResult.refundType === "green_credits"
                          ? { label: "Credits Awarded", value: `+${refundResult.creditsAwarded} credits`, green: true }
                          : { label: "Amount Refunded", value: refundResult.amountRefunded },
                        refundResult.refundType === "green_credits"
                          ? { label: "COΓéé Offset", value: `+${refundResult.co2SavedAwarded} kg`, green: true }
                          : null,
                        { label: "Wallet Balance", value: `${refundResult.walletBalance} Credits` },
                        { label: "Net COΓéé Saved", value: `${refundResult.sustainabilityScore} kg`, green: true },
                      ].filter(Boolean).map((item: any, i) => (
                        <div key={i} className="flex justify-between border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                          <span className="text-slate-500">{item.label}:</span>
                          <span className={`font-bold ${item.green ? "text-emerald-600" : "text-slate-800"}`}>{item.value}</span>
                        </div>
                      ))}

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center text-slate-500 text-[11px] leading-relaxed italic mt-1">
                        {refundResult.message}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state-card flex-1 mt-2">
                      <Wallet className="icon" />
                      <div className="text">Select a refund type and click Confirm Resolution to process the transaction.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CIRCULAR MARKETPLACE */}
          {activeTab === "marketplace" && (
            <div className="glass-card flex flex-col gap-5">
              <div className="section-title-bar">
                <h2>Circular Re-Commerce Marketplace</h2>
                <div className="flex items-center gap-2">
                  <span className="section-badge badge-layer-5">Local Feed</span>
                  <button
                    className="relative btn btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
                    onClick={() => { setCheckoutStep("bag"); setShowCheckoutModal(true); }}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    My Bag
                    {shoppingBag.length > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow">
                        {shoppingBag.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <div className="info-callout mb-2">
                <ShoppingBag className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Items shown below have been returned by users within a 100km radius. By purchasing locally, you earn Green Credits and save shipping emissions.</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketplaceLoading ? (
                  <div className="col-span-full py-12 text-center text-slate-400">
                    <span className="spinner mb-3" />
                    <div>Discovering local circular deals in {profileZip}...</div>
                  </div>
                ) : (
                  marketplaceFeed.map((item, i) => (
                    <div key={i} className="glass-card flex flex-col group relative overflow-hidden p-0">
                      {item.trust < 40 && (
                        <div className="absolute top-2 right-2 bg-rose-100 text-rose-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-200 z-10 shadow-sm flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> High Risk Seller
                        </div>
                      )}
                      <div className="aspect-[4/3] overflow-hidden relative border-b border-slate-100">
                        <img src={getSKUReferenceImage(item.sku)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.name} />
                      </div>
                      
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex gap-1.5 mb-3 flex-wrap">
                          <span className={`mini-badge ${item.grade.startsWith("A") ? "success" : "warning"}`}>Grade {item.grade}</span>
                          <span className="mini-badge bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1"><Leaf className="w-2.5 h-2.5" /> -{item.co2Saved}kg COΓéé</span>
                          <span className="mini-badge bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1"><Map className="w-2.5 h-2.5" /> {item.distance} away</span>
                        </div>
                        
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{item.brand}</div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</h3>
                        
                        <div className="flex items-end justify-between mt-3 mb-4 border-t border-slate-100 pt-3">
                          <div>
                            <span className="text-emerald-600 font-extrabold text-lg font-mono">${item.price.toFixed(2)}</span>
                            <span className="text-slate-400 text-[10px] line-through ml-2">${item.originalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Seller Trust</div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${item.trust > 80 ? "bg-emerald-500" : item.trust > 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${item.trust}%` }} />
                              </div>
                              <span className={`font-mono text-[10px] font-bold ${item.trust > 80 ? "text-emerald-600" : item.trust > 40 ? "text-amber-600" : "text-rose-600"}`}>{item.trust}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-[10px] text-emerald-700 font-medium mb-3 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-start gap-1.5 mt-auto">
                          <Award className="w-3 h-3 flex-shrink-0 mt-0.5 text-emerald-500" />
                          <span><strong>Earn {Math.round(item.price * 0.3)} Green Credits</strong> instantly by choosing this circular item.</span>
                        </div>
                        
                        <button
                          className="btn btn-primary w-full py-2 text-xs font-bold"
                          onClick={() => addToBag(item)}
                          disabled={shoppingBag.some(b => b.sku === item.sku)}
                        >
                          {shoppingBag.some(b => b.sku === item.sku)
                            ? <><CheckCircle className="w-3.5 h-3.5" /> Added to Bag</>
                            : <><ShoppingBag className="w-3.5 h-3.5" /> Add to Bag</>
                          }
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      <footer className="app-footer text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2 L2 22 L22 22 Z" />
                <circle cx="12" cy="14" r="3.5" strokeDasharray="3 2" />
              </svg>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500">ReLoop Circular Logistics MVP</div>
          <div className="text-[10px] text-slate-400 mt-1">Built with Next.js 16 ┬╖ Vision AI ┬╖ P2P Routing Engine ┬╖ Global Ledger</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Personalization Engine ┬╖ Interactive Repair Integration ┬╖ SHA-256 Ledger</div>
        </div>
      </footer>
    </div>

    {/* ΓöÇΓöÇ SHOPPING BAG / CHECKOUT MODAL ΓöÇΓöÇ */}
    {showCheckoutModal && (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-500" />
              {checkoutStep === "bag" && "Your Circular Bag"}
              {checkoutStep === "summary" && "Order Summary"}
              {checkoutStep === "confirmed" && "Purchase Confirmed ≡ƒÄë"}
            </h3>
            <button onClick={() => { setShowCheckoutModal(false); setCheckoutStep("bag"); }} className="text-slate-300 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ΓöÇΓöÇ STEP 1: BAG CONTENTS ΓöÇΓöÇ */}
          {checkoutStep === "bag" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {shoppingBag.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-300">
                    <ShoppingBag className="w-12 h-12" />
                    <p className="text-sm font-medium text-slate-400">Your bag is empty</p>
                    <p className="text-xs text-slate-300">Browse the marketplace and add circular items.</p>
                  </div>
                ) : (
                  shoppingBag.map(item => (
                    <div key={item.sku} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <img src={getSKUReferenceImage(item.sku)} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-slate-100" alt={item.name} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.brand} ┬╖ Grade {item.grade}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-emerald-600 font-extrabold text-sm font-mono">${item.price.toFixed(2)}</span>
                          <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">-{item.co2Saved}kg COΓéé</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromBag(item.sku)} className="text-slate-200 hover:text-rose-400 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              {shoppingBag.length > 0 && (
                <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Subtotal</span>
                    <span className="font-extrabold text-slate-800 font-mono">${bagSubtotal.toFixed(2)}</span>
                  </div>
                  <button className="btn btn-primary w-full py-2.5 font-bold text-sm" onClick={() => setCheckoutStep("summary")}>
                    <ArrowRight className="w-4 h-4" /> Review Order
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ΓöÇΓöÇ STEP 2: ORDER SUMMARY ΓöÇΓöÇ */}
          {checkoutStep === "summary" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {shoppingBag.map(item => (
                  <div key={item.sku} className="flex justify-between items-center text-xs py-2 border-b border-slate-50">
                    <div>
                      <div className="font-bold text-slate-700">{item.name}</div>
                      <div className="text-[10px] text-slate-400">Grade {item.grade} ┬╖ {item.brand}</div>
                    </div>
                    <span className="font-bold text-slate-800 font-mono">${item.price.toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-700 font-mono">${bagSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax (8%)</span>
                    <span className="font-bold text-slate-700 font-mono">${bagTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-2 border-t border-slate-100">
                    <span className="font-extrabold text-slate-800">Total</span>
                    <span className="font-extrabold text-indigo-600 font-mono text-base">${bagTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 flex items-start gap-2 mt-1">
                  <Leaf className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>By buying circular, you are saving <strong>{shoppingBag.reduce((s, i) => s + i.co2Saved, 0)} kg COΓéé</strong> and earning <strong>{Math.round(bagSubtotal * 0.3)} Green Credits</strong>.</span>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                <button className="btn btn-secondary flex-1 py-2.5 text-xs font-bold" onClick={() => setCheckoutStep("bag")}>
                  Edit Bag
                </button>
                <button className="btn btn-success flex-1 py-2.5 text-xs font-bold" onClick={() => {
                  setCheckoutStep("confirmed");
                  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#10b981", "#6366f1", "#f59e0b"] });
                  setWalletInfo(prev => ({ ...prev, credits: prev.credits + Math.round(bagSubtotal * 0.3) }));
                }}>
                  <CheckCircle className="w-4 h-4" /> Confirm Purchase
                </button>
              </div>
            </div>
          )}

          {/* ΓöÇΓöÇ STEP 3: CONFIRMED + QR RECEIPT ΓöÇΓöÇ */}
          {checkoutStep === "confirmed" && (
            <div className="flex flex-col items-center gap-5 px-5 py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <h4 className="font-extrabold text-slate-800 text-base">Order Placed!</h4>
                <p className="text-xs text-slate-400 mt-1">Your circular items are on their way.</p>
              </div>

              {/* QR Code ΓÇö static placeholder */}
              <div className="bg-white border-2 border-slate-800 rounded-xl p-4 flex flex-col items-center gap-2 shadow-md">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Scan for Digital Receipt</div>
                <svg width="120" height="120" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
                  <rect width="21" height="21" fill="white"/>
                  <rect x="0" y="0" width="7" height="7" fill="black"/>
                  <rect x="1" y="1" width="5" height="5" fill="white"/>
                  <rect x="2" y="2" width="3" height="3" fill="black"/>
                  <rect x="14" y="0" width="7" height="7" fill="black"/>
                  <rect x="15" y="1" width="5" height="5" fill="white"/>
                  <rect x="16" y="2" width="3" height="3" fill="black"/>
                  <rect x="0" y="14" width="7" height="7" fill="black"/>
                  <rect x="1" y="15" width="5" height="5" fill="white"/>
                  <rect x="2" y="16" width="3" height="3" fill="black"/>
                  <rect x="9" y="0" width="1" height="1" fill="black"/>
                  <rect x="11" y="0" width="1" height="1" fill="black"/>
                  <rect x="9" y="2" width="3" height="1" fill="black"/>
                  <rect x="9" y="4" width="1" height="3" fill="black"/>
                  <rect x="11" y="5" width="3" height="1" fill="black"/>
                  <rect x="13" y="3" width="1" height="3" fill="black"/>
                  <rect x="0" y="9" width="3" height="1" fill="black"/>
                  <rect x="5" y="8" width="1" height="3" fill="black"/>
                  <rect x="7" y="9" width="3" height="1" fill="black"/>
                  <rect x="9" y="8" width="1" height="5" fill="black"/>
                  <rect x="11" y="8" width="3" height="1" fill="black"/>
                  <rect x="14" y="9" width="3" height="1" fill="black"/>
                  <rect x="19" y="8" width="2" height="3" fill="black"/>
                  <rect x="11" y="12" width="5" height="1" fill="black"/>
                  <rect x="17" y="12" width="1" height="3" fill="black"/>
                  <rect x="9" y="15" width="4" height="1" fill="black"/>
                  <rect x="14" y="14" width="3" height="3" fill="black"/>
                  <rect x="19" y="14" width="2" height="2" fill="black"/>
                </svg>
                <div className="font-mono text-xs font-extrabold text-slate-800">${bagTotal.toFixed(2)} USD</div>
                <div className="text-[9px] text-slate-400">Order #{Math.floor(100000 + Math.random() * 900000)}</div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 text-center w-full">
                <strong>+{Math.round(bagSubtotal * 0.3)} Green Credits</strong> added to your wallet!
              </div>

              <button className="btn btn-secondary w-full py-2.5 text-xs font-bold" onClick={() => {
                setShowCheckoutModal(false);
                setCheckoutStep("bag");
                setShoppingBag([]);
              }}>
                Done ΓÇö Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* BRACKETING MODAL */}
      {showBracketingModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Size Bracketing Activated</h3>
                <p className="text-xs text-slate-500 mt-1">You've added 2 sizes ΓÇö this triggers the AI sizing scan to determine your perfect fit.</p>
              </div>
              <button onClick={() => setShowBracketingModal(false)} className="text-slate-300 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs font-medium text-indigo-700">
              Use the camera/upload button to capture your photo above, then click "Analyze Photo" to get your AI size recommendation.
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1 py-2 text-xs" onClick={() => { setShowBracketingModal(false); setActiveTab("size-assist"); }}>
                View Size Chart
              </button>
              <button className="btn btn-secondary flex-1 py-2 text-xs" onClick={() => setShowBracketingModal(false)}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHITECTURE X-RAY MODAL */}
      {showXRayModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
              <div>
                <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Platform Architecture X-Ray
                </h3>
                <p className="text-xs text-slate-400 mt-1">How ReLoop scales using advanced Cloud and AI infrastructure.</p>
              </div>
              <button onClick={() => setShowXRayModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-6 bg-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { layer: "L1 & L2: Predictive & Vision", stack: "Proprietary Vision Engine", desc: "Computer vision models analyze images for fraud artifacts. Predictive LLMs provide proactive return velocity warnings." },
                  { layer: "L3: Generative AI Chat", stack: "LLM Streaming API", desc: "Streams interactive troubleshooting via Edge API -> Lambda -> LLM to deflect returns before they happen." },
                  { layer: "L4: Grading Ledger", stack: "Distributed Ledger DB", desc: "Immutable grading records stored in high-throughput NoSQL for fast retrieval, powering dynamic Seller Trust scores." },
                  { layer: "L5: Distributed Routing", stack: "Geospatial Service", desc: "Calculates local buyer proximity and routes items directly to neighborhood drops, bypassing Central Warehouses." },
                  { layer: "L6: Green Economy Engine", stack: "Event Queue Manager", desc: "Asynchronous queues manage the Priority Jump ('Rapido') locks and Stripe payment events at massive scale." }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{item.layer}</div>
                    <div className="text-sm font-extrabold text-white font-mono flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {item.stack}
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 bg-slate-900/80 text-center">
              <button className="btn btn-secondary py-2.5 px-8 text-xs font-bold border-slate-700 text-white hover:bg-slate-800" onClick={() => setShowXRayModal(false)}>
                Close X-Ray
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
