const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-hide-exact-rollup-section-audit-001";
const MARKER = "physical-security-summary-hide-exact-rollup-section-032";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];
function safe(id, ok, detail) {
  rows.push({ id, status: ok ? "SAFE" : "FAIL", detail });
}

const html = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");

const hiddenSectionSignal =
  '<section class="card summary-results-card" style="margin-top: 18px;" hidden aria-hidden="true" data-sl-hidden-security-rollup-section="true" data-sl-hide-marker="' + MARKER + '">';

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("exact-section-hidden", html.includes(hiddenSectionSignal), "exact Physical Security Rollup section is hidden at source");
safe("results-mount-preserved", html.includes('id="results"') && script.includes('const results = byId("results")'), "#results mount remains for script compatibility");
safe("stale-guessed-css-removed", !html.includes("physical-security-summary-hide-security-rollup-card-031"), "previous guessed CSS marker removed");
safe("area-zone-guidance-preserved", html.includes("Area, Zone, and Tool Guidance Rollup") && html.includes('id="physicalSecurityScopeMount"'), "Area/Zone and Tool Guidance Rollup remains visible");
safe("master-assistant-preserved", html.includes('id="physicalSecuritySummaryMasterMount"'), "Master assistant mount remains");
safe("report-export-preserved", html.includes('id="summaryExportSection"') && html.includes('id="physicalSecurityReportMount"'), "Final report export remains");
safe("continue-planning-preserved", html.includes("Continue Planning") && html.includes("Return to Area Planner") && html.includes("Back to Physical Security"), "Continue Planning actions remain");
safe("no-broad-scope-hide", !html.includes("body[data-tool=\"physical-security-summary\"] #physicalSecurityScopeMount") && !html.includes("#physicalSecurityScopeMount {\n      display: none"), "physicalSecurityScopeMount is not hidden broadly");

console.log("");
console.log("Physical Security Summary Hide Exact Rollup Section Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", 0);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
