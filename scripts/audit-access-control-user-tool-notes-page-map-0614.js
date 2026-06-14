const fs = require("fs");
const path = require("path");

const root = process.cwd();
const accessRoot = path.join(root, "tools", "access-control");

const summaryFiles = {
  summaryScript: path.join(root, "tools", "access-control", "summary", "script.js"),
  summaryHtml: path.join(root, "tools", "access-control", "summary", "index.html"),
  reportSummary: path.join(root, "assets", "access-control-report-summary.js"),
  registry: path.join(root, "assets", "access-control-tool-registry.js"),
  guidanceMemory: path.join(root, "assets", "access-control-guidance-memory.js")
};

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function listToolFolders() {
  if (!fs.existsSync(accessRoot)) return [];

  return fs.readdirSync(accessRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => slug !== "summary")
    .filter((slug) => fs.existsSync(path.join(accessRoot, slug, "index.html")))
    .sort();
}

function bool(value) {
  return value ? "yes" : "no";
}

function marker(source, regexOrText) {
  if (!source) return false;

  if (regexOrText instanceof RegExp) return regexOrText.test(source);

  return source.includes(regexOrText);
}

console.log("ScopedLabs Access Control user tool notes page map audit - 0614");
console.log("Repo:", root);
console.log("");

const slugs = listToolFolders();

if (!slugs.length) {
  console.log("FAIL  No Access Control tool folders found.");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

const registry = read(summaryFiles.registry);
const summaryScript = read(summaryFiles.summaryScript);
const summaryHtml = read(summaryFiles.summaryHtml);
const reportSummary = read(summaryFiles.reportSummary);
const guidanceMemory = read(summaryFiles.guidanceMemory);

let failCount = 0;
let watchCount = 0;

console.log("Summary / export current contract");

[
  ["summary label is Assistant Tool Notes", summaryScript.includes("Assistant Tool Notes")],
  ["summary has assistant guidance reader", summaryScript.includes("function readGuidanceRecords")],
  ["summary has assistant notes dedupe", summaryScript.includes("dedupeGuidanceRecordsByToolAndScope")],
  ["summary missing user-tool-notes reader", !summaryScript.includes("user-tool-notes")],
  ["export summary missing user-tool-notes reader", !reportSummary.includes("user-tool-notes")],
  ["guidance memory is assistant/generic reader only", guidanceMemory.includes("listRecords")],
].forEach(([label, ok]) => {
  console.log((ok ? "SAFE  " : "WATCH ") + label);
  if (!ok) watchCount += 1;
});

console.log("");
console.log("Tool page map");

const rows = [];

slugs.forEach((slug) => {
  const dir = path.join(accessRoot, slug);
  const htmlPath = path.join(dir, "index.html");
  const scriptPath = path.join(dir, "script.js");

  const html = read(htmlPath);
  const script = read(scriptPath);
  const combined = html + "\n" + script;

  const hasScript = !!script;
  const inRegistry = registry.includes(slug);
  const loadsScopeState =
    combined.includes("access-control-scope-state.js") ||
    combined.includes("ScopedLabsAccessControlScopeState") ||
    combined.includes("activeScopeId") ||
    combined.includes("scopeId");

  const hasAnyTextarea = /<textarea\b/i.test(html);
  const hasReportMetadataMount =
    html.includes("reportMetadataMount") ||
    html.includes("data-report-metadata") ||
    combined.includes("scopedlabs-report-metadata");

  const hasPotentialUserNoteField =
    /tool\s*notes|report\s*notes|user\s*notes|custom\s*notes|customNotes|reportNotes|toolNotes|userNotes/i.test(combined);

  const hasUserToolNotesContract =
    /user-tool-notes|data-user-tool-notes|data-tool-report-notes|tool-report-notes|scopedlabs:access-control:user-tool-notes/i.test(combined);

  const hasExportControls =
    html.includes("exportReport") ||
    html.includes("saveSnapshot") ||
    combined.includes("ScopedLabsExport") ||
    combined.includes("Open Export Report");

  const hasAssistantGuidanceSave =
    /ScopedLabsAccessControlGuidanceMemory|access-control-guidance|summary-carryover|guidance-memory|toolSlug|record\.toolSlug/i.test(combined);

  const needsUserNoteField = slug !== "index" && slug !== "summary";

  let status = "WATCH";
  let reason = "needs shared user tool note field";

  if (hasUserToolNotesContract && loadsScopeState) {
    status = "SAFE";
    reason = "appears to have scoped user tool notes contract";
  } else if (!needsUserNoteField) {
    status = "SKIP";
    reason = "not a calculator tool page";
  }

  rows.push({
    slug,
    status,
    reason,
    hasScript,
    inRegistry,
    loadsScopeState,
    hasAnyTextarea,
    hasPotentialUserNoteField,
    hasUserToolNotesContract,
    hasReportMetadataMount,
    hasExportControls,
    hasAssistantGuidanceSave
  });
});

rows.forEach((row) => {
  const prefix = row.status.padEnd(5);
  console.log(
    prefix + " " +
    row.slug.padEnd(28) +
    " registry=" + bool(row.inRegistry) +
    " scope=" + bool(row.loadsScopeState) +
    " textarea=" + bool(row.hasAnyTextarea) +
    " userNoteField=" + bool(row.hasPotentialUserNoteField) +
    " userNoteContract=" + bool(row.hasUserToolNotesContract) +
    " export=" + bool(row.hasExportControls) +
    " assistantSave=" + bool(row.hasAssistantGuidanceSave) +
    " :: " + row.reason
  );

  if (row.status === "WATCH") watchCount += 1;
});

console.log("");
console.log("Recommended next patch scope");

const needPatch = rows
  .filter((row) => row.status === "WATCH")
  .map((row) => row.slug);

if (needPatch.length) {
  console.log("WATCH Shared user tool notes field needed on:");
  needPatch.forEach((slug) => console.log("  - " + slug));
} else {
  console.log("SAFE  All mapped tools already appear to have scoped user tool notes.");
}

console.log("");
console.log("Contract target");
console.log("  Storage key: scopedlabs:access-control:user-tool-notes:<scopeId>:<toolSlug>");
console.log("  Tool page UI: User Tool Notes / Report Notes textarea");
console.log("  Summary display: Assistant Tool Notes separate from User Tool Notes");
console.log("  Export display: include user note with the matching scope + tool row");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  AUDIT_COMPLETED_NO_HARD_FAILURES");
} else {
  console.log("FAIL  AUDIT_HAS_HARD_FAILURES");
}

if (watchCount > 0) {
  console.log("WATCH USER_TOOL_NOTES_SHARED_CONTRACT_PATCH_NEEDED: " + watchCount);
} else {
  console.log("SAFE  USER_TOOL_NOTES_CONTRACT_ALREADY_PRESENT");
}

console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");
console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");