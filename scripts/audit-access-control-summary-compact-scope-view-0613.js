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

console.log("ScopedLabs Access Control compact scope-view audit - 0613");
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

requireMarker(summaryScript, "summary script", "All scopes / category rollup");
requireMarker(summaryScript, "summary script", "recordsForAllSummaryScopes");
requireMarker(summaryScript, "summary script", 'kpi("Scopes planned"');
requireMarker(summaryScript, "summary script", 'kpi("Guidance saved"');

if (!summaryScript.includes('kpi("Active scope"')) {
  console.log("SAFE  bulky Active scope KPI card removed");
} else {
  console.log("FAIL  bulky Active scope KPI card remains");
  failCount += 1;
}

requireMarker(report, "report asset", "access-control-report-summary-0613-multi-scope-kpi-print-selector");
requireMarker(report, "report asset", "accessControlReportScopeSelect");
requireMarker(report, "report asset", "Report scope");
requireMarker(report, "report asset", "All saved scopes");
requireMarker(report, "report asset", "data-summary-report-scope-section");
requireMarker(report, "report asset", "tableForScope");

requireMarker(html, "summary page", "access-control-summary-compact-scope-view-0613");
requireMarker(html, "summary page", "access-control-report-summary-print-selector-0613");

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
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_COMPACT_SCOPE_VIEW");
  console.log("SAFE  SCREEN_VIEW_DEFAULTS_TO_SINGLE_SCOPE");
  console.log("SAFE  SCREEN_VIEW_HAS_OPTIONAL_ALL_SCOPES");
  console.log("SAFE  REPORT_EXPORT_HAS_ONE_OR_ALL_SCOPE_SELECTOR");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_COMPACT_SCOPE_VIEW_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
