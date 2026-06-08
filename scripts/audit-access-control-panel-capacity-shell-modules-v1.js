const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function moduleParses(text) {
  try {
    new Function(text);
    return true;
  } catch (error) {
    return false;
  }
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

function order(text, first, second) {
  const a = text.indexOf(first);
  const b = text.indexOf(second);
  return a >= 0 && b >= 0 && a < b;
}

let failed = false;
const rows = [];

const html = read("tools/access-control/panel-capacity/index.html");
const script = read("tools/access-control/panel-capacity/script.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");
const polish = read("assets/access-control-tool-polish.js");
const outputShell = read("assets/access-control-output-shell.js");

check("Panel Capacity script parses as JavaScript", moduleParses(script));
check("Access Control adapter module parses as JavaScript", moduleParses(adapters));
check("Access Control polish module parses as JavaScript", moduleParses(polish));
check("Access Control output shell parses as JavaScript", moduleParses(outputShell));

check("Panel Capacity opts into Access Control polish", html.includes('data-access-control-tool-polish="true"'));
check("Panel Capacity loads shared export 030", html.includes("/assets/export.js?v=shared-export-030-semantic-report-tones"));
check("Panel Capacity loads Tool Shell module", html.includes("/assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics"));
check("Panel Capacity loads Assistant Export module", html.includes("/assets/scopedlabs-assistant-export.js?v=scopedlabs-assistant-export-001"));
check("Panel Capacity loads Access Control output shell", html.includes("/assets/access-control-output-shell.js?v=access-control-output-shell-001-lock-power-visual-export"));
check("Panel Capacity loads Local Assistant module", html.includes("/assets/scopedlabs-local-assistant.js?v=scopedlabs-local-assistant-009-rich-card-shell"));
check("Panel Capacity loads Panel adapter cache", html.includes("/assets/access-control-tool-assistant-adapters.js?v=access-control-assistant-adapters-021-special-locking-exceptions"));
check("Panel Capacity loads shared planning visual module", html.includes("/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-042-panel-capacity-dynamic-icon"));
check("Panel Capacity loads report metadata module", html.includes("/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-004-area-context-notes"));
check("Panel Capacity loads Access Control polish module", html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-010-page-chrome-pill-cleanup"));
check("Panel Capacity local script cache is dynamic icon lane", html.includes("./script.js?v=access-control-panel-capacity-dynamic-icon-025"));

check("Panel Capacity script order keeps export before shell modules", order(html, "/assets/export.js?v=shared-export-030-semantic-report-tones", "/assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics"));
check("Panel Capacity script order keeps assistant modules before local script", order(html, "/assets/access-control-tool-assistant-adapters.js?v=access-control-assistant-adapters-021-special-locking-exceptions", "./script.js?v=access-control-panel-capacity-dynamic-icon-025"));
check("Panel Capacity script order keeps polish after local script", order(html, "./script.js?v=access-control-panel-capacity-dynamic-icon-025", "/assets/access-control-tool-polish.js?v=access-control-tool-polish-010-page-chrome-pill-cleanup"));

check("Panel Capacity has local assistant mount", html.includes('id="accessControlLocalAssistantMount"'));
check("Panel Capacity has shared report metadata mount", html.includes('id="reportMetadataMount"') && html.includes("data-report-metadata"));
check("Panel Capacity has standard flow actions shell", html.includes('id="accessControlFlowActions"') && html.includes('id="next-step-row"') && html.includes('id="continue"'));
check("Panel Capacity preserves export/snapshot IDs", html.includes('id="exportReport"') && html.includes('id="saveSnapshot"') && html.includes('id="exportStatus"'));
check("Panel Capacity preserves results and chart IDs", html.includes('id="results"') && html.includes('id="chartWrap"') && html.includes('id="chart"'));

check("Panel Capacity has compact capacity schedule shell", html.includes('id="panelCapacityScheduleCard"') && html.includes('id="panelCapacitySchedule"') && script.includes("function renderCapacitySchedule"));
check("Panel Capacity removed Chart.js dependency", !html.includes("chart.js") && !script.includes("new Chart(") && !script.includes("function renderChart("));
check("Panel Capacity CAD architecture map marker exists", script.includes("PANEL_CAPACITY_CAD_ARCHITECTURE_MAP_025_SHARED_DYNAMIC_ICON"));

check("Panel Capacity Back/Continue shell sits before Export Report", html.includes('id="accessControlFlowActions"') && html.includes('id="reportMetadataMount"') && html.indexOf('id="accessControlFlowActions"') < html.indexOf('id="reportMetadataMount"'));
check("Panel Capacity CAD visual uses expanded drawing height", html.includes("min-height:460px") && script.includes("const height = 500;"));
check("Panel Capacity expansion slot strip is fit-guarded", script.includes("const slotW = Math.max(7, Math.min(12") || script.includes("cadAccessPanelCapacityIcon"));
check("Panel Capacity renders panel modules through shared dynamic CAD primitive", script.includes("ScopedLabsAccessControlPlanningVisuals") && script.includes("cadAccessPanelCapacityIcon") && html.includes("/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-042-panel-capacity-dynamic-icon"));



check("Panel Capacity script applies Tool Shell modules", script.includes("function applyShellModules") && script.includes("applyBackContinueShell") && script.includes("accessControlFlowActions"));
check("Panel Capacity script renders local assistant", script.includes("function renderLocalAssistant") && script.includes("ScopedLabsLocalAssistant") && script.includes("ScopedLabsAccessControlToolAssistantAdapters"));
check("Panel Capacity clears local assistant on invalidation", script.includes("function clearLocalAssistant") && script.includes("clearLocalAssistant();"));
check("Panel Capacity attaches chart image through output shell", script.includes("function attachOutputShellExport") && script.includes("shell.attachExportGetter") && script.includes("getChartImage: getExportChartImage"));
check("Panel Capacity adapter registry includes Panel Capacity", adapters.includes('"panel-capacity": Object.freeze') && adapters.includes("function buildPanelCapacityModel"));

check("Panel Capacity preserves core panel formulas", script.includes("const targetDoors = Math.ceil(doors * (1 + spare / 100));") && script.includes("const perPanelCapacity = base + (maxExp * exp);") && script.includes("const panels = Math.max(1, Math.ceil(targetDoors / perPanelCapacity));") && script.includes("const expansionPct = panels > 0 && maxExp > 0 ? (expansions / (panels * maxExp)) * 100 : 0;"));
check("Panel Capacity preserves next step destination", script.includes('window.location.href = "/tools/access-control/access-level-sizing/"'));

console.log("\nAccess Control Panel Capacity shell modules audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
