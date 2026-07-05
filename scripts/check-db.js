const fs = require('fs');
const path = require('path');
const { DynamoDBClient, ScanCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");

try {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) { process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); }
  });
} catch (e) {}

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });

async function check() {
  const { TableNames } = await client.send(new ListTablesCommand({}));
  console.log("DynamoDB Table Item Counts:");
  for (const table of TableNames) {
    try {
      const { Count } = await client.send(new ScanCommand({ TableName: table, Select: "COUNT" }));
      console.log(`- ${table}: ${Count} items`);
    } catch(e) {
      console.log(`- ${table}: Error checking count`);
    }
  }
}
check();
