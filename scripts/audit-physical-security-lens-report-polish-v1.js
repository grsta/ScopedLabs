const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-report-polish-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function idFor(value) {
  let out = "";
  let lastDash = false;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i].toLowerCase();
    const code = ch.charCodeAt(0);
    const alpha = code >= 97 && code <= 122;
    const number = code >= 48 && code <= 57;
    if (alpha || number) {
      out += ch;
      lastDash = false;
    } else if (!lastDash) {
      out += "-";
      lastDash = true;
    }
  }
  while (out.startsWith("-")) out = out.slice(1);
  while (out.endsWith("-")) out = out.slice(0, -1);
  return out || "signal";
}

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function requireSignal(group, source, signal) {
  add(group + "-" + idFor(signal), source.includes(signal) ? "SAFE" : "FAIL", source.includes(signal) ? group + " contains " + signal : group + " missing " + signal);
}

function rejectSignal(group, source, signal) {
  add(group + "-no-" + idFor(signal), !source.includes(signal) ? "SAFE" : "FAIL", !source.includes(signal) ? group + " does not contain " + signal : group + " still contains " + signal);
}

const lensIndexRel = "tools/physical-security/lens-selection/index.html";
const lensScriptRel = "tools/physical-security/lens-selection/script.js";
const exportRel = "assets/export.js";

const lensIndex = read(lensIndexRel);
const lensScript = read(lensScriptRel);
const exportJs = read(exportRel);

add("lens-index-exists", exists(lensIndexRel) ? "SAFE" : "FAIL", lensIndexRel + " exists");
add("lens-script-exists", exists(lensScriptRel) ? "SAFE" : "FAIL", lensScriptRel + " exists");
add("export-js-exists", exists(exportRel) ? "SAFE" : "FAIL", exportRel + " exists");

["id=\"lensReportSummaryExport\"", "data-export-title=\"Lens Selection Engineering Summary\"", "/assets/export.js?v=shared-export-014-print-safe-compact-svg", "./script.js?v=physical-security-lens-report-polish-009-duplicate-export-cleanup", "id=\"lensDesignAssistant\"", "Continue → Physical Security Summary"].forEach((signal) => requireSignal("lens-index", lensIndex, signal));

["reportSummary: $(\"lensReportSummaryExport\")", "function renderLensReportSummary(data)", "Lens Selection Result Summary", "Engineering Notes and Handoff", "Physical Security Summary handoff", "Optional branch note", "renderLensReportSummary(data);", "clearLensReportSummary();"].forEach((signal) => requireSignal("lens-script", lensScript, signal));

[".report{padding:.18in .28in .24in}", "width:100% !important;", "max-width:100% !important;", "margin:10px 0 14px !important;", "margin:0 0 10px !important;", "padding:4px 8px !important;"].forEach((signal) => requireSignal("export-js", exportJs, signal));

["margin:0 -.14in 10px !important;", "margin:10px -.14in 14px !important;", "width:calc(100% + .28in) !important;", "max-width:calc(100% + .28in) !important;"].forEach((signal) => rejectSignal("export-js", exportJs, signal));

console.log("");
console.log("Physical Security Lens Report Polish Audit");
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
