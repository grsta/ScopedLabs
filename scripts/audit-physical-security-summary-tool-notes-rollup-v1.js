const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-tool-notes-rollup-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const metadata = read("assets/scopedlabs-report-metadata.js");

const rows = [];

function add(name, status, detail) {
  rows.push({ name, status, detail });
}

[
  "scopedlabs-report-metadata-003-shared-carryover-page-notes",
  "const SHARED_FIELDS = [\"reportTitle\", \"projectName\", \"clientName\", \"preparedBy\"];",
  "const PAGE_ONLY_FIELDS = [\"customNotes\"];",
  "scopedlabs:report-metadata:page:"
].forEach((signal) => {
  add(
    "metadata-foundation-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    metadata.includes(signal) ? "SAFE" : "FAIL",
    metadata.includes(signal) ? "metadata source contains " + signal : "metadata source missing " + signal
  );
});

[
  "physicalSecurityToolNotesSection",
  "physicalSecurityToolNotesMount",
  "data-export-section",
  "data-export-title=\"Physical Security Tool Notes\"",
  "./script.js?v=physical-security-summary-tool-notes-rollup-012"
].forEach((signal) => {
  add(
    "summary-index-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    index.includes(signal) ? "SAFE" : "FAIL",
    index.includes(signal) ? "summary index contains " + signal : "summary index missing " + signal
  );
});

[
  "physical-security-summary-tool-notes-rollup-012",
  "const TOOL_NOTE_TOOLS = CORE_TOOLS.concat(SPECIALTY_TOOLS);",
  "function readSavedToolNotePages()",
  "function toolNoteRows()",
  "function renderToolNotes()",
  "summary-tool-notes-table",
  "toolNotes: toolNoteRows().map",
  "window.addEventListener(\"scopedlabs:report-metadata-saved\", render);"
].forEach((signal) => {
  add(
    "summary-script-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    script.includes(signal) ? "SAFE" : "FAIL",
    script.includes(signal) ? "summary script contains " + signal : "summary script missing " + signal
  );
});

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Tool Notes Rollup Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
