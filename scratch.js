const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});
const docClient = DynamoDBDocumentClient.from(client);

async function run() {
  const userId = "ranjeet";
  console.log("Fetching existing orders for", userId);
  const res = await docClient.send(new ScanCommand({
    TableName: "Orders",
    FilterExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId }
  }));
  
  const items = res.Items || [];
  console.log(`Found ${items.length} existing orders. Deleting them...`);
  
  for (const item of items) {
    await docClient.send(new DeleteCommand({
      TableName: "Orders",
      Key: { orderId: item.orderId }
    }));
  }
  console.log("Deleted old orders.");
}
run();
