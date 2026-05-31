const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-remove-hero-ring-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("hero-ring-removed-marker", index.includes("physical-security-summary-remove-hero-ring-018"), "hero ring removal marker exists");
safe("hero-card-remains", index.includes(".summary-page-hero") && index.includes("summary-hero-actions"), "Summary hero card and actions remain");
safe("hero-ring-selector-removed", !index.includes(".summary-page-hero::after"), "decorative hero pseudo-ring selector removed");
safe("hero-ring-shape-removed", !index.includes("inset: auto 18px 18px auto") && !index.includes("width: 140px") && !index.includes("height: 140px"), "old decorative ring geometry removed");
safe("report-wiring-remains", index.includes("physicalSecurityReportMount") && index.includes("summaryExportSection") && index.includes("physical-security-report-summary"), "Summary report/export wiring remains");

console.log("");
console.log("Physical Security Summary Remove Hero Ring Audit");
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
