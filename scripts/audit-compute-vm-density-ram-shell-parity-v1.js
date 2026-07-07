const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "vm-density", "index.html"),
  script: path.join(root, "tools", "compute", "vm-density", "script.js"),
  assistant: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  visuals: path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js")
};

const src = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));
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

check("VM_DENSITY_RAM_STATIC_SECTIONS", ["computeVmDensitySummaryCard","computeVmDensityVisualCard","computeVmDensityReferencesCard","computeVmDensityRecommendedActionsCard","computeVmDensityDecisionScheduleCard","Recommendation References","Assistant Recommended Actions","Decision Schedule"].every((t) => src.html.includes(t)), "VM Density should have RAM-style static output sections.");

check("VM_DENSITY_RAM_SECTION_ORDER", before(src.html, "computeVmDensitySummaryCard", "computeVmDensityVisualCard") && before(src.html, "computeVmDensityVisualCard", "computeVmDensityReferencesCard") && before(src.html, "computeVmDensityReferencesCard", "computeVmDensityRecommendedActionsCard") && before(src.html, "computeVmDensityRecommendedActionsCard", "computeVmDensityDecisionScheduleCard") && before(src.html, "computeVmDensityDecisionScheduleCard", "exportReport") && before(src.html, "exportReport", "continue-wrap"), "VM Density visible order should be summary, visual, references, actions, schedule, export, continue.");

check("VM_DENSITY_ASSISTANT_CACHE_BUST",
  src.html.includes("compute-assistant-vm-density-decision-schedule-077"),
  "VM Density should load the RAM-shell assistant contract cache-bust."
);

check("VM_DENSITY_SHARED_ASSISTANT_RENDERERS",
  ["renderVmDensityRecommendationReferences","renderVmDensityRecommendedActions","renderVmDensityDecisionSchedule","compute-assistant-vm-density-ram-shell-renderers-0706"].every((t) => src.assistant.includes(t)),
  "Shared Compute assistant contract should own VM Density references/actions/schedule renderers."
);

check("VM_DENSITY_SCRIPT_RENDER_CALLS",
  ["renderVmDensityCapacityVisual(vmDensityResult)","renderVmDensityReferences(vmDensityResult)","renderVmDensityRecommendedActions(vmDensityResult)","renderVmDensityDecisionSchedule(vmDensityResult)"].every((t) => src.script.includes(t)),
  "VM Density calculation should render each RAM-style section."
);

check("VM_DENSITY_LEGACY_FLOW_HIDDEN",
  src.script.includes("prefillStoragePressureFromUpstream();") && !src.script.includes("<strong>Flow Context</strong>") && !src.script.includes("els.flowNote.hidden = false"),
  "Visible Flow Context should be suppressed while preserving upstream prefill."
);

check("VM_DENSITY_NEXT_POWER_THERMAL",
  src.html.includes('data-vm-density-continue-target="power-thermal"') &&
    src.html.includes("Power / Thermal") &&
    src.script.includes('window.location.href = "/tools/compute/power-thermal/"') &&
    !src.script.includes('window.location.href = "/tools/compute/gpu-vram/"'),
  "VM Density should continue toward Power / Thermal."
);

check("VM_DENSITY_SHARED_SUMMARY_RENDERER",
  src.assistant.includes("renderVmDensitySummaryCard") &&
    src.script.includes("window.ScopedLabsComputeAssistant || window.ScopedLabsComputeAssistantContract") &&
    src.script.includes("assistant.renderVmDensitySummaryCard"),
  "VM Density summary/status card should be owned by the shared Compute assistant contract."
);

check("VM_DENSITY_NO_LOCAL_CAPACITY_BUILDER",
  !src.script.includes("function buildVmDensityCapacityEnvelope(") &&
    src.script.includes("visuals.renderVmDensityCapacityEnvelope"),
  "VM Density should use the shared capacity visual renderer instead of a large local capacity builder."
);

check("VM_DENSITY_SHARED_VISUAL_TARGET_SIGNATURE",
  src.visuals.includes("function renderVmDensityCapacityEnvelope(target, result)") &&
    src.script.includes("visuals.renderVmDensityCapacityEnvelope(cards.visual, result)"),
  "VM Density should call the shared capacity visual renderer with the target element and result payload."
);

check("VM_DENSITY_STORAGE_STYLE_RENDERER_RHYTHM",
  src.assistant.includes("scopedlabs-result-summary-card") &&
    src.assistant.includes("compute-recommendation-references-table") &&
    src.assistant.includes("compute-recommended-actions-list") &&
    src.assistant.includes("compute-decision-schedule") &&
    src.visuals.includes("data-compute-vm-density-envelope-0706") &&
    src.visuals.includes("zone-risk") &&
    src.visuals.includes("Density planning checkpoints"),
  "VM Density shared renderers should follow the Storage-style summary, references, actions, schedule, and visual rhythm."
);

