const fs = require("fs");
const path = require("path");

const root = process.cwd();
const reportPath = path.join(root, "assets", "access-control-report-summary.js");
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary export column widths audit - 0613");
console.log("Repo:", root);
console.log("");

const report = read(reportPath);
const html = read(indexPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(report, "report asset", "access-control-report-summary-0613-export-column-widths");
requireMarker(report, "report asset", "summary-report-col-tool");
requireMarker(report, "report asset", "summary-report-col-status");
requireMarker(report, "report asset", "summary-report-col-guidance");
requireMarker(report, "report asset", "style='width:22%'");
requireMarker(report, "report asset", "style='width:12%'");
requireMarker(report, "report asset", "style='width:66%'");

requireMarker(html, "summary page", "access-control-summary-export-column-widths-0613");
requireMarker(html, "summary page", ".summary-report-col-tool");
requireMarker(html, "summary page", ".summary-report-col-status");
requireMarker(html, "summary page", ".summary-report-col-guidance");
requireMarker(html, "summary page", "width: 22%");
requireMarker(html, "summary page", "width: 12%");
requireMarker(html, "summary page", "width: 66%");

if (
  html.includes('data-summary-public="true"') &&
  html.includes('data-tier="public"') &&
  !/<body\b[^>]*data-protected=/i.test(html)
) {
  console.log("SAFE  public Summary access markers preserved");
} else {
  console.log("FAIL  public Summary access markers changed");
  failCount += 1;
}

if (
  report.includes("data-summary-report-scope-section") &&
  report.includes("tableForScope") &&
  report.includes("access-control-report-summary-0613-separated-scope-tables")
) {
  console.log("SAFE  separated scope report contract preserved");
} else {
  console.log("FAIL  separated scope report contract changed");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_EXPORT_COLUMNS_COMPACT");
  console.log("SAFE  SAVED_GUIDANCE_COLUMN_EXPANDED");
  console.log("SAFE  SCOPE_REPORT_TABLES_PRESERVED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_EXPORT_COLUMN_WIDTHS_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
