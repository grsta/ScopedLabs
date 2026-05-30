const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-summary-continue-audit-004-persistent-state";

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
safe("continue-anchor-route", index.includes("id=\"continue\"") && index.includes("href=\"/tools/physical-security/summary/\""), "Summary CTA anchor route exists");
safe("initial-open-state", index.includes("data-summary-cta-state=\"open\"") && index.includes("Open Physical Security Summary"), "initial CTA is open/secondary state");
safe("complete-label-preserved", index.includes("data-summary-cta-complete-label=\"Continue → Physical Security Summary\"") || script.includes("Continue → Physical Security Summary"), "complete Continue label is preserved");
safe("summary-url", script.includes("const NEXT_URL = \"/tools/physical-security/summary/\";"), "Summary NEXT_URL remains");
safe("summary-navigation", script.includes("window.location.href = NEXT_URL;"), "CTA navigates to Summary");
safe("persistent-complete-state", script.includes("let lensSummaryCtaComplete = false;") && script.includes("const isComplete = lensSummaryCtaComplete;"), "persistent Summary CTA completion state exists");
safe("complete-option-updates-state", script.includes("Object.prototype.hasOwnProperty.call(options, \"complete\")") && script.includes("lensSummaryCtaComplete = !!options.complete;"), "complete option updates persistent state");
safe("visible-source-route", index.includes("data-summary-cta-source=\"static-final-route\"") && index.includes("data-lens-summary-cta-source-001"), "source-level Summary CTA route remains visible");
safe("primary-complete-state", script.includes("classList.toggle(\"btn-primary\", isComplete)") && script.includes("showSummaryContinueButton({ complete: true });"), "successful calculation promotes CTA to primary Continue");
safe("secondary-open-state", script.includes("classList.toggle(\"btn-secondary\", !isComplete)") && script.includes("Open Physical Security Summary"), "open state keeps CTA secondary");
safe("cache-bumped", index.includes("./script.js?v=physical-security-lens-summary-cta-state-015"), "Lens script cache is current");
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
