const fs = require("fs");
const path = require("path");

const root = process.cwd();
const summaryScriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const reportAssetPath = path.join(root, "assets", "access-control-report-summary.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary scope-root filter audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryScript = read(summaryScriptPath);
const reportAsset = read(reportAssetPath);

if (
  summaryScript.includes("access-control-summary-scope-root-filter-0613") &&
  summaryScript.includes("readSummaryScopeLedger") &&
  summaryScript.includes("filterGuidanceRecordsToActiveScopes")
) {
  console.log("SAFE  summary script has scope-root guidance filter");
} else {
  console.log("FAIL  summary script missing scope-root guidance filter");
  failCount += 1;
}

if (summaryScript.includes("return filterGuidanceRecordsToActiveScopes(records);")) {
  console.log("SAFE  summary readGuidanceRecords returns filtered records");
} else {
  console.log("FAIL  summary readGuidanceRecords does not return filtered records");
  failCount += 1;
}

if (summaryScript.includes("scopedlabs:access-control-guidance-updated")) {
  console.log("SAFE  summary render refresh event is dispatched");
} else {
  console.log("FAIL  summary render refresh event missing");
  failCount += 1;
}

if (
  reportAsset.includes("access-control-report-summary-0613-scope-root-filter") &&
  reportAsset.includes("filterGuidanceRecordsToActiveScopes") &&
  reportAsset.includes("scopedlabs:access-control-scope-updated")
) {
  console.log("SAFE  report summary asset also filters by current scope ledger");
} else {
  console.log("FAIL  report summary asset missing scope-root filter");
  failCount += 1;
}

if (
  reportAsset.includes("summary-report-table") &&
  reportAsset.includes("<th>Tool</th><th>Status</th><th>Saved guidance</th>")
) {
  console.log("SAFE  report table structure preserved");
} else {
  console.log("FAIL  report table structure changed");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SCOPE_ROOT_FILTERED");
  console.log("SAFE  NO_SCOPE_MEANS_NO_CURRENT_GUIDANCE_COUNT");
  console.log("SAFE  ACCESS_CONTROL_REPORT_SUMMARY_SCOPE_ROOT_FILTERED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_SCOPE_ROOT_FILTER_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
