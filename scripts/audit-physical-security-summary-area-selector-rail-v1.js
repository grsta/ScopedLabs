const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-selector-rail-audit-002-polish";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function between(value, startToken, endToken) {
  const start = value.indexOf(startToken);
  if (start < 0) return "";
  const end = value.indexOf(endToken, start);
  if (end < 0) return value.slice(start);
  return value.slice(start, end);
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const styleBlock = between(index, "physical-security-summary-area-selector-rail-polish-009", "physical-security-summary-area-rollup-first-007");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("script-cache-bumped", index.includes("./script.js?v=physical-security-summary-area-selector-rail-polish-006"), "Summary script cache bumped");
safe("script-version-bumped", script.includes('const VERSION = "physical-security-summary-area-selector-rail-polish-006";'), "Summary script version bumped");
safe("polish-style-marker", index.includes("physical-security-summary-area-selector-rail-polish-009"), "selector rail polish CSS marker exists");
safe("no-pill-shape", !styleBlock.includes("border-radius: 999px") && !styleBlock.includes("font-weight: 850"), "selector rail no longer uses pill/heavy-chip styling");
safe("nav-style-segments", styleBlock.includes("border-radius: 10px") && styleBlock.includes("linear-gradient") && styleBlock.includes(".summary-area-selector-step.active"), "selector uses nav-style segments");
safe("status-led-style", styleBlock.includes(".summary-area-selector-led") && styleBlock.includes(".summary-area-current-led") && styleBlock.includes("box-shadow: 0 0 11px"), "status LED styling exists");
safe("text-only-status", styleBlock.includes(".summary-area-selector-status") && !styleBlock.includes(".summary-area-selector-status {\n      display: inline-block;\n      margin-left: 6px;"), "status remains inline text, not pill");
safe("active-current-aria", script.includes('aria-current="step"') && script.includes("const isActive = scope.id === selected.id"), "active selector has current-step signal");
safe("led-rendered-in-step", script.includes("summary-area-selector-led") && script.includes("summary-area-selector-label") && script.includes("summary-area-selector-status"), "selector step renders LED, label, and status text");
safe("current-line-led", script.includes("summary-area-current-led") && script.includes("summary-area-selector-current-status"), "current viewing line renders status LED and status text");
safe("selector-behavior-remains", script.includes("data-sl-summary-scope-select") && script.includes("function bindAreaSelector(mount)") && script.includes("render();"), "selector behavior remains");
safe("single-area-safe", script.includes("scopes.length <= 1"), "selector rail remains hidden for one scope");
safe("export-remains", index.includes("exportReport") && index.includes("physicalSecurityReportMount"), "export controls remain");

console.log("");
console.log("Physical Security Summary Area Selector Rail Polish Audit");
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
