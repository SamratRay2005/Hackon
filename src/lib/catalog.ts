// E-Commerce Product Catalog Database - 150 Items spanning Apparel, Footwear, Electronics, and Home
export interface Product {
  sku: string;
  name: string;
  price: number;
  sizes: string[];
  category: "Apparel" | "Footwear" | "Electronics" | "Home & Kitchen" | "Recreation & Lifestyle" | "Other";
  brand: string;
  description: string;
  returnWindowDays: number;
  weight: number;
  reviewScore: number;
  reviewCount: number;
  colors: string[];
  features: string[];
  baseTrustScore: number;
}

const RAW_PRODUCT_CATALOG = [
  // --- APPAREL (Sizes: S, M, L, XL) ---
  { sku: "DENIM-JKT-001", name: "Classic Denim Jacket", price: 120.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "SLIM-FIT-TEE", name: "Eco-Cotton Tee", price: 40.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "HOODIE-ORG-01", name: "Organic Cotton Pullover Hoodie", price: 75.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "FLANNEL-RED-02", name: "Classic Red Buffalo Check Flannel", price: 55.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "CARGO-PNT-03", name: "Ripstop Adventure Cargo Pants", price: 85.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "SWEATER-KNT-04", name: "Merino Wool Crewneck Sweater", price: 110.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "CHINO-PNT-05", name: "Slim Fit Stretch Chinos", price: 65.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "PARKA-WTR-06", name: "All-Weather Down Winter Parka", price: 245.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "SHORTS-ATH-07", name: "Pro-Dry Athletic Training Shorts", price: 35.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "BLAZER-SLM-08", name: "Modern Tailored Navy Blazer", price: 185.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "DRESS-SMT-09", name: "Summer Floral Linen Sundress", price: 95.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "JOGGER-FLC-10", name: "Ultra-Soft Brushed Fleece Joggers", price: 50.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "SKIRT-PLD-11", name: "High-Waisted Pleated Plaid Skirt", price: 45.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "CARDIGAN-12", name: "Cozy Oversized Button Cardigan", price: 80.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "POLO-CLS-13", name: "Pima Cotton Pique Classic Polo", price: 58.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "WIND-BRK-14", name: "Packable Water-Resistant Windbreaker", price: 70.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "VEST-DWN-15", name: "Lightweight Packable Down Vest", price: 95.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "SLEEP-SET-16", name: "Modal Long Sleeve Pajama Set", price: 65.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "TRENCH-COAT-17", name: "Double-Breasted Classic Trench Coat", price: 195.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "ACTIVE-TEE-18", name: "Seamless Breathable Running Tee", price: 38.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "LEGGING-SST-19", name: "High-Rise Butter-Soft Yoga Leggings", price: 60.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "DENIM-JEAN-20", name: "Straight Leg Comfort-Stretch Jeans", price: 88.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "LINEN-SHIRT-21", name: "Relaxed Fit Casual Linen Shirt", price: 62.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "BOMBER-JKT-22", name: "Nylon Flight Bomber Jacket", price: 115.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "BEACH-SHRT-23", name: "Hawaiian Tropical Print Surf Shirt", price: 48.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "OVERALLS-24", name: "Classic Cotton Denim Overalls", price: 98.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "TURTLE-NK-25", name: "Fine Knit Mock Turtleneck Sweater", price: 70.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "RAIN-COAT-26", name: "Hooded Waterproof Storm Raincoat", price: 130.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "TRACK-SUIT-27", name: "Vintage Tricot Athletic Track Jacket", price: 75.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "WORK-SHRT-28", name: "Heavyweight Cotton Canvas Utility Shirt", price: 68.00, sizes: ["S", "M", "L", "XL"] },

  // --- FOOTWEAR (Sizes: 7, 8, 9, 10, 11, 12) ---
  { sku: "RUN-SHOE-30", name: "Aero-Foam Max Running Shoes", price: 135.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "SNEAK-LE-31", name: "Classic White Leather Court Sneakers", price: 95.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "BOOT-WTR-32", name: "Waterproof Leather Hiking Boots", price: 165.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "SANDAL-SL-33", name: "Ergonomic Cork Slide Sandals", price: 78.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "LOAFER-SU-34", name: "Classic Suede Penny Loafers", price: 125.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "CHELSEA-35", name: "Italian Suede Chelsea Boots", price: 190.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "TRAINER-X-36", name: "Cross-Training Gym Footwear", price: 110.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "SLIP-ON-37", name: "Casual Knit Canvas Slip-On Shoes", price: 55.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "OXFORD-LE-38", name: "Formal Full-Grain Leather Oxford Dress Shoes", price: 210.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "SLIPPER-SH-39", name: "Shearling-Lined Cozy House Slippers", price: 68.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "TRAIL-RUN-40", name: "All-Terrain Rugged Trail Running Shoes", price: 140.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "SNOW-BOOT-41", name: "Insulated Thermal Winter Snow Boots", price: 180.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "BOAT-SHOE-42", name: "Classic Leather 2-Eye Boat Shoes", price: 88.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "BROGUE-LE-43", name: "Wingtip Leather Brogue Shoes", price: 175.00, sizes: ["7", "8", "9", "10", "11", "12"] },
  { sku: "ESPADRIL-44", name: "Braided Jute Sole Canvas Espadrilles", price: 48.00, sizes: ["7", "8", "9", "10", "11", "12"] },

  // --- ELECTRONICS (Sizes: Standard) ---
  { sku: "CF-Mkr-99", name: "Smart Drip Coffee Maker", price: 89.00, sizes: ["Standard"] },
  { sku: "SPK-AIR-12", name: "HiFi Wireless Speaker", price: 150.00, sizes: ["Standard"] },
  { sku: "EAR-BUDS-50", name: "Active Noise-Cancelling Wireless Earbuds", price: 129.00, sizes: ["Standard"] },
  { sku: "HEADPHN-51", name: "Over-Ear Studio Reference Headphones", price: 199.00, sizes: ["Standard"] },
  { sku: "KB-MECH-52", name: "RGB Mechanical Gaming Keyboard (Brown Switches)", price: 95.00, sizes: ["Standard"] },
  { sku: "MOUSE-WL-53", name: "Ergonomic Multi-Device Wireless Mouse", price: 65.00, sizes: ["Standard"] },
  { sku: "MONITOR-54", name: "27-inch 4K UHD IPS Designer Monitor", price: 349.00, sizes: ["Standard"] },
  { sku: "PWR-BANK-55", name: "20,000mAh Ultra-Fast Power Bank Charger", price: 45.00, sizes: ["Standard"] },
  { sku: "CHRG-PAD-56", name: "3-in-1 Magnetic Wireless Charging Station", price: 59.00, sizes: ["Standard"] },
  { sku: "USB-HUB-57", name: "7-Port Aluminum USB-C Hub Adapter", price: 38.00, sizes: ["Standard"] },
  { sku: "MIC-USB-58", name: "Cardioid Condenser USB Broadcast Microphone", price: 85.00, sizes: ["Standard"] },
  { sku: "WEBCAM-HD-59", name: "1080p Auto-Focus Streaming Webcam", price: 75.00, sizes: ["Standard"] },
  { sku: "HDD-PORT-60", name: "2TB Rugged Portable External Hard Drive", price: 89.00, sizes: ["Standard"] },
  { sku: "SSD-M2-61", name: "1TB NVMe PCIe Gen4 High-Speed Internal SSD", price: 110.00, sizes: ["Standard"] },
  { sku: "CBL-USBC-62", name: "Braided 10ft Power Delivery USB-C Cable (2-Pack)", price: 18.00, sizes: ["Standard"] },
  { sku: "ROUTER-63", name: "Wi-Fi 6 Dual-Band Smart Gigabit Router", price: 120.00, sizes: ["Standard"] },
  { sku: "TABLET-64", name: "10.1-inch IPS Android Entertainment Tablet", price: 169.00, sizes: ["Standard"] },
  { sku: "E-READER-65", name: "6-inch Glare-Free Paperwhite E-Reader", price: 119.00, sizes: ["Standard"] },
  { sku: "SPK-BT-66", name: "Waterproof Outdoor Bluetooth Speaker", price: 49.00, sizes: ["Standard"] },
  { sku: "SOUND-BAR-67", name: "2.1 Channel Home Theater Audio Soundbar", price: 135.00, sizes: ["Standard"] },
  { sku: "TV-STCK-68", name: "4K HDR Smart Streaming Media Stick", price: 40.00, sizes: ["Standard"] },
  { sku: "FIT-BAND-69", name: "Smart Fitness Activity Tracker Watch", price: 79.00, sizes: ["Standard"] },

  // --- HOME & KITCHEN (Sizes: Standard) ---
  { sku: "BLENDER-80", name: "High-Speed Professional Kitchen Blender", price: 149.00, sizes: ["Standard"] },
  { sku: "TOASTER-81", name: "4-Slice Brushed Stainless Steel Toaster", price: 59.00, sizes: ["Standard"] },
  { sku: "KETTLE-82", name: "Gooseneck Electric Temperature Control Kettle", price: 79.00, sizes: ["Standard"] },
  { sku: "MUG-SET-83", name: "Double-Walled Borosilicate Glass Coffee Mugs (4-Piece)", price: 32.00, sizes: ["Standard"] },
  { sku: "SKILLET-84", name: "12-inch Pre-Seasoned Cast Iron Skillet", price: 45.00, sizes: ["Standard"] },
  { sku: "KNIFE-SET-85", name: "German Steel Kitchen Knife Block Set (15-Piece)", price: 189.00, sizes: ["Standard"] },
  { sku: "PAN-NONSTK-86", name: "Hard-Anodized Ceramic Non-Stick Fry Pan", price: 38.00, sizes: ["Standard"] },
  { sku: "COOK-SET-87", name: "Stainless Steel Premium Cookware Set (10-Piece)", price: 299.00, sizes: ["Standard"] },
  { sku: "AIR-FRYER-88", name: "6-Quart Digital Oil-Free Air Fryer", price: 110.00, sizes: ["Standard"] },
  { sku: "JUICER-89", name: "Cold-Press Slow Masticating Juicer", price: 135.00, sizes: ["Standard"] },
  { sku: "SCALE-KIT-90", name: "Digital Precision Food Kitchen Scale", price: 19.00, sizes: ["Standard"] },
  { sku: "OVEN-TOAST-91", name: "Convection Countertop Toaster Oven", price: 159.00, sizes: ["Standard"] },
  { sku: "GRNDR-COF-92", name: "Conical Burr Precision Coffee Grinder", price: 99.00, sizes: ["Standard"] },
  { sku: "PRESS-FRN-93", name: "Stainless Steel Thermal French Press Coffee Maker", price: 48.00, sizes: ["Standard"] },
  { sku: "SLOW-COOK-94", name: "8-Quart Programmable Slow Cooker Crockpot", price: 65.00, sizes: ["Standard"] },
  { sku: "MIXER-STND-95", name: "Tilt-Head Professional 5-Quart Stand Mixer", price: 329.00, sizes: ["Standard"] },
  { sku: "POT-INST-96", name: "7-in-1 Digital Electric Pressure Cooker Multi-Pot", price: 89.00, sizes: ["Standard"] },
  { sku: "WAFFLE-97", name: "Double Belgian Rotating Waffle Iron", price: 54.00, sizes: ["Standard"] },
  { sku: "CONTAINR-98", name: "Airtight Food Storage Pantry Containers (12-Piece)", price: 39.00, sizes: ["Standard"] },
  { sku: "SPICE-RACK-99", name: "Revolving Spice Tower Organizer (20 Pre-Filled Jars)", price: 45.00, sizes: ["Standard"] },
  { sku: "HUMID-100", name: "Ultrasonic Cool Mist Whole Room Humidifier", price: 49.00, sizes: ["Standard"] },
  { sku: "PURIFY-101", name: "True HEPA Air Purifier for Large Rooms", price: 139.00, sizes: ["Standard"] },
  { sku: "VACUUM-102", name: "Cordless Stick Vacuum Cleaner (High Suction)", price: 219.00, sizes: ["Standard"] },
  { sku: "ROBO-VAC-103", name: "Smart Mapping Robot Vacuum Cleaner", price: 279.00, sizes: ["Standard"] },
  { sku: "IRON-STM-104", name: "Professional Anti-Drip Ceramic Steam Iron", price: 35.00, sizes: ["Standard"] },
  { sku: "STEAMER-105", name: "Handheld Fabric Garment Steamer", price: 29.00, sizes: ["Standard"] },
  { sku: "FAN-TWR-106", name: "Oscillating Quiet Cooling Tower Fan", price: 65.00, sizes: ["Standard"] },
  { sku: "HEAT-PORT-107", name: "Ceramic Oscillating Space Heater with Remote", price: 58.00, sizes: ["Standard"] },
  { sku: "DIFFUSE-108", name: "Ultrasonic Essential Oil Aromatherapy Diffuser", price: 28.00, sizes: ["Standard"] },
  { sku: "LBL-MAKER-109", name: "Handheld Wireless Thermal Label Maker", price: 35.00, sizes: ["Standard"] },

  // --- RECREATION, OUTDOOR & LIFESTYLE (Sizes: Standard / Sizes) ---
  { sku: "MAT-YOGA-120", name: "Eco-Friendly Non-Slip Yoga Mat (6mm)", price: 39.00, sizes: ["Standard"] },
  { sku: "BOTTLE-121", name: "Double-Walled Vacuum Insulated Water Bottle (32oz)", price: 28.00, sizes: ["Standard"] },
  { sku: "DUMBBELL-122", name: "Adjustable Dial Dumbbells Set (5-52.5 lbs Pair)", price: 299.00, sizes: ["Standard"] },
  { sku: "BAND-RES-123", name: "Latex Resistance Loop Fitness Bands (5-Pack)", price: 15.00, sizes: ["Standard"] },
  { sku: "BACKPACK-124", name: "Water-Resistant Anti-Theft Travel Backpack", price: 59.00, sizes: ["Standard"] },
  { sku: "TENT-OUT-125", name: "4-Person Instant Dome Camping Tent", price: 110.00, sizes: ["Standard"] },
  { sku: "BAG-SLP-126", name: "3-Season Lightweight Sleeping Bag", price: 45.00, sizes: ["Standard"] },
  { sku: "CAMP-CHAIR-127", name: "Folding Padded Quad Camping Chair", price: 32.00, sizes: ["Standard"] },
  { sku: "GRILL-PORT-128", name: "Portable Cast Iron Tabletop Charcoal Grill", price: 79.00, sizes: ["Standard"] },
  { sku: "MATTRESS-129", name: "Self-Inflating Comfort Camping Mattress Pad", price: 49.00, sizes: ["Standard"] },
  { sku: "COOLER-130", name: "Heavy-Duty Rotomolded Ice Chest Cooler (45-Quart)", price: 179.00, sizes: ["Standard"] },
  { sku: "HEADLAMP-131", name: "Super-Bright Rechargeable Waterproof Headlamp", price: 24.00, sizes: ["Standard"] },
  { sku: "TRACK-POLE-132", name: "Aluminum Shock-Absorbing Trekking Poles (Pair)", price: 38.00, sizes: ["Standard"] },
  { sku: "HELMET-BIK-133", name: "Adjustable Dial Mountain Bike Helmet", price: 49.00, sizes: ["Standard"] },
  { sku: "LOCK-U-BIK-134", name: "Heavy-Duty Steel U-Lock Bike Shackle", price: 32.00, sizes: ["Standard"] },
  { sku: "PUMP-TIRE-135", name: "High-Pressure Dual-Valve Bicycle Floor Pump", price: 29.00, sizes: ["Standard"] },
  { sku: "Hammock-136", name: "Double Nylon Camping Tree Hammock", price: 28.00, sizes: ["Standard"] },
  { sku: "BINOCULR-137", name: "10x42 Waterproof High-Definition Binoculars", price: 95.00, sizes: ["Standard"] },
  { sku: "COMPASS-138", name: "Military Sighting Navigation Compass", price: 19.00, sizes: ["Standard"] },
  { sku: "LANT-LED-139", name: "Collapsible LED Camping Lanterns (4-Pack)", price: 22.00, sizes: ["Standard"] },
  { sku: "UMBRELLA-140", name: "Reinforced Windproof Travel Rain Umbrella", price: 20.00, sizes: ["Standard"] },
  { sku: "BAG-DUFF-141", name: "60L Heavy-Duty Tarpaulin Duffel Bag", price: 75.00, sizes: ["Standard"] },
  { sku: "SKATE-BRD-142", name: "Complete Canadian Maple Wood Skateboard", price: 69.00, sizes: ["Standard"] },
  { sku: "SCOOTER-143", name: "Folding Aluminum Commuter Kick Scooter", price: 89.00, sizes: ["Standard"] },
  { sku: "FIT-GLVS-144", name: "Padded Gym Weightlifting Cross-Training Gloves", price: 18.00, sizes: ["S", "M", "L", "XL"] },
  { sku: "SWIM-GOGL-145", name: "Anti-Fog UV Protection Swimming Goggles", price: 22.00, sizes: ["Standard"] },
  { sku: "BIKE-BAG-146", name: "Waterproof Bicycle Saddle Seat Bag", price: 19.00, sizes: ["Standard"] },
  { sku: "STRAP-YOG-147", name: "Cotton Yoga Stretching Fitness Strap", price: 12.00, sizes: ["Standard"] },
  { sku: "ROPE-JMP-148", name: "Adjustable Speed Ball-Bearing Jump Rope", price: 15.00, sizes: ["Standard"] },
  { sku: "MASSAGE-149", name: "Deep Tissue Percussion Muscle Massage Gun", price: 99.00, sizes: ["Standard"] }
];

