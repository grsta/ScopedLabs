const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  shell: path.join(root, "assets", "scopedlabs-compute-shell-contract.js"),
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

check("VM_DENSITY_RAM_STATIC_SECTIONS", ["computeVmDensitySummaryCard","computeVmDensityVisualCard","computeVmDensityReferencesCard","computeVmDensityRecommendedActionsCard","computeVmDensityDecisionScheduleCard","Recommendation References","Recommended Actions","Decision Schedule"].every((t) => src.html.includes(t)), "VM Density should have RAM-style static output sections.");

check("VM_DENSITY_RAM_SECTION_ORDER", before(src.html, "computeVmDensitySummaryCard", "computeVmDensityVisualCard") && before(src.html, "computeVmDensityVisualCard", "computeVmDensityReferencesCard") && before(src.html, "computeVmDensityReferencesCard", "computeVmDensityRecommendedActionsCard") && before(src.html, "computeVmDensityRecommendedActionsCard", "computeVmDensityDecisionScheduleCard") && before(src.html, "computeVmDensityDecisionScheduleCard", "exportReport") && before(src.html, "exportReport", "id=\"continue-wrap\""), "VM Density visible order should be summary, visual, references, actions, schedule, export, continue.");

check("VM_DENSITY_ASSISTANT_CACHE_BUST",
  src.html.includes("compute-assistant-vm-density-reference-markers-079"),
  "VM Density should load the current VM Density assistant contract cache-bust."
);

check("VM_DENSITY_SHARED_ASSISTANT_RENDERERS", ["renderVmDensityRecommendationReferences","renderVmDensityRecommendedActions","renderVmDensityDecisionSchedule","compute-assistant-vm-density-ram-shell-renderers-0706"].every((t) => src.assistant.includes(t)), "Shared Compute assistant contract should own VM Density references/actions/schedule renderers.");

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

check("VM_DENSITY_THROUGHPUT_RECOMMENDED_ACTIONS_LAYOUT",
  src.html.includes('<h3 class="h3" style="margin-top: 0;">Recommended Actions</h3>') &&
    src.html.includes("Practical actions to validate or reduce VM density pressure before continuing downstream.") &&
    src.html.includes('data-output-actions-owner="compute-assistant-contract"') &&
    src.html.includes('data-export-title="Recommended Actions"') &&
    src.assistant.includes('class="compute-recommended-actions-list"') &&
    src.assistant.includes('class="compute-recommended-action" data-export-text="true" data-vm-density-action-export-row="0706"') &&
    !src.html.includes(">Assistant Recommended Actions</h3>"),
  "VM Density recommended actions should use the same Storage Throughput title, helper text, action row, and export marker layout."
);

check("VM_DENSITY_THROUGHPUT_EXPORT_CARD_LAYOUT",
  src.html.includes('data-vm-density-export-card="0706"') &&
    src.html.includes('<h3 class="h3" style="margin-top: 0;">Export Report</h3>') &&
    src.html.includes('id="reportMetadataMount"') &&
    src.html.includes('data-report-metadata') &&
    src.html.includes('data-report-title="Report details"') &&
    src.html.includes('data-report-copy="Optional metadata can be included in the generated report. Leave blank to use the default report naming."') &&
    src.html.includes('data-report-fields="reportTitle,projectName,clientName,preparedBy,customNotes"') &&
    src.html.includes('data-collapsed="true"') &&
    src.html.includes('/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-008-access-control-category-scope-key') &&
    src.html.includes('data-vm-density-flow-actions-inside-card="0706"') &&
    src.html.includes('href="/tools/compute/storage-throughput/"') &&
    src.html.includes('Back to Storage Throughput') &&
    before(src.html, 'exportStatus', 'id="continue-wrap"') &&
    before(src.html, 'id="continue-wrap"', 'site-footer') &&
    !src.html.includes('Documentation & Export') &&
    !src.html.includes('<div class="export-grid">'),
  "VM Density export should use the exact Storage Throughput report metadata mount and in-card flow action layout."
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
  src.html.includes("scopedlabs-compute-capacity-visuals-031-vm-density-reference-markers") &&
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
  src.html.includes("scopedlabs-compute-capacity-visuals-031-vm-density-reference-markers") &&
    src.visuals.includes("function compactDensityClass(value)") &&
    src.visuals.includes('footerStat(58, "density", "Density", compactDensityClass(densityClass), 150)'),
  "VM Density first footer chip should compact long density labels so text stays inside the Throughput-style chip."
);

