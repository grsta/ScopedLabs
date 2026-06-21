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

const adapter = read("assets/scopedlabs-compute-planner-adapter.js");
const page = read("tools/compute/workload-planner/index.html");
const route = read("assets/scopedlabs-compute-guided-route-engine.js");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Planner Route CTA Audit V1");
console.log("");

check(
  "PLANNER_LOADS_ROUTE_ENGINE_BEFORE_ADAPTER",
  page.indexOf("scopedlabs-compute-guided-route-engine.js") >= 0 &&
    page.indexOf("scopedlabs-compute-planner-adapter.js") > page.indexOf("scopedlabs-compute-guided-route-engine.js"),
  "tools/compute/workload-planner/index.html"
);

check(
  "PLANNER_CACHE_BUSTS_ROUTE_CTA_ADAPTER",
  page.includes("scopedlabs-compute-planner-adapter.js?v=scopedlabs-compute-planner-adapter-019-route-arrow-cleanup"),
  "tools/compute/workload-planner/index.html"
);

check(
  "ADAPTER_HAS_ROUTE_CTA_RESOLVER",
  adapter.includes("function resolveGuidedRouteFromPlanner") &&
    adapter.includes("ScopedLabsComputeGuidedRouteEngine") &&
    adapter.includes(".resolve({"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "ADAPTER_UPDATES_CONTINUE_CTA_FROM_ROUTE_DECISION",
  adapter.includes("function updateGuidedRouteCta") &&
    adapter.includes('document.getElementById("continue")') &&
    adapter.includes("decision.nextHref") &&
    adapter.includes("decision.nextLabel") &&
    adapter.includes("data-compute-guided-route-cta"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "START_GUIDED_FLOW_USES_ROUTE_DECISION",
  adapter.includes("State.startGuidedFlow(workload.id)") &&
    adapter.includes("resolveGuidedRouteFromPlanner(context, workload)") &&
    adapter.includes("decision.nextHref || context.nextHref"),
  "guided flow should start explicit context, then navigate by route decision"
);

check(
  "DIRECT_TOOL_STANDALONE_GUARD_REMAINS_IN_ROUTE_ENGINE",
  route.includes('mode: "standalone"') &&
    route.includes("No guided-flow context is active"),
  "assets/scopedlabs-compute-guided-route-engine.js"
);

check(
  "MODULE_MAP_DOCUMENTS_PLANNER_ROUTE_CTA",
  moduleMap.includes("Compute planner route CTA"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_RUNNER_INCLUDES_PLANNER_ROUTE_CTA_AUDIT",
  batch.includes("scripts/audit-compute-planner-route-cta-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

check(
  "GUIDED_ROUTE_CTA_HAS_NO_CORRUPT_ARROW_SEPARATOR",
  !adapter.includes("Start Guided Flow \u2192 ") &&
    !adapter.includes("Resume Guided Flow \u2192 ") &&
    !route.includes("Start Guided Flow \u2192 ") &&
    !route.includes("Resume Guided Flow \u2192 ") &&
    adapter.includes("\\u2192 ") &&
    route.includes("\\u2192 "),
  "guided route labels must use ASCII-safe Unicode escape, not corrupted '?' text"
);

check(
  "GUIDED_ROUTE_CTA_HAS_NO_ARROW_QUESTION_MARK",
  !adapter.includes("\\u2192?") &&
    !adapter.includes("\\u2192 ?") &&
    !route.includes("\\u2192?") &&
    !route.includes("\\u2192 ?") &&
    !adapter.includes("Flow ?") &&
    !route.includes("Flow ?"),
  "guided route CTA labels must not render arrow/question-mark corruption"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (10 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
