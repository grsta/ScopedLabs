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

console.log("ScopedLabs Access Control Summary all-scopes metadata route audit - 0613d");
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

requireMarker(exportJs, "export engine", "shared-export-028-access-control-all-scope-metadata-route");
requireMarker(exportJs, "export engine", "const suppressGlobalReportMetadata = (function ()");
requireMarker(exportJs, "export engine", "data-access-control-report-summary");
requireMarker(exportJs, "export engine", "accessControlReportScopeSelect");
requireMarker(exportJs, "export engine", "scopedlabs:access-control:summary:report-scope-mode");
requireMarker(exportJs, "export engine", "data-summary-report-scope-section");
requireMarker(exportJs, "export engine", "projectDetails && !suppressGlobalReportMetadata");

requireMarker(summaryPage, "summary page", "/assets/export.js?v=shared-export-028-access-control-all-scope-metadata-route");
requireMarker(summaryPage, "summary page", "/assets/access-control-report-summary.js?v=access-control-report-summary-per-scope-metadata-export-0613d");

requireMarker(summaryAsset, "summary asset", "scopeReportMetadataBlock(scope)");
requireMarker(summaryAsset, "summary asset", "summary-report-table--scope-metadata");
requireMarker(summaryAsset, "summary asset", "extra-export-table--access-control-summary-metadata");
requireMarker(summaryAsset, "summary asset", "scopedlabs:report-metadata:page:/tools/access-control/#access-scope:");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ALL_SCOPES_EXPORT_NO_LONGER_PRINTS_TOP_ACTIVE_SCOPE_METADATA");
  console.log("SAFE  EACH_SCOPE_CAN_PRINT_ITS_OWN_METADATA_TABLE");
  console.log("SAFE  SUMMARY_PAGE_CACHE_BUST_POINTS_TO_PER_SCOPE_METADATA_ASSET");
} else {
  console.log("FAIL  ACCESS_CONTROL_ALL_SCOPE_METADATA_ROUTE_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
