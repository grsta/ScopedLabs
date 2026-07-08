const fs = require("fs");
const path = require("path");

const root = process.cwd();
const files = {
  assistant: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  html: path.join(root, "tools", "compute", "power-thermal", "index.html"),
  script: path.join(root, "tools", "compute", "power-thermal", "script.js"),
  visuals: path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"),
  map: path.join(root, "docs", "scopedlabs-module-map.md")
};
const src = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]));
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail);
}

function before(source, a, b) {
  const ia = source.indexOf(a);
  const ib = source.indexOf(b);
  return ia >= 0 && ib >= 0 && ia < ib;
}

check("POWER_THERMAL_VISUAL_SHARED_BUILDER", src.visuals.includes("function buildPowerThermalCapacityEnvelopeSvg") && src.visuals.includes("data-compute-power-thermal-envelope-0708"), "Shared Compute capacity visual module should own the Power / Thermal SVG builder.");
check("POWER_THERMAL_VISUAL_SHARED_RENDERER", src.visuals.includes("function renderPowerThermalCapacityEnvelope") && src.visuals.includes("api.renderPowerThermalCapacityEnvelope = renderPowerThermalCapacityEnvelope"), "Shared Compute capacity visual module should export the Power / Thermal renderer.");
check("POWER_THERMAL_VISUAL_EXPORT_ROUTE", src.visuals.includes('type === "power-thermal"') && src.visuals.includes("return buildPowerThermalCapacityEnvelopeSvg"), "Shared capacity export route should recognize power-thermal.");
check("POWER_THERMAL_VISUAL_STORAGE_STYLE", (() => {
  const markerAt = src.visuals.indexOf("compute-power-thermal-capacity-envelope-0708");
  const endAt = markerAt >= 0 ? src.visuals.indexOf("})();", markerAt) : -1;
  const block = markerAt >= 0 && endAt > markerAt ? src.visuals.slice(markerAt, endAt) : "";
  return block.includes("Power / Thermal Infrastructure Envelope") &&
    block.includes("zone-risk") &&
    block.includes("zone-watch") &&
    block.includes("zone-good") &&
    block.includes("status-text") &&
    block.includes('data-power-thermal-marker-rhythm="vm-density-0708"') &&
    block.includes('var gapLabel = deficitPct > 0 ? "deficit *5" : "headroom *5";') &&
    block.includes("gapTop") &&
    block.includes("gapBottom") &&
    block.includes("bracket-line") &&
    block.includes("bracket-text");
})(), "Visual should use the accepted Capacity Envelope rhythm with status bands, status badge, VM Density-style checkpoint markers, and separate headroom/deficit bracket.");

