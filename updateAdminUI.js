const fs = require('fs');

let content = fs.readFileSync('src/app/layers/L2Fraud.tsx', 'utf8');

// 1. We need to update the triggerFraudCheck function to push fraudImage, breakdown, reasoning, claimType into the queue.
const oldQueueLogic = `if (data && !data.shouldRetake && data.riskScore > 40) {
          setManualReviewQueue(prev => {
            if (prev.find(item => item.sku === fraudSku)) return prev;
            return [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              sku: fraudSku,
              itemName: fraudItemName,
              userId: profileUserId,
              riskScore: data.riskScore,
              recommendedAction: data.recommendedAction,
              signals: data.signals || [],
              userDescription,
              timestamp: new Date().toISOString()
            }];
          });
        }`;

const newQueueLogic = `if (data && !data.shouldRetake && data.riskScore > 40) {
          setManualReviewQueue(prev => {
            if (prev.find(item => item.sku === fraudSku)) return prev;
            return [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              sku: fraudSku,
              itemName: fraudItemName,
              userId: profileUserId,
              riskScore: data.riskScore,
              recommendedAction: data.recommendedAction,
              signals: data.signals || [],
              userDescription,
              fraudImage,
              breakdown: data.breakdown,
              reasoning: data.reasoning,
              claimType,
              timestamp: new Date().toISOString()
            }];
          });
        }`;

if (content.includes('data.riskScore > 40')) {
  content = content.replace(oldQueueLogic, newQueueLogic);
}

// 2. We need to replace the ENTIRE Admin UI block.
// The Admin UI starts at: `// ─── Admin UI ───────────────────────────────────────────────────`
// We need to add `const [selectedClaim, setSelectedClaim] = React.useState<any>(null);` to the top of the component if it's not there.
if (!content.includes('const [selectedClaim')) {
  content = content.replace('const [manualReviewQueue', 'const [selectedClaim, setSelectedClaim] = React.useState<any>(null);\n  const [manualReviewQueue');
}

const adminUIStart = '// ─── Admin UI ───────────────────────────────────────────────────';
const adminUIIndex = content.indexOf(adminUIStart);

