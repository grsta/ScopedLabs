const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "script.js"), "utf8");
const visuals = fs.readFileSync(path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"), "utf8");
const shellContract = fs.readFileSync(path.join(root, "assets", "scopedlabs-compute-shell-contract.js"), "utf8");
const moduleMap = fs.readFileSync(path.join(root, "docs", "scopedlabs-module-map.md"), "utf8");

const combined = [html, js, visuals, shellContract, moduleMap].join("\n");
const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function pos(token) {
  return html.indexOf(token);
}

function ordered(name, tokens) {
  let last = -1;
  let ok = true;

  for (const token of tokens) {
    const index = pos(token);
    if (index < 0 || index <= last) ok = false;
    last = index;
  }

  check(name, ok);
}

[
  'data-compute-tool-shell="storage-iops-ram-shell-template-0704"',
  "scopedlabs-tool-shell",
  "compute-export-card",
  "scopedlabs-assistant-export",
  "scopedlabs-user-tool-notes",
  "compute-flow-actions",
  "assets/scopedlabs-report-metadata.js",
  "assets/scopedlabs-tool-shell.js",
  "assets/scopedlabs-user-tool-notes.js",
  "assets/scopedlabs-assistant-export.js",
  "assets/scopedlabs-compute-capacity-visuals.js",
  "assets/scopedlabs-compute-result-visuals.css",
  "Planning Inputs",
  "Recommendation References",
  "Assistant Recommended Actions",
  "reportMetadataMount",
  "computeStorageIopsReferencesCard",
  "computeStorageIopsRecommendedActionsCard",
  "computeStorageIopsDecisionScheduleCard",
  "storage-iops-ram-shell-template-0704",
  "compute-storage-iops-visual-module-0704"
].forEach(function(token) {
  check("HAS_" + token.replace(/[^A-Za-z0-9]+/g, "_"), combined.includes(token));
});

check("RAM_SHELL_CONTEXT_CARD_PRESENT", html.includes('id="computeWorkloadContextCard"'));
check("RAM_SHELL_HIDDEN_LEDGER_PRESENT", html.includes('id="computeInternalResultsLedger"') && html.includes("data-internal-results-ledger") && html.includes('aria-hidden="true"'));
check("RAM_SHELL_ASSISTANT_CARD_PRESENT", html.includes('id="computeAssistantCard"') && html.includes("data-compute-assistant-mount"));

check("STORAGE_IOPS_VISUAL_CARD_PRESENT", html.includes('id="computeStorageIopsVisualCard"') && html.includes('data-output-visual-owner="compute-capacity-visuals"'));
check("STORAGE_IOPS_VISUAL_MOUNT_PRESENT", html.includes('id="computeStorageIopsVisual"') && html.includes('data-compute-capacity-visual="storage-iops"'));
check("STORAGE_IOPS_SHARED_VISUAL_MODULE_EXTENDED", visuals.includes("buildStorageIopsCapacityEnvelopeSvg") && visuals.includes("renderStorageIopsCapacityEnvelope"));
check("STORAGE_IOPS_SCRIPT_CALLS_SHARED_VISUAL", js.includes("window.ScopedLabsComputeCapacityVisuals") && js.includes("renderStorageIopsCapacityEnvelope"));
check("STORAGE_IOPS_VISUAL_CLEAR_PRESENT", js.includes("clearStorageIopsCapacityVisual();"));

check("RAM_SHELL_PROOF_CARD_PRESENT", html.includes('id="storageIopsProofStackCard"') && html.includes('id="storageIopsProofStack"'));
check("OLD_BREADCRUMB_CHROME_REMOVED", !html.includes('class="crumbs"'));
check("OLD_FREE_TIER_TOP_CHROME_REMOVED", !html.includes("Free Tier"));
check("OLD_DESIGN_FLOW_INTRO_REMOVED", !html.includes("Part of a Design Flow"));

check("BACK_LINK_TO_RAM_PRESENT", html.includes('href="/tools/compute/ram-sizing/"') && html.includes("Back to RAM Sizing"));
check("STATIC_CONTINUE_TO_STORAGE_THROUGHPUT_PRESENT", html.includes('data-compute-continue-href="/tools/compute/storage-throughput/"') && html.includes("Continue &rarr; Storage Throughput"));
check("SHELL_CONTRACT_STORAGE_IOPS_ROUTE_PRESENT", shellContract.includes('path.indexOf("/tools/compute/storage-iops/") !== -1') && shellContract.includes('continueHref: "/tools/compute/storage-throughput/"') && shellContract.includes('continueLabel: "Continue &rarr; Storage Throughput"'));
check("STORAGE_IOPS_NO_CPU_CONTINUE_IN_PAGE", !html.includes("Continue to CPU Sizing"));

ordered("RAM_SHELL_SECTION_ORDER_WITH_VISUAL", [
  'id="computeWorkloadContextCard"',
  'id="toolCard"',
  'id="computeInternalResultsLedger"',
  'id="computeAssistantCard"',
  'id="computeStorageIopsVisualCard"',
  'id="storageIopsProofStackCard"',
  'id="computeStorageIopsReferencesCard"',
  'id="computeStorageIopsRecommendedActionsCard"',
  'id="computeStorageIopsDecisionScheduleCard"',
  'id="reportMetadataMount"',
  'data-compute-flow-actions="true"'
]);

check("STORAGE_IOPS_PLANNING_INPUTS_PRESERVED", html.includes('id="availableIops"') && html.includes('id="peakMultiplier"') && html.includes('id="targetLatency"') && html.includes('id="mediaTier"') && html.includes('id="workloadPattern"'));
check("STORAGE_IOPS_REFERENCES_VISIBLE", js.includes("*1 Required IOPS") && js.includes("*2 Utilization") && js.includes("*3 Latency"));
check("STORAGE_IOPS_ACTIONS_RENDERED", js.includes("recommendedActions") && js.includes("decisionSchedule"));
check("STORAGE_IOPS_LEDGER_PAYLOAD_PRESERVED", js.includes("planningInputs") && js.includes("assistantRecommendation") && js.includes("saveComputeLedgerResult({"));
check("STORAGE_IOPS_MATH_PRESERVED", js.includes("const finalIops = peakDemandIops + reserveIops + growthReserveIops;"));
check("STORAGE_IOPS_PROOF_CARD_SCRIPTED", js.includes('proofStackCard: $("storageIopsProofStackCard")') && js.includes("els.proofStackCard.hidden = false"));
check("STORAGE_IOPS_MODULE_MAP_ENTRY", moduleMap.includes("COMPUTE_STORAGE_IOPS_VISUAL_MODULE_0704"));

try {
  new Function(js);
  new Function(visuals);
  new Function(shellContract);
  check("SCRIPTS_PARSE", true);
} catch (error) {
  check("SCRIPTS_PARSE", false);
  console.error(error.message);
}

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.name);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.name);
  }
}

console.log("");
console.log("SCOPEDLABS COMPUTE STORAGE IOPS PLANNING SHELL AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) process.exit(1);
