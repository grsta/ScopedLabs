const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryScriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const reportPath = path.join(root, "assets", "access-control-report-summary.js");
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary scope-view mode audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryScript = read(summaryScriptPath);
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

requireMarker(summaryScript, "summary script", "access-control-summary-scope-view-mode-0613");
requireMarker(summaryScript, "summary script", "accessControlSummaryScopeSelect");
requireMarker(summaryScript, "summary script", "recordsForSelectedSummaryScope");
requireMarker(summaryScript, "summary script", 'kpi("Active scope"');
requireMarker(summaryScript, "summary script", 'kpi("Scopes planned"');
requireMarker(summaryScript, "summary script", 'kpi("Guidance saved"');

requireMarker(report, "report asset", "access-control-report-summary-0613-separated-scope-tables");
requireMarker(report, "report asset", "data-summary-report-scope-section");
requireMarker(report, "report asset", "tableForScope");
requireMarker(report, "report asset", "summary-report-table--scope-section");
requireMarker(report, "report asset", "<th>Tool</th><th>Status</th><th>Saved guidance</th>");

requireMarker(html, "summary page", "access-control-summary-scope-view-mode-0613");
requireMarker(html, "summary page", "access-control-summary-scope-view-mode-0613");
requireMarker(html, "summary page", "access-control-report-summary-separated-scope-tables-0613");

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

if (!report.includes("2 scopes planned:")) {
  console.log("SAFE  report asset no longer combines multiple scope names into one row");
} else {
  console.log("FAIL  report asset still has combined multi-scope row wording");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SCREEN_SCOPE_SELECTOR");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SCREEN_ACTIVE_SCOPE_ONLY");
  console.log("SAFE  ACCESS_CONTROL_REPORT_EXPORT_ALL_SCOPES_SEPARATELY");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_SCOPE_VIEW_MODE_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
