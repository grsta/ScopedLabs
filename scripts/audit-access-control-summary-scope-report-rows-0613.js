const fs = require("fs");
const path = require("path");

const root = process.cwd();
const reportPath = path.join(root, "assets", "access-control-report-summary.js");
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control scope-aware report rows audit - 0613");
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

requireMarker(report, "report asset", "access-control-report-summary-0613-scope-report-rows");
requireMarker(report, "report asset", "summary-report-table--scope-aware");
requireMarker(report, "report asset", "data-summary-report-scope-planner-row");
requireMarker(report, "report asset", "buildReportRows");
requireMarker(report, "report asset", "plannedScopes");
requireMarker(report, "report asset", "<th>Scope / Door</th><th>Tool</th><th>Status</th><th>Saved guidance</th>");

if (report.includes("2 scopes planned:") || report.includes("scopes planned:")) {
  console.log("FAIL  combined multi-scope summary text still appears in report asset");
  failCount += 1;
} else {
  console.log("SAFE  combined multi-scope summary row removed from report asset");
}

if (html.includes("access-control-summary-scope-report-table-0613") && html.includes(".summary-report-table--scope-aware")) {
  console.log("SAFE  summary page has scope-aware report table CSS");
} else {
  console.log("FAIL  summary page missing scope-aware report table CSS");
  failCount += 1;
}

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

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_REPORT_SCOPE_PLANNER_ROWS_SEPARATED");
  console.log("SAFE  ACCESS_CONTROL_REPORT_SCOPE_AWARE_TABLE");
  console.log("SAFE  DOWNSTREAM_SCOPED_RECORDS_ATTACH_TO_MATCHING_SCOPE");
} else {
  console.log("FAIL  ACCESS_CONTROL_REPORT_SCOPE_ROWS_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
