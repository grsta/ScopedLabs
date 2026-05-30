const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-summary-cta-persistent-state-audit-001";

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

safe("source-visible-open", index.includes("Open Physical Security Summary") && index.includes("btn btn-secondary"), "source starts as visible neutral Summary link");
safe("complete-state-var", script.includes("let lensSummaryCtaComplete = false;"), "persistent complete flag exists");
safe("helper-no-option-keeps-state", script.includes("const isComplete = lensSummaryCtaComplete;"), "helper without options reads persistent state");
safe("helper-option-writes-state", script.includes("lensSummaryCtaComplete = !!options.complete;"), "helper with options writes persistent state");
safe("success-writes-complete-first", script.includes("function renderSuccess(data) {\n    lensSummaryCtaComplete = true;\n    showSummaryContinueButton({ complete: true });"), "success sets complete state before downstream rendering");
safe("invalidate-clears-complete", script.includes("clearDiagnosticPanel();\n    lensSummaryCtaComplete = false;"), "invalidation clears complete state");
safe("error-clears-complete", script.includes("function renderError(message) {\n    lensSummaryCtaComplete = false;"), "error clears complete state");
safe("cache-current", index.includes("./script.js?v=physical-security-lens-summary-cta-state-015"), "script cache is current");

console.log("");
console.log("Physical Security Lens Summary CTA Persistent State Audit");
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
