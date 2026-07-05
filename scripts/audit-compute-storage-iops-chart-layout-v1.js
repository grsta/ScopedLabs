const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "script.js"), "utf8");
const storageIopsVisualAsset = fs.readFileSync(path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"), "utf8");
const visuals = fs.readFileSync(path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"), "utf8");
const shell = fs.readFileSync(path.join(root, "assets", "scopedlabs-compute-shell-contract.js"), "utf8");

const checks = [];

function check(name, ok, note) {
  checks.push({ name, ok: Boolean(ok), note: note || "" });
}

function pos(token) {
  return html.indexOf(token);
}

// storage-iops-result-summary-card-audit-0704
check("STORAGE_IOPS_RESULT_CARD_PRESENT", html.includes('id="computeStorageIopsResultCard"'));
check("STORAGE_IOPS_RESULT_SUMMARY_MOUNT_PRESENT", html.includes('id="computeStorageIopsResultSummary"'));
check("STORAGE_IOPS_RESULT_CARD_BEFORE_VISUAL", html.indexOf('id="computeStorageIopsResultCard"') > -1 && html.indexOf('id="computeStorageIopsResultCard"') < html.indexOf('id="computeStorageIopsVisualCard"'));
check("STORAGE_IOPS_RESULT_RENDERER_PRESENT", js.includes("function renderStorageIopsResultSummary") && js.includes("storage-iops-result-summary-card-0704"));
check("STORAGE_IOPS_RESULT_RENDERED_BEFORE_VISUAL", js.includes("renderStorageIopsResultSummary(result);") && js.indexOf("renderStorageIopsResultSummary(result);") < js.indexOf("renderStorageIopsCapacityEnvelope"));
check("STORAGE_IOPS_RESULT_CLEAR_PRESENT", js.includes("function clearStorageIopsResultSummary") && js.includes("clearStorageIopsResultSummary();"));

check("STORAGE_IOPS_VISUAL_CARD_PRESENT", html.includes('id="computeStorageIopsVisualCard"'));
check("STORAGE_IOPS_VISUAL_MOUNT_PRESENT", html.includes('id="computeStorageIopsVisual"'));
check("STORAGE_IOPS_VISUAL_USES_SHARED_OWNER", html.includes('data-output-visual-owner="compute-capacity-visuals"'));
check("STORAGE_IOPS_VISUAL_USES_CAPACITY_CLASS", html.includes('class="compute-capacity-visual"'));
check("STORAGE_IOPS_VISUAL_TITLE_PRESENT", html.includes("Storage IOPS Capacity Envelope"));

check("SHARED_STORAGE_IOPS_VISUAL_BUILDER_PRESENT", visuals.includes("function buildStorageIopsCapacityEnvelopeSvg"));
check("SHARED_STORAGE_IOPS_VISUAL_RENDERER_PRESENT", visuals.includes("function renderStorageIopsCapacityEnvelope"));
check("SHARED_STORAGE_IOPS_VISUAL_RENDERER_EXPORTED", visuals.includes("renderStorageIopsCapacityEnvelope,"));
check("STORAGE_IOPS_SCRIPT_CALLS_SHARED_RENDERER", js.includes("renderStorageIopsCapacityEnvelope"));
check("STORAGE_IOPS_SCRIPT_HAS_VISUAL_CLEAR", js.includes("clearStorageIopsCapacityVisual"));

check("RAM_SHELL_CONTEXT_BEFORE_INPUTS", pos('id="computeWorkloadContextCard"') > -1 && pos('id="computeWorkloadContextCard"') < pos('id="toolCard"'));
check("INPUTS_BEFORE_LEDGER", pos('id="toolCard"') > -1 && pos('id="toolCard"') < pos('id="computeInternalResultsLedger"'));
check("LEDGER_BEFORE_ASSISTANT", pos('id="computeInternalResultsLedger"') > -1 && pos('id="computeInternalResultsLedger"') < pos('id="computeAssistantCard"'));
check("ASSISTANT_BEFORE_VISUAL", pos('id="computeAssistantCard"') > -1 && pos('id="computeAssistantCard"') < pos('id="computeStorageIopsVisualCard"'));
check("VISUAL_BEFORE_REFERENCES", pos('id="computeStorageIopsVisualCard"') > -1 && pos('id="computeStorageIopsVisualCard"') < pos('id="computeStorageIopsReferencesCard"'));
check("SCHEDULE_BEFORE_HIDDEN_PROOF_STACK", pos('id="computeStorageIopsDecisionScheduleCard"') > -1 && pos('id="computeStorageIopsDecisionScheduleCard"') < pos('id="storageIopsProofStackCard"'));
check("REFERENCES_BEFORE_ACTIONS", pos('id="computeStorageIopsReferencesCard"') > -1 && pos('id="computeStorageIopsReferencesCard"') < pos('id="computeStorageIopsRecommendedActionsCard"'));
check("ACTIONS_BEFORE_SCHEDULE", pos('id="computeStorageIopsRecommendedActionsCard"') > -1 && pos('id="computeStorageIopsRecommendedActionsCard"') < pos('id="computeStorageIopsDecisionScheduleCard"'));

check("SQUARE_CTA_TOKEN_PRESENT", html.includes("data-sl-square-ctas"), "Known current WATCH if missing.");
check("NO_PILL_PRO_TOKEN_ON_STORAGE_IOPS_PAGE", !html.includes("pill pill--pro"), "Known current WATCH if pill remains.");
check("FLOW_ACTIONS_PRESENT", html.includes("compute-flow-actions"));
check("BACK_LINK_TO_RAM_PRESENT", html.includes("/tools/compute/ram-sizing/") && html.includes("Back to RAM Sizing"));
check("CONTINUE_LINK_TO_STORAGE_THROUGHPUT_PRESENT", html.includes("/tools/compute/storage-throughput/") && html.includes("Continue &rarr; Storage Throughput"));
check("NO_CPU_CONTINUE_LABEL", !html.includes("Continue to CPU Sizing"));

check("VISIBLE_FLOW_CONTEXT_SOURCE_SUPPRESSED", js.includes("compute-storage-iops-hide-visible-flow-context-0704"));
check("VISIBLE_FLOW_CONTEXT_PAGE_CSS_GUARD_PRESENT", html.includes("storage-iops-flow-note-source-hide-0704"));
check("SHARED_SHELL_FLOW_OBSERVER_PRESENT", shell.includes("function watchGeneratedFlowContext"));

try {
  new Function(js);
  new Function(visuals);
  new Function(shell);
  check("SCRIPTS_PARSE", true);
} catch (error) {
  check("SCRIPTS_PARSE", false, error.message);
  console.error(error.message);
}

// storage-iops-result-ram-parity-audit-0704
check("STORAGE_IOPS_RESULT_RAM_PARITY_STYLE", html.includes("storage-iops-result-ram-parity-style-0704") && html.includes("storage-iops-result-panel"));
check("STORAGE_IOPS_RESULT_RAM_LAYOUT_LABELS", shell.includes("RECOMMENDATION") && shell.includes("CONFIDENCE") && shell.includes("DECISION FLAGS") && shell.includes("PRIMARY RISK"));
check("STORAGE_IOPS_RESULT_NO_SEPARATE_SUMMARY_H3", !html.includes(">Storage IOPS result summary</h3>"));
check("STORAGE_IOPS_RESULT_CACHE_BUST_RAM_PARITY", html.includes("script.js?v=compute-storage-iops-export-hooks-0705"));

// compute-result-card-contract-promotion-audit-0704
check("COMPUTE_RESULT_CARD_CONTRACT_IN_SHARED_SHELL", shell.includes("compute-result-card-contract-0704") && shell.includes("renderComputeResultCard") && shell.includes("clearComputeResultCard"));
check("STORAGE_IOPS_USES_SHARED_RESULT_CARD_RENDERER", js.includes("ScopedLabsComputeShellContract.renderComputeResultCard"));
check("STORAGE_IOPS_USES_SHARED_RESULT_CARD_CLEAR", js.includes("ScopedLabsComputeShellContract.clearComputeResultCard"));
check("STORAGE_IOPS_COMPUTE_SHELL_CACHE_BUST_RESULT_CARD", html.includes("scopedlabs-compute-shell-contract.js?v=compute-result-card-contract-0704"));
check("STORAGE_IOPS_SCRIPT_CACHE_BUST_SHARED_RESULT_CARD", html.includes("script.js?v=compute-storage-iops-export-hooks-0705"));

// storage-iops-icon-envelope-audit-0705
check("STORAGE_IOPS_ICON_ENVELOPE_MARKER", storageIopsVisualAsset.includes("storage-iops-icon-envelope-polish-0705") || storageIopsVisualAsset.includes("storage-iops-title-risk-polish-0705"));
check("STORAGE_IOPS_TITLE_IS_PLAIN_TEXT", storageIopsVisualAsset.includes("Storage IOPS Capacity Envelope") && storageIopsVisualAsset.includes(".status-badge"));
check("STORAGE_IOPS_INLINE_ICON_CLASSES_PRESENT", storageIopsVisualAsset.includes(".sl-icon-line") && storageIopsVisualAsset.includes(".sl-icon-accent") && storageIopsVisualAsset.includes(".sl-icon-dot"));
check("STORAGE_IOPS_INLINE_ICON_SET_PRESENT", storageIopsVisualAsset.includes("const StorageIopsIcons") && storageIopsVisualAsset.includes("storage: function storage") && storageIopsVisualAsset.includes("workload: function workload") && storageIopsVisualAsset.includes("raid: function raid") && storageIopsVisualAsset.includes("latency: function latency") && storageIopsVisualAsset.includes("block: function block"));
check("STORAGE_IOPS_FOOTER_ICON_CHIPS_PRESENT", storageIopsVisualAsset.includes("StorageIopsIcons.storage") && storageIopsVisualAsset.includes("StorageIopsIcons.workload") && storageIopsVisualAsset.includes("StorageIopsIcons.raid") && storageIopsVisualAsset.includes("StorageIopsIcons.latency") && storageIopsVisualAsset.includes("StorageIopsIcons.block"));
check("STORAGE_IOPS_HEADROOM_DEFICIT_BRACKET_PRESENT", storageIopsVisualAsset.includes("HEADROOM") && storageIopsVisualAsset.includes("DEFICIT") && storageIopsVisualAsset.includes("bracket-line"));
check("STORAGE_IOPS_PLATFORM_ZONE_BANDS_PRESENT", storageIopsVisualAsset.includes("band-good") && storageIopsVisualAsset.includes("band-watch") && storageIopsVisualAsset.includes("band-risk"));
check("STORAGE_IOPS_VISUAL_ASSET_CACHE_BUST_ICON_ENVELOPE", html.includes("scopedlabs-compute-capacity-visuals.js?v=storage-iops-reference-markers-0705"));
check("STORAGE_IOPS_ICON_ENVELOPE_POLISH_MARKER", storageIopsVisualAsset.includes("storage-iops-icon-envelope-polish-0705"));
check("STORAGE_IOPS_ICON_ENVELOPE_LARGER_PLOT", storageIopsVisualAsset.includes('const plot = { x: 58, y: 78, w: 646, h: 244 };'));
check("STORAGE_IOPS_ICON_ENVELOPE_INNER_FRAME_REMOVED", storageIopsVisualAsset.includes('.inner-frame{display:none;}'));
check("STORAGE_IOPS_ICON_ENVELOPE_STRONGER_ZONE_BANDS", storageIopsVisualAsset.includes(".band-watch{fill:rgba(250,204,21,0.14);}") && storageIopsVisualAsset.includes(".band-risk{fill:rgba(") && storageIopsVisualAsset.includes("0.22);}"));
check("STORAGE_IOPS_ICON_ENVELOPE_CENTERED_FOOTER_CHIPS", storageIopsVisualAsset.includes('footerStat(70, StorageIopsIcons.storage') && storageIopsVisualAsset.includes('footerStat(566, StorageIopsIcons.block'));
check("STORAGE_IOPS_ICON_ENVELOPE_RAISED_POINT_LABELS", storageIopsVisualAsset.includes('yBase - 34') && storageIopsVisualAsset.includes('yBurst - 34') && storageIopsVisualAsset.includes('yRequired - 36'));
check("STORAGE_IOPS_ICON_ENVELOPE_STACKED_DEFICIT_LABEL", storageIopsVisualAsset.includes("bracketLabelPrimary") && storageIopsVisualAsset.includes("bracketLabelValue") && storageIopsVisualAsset.includes("<tspan"));

// storage-iops-title-risk-polish-audit-0705
check("STORAGE_IOPS_TITLE_SUBTITLE_CENTERED", storageIopsVisualAsset.includes('text-anchor="middle" class="title"') && storageIopsVisualAsset.includes('text-anchor="middle" class="subtitle"'));
check("STORAGE_IOPS_IOPS_AXIS_LABEL_RETAINED", storageIopsVisualAsset.includes('class="axis-label">IOPS</text>'));
check("STORAGE_IOPS_TITLE_RISK_POLISH_MARKER", storageIopsVisualAsset.includes("storage-iops-title-risk-polish-0705"));
check("STORAGE_IOPS_VISUAL_ASSET_CACHE_BUST_TITLE_RISK_POLISH", html.includes("scopedlabs-compute-capacity-visuals.js?v=storage-iops-reference-markers-0705"));
// storage-iops-capacity-envelope-lock-audit-0705
check("STORAGE_IOPS_CAPACITY_ENVELOPE_LOCKED_PROMOTED", storageIopsVisualAsset.includes("storage-iops-capacity-envelope-locked-promoted-0705"));
check("STORAGE_IOPS_ACCEPTED_CHART_TITLE_CENTERED", storageIopsVisualAsset.includes('text-anchor="middle" class="title"') && storageIopsVisualAsset.includes('text-anchor="middle" class="subtitle"'));
check("STORAGE_IOPS_ACCEPTED_INLINE_ICON_CHIPS_LOCKED", storageIopsVisualAsset.includes("StorageIopsIcons.storage") && storageIopsVisualAsset.includes("StorageIopsIcons.workload") && storageIopsVisualAsset.includes("StorageIopsIcons.raid") && storageIopsVisualAsset.includes("StorageIopsIcons.latency") && storageIopsVisualAsset.includes("StorageIopsIcons.block"));
check("STORAGE_IOPS_ACCEPTED_CAPACITY_BANDS_LOCKED", storageIopsVisualAsset.includes("band-good") && storageIopsVisualAsset.includes("band-watch") && storageIopsVisualAsset.includes("band-risk"));
check("STORAGE_IOPS_ACCEPTED_HEADROOM_DEFICIT_LOCKED", storageIopsVisualAsset.includes("HEADROOM") && storageIopsVisualAsset.includes("DEFICIT") && storageIopsVisualAsset.includes("bracket-line"));
check("STORAGE_IOPS_ACCEPTED_SHARED_VISUAL_CACHE_BUST", html.includes("scopedlabs-compute-capacity-visuals.js?v=storage-iops-reference-markers-0705"));
// storage-iops-deficit-label-stack-fix-audit-0705
check("STORAGE_IOPS_DEFICIT_LABEL_STACK_FIX_MARKER", storageIopsVisualAsset.includes("storage-iops-deficit-label-stack-fix-0705"));
check("STORAGE_IOPS_DEFICIT_LABEL_STACKED_WITH_TSPANS", storageIopsVisualAsset.includes("bracketLabelPrimary") && storageIopsVisualAsset.includes("bracketLabelValue") && storageIopsVisualAsset.includes("text-anchor=\"start\"") && storageIopsVisualAsset.includes("<tspan"));
// storage-iops-ram-reference-flow-audit-0705
check("STORAGE_IOPS_RAM_REFERENCE_FLOW_MARKER", js.includes("storage-iops-ram-reference-flow-0705"));
check("STORAGE_IOPS_PROOF_STACK_VISIBLE_SUPPRESSED", js.includes("storage-iops-visible-proof-suppressed-0705") && html.includes("data-storage-iops-proof-export-only"));
check("STORAGE_IOPS_REFERENCES_USE_RAM_TABLE_LAYOUT", js.includes("compute-recommendation-references-table") && js.includes("compute-recommended-actions-list") && js.includes("compute-recommended-action") && js.includes("compute-decision-schedule-status") && js.includes("compute-decision-schedule-table"));
check("STORAGE_IOPS_REFERENCES_MATCH_CHART_MARKERS", js.includes('marker: "*1"') && js.includes('reference: "Burst demand"') && js.includes('marker: "*2"') && js.includes('reference: "Required IOPS"') && js.includes('marker: "*3"') && js.includes('reference: "Platform / latency validation"'));
check("STORAGE_IOPS_CHART_PLATFORM_MARKER_3", storageIopsVisualAsset.includes("Available platform *3"));
check("STORAGE_IOPS_SCRIPT_CACHE_BUST_RAM_REFERENCE_FLOW", html.includes("script.js?v=compute-storage-iops-export-hooks-0705"));
check("STORAGE_IOPS_VISUAL_CACHE_BUST_REFERENCE_MARKERS", html.includes("scopedlabs-compute-capacity-visuals.js?v=storage-iops-reference-markers-0705"));
// storage-iops-ram-section-contract-audit-0705
check("STORAGE_IOPS_RAM_SECTION_CONTRACT_MARKER", js.includes("storage-iops-ram-section-contract-0705"));
check("STORAGE_IOPS_NO_LOCAL_SECTION_RENDERER_CLASSES", !js.includes("storage-iops-actions-list") && !js.includes("storage-iops-decision-row") && !js.includes("storage-iops-reference-row"));
check("STORAGE_IOPS_SCRIPT_CACHE_BUST_RAM_SECTION_CONTRACT", html.includes("script.js?v=compute-storage-iops-export-hooks-0705"));
let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.name);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.name + (item.note ? " -- " + item.note : ""));
  }
}

console.log("");
console.log("SCOPEDLABS COMPUTE STORAGE IOPS CHART LAYOUT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) process.exit(1);
