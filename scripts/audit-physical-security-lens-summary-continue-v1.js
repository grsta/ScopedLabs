const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-summary-continue-audit-002-source-aware";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/lens-selection/index.html");
const script = read("tools/physical-security/lens-selection/script.js");

safe("lens-index-exists", exists("tools/physical-security/lens-selection/index.html"), "Lens index exists");
safe("lens-script-exists", exists("tools/physical-security/lens-selection/script.js"), "Lens script exists");
safe("continue-row-markup", index.includes("id=\"next-step-row\""), "next-step-row exists");
safe("continue-button-markup", index.includes("id=\"continue\"") && index.includes("Continue → Physical Security Summary"), "Summary continue button exists");
safe("summary-url", script.includes("const NEXT_URL = \"/tools/physical-security/summary/\";"), "Summary NEXT_URL remains");
safe("summary-navigation", script.includes("window.location.href = NEXT_URL;"), "Continue navigates to Summary");
safe("explicit-helper", script.includes("function showSummaryContinueButton()"), "explicit continue helper exists");
safe("explicit-display", script.includes("els.continueWrap.style.display = \"block\";") || script.includes("els.continueWrap.style.display = \"flex\";") || index.includes("data-summary-cta-source=\"static-final-route\""), "continue row/source CTA display is visible");
safe("explicit-label", script.includes("els.continueBtn.textContent = \"Continue → Physical Security Summary\";"), "continue button label is forced");
safe("helper-called-after-success", script.includes("ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);\n    showSummaryContinueButton();"), "helper runs after successful calculation");
safe("cache-bumped", index.includes("./script.js?v=physical-security-lens-summary-cta-source-013"), "Lens cache bumped for continue fix");
safe("assistant-ready-remains", index.includes("Lens Design Assistant ready"), "assistant ready card remains");
safe("export-remains", index.includes("id=\"reportMetadataMount\"") && index.includes("id=\"exportReport\""), "collapsible export remains");

console.log("");
console.log("Physical Security Lens Summary Continue Audit");
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
