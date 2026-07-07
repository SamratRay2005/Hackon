const fs = require('fs');

const original = require('child_process').execSync('git show HEAD:src/app/layers/L2Fraud.tsx').toString();

let current = fs.readFileSync('src/app/layers/L2Fraud.tsx', 'utf8');

let newCode = original;

// 1. Remove the "Dark Store Resale Queue" block entirely.
const darkStoreRegex = /<div style={{ background: \(claimType === "damaged_product" && fraudResult\.isDamaged\) \? "#F7F8F8" : "#EEF3FF"[\s\S]*?<\/div>/;
newCode = newCode.replace(darkStoreRegex, "");

// 2. Extract the Manual Review Queue block from current file and append it to the Admin UI
const startIndex = current.indexOf("{/* Manual Review Queue */}");
if (startIndex !== -1) {
  let endIndex = current.lastIndexOf("      </div>\n    </div>\n  );\n}");
  if (endIndex !== -1) {
    const manualReviewBlock = current.substring(startIndex, endIndex);
    
    const insertionPoint = "      </div>\n    </div>\n  );\n}";
    newCode = newCode.replace(insertionPoint, manualReviewBlock + "\n" + insertionPoint);
  }
} else {
  console.log("Could not find Manual Review Queue block in current file!");
}

fs.writeFileSync('src/app/layers/L2Fraud.tsx', newCode);
console.log("File patched!");
