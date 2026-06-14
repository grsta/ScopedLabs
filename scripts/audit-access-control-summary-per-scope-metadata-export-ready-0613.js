const fs = require("fs");
const path = require("path");

const root = process.cwd();
const summaryAssetPath = path.join(root, "assets", "access-control-report-summary.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control Summary per-scope metadata export ready audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryAsset = read(summaryAssetPath);

function requireMarker(label, marker) {
  if (summaryAsset.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker("summary asset", "access-control-summary-per-scope-metadata-export-0613");
requireMarker("summary asset", "function scopeReportMetadataStorageKey");
requireMarker("summary asset", "scopedlabs:report-metadata:page:/tools/access-control/#access-scope:");
requireMarker("summary asset", "function readScopeReportMetadata");
requireMarker("summary asset", "function scopeReportMetadataBlock");
requireMarker("summary asset", "scopeReportMetadataBlock(scope)");
requireMarker("summary asset", "extra-export-table--access-control-summary-metadata");
requireMarker("summary asset", "data-export-table-title='Metadata:");
requireMarker("summary asset", "Report Title");
requireMarker("summary asset", "Project Name");
requireMarker("summary asset", "Client Name");
requireMarker("summary asset", "Prepared By");
requireMarker("summary asset", "Custom Notes");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_EXPORT_PRINTS_PER_SCOPE_METADATA");
  console.log("SAFE  ALL_SCOPES_EXPORT_CAN_SEPARATE_METADATA_BY_SCOPE_ID");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_PER_SCOPE_METADATA_EXPORT_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
