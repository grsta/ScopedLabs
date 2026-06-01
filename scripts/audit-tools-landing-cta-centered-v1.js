const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "tools-landing-cta-centered-audit-003-landing-chrome-sync";
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
has("index-no-pills-marker", "Tools index", index, "tools-landing-no-breadcrumb-pills-028");
has("style-centered-marker", "style.css", style, "tools-landing-cta-centered-027");
has("style-centered", "style.css", style, "justify-content: center;");
has("style-text-align", "style.css", style, "text-align: center;");
has("style-width-full", "style.css", style, "width: 100%;");
has("style-hide-crumbs", "style.css", style, ".page-tools .crumbs");
has("style-hide-card-top", "style.css", style, ".page-tools .category-grid > a.card .card-top");

const ctaCount = (index.match(/<span class="category-card-cta">Open category<\/span>/g) || []).length;
add("centered-cta-count", ctaCount === 10 ? "SAFE" : "FAIL", "Found " + ctaCount + " centered Open category CTAs");

add(
  "no-cta-inner-symbol-span",
  !index.includes('category-card-cta">Open category <span aria-hidden="true"') ? "SAFE" : "FAIL",
  !index.includes('category-card-cta">Open category <span aria-hidden="true"')
    ? "CTA has no symbol span"
    : "CTA still has a symbol span"
);

add(
  "no-question-artifact",
  !index.includes("Open category ?") ? "SAFE" : "FAIL",
  !index.includes("Open category ?")
    ? "CTA label has no question mark artifact"
    : "CTA label still has question mark artifact"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Tools Landing CTA Centered Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
