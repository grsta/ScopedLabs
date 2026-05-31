const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-report-dedupe-audit-001";
const EXPORT_VERSION = "shared-export-018-suppress-standard-report-sections";

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
const exportJs = read("assets/export.js");
const buildReportHTML = functionBlock(exportJs, "buildReportHTML");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("export-js-exists", exists("assets/export.js"), "shared export asset exists");
safe("export-cache-bumped", index.includes("/assets/export.js?v=" + EXPORT_VERSION), "Summary export.js cache bumped");
safe("summary-enables-suppression", index.includes("suppressStandardReportSections: true"), "Summary enables standard section suppression");
safe("default-false", exportJs.includes("suppressStandardReportSections: false"), "shared export default keeps old behavior for other tools");
safe("build-report-option", buildReportHTML.includes("const suppressStandardSections = state.options.suppressStandardReportSections === true"), "buildReportHTML reads suppression option");
safe("executive-summary-conditional", buildReportHTML.includes("const standardSummaryBlock = suppressStandardSections ?") && buildReportHTML.includes("<h2>Executive Summary</h2>"), "Executive Summary is conditional");
safe("inputs-outputs-conditional", buildReportHTML.includes("const standardInputsOutputsBlock = suppressStandardSections ?") && buildReportHTML.includes("<h2>Inputs</h2>") && buildReportHTML.includes("<h2>Calculated Outputs</h2>"), "Inputs/Calculated Outputs are conditional");
safe("physical-report-body-preserved", buildReportHTML.includes("${extraSectionsBlock}") && index.includes("physical-security-report-summary-027-area-step-header-row"), "Physical Security report body remains exported through extra sections");
safe("assumptions-disclaimer-remain", buildReportHTML.includes("<h2>Assumptions</h2>") && buildReportHTML.includes("<h2>Disclaimer</h2>"), "Assumptions and disclaimer remain");
safe("other-pages-safe-default", !exportJs.includes("suppressStandardReportSections: true"), "shared default does not suppress standard sections globally");

console.log("");
console.log("Physical Security Summary Report Dedupe Audit");
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
