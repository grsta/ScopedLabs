const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-report-status-text-audit-003-area-zone-sections";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

function between(value, startToken, endToken) {
  const start = value.indexOf(startToken);
  if (start < 0) return "";
  const end = value.indexOf(endToken, start);
  if (end < 0) return value.slice(start);
  return value.slice(start, end);
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");
const statusStyle = between(index, "    /* physical-security-summary-report-status-text-005 */", "    /* physical-security-summary-status-text-polish-004 */");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=physical-security-report-summary-011-area-zone-sections"), "report summary cache bumped");
safe("report-version-bumped", report.includes("physical-security-report-summary-011-area-zone-sections"), "report summary version bumped");
safe("report-status-style", statusStyle.includes(".physical-security-report-status") && statusStyle.includes("background: transparent;") && statusStyle.includes("text-transform: none;"), "report status text style exists");
safe("report-status-colors", statusStyle.includes(".physical-security-report-status.healthy") && statusStyle.includes(".physical-security-report-status.watch") && statusStyle.includes(".physical-security-report-status.risk") && statusStyle.includes(".physical-security-report-status.unknown"), "report status colors exist");
safe("report-status-helper", report.includes("function renderReportStatusText(status)") && report.includes("function reportStatusClass(status)"), "report status helper exists");
safe("category-status-row-colored", report.includes("[\"Status\", renderReportStatusText(summary.status), true]"), "category summary status row uses colored text");
safe("detail-status-cell-colored", report.includes("const status = renderReportStatusText(tool.status);") && report.includes("index === 2 ? cell : escapeHtml(cell)"), "watch/risk detail status column uses colored text");
safe("no-pill-class-introduced", !report.includes("pill") && !statusStyle.includes("border-radius: 999px;"), "report status patch does not introduce pill styling");
safe("summary-tables-remain", report.includes("physical-security-category-summary-table") && report.includes("physical-security-watch-risk-table"), "report tables remain");
safe("export-remains", index.includes("summaryExportSection") && index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\""), "export/report controls remain");

console.log("");
console.log("Physical Security Summary Report Status Text Audit");
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
