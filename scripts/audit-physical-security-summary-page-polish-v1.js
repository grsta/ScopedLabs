const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-page-polish-audit-001";

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
safe("top-pill-row-removed", !index.includes("<span class=\"pill pill--pro\">Pro Tier</span>") && !index.includes("<span class=\"pill\">Category Summary</span>"), "old top Pro/Category pill row removed");
safe("page-heading", index.includes("summary-page-heading") && index.includes("Final category rollup, master assistant review"), "clean page heading exists");
safe("hero-polished", index.includes("summary-page-hero") && index.includes("Master rollup for the Physical Security design") && index.includes("summary-hero-actions"), "hero has polished title and action row");
safe("master-card-remains", index.includes("summary-master-card") && index.includes("physicalSecuritySummaryMasterMount") && index.includes("physicalSecuritySummaryMasterContext"), "master card remains intact");
safe("results-card-polished", index.includes("summary-results-card") && index.includes("Readiness Snapshot") && index.includes("summary-section-copy"), "results card has readiness snapshot intro");
safe("scope-card-polished", index.includes("summary-scope-card") && index.includes("Area, Zone, and Tool Guidance Rollup"), "scope card title is polished");
safe("export-card-polished", index.includes("summary-export-card") && index.includes("Final Report Export") && index.includes("summaryReportDetails") && index.includes("Report metadata"), "export card has compact metadata details");
safe("export-ids-preserved", index.includes("id=\"reportTitle\"") && index.includes("id=\"projectName\"") && index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\""), "export field/control IDs remain");
safe("export-label-standard", index.includes(">Open Report</button>") && !index.includes(">Open Export Report</button>"), "export button label is standardized");
safe("next-actions-polished", index.includes("summary-next-card") && index.includes("summary-next-actions") && index.includes("Return to Area Planner"), "next actions card is polished");
safe("page-style-marker", index.includes("physical-security-summary-page-polish-003"), "page polish style marker exists");
safe("script-cache", index.includes("./script.js?v=physical-security-summary-page-polish-003") && script.includes("physical-security-summary-page-polish-003"), "Summary script cache/version bumped");
safe("kpi-copy-polished", script.includes("Category Status") && script.includes("Tool Guidance") && script.includes("Areas / Zones"), "KPI labels are polished");
safe("hidden-payload-remains", index.includes("physicalSecurityCrossCategoryPayload") && index.includes("hidden aria-hidden=\"true\""), "hidden future Site Assistant payload remains");

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
