const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-export-area-zone-sections-audit-010-action-next-steps";
const REPORT_VERSION = "physical-security-report-summary-025-area-step-headings";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const report = read("assets/physical-security-report-summary.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "report summary cache bumped");
safe("report-version-bumped", report.includes("const VERSION = \"" + REPORT_VERSION + "\";"), "report summary version bumped");
safe("area-zone-style", index.includes("physical-security-summary-export-area-zone-sections-012") && index.includes(".physical-security-area-zone-report"), "area/zone report styles exist");
safe("live-page-selected-only", script.includes("renderSelectedScopeGuidance(model.groups)") && !script.includes("Core Pipeline Summary Across Areas"), "live Summary remains selected-area focused");
safe("report-reads-area-ledger", report.includes("function readAreaLedger()") && report.includes("ScopedLabsPhysicalSecurityAreaState"), "report summary reads area ledger");
safe("report-renders-area-zones", report.includes("function renderAreaZoneSectionsHtml()") && report.includes("Core Coverage Areas") && report.includes("Optional Specialty Zones"), "report renders all area/zone sections");
safe("scoped-counts", report.includes("function buildScopedReportCounts()") && report.includes("Healthy / Watch / Risk / Pending") && report.includes("statusIsGenerated(status)"), "summary counts derive from exact scoped area/zone rows");
safe("core-tool-table", report.includes("physical-security-area-zone-tool-table") && report.includes("Tool / Area Step"), "each area/zone gets its own tool table");
safe("watch-risk-scope-column", report.includes("<th>Scope / Area</th><th>Tool</th><th>Status</th><th>Required Action</th><th>Detail / Next Step</th>"), "watch/risk action table includes scope/area column");
safe("watch-risk-area-source", report.includes("function buildScopedActionRows()") && report.includes("buildScopedReportRows()") && report.includes("row.scope") && report.includes("renderScopedToolLink(row)") && report.includes("scopedRequiredAction(row)") && report.includes("scopedActionNextStep(row)"), "watch/risk action rows use exact scoped area/zone context and action next-step helpers");
safe("return-includes-area-zones", report.includes("return summaryTable + detailIntro + detailTable + areaZoneSections;"), "final export appends area/zone sections");
safe("metadata-not-started", !index.includes("scopedlabs-report-metadata-003-shared-carryover") && !report.includes("scopedlabs:report-metadata"), "metadata carryover is not part of this lane");
safe("export-remains", index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\"") && index.includes("physicalSecurityReportMount"), "export controls remain");

console.log("");
console.log("Physical Security Summary Export Area/Zone Sections Audit");
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
