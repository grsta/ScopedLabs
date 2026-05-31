const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-report-ledger-fallback-audit-001";
const REPORT_VERSION = "physical-security-report-summary-023-single-report-render";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function functionBlock(text, name) {
  const needle = "function " + name + "(";
  const at = text.indexOf(needle);
  if (at < 0) return "";

  const braceStart = text.indexOf("{", at);
  if (braceStart < 0) return "";

  let depth = 0;

  for (let i = braceStart; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === "{") depth += 1;

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(at, i + 1);
    }
  }

  return "";
}

const rows = [];
function safe(id, ok, detail) {
  rows.push({ id, status: ok ? "SAFE" : "FAIL", detail });
}

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");

const buildSummary = functionBlock(report, "buildSummary");
const buildFromScopedReport = functionBlock(report, "buildFromScopedReport");
const renderExportHtml = functionBlock(report, "renderExportHtml");
const refreshExportSection = functionBlock(report, "refreshExportSection");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "Report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "Report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "Report summary version bumped");
safe("report-mount-target-summary", report.includes('const EXPORT_MOUNT_ID = "physicalSecurityReportMount";'), "Report refresh targets Summary report mount");
safe("ledger-fallback-helper", buildFromScopedReport.includes("buildScopedReportCounts()") && buildFromScopedReport.includes("buildScopedActionRows()") && buildFromScopedReport.includes("Area / Zone Report Sections"), "Scoped ledger fallback helper exists");
safe("build-summary-fallback", buildSummary.includes("buildFromCategoryExplanation(getCategoryExplanation()) || buildFromMemory() || buildFromScopedReport()"), "buildSummary falls back to scoped area/zone ledger");
safe("render-export-fallback", renderExportHtml.includes("const resolvedSummary = summary || buildFromScopedReport()") && renderExportHtml.includes("renderExportTableHtml(resolvedSummary)"), "renderExportHtml can render scoped ledger summary");
safe("refresh-keeps-visible", refreshExportSection.includes('mount.removeAttribute("aria-hidden")') && !refreshExportSection.includes('setAttribute("aria-hidden", "true")'), "refreshExportSection does not hide report mount");
safe("area-zone-sections-preserved", report.includes("function renderAreaZoneSectionsHtml()") && report.includes("Area / Zone Report Sections") && report.includes("Core Coverage Areas") && report.includes("physical-security-area-zone-card"), "Area/zone report sections remain");
safe("watch-risk-preserved", report.includes("physical-security-watch-risk-table") && report.includes("Watch/Risk detail only"), "Watch/Risk detail section remains");
safe("summary-display-unchanged", index.includes("./script.js?v=physical-security-summary-selected-rollup-carryover-values-011"), "Summary selected rollup script cache remains unchanged");

console.log("");
console.log("Physical Security Summary Report Ledger Fallback Audit");
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
