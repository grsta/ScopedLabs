const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-priority-interpretation-audit-005-action-next-steps";
const REPORT_VERSION = "physical-security-report-summary-021-action-next-steps";

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
safe("top-priority-interpretation-row", report.includes('["Top priority interpretation", scopedPriorityItem.tool + " for " + scopedPriorityItem.scope + ": " +'), "top summary uses scoped priority interpretation");
safe("category-master-fallback", report.includes('summary.reason ? ["Category master note", summary.reason] : null'), "broad category reason is only a fallback when no scoped priority exists");
safe("category-interpretation-removed", !report.includes('["Category interpretation", summary.reason]'), "old category interpretation row removed from scoped priority summary");
safe("scoped-report-next-step", report.includes('["Report next step", "Review the Watch/Risk detail table and correct scoped issues before finalizing the report."]'), "scoped next step avoids mismatched category next step");
safe("priority-note-remains", report.includes("Top priority is the first/highest scoped Watch/Risk issue"), "priority note remains");
safe("scoped-counts-remain", report.includes("function buildScopedReportCounts()") && report.includes("Healthy / Watch / Risk / Pending"), "scoped counts remain");
safe("watch-risk-table-remains", report.includes("<th>Scope / Area</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th>"), "watch/risk detail table remains complete scoped issue list");
safe("area-zone-sections-remain", report.includes("function renderAreaZoneSectionsHtml()") && report.includes("physical-security-area-zone-report"), "area/zone sections remain");

console.log("");
console.log("Physical Security Summary Priority Interpretation Audit");
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
