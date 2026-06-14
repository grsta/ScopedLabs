const fs = require("fs");
const path = require("path");

const root = process.cwd();
const metadataPath = path.join(root, "assets", "scopedlabs-report-metadata.js");
const scopePlannerIndexPath = path.join(root, "tools", "access-control", "scope-planner", "index.html");
const summaryIndexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control metadata active-scope label audit - 0613");
console.log("Repo:", root);
console.log("");

const metadata = read(metadataPath);
const scopePlanner = read(scopePlannerIndexPath);
const summary = read(summaryIndexPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(metadata, "metadata helper", "scopedlabs-report-metadata-007-active-scope-label");
requireMarker(metadata, "metadata helper", "function currentMetadataScopeLabel");
requireMarker(metadata, "metadata helper", "function refreshMetadataScopeLabels");
requireMarker(metadata, "metadata helper", "data-report-metadata-scope-label");
requireMarker(metadata, "metadata helper", "refreshMetadataScopeLabels(document);");
requireMarker(metadata, "metadata helper", "refreshMetadataScopeLabels(root);");
requireMarker(metadata, "metadata helper", "currentMetadataScopeLabel,");
requireMarker(metadata, "metadata helper", "refreshMetadataScopeLabels,");

requireMarker(scopePlanner, "scope planner page", "data-report-metadata-scope-card");
requireMarker(scopePlanner, "scope planner page", "data-report-metadata-scope-label");
requireMarker(scopePlanner, "scope planner page", "Active scope:");
requireMarker(scopePlanner, "scope planner page", "scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-007-active-scope-label");

requireMarker(summary, "summary page", "scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-007-active-scope-label");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_METADATA_ACTIVE_SCOPE_LABEL_READY");
  console.log("SAFE  SCOPE_PLANNER_SHOWS_METADATA_SCOPE_OWNER");
} else {
  console.log("FAIL  ACCESS_CONTROL_METADATA_ACTIVE_SCOPE_LABEL_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