if (adminUIIndex !== -1) {
  const adminUIReplacement = `// ─── Admin UI ───────────────────────────────────────────────────
  return (
    <div style={{display:"flex", flexDirection:"column", gap:"20px", background:"#FFF", padding:"20px", border:"1px solid #DDD", borderRadius:"4px"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px"}}>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <h2 style={{fontSize:"24px", fontWeight:400, color:"#0F1111"}}>Returns Security Console</h2>
          <span style={{fontSize:"12px", background:"#C7511F", color:"#FFF", padding:"2px 8px", borderRadius:"4px"}}>Admin Mode</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Left Column: Manual Review Queue */}
        <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-slate-50 flex flex-col h-[700px] shadow-sm">
           <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl flex justify-between items-center">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <AlertTriangle className="w-4 h-4 text-rose-500" />
               Manual Review Queue
             </h3>
             <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{manualReviewQueue.length}</span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
             {manualReviewQueue.length === 0 ? (
               <div className="text-center p-8 text-slate-400 my-auto">
                 <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                 <div className="text-xs font-medium">No claims awaiting review.</div>
                 <div className="text-[10px] mt-1 opacity-70">When AI is unsure, claims will appear here.</div>
               </div>
             ) : (
               manualReviewQueue.map(claim => (
                 <div 
                   key={claim.id} 
                   onClick={() => setSelectedClaim(claim)}
                   className={\`p-3 border rounded-xl cursor-pointer transition-all \${selectedClaim?.id === claim.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}\`}
                 >
                   <div className="flex justify-between items-start mb-2">
                     <div className="font-bold text-sm text-slate-800 line-clamp-1">{claim.itemName}</div>
                     <span className={\`text-[10px] font-extrabold px-1.5 py-0.5 rounded flex-shrink-0 \${claim.recommendedAction === 'BLOCK' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}\`}>
                       Score: {claim.riskScore}
                     </span>
                   </div>
                   <div className="text-[10px] text-slate-500 font-mono mb-1">User: {claim.userId}</div>
                   <div className="text-[10px] text-slate-400">{new Date(claim.timestamp).toLocaleString()}</div>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Right Column: Risk Dashboard */}
        <div className="lg:col-span-2 border border-slate-200 rounded-xl bg-white p-6 flex flex-col h-[700px] overflow-y-auto shadow-sm">
          {!selectedClaim ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
               <Shield className="w-12 h-12 mb-4 opacity-20" />
               <div className="text-sm font-medium">Select a claim from the queue to review</div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Header Info */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                 <div>
                   <h2 className="text-xl font-bold text-slate-800">{selectedClaim.itemName}</h2>
                   <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                     <span className="bg-slate-100 px-2 py-1 rounded">SKU: {selectedClaim.sku}</span>
                     <span className="bg-slate-100 px-2 py-1 rounded">User: {selectedClaim.userId}</span>
                     <span className="bg-slate-100 px-2 py-1 rounded">Type: {selectedClaim.claimType?.replace('_', ' ')}</span>
                   </div>
                 </div>
                 <div className="flex flex-col items-end">
                   <div className={\`text-3xl font-black px-4 py-2 rounded-xl border-2 font-mono flex-shrink-0 shadow-sm \${selectedClaim.riskScore > 70 ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-amber-50 border-amber-200 text-amber-600"}\`}>
                     {selectedClaim.riskScore}
                   </div>
                   <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">Risk Score</span>
                 </div>
              </div>

              {/* Split Image Compare */}
              <div className="grid grid-cols-2 gap-6">
                 <div className="flex flex-col gap-2">
                   <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Camera className="w-3.5 h-3.5"/> Customer Evidence</span>
                   <div className="aspect-square bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                     {selectedClaim.fraudImage ? <img src={selectedClaim.fraudImage} className="w-full h-full object-contain rounded-lg" /> : <div className="text-xs text-slate-400">No image</div>}
                   </div>
                 </div>
                 <div className="flex flex-col gap-2">
                   <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/> Catalog Reference</span>
                   <div className="aspect-square bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                     <img src={getSKUReferenceImage(selectedClaim.sku)} className="w-full h-full object-contain rounded-lg" />
                   </div>
                 </div>
              </div>

              {/* Customer Description */}
              {selectedClaim.userDescription && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 italic shadow-sm relative">
                  <span className="absolute -top-2.5 left-4 bg-slate-50 px-2 text-[9px] font-bold uppercase text-slate-400">Customer Comments</span>
                  "{selectedClaim.userDescription}"
                </div>
              )}

              {/* Signals and Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Breakdown */}
                 {selectedClaim.breakdown && (
                    <div className="flex flex-col gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Risk Breakdown</span>
                      {[
                        { label: "AI Generation Score", val: selectedClaim.breakdown.aiGenerationScore },
                        { label: "Photo Staging Signs", val: selectedClaim.breakdown.photoStagingSigns },
                        { label: "IP Rep Fraud (IPQS)", val: selectedClaim.breakdown.ipqsScore },
                        { label: "User Return Velocity", val: selectedClaim.breakdown.userVelocityScore },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col gap-2">
                          <div className="flex justify-between font-semibold text-slate-500 text-[10px] uppercase">
                            <span>{label}</span>
                            <span className="font-extrabold text-slate-800">{val}%</span>
                          </div>
                          <div className="progress-bar-container" style={{ height: "4px" }}>
                            <div className="progress-bar-fill" style={{ width: \`\${val}%\`, background: val > 70 ? "linear-gradient(90deg,#dc2626,#ef4444)" : "linear-gradient(90deg,#d97706,#f59e0b)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                 )}

                 {/* Signals & Actions */}
                 <div className="flex flex-col gap-4">
                   <div className="flex flex-col gap-3">
                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Signals</span>
                     <ul className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {selectedClaim.signals?.map((sig: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-rose-400 mt-0.5">›</span> {sig}
                          </li>
                        ))}
                     </ul>
                   </div>
                   
                   <div className="mt-auto flex flex-col gap-2.5 pt-4 border-t border-slate-100">
                     <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors" onClick={() => { setManualReviewQueue(prev => prev.filter(c => c.id !== selectedClaim.id)); setSelectedClaim(null); }}>
                       Approve Return (Override AI)
                     </button>
                     <button className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors" onClick={() => { setManualReviewQueue(prev => prev.filter(c => c.id !== selectedClaim.id)); setSelectedClaim(null); setMetrics((prev: any) => ({ ...prev, fraudAttemptsBlocked: prev.fraudAttemptsBlocked + 1 })); }}>
                       Reject Return & Block User
                     </button>
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

  content = content.substring(0, adminUIIndex) + adminUIReplacement + '\n';
}

fs.writeFileSync('src/app/layers/L2Fraud.tsx', content);
console.log("Successfully rebuilt Admin UI in L2Fraud.tsx!");
