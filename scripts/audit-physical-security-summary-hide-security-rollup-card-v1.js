const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-hide-security-rollup-card-audit-001";
const MARKER = "physical-security-summary-hide-security-rollup-card-031";

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

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");

const combined = index + "\n" + script;

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("marker-present", index.includes(MARKER), "security rollup hide marker exists");
safe("specific-card-hidden", combined.includes('data-sl-hide-security-rollup-card="true"'), "only the Physical Security Rollup card is marked hidden");
safe("css-targets-specific-attr", index.includes('[data-sl-hide-security-rollup-card="true"]') && index.includes("display: none !important"), "CSS targets only the marked rollup card");
safe("area-zone-guidance-rollup-not-targeted", !index.includes("#physicalSecurityScopeMount {\n      display: none") && !index.includes("#physicalSecurityScopeMount {\r\n      display: none"), "does not broadly hide physicalSecurityScopeMount");
safe("area-zone-guidance-title-preserved", combined.includes("Area, Zone, and Tool Guidance Rollup"), "Area/Zone and Tool Guidance Rollup remains in source");
safe("report-export-preserved", index.includes("summaryExportSection") && index.includes("physicalSecurityReportMount"), "report/export mounts remain");
safe("cross-category-payload-preserved", index.includes("physicalSecurityCrossCategoryPayload"), "cross-category payload remains");
safe("continue-actions-preserved", index.includes("Continue Planning") && index.includes("Return to Area Planner") && index.includes("Back to Physical Security"), "Continue Planning actions remain");

console.log("");
console.log("Physical Security Summary Hide Security Rollup Card Audit");
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
