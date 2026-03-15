const fs = require("fs");
const path = require("path");

const ROOT = "E:/ScopedLabs/tools";

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.toLowerCase() === "index.html") {
      results.push(filePath);
    }
  }

  return results;
}

const files = walk(ROOT);

let missing = [];

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");

  if (!html.includes('data-protected="true"')) continue;

  if (!html.includes("window.SL_SUPABASE_URL")) {
    missing.push(file);
  }
}

if (missing.length === 0) {
  console.log("✅ All protected tools contain Supabase config.");
} else {
  console.log("❌ Missing config in:");
  missing.forEach(f => console.log(f));
}

console.log("\nChecked:", files.length, "files");