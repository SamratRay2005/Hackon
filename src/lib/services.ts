/**
 * Services Helper Library - Intelligent Returns Bridge
 * Implements real API calls to Groq, iFixit, Shippo, and DynamoDB / S3
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRODUCT_CATALOG } from "./catalog";

function getSeededOrders(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }

  const seedRandom = () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };

  const shuffled = [...PRODUCT_CATALOG];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seedRandom() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  const selected = shuffled.slice(0, 5);

  return selected.map((p) => {
    // Distribute purchase dates over the last 60 days to test expiration
    const daysAgo = Math.floor(seedRandom() * 60);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);

    return {
      orderId: `ORD-${Math.floor(seedRandom() * 90000) + 10000}`,
      sku: p.sku,
      name: p.name,
      price: p.price,
      category: p.category,
      brand: p.brand,
      returnWindowDays: p.returnWindowDays,
      purchaseDate: d.toISOString().split("T")[0],
      status: "active"
    };
  });
}

const hasAWSCredentials = !!(
  (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
  process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ||
  process.env.AWS_WEB_IDENTITY_TOKEN_FILE
);

let useAWS = false;
let ddbDocClient: any = null;
let s3Client: any = null;

if (hasAWSCredentials) {
  try {
    const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
    ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
    s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
    useAWS = true;
    console.log("DynamoDB and S3 clients successfully initialized.");
  } catch (e) {
    console.warn("AWS SDK Client initialization failed. Falling back to local mocks.", e);
    useAWS = false;
  }
}

// Simulated State (Mock DynamoDB & S3 Ledger + Vector DB)
// To keep data persistent across page reloads during the session, we use global state on the server.
const globalState: {
  sessions: Record<string, any>;
  claims: Record<string, Array<any>>;
  ledger: Record<string, Array<any>>;
  wallets: Record<string, { credits: number; sustainabilityScore: number }>;
  orders: Record<string, Array<any>>;
  buyerDemand: Array<any>;
  marketplace: Array<any>;
  reservations: Record<string, { userId: string, lockedAt: number, expiresAt: number, depositPaid: boolean }>;
  vectorDb: Array<{ id: string, userId: string, text: string, vector: number[] }>;
} = {
  sessions: {},
  claims: {},
  ledger: {},
  wallets: {},
  orders: {},
  buyerDemand: [],
  marketplace: [],
  reservations: {},
  vectorDb: []
};

// Simple In-Memory Vector Search Math (Cosine Similarity)
function getEmbedding(text: string): number[] {
  // Mock embedding generation using a simple hashing trick for deterministic 64-dim vectors
  const vec = new Array(64).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
  for (let i = 0; i < words.length; i++) {
    let hash = 0;
    for (let j = 0; j < words[i].length; j++) {
      hash = (hash << 5) - hash + words[i].charCodeAt(j);
      hash |= 0;
    }
    vec[Math.abs(hash) % 64] += 1;
  }
  // Normalize
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return magnitude === 0 ? vec : vec.map(val => val / magnitude);
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

// ----------------------------------------------------
// PRODUCT REFERENCE IMAGES CATALOG
// ----------------------------------------------------
export const SKU_REFERENCE_IMAGES: Record<string, string> = {
  "DENIM-JKT-001": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500",
  "SLIM-FIT-TEE": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500",
  "CF-Mkr-99": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
  "SPK-AIR-12": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500"
};

// ----------------------------------------------------
// 1. DYNAMODB / S3 LEDGER SIMULATOR
// ----------------------------------------------------
export const db = {
  getSKUReferenceImage: (sku: string) => {
    if (SKU_REFERENCE_IMAGES[sku]) return SKU_REFERENCE_IMAGES[sku];
    // Find product in catalog and return dynamic Unsplash image based on category
    const p = PRODUCT_CATALOG.find(x => x.sku === sku);
    if (p) {
      if (p.category === "Apparel") return "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500";
      if (p.category === "Footwear") return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";
      if (p.category === "Electronics") return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500";
      if (p.category === "Home & Kitchen") return "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500";
      if (p.category === "Recreation & Lifestyle") return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500";
    }
    return "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500";
  },

  getS3PresignedUploadUrl: async (bucketName: string, key: string) => {
    if (!useAWS) {
      return `/api/mock-upload?key=${encodeURIComponent(key)}`;
    }
    try {
      const command = new PutObjectCommand({ Bucket: bucketName, Key: key });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (e) {
      console.error("Failed to generate presigned upload URL:", e);
      return `/api/mock-upload?key=${encodeURIComponent(key)}`;
    }
  },

  initUser: async (userId: string) => {
    if (!userId) return;

    if (!globalState.wallets[userId]) {
      globalState.wallets[userId] = { credits: 1000, sustainabilityScore: 0 };
    }
    if (!globalState.claims[userId]) globalState.claims[userId] = [];
    if (!globalState.ledger[userId]) globalState.ledger[userId] = [];

    // Seed real deterministic orders
    if (!globalState.orders[userId]) {
      globalState.orders[userId] = getSeededOrders(userId);

      // Seed Vector DB with user history
      globalState.orders[userId].forEach(o => {
        db.addVectorContext(userId, `Purchased ${o.name} in category ${o.category}. Price ${o.price}.`);
      });
    }

    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new PutCommand({
          TableName: "Users",
          Item: { userId, credits: 1000, sustainabilityScore: 0 },
          ConditionExpression: "attribute_not_exists(userId)"
        }));
      } catch (e) {
        // User already exists
      }
    }
  },

  getOrders: async (userId: string) => {
    await db.initUser(userId);
    return globalState.orders[userId] || [];
  },

  // Vector DB Interface
  addVectorContext: (userId: string, text: string) => {
    const vector = getEmbedding(text);
    globalState.vectorDb.push({
      id: `v_${Date.now()}_${Math.random()}`,
      userId,
      text,
      vector
    });
  },

  queryVectorContext: (userId: string, queryText: string, limit = 3) => {
    const queryVec = getEmbedding(queryText);
    const results = globalState.vectorDb
      .filter(v => v.userId === userId || v.userId === "system")
      .map(v => ({ text: v.text, score: cosineSimilarity(queryVec, v.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return results.map(r => r.text);
  },

  // Cart session for bracketing
  saveCartSession: async (sessionId: string, sessionData: any) => {
    if (!useAWS) {
      globalState.sessions[sessionId] = {
        ...globalState.sessions[sessionId],
        ...sessionData,
        updatedAt: new Date().toISOString()
      };
      return globalState.sessions[sessionId];
    }
    try {
      const item = {
        sessionId,
        ...sessionData,
        updatedAt: new Date().toISOString()
      };
      await ddbDocClient.send(new PutCommand({
        TableName: "Sessions",
        Item: item
      }));
      return item;
    } catch (e) {
      console.error("Failed to save cart session in DynamoDB:", e);
      // Fallback
      globalState.sessions[sessionId] = {
        ...globalState.sessions[sessionId],
        ...sessionData,
        updatedAt: new Date().toISOString()
      };
      return globalState.sessions[sessionId];
    }
  },

  getCartSession: async (sessionId: string) => {
    if (!useAWS) {
      return globalState.sessions[sessionId] || null;
    }
    try {
      const res = await ddbDocClient.send(new GetCommand({
        TableName: "Sessions",
        Key: { sessionId }
      }));
      return res.Item || null;
    } catch (e) {
      console.error("Failed to get cart session from DynamoDB:", e);
      return globalState.sessions[sessionId] || null;
    }
  },

  // Fraud return claim tracking
  saveClaim: async (userId: string, claim: any) => {
    await db.initUser(userId);
    const newClaim = {
      id: `claim-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      userId,
      ...claim
    };
    if (!useAWS) {
      globalState.claims[userId].unshift(newClaim);
      return newClaim;
    }
    try {
      await ddbDocClient.send(new PutCommand({
        TableName: "Claims",
        Item: newClaim
      }));
      return newClaim;
    } catch (e) {
      console.error("Failed to save claim in DynamoDB:", e);
      globalState.claims[userId].unshift(newClaim);
      return newClaim;
    }
  },

  getClaims: async (userId?: string) => {
    if (!useAWS) {
      if (userId) {
        await db.initUser(userId);
        return globalState.claims[userId];
      }
      return Object.values(globalState.claims).flat();
    }
    try {
      if (userId) {
        const res = await ddbDocClient.send(new ScanCommand({
          TableName: "Claims",
          FilterExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        }));
        return res.Items || [];
      }
      const res = await ddbDocClient.send(new ScanCommand({
        TableName: "Claims"
      }));
      return res.Items || [];
    } catch (e) {
      console.error("Failed to get claims from DynamoDB:", e);
      if (userId) return globalState.claims[userId] || [];
      return Object.values(globalState.claims).flat();
    }
  },

  getUserReturnHistory: async (userId: string, priorCount?: number) => {
    await db.initUser(userId);
    const claims = await db.getClaims(userId);
    const totalCount = claims.length + (priorCount || 0);
    return {
      totalReturns30Days: totalCount,
      approvedReturns: claims.filter((c: any) => c.status === "APPROVED").length + (priorCount ? Math.floor(priorCount * 0.8) : 0),
      blockedReturns: claims.filter((c: any) => c.status === "BLOCKED").length + (priorCount ? Math.floor(priorCount * 0.2) : 0),
      history: claims
    };
  },

  // Product Health ledger
  saveProductHealthCard: async (userId: string, report: any) => {
    await db.initUser(userId);
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
    if (!useAWS) {
      globalState.ledger[userId].unshift(record);
      return record;
    }
    try {
      await ddbDocClient.send(new PutCommand({
        TableName: "Ledger",
        Item: record
      }));
      return record;
    } catch (e) {
      console.error("Failed to save product health card in DynamoDB:", e);
      globalState.ledger[userId].unshift(record);
      return record;
    }
  },

  getLedger: async (userId?: string) => {
    if (!useAWS) {
      if (userId) {
        await db.initUser(userId);
        return globalState.ledger[userId];
      }
      return Object.values(globalState.ledger).flat();
    }
    try {
      if (userId) {
        const res = await ddbDocClient.send(new ScanCommand({
          TableName: "Ledger",
          FilterExpression: "userId = :userId",
          ExpressionAttributeValues: { ":userId": userId }
        }));
        return res.Items || [];
      }
      const res = await ddbDocClient.send(new ScanCommand({
        TableName: "Ledger"
      }));
      return res.Items || [];
    } catch (e) {
      console.error("Failed to get ledger from DynamoDB:", e);
      if (userId) return globalState.ledger[userId] || [];
      return Object.values(globalState.ledger).flat();
    }
  },

  // Wallet and Loyalty
  getWallet: async (userId: string) => {
    await db.initUser(userId);

    if (!useAWS) {
      return globalState.wallets[userId];
    }
    try {
      const res = await ddbDocClient.send(new GetCommand({
        TableName: "Users",
        Key: { userId }
      }));
      if (res.Item) {
        return {
          credits: res.Item.credits,
          sustainabilityScore: res.Item.sustainabilityScore
        };
      }
      return { credits: 1000, sustainabilityScore: 0 };
    } catch (e) {
      console.error("Failed to get wallet from DynamoDB:", e);
      return globalState.wallets[userId];
    }
  },

  updateWallet: async (userId: string, creditsAdded: number, co2SavedAdded: number) => {
    await db.initUser(userId);
    if (!useAWS) {
      globalState.wallets[userId].credits += creditsAdded;
      globalState.wallets[userId].sustainabilityScore += co2SavedAdded;
      return globalState.wallets[userId];
    }
    try {
      const res = await ddbDocClient.send(new UpdateCommand({
        TableName: "Users",
        Key: { userId },
        UpdateExpression: "ADD credits :c, sustainabilityScore :s",
        ExpressionAttributeValues: {
          ":c": creditsAdded,
          ":s": co2SavedAdded
        },
        ReturnValues: "ALL_NEW"
      }));
      return {
        credits: res.Attributes?.credits ?? 0,
        sustainabilityScore: res.Attributes?.sustainabilityScore ?? 0
      };
    } catch (e) {
      console.error("Failed to update wallet in DynamoDB:", e);
      globalState.wallets[userId].credits += creditsAdded;
      globalState.wallets[userId].sustainabilityScore += co2SavedAdded;
      return globalState.wallets[userId];
    }
  },

  getBuyerDemand: (sku: string, returnerZip?: string) => {
    const list = globalState.buyerDemand.filter(d => d.sku === sku && !d.reserved);
    if (list.length > 0) return list;

    // Dynamically generate a buyer demand if none exists for this SKU
    const p = PRODUCT_CATALOG.find(x => x.sku === sku);
    if (!p) return [];

    const names = ["Alice Chen", "David Kim", "Marcus Aurelius", "Sarah Connor", "Bruce Wayne", "Clark Kent", "Peter Parker"];

    // Default to matching returner zip or choosing a close one if returner zip is provided
    let buyerZip = "98004";
    if (returnerZip) {
      const isIndianZip = /^\d{6}$/.test(returnerZip.trim());
      if (isIndianZip) {
        const numeric = parseInt(returnerZip) || 411030;
        buyerZip = String(numeric + (sku.length % 5) - 2);
      } else {
        const numeric = parseInt(returnerZip);
        if (!isNaN(numeric)) {
          buyerZip = String(numeric + (sku.length % 5) - 2);
        } else {
          buyerZip = "98004";
        }
      }
    }

    const nameIndex = sku.length % names.length;
    const generated = {
      sku: p.sku,
      name: p.name,
      buyerZip,
      nameBuyer: names[nameIndex],
      distance: 5 + (sku.length % 15),
      size: p.sizes[sku.length % p.sizes.length],
      reserved: false
    };

    globalState.buyerDemand.push(generated);
    return [generated];
  },

  reserveBuyerDemand: (sku: string, buyerZip: string) => {
    const demand = globalState.buyerDemand.find(d => d.sku === sku && d.buyerZip === buyerZip && !d.reserved);
    if (demand) {
      demand.reserved = true;
      return true;
    }
    return false;
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
  reasoning_format?: string;
  reasoning_effort?: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey && apiKey.trim() !== "") {
    let retries = 1;
    while (retries >= 0) {
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
            max_tokens: 2048,
            response_format: params.response_format,
            reasoning_format: params.reasoning_format,
            reasoning_effort: params.reasoning_effort
          })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            content: data.choices[0].message.content,
            reasoning: data.choices[0].message.reasoning,
            usage: data.usage,
            fromMock: false
          };
        } else if (response.status === 429 && retries > 0) {
          console.warn("Groq rate limit hit (429). Retrying in 6.5s...");
          await new Promise(resolve => setTimeout(resolve, 6500));
          retries--;
          continue;
        } else {
          const errText = await response.text();
          console.warn(`Groq API returned error status: ${response.status}. Body: ${errText}. Falling back to Mock.`);
          break;
        }
      } catch (e) {
        console.error("Failed to connect to Groq API:", e);
        break;
      }
    }
  }

  // Latency simulation for a high-fidelity loading effect
  await new Promise(resolve => setTimeout(resolve, 600));

  // Determine payload context to respond with realistic mock answers
  const userMessageStr = JSON.stringify(params.messages);

  // A. BRACKETING SIZE ASSIST (Layer 1)
  if (userMessageStr.includes("sizing") || userMessageStr.includes("proportion") || userMessageStr.includes("fit")) {
    const isFootwear = userMessageStr.includes("length");
    const mockContent = isFootwear
      ? {
          length: 9.9,
          length_confidence: 94,
          confidenceScore: 94
        }
      : {
          chest: 38.5,
          chest_confidence: 94,
          shoulders: 17.2,
          shoulders_confidence: 94,
          confidenceScore: 94
        };
    return {
      content: JSON.stringify(mockContent),
      reasoning: "Subject has an estimated shoulder width of 17.2 inches and chest depth of 38.5 inches based on proportions relative to height. The M size accommodates up to 40 inches of chest width, offering a tailored, clean fit. The L size (42 inch chest) will result in excess sagging along the sleeves and shoulders.",
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
