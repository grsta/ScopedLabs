const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-report-carryover-values-audit-001";
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
const report = read("assets/physical-security-report-summary.js");

const detail = functionBlock(report, "areaToolDetail");
const candidate = functionBlock(report, "reportAreaToolDetailCandidate");
const formatter = functionBlock(report, "formatAreaToolDetailValue");
const scoped = functionBlock(report, "scopedActionValue");
const refresh = functionBlock(report, "refreshExportSection");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "Report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "Report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "Report summary version bumped");
safe("candidate-helper-exists", candidate.includes("reportCarryValueByKeys") && candidate.includes("positiveLens") && candidate.includes("positiveCamera"), "report carryover candidate helper exists");
safe("area-detail-uses-candidate", detail.includes("reportAreaToolDetailCandidate(source, definition)") && detail.includes("formatAreaToolDetailValue(definition, candidate.key, candidate.value)"), "Area / Zone report detail uses carryover resolver");
safe("lens-positive-before-zero", candidate.indexOf("positiveLens") > -1 && candidate.indexOf("lensClass") > candidate.indexOf("positiveLens") && candidate.indexOf('return reportCarryValueByKeys(area, ["selectedLensMm"') > candidate.indexOf("lensClass"), "report lens detail prefers positive lens/class before stale zero");
safe("camera-positive-before-zero", candidate.indexOf("positiveCamera") > -1 && candidate.indexOf("targetCameraCount") > -1 && candidate.indexOf('return reportCarryValueByKeys(area, ["cameraCount"') > candidate.indexOf("positiveCamera"), "report camera detail prefers positive/target count before stale zero");
safe("formatter-aliases", formatter.includes("lensinputselectedmm") && formatter.includes("Lens class:") && formatter.includes("targetcameracount") && formatter.includes("Planned camera count:"), "formatter labels report carryover aliases");
safe("scoped-actions-use-carryover", scoped.includes('toolKey === "lens"') && scoped.includes('toolKey === "spacing"') && scoped.includes("reportCarryValueByKeys"), "Watch/Risk next-step values use carryover resolver");
safe("single-render-preserved", refresh.includes("mount.innerHTML = html;") && !refresh.includes("findOrCreateExportSlot(mount)"), "single report render remains");
safe("dedupe-preserved", index.includes("suppressStandardReportSections: true"), "generic wrapper dedupe remains");
safe("sections-preserved", report.includes("Area / Zone Report Sections") && report.includes("Core Coverage Areas") && report.includes("Watch/Risk detail only"), "report sections remain");

console.log("");
console.log("Physical Security Summary Report Carryover Values Audit");
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
