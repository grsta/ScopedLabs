const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-hide-visible-rollup-audit-001";
const MARKER = "physical-security-summary-hide-visible-rollup-030";

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

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("visible-rollup-mount-still-present", html.includes('id="physicalSecurityScopeMount"'), "rollup mount remains in DOM for scripts");
safe("hide-marker-present", html.includes(MARKER), "visible rollup hide marker exists");
safe("visible-rollup-hidden", html.includes('body[data-tool="physical-security-summary"] #physicalSecurityScopeMount') && html.includes("display: none !important"), "visible Physical Security Rollup is hidden");
safe("master-mount-preserved", html.includes('id="physicalSecuritySummaryMasterMount"'), "master assistant mount remains");
safe("cross-category-payload-preserved", html.includes('id="physicalSecurityCrossCategoryPayload"'), "cross-category payload remains");
safe("report-mount-preserved", html.includes('id="physicalSecurityReportMount"'), "report mount remains");
safe("summary-export-preserved", html.includes('id="summaryExportSection"') && html.includes("data-export-section"), "Summary export section remains");
safe("area-state-optout-preserved", html.includes('data-active-area-banner="off"'), "Summary active-area banner opt-out remains");
safe("export-options-preserved", html.includes("suppressStandardReportSections: true"), "Summary export options remain");

console.log("");
console.log("Physical Security Summary Hide Visible Rollup Audit");
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
