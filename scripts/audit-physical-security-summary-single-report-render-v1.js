const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-single-report-render-audit-001";
const REPORT_VERSION = "physical-security-report-summary-028-area-step-header-cell";

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
const script = read("tools/physical-security/summary/script.js");
const report = read("assets/physical-security-report-summary.js");
const exportJs = read("assets/export.js");

const refresh = functionBlock(report, "refreshExportSection");
const renderReportSummary = functionBlock(script, "renderReportSummary");

const reportMountTagMatch = index.match(/<div\s+id="physicalSecurityReportMount"[^>]*>/);
const reportMountTag = reportMountTagMatch ? reportMountTagMatch[0] : "";

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "Report summary asset exists");
safe("export-js-exists", exists("assets/export.js"), "shared export asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "Report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "Report summary version bumped");
safe("single-render-refresh", refresh.includes("mount.innerHTML = html;") && !refresh.includes("findOrCreateExportSlot(mount)") && !refresh.includes("insertBefore(slot"), "refreshExportSection replaces report mount instead of inserting nested slot");
safe("refresh-keeps-visible", refresh.includes('mount.removeAttribute("aria-hidden")') && !refresh.includes('setAttribute("aria-hidden", "true")'), "refreshExportSection keeps report mount visible");
safe("summary-render-also-replaces", renderReportSummary.includes("mount.innerHTML = reportApi.renderExportHtml(reportApi.buildSummary())"), "Summary renderer also replaces mount content");
safe("report-mount-not-export-section", reportMountTag.includes('id="physicalSecurityReportMount"') && !reportMountTag.includes("data-export-section"), "report mount itself is not a nested export section");
safe("parent-export-section-remains", index.includes('id="summaryExportSection"') && index.includes("data-export-section"), "parent Summary export section remains");
safe("physical-report-body-preserved", report.includes("Physical Security Category Summary") && report.includes("Watch/Risk detail only") && report.includes("Area / Zone Report Sections") && report.includes("Core Coverage Areas"), "Physical Security report body remains");
safe("ledger-fallback-preserved", report.includes("function buildFromScopedReport()") && report.includes("buildFromCategoryExplanation(getCategoryExplanation()) || buildFromMemory() || buildFromScopedReport()"), "ledger fallback remains");
safe("wrapper-dedupe-preserved", index.includes("suppressStandardReportSections: true") && exportJs.includes("suppressStandardReportSections: false"), "generic export wrapper dedupe remains Summary-only");
safe("no-lens-change-signal", !index.includes("physical-security-lens-carryover-values"), "Lens is not part of this report render lane");

console.log("");
console.log("Physical Security Summary Single Report Render Audit");
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
