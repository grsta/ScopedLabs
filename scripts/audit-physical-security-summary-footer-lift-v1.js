const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-footer-lift-audit-001";

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

has("footer-lift-marker", "Summary index", index, "physical-security-summary-footer-lift-049");
has("footer-placement-still-present", "Summary index", index, "physical-security-summary-footer-placement-048");
has("main-min-height-auto", "Summary index", index, "min-height: auto;");
has("main-padding-bottom", "Summary index", index, "padding-bottom: 1rem;");
has("footer-margin-top", "Summary index", index, "margin-top: 1rem;");
has("footer-margin-bottom", "Summary index", index, "margin-bottom: 2rem;");
has("summary-script-safe-cache", "Summary script", script, "physical-security-summary-tool-notes-menu-016");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Footer Lift Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
