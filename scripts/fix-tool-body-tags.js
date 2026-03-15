const fs = require("fs");
const path = require("path");

const ROOT = "E:/ScopedLabs/tools";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.toLowerCase() === "index.html") out.push(full);
  }
  return out;
}

function toSlug(p) {
  const rel = path.relative(ROOT, p).replace(/\\/g, "/");
  const parts = rel.split("/");
  return parts.length >= 2 ? parts[0] : null; // category folder under /tools
}

function isCategoryPage(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const parts = rel.split("/");
  return parts.length === 2 && parts[1].toLowerCase() === "index.html";
}

function isProToolHtml(html) {
  return (
    /data-tier\s*=\s*["']pro["']/i.test(html) ||
    /data-protected\s*=\s*["']true["']/i.test(html)
  );
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  if (isCategoryPage(file)) continue; // leave category pages alone

  const category = toSlug(file);
  if (!category) continue;

  let html = fs.readFileSync(file, "utf8");
  if (!isProToolHtml(html)) continue; // only touch pro tool pages

  const replacement = `<body data-tier="pro" data-category="${category}"`;

  const updated = html.replace(/<body\b[^>]*>/i, (m) => {
    const extraStep = m.match(/\sdata-step\s*=\s*["'][^"']*["']/i)?.[0] || "";
    return `${replacement}${extraStep}>`;
  });

  if (updated !== html) {
    fs.writeFileSync(file, updated, "utf8");
    changed++;
    console.log(`FIXED: ${file}`);
  }
}

console.log(`Done. Updated ${changed} pro tool pages.`);