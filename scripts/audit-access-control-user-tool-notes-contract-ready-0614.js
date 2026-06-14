const fs = require("fs");
const path = require("path");

const root = process.cwd();
const accessRoot = path.join(root, "tools", "access-control");
const slugs = [
  "access-level-sizing",
  "anti-passback-zones",
  "credential-format",
  "door-cable-length",
  "door-count-planner",
  "elevator-reader-count",
  "fail-safe-fail-secure",
  "lock-power-budget",
  "panel-capacity",
  "reader-type-selector",
  "scope-planner",
  "special-locking-scope"
];

let failCount = 0;

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

console.log("ScopedLabs Access Control user tool notes contract ready audit - 0614");
console.log("Repo:", root);
console.log("");

const asset = read(path.join(root, "assets", "access-control-user-tool-notes.js"));
const summaryScript = read(path.join(root, "tools", "access-control", "summary", "script.js"));
const summaryHtml = read(path.join(root, "tools", "access-control", "summary", "index.html"));

requireMarker(asset, "shared asset", "access-control-user-tool-notes-001-scoped-contract");
requireMarker(asset, "shared asset", "scopedlabs:access-control:user-tool-notes:");
requireMarker(asset, "shared asset", "window.ScopedLabsAccessControlUserToolNotes");
requireMarker(asset, "shared asset", "function saveRecord");
requireMarker(asset, "shared asset", "function listRecords");

requireMarker(summaryScript, "summary script", "access-control-summary-user-tool-notes-0614");
requireMarker(summaryScript, "summary script", "function renderUserToolNotes");
requireMarker(summaryScript, "summary script", "function userToolNoteRecords");
requireMarker(summaryScript, "summary script", "User Tool Notes");
requireMarker(summaryScript, "summary script", "extra-export-table--access-control-user-tool-notes");

requireMarker(summaryHtml, "summary html", "/assets/access-control-user-tool-notes.js?v=access-control-user-tool-notes-001-scoped-contract");
requireMarker(summaryHtml, "summary html", "./script.js?v=access-control-summary-user-tool-notes-0614");

slugs.forEach((slug) => {
  const html = read(path.join(accessRoot, slug, "index.html"));

  requireMarker(html, slug, "data-access-control-user-tool-notes");
  requireMarker(html, slug, "/assets/access-control-user-tool-notes.js?v=access-control-user-tool-notes-001-scoped-contract");
});

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  USER_TOOL_NOTES_SHARED_HELPER_READY");
  console.log("SAFE  TOOL_PAGES_HAVE_SCOPED_USER_TOOL_NOTES_MOUNT");
  console.log("SAFE  SUMMARY_RENDERS_USER_TOOL_NOTES_SEPARATELY_FROM_ASSISTANT_TOOL_NOTES");
} else {
  console.log("FAIL  USER_TOOL_NOTES_CONTRACT_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
