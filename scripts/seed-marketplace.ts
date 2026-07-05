import fs from 'fs';
import path from 'path';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { PRODUCT_CATALOG } from '../src/lib/catalog';

// Load .env.local manually
try {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
    }
  });
} catch (e) {
  console.log("No .env.local found or error parsing it.");
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });

async function seed() {
  console.log(`Seeding ${PRODUCT_CATALOG.length} products to MarketplaceListings...`);
  let count = 0;
  for (const product of PRODUCT_CATALOG) {
    try {
      await client.send(new PutItemCommand({
        TableName: 'MarketplaceListings',
        Item: {
          listingId: { S: `list-${product.sku}-new` },
          sku: { S: product.sku },
          name: { S: product.name },
          price: { N: product.price.toString() },
          productType: { S: "original" },
          category: { S: product.category },
          isBulk: { BOOL: product.weight ? product.weight > 10 : false },
          status: { S: "active" },
          sellerId: { S: "urbaneco-official" }
        }
      }));
      count++;
    } catch (err: any) {
      console.error(`Failed to seed ${product.sku}:`, err.message);
    }
  }
  console.log(`Successfully seeded ${count} products into AWS DynamoDB!`);
}

seed();
