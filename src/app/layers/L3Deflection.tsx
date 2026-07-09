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
  Package,
  Plus,
  ChevronRight,
} from "lucide-react";
import {
  useApp,
  renderMarkdown,
  getSKUReferenceImage,
} from "./AppContext";
import { db } from "@/lib/services";

// ── Amazon-style circular logo (dark circle + 'a' + orange smile + green dot) ──
function NovaLogo({ size = 46 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Dark circle */}
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#1a1a1a",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        position: "relative", overflow: "hidden"
      }}>
        {/* 'a' letter */}
        <span style={{
          fontSize: size * 0.46, fontWeight: 900, color: "#fff",
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1, marginTop: "2px", letterSpacing: "-1px"
        }}>a</span>
        {/* Orange smile/arrow */}
        <svg width={size * 0.58} height={size * 0.18} viewBox="0 0 30 9" style={{ marginTop: "-2px" }}>
          <path d="M1 4 Q7 9 15 6 Q22 3 29 5" stroke="#FF9900" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
          <path d="M25 3 L29 5 L25.5 7.5" stroke="#FF9900" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {/* Green online dot */}
      <span style={{
        position: "absolute", bottom: 1, right: 1,
        width: size * 0.22, height: size * 0.22,
        background: "#16a34a", borderRadius: "50%",
        border: `${size * 0.04}px solid #fff`,
        display: "block"
      }} />
    </div>
  );
}

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
    deflectOrderId,
    walletInfo,
    profileUserId,
    setMetrics,
    setActiveTab,
    fetchWalletInfo,
    setInspectQueue,
    setShowReturnSuccess,
    setReasonOrder,
    setSelectedProductSku,
    setFraudSku,
    setFraudOrderId,
    setFraudItemName,
    setRefundBaseAmount,
    setFraudClaimType,
    setFraudImage,
    setFraudResult,
    setUserDescription,
  } = useApp() as any;

  const [chatInput, setChatInput] = React.useState(_chatInput || "");
  const [chatLoading, setChatLoading] = React.useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const order = walletInfo?.orders?.find((o: any) => o.sku === deflectSku);
  const manual = deflectSku ? db.getManualBySku(deflectSku) : null;
  const warrantyVoidWarning = manual?.warrantyVoidOnSelfRepair === true;

  // Compute a readable delivery date (purchase + ~5 days)
  const deliveryDate = React.useMemo(() => {
    if (!order?.purchaseDate) return null;
    try {
      const d = new Date(order.purchaseDate);
      d.setDate(d.getDate() + 5);
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch { return null; }
  }, [order?.purchaseDate]);

  useEffect(() => { setChatMessages([]); }, [deflectSku]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev: any) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const purchaseDate = order?.purchaseDate || "2026-06-01";
      const returnWindowDays = order?.returnWindowDays || 30;
      const res = await fetch("/api/chat-deflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: userMsg }],
          productName: deflectProduct, reasonCode: deflectReason, guides: ifixitGuides,
          userId: profileUserId, purchaseDate, returnWindowDays, sku: deflectSku,
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileUserId, productName: deflectProduct, sku: deflectSku, reasonCode: deflectReason, deflected: true })
      });
      fetchWalletInfo();
    } catch { }
    setMetrics((prev: any) => ({
      ...prev, totalProcessed: prev.totalProcessed + 1,
      deflectedRate: Math.round(((prev.totalProcessed * prev.deflectedRate / 100) + 1) / (prev.totalProcessed + 1) * 100)
    }));
    setChatMessages((prev: any) => [...prev, { role: "bot", content: "🎉 **Issue Resolved!** Your return has been cancelled. Thank you for choosing to repair — you've helped reduce unnecessary waste!" }]);
    try { const c = (window as any).confetti; if (c) c({ colors: ["#10b981", "#6366f1"], particleCount: 100, spread: 70 }); } catch { }
    
    // Redirect to My Orders
    setTimeout(() => setActiveTab("orders"), 2000);
  };

  const handleStillReturn = () => {
    // User already indicated it's defective via the deflection flow.
    // Skip Return Reasons and route directly to Verify Return (L2 Fraud).
    if (order) {
      setSelectedProductSku(order.sku);
      setFraudSku(order.sku);
      setFraudOrderId(order.orderId);
      setFraudItemName(order.name);
      setRefundBaseAmount(order.price);
      setFraudClaimType("damaged_product");
      setFraudImage(null);
      setFraudResult(null);
      setUserDescription("");
      
      setActiveTab("fraud-mitigation");
    }
  };

  const now = new Date();
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

  return (
    <div style={{
      position: "fixed", top: "98px", left: 0, right: 0, bottom: 0,
      display: "flex", flexDirection: "column",
      background: "#f7f8fa", fontFamily: "'Inter', sans-serif",
      zIndex: 50, overflow: "hidden"
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "#fff", padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, borderBottom: "1px solid #D5D9D9",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <NovaLogo size={48} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "17px", fontWeight: 800, color: "#0F1111" }}>Nova — AI Tech Support</span>
              <span style={{ background: "#FF9900", color: "#0F1111", fontSize: "10px", fontWeight: 900, padding: "2px 8px", borderRadius: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Beta</span>
            </div>
            <div style={{ fontSize: "12px", color: "#565959", fontWeight: 600, marginTop: "1px" }}>Get step-by-step help to fix your device issues</div>
          </div>
        </div>
        {warrantyVoidWarning && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fff8f0", border: "1px solid #FF9900", borderRadius: "6px", padding: "6px 12px" }}>
            <AlertTriangle style={{ width: "14px", height: "14px", color: "#C45500", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#C45500" }}>Self-repair may void your {manual!.warrantyDays}-day warranty</span>
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR (wider) ── */}
        <div style={{ width: "400px", flexShrink: 0, background: "#fff", borderRight: "1px solid #D5D9D9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 16px" }}>

            {/* Your Product */}

            {deflectSku && (
              <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", marginBottom: "14px", overflow: "hidden" }}>
                {/* Large product image */}
                <div style={{ background: "#f7f8fa", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "280px" }}>
                  <img
                    src={getSKUReferenceImage(deflectSku)}
                    alt={deflectProduct}
                    style={{ width: "240px", height: "240px", objectFit: "contain" }}
                  />
                </div>
                {/* Product info */}
                <div style={{ padding: "14px 16px", borderTop: "1px solid #D5D9D9" }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#0F1111", marginBottom: "8px", lineHeight: "1.3" }}>
                    {deflectProduct || "Your Product"}
                  </div>
                  {order?.orderId && (
                    <div style={{ fontSize: "12px", color: "#565959", fontWeight: 600, marginBottom: "3px" }}>
                      Order ID: {order.orderId}
                    </div>
                  )}
                  {deliveryDate && (
                    <div style={{ fontSize: "12px", color: "#565959", fontWeight: 600, marginBottom: "3px" }}>
                      Delivered on {deliveryDate}
                    </div>
                  )}
                  {order?.purchaseDate && (
                    <div style={{ fontSize: "12px", color: "#565959", fontWeight: 600 }}>
                      Ordered on {order.purchaseDate}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reported Issue */}
            {deflectReason && (
              <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#0F1111" }}>Reported Issue</span>
                  <button
                    onClick={() => setDeflectReason("")}
                    style={{ fontSize: "12px", fontWeight: 700, color: "#007185", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    className="hover:text-[#C7511F]"
                  >Edit</button>
                </div>
                <div style={{ fontSize: "13px", color: "#0F1111", fontWeight: 600 }}>{deflectReason}</div>
              </div>
            )}

            {/* Tip */}
            <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px", background: "#fffbf0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <span style={{ fontSize: "18px", flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F1111", marginBottom: "4px" }}>Tip</div>
                  <div style={{ fontSize: "12px", color: "#0F1111", fontWeight: 600, lineHeight: "1.6" }}>
                    Try the recommended steps below. <span style={{ fontWeight: 900, color: "#007600" }}>90%</span> of similar issues are resolved without return.
                  </div>
                </div>
              </div>
            </div>

            {/* iFixit Guides */}
            {ifixitGuides.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#565959", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>iFixit Repair Guides</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {ifixitGuides.map((guide: any) => (
                    <a key={guide.id} href={guide.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", background: "#fff", border: "1px solid #D5D9D9", borderRadius: "6px", padding: "10px 12px", textDecoration: "none" }}
                      className="hover:bg-[#f7f8fa] transition-colors">
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "#0F1111", display: "block", marginBottom: "3px", lineHeight: "1.3" }}>{guide.title}</span>
                      {guide.summary && <span style={{ fontSize: "11px", color: "#565959", fontWeight: 500 }}>{guide.summary.slice(0, 70)}...</span>}
                      <span style={{ color: "#007185", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px", marginTop: "4px" }}>
                        View Guide <ExternalLink style={{ width: "10px", height: "10px" }} />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Need more help */}
            <div style={{ border: "1px solid #D5D9D9", borderRadius: "8px", padding: "12px 14px", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F1111", marginBottom: "3px" }}>Need more help?</div>
                <div style={{ fontSize: "12px", color: "#565959", fontWeight: 600, lineHeight: "1.5" }}>If the issue continues, you can choose to return the product.</div>
              </div>
              <Package style={{ width: "34px", height: "34px", color: "#D5D9D9", flexShrink: 0, marginLeft: "10px" }} />
            </div>
          </div>
        </div>

        {/* ── CHAT PANEL ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px", display: "flex", flexDirection: "column", gap: "18px", background: "#f7f8fa" }}>
            
            {/* Default welcome message */}
            {chatMessages.length === 0 && (
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", maxWidth: "72%" }}>
                <NovaLogo size={36} />
                <div>
                  <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "0 12px 12px 12px", padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#0F1111", lineHeight: "1.7", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                    Hi! I'm Nova, your AI Tech Support assistant.<br />
                    I can help you fix issues with your <strong>{deflectProduct || "product"}</strong>.<br />
                    What seems to be the problem?
                  </div>
                  <div style={{ fontSize: "11px", color: "#999", fontWeight: 500, marginTop: "5px", paddingLeft: "4px" }}>{timeStr}</div>
                </div>
              </div>
            )}

            {chatMessages.map((msg: any, index: number) => (
              <div key={index} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "bot" && (
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", maxWidth: "72%" }}>
                    <NovaLogo size={36} />
                    <div>
                      <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "0 12px 12px 12px", padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#0F1111", lineHeight: "1.7", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                        <div className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#999", fontWeight: 500, marginTop: "5px", paddingLeft: "4px" }}>{timeStr}</div>
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div style={{ maxWidth: "60%" }}>
                    <div style={{ background: "#e8f4f8", borderRadius: "12px 0 12px 12px", padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#0F1111", lineHeight: "1.7" }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: "11px", color: "#999", fontWeight: 500, marginTop: "5px", textAlign: "right", paddingRight: "4px" }}>{timeStr} ✓✓</div>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <NovaLogo size={36} />
                <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: "0 12px 12px 12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  {[0, 150, 300].map((delay) => (
                    <div key={delay} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0F1111", animationDelay: `${delay}ms` }} className="animate-bounce" />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── INPUT BAR ── */}
          <div style={{ flexShrink: 0, background: "#fff", borderTop: "1px solid #D5D9D9" }}>
            <form onSubmit={handleSendChatMessage} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px" }}>
              <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#565959", padding: "4px", flexShrink: 0 }}>
                <Plus style={{ width: "22px", height: "22px" }} />
              </button>
              <input
                type="text"
                style={{ flex: 1, background: "#fff", border: "1px solid #D5D9D9", borderRadius: "24px", padding: "10px 18px", fontSize: "14px", fontWeight: 600, color: "#0F1111", outline: "none", transition: "border-color 0.15s" }}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                disabled={chatLoading}
                onFocus={e => (e.target.style.borderColor = "#FF9900")}
                onBlur={e => (e.target.style.borderColor = "#D5D9D9")}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                style={{ width: "44px", height: "44px", borderRadius: "50%", background: chatInput.trim() ? "#FF9900" : "#D5D9D9", border: "none", cursor: chatInput.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}
              >
                <ChevronRight style={{ width: "20px", height: "20px", color: "#0F1111" }} />
              </button>
            </form>

            {/* ── BOTTOM ACTION BUTTONS ── */}
            <div style={{ display: "flex", borderTop: "1px solid #D5D9D9" }}>
              <button
                onClick={resolveDeflection}
                style={{ flex: 1, padding: "14px 12px", background: "#fff", border: "none", borderRight: "1px solid #D5D9D9", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}
                className="hover:bg-[#f0fff4] transition-colors"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle style={{ width: "20px", height: "20px", color: "#16a34a" }} />
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#15803d" }}>Issue Resolved</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#565959" }}>My issue is fixed</span>
              </button>

              <button
                onClick={handleStillReturn}
                style={{ flex: 1, padding: "14px 12px", background: "#fff", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}
                className="hover:bg-[#fffbf0] transition-colors"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Package style={{ width: "20px", height: "20px", color: "#FF9900" }} />
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#C45500" }}>Still Not Working</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#565959" }}>I want to return this product</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
