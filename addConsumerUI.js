const fs = require('fs');

const consumerUI = `
  // ─── Consumer UI ───────────────────────────────────────────────
  if (!isAdminMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", background: "#FFF", padding: "20px", border: "1px solid #DDD", borderRadius: "4px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 400, color: "#0F1111", margin: 0 }}>Verify Your Return</h2>
          <span style={{ fontSize: "12px", background: "#067D62", color: "#FFF", padding: "2px 8px", borderRadius: "4px" }}>AI Verified</span>
        </div>
        <div style={{ background: "#F0FAF4", border: "1px solid #067D62", padding: "12px 16px", borderRadius: "4px", fontSize: "13px", color: "#0F1111", lineHeight: "1.5" }}>
          📸 To process your return, please upload a photo of the item and briefly describe the issue. Our AI verifies your claim in under 2 seconds.
        </div>

        {/* Two-column desktop grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

          {/* LEFT COLUMN — Photo Upload */}
          <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: fraudImage ? "#067D62" : "#FF9900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#FFF", fontSize: "11px", fontWeight: 700 }}>{fraudImage ? "✓" : "1"}</span>
              </div>
              <div>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F1111" }}>Upload Evidence Photo</span>
                <span style={{ display: "block", fontSize: "11px", color: "#565959" }}>Photo of item &amp; close-up of defect</span>
              </div>
            </div>

            {/* Photo preview */}
            <div style={{ border: fraudImage ? "2px solid #067D62" : "2px dashed #D5D9D9", borderRadius: "6px", overflow: "hidden", background: "#F7F8F8", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {fraudImage ? (
                <img src={fraudImage} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Claim evidence" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "24px", textAlign: "center" }}>
                  <ImageIcon style={{ width: "32px", height: "32px", color: "#C8CBCF" }} />
                  <span style={{ fontSize: "12px", color: "#565959", fontWeight: 500 }}>No photo uploaded yet</span>
                  <span style={{ fontSize: "11px", color: "#8D9098" }}>Use Camera, Upload, or Demo below</span>
                </div>
              )}
            </div>

            <WebcamCapture
              onCapture={(base64: string) => { setFraudImage(base64); setFraudImageName("uploaded_claim_evidence.jpg"); setFraudResult(null); }}
              overlayType="damage"
            />
            <button
              style={{ background: "transparent", border: "1px solid #D5D9D9", borderRadius: "4px", padding: "7px 12px", fontSize: "12px", color: "#565959", cursor: "pointer", width: "100%" }}
              onClick={handleFraudDemoClick}
            >
              Load Sample Photo #{(fraudDemoCycle % 3) + 1}
            </button>
          </div>

          {/* RIGHT COLUMN — Description + Submit */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Step 2 */}
            <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: userDescription.trim() ? "#067D62" : "#FF9900", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#FFF", fontSize: "11px", fontWeight: 700 }}>{userDescription.trim() ? "✓" : "2"}</span>
                </div>
                <div>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#0F1111" }}>Describe the Issue</span>
                  <span style={{ display: "block", fontSize: "11px", color: "#565959" }}>Context the AI cannot see from the photo alone</span>
                </div>
              </div>
              <textarea
                value={userDescription}
                onChange={(e) => setUserDescription(e.target.value)}
                placeholder={"Examples:\\n• \\"Received blue instead of black.\\"\\n• \\"The zipper is broken on the front pocket.\\"\\n• \\"Only one earbud was in the box — missing the right one.\\"\\n• \\"Left shoe is size 8, right shoe is size 9.\\""}
                style={{
                  width: "100%", boxSizing: "border-box", minHeight: "140px", padding: "10px 12px", fontSize: "13px",
                  border: "1px solid #D5D9D9", borderRadius: "6px", resize: "vertical", fontFamily: "inherit",
                  color: "#0F1111", background: "#FFF", lineHeight: 1.5, outline: "none"
                }}
              />
              <div style={{ fontSize: "11px", color: "#8D9098" }}>
                {userDescription.trim().length}/500 — More detail helps us process your return faster.
              </div>
            </div>

            {/* Step 3 — Result or Submit */}
            {fraudResult ? (
              <div style={{ border: "1px solid #E8E8E8", borderRadius: "8px", padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                {fraudResult.shouldRetake ? (
                  <>
                    <AlertTriangle style={{ width: "36px", height: "36px", color: "#FF9900" }} />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#0F1111" }}>Photo Retake Required</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>{fraudResult.retakeReason || "Please provide a clearer photo of the item."}</p>
                    <button style={{ background: "#FF9900", color: "#111", border: "none", borderRadius: "4px", padding: "9px 22px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }} onClick={() => { setFraudImage(null); setFraudResult(null); }}>Retake Photo</button>
                  </>
                ) : fraudResult.riskScore > 70 ? (
                  <>
                    <Shield style={{ width: "36px", height: "36px", color: "#C7511F" }} />
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#0F1111" }}>Return Not Processed</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>Our system detected anomalies in your claim that require manual review. Our team will reach out to <strong>{profileEmail}</strong> within 24 hours.</p>
                  </>
                ) : (
                  <>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#E6F4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package style={{ width: "22px", height: "22px", color: "#067D62" }} />
                    </div>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#0F1111" }}>Return Approved!</h3>
                    <p style={{ fontSize: "13px", color: "#565959", margin: 0, lineHeight: 1.5 }}>Your return for <strong>{fraudItemName}</strong> has been verified. A prepaid shipping label has been sent to <strong>{profileEmail}</strong>.</p>
                  </>
                )}
              </div>
            ) : (
              <button
                disabled={!fraudImage || fraudLoading}
                onClick={triggerFraudCheck}
                style={{ width: "100%", background: (!fraudImage || fraudLoading) ? "#E8E8E8" : "#FF9900", color: (!fraudImage || fraudLoading) ? "#8D9098" : "#0F1111", border: "none", borderRadius: "4px", padding: "14px 0", fontSize: "14px", fontWeight: 700, cursor: (!fraudImage || fraudLoading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background 0.2s" }}
              >
                {fraudLoading ? (
                  <><span className="spinner" style={{ borderColor: "#8D9098", borderTopColor: "transparent" }} /> Verifying your return...</>
                ) : (
                  <><Shield style={{ width: "16px", height: "16px" }} /> Submit &amp; Verify Return</>
                )}
              </button>
            )}
            {!fraudResult && !fraudImage && (
              <p style={{ fontSize: "11px", color: "#8D9098", textAlign: "center", margin: 0 }}>Upload a photo on the left to enable submission.</p>
            )}
          </div>
        </div>
      </div>
    );
  }
`;

let content = fs.readFileSync('src/app/layers/L2Fraud.tsx', 'utf8');

// The original file (which is Admin UI only right now) returns its block starting at `  return (`
if (!content.includes('if (!isAdminMode)')) {
  content = content.replace('  return (', consumerUI + '\\n  // ─── Admin UI ───────────────────────────────────────────────────\\n  return (');
}

fs.writeFileSync('src/app/layers/L2Fraud.tsx', content);
console.log("Consumer UI added back!");