check("VM_DENSITY_STATUS_BADGE_CLASS",
  src.assistant.includes('return "is-risk";') &&
    src.assistant.includes('return "is-watch";') &&
    src.assistant.includes('return "is-good";') &&
    src.assistant.includes('class="scopedlabs-result-summary-status \' + esc(statusClass(model.status)) + \'"') &&
    !src.assistant.includes('return "risk";') &&
    !src.assistant.includes('return "watch";') &&
    !src.assistant.includes('return "good";'),
  "VM Density decision schedule status badges should use the same is-* status classes as Storage Throughput."
);


check("VM_DENSITY_ACTIVE_WORKFLOW_THROUGHPUT_LAYOUT",
  src.html.includes('id="computeVmDensityActiveWorkflowMount"') &&
    src.html.includes('data-vm-density-active-workflow-mount="0706"') &&
    src.html.includes('compute-shell-vm-density-active-workflow-078') &&
    !src.html.includes('Compute density validation') &&
    src.script.includes('refreshVmDensityActiveWorkflow(vmDensityResult)') &&
    src.script.includes('refreshVmDensityActiveWorkflow(null)') &&
    src.html.indexOf('data-vm-density-active-workflow-mount="0706"') === src.html.lastIndexOf('data-vm-density-active-workflow-mount="0706"'),
  "VM Density should expose one shell-owned Active Workflow mount and remove the old static density workflow copy."
);

check("VM_DENSITY_ACTIVE_WORKFLOW_SHELL_OWNER",
  src.shell &&
    src.shell.includes('compute-shell-vm-density-active-workflow-0706') &&
    src.shell.includes('ScopedLabsComputeVmDensityActiveWorkflow') &&
    src.shell.includes('data-vm-density-active-workflow-card') &&
    src.shell.includes('ACTIVE WORKFLOW &rarr; VM DENSITY') &&
    src.shell.includes('vm-density-active-workflow-grid') &&
    src.shell.includes('removeDuplicateCards(card)') &&
    src.shell.includes('removeLegacyStaticCards()'),
  "VM Density Active Workflow should be rendered once by the Compute shell using the Storage Throughput card rhythm without duplicating cards."
);



check("VM_DENSITY_NO_BEST_FOR_LINE",
  !src.html.includes('class="tool-best-for"') &&
    !src.html.includes("<strong>Best for:</strong>"),
  "VM Density should not show the legacy Best for line once Active Workflow owns the top context."
);


check("VM_DENSITY_EXPORT_REPORT_INTERPRETATION",
  src.html.includes('"customPayloadBuilder": "ScopedLabsComputeVmDensityExport.buildPayload"') &&
    src.script.includes("let currentVmDensityExportResult = null") &&
    src.script.includes("currentVmDensityExportResult = vmDensityResult") &&
    src.script.includes("function buildVmDensityExportPayload(context)") &&
    src.script.includes("function buildVmDensityInterpretationExportSection(result)") &&
    src.script.includes("function buildVmDensityExportAnalysisSections(result)") &&
    src.script.includes('title: "Engineering Interpretation"') &&
    src.script.includes("Why it matters") &&
    src.script.includes("Primary constraint") &&
    src.script.includes("Recommended correction") &&
    src.script.includes("Carry forward") &&
    src.script.includes("window.ScopedLabsComputeVmDensityExport"),
  "VM Density export report should use a Throughput-style readable Engineering Interpretation payload."
);

