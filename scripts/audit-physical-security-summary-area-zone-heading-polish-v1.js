const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-zone-heading-polish-audit-001";

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
safe("heading-polish-marker", index.includes("physical-security-summary-area-zone-heading-polish-015"), "area/zone heading polish marker exists");
safe("section-heading-standout", index.includes(".physical-security-area-zone-report > h3") && index.includes("text-transform: uppercase") && index.includes("border-left: 3px solid"), "area/zone section headings are visually separated");
safe("card-heading-standout", index.includes(".physical-security-area-zone-card h4") && index.includes("font-weight: 850"), "individual area/zone titles are stronger");
safe("area-led-dot", index.includes(".physical-security-area-zone-card h4::before") && index.includes("box-shadow: 0 0 9px"), "area/zone titles get a small LED marker");
safe("table-spacing", index.includes(".physical-security-area-zone-card .summary-table") && index.includes("margin-top: 10px"), "tables are separated from section titles");
safe("no-report-logic-change", index.includes("physical-security-report-summary-") && index.includes("physicalSecurityReportMount"), "report logic wiring remains");

console.log("");
console.log("Physical Security Summary Area/Zone Heading Polish Audit");
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
