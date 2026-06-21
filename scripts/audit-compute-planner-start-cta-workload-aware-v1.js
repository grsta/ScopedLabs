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

function hasVersionedScript(page, scriptName, prefix) {
  const marker = scriptName + "?v=" + prefix + "-";
  const index = page.indexOf(marker);
  if (index < 0) return false;
  return /^[0-9]{3}(?:-[a-z0-9-]+)?/.test(page.slice(index + marker.length));
}

const adapter = read("assets/scopedlabs-compute-planner-adapter.js");
const page = read("tools/compute/workload-planner/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Planner Start CTA Workload Aware Audit V1");
console.log("");

check(
  "PLANNER_START_CTA_WORKLOAD_AWARE_EXISTS",
  adapter.includes("ScopedLabsComputePlannerStartCta") && adapter.includes("function refreshStartCtas"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "PLANNER_START_CTA_LABEL_STAYS_START_GUIDED_FLOW",
  adapter.includes("node.textContent = \"Start Guided Flow\"") &&
    !adapter.includes("data-compute-start-requires-workload-hidden"),
  "CTA should remain visible with stable Start Guided Flow wording"
);

check(
  "PLANNER_ZERO_WORKLOAD_CLICK_SCROLLS_TO_SETUP",
  adapter.includes("function promptForWorkloadSetup") &&
    adapter.includes("scrollIntoView") &&
    adapter.includes("data-compute-start-guided-action\", \"setup") &&
    adapter.includes("focusSetupField"),
  "0 workloads should send the user to Active Compute Workload Setup"
);

check(
  "PLANNER_WORKLOAD_CLICK_ROUTES_TO_NEXT_INCOMPLETE_TOOL",
  adapter.includes("function resolveWorkloadRoute") &&
    adapter.includes("RouteEngine.resolve") &&
    adapter.includes("remainingTools") &&
    adapter.includes("window.location.assign(route.decision.nextHref)"),
  "saved workloads should route to next incomplete core or specialty step"
);

check(
  "PLANNER_STARTS_GUIDED_CONTEXT_BEFORE_ROUTING",
  adapter.includes("function startGuidedFlowFor") &&
    adapter.includes("State.startGuidedFlow") &&
    adapter.includes("scopedlabs:pipeline:compute:guided-flow"),
  "click routing must write explicit guided context"
);

check(
  "PLANNER_COUNTS_WORKLOADS_FROM_LEDGER",
  adapter.includes("function workloadList") &&
    adapter.includes("plan.workloads") &&
    adapter.includes("plan.savedWorkloads") &&
    adapter.includes("plan.workloadMap"),
  "workload count should come from the saved workload ledger"
);

check(
  "PLANNER_REFRESHES_START_CTA_AFTER_SAVE_OR_DELETE",
  adapter.includes("MutationObserver") &&
    adapter.includes("storage") &&
    adapter.includes("scopedlabs:compute:plan-change") &&
    adapter.includes("setInterval"),
  "CTA state should refresh after workload create/delete"
);

check(
  "PLANNER_PAGE_LOADS_WORKLOAD_AWARE_ADAPTER",
  hasVersionedScript(page, "scopedlabs-compute-planner-adapter.js", "scopedlabs-compute-planner-adapter") &&
    page.includes("013-start-cta-workload-aware"),
  "tools/compute/workload-planner/index.html"
);

check(
  "MODULE_MAP_DOCUMENTS_WORKLOAD_AWARE_START_CTA",
  moduleMap.includes("Compute planner workload-aware Start Guided Flow CTA"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_WORKLOAD_AWARE_START_CTA_AUDIT",
  batch.includes("scripts/audit-compute-planner-start-cta-workload-aware-v1.js") &&
    !batch.includes("scripts/audit-compute-planner-start-cta-requires-workload-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (10 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
