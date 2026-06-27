const fs = require("fs");
const path = require("path");

const root = process.cwd();

const plannerFile = "tools/compute/workload-planner/index.html";
const moduleMapFile = "docs/scopedlabs-module-map.md";

const planner = fs.readFileSync(path.join(root, plannerFile), "utf8");
const moduleMap = fs.readFileSync(path.join(root, moduleMapFile), "utf8");

let pass = 0;
let fail = 0;

function check(code, condition, message, file = plannerFile) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + code);
  } else {
    fail += 1;
    console.log("[FAIL] " + code);
    console.log("  " + file);
    console.log("  " + message);
  }
}

check(
  "COMPUTE_PLANNER_SUMMARY_CTA_LABEL_OWNER",
  planner.includes("ScopedLabsComputePlannerSummaryCtaLabel0627") &&
    planner.includes("compute-planner-summary-cta-label-0627"),
  "Planner should include a small owner for summary-route CTA relabeling."
);

check(
  "COMPUTE_PLANNER_SUMMARY_CTA_LABEL_TARGET",
  planner.includes("Continue to Summary") &&
    planner.includes("data-compute-summary-cta-label"),
  "Planner should relabel summary-routed CTAs to Continue to Summary."
);

check(
  "COMPUTE_PLANNER_SUMMARY_CTA_ROUTE_PRESERVED",
  planner.includes("/tools/compute/summary/") ||
    planner.includes("../summary/") ||
    planner.includes("summary/index.html"),
  "Planner should preserve the existing Compute Summary route rather than changing routing."
);

check(
  "COMPUTE_PLANNER_SUMMARY_CTA_NO_ROUTE_REWRITE",
  !planner.includes("window.location.href = \"/tools/compute/summary/\"") &&
    !planner.includes("location.assign(\"/tools/compute/summary/\")"),
  "Summary CTA label patch should not hard-code navigation behavior."
);

check(
  "COMPUTE_PLANNER_SUMMARY_CTA_OBSERVES_DYNAMIC_ROUTE",
  planner.includes("MutationObserver") &&
    planner.includes("scopedlabs:compute-guided-route-updated") &&
    planner.includes("scopedlabs:compute-planner-rendered"),
  "Planner should relabel after dynamic guided route/render updates."
);

check(
  "COMPUTE_PLANNER_SUMMARY_CTA_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_PLANNER_SUMMARY_CTA_LABEL_0627") &&
    moduleMap.includes("scripts/audit-compute-planner-summary-cta-label-v1.js") &&
    moduleMap.includes("tools/compute/workload-planner/index.html"),
  "Module map should record the Compute planner Summary CTA label guard.",
  moduleMapFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE PLANNER SUMMARY CTA LABEL AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
