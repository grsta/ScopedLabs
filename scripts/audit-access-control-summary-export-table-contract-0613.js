const fs = require("fs");
const path = require("path");

const root = process.cwd();
const exportPath = path.join(root, "assets", "export.js");
const reportPath = path.join(root, "assets", "access-control-report-summary.js");
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary export table contract audit - 0613");
console.log("Repo:", root);
console.log("");

const exportJs = read(exportPath);
const reportJs = read(reportPath);
const html = read(indexPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(exportJs, "export.js", "shared-export-026-extra-table-metadata");
requireMarker(exportJs, "export.js", "table.dataset?.exportTableClass");
requireMarker(exportJs, "export.js", "data-export-col-widths");
requireMarker(exportJs, "export.js", "colgroupHtml");
requireMarker(exportJs, "export.js", "$" + "{colgroupHtml}");
requireMarker(exportJs, "export.js", "extra-export-table--access-control-summary-report");
requireMarker(exportJs, "export.js", "width:22%");
requireMarker(exportJs, "export.js", "width:12%");
requireMarker(exportJs, "export.js", "width:66%");

requireMarker(reportJs, "report asset", "access-control-report-summary-0613-export-table-contract");
requireMarker(reportJs, "report asset", "data-export-table-class=\'extra-export-table--access-control-summary-report\'");
requireMarker(reportJs, "report asset", "data-export-col-widths=\'22,12,66\'");
requireMarker(reportJs, "report asset", "data-export-table-title=\'Scope: ");
requireMarker(reportJs, "report asset", "summary-report-table--scope-section");

requireMarker(html, "summary page", "export.js?v=shared-export-026-extra-table-metadata");
requireMarker(html, "summary page", "access-control-report-summary.js?v=access-control-report-summary-export-table-contract-0613");

if (
  html.includes('data-summary-public="true"') &&
  html.includes('data-tier="public"') &&
  !/<body\\b[^>]*data-protected=/i.test(html)
) {
  console.log("SAFE  public Summary access markers preserved");
} else {
  console.log("FAIL  public Summary access markers changed");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  EXPORT_ENGINE_PRESERVES_EXTRA_TABLE_METADATA");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_REPORT_EXPORT_WIDTHS_PRESERVED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_REPORT_SCOPE_TITLES_PRESERVED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_EXPORT_TABLE_CONTRACT_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
