const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-button-polish-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const style = read("assets/style.css");
const lensIndex = read("tools/physical-security/lens-selection/index.html");
const pixelIndex = read("tools/physical-security/pixel-density/index.html");

safe("style-exists", exists("assets/style.css"), "assets/style.css exists");
safe("lens-index-exists", exists("tools/physical-security/lens-selection/index.html"), "Lens index exists");
safe("pixel-index-exists", exists("tools/physical-security/pixel-density/index.html"), "Pixel Density index exists");
safe("button-polish-marker", style.includes("physical-security-button-polish-001"), "shared button polish marker exists");
safe("lens-square-selector", style.includes("body[data-tool=\"lens-selection\"] .btn"), "Lens square CTA selector exists");
safe("pixel-square-selector", style.includes("body[data-tool=\"pixel-density\"] .btn"), "Pixel Density square CTA selector exists");
safe("rectangular-radius", style.includes("border-radius: 10px !important;"), "rectangular radius is enforced");
safe("disabled-export-selector", style.includes("#exportReport:disabled"), "disabled export selector exists");
safe("disabled-snapshot-selector", style.includes("#saveSnapshot:disabled"), "disabled snapshot selector exists");
safe("not-allowed-cursor", style.includes("cursor: not-allowed !important;"), "disabled buttons use not-allowed cursor");
safe("disabled-grey-style", style.includes("filter: grayscale(0.35) saturate(0.62) !important;") && style.includes("background: rgba(148, 163, 184, 0.08) !important;"), "disabled export buttons are visibly greyed");
safe("lens-style-cache", lensIndex.includes("/assets/style.css?v=style-physical-security-button-polish-001"), "Lens style cache is bumped");
safe("pixel-style-cache", pixelIndex.includes("/assets/style.css?v=style-physical-security-button-polish-001"), "Pixel style cache is bumped");
safe("lens-export-button", lensIndex.includes("id=\"exportReport\""), "Lens export button remains");
safe("pixel-export-button", pixelIndex.includes("id=\"exportReport\""), "Pixel export button remains");
safe("lens-summary-route", lensIndex.includes("Continue → Physical Security Summary"), "Lens Summary route label remains");

console.log("");
console.log("Physical Security Button Polish Audit");
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
