const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-wrap-audit-001";

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

has("wrap-marker", "Summary index", index, "physical-security-summary-tool-notes-wrap-051");
has("tool-notes-section-scope", "Summary index", index, "#physicalSecurityToolNotesSection");
has("fixed-table-layout", "Summary index", index, "table-layout: fixed;");
has("table-width-full", "Summary index", index, "width: 100%;");
has("area-column-width", "Summary index", index, "width: 30%;");
has("tool-column-width", "Summary index", index, "width: 18%;");
has("notes-column-width", "Summary index", index, "width: 52%;");
has("notes-wrap-anywhere", "Summary index", index, "overflow-wrap: anywhere;");
has("notes-white-space-normal", "Summary index", index, "white-space: normal;");
has("notes-word-break", "Summary index", index, "word-break: break-word;");
has("script-unchanged-safe-cache", "Summary script", script, "physical-security-summary-tool-notes-menu-016");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Wrap Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
