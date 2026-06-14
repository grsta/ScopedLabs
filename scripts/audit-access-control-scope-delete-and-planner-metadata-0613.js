const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scopeStatePath = path.join(root, "assets", "access-control-scope-state.js");
const scopePlannerIndexPath = path.join(root, "tools", "access-control", "scope-planner", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control scope delete and planner metadata audit - 0613");
console.log("Repo:", root);
console.log("");

const scopeState = read(scopeStatePath);
const scopePlanner = read(scopePlannerIndexPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(scopeState, "scope state", "access-control-scope-state-004-report-metadata-delete-repair");
requireMarker(scopeState, "scope state", "function accessControlStorageStores");
requireMarker(scopeState, "scope state", "function removeStoredKeysMatching");
requireMarker(scopeState, "scope state", "function removeAccessControlReportMetadataForScope");
requireMarker(scopeState, "scope state", "function removeAllAccessControlReportMetadata");
requireMarker(scopeState, "scope state", "removeAccessControlReportMetadataForScope(cleanScopeId);");
requireMarker(scopeState, "scope state", "removeAllAccessControlReportMetadata();");
requireMarker(scopeState, "scope state", "key.includes(\"#access-scope:\")");

requireMarker(scopePlanner, "scope planner page", "data-access-control-scope-report-metadata=\"true\"");
requireMarker(scopePlanner, "scope planner page", "id=\"reportMetadataMount\"");
requireMarker(scopePlanner, "scope planner page", "data-report-metadata");
requireMarker(scopePlanner, "scope planner page", "scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-005-access-control-scope-context");
requireMarker(scopePlanner, "scope planner page", "access-control-scope-state.js?v=access-control-scope-state-004-report-metadata-delete-repair");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SCOPE_DELETE_METADATA_CLEANUP_REPAIRED");
  console.log("SAFE  ACCESS_CONTROL_SCOPE_PLANNER_METADATA_CARD_PRESENT");
  console.log("SAFE  DOWNSTREAM_TOOL_NOTES_LEFT_FOR_SEPARATE_LANE");
} else {
  console.log("FAIL  ACCESS_CONTROL_SCOPE_DELETE_PLANNER_METADATA_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
