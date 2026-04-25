const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = process.argv[2] || "shared-export-002";
const START_DIR = process.argv[3] || "tools";

let changed = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (!entry.isFile() || entry.name !== "index.html") continue;

    const original = fs.readFileSync(full, "utf8");

    if (!original.includes("/assets/export.js?v=")) continue;

    const updated = original.replace(
      /\/assets\/export\.js\?v=[^"']+/g,
      `/assets/export.js?v=${VERSION}`
    );

    if (updated !== original) {
      fs.writeFileSync(full, updated, "utf8");
      changed += 1;
      console.log("bumped", full.replace(/\\/g, "/"));
    }
  }
}

walk(path.join(ROOT, START_DIR));

console.log("");
console.log(`Export cache bump complete.`);
console.log(`Version: ${VERSION}`);
console.log(`Files changed: ${changed}`);