// Dynamically augment the flat catalog into a rich Amazon-like schema
export const PRODUCT_CATALOG: Product[] = RAW_PRODUCT_CATALOG.map((raw) => {
  let category: Product["category"] = "Other";
  let brand = "Generic";
  let description = `Premium quality ${raw.name.toLowerCase()} designed for everyday use.`;
  let returnWindowDays = 30;
  let weight = 1.0;

  const sku = raw.sku.toUpperCase();
  if (sku.includes("DENIM") || sku.includes("TEE") || sku.includes("HOODIE") || sku.includes("FLANNEL") || sku.includes("PNT") || sku.includes("SWEATER") || sku.includes("PARKA") || sku.includes("SHORTS") || sku.includes("BLAZER") || sku.includes("DRESS") || sku.includes("JOGGER") || sku.includes("SKIRT") || sku.includes("CARDIGAN") || sku.includes("POLO") || sku.includes("VEST") || sku.includes("TRENCH") || sku.includes("JEAN") || sku.includes("SHIRT") || sku.includes("OVERALLS") || sku.includes("GLVS")) {
    category = "Apparel";
    brand = "Vantage Threads";
    weight = 0.4;
    description = `Stay stylish and comfortable with our ${raw.name}. Made with premium sustainable fabrics.`;
  } else if (sku.includes("SHOE") || sku.includes("SNEAK") || sku.includes("BOOT") || sku.includes("SANDAL") || sku.includes("LOAFER") || sku.includes("CHELSEA") || sku.includes("TRAINER") || sku.includes("SLIP-ON") || sku.includes("OXFORD") || sku.includes("SLIPPER") || sku.includes("BROGUE") || sku.includes("ESPADRIL")) {
    category = "Footwear";
    brand = "Stride Dynamics";
    weight = 1.2;
    description = `Step into comfort with the ${raw.name}. Ergonomic support and durable materials for all-day wear.`;
  } else if (sku.includes("CF-MKR") || sku.includes("SPK-AIR") || sku.includes("BUDS") || sku.includes("HEADPHN") || sku.includes("KB-") || sku.includes("MOUSE") || sku.includes("MONITOR") || sku.includes("PWR-") || sku.includes("CHRG-") || sku.includes("HUB") || sku.includes("MIC") || sku.includes("WEBCAM") || sku.includes("HDD") || sku.includes("SSD") || sku.includes("CBL") || sku.includes("ROUTER") || sku.includes("TABLET") || sku.includes("E-READER") || sku.includes("SOUND-BAR") || sku.includes("TV-") || sku.includes("BAND")) {
    category = "Electronics";
    brand = "TechNova";
    weight = sku.includes("MONITOR") || sku.includes("TV") ? 8.5 : 0.8;
    returnWindowDays = 15; // Shorter return window for electronics
    description = `Experience cutting-edge technology with the ${raw.name}. Reliable, fast, and engineered for high performance.`;
  } else if (sku.includes("BLENDER") || sku.includes("TOASTER") || sku.includes("KETTLE") || sku.includes("MUG") || sku.includes("SKILLET") || sku.includes("KNIFE") || sku.includes("PAN") || sku.includes("COOK") || sku.includes("FRYER") || sku.includes("JUICER") || sku.includes("SCALE") || sku.includes("OVEN") || sku.includes("GRNDR") || sku.includes("SLOW") || sku.includes("MIXER") || sku.includes("POT") || sku.includes("WAFFLE") || sku.includes("CONTAINR") || sku.includes("SPICE") || sku.includes("HUMID") || sku.includes("PURIFY") || sku.includes("VACUUM") || sku.includes("ROBO") || sku.includes("IRON") || sku.includes("STEAMER") || sku.includes("FAN") || sku.includes("HEAT") || sku.includes("DIFFUSE") || sku.includes("LBL")) {
    category = "Home & Kitchen";
    brand = "Culinary Crate";
    weight = 3.5;
    description = `Elevate your home with the ${raw.name}. Built for durability and everyday convenience.`;
  } else {
    category = "Recreation & Lifestyle";
    brand = "Outdoor Ascent";
    weight = 2.0;
  }

  // Deterministic pseudo-random review generation based on SKU string
  const hash = sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const reviewScore = 3.5 + ((hash % 15) / 10); // Between 3.5 and 4.9
  const reviewCount = 12 + (hash % 500);

  // Generate colors and features based on category
  let colors = ["Black", "White", "Grey"];
  let features = ["Premium Materials", "Eco-Friendly Packaging", "1-Year Warranty"];
  
  if (category === "Apparel" || category === "Footwear") {
    colors = ["Navy", "Olive", "Black", "Charcoal", "Burgundy"].slice(0, 2 + (hash % 3));
    features = ["Machine Washable", "Breathable Fabric", "Sustainable Cotton", "Wrinkle Resistant"];
  } else if (category === "Electronics") {
    colors = ["Matte Black", "Space Grey", "Silver"];
    features = ["Fast Charging", "Bluetooth 5.0", "Energy Star Certified", "Smart Home Compatible"];
  } else if (category === "Home & Kitchen") {
    colors = ["Stainless Steel", "Matte White", "Charcoal"];
    features = ["Dishwasher Safe", "BPA Free", "Durable Construction"];
  }

  const baseTrustScore = 80 + (hash % 20); // 80 - 99

  return {
    ...raw,
    category,
    brand,
    description,
    returnWindowDays,
    weight,
    reviewScore: Number(reviewScore.toFixed(1)),
    reviewCount,
    colors,
    features,
    baseTrustScore
  };
});
