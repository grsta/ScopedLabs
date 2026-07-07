const fs = require("fs");
const path = require("path");
const root = process.cwd();
const files = {
  html: path.join(root, "tools", "compute", "vm-density", "index.html"),
  script: path.join(root, "tools", "compute", "vm-density", "script.js"),
  assistant: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js")
};
const src = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
const results = [];
function check(name, pass, detail) { results.push({ name, pass: !!pass, detail }); console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail); }
function before(source, a, b) { const ia = source.indexOf(a); const ib = source.indexOf(b); return ia >= 0 && ib >= 0 && ia < ib; }

check("VM_DENSITY_RAM_STATIC_SECTIONS", ["computeVmDensityVisualCard","computeVmDensityReferencesCard","computeVmDensityRecommendedActionsCard","computeVmDensityDecisionScheduleCard","Recommendation References","Assistant Recommended Actions","Decision Schedule"].every((t) => src.html.includes(t)), "VM Density should have RAM-style static output sections.");
check("VM_DENSITY_RAM_SECTION_ORDER", before(src.html, "computeVmDensityVisualCard", "computeVmDensityReferencesCard") && before(src.html, "computeVmDensityReferencesCard", "computeVmDensityRecommendedActionsCard") && before(src.html, "computeVmDensityRecommendedActionsCard", "computeVmDensityDecisionScheduleCard") && before(src.html, "computeVmDensityDecisionScheduleCard", "exportReport"), "VM Density visible order should be visual, references, actions, schedule, export.");
check("VM_DENSITY_ASSISTANT_CACHE_BUST",
  src.html.includes("compute-assistant-vm-density-ram-shell-071"),
  "VM Density should load the RAM-shell assistant contract cache-bust."
);

check("VM_DENSITY_SHARED_ASSISTANT_RENDERERS", ["renderVmDensityRecommendationReferences","renderVmDensityRecommendedActions","renderVmDensityDecisionSchedule","compute-assistant-vm-density-ram-shell-renderers-0706"].every((t) => src.assistant.includes(t)), "Shared Compute assistant contract should own VM Density references/actions/schedule renderers.");
check("VM_DENSITY_SCRIPT_RENDER_CALLS", ["renderVmDensityCapacityVisual(vmDensityResult)","renderVmDensityReferences(vmDensityResult)","renderVmDensityRecommendedActions(vmDensityResult)","renderVmDensityDecisionSchedule(vmDensityResult)"].every((t) => src.script.includes(t)), "VM Density calculation should render each RAM-style section.");
check("VM_DENSITY_LEGACY_FLOW_HIDDEN", src.script.includes("prefillStoragePressureFromUpstream();") && !src.script.includes("<strong>Flow Context</strong>") && !src.script.includes("els.flowNote.hidden = false"), "Visible Flow Context should be suppressed while preserving upstream prefill.");
check("VM_DENSITY_NEXT_POWER_THERMAL",
  src.html.includes('data-vm-density-continue-target="power-thermal"') &&
    src.html.includes("Power / Thermal") &&
    src.script.includes('window.location.href = "/tools/compute/power-thermal/"') &&
    !src.script.includes('window.location.href = "/tools/compute/gpu-vram/"'),
  "VM Density should continue toward Power / Thermal."
);

const failed = results.filter((r) => !r.pass);

check("VM_DENSITY_SHARED_SUMMARY_RENDERER",
  src.assistant.includes("renderVmDensitySummaryCard") &&
    src.script.includes("assistant.renderVmDensitySummaryCard"),
  "VM Density summary/status card should be owned by the shared Compute assistant contract.");

check("VM_DENSITY_NO_LOCAL_CAPACITY_BUILDER",
  !src.script.includes("function buildVmDensityCapacityEnvelope(") &&
    src.script.includes("visuals.renderVmDensityCapacityEnvelope"),
  "VM Density should use the shared capacity visual renderer instead of a large local capacity builder.");

console.log("\nVM Density RAM shell parity audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);
