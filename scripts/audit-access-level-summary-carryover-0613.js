const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  accessLevelHtml: path.join(root, "tools", "access-control", "access-level-sizing", "index.html"),
  accessLevelScript: path.join(root, "tools", "access-control", "access-level-sizing", "script.js"),
  summaryAsset: path.join(root, "assets", "access-control-report-summary.js"),
  summaryPage: path.join(root, "tools", "access-control", "summary", "index.html"),
  guidanceMemory: path.join(root, "assets", "access-control-guidance-memory.js"),
  registry: path.join(root, "assets", "access-control-tool-registry.js")
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("FAIL  missing " + path.relative(root, filePath));
    return "";
  }

  console.log("SAFE  exists " + path.relative(root, filePath));
  return fs.readFileSync(filePath, "utf8");
}

function marker(source, label, text, hard = false) {
  if (source.includes(text)) {
    console.log("SAFE  " + label + ": " + text);
    return true;
  }

  console.log((hard ? "FAIL  " : "WATCH ") + label + " missing: " + text);
  return false;
}

function snippet(source, label, patterns) {
  const lines = source.split(/\r?\n/);

  console.log("");
  console.log(label);

  for (const pattern of patterns) {
    const hits = [];

    lines.forEach((line, index) => {
      if (line.includes(pattern)) hits.push(index);
    });

    if (!hits.length) {
      console.log("  WATCH no hits for " + JSON.stringify(pattern));
      continue;
    }

    console.log("  HIT " + JSON.stringify(pattern) + " at line(s): " + hits.map((i) => i + 1).join(", "));

    const first = hits[0];
    const start = Math.max(0, first - 6);
    const end = Math.min(lines.length, first + 12);

    for (let i = start; i < end; i += 1) {
      console.log(String(i + 1).padStart(5, " ") + " | " + lines[i]);
    }

    console.log("");
  }
}

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Level to Summary carryover audit - 0613");
console.log("Repo:", root);
console.log("");

const accessLevelHtml = read(files.accessLevelHtml);
const accessLevelScript = read(files.accessLevelScript);
const summaryAsset = read(files.summaryAsset);
const summaryPage = read(files.summaryPage);
const guidanceMemory = read(files.guidanceMemory);
const registry = read(files.registry);

console.log("");
console.log("Access Level source markers");

if (!marker(accessLevelScript, "access level script", "access-level-sizing")) watchCount += 1;
if (!marker(accessLevelScript, "access level script", "Access Level", false)) watchCount += 1;

const saveSignals = [
  "ScopedLabsAccessControlGuidanceMemory",
  "save",
  "record",
  "guidance",
  "scopeId",
  "activeScope"
];

let saveHits = 0;

for (const signal of saveSignals) {
  if (accessLevelScript.includes(signal)) {
    console.log("SAFE  access level script save/carry signal: " + signal);
    saveHits += 1;
  } else {
    console.log("WATCH access level script lacks save/carry signal: " + signal);
    watchCount += 1;
  }
}

if (saveHits < 4) {
  console.log("FAIL  Access Level script does not show enough scoped guidance save signals.");
  failCount += 1;
} else {
  console.log("SAFE  Access Level script appears to save scoped guidance/result data.");
}

console.log("");
console.log("Guidance memory contract");

if (!marker(guidanceMemory, "guidance memory", "access-level-sizing")) watchCount += 1;
if (!marker(guidanceMemory, "guidance memory", "scopeId")) watchCount += 1;
if (!marker(guidanceMemory, "guidance memory", "toolSlug")) watchCount += 1;
if (!marker(guidanceMemory, "guidance memory", "records")) watchCount += 1;

console.log("");
console.log("Registry and Summary contract");

if (!marker(registry, "registry", "access-level-sizing", true)) failCount += 1;
if (!marker(registry, "registry", "Access Level Sizing", true)) failCount += 1;

if (!marker(summaryAsset, "summary asset", "Access Level Sizing", true)) failCount += 1;
if (!marker(summaryAsset, "summary asset", "access-level-sizing", true)) failCount += 1;
if (!marker(summaryAsset, "summary asset", "fallbackMemoryRecords", true)) failCount += 1;
if (!marker(summaryAsset, "summary asset", "allRecords", true)) failCount += 1;
if (!marker(summaryAsset, "summary asset", "scope.id", true)) failCount += 1;
if (!marker(summaryAsset, "summary asset", "record.toolSlug", false)) watchCount += 1;
if (!marker(summaryAsset, "summary asset", "record.scopeId", false)) watchCount += 1;

console.log("");
console.log("Summary page load order/cache");

if (!marker(summaryPage, "summary page", "/assets/access-control-guidance-memory.js", true)) failCount += 1;
if (!marker(summaryPage, "summary page", "/assets/access-control-report-summary.js", true)) failCount += 1;
if (!marker(summaryPage, "summary page", "access-control-report-summary", true)) failCount += 1;

const memoryIndex = summaryPage.indexOf("/assets/access-control-guidance-memory.js");
const reportIndex = summaryPage.indexOf("/assets/access-control-report-summary.js");

if (memoryIndex !== -1 && reportIndex !== -1 && memoryIndex < reportIndex) {
  console.log("SAFE  Summary loads guidance memory before report summary asset");
} else {
  console.log("FAIL  Summary load order may prevent report summary from reading guidance memory");
  failCount += 1;
}

snippet(accessLevelScript, "Access Level save/carry snippets", [
  "ScopedLabsAccessControlGuidanceMemory",
  "access-level-sizing",
  "scopeId",
  "guidance",
  "save"
]);

snippet(summaryAsset, "Summary read/render snippets", [
  "fallbackMemoryRecords",
  "access-level-sizing",
  "Access Level Sizing",
  "record.scopeId",
  "record.toolSlug",
  "allRecords.filter"
]);

console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_LEVEL_TO_SUMMARY_CARRYOVER_BASELINE_NO_HARD_FAILURES");
} else {
  console.log("FAIL  ACCESS_LEVEL_TO_SUMMARY_CARRYOVER_HAS_HARD_FAILURES");
}

if (watchCount > 0) {
  console.log("WATCH review recommended: " + watchCount);
}

console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");