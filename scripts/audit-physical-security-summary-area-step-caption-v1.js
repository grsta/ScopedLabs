const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-step-caption-audit-001";
const REPORT_VERSION = "physical-security-report-summary-026-area-step-caption";

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
const table = functionBlock(report, "renderAreaZoneToolTable");
const group = functionBlock(report, "renderAreaZoneGroup");
const refresh = functionBlock(report, "refreshExportSection");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "Report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "Report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "Report summary version bumped");
safe("caption-inside-table", table.includes("<caption") && table.includes("Tool / Area Step Results - ") && table.indexOf("<caption") < table.indexOf("<thead>"), "area/zone heading is a table caption before the header");
safe("caption-class-preserved", table.includes("physical-security-area-zone-tool-heading"), "caption keeps live-page hide class");
safe("scope-data-preserved", table.includes("data-sl-area-zone-scope"), "table scope data attribute remains");
safe("group-passes-title", group.includes("renderAreaZoneToolTable(area, titleText)"), "group passes area title into table");
safe("live-hide-css-preserved", index.includes('body[data-tool="physical-security-summary"] .physical-security-area-zone-tool-heading') && index.includes("display: none !important"), "live Summary still hides heading inline");
safe("report-sections-preserved", report.includes("Area / Zone Report Sections") && report.includes("Core Coverage Areas") && report.includes("Watch/Risk detail only"), "report sections remain");
safe("single-render-preserved", refresh.includes("mount.innerHTML = html;") && !refresh.includes("findOrCreateExportSlot(mount)"), "single report render remains");
safe("dedupe-preserved", index.includes("suppressStandardReportSections: true"), "generic wrapper dedupe remains");
safe("carryover-preserved", report.includes("function reportAreaToolDetailCandidate(") && report.includes("positiveLens") && report.includes("Selected lens input:"), "report carryover values remain");

console.log("");
console.log("Physical Security Summary Area Step Caption Audit");
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
