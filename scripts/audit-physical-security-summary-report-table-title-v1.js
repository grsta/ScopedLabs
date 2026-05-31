const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-report-table-title-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");
const exportJs = read("assets/export.js");

const rows = [];

function add(name, status, detail) {
  rows.push({ name, status, detail });
}

[
  "/assets/physical-security-report-summary.js?v=physical-security-report-summary-029-area-step-table-title",
  "physical-security-summary-report-table-title-fix-037"
].forEach((signal) => {
  add(
    "summary-index-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    index.includes(signal) ? "SAFE" : "FAIL",
    index.includes(signal) ? "summary index contains " + signal : "summary index missing " + signal
  );
});

[
  'const VERSION = "physical-security-report-summary-029-area-step-table-title";',
  'const tableTitle = "Tool / Area Step Results - " + scopeText;',
  'data-export-table-title="',
  '<thead><tr><th>Tool / Area Step</th><th>Status</th><th>Area / Zone Detail</th></tr></thead>',
  'data-sl-physical-security-area-zone-tool-table="true"'
].forEach((signal) => {
  add(
    "report-summary-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    report.includes(signal) ? "SAFE" : "FAIL",
    report.includes(signal) ? "report summary contains " + signal : "report summary missing " + signal
  );
});

add(
  "report-summary-no-jammed-first-header",
  !report.includes('physical-security-area-zone-tool-heading') && !report.includes("const firstHeader =") ? "SAFE" : "FAIL",
  !report.includes('physical-security-area-zone-tool-heading') && !report.includes("const firstHeader =")
    ? "report summary no longer injects area title into first table header cell"
    : "report summary still injects area title into first table header cell"
);

[
  "table.dataset?.exportTableTitle",
  "const tableTitleBlock = table.title",
  "extra-table-title"
].forEach((signal) => {
  add(
    "export-table-title-support-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    exportJs.includes(signal) ? "SAFE" : "FAIL",
    exportJs.includes(signal) ? "export.js supports " + signal : "export.js missing " + signal
  );
});

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Report Table Title Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
