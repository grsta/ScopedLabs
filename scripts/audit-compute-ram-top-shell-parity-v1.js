const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

let pass = 0;
let fail = 0;

function check(id, ok, file, detail) {
  if (ok) pass += 1;
  else fail += 1;
  console.log("[" + (ok ? "PASS" : "FAIL") + "] " + id);
  console.log("  " + file);
  console.log("  " + detail);
}

console.log("SCOPEDLABS COMPUTE RAM TOP SHELL PARITY AUDIT V1\n");

const ramHtml = read("tools/compute/ram-sizing/index.html");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const ramScript = read("tools/compute/ram-sizing/script.js");
const cpuScript = read("tools/compute/cpu-sizing/script.js");
const planState = read("assets/scopedlabs-compute-plan-state.js");
const moduleMap = read("docs/scopedlabs-module-map.md");

check(
  "CPU_TOP_SHELL_BASELINE_PRESENT",
  cpuHtml.includes("<h1>CPU Sizing Estimator</h1>") &&
    cpuHtml.includes("computeWorkloadContextCard") &&
    cpuHtml.includes("Active Workload") &&
    cpuHtml.includes("Planning Inputs"),
  "tools/compute/cpu-sizing/index.html",
  "CPU baseline top shell must keep title, active workload context card, and Planning Inputs rhythm."
);

check(
  "RAM_TOP_SHELL_HAS_CPU_GRADE_ORDER",
  ramHtml.indexOf("<h1>RAM Sizing Estimator</h1>") !== -1 &&
    ramHtml.indexOf('<div id="pipeline"></div>') !== -1 &&
    ramHtml.indexOf('id="computeWorkloadContextCard"') !== -1 &&
    ramHtml.indexOf('id="toolCard"') !== -1 &&
    ramHtml.indexOf("<h1>RAM Sizing Estimator</h1>") < ramHtml.indexOf('<div id="pipeline"></div>') &&
    ramHtml.indexOf('<div id="pipeline"></div>') < ramHtml.indexOf('id="computeWorkloadContextCard"') &&
    ramHtml.indexOf('id="computeWorkloadContextCard"') < ramHtml.indexOf('id="toolCard"'),
  "tools/compute/ram-sizing/index.html",
  "RAM top shell order must be title, pipeline, workload context, then planning inputs."
);

check(
  "RAM_ACTIVE_WORKLOAD_CARD_MARKUP_PRESENT",
  ramHtml.includes("computeWorkloadContextCard") &&
    ramHtml.includes("Active Workload") &&
    ramHtml.includes("RAM Sizing") &&
    ramHtml.includes("computeWorkloadContextTitle") &&
    ramHtml.includes("computeWorkloadContextCopy") &&
    ramHtml.includes("computeWorkloadContextMeta"),
  "tools/compute/ram-sizing/index.html",
  "RAM must keep the CPU-grade active workload context card structure."
);

check(
  "SHARED_PLAN_STATE_OWNS_WORKLOAD_DISPLAY_RENDERER",
  planState.includes("renderWorkloadDisplay") &&
    planState.includes("buildWorkloadDisplayContext") &&
    planState.includes("card.hidden = false") &&
    planState.includes("window.ScopedLabsComputePlanState"),
  "assets/scopedlabs-compute-plan-state.js",
  "Shared Compute plan-state module must own workload card display rendering."
);

check(
  "CPU_CONSUMES_SHARED_WORKLOAD_DISPLAY_RENDERER",
  cpuScript.includes("State.renderWorkloadDisplay") &&
    cpuScript.includes('toolLabel: "CPU Sizing"'),
  "tools/compute/cpu-sizing/script.js",
  "CPU must consume the shared workload display renderer."
);

check(
  "RAM_CONSUMES_SHARED_WORKLOAD_DISPLAY_RENDERER",
  ramScript.includes("const State = window.ScopedLabsComputePlanState;") &&
    ramScript.includes("function renderWorkloadContext()") &&
    ramScript.includes("State.renderWorkloadDisplay") &&
    ramScript.includes('toolLabel: "RAM Sizing"') &&
    ramScript.includes("activeComputeWorkload()") &&
    ramScript.includes("State.activeWorkload(State.load())"),
  "tools/compute/ram-sizing/script.js",
  "RAM must consume the shared workload display renderer instead of owning a page-local active workload card renderer."
);

check(
  "RAM_DOES_NOT_OWN_LOCAL_ACTIVE_WORKLOAD_READER",
  !ramScript.includes("activePlannerFromApi") &&
    !ramScript.includes("activePlannerFromStorage") &&
    !ramScript.includes("initializeWorkloadContext") &&
    !ramScript.includes("scopedlabs:pipeline:compute:workload-context"),
  "tools/compute/ram-sizing/script.js",
  "RAM should not own a large page-local active workload reader; shared ComputePlanState owns that behavior."
);

check(
  "RAM_DOMCONTENTLOADED_RENDERS_WORKLOAD_CONTEXT",
  ramScript.includes('window.addEventListener("DOMContentLoaded"') &&
    ramScript.includes("renderWorkloadContext();") &&
    ramScript.indexOf("renderWorkloadContext();") < ramScript.indexOf("hideContinue();"),
  "tools/compute/ram-sizing/script.js",
  "RAM must render the active workload card during DOMContentLoaded before the page settles."
);

check(
  "RAM_TOP_SHELL_CACHE_BUST_UPDATED",
  ramHtml.includes("./script.js?v=compute-ram-shared-workload-display-0620"),
  "tools/compute/ram-sizing/index.html",
  "RAM page should cache-bust the local script after shared workload display consumption."
);

check(
  "MODULE_MAP_RECORDS_RAM_SHARED_WORKLOAD_DISPLAY",
  moduleMap.includes("### Compute RAM shared workload display consumption") &&
    moduleMap.includes("audit-compute-ram-top-shell-parity-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document RAM shared workload display consumption."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));
process.exit(fail ? 1 : 0);
