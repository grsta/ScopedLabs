const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  summaryAsset: path.join(root, "assets", "access-control-report-summary.js"),
  metadataHelper: path.join(root, "assets", "scopedlabs-report-metadata.js"),
  exportEngine: path.join(root, "assets", "export.js"),
  summaryPage: path.join(root, "tools", "access-control", "summary", "index.html")
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("FAIL  missing " + path.relative(root, filePath));
    return "";
  }

  console.log("SAFE  exists " + path.relative(root, filePath));
  return fs.readFileSync(filePath, "utf8");
}

function marker(source, label, text) {
  if (source.includes(text)) {
    console.log("SAFE  " + label + ": " + text);
    return true;
  }

  console.log("WATCH " + label + " missing: " + text);
  return false;
}

function lineSnippets(source, label, patterns) {
  const lines = source.split(/\r?\n/);

  console.log("");
  console.log(label);

  for (const pattern of patterns) {
    const hits = [];

    lines.forEach((line, index) => {
      if (line.includes(pattern)) {
        hits.push(index);
      }
    });

    if (!hits.length) {
      console.log("  WATCH no hits for " + JSON.stringify(pattern));
      continue;
    }

    console.log("  HIT " + JSON.stringify(pattern) + " at line(s): " + hits.map((i) => i + 1).join(", "));

    const first = hits[0];
    const start = Math.max(0, first - 4);
    const end = Math.min(lines.length, first + 8);

    for (let i = start; i < end; i += 1) {
      console.log(String(i + 1).padStart(5, " ") + " | " + lines[i]);
    }

    console.log("");
  }
}

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Control Summary per-scope metadata export audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryAsset = read(files.summaryAsset);
const metadataHelper = read(files.metadataHelper);
const exportEngine = read(files.exportEngine);
const summaryPage = read(files.summaryPage);

console.log("");
console.log("Current metadata key contract");

if (!marker(metadataHelper, "metadata helper", 'PAGE_STORAGE_PREFIX + "/tools/access-control/"')) watchCount += 1;
if (!marker(metadataHelper, "metadata helper", "#access-scope:")) watchCount += 1;
if (!marker(metadataHelper, "metadata helper", "currentAccessControlScopeContext")) watchCount += 1;
if (!marker(metadataHelper, "metadata helper", "scopedlabs-report-metadata-008-access-control-category-scope-key")) watchCount += 1;

console.log("");
console.log("Summary export construction contract");

if (!marker(summaryAsset, "summary asset", "data-export-section")) watchCount += 1;
if (!marker(summaryAsset, "summary asset", "SCOPE:")) watchCount += 1;
if (!marker(summaryAsset, "summary asset", "data-export-table-title")) watchCount += 1;
if (!marker(summaryAsset, "summary asset", "data-export-col-widths")) watchCount += 1;
if (!marker(summaryAsset, "summary asset", "TOOL")) watchCount += 1;
if (!marker(summaryAsset, "summary asset", "SAVED GUIDANCE")) watchCount += 1;

console.log("");
console.log("Per-scope metadata export support");

const metadataSignals = [
  "readScopeReportMetadata",
  "scopeReportMetadata",
  "reportTitle",
  "projectName",
  "clientName",
  "preparedBy",
  "customNotes",
  "/tools/access-control/",
  "#access-scope:"
];

let supportHits = 0;

for (const signal of metadataSignals) {
  if (summaryAsset.includes(signal)) {
    console.log("SAFE  summary asset metadata signal: " + signal);
    supportHits += 1;
  } else {
    console.log("WATCH summary asset lacks metadata signal: " + signal);
    watchCount += 1;
  }
}

if (supportHits < 5) {
  console.log("WATCH Summary export likely does not load per-scope metadata yet.");
  watchCount += 1;
} else {
  console.log("SAFE  Summary export appears to have metadata loading support.");
}

console.log("");
console.log("Export engine table preservation");

if (!marker(exportEngine, "export engine", "data-export-table-class")) watchCount += 1;
if (!marker(exportEngine, "export engine", "data-export-col-widths")) watchCount += 1;
if (!marker(exportEngine, "export engine", "data-export-table-title")) watchCount += 1;

console.log("");
console.log("Summary page metadata helper");

if (!marker(summaryPage, "summary page", "/assets/scopedlabs-report-metadata.js")) watchCount += 1;
if (!marker(summaryPage, "summary page", "data-report-metadata")) watchCount += 1;

lineSnippets(summaryAsset, "Relevant summary asset snippets", [
  "data-export-section",
  "SCOPE:",
  "data-export-table-title",
  "SAVED GUIDANCE",
  "reportScope",
  "selectedScope",
  "all"
]);

console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  AUDIT_COMPLETED_NO_HARD_FAILURES");
}

if (watchCount > 0) {
  console.log("WATCH PER_SCOPE_METADATA_EXPORT_PATCH_NEEDED: " + watchCount);
} else {
  console.log("SAFE  PER_SCOPE_METADATA_EXPORT_CONTRACT_PRESENT");
}

console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");