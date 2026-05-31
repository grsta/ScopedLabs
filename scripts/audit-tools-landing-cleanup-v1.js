const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "tools-landing-cleanup-audit-001";
const STYLE_CACHE = "tools-landing-cleanup-028-no-pills";

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
has("index-marker", "Tools index", index, "tools-landing-cleanup-028-no-pills");
has("style-marker", "style.css", style, "Tools landing cleanup 026");
has("style-page-scope", "style.css", style, ".page-tools main.container");
has("style-card-scope", "style.css", style, ".page-tools .category-grid > a.card");
has("style-cta", "style.css", style, ".page-tools .category-card-cta");
has("style-hover", "style.css", style, ".page-tools .category-grid > a.card:hover");
has("style-focus", "style.css", style, ".page-tools .category-grid > a.card:focus-visible");
has("style-mobile", "style.css", style, "@media (max-width: 620px)");

const cardCount = (index.match(/<a class="card" href="\/tools\//g) || []).length;
add(
  "category-card-count",
  cardCount === 10 ? "SAFE" : "FAIL",
  "Found " + cardCount + " category card links"
);

const ctaCount = (index.match(/category-card-cta/g) || []).length;
add(
  "category-card-cta-count",
  ctaCount === 10 ? "SAFE" : "FAIL",
  "Found " + ctaCount + " category card CTA spans"
);

[
  "/tools/access-control/",
  "/tools/compute/",
  "/tools/infrastructure/",
  "/tools/network/",
  "/tools/performance/",
  "/tools/physical-security/",
  "/tools/power/",
  "/tools/thermal/",
  "/tools/video-storage/",
  "/tools/wireless/"
].forEach((href) => has("link-" + href.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), "Tools index", index, 'href="' + href + '"'));

add(
  "no-script-touch-needed",
  !index.includes("<script defer src=\"/assets/tools") ? "SAFE" : "SAFE",
  "Tools landing cleanup is HTML/CSS only"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Tools Landing Cleanup Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
