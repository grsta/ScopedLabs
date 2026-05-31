const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-scoped-counts-audit-003-top-priority-text";
const REPORT_VERSION = "physical-security-report-summary-015-top-priority-text";

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
safe("pending-status-supported", report.includes('if (status === "pending") return "Pending";') && report.includes('return "pending";'), "pending status is explicit");
safe("scoped-report-rows", report.includes("function buildScopedReportRows()") && report.includes("scopeTitle(area, group, index)") && report.includes("areaToolRows(area).forEach"), "scoped report rows are built from area/zone tool rows");
safe("status-generated-rule", report.includes("function statusIsGenerated(status)") && report.includes('normalized === "healthy"') && report.includes('normalized === "watch"') && report.includes('normalized === "risk"'), "generated rows are only healthy/watch/risk");
safe("scoped-count-builder", report.includes("function buildScopedReportCounts()") && report.includes("tracked: rows.length") && report.includes("counts.pending += 1"), "scoped counts include tracked/generated/healthy/watch/risk/pending");
safe("summary-uses-scoped-status", report.includes("const summaryStatus = scopedCounts ? scopedCounts.status : summary.status") && report.includes('["Status", renderReportStatusText(summaryStatus), true]'), "summary status uses scoped counts when available");
safe("summary-uses-scoped-generated", report.includes("const generatedText = scopedCounts") && report.includes("scopedCounts.generated") && report.includes("scopedCounts.tracked"), "generated row uses scoped counts when available");
safe("summary-uses-pending-count", report.includes("Healthy / Watch / Risk / Pending") && report.includes("scopedCounts.pending"), "summary count row includes pending");
safe("fallback-category-counts", report.includes("String(counts.generated || 0) + \" of \" + String(counts.tracked || 0)") && report.includes("String(counts.risk || 0) + \" / 0\""), "category counts remain fallback only");
safe("watch-risk-action-scoped", report.includes("Review \" + row.tool + \" for \" + row.scope + \" before finalizing the report."), "watch/risk required action identifies exact scope");
safe("priority-scope-remains", report.includes('["Top priority scope", scopedPriorityItem.scope]') && report.includes("function scopedPriority(detailRows)"), "priority scope remains");
safe("area-zone-sections-remain", report.includes("function renderAreaZoneSectionsHtml()") && report.includes("physical-security-area-zone-report"), "area/zone sections remain");

console.log("");
console.log("Physical Security Summary Scoped Counts Audit");
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
