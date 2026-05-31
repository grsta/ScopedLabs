const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-hide-report-status-pill-audit-001";
const EXPORT_VERSION = "shared-export-019-suppress-header-status-pill";

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
const report = read("assets/physical-security-report-summary.js");
const buildReportHTML = functionBlock(exportJs, "buildReportHTML");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("export-js-exists", exists("assets/export.js"), "shared export asset exists");
safe("export-cache-bumped", index.includes("/assets/export.js?v=" + EXPORT_VERSION), "Summary export.js cache bumped");
safe("summary-enables-status-suppression", index.includes("suppressHeaderStatusPill: true"), "Summary enables report header status pill suppression");
safe("shared-default-false", exportJs.includes("suppressHeaderStatusPill: false"), "shared export default keeps status pill for other tools");
safe("build-report-option", buildReportHTML.includes("const suppressHeaderStatusPill = state.options.suppressHeaderStatusPill === true"), "buildReportHTML reads header status pill suppression option");
safe("status-pill-conditional", buildReportHTML.includes("headerStatusPillBlock") && buildReportHTML.includes("${headerStatusPillBlock}"), "top-right status pill is conditional");
safe("no-self-reference", !buildReportHTML.includes("`${headerStatusPillBlock}`"), "headerStatusPillBlock is not self-referential");
safe("status-css-preserved", exportJs.includes(".status-pill") && exportJs.includes(".status-pill.healthy"), "status pill styling remains for other tools");
safe("summary-report-body-preserved", report.includes("Physical Security Category Summary") && report.includes("Watch/Risk detail only") && report.includes("Area / Zone Report Sections"), "Physical Security report body remains");
safe("dedupe-preserved", index.includes("suppressStandardReportSections: true") && exportJs.includes("suppressStandardReportSections: false"), "generic wrapper dedupe remains Summary-only");

console.log("");
console.log("Physical Security Summary Hide Report Status Pill Audit");
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