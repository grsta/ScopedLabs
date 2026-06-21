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

const state = read("assets/scopedlabs-compute-plan-state.js");
const adapter = read("assets/scopedlabs-compute-planner-adapter.js");
const page = read("tools/compute/workload-planner/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");

console.log("Compute Guided Flow Mode Audit V1");
console.log("");

check(
  "PLAN_STATE_HAS_GUIDED_FLOW_KEY",
  state.includes("GUIDED_FLOW_KEY") &&
    state.includes("scopedlabs:pipeline:compute:guided-flow"),
  "assets/scopedlabs-compute-plan-state.js"
);

check(
  "PLAN_STATE_CAN_START_GUIDED_FLOW",
  state.includes("function startGuidedFlow") &&
    state.includes("writeGuidedFlowContext") &&
    state.includes("guidedFlow: true") &&
    state.includes('routeMode: "compute-guided"') &&
    state.includes('nextTool: "cpu-sizing"'),
  "guided context must start from planner and initially have a CPU fallback"
);

check(
  "PLAN_STATE_EXPORTS_GUIDED_FLOW_API",
  state.includes("startGuidedFlow: startGuidedFlow") &&
    state.includes("getGuidedFlowContext: getGuidedFlowContext") &&
    state.includes("isGuidedFlowActive: isGuidedFlowActive") &&
    state.includes("clearGuidedFlow: clearGuidedFlow"),
  "guided API must be explicit and optional"
);

check(
  "PLANNER_USES_START_GUIDED_FLOW_BUTTON_LABEL",
  adapter.includes("Start Guided Flow") &&
    adapter.includes("CPU Sizing"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "PLANNER_CONTINUE_STARTS_GUIDED_CONTEXT",
  adapter.includes("function startGuidedFlowFromPlanner") &&
    adapter.includes("var workload = save();") &&
    adapter.includes("State.startGuidedFlow(workload.id)") &&
    adapter.includes("resolveGuidedRouteFromPlanner(context, workload)") &&
    adapter.includes("window.location.href = decision.nextHref"),
  "planner continue must save workload, start guided context, resolve route decision, then navigate"
);

check(
  "WORKLOAD_PLANNER_CACHE_BUSTS_GUIDED_ENTRY",
  page.includes("scopedlabs-compute-planner-adapter.js?v=") &&
    (
      page.includes("scopedlabs-compute-planner-adapter-017-route-cta") ||
      page.includes("scopedlabs-compute-planner-adapter-016-guided-flow-entry")
    ),
  "tools/compute/workload-planner/index.html"
);

check(
  "MODULE_MAP_DOCUMENTS_GUIDED_FLOW_MODE",
  moduleMap.includes("Compute guided-flow mode contract"),
  "docs/scopedlabs-module-map.md"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (7 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
