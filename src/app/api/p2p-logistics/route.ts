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
    const isIndian = /^\d{6}$/.test(zip.trim());
    const countryParam = isIndian ? "IN" : "US";
    const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=${countryParam}&format=json`, {
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
        const state = names.length > 2 ? names[2]?.trim() : (isIndian ? "MH" : "US");
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
    const isIndian = /^\d{6}$/.test(returnerZip.trim());
    let returnerCoords = await geocodeZipcode(returnerZip);
    if (!returnerCoords) {
      returnerCoords = ZIP_COORDS[returnerZip] || (isIndian ? { 
        lat: 18.5204 + (Math.random() - 0.5) * 0.1, 
        lng: 73.8567 + (Math.random() - 0.5) * 0.1, 
        city: "Pune", 
        state: "MH" 
      } : { 
        lat: 47.6085 + (Math.random() - 0.5) * 0.1, 
        lng: -122.3295 + (Math.random() - 0.5) * 0.1, 
        city: "Circular Origin", 
        state: "US" 
      });
    }

    // 2. Select circular buyer match Zipcode
    const matchedBuyers = db.getBuyerDemand(sku, returnerZip);
    let targetBuyer = matchedBuyers[0];
    let selectedBuyerZip = buyerZip || (targetBuyer ? targetBuyer.buyerZip : (isIndian ? "411032" : "98004"));
    
    let buyerCoords = await geocodeZipcode(selectedBuyerZip);
    if (!buyerCoords) {
      buyerCoords = ZIP_COORDS[selectedBuyerZip] || {
        lat: returnerCoords.lat + (Math.random() - 0.5) * 0.05,
        lng: returnerCoords.lng + (Math.random() - 0.5) * 0.05,
        city: isIndian ? "Pune (Local Buyer)" : "Circular Destination",
        state: isIndian ? "MH" : "US"
      };
    }

    // Real Amazon FC Coordinates
    const AMAZON_FCS = isIndian ? [
      { id: "BOM4", lat: 19.2183, lng: 73.1628, city: "Bhiwandi (Mumbai FC)", state: "MH", zip: "421302" },
      { id: "DEL1", lat: 28.3840, lng: 76.9405, city: "Gurugram (Delhi FC)", state: "HR", zip: "122413" },
      { id: "BLR1", lat: 12.8399, lng: 77.6770, city: "Electronic City (Bangalore FC)", state: "KA", zip: "560100" },
      { id: "PNQ2", lat: 18.7300, lng: 73.6700, city: "Chakan (Pune FC)", state: "MH", zip: "410501" }
    ] : [
      { id: "SDF8", lat: 38.2527, lng: -85.7585, city: "Louisville FC", state: "KY", zip: "40201" },
      { id: "EWR4", lat: 40.2547, lng: -74.5264, city: "Robbinsville FC", state: "NJ", zip: "08691" },
      { id: "LAS2", lat: 36.2162, lng: -115.0253, city: "North Las Vegas FC", state: "NV", zip: "89081" }
    ];

    let nearestFC = AMAZON_FCS[0];
    let minDistance = Infinity;
    
    for (const fc of AMAZON_FCS) {
      const dist = calculateHaversineDistance(returnerCoords.lat, returnerCoords.lng, fc.lat, fc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestFC = fc;
      }
    }

    const warehouseCoords = { lat: nearestFC.lat, lng: nearestFC.lng, city: nearestFC.city, state: nearestFC.state };
    const finalWarehouseZip = nearestFC.zip;
    const warehouseLabel = `Amazon ${nearestFC.id} - ${nearestFC.city}`;

    const displayOrigin = `${returnerCoords.city}, ${returnerCoords.state}`;

    // 3. Compute dynamic travel distances using coordinates
    const p2pDistKmRaw = calculateHaversineDistance(returnerCoords.lat, returnerCoords.lng, buyerCoords.lat, buyerCoords.lng);
    const warehouseDistKm = calculateHaversineDistance(returnerCoords.lat, returnerCoords.lng, warehouseCoords.lat, warehouseCoords.lng);

    // Apply 150km P2P Carbon Guardrail
    let isP2POverridden = false;
    let finalBuyerZip = selectedBuyerZip;
    let finalBuyerCoords = buyerCoords;
    let finalBuyerName = targetBuyer ? `Amazon Hub Locker - ${targetBuyer.nameBuyer} (P2P Dropoff)` : "Amazon Hub Locker (Local P2P Dropoff)";
    let p2pDistKm = p2pDistKmRaw;

    if (p2pDistKmRaw > 150) {
      isP2POverridden = true;
      finalBuyerZip = finalWarehouseZip;
      finalBuyerCoords = warehouseCoords;
      p2pDistKm = warehouseDistKm;
      finalBuyerName = isIndian 
        ? "Mumbai Central Hub (P2P Cancelled - Carbon Guardrail)"
        : "Louisville Central Warehouse (P2P Cancelled - Carbon Guardrail)";
    }

    const displayDest = `${finalBuyerCoords.city}, ${finalBuyerCoords.state}`;

    // Carbon emissions metrics:
    // Ground shipping: 0.12g CO2 per km per kg
    // Air/Standard Logistics: 0.45g CO2 per km per kg
    // Assume average item weight of 2kg
    const weightKg = 2.0;
    const p2pCO2 = Math.round(p2pDistKm * 0.12 * weightKg * 10) / 10;
    const warehouseCO2 = Math.round(warehouseDistKm * 0.45 * weightKg * 10) / 10;
    const co2Saved = isP2POverridden ? 0 : Math.round((warehouseCO2 - p2pCO2) * 10) / 10;

    // Cost metrics
    const warehouseCost = Math.max(7.50, Math.round(warehouseDistKm * 0.005 * 100) / 100); 
    const p2pCost = isP2POverridden ? warehouseCost : 3.48; // flat local courier rate or warehouse fallback
    const costSaved = isP2POverridden ? 0 : Math.round((warehouseCost - p2pCost) * 100) / 100;

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
        country: isIndian ? "IN" : "US"
      },
      toAddress: {
        name: finalBuyerName,
        street1: "450 Main St",
        city: finalBuyerCoords.city,
        state: finalBuyerCoords.state,
        zip: finalBuyerZip,
        country: isIndian ? "IN" : "US"
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

    // Enforce matching reservation lock to prevent race conditions
    if (labelData && !isP2POverridden) {
      db.reserveBuyerDemand(sku, finalBuyerZip);
    }

    return NextResponse.json({
      success: true,
      p2pRoute: {
        origin: { zip: returnerZip, coords: [returnerCoords.lat, returnerCoords.lng], label: displayOrigin },
        destination: { zip: finalBuyerZip, coords: [finalBuyerCoords.lat, finalBuyerCoords.lng], label: displayDest },
        distance: `${p2pDistKm} km`,
        co2: `${p2pCO2} kg`,
        cost: `$${p2pCost.toFixed(2)}`,
        time: p2pTime,
        buyerName: finalBuyerName
      },
      warehouseRoute: {
        origin: { zip: returnerZip, coords: [returnerCoords.lat, returnerCoords.lng], label: displayOrigin },
        destination: { zip: finalWarehouseZip, coords: [warehouseCoords.lat, warehouseCoords.lng], label: warehouseLabel },
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
