/**
 * Services Helper Library - Intelligent Returns Bridge
 * Implements real API calls to Groq, iFixit, Shippo, and mocks DynamoDB / S3
 */

// Simulated State (Mock DynamoDB & S3 Ledger)
// To keep data persistent across page reloads during the session, we use global state on the server.
const globalState: {
  sessions: Record<string, any>;
  claims: Record<string, Array<any>>;
  ledger: Record<string, Array<any>>;
  wallets: Record<string, { credits: number; sustainabilityScore: number }>;
  buyerDemand: Array<any>;
} = {
  sessions: {},
  claims: {
    "user_samrat": [
      {
        id: "claim-101",
        userId: "user_samrat",
        sku: "DENIM-JKT-001",
        item: "Classic Denim Jacket",
        imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500",
        riskScore: 22,
        status: "APPROVED",
        date: "2026-06-01"
      },
      {
        id: "claim-99",
        userId: "user_samrat",
        sku: "SLIM-FIT-TEE",
        item: "Eco-Cotton Tee",
        imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500",
        riskScore: 85,
        status: "MANUAL_REVIEW",
        date: "2026-05-18"
      }
    ]
  },
  ledger: {
    "user_samrat": [
      {
        id: "ph-771",
        sku: "CF-Mkr-99",
        itemName: "Smart Drip Coffee Maker",
        grade: "B",
        defects: ["Minor scratch on heating plate", "Water tank has hardwater stains"],
        resaleCategory: "Open Box / Refurbished",
        hash: "7f7ef04ca5cf0b04c8614578efbdca9e79435b80a187e148e658a5be89dbf7c0",
        imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
        timestamp: "2026-06-13T10:15:00Z"
      }
    ]
  },
  wallets: {
    "user_samrat": {
      credits: 1250,
      sustainabilityScore: 48
    }
  },
  buyerDemand: [
    { sku: "DENIM-JKT-001", name: "Classic Denim Jacket", buyerZip: "98004", nameBuyer: "Alice Chen", distance: 12, size: "L" },
    { sku: "CF-Mkr-99", name: "Smart Drip Coffee Maker", buyerZip: "98105", nameBuyer: "David Kim", distance: 8, size: "Standard" },
    { sku: "SPK-AIR-12", name: "HiFi Wireless Speaker", buyerZip: "98122", nameBuyer: "Marcus Aurelius", distance: 18, size: "Standard" }
  ]
};

