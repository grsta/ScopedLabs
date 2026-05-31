const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-watch-risk-description-audit-008-priority-interpretation";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=physical-security-report-summary-016-priority-interpretation"), "report summary cache bumped");
safe("report-version-bumped", report.includes("physical-security-report-summary-016-priority-interpretation"), "report summary version bumped");
safe("watch-risk-note-style", index.includes("physical-security-summary-watch-risk-note-006") && index.includes(".physical-security-watch-risk-note"), "watch/risk note style exists");
safe("watch-risk-note-output", report.includes("Watch/Risk detail only:") && report.includes("by area/zone when scope data is available") && report.includes("area/zone report sections below"), "watch/risk detail explanation exists");
safe("watch-risk-note-included", report.includes("return summaryTable + detailIntro + detailTable + areaZoneSections;"), "watch/risk note is included before area/zone report sections");
safe(
  "status-text-remains",
  report.includes("renderReportStatusText(summaryStatus)") &&
    report.includes("renderReportStatusText(row.status)") &&
    report.includes("renderReportStatusText(row[2])") === false,
  "colored status text remains"
);
safe("export-controls-remain", index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\"") && index.includes("physicalSecurityReportMount"), "export controls remain");

console.log("");
console.log("Physical Security Summary Watch/Risk Description Audit");
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
