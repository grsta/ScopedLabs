const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-selected-scope-guidance-audit-001";

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
const script = read("tools/physical-security/summary/script.js");
const renderBlockStart = script.indexOf("scopeMount.innerHTML =");
const renderBlockEnd = script.indexOf("bindAreaSelector(scopeMount);", renderBlockStart);
const renderBlock = renderBlockStart >= 0 && renderBlockEnd > renderBlockStart ? script.slice(renderBlockStart, renderBlockEnd) : "";

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("script-cache-bumped", index.includes("./script.js?v=physical-security-summary-selected-scope-guidance-009"), "Summary script cache bumped");
safe("script-version-bumped", script.includes('const VERSION = "physical-security-summary-selected-scope-guidance-009";'), "Summary script version bumped");
safe("selected-scope-helper", script.includes("function currentSelectedScope(groups)") && script.includes("function selectedGuidanceTitle(scope)"), "selected scope helpers exist");
safe("selected-scope-renderer", script.includes("function renderSelectedScopeGuidance(groups)") && script.includes("renderAreaToolTable(selected.area || {})"), "selected scope guidance renderer exists");
safe("core-title-selected", script.includes("Core Pipeline Guidance for Selected Area"), "core guidance title is selected-area scoped");
safe("specialty-title-selected", script.includes("Specialty Branch Guidance for Selected Zone"), "specialty guidance title is selected-zone scoped");
safe("scope-render-order", renderBlock.includes("renderAreaRollup(model.groups)") && renderBlock.includes("renderSelectedScopeGuidance(model.groups)") && renderBlock.indexOf("renderAreaRollup(model.groups)") < renderBlock.indexOf("renderSelectedScopeGuidance(model.groups)"), "selected guidance renders after selected area description");
safe("no-across-area-live-tables", !script.includes("Core Pipeline Summary Across Areas") && !script.includes("Optional Specialty Branch Summary Across Zones"), "live Summary does not show across-area tables");
safe("selector-remains", script.includes("renderAreaSelectorRail(scopes, selected)") && script.includes("bindAreaSelector(scopeMount)") && script.includes("data-sl-summary-scope-select"), "area selector remains wired");
safe("green-led-remains", index.includes("physical-security-summary-area-selector-green-led-011") && index.includes(".summary-area-selector-step.active .summary-area-selector-led"), "green selected LED styling remains");
safe("current-card-no-duplicate-table", script.includes("function renderSelectedAreaScope(scope, activeAreaId)") && !script.includes("renderSelectedAreaScope(scope, activeAreaId)") ? false : true, "selected area card function exists");
safe("report-remains", script.includes("renderReportSummary(model)") && index.includes("physicalSecurityReportMount"), "report summary remains wired");

console.log("");
console.log("Physical Security Summary Selected Scope Guidance Audit");
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
