const fs = require("fs");
const path = require("path");

const root = process.cwd();
const checks = [];
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
}

const planningRel = "assets/access-control-planning-visuals.js";
const polishRel = "assets/access-control-tool-polish.js";
const lockHtmlRel = "tools/access-control/lock-power-budget/index.html";
const lockScriptRel = "tools/access-control/lock-power-budget/script.js";
const scopeHtmlRel = "tools/access-control/scope-planner/index.html";
const scopeScriptRel = "tools/access-control/scope-planner/script.js";

[planningRel, polishRel, lockHtmlRel, lockScriptRel, scopeHtmlRel, scopeScriptRel].forEach((rel) => check(rel + " exists", exists(rel)));

const planning = exists(planningRel) ? read(planningRel) : "";
const polish = exists(polishRel) ? read(polishRel) : "";
const lockHtml = exists(lockHtmlRel) ? read(lockHtmlRel) : "";
const lockScript = exists(lockScriptRel) ? read(lockScriptRel) : "";
const scopeHtml = exists(scopeHtmlRel) ? read(scopeHtmlRel) : "";
const scopeScript = exists(scopeScriptRel) ? read(scopeScriptRel) : "";

check("Planning visual module version bumped", planning.includes("access-control-planning-visuals-056-door-count-export-safe-visual"));
check("Planning visual module exposes Lock Power supply rail builder", planning.includes("function buildLockPowerBudgetSupplyRailSvg") && planning.includes('data-access-control-modern-visual="lock-power-budget-supply-rail"'));
check("Lock Power rail stacks close marker labels", planning.includes("access-control-lock-power-rail-label-stack-055") && planning.includes("stackMarkers") && planning.includes("markerGap < 150"));
check("Planning visual module exposes Lock Power renderer", planning.includes("function renderLockPowerBudget") && planning.includes("renderLockPowerBudget,"));
check("Lock Power loads shared planning visual module", lockHtml.includes('/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-056-door-count-export-safe-visual'));
check("Lock Power live visual prefers shared renderer", lockScript.includes("visuals.renderLockPowerBudget") && lockScript.includes("getSharedLockPowerRailHtml"));
check("Lock Power export image prefers shared visual", lockScript.includes("getSharedLockPowerRailImage") && lockScript.includes("buildCadPowerRailSvg(metrics") && lockScript.includes("if (sharedImage) return sharedImage"));
check("Lock Power keeps local CAD rail fallback", lockScript.includes("function buildCadPowerRailSvg") && lockScript.includes("access-control-lock-power-cad-power-rail-025"));
check("Lock Power keeps output shell export hook", lockScript.includes("ScopedLabsAccessControlOutputShell") && lockScript.includes("attachOutputShellExport") && lockScript.includes("getChartImage"));
check("Scope Planner loads shared planning visual module", scopeHtml.includes('/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-056-door-count-export-safe-visual'));
check("Scope Planner is treated as special planner report with branch-map parity", scopeScript.includes("buildScopePlannerBranchMapSvg") && scopeScript.includes("exportMode: true") && scopeScript.includes("printScopeSummary") && scopeScript.includes("copyScopeSummary"));
check("Scope Planner branch-map visual contract exists in shared module", planning.includes("function buildScopePlannerBranchMapSvg") && planning.includes('data-access-control-modern-visual="scope-planner-branch-map"'));
check("Global Access Control polish version bumped", polish.includes("access-control-tool-polish-011-status-value-weight"));
check("Global status chip polish is centralized", polish.includes("access-control-status-value-weight-011") && polish.includes(".fail-safe-status-chip") && polish.includes("font-weight:720"));
check("Global value weight polish is centralized", polish.includes(".result-value") && polish.includes(".fail-safe-summary-table td:nth-child(3)") && polish.includes("font-weight:720"));

const safe = checks.filter((x) => x.ok).length;
const fail = checks.length - safe;
console.log("\nAccess Control export/print parity closeout audit");
checks.forEach((item) => console.log((item.ok ? "SAFE " : "FAIL ") + item.name + (item.detail ? " :: " + item.detail : "")));
console.log("\nSummary:", safe + " SAFE / " + fail + " FAIL");
if (fail) process.exit(1);
