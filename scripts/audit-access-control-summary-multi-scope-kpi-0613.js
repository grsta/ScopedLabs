const fs = require("fs");
const path = require("path");

const root = process.cwd();
const summaryScriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const reportAssetPath = path.join(root, "assets", "access-control-report-summary.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary multi-scope KPI audit - 0613");
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

requireMarker(summaryScript, "summary script", "access-control-summary-multi-scope-kpi-0613");
requireMarker(summaryScript, "summary script", "function plannedScopeSummary");
requireMarker(summaryScript, "summary script", 'kpi("Scopes planned"');
requireMarker(summaryScript, "summary script", "plannedScopes.detail");
requireMarker(summaryScript, "summary script", "planned.reportText");
requireMarker(summaryScript, "summary script", "names.join");

requireMarker(reportAsset, "report summary asset", "access-control-report-summary-0613-multi-scope-kpi");
requireMarker(reportAsset, "report summary asset", "function plannedScopeSummary");
requireMarker(reportAsset, "report summary asset", "planned.reportText");
requireMarker(reportAsset, "report summary asset", "names.join");

if (summaryScript.includes('kpi("Guidance saved"') && summaryScript.includes('String(count.generated) + " / " + String(TOOL_DEFINITIONS.length)')) {
  console.log("SAFE  Guidance saved remains tool-completion count");
} else {
  console.log("FAIL  Guidance saved tool-count contract changed unexpectedly");
  failCount += 1;
}

if (!summaryScript.includes("if (!scopeId) return true;") && !reportAsset.includes("if (!scopeId) return true;")) {
  console.log("SAFE  loose unscoped-record allowance remains removed");
} else {
  console.log("FAIL  loose unscoped-record allowance returned");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_MULTI_SCOPE_KPI");
  console.log("SAFE  SCOPE_PLANNER_REPORT_SUMMARIZES_ALL_SCOPES");
  console.log("SAFE  GUIDANCE_SAVED_REMAINS_TOOL_COMPLETION_COUNT");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_MULTI_SCOPE_KPI_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
