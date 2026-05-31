const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-actions-audit-004-menu-current";
const SUMMARY_CACHE = "physical-security-summary-tool-notes-menu-016";
const EXPORT_CACHE = "shared-export-024-report-text-wrap";
const PROOF_VERSION = "physical-security-summary-proof-audit-028-tool-notes-menu";
const ROLLUP_VERSION = "physical-security-summary-tool-notes-area-context-audit-004-menu";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const exportJs = read("assets/export.js");
const proof = read("scripts/audit-physical-security-summary-proof-v1.js");
const rollup = read("scripts/audit-physical-security-summary-tool-notes-rollup-v1.js");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("summary-index-script-cache", "Summary index", index, "./script.js?v=" + SUMMARY_CACHE);
has("summary-index-export-cache", "Summary index", index, "/assets/export.js?v=" + EXPORT_CACHE);
has("summary-index-menu-marker", "Summary index", index, "physical-security-summary-tool-notes-menu-044");

has("summary-script-cache", "Summary script", script, 'const VERSION = "' + SUMMARY_CACHE + '";');
has("summary-script-tool-url-helper", "Summary script", script, "function toolNoteUrl(slug)");
has("summary-script-delete-helper", "Summary script", script, "function deleteToolNote(storageKey)");
has("summary-script-bind-actions", "Summary script", script, "function bindToolNotesActions()");
has("summary-script-delete-key", "Summary script", script, "data-tool-note-delete-key");
has("summary-script-delete-label", "Summary script", script, "data-tool-note-delete-label");
has("summary-script-open-tool", "Summary script", script, "Open Tool");
has("summary-script-delete-note", "Summary script", script, "Delete Note");
has("summary-script-storage-key", "Summary script", script, 'storageKey: page.storageKey || ""');
has("summary-script-tool-href", "Summary script", script, "href: toolNoteUrl(slug)");
has("summary-script-payload-href", "Summary script", script, 'href: row.href || ""');
has("summary-script-menu-shell", "Summary script", script, "summary-note-actions");
has("summary-script-menu-panel", "Summary script", script, "summary-note-menu");
has("summary-script-note-scope-cell", "Summary script", script, "note-scope-cell");
has("summary-script-export-ignore", "Summary script", script, 'data-export-ignore="true"');
has("summary-script-table-header", "Summary script", script, "<th>Area / Zone</th><th>Tool</th><th>Tool-Specific Notes</th>");
has("summary-script-bind-after-render", "Summary script", script, "bindToolNotesActions();");
has("summary-script-delete-only-note", "Summary script", script, 'data.customNotes = "";');

add(
  "actions-column-retired",
  !script.includes('<th data-export-ignore="true">Actions</th>') ? "SAFE" : "FAIL",
  !script.includes('<th data-export-ignore="true">Actions</th>')
    ? "Actions column is retired in favor of the compact Area / Zone menu"
    : "Actions column still exists"
);

add(
  "delete-preserves-storage-record",
  script.includes('data.customNotes = "";') && !script.includes("window.localStorage.removeItem(key)") ? "SAFE" : "FAIL",
  script.includes('data.customNotes = "";') && !script.includes("window.localStorage.removeItem(key)")
    ? "Delete action clears customNotes without removing the storage record"
    : "Delete action may remove more than customNotes"
);

has("export-ignore-children-version", "export.js", exportJs, EXPORT_CACHE);
has("export-ignore-child-helper", "export.js", exportJs, "function exportableTableCellText(cell)");
has("export-removes-action-children", "export.js", exportJs, 'clone.querySelectorAll(\'[data-export-ignore="true"]\').forEach((item) => item.remove());');

has("proof-version", "Summary proof audit", proof, PROOF_VERSION);
has("proof-script-cache", "Summary proof audit", proof, "./script.js?v=" + SUMMARY_CACHE);
has("proof-export-cache", "Summary proof audit", proof, "/assets/export.js?v=" + EXPORT_CACHE);

has("rollup-version", "Tool Notes rollup audit", rollup, ROLLUP_VERSION);
has("rollup-script-cache", "Tool Notes rollup audit", rollup, "./script.js?v=" + SUMMARY_CACHE);
has("rollup-table-header", "Tool Notes rollup audit", rollup, "<th>Area / Zone</th><th>Tool</th><th>Tool-Specific Notes</th>");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Actions Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
