const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];
let failed = false;

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function parses(rel) {
  const text = read(rel);
  if (!text) return false;
  try {
    new Function(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text);
    return true;
  } catch {
    return false;
  }
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
  if (!ok) failed = true;
}

const html = read("tools/access-control/special-locking-scope/index.html");
const script = read("tools/access-control/special-locking-scope/script.js");
const visuals = read("assets/access-control-planning-visuals.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");
const pipelines = read("assets/pipelines.js");

check("Special Locking page exists", exists("tools/access-control/special-locking-scope/index.html"));
check("Special Locking script exists", exists("tools/access-control/special-locking-scope/script.js"));
check("Special Locking script parses", parses("tools/access-control/special-locking-scope/script.js"));
check("Planning visual module parses", parses("assets/access-control-planning-visuals.js"));
check("Assistant adapter module parses", parses("assets/access-control-tool-assistant-adapters.js"));

check("Special Locking body declares v1 category lane", html.includes('data-tool="special-locking-scope"') && html.includes('data-lane="v1"') && html.includes('data-nav-mode="category"'));
check("Special Locking loads tool shell", html.includes("/assets/scopedlabs-tool-shell.js"));
check("Special Locking loads local assistant and adapter modules", html.includes("/assets/scopedlabs-local-assistant.js") && html.includes("/assets/access-control-tool-assistant-adapters.js"));
check("Special Locking loads report metadata module", html.includes("/assets/scopedlabs-report-metadata.js") && html.includes('id="reportMetadataMount"'));
check("Special Locking keeps KB top anchor", html.includes('id="flow-note"'));
check("Special Locking keeps category nav", html.includes('data-access-control-category-nav="true"') && html.includes("/assets/access-control-category-nav.js"));
check("Special Locking imports Scope Planner seed", html.includes("/assets/access-control-scope-state.js") && html.includes('id="scopeSeedContextCard"') && script.includes("applySpecialLockingScopeSeed") && script.includes("SPECIAL_LOCKING_SEED_KEY"));
check("Special Locking pipeline branch points to tool", pipelines.includes('id: "special-locking-scope"') && pipelines.includes("/tools/access-control/special-locking-scope/"));
check("Special Locking has flow actions before metadata", html.indexOf('id="accessControlFlowActions"') > -1 && html.indexOf('id="reportMetadataMount"') > html.indexOf('id="accessControlFlowActions"'));
check("Special Locking report actions are metadata/dropdown owned", html.includes('data-report-actions') && script.includes("placeSpecialLockingReportActions"));

check("Special Locking has output visual shell", html.includes("access-control-output-shell.js") && html.includes('data-output-visual-owner="access-control-output-shell"'));
check("Special Locking has modern planning visual module", html.includes("access-control-planning-visuals.js") && visuals.includes("renderSpecialLocking") && visuals.includes("buildSpecialLockingSvg"));
check("Special Locking script renders through shared visual module", script.includes("ScopedLabsAccessControlPlanningVisuals") && script.includes("renderSpecialLocking"));
check("Special Locking exports modern SVG visual image", script.includes("getSpecialLockingVisualImage") && script.includes("getExportChartImage"));
check("Special Locking has compact decision schedule", html.includes("Special Locking Decision Schedule") && html.includes("data-special-locking-summary") && script.includes("renderSpecialLockingSchedule"));
check("Special Locking has per-opening exception UI", html.includes('id="openingExceptionsCard"') && html.includes('id="exceptionMode"') && html.includes('id="openingExceptionsWrap"'));
check("Special Locking calculates per-opening exception model", script.includes("buildOpeningDetails") && script.includes("openingDetails") && script.includes("exceptionCount") && script.includes("openingRollupLabel"));
check("Special Locking visual supports per-opening tones", visuals.includes("openingTone(0)") && visuals.includes("openingTones") && visuals.includes("exceptions"));
check("Special Locking assistant includes exception summary", adapters.includes("exceptionSummary") && adapters.includes("Opening rollup"));
check("Special Locking export has exception parity sections", script.includes("buildSpecialLockingExportSections") && script.includes("Flagged Opening Exception Schedule") && script.includes("Opening Status Map"));
check("Special Locking export uses custom payload builder", script.includes("customPayloadBuilder = getSpecialLockingExportPayload") && script.includes("stackReportSections: true"));
check("Special Locking export suppresses broken standard chart slot", script.includes('chartImage: ""') && script.includes("Special Locking Visual Snapshot"));
check("Special Locking export uses compact exception tables", script.includes('headers: ["Opening", "Label", "Mode", "Status / Score", "Driver"]') && script.includes('headers: ["Opening", "Label", "Status / Score", "Drivers", "Condition Details"]'));
check("Special Locking has hidden result ledger", html.includes("data-result-ledger") && html.includes("#results[data-result-ledger][hidden]"));
check("Special Locking publishes specialty summary contribution", script.includes("publishSpecialLockingSummaryContribution") && script.includes('contributionType: "specialty-branch"') && script.includes("Specialty / What-if Branches"));
check("Special Locking assistant adapter exists", adapters.includes("buildSpecialLockingScopeModel") && adapters.includes('"special-locking-scope"'));

check("Special Locking has no Chart.js CDN", !html.includes("chart.js"));
check("Special Locking has no canvas chart", !html.includes("<canvas") && html.includes('class="access-control-output-visual"'));
check("Special Locking uses modern local script cache", html.includes("./script.js?v=access-control-special-locking-exceptions-006-scope-seed"));

console.log("\nAccess Control Special Locking module audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
