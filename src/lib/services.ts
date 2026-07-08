/**
 * services.ts — ReLoop Data & API Bridge
 * ────────────────────────────────────────
 * Single source of truth for:
 *   - All DynamoDB table CRUD (with in-memory fallback)
 *   - Hardcoded dark stores (Karnataka + Maharashtra)
 *   - Hardcoded product manuals + in-process RAG (vector search)
 *   - Groq, iFixit, Shippo API wrappers
 *
 * TABLE MAP
 *   Users              — accounts (buyer / seller / admin), credibility, body measurements
 *   Orders             — purchase history (persisted, not seeded fake)
 *   ReturnRequests     — core return flow record; tracks reason type + route
 *   Claims             — L2 fraud-check results only
 *   Ledger             — L4 product health cards (immutable, SHA-256)
 *   Sessions           — L1 size-bracketing cart sessions
 *   MarketplaceListings — real resell listings created after dark-store PASS
 *   DarkStores         — hardcoded 20 locations (Karnataka + Maharashtra)
 *   Manuals            — hardcoded product manuals + vector embeddings for RAG
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRODUCT_CATALOG } from "./catalog";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type UserRole = "admin" | "seller" | "buyer";
export type UserActiveRole = "buyer" | "returner" | "reseller";
export type ReturnReasonType =
  | "defective"      // product broken/won't turn on
  | "wrong_item"     // received different product
  | "damaged_on_arrival" // physically damaged in shipping
  | "vibe_mismatch"  // didn't like / changed mind
  | "size_issue";    // wrong size (apparel/footwear)

export type ReturnRoute = "permanent_store" | "dark_store";
// permanent_store → defective / wrong_item / damaged_on_arrival
// dark_store      → vibe_mismatch / size_issue

export type ReturnStatus =
  | "pending"
  | "triage_complete"
  | "fraud_check"
  | "approved"
  | "rejected"
  | "in_transit_darkstore"
  | "in_transit_permanent"
  | "received_darkstore"
  | "received_permanent"
  | "inspection_pass"
  | "inspection_fail"
  | "listed_marketplace";

export interface BodyMeasurements {
  chest?: number;       // inches
  shoulders?: number;   // inches
  waist?: number;       // inches
  height?: number;      // inches
  footLength?: number;  // inches
  capturedAt?: string;  // ISO timestamp
}

export interface WalletVoucher {
  id: string;
  title: string;          // e.g. "Grade A Purchase Reward"
  discountAmount: number; // absolute $ value
  issuedAt: string;       // ISO timestamp
  status: "active" | "redeemed";
}

export interface UserRecord {
  userId: string;
  email: string;
  role: UserRole;
  activeRole: UserActiveRole;
  zipCode: string;
  cashbackBalance: number;      // replaces old `credits` — stored in $ (e.g. 4.50)
  vouchers: WalletVoucher[];    // redeemable vouchers earned at checkout
  credibilityScore: number;     // 0-100, starts 70
  priorReturnsCount: number;
  totalReturns: number;
  totalResales: number;
  goodResaleCount: number;
  fraudFlagCount: number;
  bodyMeasurements: BodyMeasurements;
  sellerBrand?: string;         // only role=seller
  sellerApproved?: boolean;     // admin-approved sellers
  createdAt: string;
}

export interface Order {
  orderId: string;
  userId: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  brand: string;
  returnWindowDays: number;
  purchaseDate: string;
  status: "active" | "return_initiated" | "returned" | "completed";
  returnId?: string;          // links to ReturnRequests if returned
  createdAt: string;
}

export interface ReturnRequest {
  returnId: string;
  orderId: string;
  userId: string;
  sku: string;
  productName: string;
  userReturnReason: string;         // free text from user
  returnReasonType: ReturnReasonType; // LLM classified
  llmClassificationRaw: string;     // raw LLM explanation
  returnImages: string[];           // S3 URLs or base64 placeholders
  returnRoute: ReturnRoute;         // defective→permanent, vibe→dark_store
  darkStoreId?: string;             // assigned if route = dark_store
  claimId?: string;                 // links to Claims if fraud check run
  healthCardId?: string;            // links to Ledger after inspection
  marketplaceListingId?: string;    // links to MarketplaceListings after PASS
  status: ReturnStatus;
  userTryFix: boolean;              // did user say YES to chatbot fix attempt?
  fixDeflected: boolean;            // did chatbot fully deflect return?
  createdAt: string;
  resolvedAt?: string;
}

export interface DarkStore {
  darkStoreId: string;
  name: string;
  city: string;
  state: "Karnataka" | "Maharashtra";
  address: string;
  pincode: string;
  coords: { lat: number; lng: number };
  capacityUnits: number;
  currentLoad: number;
  isActive: boolean;
  managerUserId: string;
}

export interface ManualSection {
  heading: string;
  content: string;
}

export interface Manual {
  manualId: string;
  sku: string;
  productName: string;
  brand: string;
  warrantyDays: number;
  warrantyVoidOnSelfRepair: boolean;
  sections: ManualSection[];
  fullText: string;           // concat of all sections for embedding
  vectorEmbedding?: number[]; // 64-dim, computed lazily
  pdfUrl?: string;            // S3 URL — added when you supply actual PDFs
  addedBySellerId: string;
  createdAt: string;
}

export interface MarketplaceListing {
  listingId: string;
  sku: string;
  productName: string;
  originalPrice: number;
  resellPrice: number;
  grade: "A" | "B" | "C";   // only A/B/C listed; D → rejected
  category: string;
  brand: string;
  listingType: "original" | "resell"; // tag in marketplace feed
  sellerId: string;
  sellerType: "brand" | "individual";
  darkStoreId?: string;
  returnId?: string;
  healthCardId?: string;
  locationCity: string;
  locationCoords: { lat: number; lng: number };
  co2Saved: number;
  status: "active" | "reserved" | "sold";
  reservedByUserId?: string;
  reservedAt?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// AWS CLIENT INIT
// ─────────────────────────────────────────────────────────────

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
    const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });
    ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
    s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-north-1" });
    useAWS = true;
    console.log("[ReLoop] DynamoDB + S3 initialized.");
  } catch (e) {
    console.warn("[ReLoop] AWS SDK init failed. Using in-memory fallback.", e);
    useAWS = false;
  }
}

// ─────────────────────────────────────────────────────────────
// HARDCODED DARK STORES — 20 locations (Karnataka + Maharashtra)
// ─────────────────────────────────────────────────────────────

const DARK_STORES_SEED: DarkStore[] = [
  // Karnataka (10)
  { darkStoreId: "DS-BLR-01", name: "ReLoop Bengaluru Hub — Koramangala",     city: "Bengaluru",  state: "Karnataka",   address: "80 Feet Road, Koramangala 4th Block",        pincode: "560034", coords: { lat: 12.9279, lng: 77.6271 }, capacityUnits: 500, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-BLR-02", name: "ReLoop Bengaluru Hub — Whitefield",       city: "Bengaluru",  state: "Karnataka",   address: "EPIP Zone, Whitefield Main Road",             pincode: "560066", coords: { lat: 12.9698, lng: 77.7499 }, capacityUnits: 600, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-BLR-03", name: "ReLoop Bengaluru Hub — Hebbal",           city: "Bengaluru",  state: "Karnataka",   address: "Outer Ring Road, Hebbal Flyover Junction",   pincode: "560024", coords: { lat: 13.0358, lng: 77.5970 }, capacityUnits: 400, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-BLR-04", name: "ReLoop Bengaluru Hub — Electronic City",  city: "Bengaluru",  state: "Karnataka",   address: "Phase 1, Electronics City Hosur Road",       pincode: "560100", coords: { lat: 12.8399, lng: 77.6770 }, capacityUnits: 450, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-BLR-05", name: "ReLoop Bengaluru Hub — Jayanagar",        city: "Bengaluru",  state: "Karnataka",   address: "11th Main, Jayanagar 4th T Block",           pincode: "560041", coords: { lat: 12.9250, lng: 77.5938 }, capacityUnits: 300, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-MYS-01", name: "ReLoop Mysuru Central Hub",               city: "Mysuru",     state: "Karnataka",   address: "Mysuru-Bengaluru Road, Near Ring Road",       pincode: "570015", coords: { lat: 12.2958, lng: 76.6394 }, capacityUnits: 350, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-MNG-01", name: "ReLoop Mangaluru Port Hub",               city: "Mangaluru",  state: "Karnataka",   address: "Port Road, Bunder, Mangaluru",                pincode: "575001", coords: { lat: 12.8698, lng: 74.8431 }, capacityUnits: 300, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-HBL-01", name: "ReLoop Hubballi Industrial Hub",          city: "Hubballi",   state: "Karnataka",   address: "Industrial Area, Gokul Road",                 pincode: "580030", coords: { lat: 15.3647, lng: 75.1240 }, capacityUnits: 250, currentLoad: 0, isActive: false, managerUserId: "admin" },
  { darkStoreId: "DS-BLG-01", name: "ReLoop Belagavi Sector Hub",              city: "Belagavi",   state: "Karnataka",   address: "Udyambag Industrial Estate, NH-4",           pincode: "590008", coords: { lat: 15.8497, lng: 74.4977 }, capacityUnits: 200, currentLoad: 0, isActive: false, managerUserId: "admin" },
  { darkStoreId: "DS-SHV-01", name: "ReLoop Shivamogga NH-13 Hub",            city: "Shivamogga", state: "Karnataka",   address: "Near NH-13 Bypass, Sagar Road",               pincode: "577201", coords: { lat: 13.9299, lng: 75.5681 }, capacityUnits: 200, currentLoad: 0, isActive: false, managerUserId: "admin" },
  // Maharashtra (10)
  { darkStoreId: "DS-MUM-01", name: "ReLoop Mumbai Hub — Andheri East",        city: "Mumbai",     state: "Maharashtra", address: "MIDC Industrial Area, Andheri East",          pincode: "400093", coords: { lat: 19.1136, lng: 72.8697 }, capacityUnits: 700, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-MUM-02", name: "ReLoop Navi Mumbai Hub — Turbhe",         city: "Navi Mumbai",state: "Maharashtra", address: "MIDC Turbhe, Thane-Belapur Road",             pincode: "400703", coords: { lat: 19.0477, lng: 73.0199 }, capacityUnits: 600, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-MUM-03", name: "ReLoop Thane Hub — Wagle Estate",         city: "Thane",      state: "Maharashtra", address: "Wagle Industrial Estate, Thane West",         pincode: "400604", coords: { lat: 19.2094, lng: 72.9781 }, capacityUnits: 500, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-MUM-04", name: "ReLoop Bhiwandi Logistics Park",          city: "Bhiwandi",   state: "Maharashtra", address: "National Highway 3, Bhiwandi",                pincode: "421302", coords: { lat: 19.2964, lng: 73.0492 }, capacityUnits: 800, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-PUN-01", name: "ReLoop Pune Hub — Hinjewadi IT Park",     city: "Pune",       state: "Maharashtra", address: "Phase 3, Rajiv Gandhi Infotech Park",         pincode: "411057", coords: { lat: 18.5912, lng: 73.7389 }, capacityUnits: 400, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-PUN-02", name: "ReLoop Pune Hub — Kharadi",               city: "Pune",       state: "Maharashtra", address: "EON IT Park Road, Kharadi",                   pincode: "411014", coords: { lat: 18.5474, lng: 73.9413 }, capacityUnits: 350, currentLoad: 0, isActive: true,  managerUserId: "admin" },
  { darkStoreId: "DS-PUN-03", name: "ReLoop Pune Hub — Chakan Auto Cluster",   city: "Pune",       state: "Maharashtra", address: "Chakan MIDC, Pune-Nashik Highway",            pincode: "410501", coords: { lat: 18.7585, lng: 73.8596 }, capacityUnits: 300, currentLoad: 0, isActive: false, managerUserId: "admin" },
  { darkStoreId: "DS-NGP-01", name: "ReLoop Nagpur Hub — Butibori MIDC",       city: "Nagpur",     state: "Maharashtra", address: "Butibori Industrial Area, NH-7",              pincode: "441122", coords: { lat: 21.0340, lng: 79.0011 }, capacityUnits: 300, currentLoad: 0, isActive: false, managerUserId: "admin" },
  { darkStoreId: "DS-NSK-01", name: "ReLoop Nashik Hub — Satpur MIDC",         city: "Nashik",     state: "Maharashtra", address: "Satpur Industrial Area, Ambad Link Road",     pincode: "422007", coords: { lat: 20.0073, lng: 73.7898 }, capacityUnits: 250, currentLoad: 0, isActive: false, managerUserId: "admin" },
  { darkStoreId: "DS-AUR-01", name: "ReLoop Aurangabad Hub — Waluj MIDC",      city: "Aurangabad", state: "Maharashtra", address: "Waluj MIDC, Chikalthana Road",                pincode: "431136", coords: { lat: 19.8762, lng: 75.2756 }, capacityUnits: 200, currentLoad: 0, isActive: false, managerUserId: "admin" },
];

// ─────────────────────────────────────────────────────────────
// HARDCODED MANUALS — 12 products
// Add more sections when you supply actual PDFs.
// RAG uses ManualSection[].content chunks to answer user questions.
// ─────────────────────────────────────────────────────────────

const MANUALS_DB: Record<string, Manual> = {
  "MAN-CF-MKR-99": {
    manualId: "MAN-CF-MKR-99", sku: "CF-Mkr-99",
    productName: "Smart Drip Coffee Maker", brand: "TechNova",
    warrantyDays: 365, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Power & Startup", content: "Plug the unit into a 230V grounded outlet. Press the power button once. The LED ring turns amber. If no LED lights up, check the outlet with another device and inspect the power cord for damage. A tripped thermal fuse is the most common cause of no power — see Thermal Fuse section." },
      { heading: "Brewing Cycle", content: "Fill the water reservoir up to the MAX line (1.5 L). Insert a #4 paper filter or the reusable stainless mesh basket. Add coffee grounds (1 tablespoon per 150 ml water). Select brew strength (Low / Medium / High) using the dial. Press BREW. The cycle takes 6–8 minutes. The KEEP WARM plate activates automatically and turns off after 40 minutes." },
      { heading: "Descaling (Mineral Buildup)", content: "If brew time exceeds 10 minutes or flow rate drops, descale immediately. Mix equal parts white vinegar and water (750 ml total). Run a full brew cycle without grounds. Discard the liquid. Run two full cycles with clean water to rinse. Descaling every 30–60 uses is recommended in hard-water areas." },
      { heading: "Thermal Fuse Replacement", content: "Unplug the unit. Remove the bottom panel (4 Phillips screws). Locate the thermal fuse (small ceramic component on the heating coil wiring). Test continuity with a multimeter — if open circuit, the fuse is blown. Replace with a matching 10A/250V fuse. Reassemble and test. NOTE: This repair does NOT void your warranty as the thermal fuse is a consumable safety component." },
      { heading: "Error Indicators", content: "Slow amber blink: water reservoir empty. Fast red blink: thermal overload — unplug for 15 minutes. Steady red: heating element fault — contact support. Green steady: brew complete, keep-warm active." },
      { heading: "Warranty & Self-Repair", content: "1-year limited warranty. Covers manufacturing defects and component failures under normal use. Warranty is NOT voided by descaling, filter replacement, or thermal fuse replacement. Warranty IS voided by physical damage, unauthorized modification to heating coil or pump, or immersion in water." },
    ],
    fullText: "",
  },

  "MAN-SPK-AIR-12": {
    manualId: "MAN-SPK-AIR-12", sku: "SPK-AIR-12",
    productName: "HiFi Wireless Speaker", brand: "TechNova",
    warrantyDays: 365, warrantyVoidOnSelfRepair: true,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Pairing & Bluetooth", content: "Hold the Bluetooth button for 3 seconds until the LED flashes blue rapidly. On your device, search for 'TechNova HiFi' and tap to pair. The LED turns solid blue. Pairing info is stored for up to 8 devices. To forget all pairings, hold power + Bluetooth simultaneously for 6 seconds." },
      { heading: "Charging", content: "Use the included USB-C cable (5V/2A minimum). The charging LED turns red and goes green when full. Do not use fast-charge adapters above 10W — this can stress the 2600 mAh Li-ion cell. Charge time from empty: approximately 2.5 hours." },
      { heading: "Sound Issues", content: "No sound: check volume on both device and speaker. Distorted sound at high volume: reduce source volume below 80% and use the speaker volume knob instead. Crackling: the driver membrane may be wet — leave speaker in a dry environment for 24 hours. Mono output: check if stereo pairing mode is active (two units required)." },
      { heading: "Battery & Lifespan", content: "Rated 12 hours at 60% volume. Battery health degrades after ~500 full charge cycles. If runtime drops below 4 hours, the battery can be replaced at an authorised TechNova service centre. Self-replacement of the battery VOIDS the warranty as it requires soldering." },
      { heading: "Warranty & Self-Repair", content: "1-year warranty. Covers: Bluetooth module failure, driver failure, charging port failure under normal use. Does NOT cover: physical impact damage, water immersion beyond IPX4 rating, battery replacement attempted by user, or opening the casing." },
    ],
    fullText: "",
  },

  "MAN-EAR-BUDS-50": {
    manualId: "MAN-EAR-BUDS-50", sku: "EAR-BUDS-50",
    productName: "Active Noise-Cancelling Wireless Earbuds", brand: "TechNova",
    warrantyDays: 365, warrantyVoidOnSelfRepair: true,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Pairing", content: "Open the case lid. Both earbuds enter pairing mode automatically if not previously paired (LED flashes white). On your device select 'TechNova ANC Buds'. Once connected the LED pulses blue slowly. To re-pair, place both buds in case and hold the case button for 5 seconds." },
      { heading: "ANC & Transparency Mode", content: "Single tap right earbud: ANC on/off. Double tap right: Transparency mode. ANC performance depends on eartip fit — ensure the medium silicone tips (supplied) create a full seal. ANC does not function with foam tips." },
      { heading: "Charging Case", content: "The case holds 3 additional charges (660 mAh). Charge case via USB-C. The 4 LEDs on the case front indicate charge level (25% each). Bud charging contacts must be clean — wipe with a dry cotton swab if charging is intermittent." },
      { heading: "Audio Quality Issues", content: "Low volume: clean the mesh speaker grille with a dry soft brush. Muffled sound: earwax on the mesh — use the cleaning tool included or a soft dry brush. Crackling during calls: likely a microphone wind issue — enable the wind-noise filter in the companion app." },
      { heading: "Warranty", content: "1-year warranty. Covers driver and ANC module defects. Does NOT cover: lost individual earbuds, physical damage, liquid submersion beyond IPX4, eartip replacement (consumable). Warranty is voided if the casing is opened." },
    ],
    fullText: "",
  },

  "MAN-HEADPHN-51": {
    manualId: "MAN-HEADPHN-51", sku: "HEADPHN-51",
    productName: "Over-Ear Studio Reference Headphones", brand: "TechNova",
    warrantyDays: 365, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Setup", content: "Connect the 3.5mm detachable cable to the left ear cup. Plug the other end into your audio source. For balanced listening use the included 6.3mm adapter for studio equipment. The headphones are passive (no battery required) — all audio is driven by your source device." },
      { heading: "Ear Pad Replacement", content: "The ear pads are user-replaceable and do NOT void the warranty. Rotate the pad counter-clockwise until you feel a click and it releases. Align the new pad's tabs with the slots and rotate clockwise until it clicks. Replacement pads available at TechNova store." },
      { heading: "Cable Issues", content: "If audio is only coming from one cup, try a different cable — the 3.5mm detachable design means a faulty cable is the most common issue. Inspect the 3.5mm plug for bent pins. Clean the jack port with a dry toothpick." },
      { heading: "Warranty", content: "1-year warranty covering driver failure and headband structural defects under normal use. Ear pad replacement does NOT void warranty (they are consumables). Opening the driver housing DOES void warranty." },
    ],
    fullText: "",
  },

  "MAN-GRNDR-COF-92": {
    manualId: "MAN-GRNDR-COF-92", sku: "GRNDR-COF-92",
    productName: "Conical Burr Precision Coffee Grinder", brand: "Culinary Crate",
    warrantyDays: 365, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Grind Settings", content: "Rotate the grind selector ring counter-clockwise for finer grind (espresso), clockwise for coarser (French press). 18 grind settings available. Always set grind size BEFORE adding beans — adjusting while grinding damages the burrs." },
      { heading: "Burr Cleaning", content: "Clean burrs every 10 uses with the supplied brush. For deep clean: remove the top burr (unscrew counter-clockwise), brush both burrs, and reassemble. Do not wash burrs with water — moisture causes rust. A rice grain run-through once a month absorbs residual oils." },
      { heading: "Motor Stall", content: "If the motor stalls (hum but no rotation), immediately turn off and unplug. The most common cause is attempting to grind dark roast beans on the finest setting — coarsen by 2 clicks and try again. Also check for foreign objects in the bean hopper." },
      { heading: "Warranty", content: "1-year warranty covering motor and burr manufacturing defects. Burr cleaning does NOT void warranty. Opening the motor housing DOES void warranty. Damage from grinding non-coffee items (spices, nuts) is not covered." },
    ],
    fullText: "",
  },

  "MAN-BLENDER-80": {
    manualId: "MAN-BLENDER-80", sku: "BLENDER-80",
    productName: "High-Speed Professional Kitchen Blender", brand: "Culinary Crate",
    warrantyDays: 365, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Assembly & Use", content: "Ensure the jar base is locked clockwise onto the motor base before use. Add liquid first, then solids. Never fill beyond the MAX line (1.5 L). Start on LOW and increase speed gradually to avoid airlocks. Always hold the lid with a folded cloth when blending hot liquids." },
      { heading: "Blade Maintenance", content: "The blade assembly is user-removable. Unscrew counter-clockwise from the jar base. Wash separately in warm soapy water. Do NOT put the blade assembly in the dishwasher — this dulls the blades. Dry immediately to prevent rust. Replacement blade assemblies available without voiding warranty." },
      { heading: "Motor Overheating", content: "If the motor shuts off mid-blend, the thermal protection has triggered. Unplug and wait 20 minutes. Avoid continuous blending beyond 90 seconds. For thick mixtures (nut butters, frozen), add 50ml water and pulse 5 times rather than running continuously." },
      { heading: "Warranty", content: "1-year warranty. Blade assembly replacement does NOT void warranty. Jar cracking from thermal shock (adding boiling liquid to cold jar) is not covered. Motor damage from sustained dry blending is not covered." },
    ],
    fullText: "",
  },

  "MAN-ROBO-VAC-103": {
    manualId: "MAN-ROBO-VAC-103", sku: "ROBO-VAC-103",
    productName: "Smart Mapping Robot Vacuum Cleaner", brand: "Culinary Crate",
    warrantyDays: 365, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Initial Mapping", content: "Place the dock against a flat wall with 0.5m clearance on each side. Run one full mapping clean before customising zones. The robot uses LiDAR to build a floor plan — it needs 2-3 runs to fully map complex spaces. Do not move the dock after mapping." },
      { heading: "Brush Maintenance", content: "Clean the main roller brush every 3 uses. Press the tab on the bottom to release. Remove tangled hair with scissors — cut along the brush, do not pull aggressively. The side brush unscrews counter-clockwise. Replacement brushes do NOT void warranty." },
      { heading: "Navigation Issues", content: "Robot stuck in loop: remove all loose cables from the floor. Random path (not following map): check if the LiDAR cover (top dome) is clean — wipe with a dry microfibre cloth. Lost mapping: manually return robot to dock, press dock button for 10 seconds to reset and remap." },
      { heading: "Suction & Filter", content: "Replace the HEPA filter every 2 months. Press the dustbin release, open the bin, and pull the filter. Tap over a trash can — do not wash. If suction is weak, check for blockages in the intake tube under the robot with the supplied cleaning pin." },
      { heading: "Warranty", content: "1-year warranty. Brush and filter replacement do NOT void warranty (consumables). Battery replacement by user DOES void warranty. Physical damage from stairs or water is not covered." },
    ],
    fullText: "",
  },

  "MAN-MONITOR-54": {
    manualId: "MAN-MONITOR-54", sku: "MONITOR-54",
    productName: "27-inch 4K UHD IPS Designer Monitor", brand: "TechNova",
    warrantyDays: 730, warrantyVoidOnSelfRepair: true,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Connections", content: "DisplayPort 1.4 supports 4K@144Hz. HDMI 2.1 supports 4K@60Hz. USB-C (65W PD) supports 4K@60Hz and charges your laptop simultaneously. Ensure cables are fully seated — a partially inserted DP cable causes flickering. For 144Hz you MUST use the supplied DP cable." },
      { heading: "Image Issues", content: "No signal: check the input selector (button 3 on the bottom bezel) matches the connected port. Flickering: reseat the DP cable. Pink tint: damaged DP cable — replace. Dead pixels: single dead pixel is within panel spec. More than 5 dead pixels qualifies for warranty replacement." },
      { heading: "Calibration", content: "Factory calibration report is in the box. For colour-critical work use the OSD (On Screen Display) to set colour temperature to 6500K and brightness to 120 cd/m². The monitor supports hardware calibration via the USB-B port with compatible colorimeter software." },
      { heading: "Warranty", content: "2-year warranty. Covers backlight failure, panel defects beyond 5 dead pixels, port failures under normal use. Does NOT cover: physical panel cracks, burn-in from static images (use screensaver), or damage from power surges (use a surge protector). Opening the monitor casing VOIDS warranty." },
    ],
    fullText: "",
  },

  "MAN-ROUTER-63": {
    manualId: "MAN-ROUTER-63", sku: "ROUTER-63",
    productName: "Wi-Fi 6 Dual-Band Smart Gigabit Router", brand: "TechNova",
    warrantyDays: 365, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Setup", content: "Connect the WAN port (blue) to your ISP modem using an Ethernet cable. Power on. Open 192.168.1.1 in a browser or use the TechNova app. Follow the wizard. If your ISP requires PPPoE credentials, enter them in the WAN settings page. Setup takes under 5 minutes." },
      { heading: "Connectivity Issues", content: "Internet down: check WAN LED (should be solid white). If blinking red, the router cannot reach your ISP — reboot modem first, then router. Wi-Fi visible but no internet: factory reset (hold reset pin 10 seconds) and reconfigure. Slow speeds: ensure you are on the 5GHz band for devices within 5m of the router." },
      { heading: "Firmware Updates", content: "Firmware updates install automatically at 3AM if auto-update is enabled. To manually update: Admin panel → System → Firmware. Never power off during an update. If the router is stuck after an update, hold reset for 30 seconds to restore factory firmware." },
      { heading: "Warranty", content: "1-year warranty. Firmware issues and factory resets do NOT void warranty. Physical port damage or power surge damage is not covered. Antenna replacement does NOT void warranty." },
    ],
    fullText: "",
  },

  "MAN-RUN-SHOE-30": {
    manualId: "MAN-RUN-SHOE-30", sku: "RUN-SHOE-30",
    productName: "Aero-Foam Max Running Shoes", brand: "Stride Dynamics",
    warrantyDays: 180, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Sizing & Fit", content: "These shoes run true to size for most foot types. If you have wide feet (2E+), consider sizing up half a size. The heel counter is firm for the first 50km and softens during break-in. Lace lock the top eyelet for heel slip issues." },
      { heading: "Sole & Midsole Care", content: "The Aero-Foam midsole provides maximum cushioning for up to 700km. Beyond 700km cushioning degrades — replace for injury prevention. Do not machine wash. Hand wash with cold water and mild soap. Air dry away from direct sunlight — heat degrades EVA foam." },
      { heading: "Upper & Mesh", content: "The engineered mesh upper is breathable and lightweight. For cleaning, use a soft brush with soapy water. Do not submerge. The reflective overlays must not be scrubbed — wipe gently." },
      { heading: "Warranty", content: "180-day warranty against manufacturing defects including sole delamination, stitching failure, and eyelets. Normal wear and sole wear-down is not covered. Damage from machine washing is not covered." },
    ],
    fullText: "",
  },

  "MAN-DENIM-JKT-001": {
    manualId: "MAN-DENIM-JKT-001", sku: "DENIM-JKT-001",
    productName: "Classic Denim Jacket", brand: "Vantage Threads",
    warrantyDays: 180, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "Sizing Guide", content: "This jacket is cut slim. If you are between sizes or prefer a relaxed fit, size up. The chest and shoulder measurements are the critical fit points — refer to the brand size chart. The jacket will not stretch significantly after washing." },
      { heading: "Washing Instructions", content: "Machine wash cold, inside out, with similar colours. Use a gentle cycle. Do not bleach. Tumble dry low or lay flat to dry. High heat causes shrinkage and fading. For best colour retention, wash only when necessary." },
      { heading: "Caring for Hardware", content: "The metal buttons and rivets may tarnish over time. Polish with a soft dry cloth. Do not use chemical cleaners on hardware. If a rivet loosens, it can be re-pressed at any tailor." },
      { heading: "Warranty", content: "180-day warranty against stitching failure, button defects, and zipper defects. Fading from washing or sun exposure is considered normal wear and is not covered." },
    ],
    fullText: "",
  },

  "MAN-PARKA-WTR-06": {
    manualId: "MAN-PARKA-WTR-06", sku: "PARKA-WTR-06",
    productName: "All-Weather Down Winter Parka", brand: "Vantage Threads",
    warrantyDays: 180, warrantyVoidOnSelfRepair: false,
    addedBySellerId: "system", createdAt: "2026-01-01T00:00:00Z",
    sections: [
      { heading: "DWR Water Repellency", content: "The outer shell has a Durable Water Repellency (DWR) treatment. Water should bead and roll off. If water soaks in, the DWR has depleted. Restore by tumble drying on low for 20 minutes or ironing on low through a thin cloth — heat reactivates the DWR polymer." },
      { heading: "Down Fill Care", content: "Do not dry clean — solvents strip the down's natural oils. Machine wash on gentle with a down-specific detergent. Tumble dry low with two clean tennis balls to break up clumps. Air out fully before storage. Storing compressed for extended periods reduces loft." },
      { heading: "Zipper Issues", content: "If the main zipper sticks, rub the teeth with a dry bar of soap or a zipper lubricant wax. Never force a stuck zipper — this bends the teeth. If a tooth is missing, a tailor can replace the zipper slider without full replacement." },
      { heading: "Warranty", content: "180-day warranty against zipper defects, seam delamination, and down feather leakage through the shell. Normal DWR depletion from use is not a defect. Damage from dry cleaning chemicals is not covered." },
    ],
    fullText: "",
  },
};

// Pre-compute fullText for each manual (used in RAG embedding)
Object.values(MANUALS_DB).forEach((manual) => {
  manual.fullText = manual.sections
    .map((s) => `${s.heading}: ${s.content}`)
    .join("\n\n");
});

// ─────────────────────────────────────────────────────────────
// VECTOR SEARCH UTILITIES (in-process RAG for manuals)
// ─────────────────────────────────────────────────────────────

function getEmbedding(text: string): number[] {
  // Deterministic 64-dim mock embedding via hashing
  const vec = new Array(64).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ");
  for (const word of words) {
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    vec[Math.abs(hash) % 64] += 1;
  }
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return magnitude === 0 ? vec : vec.map((val) => val / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// Lazily embed manual sections on first query
function ensureEmbedded(manual: Manual) {
  if (!manual.vectorEmbedding) {
    manual.vectorEmbedding = getEmbedding(manual.fullText);
  }
  manual.sections.forEach((s: any) => {
    if (!s._vec) s._vec = getEmbedding(`${s.heading} ${s.content}`);
  });
}

// ─────────────────────────────────────────────────────────────
// SEEDED ORDERS (deterministic per userId)
// ─────────────────────────────────────────────────────────────

function getSeededOrders(userId: string): Order[] {
  const now = new Date();

  // ── 4 PINNED DEMO ORDERS — always first, always visible to jury ──
  // Each product demonstrates a different return route:
  //  1. CF-Mkr-99      → DIY Repair (has manual, L3 Chat)
  //  2. YRDLY-GNTLMN-001 → Non-Returnable (hygiene policy gate)
  //  3. SPK-AIR-12     → Defective route (L2 Verify Return)
  //  4. DENIM-JKT-001  → Vibe Mismatch route (L5 Dark Store)
  const DEMO_SKUS = ["CF-Mkr-99", "YRDLY-GNTLMN-001", "SPK-AIR-12", "DENIM-JKT-001"];
  const demoProducts = DEMO_SKUS.map(sku => PRODUCT_CATALOG.find(p => p.sku === sku)).filter(Boolean) as typeof PRODUCT_CATALOG;

  const demoOrders: Order[] = demoProducts.map((p, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (i * 7 + 3)); // Each bought a week apart
    return {
      orderId: `ORD-DEMO-${p.sku}`,
      userId,
      sku: p.sku,
      name: p.name,
      price: p.price,
      category: p.category,
      brand: p.brand,
      returnWindowDays: p.returnWindowDays,
      purchaseDate: d.toISOString().split("T")[0],
      status: "active" as const,
      createdAt: d.toISOString(),
    };
  });

  // Fill up to 5 total with random products that aren't already pinned
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const seedRandom = () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
  const remaining = PRODUCT_CATALOG.filter(p => !DEMO_SKUS.includes(p.sku));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(seedRandom() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  const extraOrders: Order[] = remaining.slice(0, 1).map((p) => {
    const daysAgo = Math.floor(seedRandom() * 60) + 30;
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return {
      orderId: `ORD-${Math.floor(seedRandom() * 90000) + 10000}`,
      userId,
      sku: p.sku,
      name: p.name,
      price: p.price,
      category: p.category,
      brand: p.brand,
      returnWindowDays: p.returnWindowDays,
      purchaseDate: d.toISOString().split("T")[0],
      status: "active" as const,
      createdAt: d.toISOString(),
    };
  });

  return [...demoOrders, ...extraOrders];
}


// ─────────────────────────────────────────────────────────────
// IN-MEMORY GLOBAL STATE (fallback when DynamoDB unavailable)
// ─────────────────────────────────────────────────────────────

const globalState: {
  users: Record<string, UserRecord>;
  sessions: Record<string, any>;
  claims: Record<string, any[]>;
  ledger: Record<string, any[]>;
  orders: Record<string, Order[]>;
  returnRequests: Record<string, ReturnRequest>;
  buyerDemand: any[];
  marketplace: MarketplaceListing[];
  reservations: Record<string, any>;
  vectorDb: Array<{ id: string; userId: string; text: string; vector: number[] }>;
  darkStores: DarkStore[];
} = {
  users: {},
  sessions: {},
  claims: {},
  ledger: {},
  orders: {},
  returnRequests: {},
  buyerDemand: [],
  marketplace: [],
  reservations: {},
  vectorDb: [],
  darkStores: DARK_STORES_SEED,
};

// ─────────────────────────────────────────────────────────────
// PRODUCT REFERENCE IMAGES
// ─────────────────────────────────────────────────────────────

export const SKU_REFERENCE_IMAGES: Record<string, string> = {
  "DENIM-JKT-001": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500",
  "SLIM-FIT-TEE":  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500",
  "CF-Mkr-99":     "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500",
  "SPK-AIR-12":    "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500",
  "YRDLY-GNTLMN-001": "/yardley-gentleman.webp",
  "BOAT-EARBUDS-01": "/boat-earbuds.jpg",
};

// ─────────────────────────────────────────────────────────────
// CREDIBILITY SCORE CALCULATOR
// ─────────────────────────────────────────────────────────────

function recalculateCredibility(user: Partial<UserRecord>): number {
  let score = 70;
  const returns = user.totalReturns ?? 0;
  const fraudFlags = user.fraudFlagCount ?? 0;
  const goodResales = user.goodResaleCount ?? 0;
  // Penalty for excess returns (>2 in lifetime)
  if (returns > 2) score -= Math.min(30, (returns - 2) * 10);
  // Penalty for fraud flags
  score -= fraudFlags * 20;
  // Reward for quality resales
  score += Math.min(25, goodResales * 5);
  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────────────────────
// db — MAIN DATA ACCESS OBJECT
// ─────────────────────────────────────────────────────────────

export const db = {
  // ── Utilities ─────────────────────────────────────────────

  getSKUReferenceImage: (sku: string): string => {
    if (SKU_REFERENCE_IMAGES[sku]) return SKU_REFERENCE_IMAGES[sku];
    const p = PRODUCT_CATALOG.find((x) => x.sku === sku);
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
      
      if (n.includes("perfume") || n.includes("cologne") || n.includes("fragrance")) return "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500";
    }
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500";
  },

  getS3PresignedUploadUrl: async (bucketName: string, key: string): Promise<string> => {
    if (!useAWS) return `/api/mock-upload?key=${encodeURIComponent(key)}`;
    try {
      const command = new PutObjectCommand({ Bucket: bucketName, Key: key });
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch {
      return `/api/mock-upload?key=${encodeURIComponent(key)}`;
    }
  },

  // ── Users ──────────────────────────────────────────────────

  initUser: async (userId: string, role: UserRole = "buyer"): Promise<void> => {
    if (!userId) return;

    if (!globalState.users[userId]) {
      globalState.users[userId] = {
        userId,
        email: `${userId}@reloop.app`,
        role,
        activeRole: "buyer",
        zipCode: "560034",
        cashbackBalance: 0,
        vouchers: [],
        credibilityScore: 70,
        priorReturnsCount: 0,
        totalReturns: 0,
        totalResales: 0,
        goodResaleCount: 0,
        fraudFlagCount: 0,
        bodyMeasurements: {},
        createdAt: new Date().toISOString(),
      };
    } else {
      // Migrate existing in-memory users that still have old credits field
      const u = globalState.users[userId] as any;
      if (u.cashbackBalance === undefined) u.cashbackBalance = 0;
      if (u.vouchers === undefined) u.vouchers = [];
    }
    if (!globalState.claims[userId]) globalState.claims[userId] = [];
    if (!globalState.ledger[userId]) globalState.ledger[userId] = [];
    if (!globalState.orders[userId]) {
      globalState.orders[userId] = getSeededOrders(userId);
      globalState.orders[userId].forEach((o) => {
        db.addVectorContext(userId, `Purchased ${o.name} in category ${o.category}. Price ${o.price}. Brand ${o.brand}.`);
      });
    }

    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(
          new PutCommand({
            TableName: "Users",
            Item: globalState.users[userId],
            ConditionExpression: "attribute_not_exists(userId)",
          })
        );
      } catch {
        // User already exists — ignore
      }
    }
  },

  seedWallet: async (userId: string, cashbackBalance: number, vouchers: WalletVoucher[]): Promise<void> => {
    await db.initUser(userId);
    if (!useAWS) {
      globalState.users[userId].cashbackBalance = cashbackBalance;
      globalState.users[userId].vouchers = vouchers;
    }
  },

  getUser: async (userId: string): Promise<UserRecord | null> => {
    await db.initUser(userId);
    if (!useAWS) return globalState.users[userId] ?? null;
    try {
      const res = await ddbDocClient.send(
        new GetCommand({ TableName: "Users", Key: { userId } })
      );
      return (res.Item as UserRecord) ?? null;
    } catch {
      return globalState.users[userId] ?? null;
    }
  },

  updateUserActiveRole: async (userId: string, activeRole: UserActiveRole): Promise<void> => {
    await db.initUser(userId);
    if (!useAWS) {
      globalState.users[userId].activeRole = activeRole;
      return;
    }
    try {
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: "Users",
          Key: { userId },
          UpdateExpression: "SET activeRole = :r",
          ExpressionAttributeValues: { ":r": activeRole },
        })
      );
      if (globalState.users[userId]) globalState.users[userId].activeRole = activeRole;
    } catch {
      if (globalState.users[userId]) globalState.users[userId].activeRole = activeRole;
    }
  },

  saveBodyMeasurements: async (userId: string, measurements: BodyMeasurements): Promise<BodyMeasurements> => {
    await db.initUser(userId);
    const withTimestamp = { ...measurements, capturedAt: new Date().toISOString() };
    if (!useAWS) {
      globalState.users[userId].bodyMeasurements = withTimestamp;
      return withTimestamp;
    }
    try {
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: "Users",
          Key: { userId },
          UpdateExpression: "SET bodyMeasurements = :m",
          ExpressionAttributeValues: { ":m": withTimestamp },
        })
      );
    } catch {}
    if (globalState.users[userId]) globalState.users[userId].bodyMeasurements = withTimestamp;
    return withTimestamp;
  },

  getBodyMeasurements: async (userId: string): Promise<BodyMeasurements | null> => {
    const user = await db.getUser(userId);
    if (!user) return null;
    const m = user.bodyMeasurements;
    return m && m.capturedAt ? m : null;
  },

  incrementFraudFlag: async (userId: string): Promise<void> => {
    await db.initUser(userId);
    globalState.users[userId].fraudFlagCount = (globalState.users[userId].fraudFlagCount ?? 0) + 1;
    globalState.users[userId].credibilityScore = recalculateCredibility(globalState.users[userId]);
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(
          new UpdateCommand({
            TableName: "Users",
            Key: { userId },
            UpdateExpression: "ADD fraudFlagCount :one SET credibilityScore = :cs",
            ExpressionAttributeValues: {
              ":one": 1,
              ":cs": globalState.users[userId].credibilityScore,
            },
          })
        );
      } catch {}
    }
  },

  // ── Orders ─────────────────────────────────────────────────

  getOrders: async (userId: string): Promise<Order[]> => {
    await db.initUser(userId);
    let result: Order[] = [];

    if (!useAWS) {
      result = globalState.orders[userId] ?? [];
    } else {
      try {
        const res = await ddbDocClient.send(
          new ScanCommand({
            TableName: "Orders",
            FilterExpression: "userId = :uid",
            ExpressionAttributeValues: { ":uid": userId },
          })
        );
        const items = (res.Items ?? []) as Order[];
        if (items.length === 0) {
          const seeded = getSeededOrders(userId);
          for (const o of seeded) {
            await ddbDocClient.send(new PutCommand({ TableName: "Orders", Item: o })).catch(() => {});
          }
          if (!globalState.orders[userId]) globalState.orders[userId] = seeded;
          result = seeded;
        } else {
          if (!globalState.orders[userId]) globalState.orders[userId] = items;
          result = items;
        }
      } catch {
        result = globalState.orders[userId] ?? [];
      }
    }

    // FORCE OVERRIDE: Always ensure the first order is the Coffee Maker so DIM flow is testable
    if (result.length > 0) {
      const coffeeMaker = PRODUCT_CATALOG.find((p) => p.sku === "CF-Mkr-99");
      if (coffeeMaker) {
        result[0] = {
          ...result[0],
          sku: coffeeMaker.sku,
          name: coffeeMaker.name,
          price: coffeeMaker.price,
          category: coffeeMaker.category,
        };
      }
    }

    return result;
  },

  updateOrderStatus: async (
    userId: string,
    orderId: string,
    status: Order["status"],
    returnId?: string
  ): Promise<void> => {
    if (!useAWS) {
      const orders = globalState.orders[userId] ?? [];
      const o = orders.find((x) => x.orderId === orderId);
      if (o) {
        o.status = status;
        if (returnId) o.returnId = returnId;
      }
      return;
    }
    try {
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: "Orders",
          Key: { orderId },
          UpdateExpression: returnId
            ? "SET #s = :s, returnId = :rid"
            : "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: returnId
            ? { ":s": status, ":rid": returnId }
            : { ":s": status },
        })
      );
    } catch {}
    const orders = globalState.orders[userId] ?? [];
    const o = orders.find((x) => x.orderId === orderId);
    if (o) { o.status = status; if (returnId) o.returnId = returnId; }
  },

  // ── Return Requests ────────────────────────────────────────

  createReturnRequest: async (data: Omit<ReturnRequest, "returnId" | "createdAt">): Promise<ReturnRequest> => {
    const returnId = `RET-${Math.floor(10000 + Math.random() * 90000)}`;
    const record: ReturnRequest = {
      ...data,
      returnId,
      createdAt: new Date().toISOString(),
    };
    globalState.returnRequests[returnId] = record;

    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new PutCommand({ TableName: "ReturnRequests", Item: record }));
      } catch {}
    }
    return record;
  },

  getReturnRequest: async (returnId: string): Promise<ReturnRequest | null> => {
    if (!useAWS) return globalState.returnRequests[returnId] ?? null;
    try {
      const res = await ddbDocClient.send(
        new GetCommand({ TableName: "ReturnRequests", Key: { returnId } })
      );
      return (res.Item as ReturnRequest) ?? null;
    } catch {
      return globalState.returnRequests[returnId] ?? null;
    }
  },

  updateReturnRequest: async (returnId: string, updates: Partial<ReturnRequest>): Promise<void> => {
    if (globalState.returnRequests[returnId]) {
      Object.assign(globalState.returnRequests[returnId], updates);
    }
    if (!useAWS || !ddbDocClient) return;
    // Build a generic update expression from the updates object
    const exprParts: string[] = [];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, any> = {};
    Object.entries(updates).forEach(([k, v]) => {
      exprParts.push(`#${k} = :${k}`);
      exprNames[`#${k}`] = k;
      exprValues[`:${k}`] = v;
    });
    if (exprParts.length === 0) return;
    try {
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: "ReturnRequests",
          Key: { returnId },
          UpdateExpression: `SET ${exprParts.join(", ")}`,
          ExpressionAttributeNames: exprNames,
          ExpressionAttributeValues: exprValues,
        })
      );
    } catch {}
  },

  getReturnsByUser: async (userId: string): Promise<ReturnRequest[]> => {
    const all = Object.values(globalState.returnRequests).filter((r) => r.userId === userId);
    if (!useAWS) return all;
    try {
      const res = await ddbDocClient.send(
        new ScanCommand({
          TableName: "ReturnRequests",
          FilterExpression: "userId = :uid",
          ExpressionAttributeValues: { ":uid": userId },
        })
      );
      return (res.Items ?? []) as ReturnRequest[];
    } catch {
      return all;
    }
  },

  // Returns pending admin inspection at a specific dark store
  getReturnsByDarkStore: async (darkStoreId: string): Promise<ReturnRequest[]> => {
    const all = Object.values(globalState.returnRequests).filter(
      (r) => r.darkStoreId === darkStoreId && r.returnRoute === "dark_store"
    );
    if (!useAWS) return all;
    try {
      const res = await ddbDocClient.send(
        new ScanCommand({
          TableName: "ReturnRequests",
          FilterExpression: "darkStoreId = :dsid",
          ExpressionAttributeValues: { ":dsid": darkStoreId },
        })
      );
      return (res.Items ?? []) as ReturnRequest[];
    } catch {
      return all;
    }
  },

  // ── Dark Stores ────────────────────────────────────────────

  getDarkStores: (state?: "Karnataka" | "Maharashtra", activeOnly = true): DarkStore[] => {
    let stores = globalState.darkStores;
    if (activeOnly) stores = stores.filter((s) => s.isActive);
    if (state) stores = stores.filter((s) => s.state === state);
    return stores;
  },

  getDarkStoreById: (darkStoreId: string): DarkStore | null => {
    return globalState.darkStores.find((s) => s.darkStoreId === darkStoreId) ?? null;
  },

  // Haversine distance in km
  getNearestDarkStore: (userCoords: { lat: number; lng: number }): DarkStore | null => {
    const activeStores = globalState.darkStores.filter((s) => s.isActive);
    if (activeStores.length === 0) return null;
    const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) *
          Math.cos((b.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    };
    return activeStores.reduce((nearest, store) => {
      const d = haversine(userCoords, store.coords);
      const nd = haversine(userCoords, nearest.coords);
      return d < nd ? store : nearest;
    });
  },

  updateDarkStoreLoad: (darkStoreId: string, delta: number): void => {
    const store = globalState.darkStores.find((s) => s.darkStoreId === darkStoreId);
    if (store) store.currentLoad = Math.max(0, store.currentLoad + delta);
  },

  // ── Manuals + RAG ──────────────────────────────────────────

  getManualBySku: (sku: string): Manual | null => {
    const product = PRODUCT_CATALOG.find((p) => p.sku === sku);
    if (!product?.manualId) return null;
    return MANUALS_DB[product.manualId] ?? null;
  },

  getManualById: (manualId: string): Manual | null => {
    return MANUALS_DB[manualId] ?? null;
  },

  getAllManuals: (): Manual[] => Object.values(MANUALS_DB),

  /**
   * queryManualRAG — semantic search over a product's manual sections.
   * Returns the top-K most relevant section contents to include as LLM context.
   * Call this before streaming chat to inject relevant knowledge.
   */
  queryManualRAG: (sku: string, question: string, topK = 3): string[] => {
    const manual = db.getManualBySku(sku);
    if (!manual) return [];
    ensureEmbedded(manual);
    const qVec = getEmbedding(question);
    const scored = manual.sections.map((s: any) => ({
      content: `[${s.heading}] ${s.content}`,
      score: cosineSimilarity(qVec, s._vec ?? getEmbedding(`${s.heading} ${s.content}`)),
    }));
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => x.content);
  },

  // ── Marketplace Listings ───────────────────────────────────

  createListing: async (data: Omit<MarketplaceListing, "listingId" | "createdAt">): Promise<MarketplaceListing> => {
    const listingId = `LST-${Math.floor(10000 + Math.random() * 90000)}`;
    const record: MarketplaceListing = {
      ...data,
      listingId,
      createdAt: new Date().toISOString(),
    };
    globalState.marketplace.push(record);
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new PutCommand({ TableName: "MarketplaceListings", Item: record }));
      } catch {}
    }
    return record;
  },

  getListings: async (filters?: {
    listingType?: "original" | "resell";
    category?: string;
    status?: "active" | "reserved" | "sold";
  }): Promise<MarketplaceListing[]> => {
    let results = globalState.marketplace;
    if (filters?.listingType) results = results.filter((l) => l.listingType === filters.listingType);
    if (filters?.category) results = results.filter((l) => l.category === filters.category);
    if (filters?.status) results = results.filter((l) => l.status === filters.status);
    if (!useAWS) return results;
    try {
      const res = await ddbDocClient.send(new ScanCommand({ TableName: "MarketplaceListings" }));
      let items = (res.Items ?? []) as MarketplaceListing[];
      if (filters?.status) items = items.filter((l) => l.status === filters.status);
      if (filters?.listingType) items = items.filter((l) => l.listingType === filters.listingType);
      if (filters?.category) items = items.filter((l) => l.category === filters.category);
      return items;
    } catch {
      return results;
    }
  },

  reserveListing: async (listingId: string, userId: string): Promise<boolean> => {
    const listing = globalState.marketplace.find((l) => l.listingId === listingId);
    if (!listing || listing.status !== "active") return false;
    listing.status = "reserved";
    listing.reservedByUserId = userId;
    listing.reservedAt = new Date().toISOString();
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(
          new UpdateCommand({
            TableName: "MarketplaceListings",
            Key: { listingId },
            UpdateExpression: "SET #s = :s, reservedByUserId = :uid, reservedAt = :at",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": "reserved", ":uid": userId, ":at": listing.reservedAt },
          })
        );
      } catch {}
    }
    return true;
  },

  markListingSold: async (listingId: string): Promise<void> => {
    const listing = globalState.marketplace.find((l) => l.listingId === listingId);
    if (listing) listing.status = "sold";
    if (!useAWS || !ddbDocClient) return;
    try {
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: "MarketplaceListings",
          Key: { listingId },
          UpdateExpression: "SET #s = :s",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":s": "sold" },
        })
      );
    } catch {}
  },

  // ── Claims (L2 Fraud — unchanged surface, extended fields) ──

  saveClaim: async (userId: string, claim: any): Promise<any> => {
    await db.initUser(userId);
    const newClaim = {
      id: `claim-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split("T")[0],
      userId,
      ...claim,
    };
    if (!useAWS) {
      globalState.claims[userId].unshift(newClaim);
      return newClaim;
    }
    try {
      await ddbDocClient.send(new PutCommand({ TableName: "Claims", Item: newClaim }));
      return newClaim;
    } catch {
      globalState.claims[userId].unshift(newClaim);
      return newClaim;
    }
  },

  getClaims: async (userId?: string): Promise<any[]> => {
    if (!useAWS) {
      if (userId) { await db.initUser(userId); return globalState.claims[userId] ?? []; }
      return Object.values(globalState.claims).flat();
    }
    try {
      if (userId) {
        const res = await ddbDocClient.send(
          new ScanCommand({ TableName: "Claims", FilterExpression: "userId = :uid", ExpressionAttributeValues: { ":uid": userId } })
        );
        return res.Items ?? [];
      }
      const res = await ddbDocClient.send(new ScanCommand({ TableName: "Claims" }));
      return res.Items ?? [];
    } catch {
      if (userId) return globalState.claims[userId] ?? [];
      return Object.values(globalState.claims).flat();
    }
  },

  getUserReturnHistory: async (userId: string, priorCount?: number): Promise<any> => {
    await db.initUser(userId);
    const claims = await db.getClaims(userId);
    const totalCount = claims.length + (priorCount || 0);
    return {
      totalReturns30Days: totalCount,
      approvedReturns: claims.filter((c: any) => c.status === "APPROVED").length + (priorCount ? Math.floor(priorCount * 0.8) : 0),
      blockedReturns: claims.filter((c: any) => c.status === "BLOCKED").length + (priorCount ? Math.floor(priorCount * 0.2) : 0),
      history: claims,
    };
  },

  // ── Product Health Ledger (L4) ──────────────────────────────

  saveProductHealthCard: async (userId: string, report: any): Promise<any> => {
    await db.initUser(userId);
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex");
    const record = {
      id: `ph-${Math.floor(100 + Math.random() * 900)}`,
      userId,
      ...report,
      hash,
      timestamp: new Date().toISOString(),
    };
    if (!useAWS) { globalState.ledger[userId].unshift(record); return record; }
    try {
      await ddbDocClient.send(new PutCommand({ TableName: "Ledger", Item: record }));
      return record;
    } catch {
      globalState.ledger[userId].unshift(record);
      return record;
    }
  },

  getLedger: async (userId?: string): Promise<any[]> => {
    if (!useAWS) {
      if (userId) { await db.initUser(userId); return globalState.ledger[userId] ?? []; }
      return Object.values(globalState.ledger).flat();
    }
    try {
      if (userId) {
        const res = await ddbDocClient.send(
          new ScanCommand({ TableName: "Ledger", FilterExpression: "userId = :uid", ExpressionAttributeValues: { ":uid": userId } })
        );
        return res.Items ?? [];
      }
      const res = await ddbDocClient.send(new ScanCommand({ TableName: "Ledger" }));
      return res.Items ?? [];
    } catch {
      if (userId) return globalState.ledger[userId] ?? [];
      return Object.values(globalState.ledger).flat();
    }
  },

  // ── Wallet & Loyalty ────────────────────────────────────────
  // Incentive is grade-based on marketplace pre-loved purchases:
  //   Grade A → 7% cashback (≥$50 → voucher, <$50 → direct cashback)
  //   Grade B → 5% cashback (≥$50 → voucher, <$50 → direct cashback)
  //   Grade C → 3% cashback (always direct cashback)

  getWallet: async (userId: string) => {
    await db.initUser(userId);
    if (!useAWS) {
      const u = globalState.users[userId];
      return {
        cashbackBalance: u?.cashbackBalance ?? 0,
        vouchers: u?.vouchers ?? [],
        credibilityScore: u?.credibilityScore ?? 70,
        bodyMeasurements: u?.bodyMeasurements ?? {},
        activeRole: u?.activeRole ?? "buyer",
        role: u?.role ?? "buyer",
      };
    }
    try {
      const res = await ddbDocClient.send(new GetCommand({ TableName: "Users", Key: { userId } }));
      if (res.Item) {
        return {
          cashbackBalance: res.Item.cashbackBalance ?? 0,
          vouchers: res.Item.vouchers ?? [],
          credibilityScore: res.Item.credibilityScore ?? 70,
          bodyMeasurements: res.Item.bodyMeasurements ?? {},
          activeRole: res.Item.activeRole ?? "buyer",
          role: res.Item.role ?? "buyer",
        };
      }
      return { cashbackBalance: 0, vouchers: [], credibilityScore: 70, bodyMeasurements: {}, activeRole: "buyer", role: "buyer" };
    } catch {
      const u = globalState.users[userId];
      return { cashbackBalance: u?.cashbackBalance ?? 0, vouchers: u?.vouchers ?? [], credibilityScore: u?.credibilityScore ?? 70, bodyMeasurements: u?.bodyMeasurements ?? {}, activeRole: u?.activeRole ?? "buyer", role: u?.role ?? "buyer" };
    }
  },

  /**
   * addCashback — adds $ amount directly to user's cashback balance.
   */
  addCashback: async (userId: string, amount: number): Promise<number> => {
    await db.initUser(userId);
    const u = globalState.users[userId];
    u.cashbackBalance = parseFloat(((u.cashbackBalance ?? 0) + amount).toFixed(2));
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new UpdateCommand({
          TableName: "Users",
          Key: { userId },
          UpdateExpression: "SET cashbackBalance = :b",
          ExpressionAttributeValues: { ":b": u.cashbackBalance },
        }));
      } catch {}
    }
    return u.cashbackBalance;
  },

  /**
   * issueVoucher — creates a redeemable voucher for user and persists it.
   */
  issueVoucher: async (userId: string, discountAmount: number, title: string): Promise<WalletVoucher> => {
    await db.initUser(userId);
    const voucher: WalletVoucher = {
      id: `VCH-${Math.floor(10000 + Math.random() * 90000)}`,
      title,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      issuedAt: new Date().toISOString(),
      status: "active",
    };
    globalState.users[userId].vouchers = [...(globalState.users[userId].vouchers ?? []), voucher];
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new UpdateCommand({
          TableName: "Users",
          Key: { userId },
          UpdateExpression: "SET vouchers = :v",
          ExpressionAttributeValues: { ":v": globalState.users[userId].vouchers },
        }));
      } catch {}
    }
    return voucher;
  },

  /**
   * redeemVoucher — marks a voucher as redeemed and deducts its value.
   * Returns the discount amount applied, or 0 if voucher not found/already redeemed.
   */
  redeemVoucher: async (userId: string, voucherId: string): Promise<number> => {
    await db.initUser(userId);
    const u = globalState.users[userId];
    const voucher = (u.vouchers ?? []).find((v) => v.id === voucherId && v.status === "active");
    if (!voucher) return 0;
    voucher.status = "redeemed";
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new UpdateCommand({
          TableName: "Users",
          Key: { userId },
          UpdateExpression: "SET vouchers = :v",
          ExpressionAttributeValues: { ":v": u.vouchers },
        }));
      } catch {}
    }
    return voucher.discountAmount;
  },

  /**
   * spendCashback — deducts amount from cashbackBalance. Returns new balance.
   */
  spendCashback: async (userId: string, amount: number): Promise<number> => {
    await db.initUser(userId);
    const u = globalState.users[userId];
    u.cashbackBalance = parseFloat(Math.max(0, (u.cashbackBalance ?? 0) - amount).toFixed(2));
    if (useAWS && ddbDocClient) {
      try {
        await ddbDocClient.send(new UpdateCommand({
          TableName: "Users",
          Key: { userId },
          UpdateExpression: "SET cashbackBalance = :b",
          ExpressionAttributeValues: { ":b": u.cashbackBalance },
        }));
      } catch {}
    }
    return u.cashbackBalance;
  },

  // ── Sessions (L1 size bracketing) ─────────────────────────

  saveCartSession: async (sessionId: string, sessionData: any) => {
    const item = { ...globalState.sessions[sessionId], ...sessionData, updatedAt: new Date().toISOString() };
    globalState.sessions[sessionId] = item;
    if (!useAWS) return item;
    try {
      await ddbDocClient.send(new PutCommand({ TableName: "Sessions", Item: { sessionId, ...item } }));
      return item;
    } catch {
      return item;
    }
  },

  getCartSession: async (sessionId: string) => {
    if (!useAWS) return globalState.sessions[sessionId] ?? null;
    try {
      const res = await ddbDocClient.send(new GetCommand({ TableName: "Sessions", Key: { sessionId } }));
      return res.Item ?? null;
    } catch {
      return globalState.sessions[sessionId] ?? null;
    }
  },

  // ── P2P Buyer Demand ───────────────────────────────────────

  getBuyerDemand: (sku: string, returnerZip?: string) => {
    const list = globalState.buyerDemand.filter((d) => d.sku === sku && !d.reserved);
    if (list.length > 0) return list;
    const p = PRODUCT_CATALOG.find((x) => x.sku === sku);
    if (!p) return [];
    const names = ["Alice Chen", "David Kim", "Marcus Aurelius", "Sarah Connor", "Bruce Wayne", "Clark Kent", "Peter Parker"];
    let buyerZip = "560034";
    if (returnerZip) {
      const isIndian = /^\d{6}$/.test(returnerZip.trim());
      if (isIndian) {
        const numeric = parseInt(returnerZip) || 560034;
        buyerZip = String(numeric + (sku.length % 5) - 2);
      }
    }
    const generated = {
      sku: p.sku, name: p.name, buyerZip,
      nameBuyer: names[sku.length % names.length],
      distance: 5 + (sku.length % 15),
      size: p.sizes[sku.length % p.sizes.length],
      reserved: false,
    };
    globalState.buyerDemand.push(generated);
    return [generated];
  },

  reserveBuyerDemand: (sku: string, buyerZip: string): boolean => {
    const demand = globalState.buyerDemand.find((d) => d.sku === sku && d.buyerZip === buyerZip && !d.reserved);
    if (demand) { demand.reserved = true; return true; }
    return false;
  },

  // ── Vector DB (user history context for chat) ──────────────

  addVectorContext: (userId: string, text: string): void => {
    globalState.vectorDb.push({
      id: `v_${Date.now()}_${Math.random()}`,
      userId,
      text,
      vector: getEmbedding(text),
    });
  },

  queryVectorContext: (userId: string, queryText: string, limit = 3): string[] => {
    const qVec = getEmbedding(queryText);
    return globalState.vectorDb
      .filter((v) => v.userId === userId || v.userId === "system")
      .map((v) => ({ text: v.text, score: cosineSimilarity(qVec, v.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.text);
  },
};

// ─────────────────────────────────────────────────────────────
// GEMINI API WRAPPER
// ─────────────────────────────────────────────────────────────

// ── Gemini Key Pool Rotation ──
let activeKeyIndex = 0;
const exhaustedKeys = new Set<string>();
let lastErrorWasDailyQuota = false;

export function getGeminiApiKey(): string | null {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].map(k => k?.trim()).filter(Boolean) as string[];

  if (keys.length === 0) return null;

  let availableKeys = keys.filter(k => !exhaustedKeys.has(k));
  if (availableKeys.length === 0) {
    console.warn("[Gemini KeyPool] All keys marked exhausted. Clearing exhaustion blacklist for retry.");
    exhaustedKeys.clear();
    availableKeys = keys;
  }

  activeKeyIndex = activeKeyIndex % availableKeys.length;
  const selectedKey = availableKeys[activeKeyIndex];
  activeKeyIndex++;
  return selectedKey;
}

export function markGeminiKeyExhausted(key: string) {
  if (key) {
    console.warn(`[Gemini KeyPool] Key starting with "${key.substring(0, 8)}" marked exhausted.`);
    exhaustedKeys.add(key);
  }
}

export function wasGeminiDailyQuotaExhausted(): boolean {
  return lastErrorWasDailyQuota;
}

function isDailyQuotaExhausted(errorText: string): boolean {
  try {
    const errorBody = JSON.parse(errorText);
    const violations = errorBody?.error?.details?.find(
      (d: any) => d["@type"]?.includes("QuotaFailure")
    )?.violations;
    return violations?.some((v: any) => v.quotaId?.includes("PerDay")) ?? false;
  } catch (e) {
    return errorText.includes("PerDay") || errorText.includes("limit: 20") || errorText.includes("limit: 0");
  }
}

export async function queryGemini(params: {
  model?: string;
  messages: Array<{ role: string; content: any }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
  response_schema?: any;
}) {
  const model = params.model || "gemini-2.5-flash";

  const allKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].map(k => k?.trim()).filter(Boolean) as string[];

  if (allKeys.length === 0) return null;

  lastErrorWasDailyQuota = false;

  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) continue;

    try {
      // Convert OpenAI-style messages to Gemini parts format
      const systemParts: Array<any> = [];
      const userParts: Array<any> = [];

      for (const msg of params.messages) {
        const targetParts = msg.role === "system" ? systemParts : userParts;

        if (typeof msg.content === "string") {
          targetParts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const item of msg.content) {
            if (item.type === "text") {
              targetParts.push({ text: item.text });
            } else if (item.type === "image_url") {
              const url: string = (item.image_url?.url || "").trim();
              const base64Prefix = "data:";
              const base64Marker = ";base64,";
              if (url.startsWith(base64Prefix) && url.includes(base64Marker)) {
                const markerIndex = url.indexOf(base64Marker);
                const mimeType = url.substring(base64Prefix.length, markerIndex);
                const base64Data = url.substring(markerIndex + base64Marker.length);
                targetParts.push({
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data.trim()
                  }
                });
              } else if (url.startsWith("http://") || url.startsWith("https://")) {
                try {
                  const res = await fetch(url);
                  if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    const base64Data = Buffer.from(arrayBuffer).toString("base64");
                    const contentType = res.headers.get("content-type") || "image/jpeg";
                    targetParts.push({
                      inline_data: {
                        mime_type: contentType,
                        data: base64Data
                      }
                    });
                  } else {
                    console.error("Failed to fetch image url for Gemini:", url);
                  }
                } catch (e) {
                  console.error("Error fetching image url for Gemini:", e);
                }
              }
            }
          }
        }
      }

      const requestBody: Record<string, any> = {
        contents: [{ parts: userParts }],
        generationConfig: {
          temperature: params.temperature ?? 0,
          maxOutputTokens: params.max_tokens ?? 2048,
          ...(params.response_format?.type === "json_object"
            ? { responseMimeType: "application/json" }
            : {}),
          ...(params.response_schema ? { responseSchema: params.response_schema } : {}),
          ...(model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {})
        }
      };

      if (systemParts.length > 0) {
        requestBody.systemInstruction = { parts: systemParts };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (!candidate || candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
          console.warn("Gemini returned no usable content. finishReason:", candidate?.finishReason);
        }
        if (candidate?.finishReason === "MAX_TOKENS") {
          console.warn("Gemini output was truncated by maxOutputTokens.");
        }
        const text = candidate?.content?.parts?.[0]?.text || "{}";
        return {
          content: text,
          reasoning: null,
          usage: data.usageMetadata || null,
          fromMock: false
        };
      } else {
        const errText = await response.text();
        console.warn(`Gemini API error (${response.status}) on key prefix "${apiKey.substring(0, 8)}": ${errText}`);
        
        if (response.status === 429 && isDailyQuotaExhausted(errText)) {
          markGeminiKeyExhausted(apiKey);
          lastErrorWasDailyQuota = true;
          console.warn(`Gemini daily quota exhausted on key. Retrying next key (attempt ${attempt + 1}/${allKeys.length})...`);
          continue;
        } else {
          break; // Stop loop for non-quota errors
        }
      }
    } catch (e) {
      console.error(`Failed to connect to Gemini API on key prefix "${apiKey.substring(0, 8)}":`, e);
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// GROQ API WRAPPER
// ─────────────────────────────────────────────────────────────

export async function queryGroq(params: {
  model: string;
  messages: Array<{ role: string; content: any }>;
  temperature?: number;
  response_format?: { type: string };
  max_tokens?: number;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (apiKey?.trim()) {
    try {
      let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.2,
          response_format: params.response_format,
          max_tokens: params.max_tokens,
        }),
      });

      if (response.status === 400 && params.response_format?.type === "json_object") {
        try {
          const errJson = await response.clone().json().catch(() => ({}));
          if (errJson.error?.code === "json_validate_failed") {
            console.warn("[Groq] JSON validation failed, retrying without strict json_object format...");
            response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: params.model,
                messages: params.messages,
                temperature: params.temperature ?? 0.2,
                max_tokens: params.max_tokens,
              }),
            });
          }
        } catch (e) {
          // ignore parsing errors on response clone
        }
      }

      if (response.ok) {
        const data = await response.json();
        return { content: data.choices[0].message.content, usage: data.usage, fromMock: false };
      }
      const errText = await response.text();
      console.warn(`[Groq] ${response.status}: ${errText}`);
    } catch (e) {
      console.error("[Groq] Network error:", e);
    }
  }

  await new Promise((r) => setTimeout(r, 600));
  const ctx = JSON.stringify(params.messages);

  if (ctx.includes("sizing") || ctx.includes("proportion") || ctx.includes("fit")) {
    return { content: JSON.stringify({ recommendedSize: "M", confidenceScore: 94, reasoning: "Estimated shoulder width 17.5 in, chest 38 in. M is the best fit." }), fromMock: true };
  }
  if (ctx.includes("returnReasonType") || ctx.includes("classify") || ctx.includes("triage")) {
    return { content: JSON.stringify({ returnReasonType: "vibe_mismatch", confidence: 0.85, explanation: "User expressed dissatisfaction without mentioning physical damage." }), fromMock: true };
  }
  if (ctx.includes("defect") || ctx.includes("damage claim") || ctx.includes("shadows")) {
    return { content: JSON.stringify({ aiGenerationScore: 1.2, damagePlausibility: 8.8, photoStagingSigns: 0.8, defectExplanation: "Genuine impact damage consistent with shipping stress." }), fromMock: true };
  }
  if (ctx.includes("repair") || ctx.includes("troubleshoot") || ctx.includes("broken")) {
    return { content: `Based on the manual, here's what to try:\n\n**Step 1:** Check the power outlet and ensure the cable is fully seated.\n**Step 2:** Inspect the thermal fuse (see Thermal Fuse section in manual).\n**Step 3:** Run a descaling cycle if flow is slow.\n\nDoes the power LED light up at all when plugged in?`, fromMock: true };
  }
  if (ctx.includes("grade") || ctx.includes("taxonomy") || ctx.includes("returned item")) {
    return { content: JSON.stringify({ grade: "B", defects: ["Minor hairline scratches on casing"], functionalScore: 9.5, resaleCategory: "Open Box - Like New" }), fromMock: true };
  }
  return { content: "Standard simulated Groq response (mock mode).", fromMock: true };
}

