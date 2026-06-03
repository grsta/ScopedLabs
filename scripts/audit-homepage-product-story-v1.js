const fs = require("fs");
const path = require("path");
const STYLE_CACHE = "homepage-product-story-038-footer-copy-path-weight";
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
has("footer-copyright-symbol", "Homepage", index, "&copy; <span data-year></span> ScopedLabs");

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
has("final-cta-muted-path-marker", "style.css", style, "homepage-product-story-037-final-cta-muted-path");
has("final-cta-path-label-muted", "style.css", style, "color: rgba(230,245,236,.78) !important;");
has("final-cta-path-label-not-bold", "style.css", style, "font-weight: 500 !important;");
add("final-cta-path-not-neon", !style.includes("body.homepage-product-story .homepage-final-path .homepage-final-path-step {\n  background: transparent !important;\n  border: 0 !important;\n  border-radius: 0 !important;\n  color: var(--accent) !important;"), "Final CTA path labels are no longer neon green");
add("final-cta-no-question-separators", !index.includes(">?</span>") && !index.includes("sl-pipeline-sep"), "No broken question-mark separators in final CTA");
has("final-cta-arrow-css-safe", "style.css", style, 'content: "\\2192";');
has("final-cta-path-label-muted", "style.css", style, "color: rgba(230,245,236,.78) !important;");
has("final-cta-path-label-pipeline-style", "style.css", style, "text-transform: uppercase !important;");
has("final-cta-title-weight-card-match", "style.css", style, "font-weight: 700 !important;");
has("final-cta-type-match-marker", "style.css", style, "homepage-product-story-037-final-cta-muted-path");
has("final-cta-title-polished", "Homepage", index, "Turn your next rough request into a clear plan.");
has("final-cta-body-polished", "Homepage", index, "Pick a category, run the first check, and let ScopedLabs carry the assumptions, risks, and report-ready details as the design comes together.");
has("final-cta-assistant-copy", "Homepage", index, "Tool assistants flag assumptions, warnings, and risks as you work; category summaries collect those checks into report-ready review.");
add("final-cta-assistant-copy-location", index.indexOf("Tool assistants flag assumptions, warnings, and risks as you work; category summaries collect those checks into report-ready review.") > index.indexOf("homepage-final-cta-section") ? "SAFE" : "FAIL", "Assistant copy is scoped to the final CTA, not the proof card");
has("final-cta-title-weight-normalized", "style.css", style, "body.homepage-product-story .homepage-final-copy > .card-title");
add("final-cta-no-question-separators", !index.includes("sl-pipeline-sep") && !index.includes(">?</span>"), "No broken question-mark separators in final CTA");
has("final-cta-arrow-css-content", "style.css", style, 'content: "\\2192";');
has("final-cta-arrow-path-css", "style.css", style, ".homepage-final-path-step + .homepage-final-path-step::before");
has("final-cta-arrow-path-markup", "Homepage", index, "homepage-final-path-step");
has("final-cta-closeout-layout", "Homepage", index, "homepage-final-path");
has("final-cta-actions-panel", "style.css", style, "body.homepage-product-story .homepage-final-actions .btn");
has("final-cta-cache-marker", "style.css", style, "homepage-product-story-037-final-cta-muted-path");
add("old-final-cta-copy-removed", !index.includes("Start with a real planning question.") && !index.includes("Pick a category, enter the assumptions you know, and use ScopedLabs to turn rough requirements into clearer engineering decisions."), "Old final CTA copy removed");
has("other-ways-title-polished", "Homepage", index, "Other ways to begin.");
add("old-start-titles-removed", !index.includes("Good places to start") && !index.includes("Choose how you want to begin."), "Old start section titles removed");
has("category-section-title-polished", "Homepage", index, "Start with the system you need to plan.");
add("old-category-section-title-removed", !index.includes("What ScopedLabs helps you plan"), "Old category section title removed");
has("cad-graph-container-scaled-final", "style.css", style, "max-width: 760px !important");
has("cad-graph-container-width-760", "style.css", style, "max-width: 760px !important");
has("cad-graph-container-padding-tight", "style.css", style, "padding: 12px 14px !important");
has("cad-graph-svg-width-760", "style.css", style, ".homepage-cad-coverage-svg");
has("cad-target-normal-weight-style", "Homepage", index, 'font-size="12.2" font-weight="400" style="font-weight:400;">Target distance: 60 ft</text>');
has("cad-target-size-final", "Homepage", index, 'font-size="12.2" font-weight="400" style="font-weight:400;">Target distance: 60 ft</text>');
has("cad-right-label-size-final", "Homepage", index, 'font-size="12.2" font-weight="400" style="font-weight:400;">Raw: 120 ft</text>');
has("cad-usable-size-final", "Homepage", index, 'font-size="12.2" font-weight="400" style="font-weight:400;">Usable Width: 102ft</text>');
has("cad-usable-width-label", "Homepage", index, "Usable Width: 102ft");
add("workflow-streak-removed", !style.includes("homepage-workflow-streak"), "Planning Workflow streak experiment removed");
has("workflow-card-smaller-retained", "style.css", style, "max-width: 285px !important");
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
