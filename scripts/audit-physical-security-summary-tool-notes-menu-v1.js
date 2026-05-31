const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-menu-audit-001";
const SUMMARY_SCRIPT_CACHE = "physical-security-summary-tool-notes-menu-016";
const EXPORT_CACHE = "shared-export-025-tool-notes-column-widths";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const exportJs = read("assets/export.js");
const proof = read("scripts/audit-physical-security-summary-proof-v1.js");
const toolNotesAudit = read("scripts/audit-physical-security-summary-tool-notes-rollup-v1.js");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("summary-index-script-cache", "Summary index", index, "./script.js?v=" + SUMMARY_SCRIPT_CACHE);
has("summary-index-export-cache", "Summary index", index, "/assets/export.js?v=" + EXPORT_CACHE);
has("summary-index-marker", "Summary index", index, "physical-security-summary-tool-notes-menu-044");
has("summary-index-menu-css", "Summary index", index, ".summary-note-menu");
has("summary-index-kebab-css", "Summary index", index, ".summary-note-actions summary");

[
  "const VERSION = \"" + SUMMARY_SCRIPT_CACHE + "\";",
  "summary-note-actions",
  "summary-note-menu",
  "note-scope-cell",
  "data-export-ignore=\"true\"",
  "Open Tool",
  "Delete Note",
  "<th>Area / Zone</th><th>Tool</th><th>Tool-Specific Notes</th>",
  "bindToolNotesActions();"
].forEach((signal) => has("summary-script-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), "Summary script", script, signal));

add(
  "no-actions-column-header",
  !script.includes("<th data-export-ignore=\"true\">Actions</th>") ? "SAFE" : "FAIL",
  !script.includes("<th data-export-ignore=\"true\">Actions</th>")
    ? "Tool Notes no longer renders a dedicated Actions column"
    : "Tool Notes still renders a dedicated Actions column"
);

[
  "shared-export-025-tool-notes-column-widths",
  "function exportableTableCellText(cell)",
  "clone.querySelectorAll('[data-export-ignore=\"true\"]').forEach((item) => item.remove());",
  "text: exportableTableCellText(cell)"
].forEach((signal) => has("export-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), "export.js", exportJs, signal));

has("proof-version", "Summary proof audit", proof, "physical-security-summary-proof-audit-028-tool-notes-menu");
has("proof-script-cache", "Summary proof audit", proof, "./script.js?v=" + SUMMARY_SCRIPT_CACHE);
has("proof-export-cache", "Summary proof audit", proof, "/assets/export.js?v=" + EXPORT_CACHE);

has("tool-notes-audit-version", "Tool Notes rollup audit", toolNotesAudit, "physical-security-summary-tool-notes-area-context-audit-004-menu");
has("tool-notes-audit-script-cache", "Tool Notes rollup audit", toolNotesAudit, "./script.js?v=" + SUMMARY_SCRIPT_CACHE);
has("tool-notes-audit-table-header", "Tool Notes rollup audit", toolNotesAudit, "<th>Area / Zone</th><th>Tool</th><th>Tool-Specific Notes</th>");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Menu Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
