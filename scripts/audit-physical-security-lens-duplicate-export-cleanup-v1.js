const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-duplicate-export-cleanup-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

function add(rows, id, status, detail) { rows.push({ id, status, detail }); }
function safe(rows, id, ok, detail) { add(rows, id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/lens-selection/index.html");
const script = read("tools/physical-security/lens-selection/script.js");
const assistant = read("assets/lens-design-assistant.js");

const rows = [];

safe(rows, "lens-index-exists", exists("tools/physical-security/lens-selection/index.html"), "lens index exists");
safe(rows, "lens-script-exists", exists("tools/physical-security/lens-selection/script.js"), "lens script exists");
safe(rows, "lens-assistant-exists", exists("assets/lens-design-assistant.js"), "lens assistant exists");
safe(rows, "normal-export-remains", index.includes("button id=\"exportReport\""), "normal export button remains");
safe(rows, "snapshot-remains", index.includes("button id=\"saveSnapshot\""), "snapshot button remains");
safe(rows, "summary-route-remains", index.includes("Continue → Physical Security Summary") && script.includes("const NEXT_URL = \"/tools/physical-security/summary/\";"), "summary route remains");
safe(rows, "lens-script-cache", index.includes("./script.js?v=physical-security-lens-final-ui-polish-011"), "lens script cache updated");
safe(rows, "assistant-cache", index.includes("/assets/lens-design-assistant.js?v=lens-design-assistant-020-duplicate-export-cleanup"), "assistant cache updated");
safe(rows, "engineering-summary-remains", index.includes("id=\"lensReportSummaryExport\"") && script.includes("renderLensReportSummary(data);"), "engineering summary remains");
safe(rows, "assistant-export-remains", assistant.includes("data-export-section") && assistant.includes("data-export-svg"), "assistant export visuals remain");
safe(rows, "no-index-report-v2", !index.includes("Open Report V2") && !index.includes("openReportV2"), "no visible report v2 button in index");
safe(rows, "no-script-report-v2", !script.includes("openReportV2") && !script.includes("assistant-notes-017"), "no report v2 script logic");
safe(rows, "no-assistant-visible-report-v2", !assistant.includes("Use the selected scenario in the next sanity check") && !assistant.includes("The live tool still keeps the old export path") && !assistant.includes("Open Report V2") && !assistant.includes("Live Shadow Path"), "no visible report v2 assistant panel");
safe(rows, "no-assistant-report-v2-hooks", !assistant.includes("data-slda-open-report") && !assistant.includes("data-slda-report-input") && !assistant.includes("Add project-specific notes for Report V2"), "no report v2 assistant hooks");

console.log("");
console.log("Physical Security Lens Duplicate Export Cleanup Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
