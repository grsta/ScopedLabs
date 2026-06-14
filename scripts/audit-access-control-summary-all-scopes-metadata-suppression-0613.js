const fs = require("fs");
const path = require("path");

const root = process.cwd();

const exportPath = path.join(root, "assets", "export.js");
const summaryPagePath = path.join(root, "tools", "access-control", "summary", "index.html");
const summaryAssetPath = path.join(root, "assets", "access-control-report-summary.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control Summary all-scopes metadata suppression audit - 0613");
console.log("Repo:", root);
console.log("");

const exportJs = read(exportPath);
const summaryPage = read(summaryPagePath);
const summaryAsset = read(summaryAssetPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(exportJs, "export engine", "shared-export-027-access-control-all-scopes-metadata-suppression");
requireMarker(exportJs, "export engine", "const suppressGlobalReportMetadata = (function ()");
requireMarker(exportJs, "export engine", "data-access-control-report-summary");
requireMarker(exportJs, "export engine", "accessControlReportScopeSelect");
requireMarker(exportJs, "export engine", "trim() === \"__all__\"");
requireMarker(exportJs, "export engine", "projectDetails && !suppressGlobalReportMetadata");

requireMarker(summaryPage, "summary page", "/assets/export.js?v=shared-export-027-access-control-all-scopes-metadata-suppression");
requireMarker(summaryPage, "summary page", "/assets/access-control-report-summary.js?v=access-control-report-summary-per-scope-metadata-export-0613");

requireMarker(summaryAsset, "summary asset", "scopeReportMetadataBlock(scope)");
requireMarker(summaryAsset, "summary asset", "summary-report-table--scope-metadata");
requireMarker(summaryAsset, "summary asset", "scopedlabs:report-metadata:page:/tools/access-control/#access-scope:");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ALL_SCOPES_EXPORT_SUPPRESSES_TOP_ACTIVE_SCOPE_METADATA");
  console.log("SAFE  PER_SCOPE_METADATA_TABLES_REMAIN_AVAILABLE");
} else {
  console.log("FAIL  ALL_SCOPES_METADATA_SUPPRESSION_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