check("POWER_THERMAL_VISUAL_LABEL_FIT", src.visuals.includes('data-power-thermal-marker-rhythm="vm-density-0708"') && src.visuals.includes("var stageX = {") && src.visuals.includes("limit: plot.x + 586") && src.visuals.includes('text-anchor="end" class="limit-label">100% usable limit') && src.visuals.includes('var gapLabel = deficitPct > 0 ? "deficit *5" : "headroom *5";') && src.visuals.includes('markerPoint(stageX.limit, yLimitPoint, "marker-limit", "LIMIT *4"'), "Power / Thermal visual should follow VM Density marker rhythm with separate rail and bracket annotations.");
check("POWER_THERMAL_VISUAL_FOOTER_CHIPS", src.visuals.includes('data-power-thermal-footer-icon-chip="0708"') && src.visuals.includes('footerStat(58, "power", "Modeled"') && src.visuals.includes('footerStat(370, "circuit", "Circuit"') && src.visuals.includes('footerStat(538, "cooling", "Cooling"'), "Visual should include compact infrastructure footer chips.");
check("POWER_THERMAL_HTML_VISUAL_CARD", src.html.includes("computePowerThermalVisualCard") && src.html.includes('data-output-visual-owner="compute-capacity-visuals"') && src.html.includes('data-export-title="Power / Thermal Infrastructure Envelope"'), "Power / Thermal page should expose a shared-owned visual card.");
check("POWER_THERMAL_HTML_VISUAL_MOUNT", src.html.includes("computePowerThermalVisual") && src.html.includes('data-compute-capacity-visual="power-thermal"') && src.html.includes('data-export-svg="true"'), "Power / Thermal page should expose an export-ready visual mount.");
check("POWER_THERMAL_HTML_VISUAL_ORDER", before(src.html, "computePowerThermalSummaryCard", "computePowerThermalVisualCard") && before(src.html, "computePowerThermalVisualCard", "computePowerThermalReferencesCard") && before(src.html, "computePowerThermalDecisionScheduleCard", "exportReport"), "Visible rhythm should be summary, visual, references, actions, schedule, export.");
check("POWER_THERMAL_ASSISTANT_CACHE_BUST_VISUAL", src.html.includes("scopedlabs-compute-assistant-contract.js?v=compute-assistant-power-thermal-visual-0708"), "Power / Thermal should force a fresh assistant contract for visual/proof stack rendering.");
check("POWER_THERMAL_VISUAL_ASSET_CACHE_BUST", src.html.includes("scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-034-power-thermal-marker-rhythm") && src.html.includes("script.js?v=compute-power-thermal-visual-envelope-0708"), "Power / Thermal should load cache-busted visual and local script assets.");
check("POWER_THERMAL_SCRIPT_VISUAL_REFS", src.script.includes('powerThermalVisualCard: $("computePowerThermalVisualCard")') && src.script.includes('powerThermalVisual: $("computePowerThermalVisual")'), "Script should keep visual card and mount refs.");
check("POWER_THERMAL_SCRIPT_RENDER_CLEAR", src.script.includes("function renderPowerThermalCapacityVisual") && src.script.includes("visuals.renderPowerThermalCapacityEnvelope") && src.script.includes("function clearPowerThermalCapacityVisual") && src.script.includes("clearPowerThermalCapacityVisual();"), "Script should render and clear the shared visual.");
check("POWER_THERMAL_SUMMARY_VM_DENSITY_STYLE", src.assistant.includes("<h3>POWER / THERMAL</h3>") && src.assistant.includes("Recommendation") && src.assistant.includes("Confidence") && src.assistant.includes("Decision Flags") && src.assistant.includes("Primary Risk") && src.assistant.includes("Carry this Power / Thermal result into Compute Summary"), "Power / Thermal Result Summary should follow the VM Density summary-card rhythm.");
check("POWER_THERMAL_SUMMARY_INDEPENDENT_VM_DENSITY_STYLE", (() => {
  const markerAt = src.assistant.indexOf("compute-assistant-power-thermal-independent-renderers-0708");
  const start = markerAt >= 0 ? src.assistant.indexOf("api.renderPowerThermalSummaryCard", markerAt) : -1;
  const end = start >= 0 ? src.assistant.indexOf("api.renderPowerThermalRecommendationReferences", start) : -1;
  const block = start >= 0 && end > start ? src.assistant.slice(start, end) : "";
  return block.includes('data-power-thermal-summary-vm-density-rhythm="0708"') &&
    block.includes("<h3>POWER / THERMAL</h3>") &&
    block.includes("Recommendation") &&
    block.includes("Confidence") &&
    block.includes("Decision Flags") &&
    block.includes("Primary Risk") &&
    !block.includes("Modeled Load") &&
    !block.includes("Heat Load") &&
    !block.includes("Cooling Demand");
})(), "Independent Power / Thermal summary renderer should copy the VM Density summary rhythm, not the metric-grid summary.");
check("POWER_THERMAL_ASSISTANT_INDEPENDENT_RENDERERS", src.assistant.includes("compute-assistant-power-thermal-independent-renderers-0708") && src.assistant.includes("api.renderPowerThermalSummaryCard = function renderPowerThermalSummaryCard") && src.assistant.includes("api.renderPowerThermalRecommendationReferences = function renderPowerThermalRecommendationReferences") && src.assistant.includes("api.renderPowerThermalRecommendedActions = function renderPowerThermalRecommendedActions") && src.assistant.includes("api.renderPowerThermalDecisionSchedule = function renderPowerThermalDecisionSchedule") && src.assistant.includes("window.ScopedLabsComputeAssistant = api;"), "Power / Thermal assistant proof stack should be exported from an independent VM Density-style IIFE.");
check("POWER_THERMAL_SCRIPT_RENDER_ORDER", (() => {
  const start = src.script.indexOf("function renderPowerThermalSharedOutput(result)");
  const end = start >= 0 ? src.script.indexOf("function buildPowerThermalExportPayload", start) : -1;
  const block = start >= 0 && end > start ? src.script.slice(start, end) : "";
  return before(block, "assistant.renderPowerThermalSummaryCard", "renderPowerThermalCapacityVisual(result)") &&
    before(block, "renderPowerThermalCapacityVisual(result)", "assistant.renderPowerThermalRecommendationReferences");
})(), "Script should render the visual between summary and references inside the shared output render block.");
check("POWER_THERMAL_DUPLICATE_INPUT_REFS_REMOVED", src.script.indexOf('rackKw: $("rackKw")') === src.script.lastIndexOf('rackKw: $("rackKw")') && src.script.indexOf('if (els.rackKw) els.rackKw.value = 5;') === src.script.lastIndexOf('if (els.rackKw) els.rackKw.value = 5;'), "Visual lane should clean duplicate Power / Thermal input refs/reset assignments.");
check("POWER_THERMAL_VISUAL_MODULE_MAP", src.map.includes("COMPUTE_POWER_THERMAL_VISUAL_ENVELOPE_0708") && src.map.includes("buildPowerThermalCapacityEnvelopeSvg") && src.map.includes("renderPowerThermalCapacityEnvelope"), "Module map should record Power / Thermal visual ownership.");

check("POWER_THERMAL_LEGACY_ANALYZER_SUPPRESSED", src.html.includes('data-power-thermal-internal-ledger="0708"') && src.script.includes("function hidePowerThermalLegacyAnalyzer") && src.script.includes("chartWrapRef.current.style.display = \"none\"") && src.script.includes("hidePowerThermalLegacyAnalyzer();"), "Legacy analyzer Results/chart should be hidden behind an internal ledger after the shared visual is wired.");

const failed = results.filter((result) => !result.pass);
console.log("");
console.log("Compute Power / Thermal visual envelope audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);
