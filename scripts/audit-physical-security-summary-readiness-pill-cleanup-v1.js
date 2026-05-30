const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-readiness-pill-cleanup-audit-002-source-cleanup";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("results-card-remains", index.includes("summary-results-card") && index.includes("Physical Security Rollup"), "results card remains");
safe("results-pill-removed", !index.includes("<span class=\"pill\">Readiness Snapshot</span>"), "Readiness Snapshot pill removed");
safe("results-copy-remains", index.includes("Quick status snapshot from tool guidance memory and current Area Planner scopes."), "results card copy remains");
safe("kpi-script-remains", script.includes("Category Status") && script.includes("Tool Guidance") && script.includes("Areas / Zones"), "KPI labels remain in Summary script");
safe("master-card-remains", index.includes("summary-master-card") && index.includes("physicalSecuritySummaryMasterMount"), "master assistant card remains");
safe("export-remains", index.includes("summaryExportSection") && index.includes("id=\"exportReport\""), "export/report remains");
safe("hidden-payload-remains", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "hidden future Site Assistant payload remains");

console.log("");
console.log("Physical Security Summary Readiness Pill Cleanup Audit");
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
