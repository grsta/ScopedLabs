const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-print-header-fix-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/summary/index.html");
const exportJs = read("assets/export.js");
const proofAudit = read("scripts/audit-physical-security-summary-proof-v1.js");

const rows = [];

function add(name, status, detail) {
  rows.push({ name, status, detail });
}

[
  "/assets/export.js?v=shared-export-025-tool-notes-column-widths",
  "physical-security-summary-print-header-fix-036"
].forEach((signal) => {
  add(
    "summary-index-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    index.includes(signal) ? "SAFE" : "FAIL",
    index.includes(signal) ? "summary index contains " + signal : "summary index missing " + signal
  );
});

[
  "function directTableRowCells(row)",
  "function cleanExtraTableText(value)",
  "const headerRows = Array.from(table.querySelectorAll(\":scope > thead > tr\"));",
  "firstHeaderLooksLikeTitle",
  "title: tableTitle",
  "const tableTitleBlock = table.title",
  "extra-table-title"
].forEach((signal) => {
  add(
    "export-title-row-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    exportJs.includes(signal) ? "SAFE" : "FAIL",
    exportJs.includes(signal) ? "export.js contains " + signal : "export.js missing " + signal
  );
});

add(
  "proof-audit-export-cache-current",
  proofAudit.includes("/assets/export.js?v=shared-export-025-tool-notes-column-widths") ? "SAFE" : "FAIL",
  proofAudit.includes("/assets/export.js?v=shared-export-025-tool-notes-column-widths")
    ? "summary proof audit expects current export cache"
    : "summary proof audit still expects old export cache"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Print Header Fix Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
