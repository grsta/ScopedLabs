const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-footer-placement-audit-001";

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

has("footer-marker", "Summary index", index, "physical-security-summary-footer-placement-048");
has("footer-tool-selector", "Summary index", index, 'body[data-tool="physical-security-summary"] > footer');
has("footer-step-selector", "Summary index", index, 'body[data-step="physical-security-summary"] > footer');
has("footer-centered-margin", "Summary index", index, "margin: 2.5rem auto 1.25rem;");
has("footer-static-position", "Summary index", index, "position: static;");
has("footer-max-width", "Summary index", index, "max-width: 1100px;");
has("footer-width-min", "Summary index", index, "width: min(1100px, calc(100% - 2rem));");
has("footer-nav-flex", "Summary index", index, "flex-wrap: wrap;");
has("summary-script-unchanged-safe-cache", "Summary script", script, "physical-security-summary-tool-notes-menu-016");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Footer Placement Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
