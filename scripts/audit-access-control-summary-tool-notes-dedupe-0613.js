const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryScriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const summaryHtmlPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control Summary Tool Notes dedupe audit - 0613");
console.log("Repo:", root);
console.log("");

const script = read(summaryScriptPath);
const html = read(summaryHtmlPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(script, "summary script", "access-control-summary-tool-notes-dedupe-0613");
requireMarker(script, "summary script", "function guidanceRecordUpdatedTime");
requireMarker(script, "summary script", "function dedupeGuidanceRecordsByToolAndScope");
requireMarker(script, "summary script", "function readGuidanceRecordsRaw");
requireMarker(script, "summary script", "function readGuidanceRecords()");
requireMarker(script, "summary script", "return dedupeGuidanceRecordsByToolAndScope(readGuidanceRecordsRaw());");
requireMarker(script, "summary script", "slug + \"::\" + scopeId");
requireMarker(script, "summary script", "function renderNotes");
requireMarker(script, "summary script", "record.notes || record.customNotes || record.reportNotes || record.note");

requireMarker(html, "summary html", "./script.js?v=access-control-summary-tool-notes-dedupe-0613");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  SUMMARY_TOOL_NOTES_DEDUPES_BY_TOOL_AND_SCOPE");
  console.log("SAFE  ACCESS_LEVEL_TOOL_NOTES_SHOULD_RENDER_ONCE_PER_SCOPE");
} else {
  console.log("FAIL  SUMMARY_TOOL_NOTES_DEDUPE_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
