const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-actions-audit-002";
const SUMMARY_SCRIPT_CACHE = "physical-security-summary-tool-notes-actions-015";
const EXPORT_CACHE = "shared-export-022-ignore-table-actions";

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
has("summary-index-marker", "Summary index", index, "physical-security-summary-tool-notes-actions-043");

[
  "const VERSION = \"" + SUMMARY_SCRIPT_CACHE + "\";",
  "function toolNoteUrl(slug)",
  "function deleteToolNote(storageKey)",
  "function bindToolNotesActions()",
  "data-tool-note-delete-key",
  "data-tool-note-delete-label",
  "Delete Note",
  "Open Tool",
  "This only removes the note, not the saved area, calculation, guidance, report data, or snapshot.",
  "storageKey: page.storageKey || \"\"",
  "href: toolNoteUrl(slug)",
  "<th data-export-ignore=\"true\">Actions</th>",
  "bindToolNotesActions();",
  "href: row.href || \"\""
].forEach((signal) => has("summary-script-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), "Summary script", script, signal));

[
  "shared-export-022-ignore-table-actions",
  "data-export-ignore",
  "cell.dataset?.exportIgnore !== \"true\"",
  "cell.getAttribute(\"data-export-ignore\") !== \"true\""
].forEach((signal) => has("export-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), "export.js", exportJs, signal));

has("proof-version", "Summary proof audit", proof, "physical-security-summary-proof-audit-027-tool-notes-actions");
has("proof-script-cache", "Summary proof audit", proof, "./script.js?v=" + SUMMARY_SCRIPT_CACHE);
has("proof-export-cache", "Summary proof audit", proof, "/assets/export.js?v=" + EXPORT_CACHE);

has("tool-notes-audit-version", "Tool Notes rollup audit", toolNotesAudit, "physical-security-summary-tool-notes-area-context-audit-003-actions");
has("tool-notes-audit-script-cache", "Tool Notes rollup audit", toolNotesAudit, "./script.js?v=" + SUMMARY_SCRIPT_CACHE);
has("tool-notes-audit-version-cache", "Tool Notes rollup audit", toolNotesAudit, SUMMARY_SCRIPT_CACHE);

const deletesOnlyCustomNotes = script.includes("data.customNotes = \"\";") && !script.includes("window.localStorage.removeItem(key)");
add(
  "delete-preserves-storage-record",
  deletesOnlyCustomNotes ? "SAFE" : "FAIL",
  deletesOnlyCustomNotes
    ? "Delete action clears customNotes without removing the storage record"
    : "Delete action may remove more than customNotes"
);

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
