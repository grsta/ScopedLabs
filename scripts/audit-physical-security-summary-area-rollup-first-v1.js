const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-rollup-first-audit-006-selected-scope-guidance";

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

const orderBlock = script.slice(script.indexOf("scopeMount.innerHTML ="), script.indexOf("renderMasterAssistant(model);"));

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("script-cache-bumped", index.includes("./script.js?v=physical-security-summary-selected-rollup-carryover-values-011"), "Summary script cache bumped");
safe("script-version-bumped", script.includes("const VERSION = \"physical-security-summary-selected-rollup-carryover-values-011\";"), "Summary script version bumped");
safe("area-rollup-style", index.includes("physical-security-summary-area-rollup-first-007") && index.includes(".summary-area-tool-table"), "area rollup table styles exist");
safe("selected-scope-order", orderBlock.indexOf("renderAreaRollup(model.groups)") >= 0 && orderBlock.indexOf("renderAreaRollup(model.groups)") < orderBlock.indexOf("renderSelectedScopeGuidance(model.groups)"), "area/zone rollup renders before selected-scope guidance");
safe("selector-rail-style", index.includes("physical-security-summary-area-selector-green-led-011") && index.includes(".summary-area-selector-rail") && index.includes(".summary-area-selector-step.active"), "selector rail styles exist");
safe("selected-scope-guidance", script.includes("function renderSelectedScopeGuidance(groups)") && script.includes("Core Pipeline Guidance for Selected Area") && script.includes("Specialty Branch Guidance for Selected Zone"), "lower guidance is selected-scope only");
safe("no-across-area-live-summary", !script.includes("Core Pipeline Summary Across Areas") && !script.includes("Optional Specialty Branch Summary Across Zones"), "live Summary no longer uses across-area guidance tables");
safe("grouped-area-card", script.includes("data-sl-summary-area-rollup-card") && script.includes("summary-area-rollup-card"), "each area renders as a grouped card");
safe("area-tool-table", script.includes("function renderAreaToolTable(area)") && script.includes("data-sl-summary-area-tool-table"), "each area renders its own tool status table");
safe("area-numbered-label", script.includes("String(index + 1)") && script.includes("Unnamed Area"), "areas are numbered under each area section");
safe("core-tool-definitions", script.includes("Scene Illumination") && script.includes("Lens Selection") && script.includes("Camera Spacing"), "core area tool definitions exist");
safe("specialty-tool-definitions", script.includes("Face Recognition") && script.includes("License Plate"), "specialty zone tool definitions exist");
safe("status-text-remains", script.includes("summary-status") && index.includes("physical-security-summary-status-text-polish-004"), "status text styling remains");
safe("report-mount-remains", index.includes("physicalSecurityReportMount") && script.includes("renderReportSummary(model)"), "report summary mount remains");

console.log("");
console.log("Physical Security Summary Area Rollup First Audit");
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
