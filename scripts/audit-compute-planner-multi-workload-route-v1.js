const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

let failures = 0;

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

function hasVersionedPlannerAdapter(page) {
  const marker = "scopedlabs-compute-planner-adapter.js?v=scopedlabs-compute-planner-adapter-";
  const index = page.indexOf(marker);
  if (index < 0) return false;
  const after = page.slice(index + marker.length);
  return /^[0-9]{3}-[a-z0-9-]+/.test(after);
}

const adapter = read("assets/scopedlabs-compute-planner-adapter.js");
const page = read("tools/compute/workload-planner/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Planner Multi-Workload Route Audit V1");
console.log("");

check(
  "PLANNER_HAS_VERSIONED_ADAPTER",
  hasVersionedPlannerAdapter(page),
  "contract: planner adapter cache-bust must be scoped/versioned"
);

check(
  "ADAPTER_SCANS_ALL_SAVED_WORKLOADS",
  adapter.includes("function allComputePlannerWorkloads") &&
    adapter.includes("plan.workloads") &&
    adapter.includes("resolvePendingWorkloadRouteFromPlanner"),
  "planner CTA must be able to route pending work outside the active workload"
);

check(
  "ADAPTER_PREFERS_PENDING_WORK_BEFORE_SUMMARY",
  adapter.includes("computePlannerDecisionNeedsWork") &&
    adapter.includes('decision.action === "review-summary"') &&
    adapter.includes('decision.nextTool === "summary"') &&
    adapter.indexOf("computePlannerDecisionNeedsWork(activeDecision)") < adapter.indexOf("return decoratePlannerMultiWorkloadDecision(activeDecision, activeWorkload, false);"),
  "summary must not win while a workload still has applicable pending checks"
);

check(
  "ADAPTER_MARKS_ALTERNATE_WORKLOAD_ROUTE",
  adapter.includes("plannerAlternateWorkload") &&
    adapter.includes("Use workload - ") &&
    adapter.includes("data-compute-guided-route-alt-workload"),
  "alternate workload route should be visible and inspectable"
);

check(
  "ADAPTER_WRITES_TARGET_WORKLOAD_ID_TO_CTA",
  adapter.includes("data-compute-guided-route-workload-id") &&
    adapter.includes("decision.plannerWorkloadId || decision.workloadId"),
  "CTA must carry the workload it is about to resume"
);

check(
  "START_GUIDED_FLOW_RESPECTS_CTA_WORKLOAD_ID",
  adapter.includes("requestedWorkloadId") &&
    adapter.includes("findComputePlannerWorkload(plan, requestedWorkloadId)") &&
    adapter.includes("State.startGuidedFlow(workload.id)"),
  "clicking the CTA must start guided flow for the routed workload"
);

check(
  "NEW_MULTI_WORKLOAD_LABEL_CONTRACT_IS_ASCII_SAFE",
  adapter.includes("Use workload - ") &&
    !adapter.includes("Use workload ?") &&
    !adapter.includes("Use workload ?") &&
    !adapter.includes("Use workload ?"),
  "alternate workload CTA label must use ASCII-safe separator text"
);

check(
  "MODULE_MAP_DOCUMENTS_MULTI_WORKLOAD_ROUTE",
  moduleMap.includes("Compute planner multi-workload route"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_MULTI_WORKLOAD_ROUTE_AUDIT",
  batch.includes("scripts/audit-compute-planner-multi-workload-route-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (9 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
