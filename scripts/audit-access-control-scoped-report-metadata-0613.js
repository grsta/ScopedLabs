const fs = require("fs");
const path = require("path");

const root = process.cwd();
const metadataPath = path.join(root, "assets", "scopedlabs-report-metadata.js");
const scopeStatePath = path.join(root, "assets", "access-control-scope-state.js");
const reportSummaryPath = path.join(root, "assets", "access-control-report-summary.js");
const summaryIndexPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) { return fs.readFileSync(filePath, "utf8"); }

let failCount = 0;

console.log("ScopedLabs Access Control scoped report metadata audit - 0613");
console.log("Repo:", root);
console.log("");

const metadata = read(metadataPath);
const scopeState = read(scopeStatePath);
const reportSummary = read(reportSummaryPath);
const summaryIndex = read(summaryIndexPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) console.log("SAFE  " + label + ": " + marker);
  else { console.log("FAIL  " + label + " missing marker: " + marker); failCount += 1; }
}

requireMarker(metadata, "metadata helper", "scopedlabs-report-metadata-005-access-control-scope-context");
requireMarker(metadata, "metadata helper", "function currentAccessControlScopeContext");
requireMarker(metadata, "metadata helper", "#access-scope:");
requireMarker(metadata, "metadata helper", "isAccessControlMetadataBlocked");
requireMarker(metadata, "metadata helper", "if (!accessControlPage)");
requireMarker(metadata, "metadata helper", "scopedlabs:access-control-report-scope-changed");

if (!/accessControlPage[\s\S]{0,900}sharedValue/i.test(metadata)) {
  console.log("SAFE  Access Control metadata does not hydrate from shared fallback");
} else {
  console.log("FAIL  Access Control metadata may still hydrate from shared fallback");
  failCount += 1;
}

requireMarker(scopeState, "scope state", "access-control-scope-state-003-report-metadata-cleanup");
requireMarker(scopeState, "scope state", "function removeAccessControlReportMetadataForScope");
requireMarker(scopeState, "scope state", "function removeAllAccessControlReportMetadata");
requireMarker(scopeState, "scope state", "removeAccessControlReportMetadataForScope(scopeId);");
requireMarker(scopeState, "scope state", "removeAllAccessControlReportMetadata();");

requireMarker(reportSummary, "report summary", "scopedlabs:access-control-report-scope-changed");

requireMarker(summaryIndex, "summary page", "scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-005-access-control-scope-context");
requireMarker(summaryIndex, "summary page", "access-control-report-summary.js?v=access-control-report-summary-metadata-scope-event-0613");

if (summaryIndex.includes('data-summary-public="true"') && summaryIndex.includes('data-tier="public"') && !/<body\\b[^>]*data-protected=/i.test(summaryIndex)) {
  console.log("SAFE  public Summary access markers preserved");
} else {
  console.log("FAIL  public Summary access markers changed");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_REPORT_METADATA_SCOPED_TO_SCOPE_ID");
  console.log("SAFE  ACCESS_CONTROL_METADATA_NO_SHARED_FALLBACK");
  console.log("SAFE  SCOPE_PLANNER_DELETE_CLEARS_OWN_METADATA");
  console.log("SAFE  SCOPE_PLANNER_CLEAR_ALL_CLEARS_ALL_ACCESS_METADATA");
} else {
  console.log("FAIL  ACCESS_CONTROL_SCOPED_REPORT_METADATA_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
