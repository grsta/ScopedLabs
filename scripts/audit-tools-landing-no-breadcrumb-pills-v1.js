const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "tools-landing-no-breadcrumb-pills-audit-002-landing-chrome-sync";
const STYLE_CACHE = "landing-card-button-polish-v2-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/index.html");
const style = read("assets/style.css");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("index-style-cache", "Tools index", index, "/assets/style.css?v=" + STYLE_CACHE);
has("index-landing-chrome-class", "Tools index", index, "landing-chrome-polish");
has("index-marker", "Tools index", index, "tools-landing-no-breadcrumb-pills-028");
has("style-marker", "style.css", style, "tools-landing-no-breadcrumb-pills-028");
has("style-chrome-marker", "style.css", style, "landing-card-button-polish-v2-001");
has("hide-crumbs", "style.css", style, ".page-tools .crumbs");
has("hide-card-top", "style.css", style, ".page-tools .category-grid > a.card .card-top");
has("display-none", "style.css", style, "display: none;");
has("page-head-tightened", "style.css", style, "padding-top: 10px;");
has("h2-reset", "style.css", style, ".page-tools .category-grid > a.card .h2");

const cardCount = (index.match(/<a class="card" href="\/tools\//g) || []).length;
add("category-card-count-preserved", cardCount === 10 ? "SAFE" : "FAIL", "Found " + cardCount + " category card links");

const ctaCount = (index.match(/<span class="category-card-cta">Open category<\/span>/g) || []).length;
add("category-cta-count-preserved", ctaCount === 10 ? "SAFE" : "FAIL", "Found " + ctaCount + " centered Open category CTAs");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Tools Landing No Breadcrumb/Pills Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
