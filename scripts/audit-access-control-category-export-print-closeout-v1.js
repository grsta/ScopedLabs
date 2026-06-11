const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];
let failed = false;

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

function check(slug, name, ok, detail = "") {
  rows.push({
    slug,
    status: ok ? "SAFE" : "FAIL",
    check: name,
    detail
  });

  if (!ok) failed = true;
}

function scriptParses(source) {
  try {
    new Function(source);
    return true;
  } catch (error) {
    return false;
  }
}

const tools = [
  "scope-planner",
  "door-count-planner",
  "door-cable-length",
  "panel-capacity",
  "access-level-sizing",
  "reader-type-selector",
  "credential-format",
  "lock-power-budget",
  "fail-safe-fail-secure",
  "elevator-reader-count",
  "anti-passback-zones",
  "special-locking-scope"
];

const sharedVisualTools = {
  "door-count-planner": "renderDoorCount",
  "door-cable-length": "renderDoorCable",
  "credential-format": "renderCredentialFormat",
  "anti-passback-zones": "renderAntiPassback",
  "elevator-reader-count": "renderElevatorReader",
  "fail-safe-fail-secure": "renderFailSafeState",
  "lock-power-budget": "renderLockPowerBudget",
  "special-locking-scope": "renderSpecialLocking"
};

const planning = read("assets/access-control-planning-visuals.js");
const polish = read("assets/access-control-tool-polish.js");

check("shared", "Planning visual module is current", planning.includes("access-control-planning-visuals-059-access-level-shared-visual"));
check("shared", "All shared visual renderers are registered", Object.values(sharedVisualTools).every((name) => planning.includes(name)));
check("shared", "Scope Planner branch map is registered", planning.includes("buildScopePlannerBranchMapSvg") && planning.includes('data-access-control-modern-visual="scope-planner-branch-map"'));
check("shared", "Lock Power shared rail is registered", planning.includes("buildLockPowerBudgetSupplyRailSvg") && planning.includes("renderLockPowerBudget") && planning.includes("access-control-lock-power-rail-label-stack-055"));
check("shared", "Global Access Control polish is current", polish.includes("access-control-tool-polish-011-status-value-weight"));
check("shared", "Global status/value polish is centralized", polish.includes("access-control-status-value-weight-011") && polish.includes(".fail-safe-status-chip") && polish.includes(".result-value") && polish.includes("font-weight:720"));

tools.forEach((slug) => {
  const htmlRel = "tools/access-control/" + slug + "/index.html";
  const scriptRel = "tools/access-control/" + slug + "/script.js";
  const html = read(htmlRel);
  const script = read(scriptRel);

  check(slug, "page exists", Boolean(html));
  check(slug, "script exists", Boolean(script));
  check(slug, "script parses", scriptParses(script));

  if (slug === "scope-planner") {
    check(slug, "loads shared planning visual", html.includes("/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-059-access-level-shared-visual"));
    check(slug, "uses special report print/copy actions", script.includes("printScopeSummary") && script.includes("copyScopeSummary"));
    check(slug, "branch map has export parity", script.includes("buildScopePlannerBranchMapSvg") && script.includes("exportMode: true"));
    check(slug, "print report uses natural packing", script.includes("access-control-scope-planner-print-disclaimer-keep-028") && script.includes("break-inside:avoid;page-break-inside:avoid") && !script.includes("break-before:page;page-break-before:always"));
    check(slug, "does not force calculator output shell", !html.includes("/assets/access-control-output-shell.js"));
  } else {
    check(slug, "loads output shell", html.includes("/assets/access-control-output-shell.js?v=access-control-output-shell-004-export-safe-visual-preference"));
    check(slug, "has export visual callback", script.includes("getChartImage") || script.includes("getExportChartImage") || script.includes("getAccessLevelVisualImage") || script.includes("getReaderTypeVisualImage") || script.includes("getCredentialFormatVisualImage"));
    check(slug, "has report actions/dropdown or export config", script.includes("reportActions") || script.includes("ScopedLabsExportConfig") || script.includes("attachOutputShellExport"));
    check(slug, "loads global Access Control polish", html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-011-status-value-weight"));
  }

  if (Object.prototype.hasOwnProperty.call(sharedVisualTools, slug)) {
    check(slug, "loads current shared planning visual", html.includes("/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-059-access-level-shared-visual"));
    check(slug, "uses expected shared visual bridge", script.includes("ScopedLabsAccessControlPlanningVisuals") && script.includes(sharedVisualTools[slug]));
  }

  if (slug === "lock-power-budget") {
    check(slug, "uses shared rail with local fallback", script.includes("getSharedLockPowerRailImage") && script.includes("buildCadPowerRailSvg"));
  }

  if (slug === "fail-safe-fail-secure") {
    check(slug, "proof pattern A/B markers are in shared renderer", planning.includes("A / ENTERED CONDITIONS") && planning.includes("B / ASSISTANT RECOMMENDATION"));
    check(slug, "Recommendation References are export-ready", script.includes("Recommendation References"));
  }
});

console.log("\nAccess Control category export/print closeout audit");
rows.forEach((row) => {
  const detail = row.detail ? " :: " + row.detail : "";
  console.log(row.status + " " + row.slug + " — " + row.check + detail);
});

const safe = rows.filter((row) => row.status === "SAFE").length;
const fail = rows.filter((row) => row.status === "FAIL").length;

console.log("\nSummary: " + safe + " SAFE / " + fail + " FAIL");

if (failed) process.exit(1);
