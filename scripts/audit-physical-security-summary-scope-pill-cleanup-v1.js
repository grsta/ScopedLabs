const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-scope-pill-cleanup-audit-003-source-token-repair";

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
safe("scope-card-remains", index.includes("summary-scope-card") && index.includes("Area, Zone, and Tool Guidance Rollup"), "scope rollup card remains");
safe("scope-pills-removed", !index.includes("<span class=\"pill\">Core Coverage Areas</span>") && !index.includes("<span class=\"pill\">Specialty Zones</span>"), "Core Coverage Areas / Specialty Zones pills removed");
safe("scope-copy-remains", index.includes("Core coverage areas stay on the normal camera design path."), "scope card copy remains");
safe("scope-mount-remains", index.includes("physicalSecurityScopeMount"), "scope rollup mount remains");
safe("category-summary-model-remains", script.includes("scopedlabs.category-summary.v1") && script.includes("crossCategoryReady: true"), "category summary model remains");
safe("scope-types-remain", script.includes("core-coverage") && script.includes("face-recognition-zone") && script.includes("license-plate-zone"), "core and optional branch scope types remain");
safe("cross-category-placeholders-remain", script.includes("network-poe") && script.includes("power-runtime") && script.includes("storage-retention") && script.includes("access-control-doors"), "future cross-category placeholders remain");
safe("master-card-remains", index.includes("summary-master-card") && index.includes("physicalSecuritySummaryMasterMount"), "master assistant card remains");
safe("results-card-remains", index.includes("summary-results-card") && index.includes("Physical Security Rollup"), "results card remains");
safe("export-remains", index.includes("summaryExportSection") && index.includes("id=\"exportReport\""), "export/report remains");

console.log("");
console.log("Physical Security Summary Scope Pill Cleanup Audit");
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
