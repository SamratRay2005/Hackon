const fs = require('fs');
const path = require('path');

// Manually load .env.local since this is a standalone script
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

const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });

const tablesToCreate = [
  {
    TableName: "Orders",
    KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "orderId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "ReturnRequests",
    KeySchema: [{ AttributeName: "returnId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "returnId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "MarketplaceListings",
    KeySchema: [{ AttributeName: "listingId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "listingId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "DarkStores",
    KeySchema: [{ AttributeName: "darkStoreId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "darkStoreId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "Manuals",
    KeySchema: [{ AttributeName: "manualId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "manualId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  // Ensure existing ones are created if missing just in case
  {
    TableName: "Users",
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "Sessions",
    KeySchema: [{ AttributeName: "sessionId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "sessionId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "Claims",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "Ledger",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  }
];

async function createTables() {
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    console.log("Currently existing tables in AWS:", TableNames);

    for (const tableDef of tablesToCreate) {
      if (TableNames.includes(tableDef.TableName)) {
        console.log(`Table ${tableDef.TableName} already exists. Skipping.`);
        continue;
      }
      console.log(`Creating table ${tableDef.TableName}...`);
      await client.send(new CreateTableCommand(tableDef));
      console.log(`Table ${tableDef.TableName} created successfully!`);
    }
    console.log("All necessary tables are now set up in AWS DynamoDB.");
  } catch (error) {
    console.error("Error setting up DynamoDB tables:", error);
    if (error.name === 'UnrecognizedClientException') {
      console.log("Your AWS credentials in .env.local are invalid or expired.");
    }
  }
}

createTables();
