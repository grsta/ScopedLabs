const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "script.js"), "utf8");
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
check("VISUAL_BEFORE_PROOF_STACK", pos('id="computeStorageIopsVisualCard"') > -1 && pos('id="computeStorageIopsVisualCard"') < pos('id="storageIopsProofStackCard"'));
check("PROOF_STACK_BEFORE_REFERENCES", pos('id="storageIopsProofStackCard"') > -1 && pos('id="storageIopsProofStackCard"') < pos('id="computeStorageIopsReferencesCard"'));
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
check("STORAGE_IOPS_RESULT_RAM_LAYOUT_LABELS", js.includes("RECOMMENDATION") && js.includes("CONFIDENCE") && js.includes("DECISION FLAGS") && js.includes("PRIMARY RISK"));
check("STORAGE_IOPS_RESULT_NO_SEPARATE_SUMMARY_H3", !html.includes(">Storage IOPS result summary</h3>"));
check("STORAGE_IOPS_RESULT_CACHE_BUST_RAM_PARITY", html.includes("compute-storage-iops-result-ram-parity-0704"));

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
