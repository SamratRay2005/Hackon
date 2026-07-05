"use client";

/**
 * AppContext.tsx
 * ──────────────
 * Single source of truth for all shared state across layers.
 * Each layer file imports `useApp()` to read/write shared data.
 * Utility functions, SVGs, and shared sub-components also live here.
 */

import React, { createContext, useContext, useRef, useState, useEffect } from "react";
import {
  Camera,
  Upload,
  Zap,
  ChevronRight,
  ChevronLeft,
  Star,
} from "lucide-react";
import { PRODUCT_CATALOG } from "@/lib/catalog";

export interface InspectQueueItem {
  id: string;
  orderId: string;
  sku: string;
  itemName: string;
  source: "fraud" | "vibe";
  timestamp: string;
}

// ─────────────────────────────────────────────
// MOCK SVG ILLUSTRATIONS (shared)
// ─────────────────────────────────────────────
export const MOCK_SIZING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
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

export const MOCK_DAMAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
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

export const MOCK_FRAUD_SUSPICIOUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
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

export const MOCK_GRADING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%">
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
  <text x="30" y="39" fill="#e9d5ff" font-family="sans-serif" font-size="11" font-weight="bold">🔍 WAREHOUSE INSPECTION FEED</text>
</svg>`;

// ─────────────────────────────────────────────
// SHARED UTILITIES
// ─────────────────────────────────────────────
export function svgToDataUrl(svgStr: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
}

export const SKU_REFERENCE_IMAGES: Record<string, string> = {
  "DENIM-JKT-001": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500", // Fixed: Denim jacket
  "SLIM-FIT-TEE": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500", // Fixed: T-shirt
  "CF-Mkr-99": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
  "SPK-AIR-12": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500",
  "YRDLY-GNTLMN-001": "/yardley-gentleman.webp",
};

export const getSKUReferenceImage = (sku: string) => {
  if (SKU_REFERENCE_IMAGES[sku]) return SKU_REFERENCE_IMAGES[sku];
  const p = PRODUCT_CATALOG.find(x => x.sku === sku);
  
  if (p) {
    const n = p.name.toLowerCase();
    const c = p.category;
    
    if (c === "Apparel") {
      if (n.includes("jacket") || n.includes("coat") || n.includes("parka") || n.includes("windbreaker") || n.includes("blazer")) return "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500";
      if (n.includes("hoodie") || n.includes("pullover") || n.includes("sweater") || n.includes("cardigan")) return "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500";
      if (n.includes("jean") || n.includes("denim") || n.includes("overalls")) return "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500";
      if (n.includes("pant") || n.includes("chino") || n.includes("jogger") || n.includes("legging") || n.includes("short")) return "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500";
      if (n.includes("dress") || n.includes("skirt")) return "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500";
      // Fallback for apparel (shirts, tees, polos, etc.)
      return "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500";
    }
    
    if (c === "Footwear") {
      if (n.includes("boot")) return "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500";
      if (n.includes("sandal") || n.includes("slipper") || n.includes("loafer") || n.includes("oxford") || n.includes("espadril")) return "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500";
      // Fallback for footwear (sneakers, trainers, running shoes)
      return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";
    }
    
    if (c === "Electronics") {
      if (n.includes("monitor") || n.includes("display") || n.includes("screen")) return "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500";
      if (n.includes("speaker") || n.includes("audio") || n.includes("sound")) return "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500";
      if (n.includes("headphone") || n.includes("earbud")) return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500";
      if (n.includes("keyboard") || n.includes("mouse") || n.includes("webcam")) return "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500";
      if (n.includes("watch") || n.includes("tracker")) return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500";
      if (n.includes("camera") || n.includes("drone")) return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500";
      if (n.includes("tablet") || n.includes("reader")) return "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500";
      return "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=500";
    }
    
    if (c === "Home & Kitchen") {
      if (n.includes("knife") || n.includes("cutlery")) return "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=500";
      if (n.includes("coffee") || n.includes("espresso") || n.includes("kettle") || n.includes("grinder") || n.includes("press")) return "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500";
      if (n.includes("blender") || n.includes("mixer") || n.includes("juicer") || n.includes("cooker") || n.includes("toaster") || n.includes("fryer")) return "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500";
      if (n.includes("pan") || n.includes("pot") || n.includes("skillet") || n.includes("cookware")) return "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=500";
      if (n.includes("vacuum") || n.includes("mop") || n.includes("purifier")) return "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500";
      if (n.includes("towel") || n.includes("sheet") || n.includes("duvet") || n.includes("pillow")) return "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500";
      return "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500";
    }
    
    if (c === "Recreation & Lifestyle") {
      if (n.includes("backpack") || n.includes("bag") || n.includes("duffel") || n.includes("luggage")) return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";
      if (n.includes("tent") || n.includes("camp") || n.includes("mat") || n.includes("sleep")) return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";
      if (n.includes("bottle") || n.includes("flask") || n.includes("tumbler") || n.includes("vacuum insulated")) return "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500";
      if (n.includes("yoga") || n.includes("fitness") || n.includes("roller")) return "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500";
      return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";
    }
  }
  
  return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500";
};

export function getDynamicSizeChart(sku: string) {
  const p = PRODUCT_CATALOG.find(x => x.sku === sku);
  if (!p) return null;
  const isApparel = p.sizes.some(s => ["S", "M", "L", "XL", "XXL", "XS"].includes(s));
  const isFootwear = p.sizes.some(s => ["7", "8", "9", "10", "11", "12"].includes(s));
  if (isApparel) {
    return {
      name: p.name, brand: "UrbanEco",
      chart: [
        { size: "XS", chest: "32-34 in", shoulders: "15.5 in", sleeves: "31.5 in" },
        { size: "S", chest: "34-36 in", shoulders: "16.5 in", sleeves: "32.5 in" },
        { size: "M", chest: "38-40 in", shoulders: "17.5 in", sleeves: "33.5 in" },
        { size: "L", chest: "42-44 in", shoulders: "18.5 in", sleeves: "34.5 in" },
        { size: "XL", chest: "46-48 in", shoulders: "19.5 in", sleeves: "35.5 in" },
        { size: "XXL", chest: "50-52 in", shoulders: "20.5 in", sleeves: "36.5 in" },
      ]
    };
  } else if (isFootwear) {
    return {
      name: p.name, brand: "EcoStep",
      chart: [
        { size: "7", length: "9.2 in", eu: "40" },
        { size: "8", length: "9.5 in", eu: "41" },
        { size: "9", length: "9.8 in", eu: "42" },
        { size: "10", length: "10.2 in", eu: "43" },
        { size: "11", length: "10.5 in", eu: "44" },
        { size: "12", length: "10.8 in", eu: "45" },
      ]
    };
  }
  return null;
}

export function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────
interface WebcamCaptureProps {
  onCapture: (base64Image: string) => void;
  overlayType?: "sizing" | "damage" | "grading";
  compact?: boolean;
}

export function WebcamCapture({ onCapture, overlayType, compact }: WebcamCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 640, height: 480 } });
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
    if (active && stream && videoRef.current) { videoRef.current.srcObject = stream; }
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
            if (imgData[i] > 15 || imgData[i + 1] > 15 || imgData[i + 2] > 15) { isBlack = false; break; }
          }
        } catch { isBlack = false; }
        if (isBlack) {
          const fallback = overlayType === "sizing" ? svgToDataUrl(MOCK_SIZING_SVG) : overlayType === "damage" ? svgToDataUrl(MOCK_DAMAGE_SVG) : overlayType === "grading" ? svgToDataUrl(MOCK_GRADING_SVG) : svgToDataUrl(MOCK_DAMAGE_SVG);
          onCapture(fallback);
        } else {
          onCapture(canvas.toDataURL("image/jpeg", 0.85));
        }
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { if (reader.result) onCapture(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const loadDemo = () => {
    const demoUrl = overlayType === "sizing" ? svgToDataUrl(MOCK_SIZING_SVG) : overlayType === "damage" ? svgToDataUrl(MOCK_DAMAGE_SVG) : overlayType === "grading" ? svgToDataUrl(MOCK_GRADING_SVG) : svgToDataUrl(MOCK_DAMAGE_SVG);
    onCapture(demoUrl);
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {active ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black shadow-lg">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {overlayType === "sizing" && (
            <div className="absolute inset-0 border-2 border-dashed border-indigo-400/50 pointer-events-none flex flex-col justify-between p-4">
              <div className="border-b border-indigo-400/30 h-1/3 w-full flex justify-between items-start">
                <span className="text-[9px] text-indigo-100 bg-indigo-600/80 px-1.5 py-0.5 rounded backdrop-blur-sm">ALIGN SHOULDERS</span>
                <span className="text-[9px] text-indigo-100 bg-indigo-600/80 px-1.5 py-0.5 rounded backdrop-blur-sm">ALIGN SHOULDERS</span>
              </div>
              <div className="border-y border-indigo-400/30 h-1/3 w-full flex items-center justify-center">
                <span className="text-[9px] text-indigo-100 bg-indigo-600/80 px-1.5 py-0.5 rounded backdrop-blur-sm">ALIGN CHEST LEVEL</span>
              </div>
              <div className="h-1/3 w-full flex items-end justify-center">
                <span className="text-[9px] text-indigo-100 bg-indigo-600/80 px-1.5 py-0.5 rounded backdrop-blur-sm">FULL BODY FRAME</span>
              </div>
            </div>
          )}
          {overlayType === "damage" && (
            <div className="absolute inset-0 border-2 border-dashed border-rose-400/50 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-3/4 border-2 border-dashed border-rose-500/60 rounded flex items-center justify-center">
                <span className="text-[9px] text-rose-100 bg-rose-600/80 px-2 py-1 rounded backdrop-blur-sm">CENTER DAMAGED ITEM</span>
              </div>
            </div>
          )}
          {overlayType === "grading" && (
            <div className="absolute inset-0 border-2 border-dashed border-purple-400/50 pointer-events-none flex items-center justify-center">
              <div className="w-5/6 h-5/6 border border-dashed border-purple-500/50 flex flex-col justify-between p-3">
                <span className="text-[9px] text-purple-100 bg-purple-600/80 self-start px-1 py-0.5 rounded backdrop-blur-sm">CASING ALIGN</span>
                <span className="text-[9px] text-purple-100 bg-purple-600/80 self-end px-1 py-0.5 rounded backdrop-blur-sm">LABEL ALIGN</span>
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
              <Camera className="w-3.5 h-3.5" /> Camera
            </button>
            <label className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2 rounded-xl border border-slate-200 shadow-sm text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" /> Upload
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button type="button" className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2 rounded-xl border border-amber-200 shadow-sm text-xs flex items-center justify-center gap-1.5 transition-all" onClick={loadDemo}>
              <Zap className="w-3.5 h-3.5" /> Demo
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Hero Carousel
const CAROUSEL_SKUS = ["DENIM-JKT-001", "SPK-AIR-12", "RUN-SHOE-30", "PARKA-WTR-06", "MONITOR-54"];
const CAROUSEL_THEMES = [
  { eyebrowBg: "bg-violet-100 text-violet-700", gradient: "from-violet-50 via-white to-indigo-50", accentColor: "#4f46e5", tag: "★ Trending Now" },
  { eyebrowBg: "bg-sky-100 text-sky-700", gradient: "from-sky-50 via-white to-cyan-50", accentColor: "#0284c7", tag: "⚡ New Arrival" },
  { eyebrowBg: "bg-emerald-100 text-emerald-700", gradient: "from-emerald-50 via-white to-teal-50", accentColor: "#059669", tag: "🌿 Eco Pick" },
  { eyebrowBg: "bg-amber-100 text-amber-700", gradient: "from-amber-50 via-white to-orange-50", accentColor: "#d97706", tag: "🔥 Best Seller" },
  { eyebrowBg: "bg-rose-100 text-rose-700", gradient: "from-rose-50 via-white to-pink-50", accentColor: "#e11d48", tag: "💎 Premium" },
];

export function HeroCarousel({ onShopNow }: { onShopNow: (sku: string) => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const slides = CAROUSEL_SKUS.map((sku, i) => {
    const product = PRODUCT_CATALOG.find(p => p.sku === sku) || PRODUCT_CATALOG[i] || PRODUCT_CATALOG[0];
    return { product, theme: CAROUSEL_THEMES[i % CAROUSEL_THEMES.length], image: getSKUReferenceImage(product.sku) };
  });

  const goToSlide = (idx: number) => {
    if (isAnimating || idx === currentSlide) return;
    setIsAnimating(true);
    setCurrentSlide(idx);
    setTimeout(() => setIsAnimating(false), 650);
  };

  const next = () => goToSlide((currentSlide + 1) % slides.length);
  const prev = () => goToSlide((currentSlide - 1 + slides.length) % slides.length);

  useEffect(() => {
    intervalRef.current = setInterval(() => { setCurrentSlide(prev => (prev + 1) % slides.length); }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length]);

  const resetInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => { setCurrentSlide(prev => (prev + 1) % slides.length); }, 4000);
  };

  const handleDotClick = (idx: number) => { goToSlide(idx); resetInterval(); };
  const handlePrev = () => { prev(); resetInterval(); };
  const handleNext = () => { next(); resetInterval(); };

  const slide = slides[currentSlide];

  return (
    <div className="hero-carousel">
      <div className={`hero-slide active w-full bg-gradient-to-br ${slide.theme.gradient}`} key={currentSlide} style={{ animation: "carouselSlideIn 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className="hero-slide-content">
          <div className={`hero-slide-eyebrow ${slide.theme.eyebrowBg}`}><span>{slide.theme.tag}</span></div>
          <h1 className="hero-slide-headline">
            {slide.product.name.split(" ").slice(0, 3).join(" ")}
            {slide.product.name.split(" ").length > 3 && (<span style={{ color: slide.theme.accentColor }}>{" " + slide.product.name.split(" ").slice(3, 6).join(" ")}</span>)}
          </h1>
          <p className="hero-slide-subline">{slide.product.description}</p>
          <div className="hero-slide-price" style={{ color: slide.theme.accentColor }}>
            ${slide.product.price.toFixed(2)}
            <span className="text-sm font-medium text-slate-400 ml-2 line-through">${(slide.product.price * 1.4).toFixed(2)}</span>
          </div>
          <div className="hero-slide-actions">
            <button className="hero-btn-primary" onClick={() => onShopNow(slide.product.sku)}>Shop Now <ChevronRight className="w-4 h-4" /></button>
            <button className="hero-btn-secondary" onClick={() => onShopNow(slide.product.sku)}>See Collection</button>
          </div>
          <div className="flex items-center gap-1.5 mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-3.5 h-3.5" style={{ fill: i <= Math.round(slide.product.reviewScore) ? slide.theme.accentColor : "transparent", color: slide.theme.accentColor }} />
            ))}
            <span className="text-xs text-slate-500 font-medium ml-1">{slide.product.reviewScore} ({slide.product.reviewCount.toLocaleString()} reviews)</span>
          </div>
        </div>
        <div className="hero-slide-image-col" style={{ background: `linear-gradient(135deg, ${slide.theme.accentColor}08, ${slide.theme.accentColor}14)` }}>
          <div className="absolute w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: slide.theme.accentColor, right: "-3rem", top: "50%", transform: "translateY(-50%)" }} />
          <img src={slide.image} alt={slide.product.name} className="w-full h-full object-cover" style={{ position: "relative", zIndex: 1 }} />
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-xl px-3 py-2 shadow-md flex items-center gap-2" style={{ zIndex: 2 }}>
            <div className="w-2 h-2 rounded-full" style={{ background: slide.theme.accentColor }} />
            <span className="text-xs font-bold text-slate-700">{slide.product.brand}</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">{slide.product.category}</span>
          </div>
        </div>
      </div>
      <div className="carousel-counter">{currentSlide + 1} / {slides.length}</div>
      <button className="carousel-arrow prev" onClick={handlePrev} aria-label="Previous slide"><ChevronLeft className="w-4 h-4" /></button>
      <button className="carousel-arrow next" onClick={handleNext} aria-label="Next slide"><ChevronRight className="w-4 h-4" /></button>
      <div className="carousel-dots">
        {slides.map((_, i) => (
          <button key={i} className={`carousel-dot ${i === currentSlide ? "active" : ""}`} onClick={() => handleDotClick(i)} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONTEXT TYPE
// ─────────────────────────────────────────────
export interface AppContextType {
  // Profile / Auth
  profileUserId: string;
  setProfileUserId: (v: string) => void;
  profileEmail: string;
  setProfileEmail: (v: string) => void;
  profileIp: string;
  setProfileIp: (v: string) => void;
  profileZip: string;
  setProfileZip: (v: string) => void;
  profilePriorReturns: number;
  setProfilePriorReturns: (v: number) => void;

  // Navigation
  activeTab: string;
  setActiveTab: (v: string) => void;

  // Selected product (cross-layer sync)
  selectedProductSku: string;
  setSelectedProductSku: (v: string) => void;

  // Wallet info (shared across layers)
  walletInfo: {
    credits: number;
    sustainabilityScore: number;
    orders?: Array<{ sku: string; name: string; price: number; purchaseDate: string; category: string; returnWindowDays?: number }>;
  };
  setWalletInfo: (v: any) => void;
  fetchWalletInfo: () => Promise<void>;

  // Metrics (dashboard strip)
  metrics: {
    totalProcessed: number;
    deflectedRate: number;
    p2pMatched: number;
    co2Saved: number;
    walletCredits: number;
    fraudAttemptsBlocked: number;
  };
  setMetrics: (fn: (prev: any) => any) => void;

  // Cross-layer product state (L2/L3/L5 all read these)
  fraudSku: string;
  setFraudSku: (v: string) => void;
  fraudItemName: string;
  setFraudItemName: (v: string) => void;
  deflectProduct: string;
  setDeflectProduct: (v: string) => void;
  deflectSku: string;
  setDeflectSku: (v: string) => void;
  deflectReason: string;
  setDeflectReason: (v: string) => void;
  logisticsSku: string;
  setLogisticsSku: (v: string) => void;
  gradingSku: string;
  setGradingSku: (v: string) => void;
  gradingItemName: string;
  setGradingItemName: (v: string) => void;
  refundBaseAmount: number;
  setRefundBaseAmount: (v: number) => void;

  // L1 Sizing (shared for product card preview)
  sizingResult: any;
  setSizingResult: (v: any) => void;
  sizingImage: string | null;
  setSizingImage: (v: string | null) => void;

  // L3 Chat (shared so L3 can be triggered from dashboard)
  chatMessages: Array<{ role: string; content: string }>;
  setChatMessages: (fn: any) => void;
  ifixitGuides: Array<any>;
  setIfixitGuides: (v: any[]) => void;
  fetchGuidesForProduct: (query: string) => Promise<void>;

  // L4 Grading (ledger shared with dashboard)
  ledgerRecords: Array<any>;
  setLedgerRecords: (fn: any) => void;
  fetchLedgerRecords: () => Promise<void>;

  // Marketplace (shopping bag shared with checkout modal)
  shoppingBag: Array<{ sku: string; name: string; price: number; grade: string; brand: string; co2Saved: number }>;
  setShoppingBag: (fn: any) => void;
  showCheckoutModal: boolean;
  setShowCheckoutModal: (v: boolean) => void;
  checkoutStep: "bag" | "summary" | "confirmed";
  setCheckoutStep: (v: "bag" | "summary" | "confirmed") => void;

  // Cart (L1 sizing)
  cart: Array<{ id: string; sku: string; name: string; size: string; price: number }>;
  setCart: (fn: any) => void;
  showBracketingModal: boolean;
  setShowBracketingModal: (v: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  searchContainerRef: React.RefObject<HTMLDivElement>;

  // Dark Store Resale (L4 → Marketplace pipeline)
  resaleListings: Array<{
    sku: string; name: string; price: number; brand: string; grade: string;
    co2Saved: number; distance: string; trust: number; originalPrice: number;
    addedToStoreAt: number; // Unix ms timestamp when graded
    isReturnedProduct: boolean; // false for Grade A initially
  }>;
  setResaleListings: (fn: any) => void;
  isAdminMode: boolean;
  setIsAdminMode: (v: boolean) => void;

  // Fraud image (shared with product card capture)
  fraudImage: string | null;
  setFraudImage: (v: string | null) => void;
  fraudImageType: string;
  setFraudImageType: (v: string) => void;
  fraudClaimType: "damaged_product" | "different_product";
  setFraudClaimType: (v: "damaged_product" | "different_product") => void;

  // Admin Inspect Queue
  inspectQueue: InspectQueueItem[];
  setInspectQueue: React.Dispatch<React.SetStateAction<InspectQueueItem[]>>;
}

export const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppContext.Provider");
  return ctx;
}
