const fs = require("fs");
const path = require("path");

const root = process.cwd();
const accessRoot = path.join(root, "tools", "access-control");

const activeSlugs = [
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
  "special-locking-scope"
];
const skippedSlugs = [
  "scope-planner"
];
const VERSION = "access-control-user-tool-notes-002-export-card-placement";

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function bool(value) {
  return value ? "yes" : "no";
}

console.log("ScopedLabs Access Control user tool notes page map audit - 0614");
console.log("Repo:", root);
console.log("");

const summaryScript = read(path.join(accessRoot, "summary", "script.js"));
const reportSummary = read(path.join(root, "assets", "access-control-report-summary.js"));
const guidanceMemory = read(path.join(root, "assets", "access-control-guidance-memory.js"));

let failCount = 0;
let watchCount = 0;

console.log("Summary / export current contract");

[
  ["summary label is Assistant Tool Notes", summaryScript.includes("Assistant Tool Notes")],
  ["summary has assistant guidance reader", summaryScript.includes("function readGuidanceRecords")],
  ["summary has assistant notes dedupe", summaryScript.includes("dedupeGuidanceRecordsByToolAndScope")],
  ["summary has user-tool-notes reader", summaryScript.includes("function userToolNoteRecords") && summaryScript.includes("scopedlabs:access-control:user-tool-notes:")],
  ["summary has user notes renderer", summaryScript.includes("function renderUserToolNotes")],
  ["export summary table still assistant/result focused", !reportSummary.includes("user-tool-notes")],
  ["guidance memory is assistant/generic reader only", guidanceMemory.includes("listRecords")],
].forEach(([label, ok]) => {
  console.log((ok ? "SAFE  " : "WATCH ") + label);
  if (!ok) watchCount += 1;
});

console.log("");
console.log("Tool page map");

activeSlugs.forEach((slug) => {
  const html = read(path.join(accessRoot, slug, "index.html"));
  const hasMount = html.includes("data-access-control-user-tool-notes");
  const hasInline = html.includes("access-control-user-tool-notes-inline");
  const hasAsset = html.includes("/assets/access-control-user-tool-notes.js?v=" + VERSION);
  const hasOldCard = /class=["']card access-control-user-tool-notes-card["']/i.test(html);
  const exportIndex = html.search(/Export Report|Final Report Export|Documentation\s*&\s*Export/i);
  const mountIndex = html.indexOf("data-access-control-user-tool-notes");
  const footerIndex = html.search(/<footer\b/i);
  const placed = hasMount && exportIndex !== -1 && mountIndex > exportIndex && (footerIndex === -1 || mountIndex < footerIndex);

  const safe = hasMount && hasInline && hasAsset && !hasOldCard && placed;

  console.log(
    (safe ? "SAFE  " : "FAIL  ") +
    slug.padEnd(28) +
    " mount=" + bool(hasMount) +
    " inline=" + bool(hasInline) +
    " asset=" + bool(hasAsset) +
    " oldCard=" + bool(hasOldCard) +
    " exportPlacement=" + bool(placed)
  );

  if (!safe) failCount += 1;
});

skippedSlugs.forEach((slug) => {
  const html = read(path.join(accessRoot, slug, "index.html"));
  const clean = !html.includes("data-access-control-user-tool-notes") && !html.includes("/assets/access-control-user-tool-notes.js");

  console.log((clean ? "SAFE  " : "FAIL  ") + slug.padEnd(28) + " skipped=no-export-report-card clean=" + bool(clean));

  if (!clean) failCount += 1;
});

console.log("");
console.log("Contract target");
console.log("  Storage key: scopedlabs:access-control:user-tool-notes:<scopeId>:<toolSlug>");
console.log("  Tool page UI: compact User Tool Notes inside Export Report card");
console.log("  Summary display: Assistant Tool Notes separate from User Tool Notes");
console.log("  Scope Planner: skipped until it gets a dedicated report/export lane");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  USER_TOOL_NOTES_PAGE_MAP_READY");
} else {
  console.log("FAIL  USER_TOOL_NOTES_PAGE_MAP_NOT_READY");
}

if (watchCount > 0) {
  console.log("WATCH SUMMARY_USER_TOOL_NOTES_CONTRACT_WARNINGS: " + watchCount);
} else {
  console.log("SAFE  SUMMARY_USER_TOOL_NOTES_CONTRACT_READY");
}

console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");
console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
