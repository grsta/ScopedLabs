const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-area-selector-rail-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("selector-style-marker", index.includes("physical-security-summary-area-selector-rail-008"), "selector rail CSS marker exists");
safe("selector-pipeline-look", index.includes(".summary-area-selector-rail") && index.includes(".summary-area-selector-arrow") && index.includes(".summary-area-selector-step.active"), "selector rail has pipeline-style controls");
safe("selector-state", script.includes("selectedScopeId") && script.includes("function selectedScope(scopes, activeAreaId)"), "selected area state exists");
safe("selector-render", script.includes("function renderAreaSelectorRail(scopes, selected)") && script.includes("data-sl-summary-area-selector-rail"), "selector rail renderer exists");
safe("selector-click", script.includes("function bindAreaSelector(mount)") && script.includes("data-sl-summary-scope-select") && script.includes("render();"), "selector click handler rerenders selected area");
safe("current-view", script.includes("Currently viewing:") && script.includes("renderSelectedAreaScope(scope, activeAreaId)"), "current selected area card exists");
safe("single-area-safe", script.includes("scopes.length <= 1"), "rail hides when there is only one scope");
safe("empty-state-safe", script.includes("No areas or zones recorded yet."), "empty state remains safe");
safe("summary-order", script.includes("renderAreaRollup(model.groups)") && script.includes("Core Pipeline Summary Across Areas"), "area rollup renders before aggregate summary");
safe("export-remains", index.includes("exportReport") && index.includes("physicalSecurityReportMount"), "export controls remain");

console.log("");
console.log("Physical Security Summary Area Selector Rail Audit");
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
