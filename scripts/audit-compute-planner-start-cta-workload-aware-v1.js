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
  "PLANNER_START_CTA_LABEL_STAYS_START_GUIDED_FLOW",
  adapter.includes("var nextLabel = \"Start Guided Flow\"") &&
    adapter.includes("data-compute-guided-route-state") &&
    !adapter.includes("Start Guided Flow \\u2192 CPU Sizing"),
  "CTA should stay visible with stable Start Guided Flow wording"
);

check(
  "PLANNER_ZERO_WORKLOAD_CLICK_SCROLLS_TO_SETUP",
  adapter.includes("function promptForComputeWorkloadSetup") &&
    adapter.includes("scrollIntoView") &&
    adapter.includes("focus({ preventScroll: true })") &&
    adapter.includes("#compute-workload-setup"),
  "0 workloads should scroll/focus Active Compute Workload Setup"
);

check(
  "PLANNER_ZERO_WORKLOAD_DOES_NOT_AUTOSAVE",
  !adapter.includes("if (!workload) workload = save();") &&
    adapter.includes("Define and save a Compute workload before starting guided flow."),
  "Start Guided Flow must not auto-save default form values"
);

check(
  "PLANNER_WORKLOAD_CLICK_ROUTES_TO_NEXT_INCOMPLETE_TOOL",
  adapter.includes("resolveGuidedRouteFromPlanner(context, workload)") &&
    adapter.includes("window.location.href = decision.nextHref") &&
    adapter.includes("data-compute-guided-route-workload-id"),
  "saved workloads should route to next incomplete core or specialty step"
);

check(
  "PLANNER_USES_SAVED_WORKLOAD_LEDGER",
  adapter.includes("function computePlannerSavedWorkloads") &&
    adapter.includes("plan.workloads") &&
    adapter.includes("plan.workloadMap") &&
    adapter.includes("plan.activeWorkload"),
  "workload existence should come from the saved workload ledger"
);

check(
  "PLANNER_STARTS_EXPLICIT_GUIDED_CONTEXT",
  adapter.includes("State.startGuidedFlow(workload.id)") &&
    adapter.includes("resolveGuidedRouteFromPlanner(context, workload)"),
  "routing should start explicit guided context before leaving planner"
);

check(
  "PLANNER_REMOVES_GUIDED_ROUTE_MUTATION_OBSERVER",
  !adapter.includes("__scopedlabsComputeGuidedRouteCtaObserver") &&
    !adapter.includes("new MutationObserver") &&
    adapter.includes("window.setTimeout(refresh, 500)") &&
    adapter.includes("scopedlabs:compute:plan-change"),
  "planner Start CTA must not use whole-page MutationObserver refresh loop"
);

check(
  "PLANNER_PAGE_LOADS_WORKLOAD_AWARE_ADAPTER",
  hasVersionedScript(page, "scopedlabs-compute-planner-adapter.js", "scopedlabs-compute-planner-adapter") &&
    page.includes("021-start-cta-workload-aware"),
  "tools/compute/workload-planner/index.html"
);

check(
  "MODULE_MAP_DOCUMENTS_WORKLOAD_AWARE_START_CTA",
  moduleMap.includes("Compute planner workload-aware Start Guided Flow CTA"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_WORKLOAD_AWARE_START_CTA_AUDIT",
  batch.includes("scripts/audit-compute-planner-start-cta-workload-aware-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (10 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
