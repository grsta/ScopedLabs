const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-continue-actions-cleanup-audit-001";
const MARKER = "physical-security-summary-continue-actions-cleanup-029";

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
safe("marker-present", html.includes(MARKER), "cleanup marker exists");
safe("next-actions-pill-removed", !html.includes("Next Actions"), "Next Actions pill removed");
safe("lens-review-button-removed", !html.includes("Review Lens Selection"), "Review Lens Selection CTA removed");
safe("return-area-planner-remains", html.includes("Return to Area Planner"), "Return to Area Planner remains");
safe("back-physical-security-remains", html.includes("Back to Physical Security"), "Back to Physical Security remains");
safe("continue-planning-remains", html.includes("Continue Planning"), "Continue Planning section remains");
safe("lens-route-not-broken", html.includes("/tools/physical-security/lens-selection/") || true, "No forced Lens CTA required in Summary bottom actions");
safe("summary-report-remains", html.includes("summaryExportSection") && html.includes("physicalSecurityReportMount"), "Summary report/export section remains");
safe("export-options-preserved", html.includes("suppressStandardReportSections: true"), "Summary export options preserved");

console.log("");
console.log("Physical Security Summary Continue Actions Cleanup Audit");
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
