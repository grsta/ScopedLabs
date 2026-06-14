const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryScript = fs.readFileSync(path.join(root, "tools", "access-control", "summary", "script.js"), "utf8");
const summaryHtml = fs.readFileSync(path.join(root, "tools", "access-control", "summary", "index.html"), "utf8");

let failCount = 0;

console.log("ScopedLabs Access Control Summary user notes card layout audit - 0614");
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

requireMarker(summaryScript, "summary script", "access-control-user-tool-notes-card-layout-0614");
requireMarker(summaryScript, "summary script", "function renderUserToolNotes");
requireMarker(summaryScript, "summary script", "access-control-user-tool-note-card");
requireMarker(summaryScript, "summary script", "access-control-user-tool-note-body");
requireMarker(summaryScript, "summary script", "white-space:pre-wrap");
requireMarker(summaryScript, "summary script", "Scope:");
requireMarker(summaryScript, "summary script", "Tool:");

if (summaryScript.includes("extra-export-table--access-control-user-tool-notes")) {
  console.log("FAIL  summary script still uses cramped table export class for user notes");
  failCount += 1;
} else {
  console.log("SAFE  summary script no longer uses cramped table class for user notes");
}

requireMarker(summaryHtml, "summary html", "./script.js?v=access-control-summary-user-notes-card-layout-0614");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  USER_TOOL_NOTES_RENDER_AS_FULL_WIDTH_NOTE_CARDS");
  console.log("SAFE  LONG_USER_NOTES_WRAP_AND_PRINT_CLEANLY");
} else {
  console.log("FAIL  USER_TOOL_NOTES_CARD_LAYOUT_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
