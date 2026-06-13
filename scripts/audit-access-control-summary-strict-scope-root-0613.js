const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryScriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const reportAssetPath = path.join(root, "assets", "access-control-report-summary.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control strict scope-root summary audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryScript = read(summaryScriptPath);
const reportAsset = read(reportAssetPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(summaryScript, "summary script", "access-control-summary-strict-scope-root-0613");
requireMarker(summaryScript, "summary script", "function scopePlannerRecordFromLedger");
requireMarker(summaryScript, "summary script", "if (!scopeIds.size) return [];");
requireMarker(summaryScript, "summary script", "if (!scopeId) return false;");
requireMarker(summaryScript, "summary script", 'slug === "scope-planner"');
requireMarker(summaryScript, "summary script", "filtered.unshift(syntheticScopePlanner)");
requireMarker(summaryScript, "summary script", "return filterGuidanceRecordsToActiveScopes(records);");

requireMarker(reportAsset, "report summary asset", "access-control-report-summary-0613-strict-scope-root");
requireMarker(reportAsset, "report summary asset", "function scopePlannerRecordFromLedger");
requireMarker(reportAsset, "report summary asset", "if (!scopeIds.size) return [];");
requireMarker(reportAsset, "report summary asset", "if (!scopeId) return false;");
requireMarker(reportAsset, "report summary asset", 'slug === "scope-planner"');
requireMarker(reportAsset, "report summary asset", "filtered.unshift(syntheticScopePlanner)");
requireMarker(reportAsset, "report summary asset", "return filterGuidanceRecordsToActiveScopes(records);");

if (!summaryScript.includes("if (!scopeId) return true;") && !reportAsset.includes("if (!scopeId) return true;")) {
  console.log("SAFE  loose unscoped-record allowance removed");
} else {
  console.log("FAIL  loose unscoped-record allowance still exists");
  failCount += 1;
}

if (
  reportAsset.includes("summary-report-table") &&
  reportAsset.includes("<th>Tool</th><th>Status</th><th>Saved guidance</th>")
) {
  console.log("SAFE  structured report table preserved");
} else {
  console.log("FAIL  structured report table contract missing");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_STRICT_SCOPE_ROOT_FILTER");
  console.log("SAFE  UNSCOPED_DOWNSTREAM_RECORDS_DO_NOT_COUNT");
  console.log("SAFE  SCOPE_PLANNER_LEDGER_COUNTS_AS_ROOT_STEP");
  console.log("SAFE  ACCESS_CONTROL_REPORT_SUMMARY_STRICT_SCOPE_ROOT_FILTER");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_STRICT_SCOPE_ROOT_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
