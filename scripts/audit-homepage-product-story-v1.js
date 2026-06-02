const fs = require("fs");
const path = require("path");
const STYLE_CACHE = "homepage-product-story-028-workflow-single-streak";
const VERSION = "homepage-product-story-audit-001";

const ROOT = process.cwd();

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("index.html");
const style = read("assets/style.css");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("style-cache", "Homepage", index, "/assets/style.css?v=" + STYLE_CACHE);
has("body-class", "Homepage", index, "homepage-product-story");
has("hero-title", "Homepage", index, "Engineering planning tools for real infrastructure decisions.");
has("browser-title-clean", "Homepage", index, "<title>ScopedLabs - Engineering planning tools for infrastructure decisions</title>");
has("og-title-clean", "Homepage", index, 'property="og:title" content="ScopedLabs - Engineering Planning Tools"');
has("twitter-title-clean", "Homepage", index, 'name="twitter:title" content="ScopedLabs - Engineering Planning Tools"');
add("browser-title-cockroach-removed", !index.includes("ScopedLabs ?"), !index.includes("ScopedLabs ?") ? "Homepage title separator is clean" : "Homepage still contains ScopedLabs ?");
has("primary-tools-cta", "Homepage", index, 'href="/tools/"');
has("guides-cta", "Homepage", index, 'href="/guides/"');
has("poe-guide-link", "Homepage", index, 'href="/guides/poe-budget-calculator/"');
has("physical-security-link", "Homepage", index, 'href="/tools/physical-security/"');
has("power-link", "Homepage", index, 'href="/tools/power/"');
has("upgrade-link", "Homepage", index, 'href="/upgrade/"');
has("nav-preserved", "Homepage", index, "nav-tabs");
has("footer-preserved", "Homepage", index, "site-footer");

[
  "/tools/power/",
  "/tools/physical-security/",
  "/tools/network/",
  "/tools/video-storage/",
  "/tools/thermal/",
  "/tools/wireless/"
].forEach((href) => has("category-" + href.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), "Homepage", index, 'href="' + href + '"'));

has("style-body-scope", "style.css", style, "body.homepage-product-story");
has("style-hero-grid", "style.css", style, ".homepage-hero-grid");
has("style-category-grid", "style.css", style, ".homepage-category-grid");
has("style-proof-grid", "style.css", style, ".homepage-proof-grid");
has("style-mobile", "style.css", style, "@media (max-width: 620px)");
has("workflow-card-smaller-retained", "style.css", style, "max-width: 285px !important");
has("workflow-card-smaller-retained", "style.css", style, "max-width: 285px !important");
has("hero-workflow-card-compact", "style.css", style, "max-width: 320px");
has("hero-workflow-step-compact", "style.css", style, "padding: 10px 11px !important");
has("cad-panel-scaled-down", "style.css", style, "max-width: 860px !important");
has("cad-usable-width-label", "Homepage", index, "Usable Width: 102ft");
has("proof-band-overlay-disabled", "style.css", style, "background: none !important");
has("graph-untouched-marker", "Homepage", index, "homepage-cad-coverage-svg");
has("homepage-header-inset-line-removed", "style.css", style, "box-shadow: 0 12px 34px rgba(0,0,0,0.22) !important");
has("homepage-header-border-removed", "style.css", style, "border-bottom: 0 !important");
has("graph-untouched-marker", "Homepage", index, "homepage-cad-coverage-svg");
has("homepage-header-divider-hidden", "style.css", style, "border-bottom-color: transparent !important");
has("homepage-only-header-divider-scope", "style.css", style, "body.homepage-product-story .site-header");
has("proof-card-frame-width-match", "style.css", style, "max-width: 900px !important");
has("graph-untouched-marker", "Homepage", index, "homepage-cad-coverage-svg");
has("proof-card-graph-width-match", "style.css", style, "max-width: 900px !important");
has("graph-untouched-marker", "Homepage", index, "homepage-cad-coverage-svg");
has("cad-clean-target-label", "Homepage", index, "Target distance: 60 ft");
has("cad-clean-raw-label", "Homepage", index, "Raw: 120 ft");
has("cad-clean-usable-label", "Homepage", index, "Usable Width: 102ft");
has("cad-camera-marker", "Homepage", index, "homepage-cad-camera");
has("cad-coverage-panel", "Homepage", index, "homepage-cad-coverage-panel");
has("cad-camera-marker", "Homepage", index, "homepage-cad-camera");
has("cad-usable-label", "Homepage", index, "Usable Width: 102ft");
has("cad-report-ready", "Homepage", index, "REPORT READY");

const mainCount = (index.match(/<main\b/g) || []).length;
add("single-main", mainCount === 1 ? "SAFE" : "FAIL", "Found " + mainCount + " <main> element(s)");

const sectionCount = (index.match(/<section\b/g) || []).length;
add("section-count", sectionCount >= 5 ? "SAFE" : "FAIL", "Found " + sectionCount + " homepage section(s)");

const emojiSignals = ["??", "??", "???", "??", "??", "??", "??", "??", "??", "??"];
const remainingEmoji = emojiSignals.filter((signal) => index.includes(signal));
add(
  "old-emoji-card-labels-removed",
  remainingEmoji.length === 0 ? "SAFE" : "WATCH",
  remainingEmoji.length === 0 ? "Old emoji category labels removed" : "Old emoji labels still present: " + remainingEmoji.join(", ")
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Homepage Product Story Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
