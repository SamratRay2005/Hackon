import { NextRequest, NextResponse } from "next/server";
import { queryGroq, db } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const { images, sku, itemName, userId } = await req.json();

    if (!sku || !images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Missing SKU or return photos" }, { status: 400 });
    }

    // Prepare Groq Prompt using the A/B/C/D Grading Taxonomy
    const prompt = `You are a professional warehouse grading inspector.
Analyze the uploaded returned item photo(s) and classify its physical state according to this defect taxonomy:
- Grade A: Like New. Item is in pristine condition. No visible wear, scratching, or dents. Retail box may be lightly opened but item is untouched.
- Grade B: Very Good. Light cosmetic scratches, scuffing, or smudges. No deep dents or cracked housing. 100% functional.
- Grade C: Functional / Worn. Visible heavy cosmetic wear, deep scratches, minor dents. Fully functional but looks used. Missing minor accessory (e.g., measuring spoon or manual).
- Grade D: Damaged / Salvage. Major physical defects. Cracked outer casing, broken hinges, missing essential cables, water leaks, or obvious signs of non-functionality.

Provide your grading analysis in the following strict JSON format:
{
  "grade": "A or B or C or D",
  "defects": [
    "List of specific visible defects, scuffs, damages, or missing parts found in the photos"
  ],
  "functionalScore": 0.0 to 10.0 (estimated capability of the item, 10.0 being flawless),
  "resaleCategory": "Excellent Open-Box / Refurbished / Discount Outlet / Liquidation Salvage"
}`;

    // Select the first image for Groq analysis to save tokens, or we can feed multiple.
    // Llama 3.2 Vision can handle single/multiple, but we'll send the primary photo.
    const primaryImage = images[0];

    const response = await queryGroq({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: primaryImage.startsWith("data:") ? primaryImage : `data:image/jpeg;base64,${primaryImage}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.content);

    // Save report ledger to mock DynamoDB with SHA-256 hash proof
    const ledgerRecord = db.saveProductHealthCard(userId || "user_samrat", {
      sku,
      itemName: itemName || "Returned Item",
      grade: result.grade,
      defects: result.defects,
      resaleCategory: result.resaleCategory,
      functionalScore: result.functionalScore,
      imageUrl: primaryImage.startsWith("data:") ? "/api/placeholder-image" : primaryImage // Store visual reference
    });

    return NextResponse.json({
      success: true,
      report: ledgerRecord,
      fromMock: response.fromMock
    });
  } catch (error: any) {
    console.error("Condition Grading API Route Error:", error);
    return NextResponse.json({ error: "Failed to grade returned product" }, { status: 500 });
  }
}
