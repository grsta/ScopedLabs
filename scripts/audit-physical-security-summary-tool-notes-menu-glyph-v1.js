const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-menu-glyph-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("index-marker", "Summary index", index, "physical-security-summary-tool-notes-menu-glyph-045");
has("summary-glyph-hidden-text", "Summary index", index, ".summary-note-actions summary {");
has("summary-glyph-font-zero", "Summary index", index, "font-size: 0;");
has("summary-glyph-before", "Summary index", index, ".summary-note-actions summary::before");
has("summary-glyph-ascii-content", "Summary index", index, 'content: "...";');
has("summary-glyph-open-color", "Summary index", index, ".summary-note-actions[open] summary::before");
has("script-menu-still-present", "Summary script", script, "summary-note-actions");
has("script-menu-actions-still-present", "Summary script", script, "Open Tool");
has("script-menu-delete-still-present", "Summary script", script, "Delete Note");

add(
  "script-not-modified-to-dots-cache",
  !script.includes("tool-notes-menu-dots-017") ? "SAFE" : "FAIL",
  !script.includes("tool-notes-menu-dots-017")
    ? "Summary script was not moved back into the risky dots cache lane"
    : "Summary script still contains dots cache lane"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Menu Glyph Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
