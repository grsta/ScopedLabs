const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-top-priority-wording-audit-004-scoped-tool-links";
const REPORT_VERSION = "physical-security-report-summary-017-scoped-tool-links";

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
safe("top-priority-scope-label", report.includes('["Top priority scope", scopedPriorityItem.scope]'), "summary uses Top priority scope wording");
safe("top-priority-item-label", report.includes('["Top priority item", scopedPriorityItem.tool]'), "summary uses Top priority item wording");
safe("top-priority-action-label", report.includes('["Top priority action", scopedPriorityItem.action]'), "summary uses Top priority action wording");
safe("priority-note", report.includes("Top priority is the first/highest scoped Watch/Risk issue") && report.includes("See the Watch/Risk detail table for all scoped issues."), "summary explains top priority is not the full issue list");
safe("watch-risk-table-remains", report.includes("<th>Scope / Area</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th>"), "watch/risk detail table remains complete scoped issue list");
safe("scoped-counts-remain", report.includes("function buildScopedReportCounts()") && report.includes("Healthy / Watch / Risk / Pending"), "scoped counts remain");
safe("old-labels-removed", !report.includes('["Priority scope",') && !report.includes('["Priority item", scopedPriorityItem.tool]') && !report.includes('["Priority action", scopedPriorityItem.action]'), "old priority labels removed");

console.log("");
console.log("Physical Security Summary Top Priority Wording Audit");
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
