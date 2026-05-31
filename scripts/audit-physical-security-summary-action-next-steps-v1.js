const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-action-next-steps-audit-001";
const REPORT_VERSION = "physical-security-report-summary-022-area-ledger-fallback";

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
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");
const scopedRowsBlock = functionBlock(report, "buildScopedActionRows");
const areaZoneTableBlock = functionBlock(report, "renderAreaZoneToolTable");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "Summary report asset cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "report summary asset version bumped");
safe("action-next-step-marker", report.includes("physical-security-summary-action-next-steps-021"), "action next-step marker exists");
safe("scoped-required-action-helper", report.includes("function scopedRequiredAction(row)") && report.includes("Improve") && report.includes("Correct Field of View"), "scoped required action helper exists");
safe("scoped-next-step-helper", report.includes("function scopedActionNextStep(row)") && report.includes("Increase or redesign lighting") && report.includes("Narrow the field of view") && report.includes("Select a valid lens"), "scoped action next-step helper exists");
safe("scene-next-step-uses-values", report.includes('actionFact("target", target, formatFootcandles)') && report.includes('actionFact("estimated light", lumens, formatLumensValue)') && report.includes('actionFact("lighting class", lightingClass)'), "Scene Illumination next step includes labeled values");
safe("scoped-action-rows-use-helpers", scopedRowsBlock.includes("scopedRequiredAction(row)") && scopedRowsBlock.includes("scopedActionNextStep(row)"), "Watch/Risk scoped rows use action helpers");
safe("scoped-action-rows-no-raw-detail-dup", !scopedRowsBlock.includes("row.detail ||") && !scopedRowsBlock.includes("Confirm this condition before carrying"), "Watch/Risk Detail / Next Step no longer duplicates raw area detail");
safe("area-zone-detail-preserved", areaZoneTableBlock.includes("Area / Zone Detail") && areaZoneTableBlock.includes("escapeHtml(row.detail)"), "Area / Zone Detail table still renders raw saved detail");
safe("detail-labels-preserved", report.includes("Horizontal field of view (HFOV):") && report.includes("Selected lens:") && report.includes("Estimated required light:"), "raw engineering detail labels remain available");
safe("links-remain", report.includes("renderScopedToolLink(row)") && report.includes("data-sl-physical-security-scoped-tool-link"), "scoped tool links remain");
safe("export-remains", index.includes("physicalSecurityReportMount") && index.includes("summaryExportSection"), "Summary report/export wiring remains");

console.log("");
console.log("Physical Security Summary Action Next Steps Audit");
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
