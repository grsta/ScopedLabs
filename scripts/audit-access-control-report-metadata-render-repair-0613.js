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

console.log("ScopedLabs Access Control report metadata render repair audit - 0613");
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

requireMarker(metadata, "metadata helper", "scopedlabs-report-metadata-006-access-control-render-repair");
requireMarker(metadata, "metadata helper", "function renderMount");
requireMarker(metadata, "metadata helper", "function fieldHtml");
requireMarker(metadata, "metadata helper", "<input id=");
requireMarker(metadata, "metadata helper", "<textarea id=");
requireMarker(metadata, "metadata helper", "currentAccessControlScopeContext");
requireMarker(metadata, "metadata helper", "#access-scope:");
requireMarker(metadata, "metadata helper", "window.ScopedLabsReportMetadata");

requireMarker(scopePlanner, "scope planner", "id=\"reportMetadataMount\"");
requireMarker(scopePlanner, "scope planner", "data-report-metadata");
requireMarker(scopePlanner, "scope planner", "data-collapsed=\"false\"");
requireMarker(scopePlanner, "scope planner", "scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-006-access-control-render-repair");

requireMarker(summary, "summary", "scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-006-access-control-render-repair");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_REPORT_METADATA_RENDER_HELPER_REPAIRED");
  console.log("SAFE  SCOPE_PLANNER_METADATA_FIELDS_SHOULD_RENDER_OPEN");
  console.log("SAFE  ACCESS_CONTROL_SCOPE_METADATA_KEYING_PRESERVED");
} else {
  console.log("FAIL  ACCESS_CONTROL_REPORT_METADATA_RENDER_REPAIR_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
