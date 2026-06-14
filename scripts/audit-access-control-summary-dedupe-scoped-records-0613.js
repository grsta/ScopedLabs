const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryAssetPath = path.join(root, "assets", "access-control-report-summary.js");
const summaryPagePath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control Summary dedupe scoped records audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryAsset = read(summaryAssetPath);
const summaryPage = read(summaryPagePath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(summaryAsset, "summary asset", "access-control-summary-dedupe-scoped-records-0613");
requireMarker(summaryAsset, "summary asset", "function recordUpdatedTime");
requireMarker(summaryAsset, "summary asset", "function dedupeScopedSummaryRecords");
requireMarker(summaryAsset, "summary asset", "slug + \"::\" + scopeId");
requireMarker(summaryAsset, "summary asset", "const allRecords = dedupeScopedSummaryRecords(fallbackMemoryRecords());");
requireMarker(summaryAsset, "summary asset", "slugFrom(record) === tool.slug && recordScopeId(record) === scope.id");

requireMarker(summaryPage, "summary page", "/assets/access-control-report-summary.js?v=access-control-report-summary-dedupe-scoped-records-0613");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  SUMMARY_RENDER_DEDUPES_RECORDS_BY_TOOL_AND_SCOPE");
  console.log("SAFE  ACCESS_LEVEL_SIZING_SHOULD_RENDER_ONCE_PER_SCOPE");
} else {
  console.log("FAIL  SUMMARY_DEDUPE_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
