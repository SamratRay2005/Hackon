import { NextRequest, NextResponse } from "next/server";
import { createShippoLabel, db } from "@/lib/services";

// Zipcode coordinates database for instant geocoding matching (100% Free / Local lookup fallback)
const ZIP_COORDS: Record<string, { lat: number; lng: number; city: string; state: string }> = {
  "98101": { lat: 47.6085, lng: -122.3295, city: "Seattle", state: "WA" },
  "98004": { lat: 47.6101, lng: -122.2015, city: "Bellevue", state: "WA" },
  "98105": { lat: 47.6614, lng: -122.3131, city: "Seattle (U-District)", state: "WA" },
  "98122": { lat: 47.6120, lng: -122.3080, city: "Seattle (Capitol Hill)", state: "WA" },
  "90001": { lat: 33.9740, lng: -118.2490, city: "Los Angeles", state: "CA" },
  "90210": { lat: 34.0736, lng: -118.4004, city: "Beverly Hills", state: "CA" },
  "10001": { lat: 40.7501, lng: -73.9996, city: "New York", state: "NY" },
  "10011": { lat: 40.7416, lng: -74.0043, city: "New York (Chelsea)", state: "NY" },
  "40201": { lat: 38.2527, lng: -85.7585, city: "Louisville (Central Warehouse)", state: "KY" }
};

// Live Nominatim geocoding client
async function geocodeZipcode(zip: string): Promise<{ lat: number; lng: number; city: string; state: string } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=US&format=json`, {
      headers: {
        "User-Agent": "IntelligentReturnsBridge/1.0"
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const place = data[0];
        const names = place.display_name.split(",");
        const city = names[0]?.trim() || "City";
        const state = names.length > 2 ? names[2]?.trim() : "US";
        return {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          city,
          state
        };
      }
    }
  } catch (e) {
    console.error("Nominatim geocoding request failed:", e);
  }
  return null;
}

// Haversine formula to compute distance in kilometers
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export async function POST(req: NextRequest) {
  try {
    const { sku, returnerZip, buyerZip } = await req.json();

    if (!sku || !returnerZip) {
      return NextResponse.json({ error: "Missing SKU or returner zipcode" }, { status: 400 });
    }

    // 1. Resolve coordinates (Live query -> dictionary fallback -> randomized fallback)
    let returnerCoords = await geocodeZipcode(returnerZip);
    if (!returnerCoords) {
      returnerCoords = ZIP_COORDS[returnerZip] || { 
        lat: 47.6085 + (Math.random() - 0.5) * 0.1, 
        lng: -122.3295 + (Math.random() - 0.5) * 0.1, 
        city: "Circular Origin", 
        state: "US" 
      };
    }

    // 2. Select circular buyer match Zipcode
    const matchedBuyers = db.getBuyerDemand(sku);
    let targetBuyer = matchedBuyers[0];
    let selectedBuyerZip = buyerZip || (targetBuyer ? targetBuyer.buyerZip : "98004");
    
    let buyerCoords = await geocodeZipcode(selectedBuyerZip);
    if (!buyerCoords) {
      buyerCoords = ZIP_COORDS[selectedBuyerZip] || {
        lat: returnerCoords.lat + (Math.random() - 0.5) * 0.15,
        lng: returnerCoords.lng + (Math.random() - 0.5) * 0.15,
        city: "Circular Destination",
        state: "US"
      };
    }

    const warehouseCoords = ZIP_COORDS["40201"]; // Louisville Central Warehouse

    const displayOrigin = `${returnerCoords.city}, ${returnerCoords.state}`;
    const displayDest = `${buyerCoords.city}, ${buyerCoords.state}`;

    // 3. Compute dynamic travel distances using coordinates
    const p2pDistKm = calculateHaversineDistance(returnerCoords.lat, returnerCoords.lng, buyerCoords.lat, buyerCoords.lng);
    const warehouseDistKm = calculateHaversineDistance(returnerCoords.lat, returnerCoords.lng, warehouseCoords.lat, warehouseCoords.lng);

    // Carbon emissions metrics:
    // Ground shipping: 0.12g CO2 per km per kg
    // Air/Standard Logistics: 0.45g CO2 per km per kg
    // Assume average item weight of 2kg
    const weightKg = 2.0;
    const p2pCO2 = Math.round(p2pDistKm * 0.12 * weightKg * 10) / 10;
    const warehouseCO2 = Math.round(warehouseDistKm * 0.45 * weightKg * 10) / 10;
    const co2Saved = Math.round((warehouseCO2 - p2pCO2) * 10) / 10;

    // Cost metrics
    const p2pCost = 3.48; // flat local courier rate
    const warehouseCost = Math.max(7.50, Math.round(warehouseDistKm * 0.005 * 100) / 100); 
    const costSaved = Math.round((warehouseCost - p2pCost) * 100) / 100;

    const p2pTime = p2pDistKm < 100 ? "1 Day (Direct Local)" : `${Math.ceil(p2pDistKm / 400)} Days (Courier)`;
    const warehouseTime = "5-7 Days (Cross-docking Hub)";

    // 4. Generate shipping label via Shippo Sandbox API
    const labelData = await createShippoLabel({
      fromAddress: {
        name: "Returns Customer",
        street1: "100 Pine St",
        city: returnerCoords.city,
        state: returnerCoords.state,
        zip: returnerZip,
        country: "US"
      },
      toAddress: {
        name: targetBuyer ? targetBuyer.nameBuyer : "Circular Economy Hub",
        street1: "450 Main St",
        city: buyerCoords.city,
        state: buyerCoords.state,
        zip: selectedBuyerZip,
        country: "US"
      },
      parcel: {
        length: "10",
        width: "6",
        height: "4",
        distance_unit: "in",
        weight: "2",
        mass_unit: "lb"
      }
    });

    return NextResponse.json({
      success: true,
      p2pRoute: {
        origin: { zip: returnerZip, coords: [returnerCoords.lat, returnerCoords.lng], label: displayOrigin },
        destination: { zip: selectedBuyerZip, coords: [buyerCoords.lat, buyerCoords.lng], label: displayDest },
        distance: `${p2pDistKm} km`,
        co2: `${p2pCO2} kg`,
        cost: `$${p2pCost.toFixed(2)}`,
        time: p2pTime,
        buyerName: targetBuyer ? targetBuyer.nameBuyer : "Local Circular Buyer"
      },
      warehouseRoute: {
        origin: { zip: returnerZip, coords: [returnerCoords.lat, returnerCoords.lng], label: displayOrigin },
        destination: { zip: "40201", coords: [warehouseCoords.lat, warehouseCoords.lng], label: "Louisville Central Warehouse (Hub)" },
        distance: `${warehouseDistKm} km`,
        co2: `${warehouseCO2} kg`,
        cost: `$${warehouseCost.toFixed(2)}`,
        time: warehouseTime
      },
      savings: {
        co2: `${co2Saved} kg`,
        cost: `$${costSaved.toFixed(2)}`
      },
      label: labelData
    });
  } catch (error: any) {
    console.error("Logistics Core API Route Error:", error);
    return NextResponse.json({ error: "Failed to optimize circular routes" }, { status: 500 });
  }
}
