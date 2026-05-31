const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-selector-rail-audit-005-selected-scope-guidance";

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
const styleBlock = between(index, "physical-security-summary-area-selector-green-led-011", "physical-security-summary-area-rollup-first-007");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("script-cache-bumped", index.includes("./script.js?v=physical-security-summary-selected-rollup-carryover-values-011"), "Summary script cache bumped");
safe("script-version-bumped", script.includes('const VERSION = "physical-security-summary-selected-rollup-carryover-values-011";'), "Summary script version bumped");
safe("green-led-style-marker", index.includes("physical-security-summary-area-selector-green-led-011"), "selector green LED CSS marker exists");
safe("no-button-box-style", styleBlock.includes("border: 0;") && styleBlock.includes("background: transparent;") && styleBlock.includes("box-shadow: none;"), "selector is visually flow text, not boxed buttons");
safe("no-pill-or-chip-shape", !styleBlock.includes("border-radius: 999px") && !styleBlock.includes("linear-gradient") && !styleBlock.includes("border-radius: 10px"), "selector no longer uses pill/chip/nav-button blocks");
safe("flow-row-style", styleBlock.includes(".summary-area-selector-rail") && styleBlock.includes(".summary-area-selector-arrow") && styleBlock.includes("gap: 6px 8px"), "selector uses flow-row layout");
safe("green-selected-led-style", styleBlock.includes(".summary-area-selector-step.active .summary-area-selector-led") && styleBlock.includes(".summary-area-current-led.risk") && styleBlock.includes("rgba(125,255,152,.96)"), "selected/current LEDs stay green regardless of status");
safe("text-size-clean", styleBlock.includes("font-size: .88rem") && styleBlock.includes("font-weight: 520"), "selector text is smaller and lighter");
safe("active-current-aria", script.includes('aria-current="step"') && script.includes("const isActive = scope.id === selected.id"), "active selector has current-step signal");
safe("led-rendered-in-step", script.includes("summary-area-selector-led") && script.includes("summary-area-selector-label") && script.includes("summary-area-selector-status"), "selector step renders LED, label, and status text");
safe("current-line-led", script.includes("summary-area-current-led") && script.includes("summary-area-selector-current-status"), "currently viewing line renders status LED and status text");
safe("selector-behavior-remains", script.includes("data-sl-summary-scope-select") && script.includes("function bindAreaSelector(mount)") && script.includes("render();"), "selector behavior remains");
safe("single-area-safe", script.includes("scopes.length <= 1"), "selector rail remains hidden for one scope");
safe("export-remains", index.includes("exportReport") && index.includes("physicalSecurityReportMount"), "export controls remain");

console.log("");
console.log("Physical Security Summary Area Selector Flow Style Audit");
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
