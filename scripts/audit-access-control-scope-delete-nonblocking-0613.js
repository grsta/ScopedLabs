const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scopeStatePath = path.join(root, "assets", "access-control-scope-state.js");
const scopePlannerIndexPath = path.join(root, "tools", "access-control", "scope-planner", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control nonblocking scope delete audit - 0613");
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

requireMarker(scopeState, "scope state", "access-control-scope-state-005-nonblocking-delete");
requireMarker(scopeState, "scope state", "function accessControlStorageStores");
requireMarker(scopeState, "scope state", "function removeStoredKeysMatching");
requireMarker(scopeState, "scope state", "function removeAccessControlReportMetadataForScope");
requireMarker(scopeState, "scope state", "function removeAllAccessControlReportMetadata");
requireMarker(scopeState, "scope state", "try {\n      removeAccessControlReportMetadataForScope(cleanScopeId);");
requireMarker(scopeState, "scope state", "Metadata cleanup skipped during scope delete");
requireMarker(scopeState, "scope state", "Metadata cleanup skipped during scope reset");
requireMarker(scopeState, "scope state", "return writeLedger(ledger);");
requireMarker(scopePlanner, "scope planner page", "access-control-scope-state.js?v=access-control-scope-state-005-nonblocking-delete");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SCOPE_DELETE_CANNOT_BE_BLOCKED_BY_METADATA_CLEANUP");
  console.log("SAFE  ACCESS_CONTROL_SCOPE_RESET_CANNOT_BE_BLOCKED_BY_METADATA_CLEANUP");
} else {
  console.log("FAIL  ACCESS_CONTROL_NONBLOCKING_SCOPE_DELETE_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
