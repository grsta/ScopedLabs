const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-menu-flow-audit-001";

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

has("index-marker", "Summary index", index, "physical-security-summary-tool-notes-menu-flow-046");
has("open-menu-static", "Summary index", index, ".summary-note-actions[open] .summary-note-menu");
has("position-static", "Summary index", index, "position: static;");
has("right-auto", "Summary index", index, "right: auto;");
has("top-auto", "Summary index", index, "top: auto;");
has("no-overlay-shadow", "Summary index", index, "box-shadow: none;");
has("nowrap-actions", "Summary index", index, "white-space: nowrap;");
has("glyph-patch-still-present", "Summary index", index, "physical-security-summary-tool-notes-menu-glyph-045");
has("script-menu-still-present", "Summary script", script, "summary-note-actions");
has("script-untouched-cache", "Summary script", script, "physical-security-summary-tool-notes-menu-016");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Menu Flow Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
