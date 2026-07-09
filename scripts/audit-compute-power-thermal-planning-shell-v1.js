const fs = require("fs");

let pass = 0;
let fail = 0;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + name + " - " + detail);
  } else {
    fail += 1;
    console.log("[FAIL] " + name + " - " + detail);
  }
}

const html = read("tools/compute/power-thermal/index.html");
const script = read("tools/compute/power-thermal/script.js");
const routeEngine = read("assets/scopedlabs-compute-guided-route-engine.js");
const shell = read("assets/scopedlabs-compute-shell-contract.js");
const assistant = read("assets/scopedlabs-compute-assistant-contract.js");
const map = read("docs/scopedlabs-module-map.md");
const procedure = read("docs/compute-tool-modernization-procedure.md");

check(
  "POWER_THERMAL_PLANNER_BRANCH_EXISTS",
  routeEngine.includes('key: "powerThermal"') &&
    routeEngine.includes('tool: "power-thermal"') &&
    routeEngine.includes('/tools/compute/power-thermal/'),
  "Shared guided route engine should own the Power / Thermal branch."
);

check(
  "POWER_THERMAL_PLAN_STATE_LOADED",
  html.includes("scopedlabs-compute-plan-state.js") &&
    script.includes("const State = window.ScopedLabsComputePlanState") &&
    script.includes("State.recordToolResult"),
  "Power / Thermal should consume shared Compute plan state and publish ledger results."
);

check(
  "POWER_THERMAL_SHARED_SHELL_READY",
  html.includes("scopedlabs-compute-shell-contract.js") ||
    shell.includes("power-thermal"),
  "Power / Thermal should be ready for shared Compute shell ownership."
);

check(
  "POWER_THERMAL_PLANNING_INPUTS_UPGRADED",
  html.includes('id="rackKw"') &&
    html.includes('id="circuitVoltage"') &&
    html.includes('id="circuitAmps"') &&
    html.includes('id="coolingTons"') &&
    script.includes("rackPowerLimitW") &&
    script.includes("coolingTonsAvailable") &&
    script.includes("circuitAmpsUsed"),
  "Power / Thermal should expose rack, circuit, and cooling capacity as planning inputs instead of hardcoded assumptions."
);

check(
  "POWER_THERMAL_NO_HARDCODED_INFRA_CAPACITY",
  !script.includes("totalW / 5000") &&
    !script.includes("tons / 3") &&
    !script.includes("amps208 / 24"),
  "Rack power, cooling, and circuit pressure should be driven by visible planning inputs."
);

check(
  "POWER_THERMAL_OUTPUT_RHYTHM_TARGET",
  html.includes("Result Summary") &&
    html.includes("Recommendation References") &&
    html.includes("Assistant Recommended Actions") &&
    html.includes("Decision Schedule") &&
    html.includes("Export Report"),
  "Modernized visible output should follow the shared Compute rhythm."
);

check(
  "POWER_THERMAL_NO_LEGACY_TOP_CHROME",
  !html.includes('<nav class="breadcrumbs"') &&
    !html.includes("Part of a Design Flow"),
  "Modernized top chrome should match completed tools by removing breadcrumbs and legacy flow explainer card."
);

check(
  "POWER_THERMAL_NO_GENERIC_ANALYZER_FINAL_OUTPUT",
  !script.includes("ScopedLabsAnalyzer.renderOutput({") ||
    script.includes("renderPowerThermalSummaryCard"),
  "Final output should move away from generic analyzer rows toward shared assistant renderers."
);

check(
  "POWER_THERMAL_ASSISTANT_OWNER_TARGET",
  assistant.includes("renderPowerThermalSummaryCard") &&
    assistant.includes("renderPowerThermalRecommendationReferences") &&
    assistant.includes("renderPowerThermalRecommendedActions") &&
    assistant.includes("renderPowerThermalDecisionSchedule"),
  "Shared Compute assistant contract should own Power / Thermal summary/references/actions/schedule after modernization."
);

check(
  "POWER_THERMAL_ROUTE_NOT_HARDCODED_TO_RAID",
  !html.includes('href="/tools/compute/raid-rebuild-time/"') &&
    !html.includes("Continue ? RAID Rebuild"),
  "Continue should respect planner route instead of forcing RAID Rebuild."
);

check(
  "POWER_THERMAL_EXPORT_TARGET",
  html.includes("scopedlabs-report-metadata.js") ||
    html.includes("customPayloadBuilder"),
  "Export should use the modern Compute report metadata/custom payload pattern."
);

check(
  "POWER_THERMAL_MODULE_MAP_TARGET",
  map.includes("power-thermal") &&
    procedure.includes("Planner-Owned Routing Matrix"),
  "Module map/procedure should be available as modernization source of truth."
);

check(
  "POWER_THERMAL_THROUGHPUT_CHROME_PARITY",
  !/tool-best-for|Best for:|pill-row|pill--pro|breadcrumb|breadcrumbs/i.test(html) &&
    html.includes('<div id="pipeline"></div>') &&
    html.includes('<div id="flow-note" class="flow-note" hidden></div>'),
  "Power / Thermal should match Storage Throughput chrome: no best-for line, no Pro/export pills, and no breadcrumbs."
);

check(
  "POWER_THERMAL_EXPORT_THROUGHPUT_PARITY",
  html.includes('class="card compute-export-card"') &&
    html.includes('<h3 class="h3" style="margin-top: 0;">Export Report</h3>') &&
    html.includes('data-report-title="Report details"') &&
    html.includes('data-report-fields="reportTitle,projectName,clientName,preparedBy,customNotes"') &&
    html.includes('data-collapsed="true"') &&
    html.includes('/assets/scopedlabs-assistant-export.js?v=scopedlabs-assistant-export-002') &&
    html.includes('/assets/scopedlabs-user-tool-notes.js?v=scopedlabs-user-tool-notes-001-compute-proof'),
  "Power / Thermal export card should match Storage Throughput report metadata, assistant export, and user notes asset contract."
);

check(
  "POWER_THERMAL_RESET_CLEARS_SHARED_STACK",
  html.includes("./script.js?v=compute-power-thermal-visual-envelope-0708-reset-stack-0709") &&
    script.includes("power-thermal-reset-lifecycle-0709") &&
    script.includes("function clearPowerThermalSubmittedStack0709") &&
    script.includes("clearPowerThermalSubmittedStack0709();") &&
    script.includes("currentPowerThermalExportResult = null") &&
    script.includes("clearPowerThermalCapacityVisual();") &&
    script.includes("computePowerThermalVisualCard") &&
    script.includes("computePowerThermalRecommendationReferencesCard") &&
    script.includes("computePowerThermalRecommendedActionsCard") &&
    script.includes("computePowerThermalDecisionScheduleCard") &&
    !script.includes("power-thermal-action-delegate-final-0709"),
  "Reset and input invalidation should clear the submitted shared stack without alternate click delegation."
);




console.log("");
console.log("Compute Power / Thermal planning shell audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
