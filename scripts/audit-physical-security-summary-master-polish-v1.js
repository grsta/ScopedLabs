const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-master-polish-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const renderer = read("assets/physical-security-category-guidance-renderer.js");
const css = read("assets/physical-security-category-guidance-renderer.css");
const spacing = read("tools/physical-security/camera-spacing/index.html");
const spacingScript = read("tools/physical-security/camera-spacing/script.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("summary-current-master-copy", index.includes("This page is the Physical Security master assistant and final report host."), "hero copy says Summary is the current master host");
safe("master-card-header", index.includes("summary-master-card") && index.includes("Physical Security Master Assistant") && index.includes("Category Brain"), "master card has intentional header");
safe("master-context-mount", index.includes("physicalSecuritySummaryMasterContext") && script.includes("function renderMasterContext(model, explanation)"), "master context mount and renderer exist");
safe("master-context-cards", index.includes("summary-master-context-grid") && script.includes("masterReadiness(model)") && script.includes("masterPriorityQueue(model, explanation"), "master context cards are wired");
safe("master-action-list", index.includes("summary-master-action-list") && script.includes("summary-master-action-item"), "master action queue is wired");
safe("summary-version-cache", script.includes("physical-security-summary-master-polish-002") && index.includes("./script.js?v=physical-security-summary-master-polish-002"), "Summary script version/cache bumped");
safe("renderer-version-cache", renderer.includes("physical-security-category-guidance-renderer-002-summary-master-polish") && index.includes("/assets/physical-security-category-guidance-renderer.js?v=physical-security-category-guidance-renderer-002-summary-master-polish"), "renderer version/cache bumped");
safe("renderer-css-version-cache", css.includes("physical-security-category-guidance-renderer-css-002-summary-master-polish") && index.includes("/assets/physical-security-category-guidance-renderer.css?v=physical-security-category-guidance-renderer-css-002-summary-master-polish"), "renderer CSS version/cache bumped");
safe("renderer-kicker-subtitle", renderer.includes("const kicker = opts.kicker") && renderer.includes("sl-ps-category-guidance__subtitle") && css.includes(".sl-ps-category-guidance__subtitle"), "renderer supports summary master kicker/subtitle");
safe("summary-renderer-options", script.includes("kicker: \"Category Master\"") && script.includes("Coordinates local tool guidance"), "Summary passes master-specific renderer options");
safe("summary-payload-hidden", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "future Site Assistant payload remains hidden");
safe("summary-export-remains", index.includes("summaryExportSection") && index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\""), "Summary export controls remain");
safe("camera-spacing-master-still-unparked", !spacing.includes("physical-security-category-guidance-renderer.js") && !spacing.includes("physical-security-category-guidance-mount") && spacingScript.includes("visibleMasterHost: false"), "Camera Spacing remains local-only, not full master host");

console.log("");
console.log("Physical Security Summary Master Polish Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
