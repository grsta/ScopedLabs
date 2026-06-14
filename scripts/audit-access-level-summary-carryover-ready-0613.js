const fs = require("fs");
const path = require("path");

const root = process.cwd();

const htmlPath = path.join(root, "tools", "access-control", "access-level-sizing", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "access-level-sizing", "script.js");
const summaryAssetPath = path.join(root, "assets", "access-control-report-summary.js");
const registryPath = path.join(root, "assets", "access-control-tool-registry.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Level summary carryover ready audit - 0613");
console.log("Repo:", root);
console.log("");

const html = read(htmlPath);
const script = read(scriptPath);
const summaryAsset = read(summaryAssetPath);
const registry = read(registryPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

function watchMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("WATCH " + label + " missing marker: " + marker);
    watchCount += 1;
  }
}

requireMarker(html, "Access Level HTML", "/assets/access-control-guidance-memory.js");
requireMarker(html, "Access Level HTML", "access-level-summary-carryover-0613");
requireMarker(html, "Access Level HTML", "./script.js?v=access-level-summary-carryover-0613");

requireMarker(script, "Access Level script", "access-level-sizing-summary-carryover-0613");
requireMarker(script, "Access Level script", "function persistAccessLevelSummaryCarryover");
requireMarker(script, "Access Level script", "ScopedLabsAccessControlGuidanceMemory");
requireMarker(script, "Access Level script", "scopeId");
requireMarker(script, "Access Level script", "toolSlug");
requireMarker(script, "Access Level script", "Access Level Sizing");
requireMarker(script, "Access Level script", "scopedlabs:access-control:guidance:access-level-sizing:");
requireMarker(script, "Access Level script", "scopedlabs:pipeline:access-control:summary:access-level-sizing:");
requireMarker(script, "Access Level script", "scopedlabs:access-control-guidance-saved");

requireMarker(summaryAsset, "Summary asset", "fallbackMemoryRecords");
requireMarker(summaryAsset, "Summary asset", "record.toolSlug");
requireMarker(summaryAsset, "Summary asset", "record.scopeId");
requireMarker(summaryAsset, "Summary asset", "allRecords.filter");

requireMarker(registry, "Registry", "access-level-sizing");
requireMarker(registry, "Registry", "Access Level Sizing");

watchMarker(summaryAsset, "Summary asset literal label", "Access Level Sizing");
watchMarker(summaryAsset, "Summary asset literal slug", "access-level-sizing");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_LEVEL_SAVES_SCOPED_SUMMARY_RECORDS");
  console.log("SAFE  SUMMARY_CAN_READ_ACCESS_LEVEL_RECORDS_BY_TOOL_AND_SCOPE");
} else {
  console.log("FAIL  ACCESS_LEVEL_SUMMARY_CARRYOVER_NOT_READY");
}

if (watchCount > 0) {
  console.log("WATCH Nonblocking literal summary markers missing because Summary may read Registry dynamically: " + watchCount);
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
