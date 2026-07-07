"use client";

/**
 * L3Deflection.tsx — Get Help / Chat Tab
 * ──────────────────────────────────────────
 * Owns: Chat UI, iFixit guides panel, deflection logging.
 * API: /api/chat-deflection (POST, streaming), /api/deflection-log (POST)
 */

import React, { useRef, useEffect } from "react";
import {
  CheckCircle,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  useApp,
  renderMarkdown,
  getSKUReferenceImage,
} from "./AppContext";
import { db } from "@/lib/services";

export default function L3Deflection() {
  const {
    chatMessages,
    setChatMessages,
    chatInput: _chatInput,
    ifixitGuides,
    deflectProduct,
    deflectReason,
    setDeflectReason,
    deflectSku,
    walletInfo,
    profileUserId,
    setMetrics,
    setActiveTab,
    fetchWalletInfo,
  } = useApp() as any;

  const [chatInput, setChatInput] = React.useState(_chatInput || "");
  const [chatLoading, setChatLoading] = React.useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Look up manual for the current product to check warranty void status
  const manual = deflectSku ? db.getManualBySku(deflectSku) : null;
  const warrantyVoidWarning = manual?.warrantyVoidOnSelfRepair === true;

  // Clear chat history whenever the user switches to a different product
  useEffect(() => {
    setChatMessages([]);
  }, [deflectSku]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev: any) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const order = walletInfo.orders?.find((o: any) => o.sku === deflectSku);
      const purchaseDate = order?.purchaseDate || "2026-06-01";
      const returnWindowDays = order?.returnWindowDays || 30;

      const res = await fetch("/api/chat-deflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: userMsg }],
          productName: deflectProduct,
          reasonCode: deflectReason,
          guides: ifixitGuides,
          userId: profileUserId,
          purchaseDate,
          returnWindowDays,
          sku: deflectSku,
        })
      });
      if (res.ok) {
        const reader = res.body?.getReader();
        if (reader) {
          let botMessage = "";
          setChatMessages((prev: any) => [...prev, { role: "bot", content: "" }]);
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
                  setChatMessages((prev: any) => { const next = [...prev]; next[next.length - 1] = { role: "bot", content: botMessage }; return next; });
                } catch { }
              }
            }
          }
        }
      }
    } catch { } finally { setChatLoading(false); }
  };

  const resolveDeflection = async () => {
    try {
      await fetch("/api/deflection-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId, productName: deflectProduct, sku: deflectSku, reasonCode: deflectReason, deflected: true })
      });
      fetchWalletInfo();
    } catch { }
    setMetrics((prev: any) => ({
      ...prev,
      totalProcessed: prev.totalProcessed + 1,
      deflectedRate: Math.round(((prev.totalProcessed * prev.deflectedRate / 100) + 1) / (prev.totalProcessed + 1) * 100)
    }));
    setChatMessages((prev: any) => [...prev, { role: "bot", content: "🎉 **Deflection Successful!** Your return has been cancelled. Thank you for choosing to repair — you've helped reduce unnecessary waste and carbon emissions!" }]);
    try {
      const confetti = (window as any).confetti;
      if (confetti) confetti({ colors: ["#10b981", "#6366f1"], particleCount: 100, spread: 70 });
    } catch { }
  };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:"20px", background:"#FFF", padding:"20px", border:"1px solid #DDD", borderRadius:"4px"}}>
      <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
        <h2 style={{fontSize:"24px", fontWeight:400, color:"#0F1111"}}>Chat with Nova — AI Tech Support</h2>
        <span style={{fontSize:"12px", background:"#C7511F", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>AI Assistant</span>
      </div>

      {/* Selected Product Context */}
      {deflectProduct && deflectSku && (
        <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/60 flex flex-col sm:flex-row gap-4 items-center sm:items-start shadow-sm">
          <div className="w-24 h-24 rounded-xl border border-slate-200 bg-white overflow-hidden flex-shrink-0">
            <img src={getSKUReferenceImage(deflectSku)} className="w-full h-full object-contain" alt={deflectProduct} />
          </div>
          <div className="flex-1 flex flex-col gap-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Troubleshooting Product</span>
              <span className="mini-badge info text-[9px] font-mono font-bold">SKU: {deflectSku}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800">{deflectProduct}</h3>
          </div>
        </div>
      )}

      {/* Warranty void warning banner */}
      {warrantyVoidWarning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              ⚠️ WARNING: Attempting to fix this yourself will void your {manual!.warrantyDays}-day warranty.
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Consider contacting the manufacturer's authorised service centre to preserve your warranty coverage.
            </p>
          </div>
        </div>
      )}

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
              {ifixitGuides.map((guide: any) => (
                <a key={guide.id} href={guide.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-50 hover:bg-indigo-50 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 text-[11px] leading-relaxed transition-all group">
                  <span className="font-bold text-slate-800 group-hover:text-indigo-700 block">{guide.title}</span>
                  {guide.summary && <span className="text-slate-400 block mt-0.5 text-[10px] leading-relaxed">{guide.summary.slice(0, 80)}...</span>}
                  <span className="text-indigo-500 text-[9px] mt-1 flex items-center gap-0.5 font-medium"><ExternalLink className="w-2.5 h-2.5" /> View Guide</span>
                </a>
              ))}
            </div>
          )}


        </div>

        {/* Chat window */}
        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[450px] overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">Nova</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]" title={deflectProduct}>{deflectProduct}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50">
            {chatMessages.map((msg: any, index: number) => (
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
                <CheckCircle className="w-3 h-3" /> Resolved! Cancel Return
              </button>
              <button className="btn btn-secondary flex-1 py-1.5 text-[11px] font-bold" onClick={() => {
                setChatMessages((prev: any) => [...prev, { role: "bot", content: "Understood. Proceeding to circular logistics router. Head to L5 for shipping options, or L6 for refund routing." }]);
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
  );
}
