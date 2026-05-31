const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-scoped-link-summary-text-audit-003-action-next-steps";
const REPORT_VERSION = "physical-security-report-summary-026-area-step-caption";

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

const priorityStart = report.indexOf("function scopedPriority(detailRows)");
const priorityEnd = report.indexOf("function renderExportTableHtml", priorityStart);
const priorityBlock = priorityStart >= 0 && priorityEnd > priorityStart ? report.slice(priorityStart, priorityEnd) : "";

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "report summary version bumped");
safe("plain-text-helper", report.includes("function plainReportText(value)") && report.includes(".replace(/<[^>]*>/g"), "plain text helper strips HTML");
safe("scoped-priority-plain-tool", priorityBlock.includes("tool: plainReportText(row[1]") && priorityBlock.includes("scope: plainReportText(row[0]"), "top priority summary uses plain text, not link HTML");
safe("scoped-priority-plain-interpretation", priorityBlock.includes("detail: plainReportText(row[4]"), "top priority interpretation uses plain text detail");
safe("watch-risk-link-remains", report.includes("function renderScopedToolLink(row)") && report.includes("data-sl-physical-security-scoped-tool-link"), "Watch/Risk tool links remain");
safe("watch-risk-table-allows-link", report.includes("index === 1") && report.includes("data-sl-physical-security-scoped-tool-link") && report.includes("index === 2"), "Watch/Risk table allows only tool-link and status HTML");
safe("top-priority-labels-remain", report.includes("Top priority item") && report.includes("Top priority interpretation") && report.includes("Top priority scope"), "top priority wording remains");
safe("active-area-route-remains", report.includes("setActiveAreaFromScopedToolLink(areaId)") && report.includes("window.location.href = href;"), "tool link still sets active area and routes");

console.log("");
console.log("Physical Security Summary Scoped Link Summary Text Audit");
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
