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
  "compute-storage-iops-hide-flow-context-0704"
].forEach(function(token) {
  check("HAS_" + token.replace(/[^A-Za-z0-9]+/g, "_"), combined.includes(token));
});

check("RAM_SHELL_CONTEXT_CARD_PRESENT", html.includes('id="computeWorkloadContextCard"'));
check("RAM_SHELL_HIDDEN_LEDGER_PRESENT", html.includes('id="computeInternalResultsLedger"') && html.includes("data-internal-results-ledger") && html.includes('aria-hidden="true"'));
check("RAM_SHELL_ASSISTANT_CARD_PRESENT", html.includes('id="computeAssistantCard"') && html.includes("data-compute-assistant-mount"));

check("STORAGE_IOPS_VISUAL_CARD_PRESENT", html.includes('id="computeStorageIopsVisualCard"') && html.includes('data-output-visual-owner="compute-capacity-visuals"'));
check("STORAGE_IOPS_VISUAL_MOUNT_PRESENT", html.includes('id="computeStorageIopsVisual"') && html.includes('data-compute-capacity-visual="storage-iops"'));
check("STORAGE_IOPS_SHARED_VISUAL_MODULE_EXTENDED", visuals.includes("buildStorageIopsCapacityEnvelopeSvg") && visuals.includes("renderStorageIopsCapacityEnvelope"));
check("STORAGE_IOPS_SHARED_VISUAL_EXPORTED", visuals.includes("buildStorageIopsCapacityEnvelopeSvg,") && visuals.includes("renderStorageIopsCapacityEnvelope,"));
check("STORAGE_IOPS_SCRIPT_CALLS_SHARED_VISUAL", js.includes("window.ScopedLabsComputeCapacityVisuals") && js.includes("renderStorageIopsCapacityEnvelope"));
check("STORAGE_IOPS_VISUAL_CLEAR_PRESENT", js.includes("clearStorageIopsCapacityVisual();"));

check("RAM_SHELL_PROOF_CARD_PRESENT", html.includes('id="storageIopsProofStackCard"') && html.includes('id="storageIopsProofStack"'));
check("OLD_BREADCRUMB_CHROME_REMOVED", !html.includes('class="crumbs"'));
check("OLD_FREE_TIER_TOP_CHROME_REMOVED", !html.includes("Free Tier"));
check("OLD_DESIGN_FLOW_INTRO_REMOVED", !html.includes("Part of a Design Flow"));

check("FLOW_CONTEXT_ANCHOR_PRESENT_BUT_HIDDEN", html.includes('id="flow-note"') && html.includes('class="flow-note"') && html.includes("hidden"));
check("FLOW_CONTEXT_HIDDEN_BY_COMPUTE_SHELL_CONTRACT", shellContract.includes("function hideGeneratedFlowContext") && shellContract.includes("data-compute-flow-context-hidden") && shellContract.includes("hideGeneratedFlowContext();"));
check("FLOW_CONTEXT_CSS_GUARD_PRESENT", shellContract.includes("computeGeneratedFlowContextGuard") && shellContract.includes("#flow-note") && shellContract.includes("display: none !important"));
check("FLOW_CONTEXT_OBSERVER_PRESENT", shellContract.includes("function watchGeneratedFlowContext") && shellContract.includes("MutationObserver") && shellContract.includes("watchGeneratedFlowContext();"));
check("COMPUTE_SHELL_ACCEPTS_CUSTOM_SHELL_TOKENS", shellContract.includes("!!body.dataset.computeToolShell"));

check("BACK_LINK_TO_RAM_PRESENT", html.includes('href="/tools/compute/ram-sizing/"') && html.includes("Back to RAM Sizing"));
check("STATIC_CONTINUE_TO_STORAGE_THROUGHPUT_PRESENT", html.includes('data-compute-continue-href="/tools/compute/storage-throughput/"') && html.includes("Continue &rarr; Storage Throughput"));
check("SHELL_CONTRACT_STORAGE_IOPS_ROUTE_PRESENT", shellContract.includes('path.indexOf("/tools/compute/storage-iops/") !== -1') && shellContract.includes('continueHref: "/tools/compute/storage-throughput/"') && shellContract.includes('continueLabel: "Continue &rarr; Storage Throughput"'));
check("STORAGE_IOPS_NO_CPU_CONTINUE_IN_PAGE", !html.includes("Continue to CPU Sizing"));

// storage-iops-ram-reference-flow-planning-audit-0705
ordered("RAM_SHELL_SECTION_ORDER_WITH_VISUAL", [
  'id="computeWorkloadContextCard"',
  'id="toolCard"',
  'id="computeInternalResultsLedger"',
  'id="computeAssistantCard"',
  'id="computeStorageIopsVisualCard"',
  'id="computeStorageIopsReferencesCard"',
  'id="computeStorageIopsRecommendedActionsCard"',
  'id="computeStorageIopsDecisionScheduleCard"',
  'id="storageIopsProofStackCard"',
  'id="reportMetadataMount"',
  'data-compute-flow-actions="true"'
]);