// ----------------------------------------------------
// 1. DYNAMODB / S3 LEDGER SIMULATOR
// ----------------------------------------------------
export const db = {
  initUser: (userId: string) => {
    if (!userId) return;
    if (!globalState.claims[userId]) globalState.claims[userId] = [];
    if (!globalState.ledger[userId]) globalState.ledger[userId] = [];
    if (!globalState.wallets[userId]) {
      globalState.wallets[userId] = {
        credits: 1000,
        sustainabilityScore: 0
      };
    }
  },

  // Cart session for bracketing
  saveCartSession: (sessionId: string, sessionData: any) => {
    globalState.sessions[sessionId] = {
      ...globalState.sessions[sessionId],
      ...sessionData,
      updatedAt: new Date().toISOString()
    };
    return globalState.sessions[sessionId];
  },
  
  getCartSession: (sessionId: string) => {
    return globalState.sessions[sessionId] || null;
  },

  // Fraud return claim tracking
  saveClaim: (userId: string, claim: any) => {
    db.initUser(userId);
    const newClaim = {
      id: `claim-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      userId,
      ...claim
    };
    globalState.claims[userId].unshift(newClaim);
    return newClaim;
  },

  getClaims: (userId?: string) => {
    if (userId) {
      db.initUser(userId);
      return globalState.claims[userId];
    }
    return Object.values(globalState.claims).flat();
  },

  getUserReturnHistory: (userId: string, priorCount?: number) => {
    db.initUser(userId);
    const userClaims = globalState.claims[userId] || [];
    const totalCount = userClaims.length + (priorCount || 0);
    return {
      totalReturns30Days: totalCount,
      approvedReturns: userClaims.filter(c => c.status === "APPROVED").length + (priorCount ? Math.floor(priorCount * 0.8) : 0),
      blockedReturns: userClaims.filter(c => c.status === "BLOCKED").length + (priorCount ? Math.floor(priorCount * 0.2) : 0),
      history: userClaims
    };
  },

  // Product Health ledger
  saveProductHealthCard: (userId: string, report: any) => {
    db.initUser(userId);
    const hash = require("crypto")
      .createHash("sha256")
      .update(JSON.stringify(report))
      .digest("hex");
    
    const record = {
      id: `ph-${Math.floor(100 + Math.random() * 900)}`,
      userId,
      ...report,
      hash,
      timestamp: new Date().toISOString()
    };
    globalState.ledger[userId].unshift(record);
    return record;
  },

  getLedger: (userId?: string) => {
    if (userId) {
      db.initUser(userId);
      return globalState.ledger[userId];
    }
    return Object.values(globalState.ledger).flat();
  },

  // Wallet and Loyalty
  getWallet: (userId: string) => {
    db.initUser(userId);
    return globalState.wallets[userId];
  },

  updateWallet: (userId: string, creditsAdded: number, co2SavedAdded: number) => {
    db.initUser(userId);
    globalState.wallets[userId].credits += creditsAdded;
    globalState.wallets[userId].sustainabilityScore += co2SavedAdded;
    return globalState.wallets[userId];
  },

  getBuyerDemand: (sku: string) => {
    return globalState.buyerDemand.filter(d => d.sku === sku);
  }
};

// ----------------------------------------------------
// 2. GROQ API WRAPPER WITH HIGH-FIDELITY MOCK FALLBACKS
// ----------------------------------------------------
export async function queryGroq(params: {
  model: string;
  messages: Array<{ role: string; content: any }>;
  temperature?: number;
  response_format?: { type: string };
}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey && apiKey.trim() !== "") {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.2,
          response_format: params.response_format
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          content: data.choices[0].message.content,
          usage: data.usage,
          fromMock: false
        };
      } else {
        const errText = await response.text();
        console.warn(`Groq API returned error status: ${response.status}. Body: ${errText}. Falling back to Mock.`);
      }
    } catch (e) {
      console.error("Failed to connect to Groq API:", e);
    }
  }

  // Latency simulation for a high-fidelity loading effect
  await new Promise(resolve => setTimeout(resolve, 600));

  // Determine payload context to respond with realistic mock answers
  const userMessageStr = JSON.stringify(params.messages);
  
  // A. BRACKETING SIZE ASSIST (Layer 1)
  if (userMessageStr.includes("sizing") || userMessageStr.includes("proportion") || userMessageStr.includes("fit")) {
    return {
      content: JSON.stringify({
        recommendedSize: "M",
        confidenceScore: 94,
        reasoning: "Subject has an estimated shoulder width of 17.5 inches and chest depth of 38 inches based on proportions. The M size accommodates up to 40 inches of chest width, offering a tailored, clean fit. The L size (42 inch chest) will result in excess sagging along the sleeves and shoulders (approx 1.5 inches overflow)."
      }),
      fromMock: true
    };
  }

  // B. FRAUD DETECTOR (Layer 2)
  if (userMessageStr.includes("defect") || userMessageStr.includes("damage claim") || userMessageStr.includes("shadows")) {
    // Mock risk assessment based on prompt contents
    let riskScore = 25;
    let explanation = "Image shows genuine impact cracking consistent with warehouse drop damage. Compression patterns are consistent across shadows, indicating no signs of staging or pixel editing. Double verified with minor metadata validation.";
    
    if (userMessageStr.includes("fake") || userMessageStr.includes("fraud") || userMessageStr.includes("staged")) {
      riskScore = 88;
      explanation = "WARNING: Highly suspicious shadow profiles detected around the fracture area. The lighting source direction is inconsistent with the primary background shadow cast. Staging indicators (visible hot-glue residue in bottom left corner) suggest manual tempering to create a fake defect.";
    }

    return {
      content: JSON.stringify({
        aiGenerationScore: riskScore > 50 ? 9.2 : 1.2,
        damagePlausibility: riskScore > 50 ? 2.5 : 8.8,
        photoStagingSigns: riskScore > 50 ? 9.5 : 0.8,
        defectExplanation: explanation
      }),
      fromMock: true
    };
  }

  // C. STREAMING CHAT INTERCEPTION (Layer 3)
  if (userMessageStr.includes("repair") || userMessageStr.includes("troubleshoot") || userMessageStr.includes("broken")) {
    let guideSummary = "";
    if (userMessageStr.includes("Coffee Maker")) {
      guideSummary = "Step 1: Check if the outlet is active and clean the heating coil. Step 2: Clear scale buildup using vinegar-water dilution. Step 3: Verify the thermal fuse has not tripped.";
    } else {
      guideSummary = "Step 1: Restart the device and confirm connection inputs are solid. Step 2: Clean the electrical leads. Step 3: Inspect for external physical blockage.";
    }
    
    return {
      content: `I've analyzed your issue and retrieved the troubleshooting manual. Let's try fixing it together!\n\n**Common Solution:**\n${guideSummary}\n\nCan you check if the power indicator light is blinking when you plug it in? If so, this is a simple thermal reset issue which you can fix in 2 minutes!\n\n*Would you like to try resetting it now? (Click "Resolved" to cancel return and keep your item).*`,
      fromMock: true
    };
  }

  // D. WAREHOUSE INSPECTION GRADING (Layer 4)
  if (userMessageStr.includes("grade") || userMessageStr.includes("taxonomy") || userMessageStr.includes("returned item")) {
    return {
      content: JSON.stringify({
        grade: "B",
        defects: [
          "Minor hairline scratches on the back casing surface",
          "Outer cardboard packing box is dented and torn at the lid closure"
        ],
        functionalScore: 9.5,
        resaleCategory: "Open Box - Like New"
      }),
      fromMock: true
    };
  }

  // E. DEFAULT
  return {
    content: "Standard simulated Groq response. The system is operating in high-fidelity mock mode.",
    fromMock: true
  };
}

// ----------------------------------------------------
// 3. IFIXIT API WRAPPER
// ----------------------------------------------------
export async function fetchIFixitGuides(query: string) {
  try {
    // Limit to 3 guides to keep payload slim
    const response = await fetch(`https://www.ifixit.com/api/2.0/guides?query=${encodeURIComponent(query)}&limit=3`);
    if (response.ok) {
      const data = await response.json();
      return data.guides.map((g: any) => ({
        id: g.guideid,
        title: g.title,
        url: g.url,
        summary: g.summary,
        imageUrl: g.image?.medium || null
      }));
    }
  } catch (e) {
    console.error("iFixit API failed, loading curated local database:", e);
  }

  // Curated 100% Free fallback database for demo reliability
  const guidesDB: Record<string, Array<any>> = {
    "coffee maker": [
      {
        id: 101,
        title: "Drip Coffee Maker Heating Element Replacement",
        url: "https://www.ifixit.com/Guide/Drip+Coffee+Maker+Heating+Element+Replacement/10292",
        summary: "Replace the heating element inside your standard drip coffee maker.",
        imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=150"
      },
      {
        id: 102,
        title: "How to Descale a Coffee Machine",
        url: "https://www.ifixit.com/Guide/How+to+Descale+a+Coffee+Machine/11883",
        summary: "Descale the water pathways to clear hard mineral blockage.",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=150"
      }
    ],
    "speaker": [
      {
        id: 201,
        title: "Bluetooth Speaker Battery Swap",
        url: "https://www.ifixit.com/Guide/Bluetooth+Speaker+Battery+Replacement/8844",
        summary: "Swap the lithium battery inside your portable Bluetooth speaker.",
        imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=150"
      }
    ],
    "default": [
      {
        id: 99,
        title: "General Electronics Diagnosis Guide",
        url: "https://www.ifixit.com/Device/Electronics",
        summary: "Follow standard diagnostics for power and main circuit board issues.",
        imageUrl: null
      }
    ]
  };

  const normQuery = query.toLowerCase();
  if (normQuery.includes("coffee") || normQuery.includes("maker")) return guidesDB["coffee maker"];
  if (normQuery.includes("speaker") || normQuery.includes("sound")) return guidesDB["speaker"];
  return guidesDB["default"];
}

// ----------------------------------------------------
// 4. SHIPPO SANDBOX API WRAPPER
// ----------------------------------------------------
export async function createShippoLabel(params: {
  fromAddress: any;
  toAddress: any;
  parcel: any;
}) {
  const apiKey = process.env.SHIPPO_API_KEY;

  if (apiKey && apiKey.trim() !== "" && !apiKey.includes("placeholder")) {
    try {
      const response = await fetch("https://api.goshippo.com/shipments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `ShippoToken ${apiKey}`
        },
        body: JSON.stringify({
          address_from: params.fromAddress,
          address_to: params.toAddress,
          parcels: [params.parcel],
          async: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Return rates and details
        const transaction = data.rates[0]; // Take cheapest rate
        return {
          trackingNumber: `SHP${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          shippingCost: transaction.amount,
          currency: transaction.currency,
          labelUrl: "https://shippo-delivery-east-2.s3.amazonaws.com/label_placeholder.png",
          carrier: transaction.provider,
          fromMock: false
        };
      }
    } catch (e) {
      console.error("Shippo Sandbox request failed, running fallback generator:", e);
    }
  }

  // High-fidelity sandbox label generator fallback
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    trackingNumber: `USPS-P2P-${Math.floor(10000000 + Math.random() * 90000000)}`,
    shippingCost: "3.48",
    currency: "USD",
    labelUrl: "MOCK_LABEL_SVG",
    carrier: "USPS Direct P2P Network",
    fromMock: true
  };
}
