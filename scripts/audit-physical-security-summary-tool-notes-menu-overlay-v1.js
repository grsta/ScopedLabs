const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-menu-overlay-audit-001";

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

has("index-marker", "Summary index", index, "physical-security-summary-tool-notes-menu-overlay-047");
has("tool-notes-section-overflow", "Summary index", index, "#physicalSecurityToolNotesSection");
has("table-overflow-visible", "Summary index", index, ".summary-tool-notes-table td");
has("actions-z-index", "Summary index", index, "z-index: 5000;");
has("menu-z-index", "Summary index", index, "z-index: 5001;");
has("menu-position-absolute", "Summary index", index, "position: absolute;");
has("menu-top-offset", "Summary index", index, "top: calc(100% + .35rem);");
has("menu-right-zero", "Summary index", index, "right: 0;");
has("menu-overlay-shadow", "Summary index", index, "0 16px 40px rgba(0, 0, 0, .48)");
has("glyph-patch-still-present", "Summary index", index, "physical-security-summary-tool-notes-menu-glyph-045");
has("script-menu-still-present", "Summary script", script, "summary-note-actions");
has("script-cache-still-safe", "Summary script", script, "physical-security-summary-tool-notes-menu-016");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Menu Overlay Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
