const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-summary-cta-state-audit-001";

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
const indexNorm = index.split("\r\n").join("\n");

safe("summary-cta-open-initial", indexNorm.includes('data-summary-cta-state="open" data-summary-cta-open-label="Open Physical Security Summary" data-summary-cta-complete-label="Continue → Physical Security Summary">\n              Open Physical Security Summary\n            </a>'), "initial visible Summary CTA copy is neutral open state");
safe("summary-cta-secondary-initial", index.includes("id=\"continue\" class=\"btn btn-secondary\""), "initial Summary CTA is secondary");
safe("summary-cta-state-open", index.includes("data-summary-cta-state=\"open\""), "initial Summary CTA state marker is open");
safe("summary-cta-route", index.includes("href=\"/tools/physical-security/summary/\""), "Summary CTA route remains");
safe("summary-cta-state-helper", script.includes("function showSummaryContinueButton(options)") && script.includes("const isComplete = !!(options && options.complete);"), "Summary CTA helper is state-aware");
safe("summary-cta-promotes-primary", script.includes("els.continueBtn.classList.toggle(\"btn-primary\", isComplete);"), "complete state promotes CTA to primary");
safe("summary-cta-demotes-secondary", script.includes("els.continueBtn.classList.toggle(\"btn-secondary\", !isComplete);"), "open state keeps CTA secondary");
safe("summary-cta-complete-copy", script.includes("Continue → Physical Security Summary"), "complete state copy exists in script");
safe("summary-cta-open-copy", script.includes("Open Physical Security Summary"), "open state copy exists in script");
safe("success-promotes-complete", script.includes("showSummaryContinueButton({ complete: true });"), "successful calculation promotes CTA to Continue");
safe("invalidated-remains-open", script.includes("showSummaryContinueButton();\n\n    prev = null;"), "invalidated state restores open Summary CTA");
safe("cache-bumped", index.includes("./script.js?v=physical-security-lens-summary-cta-state-014"), "Lens script cache bumped");
safe("assistant-ready-remains", index.includes("Lens Design Assistant ready"), "assistant ready card remains");
safe("export-remains", index.includes("id=\"reportMetadataMount\"") && index.includes("id=\"exportReport\""), "collapsible export remains");

console.log("");
console.log("Physical Security Lens Summary CTA State Audit");
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
