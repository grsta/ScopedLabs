const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-live-area-step-heading-hide-audit-001";
const MARKER = "physical-security-summary-live-area-step-heading-hide-027";

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
const refreshExportSection = functionBlock(report, "refreshExportSection");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("marker-present", index.includes(MARKER), "live-only heading hide marker exists");
safe("live-heading-hidden", index.includes('body[data-tool="physical-security-summary"] .physical-security-area-zone-tool-heading') && index.includes("display: none !important"), "live Summary hides repeated area-step heading only");
safe("report-heading-preserved", report.includes("Tool / Area Step Results - ") && report.includes("physical-security-area-zone-tool-heading"), "Print / Save report heading remains in report generator");
safe("report-body-preserved", report.includes("Area / Zone Report Sections") && report.includes("Core Coverage Areas") && report.includes("Watch/Risk detail only"), "Physical Security report body remains");
safe("single-render-preserved", refreshExportSection.includes("mount.innerHTML = html;") && !refreshExportSection.includes("findOrCreateExportSlot(mount)") && !refreshExportSection.includes("insertBefore(slot"), "single report render remains");
safe("dedupe-preserved", index.includes("suppressStandardReportSections: true"), "generic wrapper dedupe remains");

console.log("");
console.log("Physical Security Summary Live Area-Step Heading Hide Audit");
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