check("VM_DENSITY_THROUGHPUT_DECISION_SCHEDULE_LAYOUT",
  src.html.includes("VM Density Decision Schedule") &&
    src.html.includes('data-output-decision-owner="compute-assistant-contract"') &&
    src.assistant.includes('compute-decision-schedule-status') &&
    src.assistant.includes('compute-decision-schedule-table') &&
    src.assistant.includes('<thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead>') &&
    src.assistant.includes('data-vm-density-decision-export-interpretation="0706"') &&
    !src.assistant.includes('compute-decision-schedule-row') &&
    !src.assistant.includes('compute-decision-schedule-head'),
  "VM Density decision schedule should use the exact Storage Throughput status header, table, and interpretation layout."
);

check("VM_DENSITY_STORAGE_STYLE_CARD_CONTRACT",
  src.html.includes("compute-static-summary-card-shell vm-density-result-summary-card") &&
    src.html.includes("card compute-result-visual-card") &&
    src.html.includes('data-output-visual-owner="compute-capacity-visuals"') &&
    src.html.includes("card compute-recommendation-references-card") &&
    src.html.includes("card compute-recommended-actions-card") &&
    src.html.includes("card compute-decision-schedule-card") &&
    src.html.includes('data-export-section="true"') &&
    src.html.includes('data-export-svg="true"'),
  "VM Density output cards should use the same Storage Throughput section contract classes and export markers."
);

check("VM_DENSITY_FLOW_ACTION_CONTRACT",
  src.html.includes('class="compute-flow-actions"') &&
    src.html.includes('data-compute-flow-owner="compute-shell-contract"') &&
    src.html.includes('data-compute-flow-tool="vm-density"') &&
    src.html.includes('data-vm-density-continue-target="power-thermal"'),
  "VM Density Continue should keep shell-owned flow-action metadata while routing to Power / Thermal."
);

check("VM_DENSITY_VISUAL_SELF_CONTAINED",
  src.visuals.includes("data-compute-vm-density-envelope-0706") &&
    !src.visuals.includes("Reserve policy: HA "),
  "VM Density capacity visual should stay self-contained like Storage Throughput, without a loose note under the SVG."
);

check("VM_DENSITY_FOOTER_CHIP_ICONS",
  src.html.includes("scopedlabs-compute-capacity-visuals-030-vm-density-footer-fit") &&
    src.visuals.includes("function footerIcon(type)") &&
    src.visuals.includes('data-vm-density-footer-icon-chip="0706"') &&
    src.visuals.includes("sl-icon-line") &&
    src.visuals.includes("sl-icon-accent") &&
    src.visuals.includes('footerStat(58, "density", "Density"') &&
    src.visuals.includes('footerStat(214, "limiter", "Limiter"') &&
    src.visuals.includes('footerStat(370, "cpu", "CPU Pool"') &&
    src.visuals.includes('footerStat(538, "ram", "RAM Pool"'),
  "VM Density footer chips should include local inline SVG icons using Storage Throughput icon classes."
);

check("VM_DENSITY_FOOTER_CHIP_STYLE",
  src.visuals.includes(".footer-pill{fill:rgba(0,0,0,.18);stroke:rgba(112,255,145,.20);stroke-width:1}") &&
    src.visuals.includes(".footer-label{fill:rgba(203,213,225,.78)") &&
    src.visuals.includes(".footer-value{fill:rgba(248,250,252,.92)") &&
    src.visuals.includes(".sl-icon-line{fill:none;stroke:rgba(226,232,240,.70)") &&
    src.visuals.includes(".sl-icon-accent{fill:none;stroke:#2cff9b") &&
    src.visuals.includes("class=\"footer-pill\"") &&
    src.visuals.includes("class=\"footer-label\"") &&
    src.visuals.includes("class=\"footer-value\""),
  "VM Density footer chips should use Storage Throughput footer classes and colors exactly."
);

check("VM_DENSITY_FOOTER_VALUE_FIT",
  src.html.includes("scopedlabs-compute-capacity-visuals-030-vm-density-footer-fit") &&
    src.visuals.includes("function compactDensityClass(value)") &&
    src.visuals.includes('footerStat(58, "density", "Density", compactDensityClass(densityClass), 150)'),
  "VM Density first footer chip should compact long density labels so text stays inside the Throughput-style chip."
);

const failed = results.filter((r) => !r.pass);
console.log("\nVM Density RAM shell parity audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);
