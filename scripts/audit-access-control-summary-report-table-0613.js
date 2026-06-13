const fs = require("fs");
const path = require("path");

const root = process.cwd();
const reportPath = path.join(root, "assets", "access-control-report-summary.js");
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary report table audit - 0613");
console.log("Repo:", root);
console.log("");

const report = read(reportPath);
const html = read(indexPath);

if (report.includes('access-control-report-summary-0613-table-layout')) {
  console.log("SAFE  report summary asset version is table-layout");
} else {
  console.log("FAIL  report summary asset version not updated");
  failCount += 1;
}

if (
  report.includes("summary-report-table") &&
  report.includes("summary-report-tool-cell") &&
  report.includes("summary-report-status-cell") &&
  report.includes("summary-report-guidance-cell")
) {
  console.log("SAFE  report summary renderer emits structured table cells");
} else {
  console.log("FAIL  report summary renderer missing structured table cells");
  failCount += 1;
}

if (
  report.includes("<th>Tool</th><th>Status</th><th>Saved guidance</th>") ||
  report.includes("<th>Tool</th>") && report.includes("<th>Status</th>") && report.includes("<th>Saved guidance</th>")
) {
  console.log("SAFE  report summary renderer emits Tool / Status / Saved guidance headers");
} else {
  console.log("FAIL  report summary renderer missing expected table headers");
  failCount += 1;
}

if (
  html.includes("access-control-summary-report-table-0613") &&
  html.includes(".summary-report-table") &&
  html.includes(".summary-report-status--pending") &&
  html.includes(".summary-report-status--saved")
) {
  console.log("SAFE  summary page has active-scope style report table rules");
} else {
  console.log("FAIL  summary page missing report table style rules");
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
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_REPORT_TABLE_STRUCTURED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_REPORT_TABLE_SCOPE_STYLE");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PUBLIC_ACCESS_PRESERVED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_REPORT_TABLE_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
