const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-master-pill-cleanup-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("master-card-remains", index.includes("summary-master-card") && index.includes("Physical Security Master Assistant"), "master assistant card remains");
safe("master-mount-remains", index.includes("physicalSecuritySummaryMasterMount") && index.includes("physicalSecuritySummaryMasterContext"), "master assistant mounts remain");
safe("master-card-pills-removed", !index.includes("<span class=\"pill\">Master Assistant</span>") && !index.includes("<span class=\"pill\">Category Brain</span>"), "top pills removed from master card");
safe("hero-flow-remains", index.includes("summary-hero-flow") && index.includes("Final Category Rollup") && index.includes("Cross-Category Ready"), "hero flow row remains");
safe("export-remains", index.includes("summaryExportSection") && index.includes("id=\"exportReport\"") && index.includes(">Open Report</button>"), "export/report controls remain");
safe("hidden-payload-remains", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "hidden future Site Assistant payload remains");

console.log("");
console.log("Physical Security Summary Master Pill Cleanup Audit");
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
