const fs = require("fs");
const path = require("path");

const root = process.cwd();

const summaryFile = "tools/compute/summary/index.html";
const plannerFile = "tools/compute/workload-planner/index.html";
const gpuFile = "tools/compute/gpu-vram/index.html";
const routeEngineFile = "assets/scopedlabs-compute-guided-route-engine.js";
const moduleMapFile = "docs/scopedlabs-module-map.md";

const summary = fs.readFileSync(path.join(root, summaryFile), "utf8");
const planner = fs.readFileSync(path.join(root, plannerFile), "utf8");
const gpu = fs.readFileSync(path.join(root, gpuFile), "utf8");
const routeEngine = fs.existsSync(path.join(root, routeEngineFile))
  ? fs.readFileSync(path.join(root, routeEngineFile), "utf8")
  : "";
const moduleMap = fs.readFileSync(path.join(root, moduleMapFile), "utf8");

let pass = 0;
let fail = 0;

function check(code, condition, message, file = summaryFile) {
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
  "COMPUTE_SUMMARY_ROUTE_EXISTS",
  fs.existsSync(path.join(root, summaryFile)),
  "Compute Summary route host must exist so guided flow and Review Summary CTAs do not 404."
);

check(
  "COMPUTE_SUMMARY_ROUTE_HOST_MARKER",
  summary.includes('data-compute-summary-route-host="0627"'),
  "Compute Summary route host should be explicitly marked as a route host."
);

check(
  "COMPUTE_SUMMARY_ROUTE_HAS_NAV_BACK",
  summary.includes('href="../workload-planner/"') &&
    summary.includes("Back to Workload Planner"),
  "Temporary route host should provide a safe path back to the Compute Workload Planner."
);

check(
  "COMPUTE_SUMMARY_ROUTE_HAS_GPU_REVIEW",
  summary.includes('href="../gpu-vram/"') &&
    summary.includes("Review GPU VRAM"),
  "Temporary route host should provide a safe path back to the accepted GPU proof page."
);

check(
  "COMPUTE_SUMMARY_ROUTE_REFERENCED_BY_GPU",
  gpu.includes('href="/tools/compute/summary/"') &&
    gpu.includes("Review Compute Summary"),
  "GPU VRAM accepted Summary CTA should route to the live Compute Summary page.",
  gpuFile
);

check(
  "COMPUTE_SUMMARY_ROUTE_REFERENCED_BY_GUIDED_ENGINE",
  routeEngine.includes("/tools/compute/summary/") ||
    planner.includes("/tools/compute/summary/"),
  "Guided flow or planner should reference the Compute Summary route.",
  routeEngineFile
);

check(
  "COMPUTE_SUMMARY_ROUTE_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_SUMMARY_ROUTE_HOST_0627") &&
    moduleMap.includes("tools/compute/summary/index.html") &&
    moduleMap.includes("scripts/audit-compute-summary-route-host-v1.js"),
  "Module map should record the Compute Summary route host and audit.",
  moduleMapFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE SUMMARY ROUTE HOST AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
