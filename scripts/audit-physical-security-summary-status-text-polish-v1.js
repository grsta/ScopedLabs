const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-status-text-polish-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

function between(value, startToken, endToken) {
  const start = value.indexOf(startToken);
  if (start < 0) return "";
  const end = value.indexOf(endToken, start);
  if (end < 0) return value.slice(start);
  return value.slice(start, end);
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const statusBlock = between(index, "    .summary-status {", "    .summary-payload {");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("status-style-marker", index.includes("physical-security-summary-status-text-polish-004"), "status text polish marker exists");
safe("status-plain-display", statusBlock.includes("display: inline;") && statusBlock.includes("text-transform: none;"), "status renders as plain text");
safe("status-no-pill-radius", !statusBlock.includes("border-radius: 999px;") && !statusBlock.includes("padding: 4px 8px;"), "pill styling removed from status text block");
safe("status-transparent-background", statusBlock.includes("background: transparent;") && !statusBlock.includes("background: rgba(255,138,102,.10);"), "status background is transparent");
safe("healthy-color", statusBlock.includes(".summary-status.healthy") && statusBlock.includes("rgba(125,255,152,.96)"), "Healthy status has green text");
safe("watch-color", statusBlock.includes(".summary-status.watch") && statusBlock.includes("rgba(255,218,106,.98)"), "Watch status has amber text");
safe("risk-color", statusBlock.includes(".summary-status.risk") && statusBlock.includes("rgba(255,154,118,.98)"), "Risk status has red/orange text");
safe("unknown-color", statusBlock.includes(".summary-status.unknown") && statusBlock.includes(".summary-status.pending"), "Unknown/Pending status has neutral text");
safe("status-markup-remains", script.includes("summary-status") && script.includes("statusLabel(row.status)"), "status render path remains");
safe("summary-table-remains", index.includes("summary-table") && index.includes("Area, Zone, and Tool Guidance Rollup"), "summary tables remain");
safe("master-card-remains", index.includes("summary-master-card") && index.includes("physicalSecuritySummaryMasterMount"), "master assistant card remains");
safe("export-remains", index.includes("summaryExportSection") && index.includes("id=\"exportReport\""), "export/report remains");
safe("hidden-payload-remains", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "hidden future Site Assistant payload remains");

console.log("");
console.log("Physical Security Summary Status Text Polish Audit");
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
