const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "landing-card-button-polish-v2-audit-001";
const STYLE_CACHE = "landing-card-button-polish-v2-001";

function file(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(file(rel));
}

function read(rel) {
  const target = file(rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function listDirs(rel) {
  const dir = file(rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.posix.join(rel.replace(/\\/g, "/"), entry.name));
}

function walkGuideIndexes(rel) {
  const dir = file(rel);
  if (!fs.existsSync(dir)) return [];

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const childRel = path.posix.join(rel.replace(/\\/g, "/"), entry.name);
    if (entry.isDirectory()) {
      const indexRel = path.posix.join(childRel, "index.html");
      if (exists(indexRel)) out.push(indexRel);
      out.push(...walkGuideIndexes(childRel));
    }
  }
  return Array.from(new Set(out));
}

const rows = [];

function add(page, id, status, detail) {
  rows.push({ page, id, status, detail });
}

function has(page, id, source, signal) {
  const ok = source.includes(signal);
  add(page, id, ok ? "SAFE" : "FAIL", ok ? "contains " + signal : "missing " + signal);
}

const targetFiles = [];

if (exists("index.html")) targetFiles.push("index.html");
if (exists("tools/index.html")) targetFiles.push("tools/index.html");
if (exists("guides/index.html")) targetFiles.push("guides/index.html");

for (const dir of listDirs("tools")) {
  const indexRel = path.posix.join(dir, "index.html");
  if (exists(indexRel)) targetFiles.push(indexRel);
}

for (const rel of walkGuideIndexes("guides")) {
  targetFiles.push(rel);
}

const uniqueTargets = Array.from(new Set(targetFiles));
const style = read("assets/style.css");
const homepageStyleCache = "homepage-product-story-020-remove-proof-band-stripe";

has("assets/style.css", "v2-style-marker", style, STYLE_CACHE);
has("assets/style.css", "v2-body-scope", style, "body.landing-chrome-polish");
has("assets/style.css", "v2-button-radius", style, "border-radius: 7px !important;");
has("assets/style.css", "v2-card-radius", style, "border-radius: 14px !important;");
has("assets/style.css", "v2-category-row-height", style, "body.category-landing-page .tool-row--center");
has("assets/style.css", "v2-tools-card-height", style, "body.landing-tools .category-grid > a.card");

for (const rel of uniqueTargets) {
  const html = read(rel);

  has(rel, "landing-body-class", html, "landing-chrome-polish");
  if (rel === "index.html") {
    has(rel, "style-cache", html, "/assets/style.css?v=" + homepageStyleCache);
  } else {
    has(rel, "style-cache", html, "/assets/style.css?v=" + STYLE_CACHE);
  }
  if (rel === "index.html") {
    has(rel, "v2-marker", html, homepageStyleCache);
  } else {
    has(rel, "v2-marker", html, STYLE_CACHE);
  }
  has(rel, "nav-tabs-present", html, "nav-tabs");
}

const categoryFiles = uniqueTargets.filter((rel) => /^tools\/[^/]+\/index\.html$/.test(rel));

for (const rel of categoryFiles) {
  const slug = rel.split("/")[1];
  const html = read(rel);

  add(
    rel,
    "category-data-attribute",
    html.includes('data-category="' + slug + '"') ? "SAFE" : "FAIL",
    html.includes('data-category="' + slug + '"')
      ? "data-category preserved"
      : "data-category missing"
  );

  add(
    rel,
    "upgrade-checkout-preserved",
    html.includes("/upgrade/?category=" + slug + "#checkout") ? "SAFE" : "FAIL",
    html.includes("/upgrade/?category=" + slug + "#checkout")
      ? "upgrade checkout route preserved"
      : "upgrade checkout route missing"
  );
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Landing Card/Button Polish v2 Audit");
console.log("Version:", VERSION);
console.log("Landing/guide files checked:", uniqueTargets.length);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