check("STORAGE_IOPS_PLANNING_INPUTS_PRESERVED", html.includes('id="availableIops"') && html.includes('id="peakMultiplier"') && html.includes('id="targetLatency"') && html.includes('id="mediaTier"') && html.includes('id="workloadPattern"'));
check("STORAGE_IOPS_REFERENCES_VISIBLE", html.includes('id="computeStorageIopsReferencesCard"') && js.includes("renderStorageIopsReferenceTable") && js.includes('marker: "*1"') && js.includes('reference: "Burst demand"') && js.includes('marker: "*2"') && js.includes('reference: "Required IOPS"') && js.includes('marker: "*3"') && js.includes('reference: "Platform / latency validation"'));
check("STORAGE_IOPS_ACTIONS_RENDERED", js.includes("recommendedActions") && js.includes("renderStorageIopsRecommendedActions") && js.includes("compute-recommended-actions-list") && js.includes("compute-recommended-action"));
check("STORAGE_IOPS_DECISION_SCHEDULE_SIMPLE_VALUES", js.includes('metric: "Status"') && js.includes("value: analyzer.status") && js.includes('metric: "Required IOPS"') && js.includes('value: formatNumber(finalIops) + " IOPS"') && js.includes('metric: "Utilization"') && !js.includes('value: analyzer.status + " - " + primaryConstraint'));
check("STORAGE_IOPS_DECISION_STATUS_VALUE_BADGE", js.includes("function storageIopsScheduleStatus") && js.includes('String(row.metric || "").toLowerCase() === "status"') && js.includes("storageIopsDecisionValueCell(row, status)") && js.includes("scopedlabs-result-summary-status") && js.includes("storageIopsStatusClass(status)"));
check("STORAGE_IOPS_RAM_SECTION_CONTRACT_RENDERERS", js.includes("storage-iops-ram-section-contract-0705") && js.includes("compute-recommendation-references-table") && js.includes("compute-recommended-actions-list") && js.includes("compute-decision-schedule-table"));
check("STORAGE_IOPS_SECTION_CARDS_USE_COMPUTE_ASSISTANT_CONTRACT_OWNER", html.includes('data-output-references-owner="compute-assistant-contract"') && html.includes('data-output-actions-owner="compute-assistant-contract"') && html.includes('data-output-decision-owner="compute-assistant-contract"'));
check("STORAGE_IOPS_LEDGER_PAYLOAD_PRESERVED", js.includes("planningInputs") && js.includes("assistantRecommendation") && js.includes("saveComputeLedgerResult({"));
check("STORAGE_IOPS_MATH_PRESERVED", js.includes("const finalIops = peakDemandIops + reserveIops + growthReserveIops;"));
check("STORAGE_IOPS_PROOF_CARD_SCRIPTED", js.includes('proofStackCard: $("storageIopsProofStackCard")') && html.includes("data-storage-iops-proof-export-only") && js.includes("storage-iops-visible-proof-suppressed-0705"));
check("STORAGE_IOPS_MODULE_MAP_ENTRY", moduleMap.includes("COMPUTE_STORAGE_IOPS_VISUAL_MODULE_0704"));


check("STORAGE_IOPS_FOOTER_ALIGNED_WITH_PAGE_CONTAINER", html.includes('data-storage-iops-footer-aligned="0705"') && !html.includes('</main>\n\n<footer class="site-footer">') && html.indexOf('data-storage-iops-footer-aligned="0705"') > html.indexOf('data-compute-flow-actions="true"'));
check("STORAGE_IOPS_FOOTER_TIGHTENED_AFTER_FLOW_ACTIONS", html.includes('<footer class="site-footer" style="padding-top: 16px;" data-storage-iops-footer-aligned="0705">'));
check("STORAGE_IOPS_EXPORT_ACCEPTED_SECTIONS_READY", html.includes('data-export-title="Storage IOPS Result Summary"') && html.includes('data-export-title="Storage IOPS Capacity Envelope"') && html.includes('data-export-title="Recommendation References"') && html.includes('data-export-title="Recommended Actions"') && html.includes('data-export-title="Storage IOPS Decision Schedule"'));
check("STORAGE_IOPS_EXPORT_CAPACITY_ENVELOPE_SVG_CAPTURE", html.includes('data-export-compact-svg="true"') && html.includes('data-export-svg="true"') && html.includes('data-storage-iops-export-svg="0705"'));
check("STORAGE_IOPS_EXPORT_TEXT_CAPTURE_READY", html.includes('data-storage-iops-summary-export-text="0705"') && js.includes('data-storage-iops-action-export-row="0705"') && js.includes('data-storage-iops-decision-export-interpretation="0705"'));
check("STORAGE_IOPS_EXPORT_SCRIPT_CACHE_BUST_UPDATED", html.includes('script.js?v=compute-storage-iops-export-hooks-0705'));
check("STORAGE_IOPS_EXPORT_CHROME_MATCHES_RAM", html.includes('<section class="card compute-export-card" style="margin-top: 14px; background: rgba(0,0,0,.14);">') && html.includes('<h3 class="h3" style="margin-top: 0;">Export Report</h3>') && !html.includes("Documentation &amp; Export") && !html.includes("storage-iops-export-label"));
check("STORAGE_IOPS_FLOW_ACTIONS_TIGHTENED_TO_EXPORT_CARD", html.includes('data-storage-iops-flow-actions-tightened="0705"') && html.includes('class="compute-flow-actions" style="margin-top: 10px;"'));
check("STORAGE_IOPS_FLOW_CONTEXT_SOURCE_SUPPRESSED", js.includes("compute-storage-iops-hide-visible-flow-context-0704") && js.includes("data-compute-flow-context-hidden") && js.includes("storage-iops-source"));
check("STORAGE_IOPS_FLOW_CONTEXT_CSS_SUPPRESSED", html.includes("storage-iops-flow-note-source-hide-0704") && html.includes("#flow-note") && html.includes("display: none !important"));

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
