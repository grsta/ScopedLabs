const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-report-table-polish-audit-012-summary-text";

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
safe("final-report-pill-removed", !index.includes("<span class=\"pill\">Final Report</span>"), "Final Report pill removed");
safe("export-card-remains", index.includes("summary-export-card") && index.includes("Final Report Export") && index.includes("summaryReportDetails"), "export card remains");
safe("export-controls-remain", index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\"") && index.includes("id=\"physicalSecurityReportMount\""), "export controls and report mount remain");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=physical-security-report-summary-018-scoped-link-summary-text"), "report summary cache bumped");
safe("report-version-bumped", report.includes("physical-security-report-summary-018-scoped-link-summary-text"), "report summary asset version bumped");
safe("category-summary-table-class", report.includes("class=\"summary-table physical-security-category-summary-table\""), "category summary uses summary-table class");
safe("watch-risk-table-class", report.includes("class=\"summary-table physical-security-watch-risk-table\""), "watch/risk detail uses summary-table class");
safe("report-status-text", report.includes("function renderReportStatusText(status)") && report.includes("physical-security-report-status"), "report summary status values render as colored text");
safe("category-summary-header-clean", report.includes("<thead><tr><th>Summary Item</th><th>Detail</th></tr></thead>"), "category summary table header is clean");
safe("watch-risk-scope-column", report.includes("<th>Scope / Area</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th>"), "watch/risk table includes scope/area context");
safe("area-zone-report-sections", report.includes("function renderAreaZoneSectionsHtml()") && report.includes("Core Coverage Areas") && report.includes("Optional Specialty Zones") && report.includes("physical-security-area-zone-report"), "final report includes expanded area/zone sections");
safe("duplicate-summary-block-removed", !report.includes("<h3>Physical Security Category Summary</h3>") && !report.includes("<h4>Watch/Risk Detail</h4><ul>"), "duplicate text/list summary block removed");
safe("question-artifact-output-removed", !report.includes(".join(\" ? \")") && !report.includes("\" ? \" +") && !report.includes("+ \" ? \""), "visible question-mark separator artifact removed from output construction");
safe("report-text-clean", report.includes("Top priority item: \" + priority.label + \" - \""), "plain text report uses dash separator");
safe("hidden-payload-remains", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "hidden future Site Assistant payload remains");

console.log("");
console.log("Physical Security Summary Report Table Polish Audit");
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
