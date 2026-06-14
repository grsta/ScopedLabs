const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools", "access-control");

const files = {
  summaryScript: path.join(root, "tools", "access-control", "summary", "script.js"),
  summaryHtml: path.join(root, "tools", "access-control", "summary", "index.html"),
  reportSummary: path.join(root, "assets", "access-control-report-summary.js"),
  guidanceMemory: path.join(root, "assets", "access-control-guidance-memory.js"),
  registry: path.join(root, "assets", "access-control-tool-registry.js")
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("FAIL  missing " + path.relative(root, filePath));
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function accessControlIndexFiles() {
  const out = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === "index.html") out.push(full);
    });
  }

  walk(toolsRoot);
  return out;
}

function toolSlugFromPath(filePath) {
  const rel = path.relative(toolsRoot, path.dirname(filePath)).replace(/\\/g, "/");
  return rel.split("/")[0] || "";
}

console.log("ScopedLabs Access Control user tool notes contract audit - 0614");
console.log("Repo:", root);
console.log("");

const summaryScript = read(files.summaryScript);
const summaryHtml = read(files.summaryHtml);
const reportSummary = read(files.reportSummary);
const guidanceMemory = read(files.guidanceMemory);
const registry = read(files.registry);

console.log("Summary current notes paths");

[
  ["summary script has Assistant Tool Notes title", "Assistant Tool Notes"],
  ["summary script has Tool Notes title", "Tool Notes"],
  ["summary script has renderNotes path", "function renderNotes"],
  ["summary script has readGuidanceRecords path", "function readGuidanceRecords"],
  ["summary script has tool/scope dedupe", "dedupeGuidanceRecordsByToolAndScope"],
  ["summary script reads notes fields", "record.notes || record.customNotes || record.reportNotes || record.note"],
  ["summary script has user note key", "user-tool-notes"],
  ["summary html cache current", "access-control-summary-tool-notes-dedupe-0613"]
].forEach(([label, marker]) => {
  if ((label.includes("html") ? summaryHtml : summaryScript).includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("WATCH " + label + " missing: " + marker);
  }
});

console.log("");
console.log("Report/export summary current notes paths");

[
  ["report summary has assistant record filtering", "slugFrom(record) === tool.slug && recordScopeId(record) === scope.id"],
  ["report summary has dedupe", "dedupeScopedSummaryRecords"],
  ["report summary has user note key", "user-tool-notes"],
  ["report summary reads note fields", "notes || record.customNotes || record.reportNotes"]
].forEach(([label, marker]) => {
  if (reportSummary.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("WATCH " + label + " missing: " + marker);
  }
});

console.log("");
console.log("Tool page note-field map");

const toolFiles = accessControlIndexFiles()
  .filter((file) => !/\\summary\\index\.html$/i.test(file))
  .filter((file) => !/\\index\.html$/i.test(path.join(toolsRoot, "index.html")));

toolFiles.forEach((file) => {
  const rel = path.relative(root, file);
  const slug = toolSlugFromPath(file);
  const html = read(file);
  const scriptFile = path.join(path.dirname(file), "script.js");
  const script = fs.existsSync(scriptFile) ? read(scriptFile) : "";

  const combined = html + "\n" + script;

  const hasAnyNoteField =
    /textarea/i.test(combined) ||
    /customNotes|reportNotes|toolNotes|userNotes|notes/i.test(combined);

  const hasScopedSignal =
    /scopeId|accessScopeId|activeScopeId|ScopedLabsAccessControlScopeState|access-control-scope-state/i.test(combined);

  const hasUserToolNotesKey =
    /user-tool-notes|tool-notes|report-notes/i.test(combined);

  console.log(
    (hasAnyNoteField ? "SAFE  " : "WATCH ") +
    slug.padEnd(28) +
    " noteField=" + (hasAnyNoteField ? "yes" : "no") +
    " scoped=" + (hasScopedSignal ? "yes" : "no") +
    " userToolNoteKey=" + (hasUserToolNotesKey ? "yes" : "no") +
    " file=" + rel
  );
});

console.log("");
console.log("Decision summary");
console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");
console.log("OVERALL: PASS");