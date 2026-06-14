const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryAssetPath = path.join(root, "assets", "access-control-report-summary.js");
const summaryPagePath = path.join(root, "tools", "access-control", "summary", "index.html");
const exportPath = path.join(root, "assets", "export.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control Summary scope metadata body audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryAsset = read(summaryAssetPath);
const summaryPage = read(summaryPagePath);
const exportJs = read(exportPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(summaryAsset, "summary asset", "function scopeReportMetadataBlock");
requireMarker(summaryAsset, "summary asset", "scopeReportMetadataBlock(scope) +");
requireMarker(summaryAsset, "summary asset", "summary-report-table--scope-metadata");
requireMarker(summaryAsset, "summary asset", "extra-export-table--access-control-summary-metadata");
requireMarker(summaryAsset, "summary asset", "scopedlabs:report-metadata:page:/tools/access-control/#access-scope:");
requireMarker(summaryAsset, "summary asset", "data-access-control-report-scope=");
requireMarker(summaryAsset, "summary asset", "data-access-control-all-scopes-report=");

requireMarker(exportJs, "export engine", "data-access-control-all-scopes-report");
requireMarker(exportJs, "export engine", "projectDetails && !suppressGlobalReportMetadata");

requireMarker(summaryPage, "summary page", "/assets/access-control-report-summary.js?v=access-control-report-summary-scope-metadata-body-0613");
requireMarker(summaryPage, "summary page", "/assets/export.js?v=shared-export-029-access-control-all-scope-dom-flag");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  EACH_SCOPE_SECTION_PRINTS_ITS_METADATA_BODY");
  console.log("SAFE  ALL_SCOPES_REPORT_HAS_DOM_FLAG_FOR_METADATA_SUPPRESSION");
} else {
  console.log("FAIL  ACCESS_CONTROL_SCOPE_METADATA_BODY_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