// ─────────────────────────────────────────────────────────────
// IFIXIT API WRAPPER
// ─────────────────────────────────────────────────────────────

export async function fetchIFixitGuides(query: string) {
  try {
    const response = await fetch(`https://www.ifixit.com/api/2.0/guides?query=${encodeURIComponent(query)}&limit=3`);
    if (response.ok) {
      const data = await response.json();
      return data.guides.map((g: any) => ({ id: g.guideid, title: g.title, url: g.url, summary: g.summary, imageUrl: g.image?.medium || null }));
    }
  } catch {}
  const fallback: Record<string, any[]> = {
    "coffee maker": [
      { id: 101, title: "Drip Coffee Maker Heating Element Replacement", url: "https://www.ifixit.com/Guide/Drip+Coffee+Maker+Heating+Element+Replacement/10292", summary: "Replace the heating element inside your drip coffee maker." },
      { id: 102, title: "How to Descale a Coffee Machine", url: "https://www.ifixit.com/Guide/How+to+Descale+a+Coffee+Machine/11883", summary: "Descale the water pathways to clear hard mineral blockage." },
    ],
    speaker: [{ id: 201, title: "Bluetooth Speaker Battery Swap", url: "https://www.ifixit.com/Guide/Bluetooth+Speaker+Battery+Replacement/8844", summary: "Swap the lithium battery inside your portable Bluetooth speaker." }],
    default: [{ id: 99, title: "General Electronics Diagnosis Guide", url: "https://www.ifixit.com/Device/Electronics", summary: "Standard diagnostics for power and circuit board issues." }],
  };
  const norm = query.toLowerCase();
  if (norm.includes("coffee") || norm.includes("maker")) return fallback["coffee maker"];
  if (norm.includes("speaker") || norm.includes("sound")) return fallback.speaker;
  return fallback.default;
}

