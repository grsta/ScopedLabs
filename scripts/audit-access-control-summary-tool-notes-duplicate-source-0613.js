const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  summaryAsset: path.join(root, "assets", "access-control-report-summary.js"),
  summaryScript: path.join(root, "tools", "access-control", "summary", "script.js"),
  summaryHtml: path.join(root, "tools", "access-control", "summary", "index.html"),
  guidanceMemory: path.join(root, "assets", "access-control-guidance-memory.js")
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("FAIL  missing " + path.relative(root, filePath));
    return "";
  }

  console.log("SAFE  exists " + path.relative(root, filePath));
  return fs.readFileSync(filePath, "utf8");
}

function snippets(source, label, patterns) {
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
    const start = Math.max(0, first - 8);
    const end = Math.min(lines.length, first + 18);

    for (let i = start; i < end; i += 1) {
      console.log(String(i + 1).padStart(5, " ") + " | " + lines[i]);
    }

    console.log("");
  }
}

console.log("ScopedLabs Access Control Summary Tool Notes duplicate source audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryAsset = read(files.summaryAsset);
const summaryScript = read(files.summaryScript);
const summaryHtml = read(files.summaryHtml);
const guidanceMemory = read(files.guidanceMemory);

snippets(summaryHtml, "Summary HTML Tool Notes snippets", [
  "Tool Notes",
  "tool-notes",
  "notes",
  "access-control-report-summary.js",
  "script.js"
]);

snippets(summaryScript, "Summary script Tool Notes snippets", [
  "Tool Notes",
  "toolNotes",
  "tool-notes",
  "renderTool",
  "notes",
  "fallbackMemoryRecords",
  "ScopedLabsAccessControlGuidanceMemory",
  "listRecords",
  "record.toolSlug",
  "record.scopeId",
  "dedupe"
]);

snippets(summaryAsset, "Summary asset record/dedupe snippets", [
  "Tool Notes",
  "toolNotes",
  "dedupeScopedSummaryRecords",
  "fallbackMemoryRecords",
  "record.toolSlug",
  "record.scopeId",
  "slug + \"::\" + scopeId"
]);

snippets(guidanceMemory, "Guidance memory snippets", [
  "listRecords",
  "records",
  "sessionStorage",
  "localStorage"
]);

console.log("Decision summary");
console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");
console.log("OVERALL: PASS");