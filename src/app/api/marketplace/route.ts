import { NextRequest, NextResponse } from "next/server";
import { PRODUCT_CATALOG } from "@/lib/catalog";

// Seed random number generator
function pseudoRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "guest";
    const zipCode = searchParams.get("zipCode") || "98101";

    // Use the zipCode and current date to seed the marketplace feed
    // so it rotates daily but stays consistent for the same area
    const seedBase = parseInt(zipCode) + new Date().getDate();

    // Select 12 items pseudo-randomly from the full catalog of 150 items
    const feedItems = [];
    const numItems = 12;

    for (let i = 0; i < numItems; i++) {
      const pIndex = Math.floor(pseudoRandom(seedBase + i) * PRODUCT_CATALOG.length);
      const product = PRODUCT_CATALOG[pIndex];

      // Simulate a seller returning the item
      const sellerScoreNoise = (pseudoRandom(seedBase + i * 2) * 40) - 20; // -20 to +20
      let sellerTrust = Math.round(product.baseTrustScore + sellerScoreNoise);
      if (sellerTrust > 98) sellerTrust = 98;
      if (sellerTrust < 30) sellerTrust = 25 + Math.floor(pseudoRandom(seedBase + i * 3) * 10); // Floor at ~25-35

      // Assign a simulated condition grade (only A or B allowed for resale)
      const randGrade = pseudoRandom(seedBase + i * 4);
      let grade = "A";
      if (randGrade > 0.5) grade = "B";

      // Discount price based on grade
      let priceMult = 0.8; // Grade A
      if (grade === "B") priceMult = 0.65;

      const discountedPrice = Number((product.price * priceMult).toFixed(2));

      // Simulate distance within 100km radius
      const distance = Math.max(1, Math.floor(pseudoRandom(seedBase + i * 5) * 100)); // 1 to 100km

      feedItems.push({
        sku: product.sku,
        name: product.name,
        originalPrice: product.price,
        price: discountedPrice,
        grade,
        trust: sellerTrust,
        distance: `${distance} km`,
        category: product.category,
        brand: product.brand,
        co2Saved: Number((product.weight * 4.8).toFixed(1)) // 4.8kg CO2 saved per kg of product
      });
    }

    // Sort by distance
    feedItems.sort((a, b) => parseInt(a.distance) - parseInt(b.distance));

    return NextResponse.json({ items: feedItems });
  } catch (error: any) {
    console.error("Marketplace API Route Error:", error);
    return NextResponse.json({ error: "Failed to fetch marketplace feed" }, { status: 500 });
  }
}