// ─────────────────────────────────────────────────────────────
// SHIPPO API WRAPPER
// ─────────────────────────────────────────────────────────────

export async function createShippoLabel(params: { fromAddress: any; toAddress: any; parcel: any }) {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (apiKey?.trim() && !apiKey.includes("placeholder")) {
    try {
      const response = await fetch("https://api.goshippo.com/shipments/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `ShippoToken ${apiKey}` },
        body: JSON.stringify({ address_from: params.fromAddress, address_to: params.toAddress, parcels: [params.parcel], async: false }),
      });
      if (response.ok) {
        const data = await response.json();
        const transaction = data.rates[0];
        return { trackingNumber: `SHP${Math.floor(1000000000 + Math.random() * 9000000000)}`, shippingCost: transaction.amount, currency: transaction.currency, labelUrl: "https://shippo-delivery-east-2.s3.amazonaws.com/label_placeholder.png", carrier: transaction.provider, fromMock: false };
      }
    } catch {}
  }
  await new Promise((r) => setTimeout(r, 800));
  return { trackingNumber: `USPS-P2P-${Math.floor(10000000 + Math.random() * 90000000)}`, shippingCost: "3.48", currency: "USD", labelUrl: "MOCK_LABEL_SVG", carrier: "USPS Direct P2P Network", fromMock: true };
}
