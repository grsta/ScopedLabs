const fs = require("fs");
const path = require("path");

const root = process.cwd();

const scriptPath = path.join(root, "tools", "access-control", "access-level-sizing", "script.js");
const htmlPath = path.join(root, "tools", "access-control", "access-level-sizing", "index.html");
const summaryPath = path.join(root, "assets", "access-control-report-summary.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Level scoped publisher audit - 0613");
console.log("Repo:", root);
console.log("");

const script = read(scriptPath);
const html = read(htmlPath);
const summary = read(summaryPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(script, "Access Level script", "access-level-sizing-summary-scoped-publisher-0613");
requireMarker(script, "Access Level script", "function publishAccessLevelSummaryCarryover");
requireMarker(script, "Access Level script", "toolSlug: STEP");
requireMarker(script, "Access Level script", "slug: STEP");
requireMarker(script, "Access Level script", "scopeId,");
requireMarker(script, "Access Level script", "accessScopeId: scopeId");
requireMarker(script, "Access Level script", "activeScopeId: scopeId");
requireMarker(script, "Access Level script", "notes: summaryText");
requireMarker(script, "Access Level script", "customNotes: summaryText");
requireMarker(script, "Access Level script", "reportNotes: summaryText");
requireMarker(script, "Access Level script", "scopedlabs:access-control:guidance:access-level-sizing:");
requireMarker(script, "Access Level script", "scopedlabs:access-control:guidance-memory:records");
requireMarker(script, "Access Level script", "publishAccessLevelSummaryCarryover({");

requireMarker(html, "Access Level HTML", "./script.js?v=access-level-summary-scoped-publisher-0613");
requireMarker(html, "Access Level HTML", "/assets/access-control-scope-state.js");
requireMarker(html, "Access Level HTML", "/assets/access-control-guidance-memory.js");

requireMarker(summary, "Summary asset", "record.scopeId");
requireMarker(summary, "Summary asset", "record.toolSlug");
requireMarker(summary, "Summary asset", "slugFrom(record) === tool.slug && recordScopeId(record) === scope.id");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_LEVEL_PUBLISHES_SUMMARY_RECORD_WITH_TOOLSLUG_AND_SCOPEID");
  console.log("SAFE  SUMMARY_FILTER_CAN_MATCH_ACCESS_LEVEL_BY_TOOL_AND_SCOPE");
} else {
  console.log("FAIL  ACCESS_LEVEL_SCOPED_PUBLISHER_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