check("VM_DENSITY_EXPORT_REPORT_SECTION_PARITY",
  src.script.includes("buildVmDensityVisualExportSection()") &&
    src.script.includes("buildVmDensityReferenceExportSection()") &&
    src.script.includes("buildVmDensityRecommendedActionsExportSection()") &&
    src.script.includes("buildVmDensityDecisionScheduleExportSection()") &&
    src.script.includes('exportSectionsContract: "vm-density-visual-references-actions-schedule-interpretation"') &&
    src.script.includes('interpretation: ""') &&
    src.script.includes("analysisSections: []"),
  "VM Density custom export should preserve visual, references, actions, and schedule while replacing only the generic interpretation narrative."
);


check("VM_DENSITY_PLOTTED_REFERENCE_MARKER_PARITY",
  src.html.includes("scopedlabs-compute-capacity-visuals-031-vm-density-reference-markers") &&
    src.html.includes("compute-assistant-vm-density-reference-markers-079") &&
    src.visuals.includes("[stageX.hosts, stageX.cpu, stageX.ram, stageX.modeled]") &&
    src.visuals.includes('class="point-label">HOSTS *1</text>') &&
    src.visuals.includes('class="point-label">CPU *2</text>') &&
    src.visuals.includes('class="point-label">RAM *3</text>') &&
    src.visuals.includes('class="point-label">MODELED *4</text>') &&
    src.visuals.includes('class="demand-label">Demand: ') &&
    !src.visuals.includes("Demand *1:") &&
    src.assistant.includes('data-compute-vm-density-reference-marker-contract="plotted-checkpoints-0706"') &&
    src.assistant.includes('reference: "Host envelope"') &&
    src.assistant.includes('reference: "CPU limit"') &&
    src.assistant.includes('reference: "RAM limit"') &&
    src.assistant.includes('reference: "Modeled density"') &&
    src.assistant.includes('marker: "*4"'),
  "VM Density chart markers and Recommendation References should match the four plotted checkpoints."
);

check("VM_DENSITY_REFERENCE_MARKER_COLOR_PARITY",
  src.visuals.includes(".marker-hosts{fill:#38d9ff") &&
    src.visuals.includes(".marker-cpu{fill:#a78bfa") &&
    src.visuals.includes(".marker-ram{fill:#60a5fa") &&
    src.visuals.includes(".marker-modeled{fill:#2cff9b") &&
    src.assistant.includes('data-vm-density-reference-marker-colors="0706"') &&
    src.assistant.includes(".vm-density-ref-marker--hosts{color:#38d9ff}") &&
    src.assistant.includes(".vm-density-ref-marker--cpu{color:#a78bfa}") &&
    src.assistant.includes(".vm-density-ref-marker--ram{color:#60a5fa}") &&
    src.assistant.includes(".vm-density-ref-marker--modeled{color:#2cff9b}") &&
    src.assistant.includes('class="vm-density-ref-marker '),
  "VM Density Recommendation Reference marker numbers should use the same colors as the SVG checkpoint markers."
);


check("VM_DENSITY_TOP_CHROME_THROUGHPUT_PARITY",
  (() => {
    const mainIndex = src.html.indexOf('<main class="container page">');
    const h1Index = src.html.indexOf('<h1>VM Density Estimator</h1>', mainIndex);
    const top = mainIndex >= 0 && h1Index > mainIndex ? src.html.slice(mainIndex, h1Index) : "";
    return mainIndex >= 0 &&
      h1Index > mainIndex &&
      !top.includes('class="crumbs"') &&
      !top.includes('pill--pro') &&
      !top.includes('Pro Tier') &&
      before(src.html, '<h1>VM Density Estimator</h1>', '<div id="pipeline"></div>');
  })(),
  "VM Density top chrome should match Storage Throughput by removing breadcrumbs and the top Pro Tier pill."
);

const failed = results.filter((r) => !r.pass);
console.log("\nVM Density RAM shell parity audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);
