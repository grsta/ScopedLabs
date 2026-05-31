const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-zone-heading-polish-audit-004-card-polish";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function between(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";

  const end = text.indexOf(endMarker, start);
  if (end < 0) return text.slice(start);

  return text.slice(start, end);
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const headingBlock = between(
  index,
  "physical-security-summary-area-zone-card-polish-017",
  "physical-security-summary-scoped-tool-links-014"
);

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("card-polish-marker", index.includes("physical-security-summary-area-zone-card-polish-017"), "area/zone card polish marker exists");
safe("heading-block-found", headingBlock.includes(".physical-security-area-zone-report > h3") && headingBlock.includes(".physical-security-area-zone-card h4"), "scoped heading/card style block found");
safe("section-heading-subtle", headingBlock.includes("border-bottom: 1px solid") && headingBlock.includes("background: transparent") && headingBlock.includes("text-transform: none"), "section headings stay subtle");
safe("area-card-container", headingBlock.includes(".physical-security-area-zone-card") && headingBlock.includes("border-radius: 16px") && headingBlock.includes("background: rgba(255,255,255,.025)"), "each area/zone is visually grouped as a soft report card");
safe("no-neon-block", !headingBlock.includes("physical-security-summary-area-zone-heading-polish-015") && !headingBlock.includes("border-left: 3px solid") && !headingBlock.includes("text-transform: uppercase"), "old loud heading block removed from scoped heading block");
safe("no-area-led-dot", headingBlock.includes(".physical-security-area-zone-card h4::before") && headingBlock.includes("content: none"), "area title LED dot removed");
safe("card-title-clean", headingBlock.includes(".physical-security-area-zone-card h4") && headingBlock.includes("font-size: 1rem") && headingBlock.includes("letter-spacing: 0"), "area/zone card titles stay clean");
safe("table-inside-card", headingBlock.includes(".physical-security-area-zone-card .summary-table") && headingBlock.includes("margin-top: 12px") && headingBlock.includes("border-radius: 12px"), "tables sit inside area/zone cards");
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
