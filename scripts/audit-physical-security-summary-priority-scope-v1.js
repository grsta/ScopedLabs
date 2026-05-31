const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-priority-scope-audit-001";
const REPORT_VERSION = "physical-security-report-summary-012-priority-scope";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "report summary version bumped");
safe("scoped-priority-helper", report.includes("function scopedPriority(detailRows)") && report.includes("firstRisk"), "scoped priority helper exists");
safe("priority-scope-row", report.includes('["Priority scope", scopedPriorityItem.scope]'), "Category Summary includes priority scope row");
safe("priority-item-scoped", report.includes('["Priority item", scopedPriorityItem.tool]'), "Category Summary uses scoped priority item when available");
safe("priority-action-scoped", report.includes('["Priority action", scopedPriorityItem.action]'), "Category Summary uses scoped priority action when available");
safe("scoped-detail-before-summary", report.indexOf("const scopedDetailRows = buildScopedActionRows();") < report.indexOf("const summaryRows = ["), "scoped rows are available before summary rows are built");
safe("watch-risk-scope-column-remains", report.includes("<th>Scope / Area</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th>"), "Watch/Risk table keeps scope column");
safe("area-zone-sections-remain", report.includes("function renderAreaZoneSectionsHtml()") && report.includes("physical-security-area-zone-report"), "area/zone report sections remain");
safe("status-text-remains", report.includes("renderReportStatusText(summary.status)") && report.includes("renderReportStatusText(row.status)"), "colored status text remains");

console.log("");
console.log("Physical Security Summary Priority Scope Audit");
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
