const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-page-polish-audit-007-report-table-polish";

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
safe("breadcrumbs-removed", !index.includes("<div class=\"crumbs\">") && !index.includes("<span class=\"sep\">/</span>"), "top breadcrumbs removed");
safe("page-heading-clean", index.includes("summary-page-heading") && index.includes("<h1>Physical Security Summary</h1>") && !index.includes("Final category rollup, master assistant review, and report-ready Physical Security handoff."), "page heading has no repeated description");
safe("hero-flow-row", index.includes("summary-hero-flow") && index.includes("Final Category Rollup") && index.includes("Cross-Category Ready") && index.includes("summary-flow-arrow"), "first card uses flow row with arrow");
safe("hero-pill-row-removed", !index.includes("<span class=\"pill\">Final Category Rollup</span>") && !index.includes("<span class=\"pill\">Cross-Category Ready</span>"), "old first-card pills removed");
safe("flow-style-marker", index.includes("physical-security-summary-page-flow-polish-004"), "flow polish style marker exists");
safe("hero-polished", index.includes("summary-page-hero") && index.includes("Master rollup for the Physical Security design") && index.includes("summary-hero-actions"), "hero remains polished");
safe("master-card-remains", index.includes("summary-master-card") && index.includes("physicalSecuritySummaryMasterMount") && index.includes("physicalSecuritySummaryMasterContext"), "master card remains intact");
safe("results-card-polished", index.includes("summary-results-card") && index.includes("Physical Security Rollup") && index.includes("Quick status snapshot from tool guidance memory and current Area Planner scopes.") && !index.includes("<span class=\"pill\">Readiness Snapshot</span>"), "results card has clean heading/copy with no readiness pill");
safe("scope-card-polished", index.includes("summary-scope-card") && index.includes("Area, Zone, and Tool Guidance Rollup") && !index.includes("<span class=\"pill\">Core Coverage Areas</span>") && !index.includes("<span class=\"pill\">Specialty Zones</span>"), "scope card has clean heading with no top pills");
safe("export-card-polished", index.includes("summary-export-card") && index.includes("Final Report Export") && index.includes("summaryReportDetails") && index.includes("Report metadata") && !index.includes("<span class=\"pill\">Final Report</span>"), "export card remains polished with no Final Report pill");
safe("export-ids-preserved", index.includes("id=\"reportTitle\"") && index.includes("id=\"projectName\"") && index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\""), "export field/control IDs remain");
safe("export-label-standard", index.includes(">Open Report</button>") && !index.includes(">Open Export Report</button>"), "export button label remains standardized");
safe("hidden-payload-remains", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "hidden future Site Assistant payload remains");
safe("script-version-remains", index.includes("./script.js?v=physical-security-summary-area-rollup-first-004") && script.includes("physical-security-summary-area-rollup-first-004"), "Summary script version/cache remains current");

console.log("");
console.log("Physical Security Summary Page Polish Audit");
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
