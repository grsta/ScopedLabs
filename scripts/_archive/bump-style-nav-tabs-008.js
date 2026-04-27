const fs = require("fs");
const path = require("path");

const root = process.cwd();
const NEW_VERSION = "nav-tabs-008";
const exts = new Set([".html"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(root);
let changed = 0;

for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const before = text;

  text = text.replace(
    /((?:href|src)=["'][^"']*assets\/style\.css)(?:\?v=[^"']*)?(["'])/gi,
    `$1?v=${NEW_VERSION}$2`
  );

  if (text !== before) {
    fs.writeFileSync(file, text, "utf8");
    console.log("UPDATED:", path.relative(root, file));
    changed++;
  }
}

console.log(`\nDone. Updated ${changed} file(s).`);