const fs = require("fs");
const path = require("path");

const root = process.cwd();
const files = {
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
check("POWER_THERMAL_VISUAL_STORAGE_STYLE", src.visuals.includes("Power / Thermal Infrastructure Envelope") && src.visuals.includes("zone-risk") && src.visuals.includes("zone-watch") && src.visuals.includes("zone-good") && src.visuals.includes("HEADROOM +") && src.visuals.includes("DEFICIT "), "Visual should use the accepted Capacity Envelope rhythm with status bands and headroom/deficit.");
check("POWER_THERMAL_VISUAL_FOOTER_CHIPS", src.visuals.includes('data-power-thermal-footer-icon-chip="0708"') && src.visuals.includes('footerStat(58, "power", "Modeled"') && src.visuals.includes('footerStat(370, "circuit", "Circuit"') && src.visuals.includes('footerStat(538, "cooling", "Cooling"'), "Visual should include compact infrastructure footer chips.");
check("POWER_THERMAL_HTML_VISUAL_CARD", src.html.includes("computePowerThermalVisualCard") && src.html.includes('data-output-visual-owner="compute-capacity-visuals"') && src.html.includes('data-export-title="Power / Thermal Infrastructure Envelope"'), "Power / Thermal page should expose a shared-owned visual card.");
check("POWER_THERMAL_HTML_VISUAL_MOUNT", src.html.includes("computePowerThermalVisual") && src.html.includes('data-compute-capacity-visual="power-thermal"') && src.html.includes('data-export-svg="true"'), "Power / Thermal page should expose an export-ready visual mount.");
check("POWER_THERMAL_HTML_VISUAL_ORDER", before(src.html, "computePowerThermalSummaryCard", "computePowerThermalVisualCard") && before(src.html, "computePowerThermalVisualCard", "computePowerThermalReferencesCard") && before(src.html, "computePowerThermalDecisionScheduleCard", "exportReport"), "Visible rhythm should be summary, visual, references, actions, schedule, export.");
check("POWER_THERMAL_ASSISTANT_CACHE_BUST_VISUAL", src.html.includes("scopedlabs-compute-assistant-contract.js?v=compute-assistant-power-thermal-visual-0708"), "Power / Thermal should force a fresh assistant contract for visual/proof stack rendering.");
check("POWER_THERMAL_VISUAL_ASSET_CACHE_BUST", src.html.includes("scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-032-power-thermal-envelope") && src.html.includes("script.js?v=compute-power-thermal-visual-envelope-0708"), "Power / Thermal should load cache-busted visual and local script assets.");
check("POWER_THERMAL_SCRIPT_VISUAL_REFS", src.script.includes('powerThermalVisualCard: $("computePowerThermalVisualCard")') && src.script.includes('powerThermalVisual: $("computePowerThermalVisual")'), "Script should keep visual card and mount refs.");
check("POWER_THERMAL_SCRIPT_RENDER_CLEAR", src.script.includes("function renderPowerThermalCapacityVisual") && src.script.includes("visuals.renderPowerThermalCapacityEnvelope") && src.script.includes("function clearPowerThermalCapacityVisual") && src.script.includes("clearPowerThermalCapacityVisual();"), "Script should render and clear the shared visual.");
check("POWER_THERMAL_ASSISTANT_NAMESPACE_MERGE", src.script.includes("Object.assign({}, window.ScopedLabsComputeAssistantContract || {}, window.ScopedLabsComputeAssistant || {})"), "Power / Thermal should merge assistant namespaces so cached/global assistant objects do not hide tool renderers.");
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
