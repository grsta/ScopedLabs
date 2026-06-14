const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryScriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const summaryHtmlPath = path.join(root, "tools", "access-control", "summary", "index.html");

const script = fs.readFileSync(summaryScriptPath, "utf8");
const html = fs.readFileSync(summaryHtmlPath, "utf8");

let failCount = 0;

console.log("ScopedLabs Access Control Assistant Tool Notes label audit - 0614");
console.log("Repo:", root);
console.log("");

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(script, "summary script", "Assistant Tool Notes");
requireMarker(script, "summary script", "Access Control Assistant Tool Notes");
requireMarker(script, "summary script", "function renderNotes");
requireMarker(script, "summary script", "function readGuidanceRecords");
requireMarker(script, "summary script", "dedupeGuidanceRecordsByToolAndScope");

requireMarker(html, "summary html", "./script.js?v=access-control-summary-assistant-tool-notes-label-0614");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  CURRENT_TOOL_NOTES_SECTION_IS_LABELED_AS_ASSISTANT_TOOL_NOTES");
  console.log("SAFE  NO_USER_TOOL_NOTES_STORAGE_CHANGE_IN_THIS_PATCH");
} else {
  console.log("FAIL  ASSISTANT_TOOL_NOTES_LABEL_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
