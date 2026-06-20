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
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

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
  "RAM_TOP_SHELL_REMOVES_LEGACY_INTRO_CLUTTER",
  !ramHtml.includes("Part of a Design Flow") &&
    !ramHtml.includes("Best for:") &&
    !ramHtml.includes("Free Tier") &&
    !ramHtml.includes('<div class="crumbs">'),
  "tools/compute/ram-sizing/index.html",
  "RAM top shell should not show old Free Tier pill, breadcrumbs, Design Flow card, or loose Best for line."
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
  "RAM top shell order must be title, pipeline, workload context, then tool inputs."
);

check(
  "RAM_ACTIVE_WORKLOAD_CARD_MATCHES_CPU_RHYTHM",
  ramHtml.includes("computeWorkloadContextCard") &&
    ramHtml.includes("Active Workload") &&
    ramHtml.includes("RAM Sizing") &&
    ramHtml.includes("computeWorkloadContextTitle") &&
    ramHtml.includes("computeWorkloadContextCopy") &&
    ramHtml.includes("computeWorkloadContextMeta"),
  "tools/compute/ram-sizing/index.html",
  "RAM must use the CPU-grade active workload context card structure."
);

check(
  "RAM_INPUT_CARD_USES_PLANNING_INPUTS_COPY",
  ramHtml.includes("Planning Inputs") &&
    ramHtml.includes("Model installed RAM from workload memory demand") &&
    !ramHtml.includes('<h2 class="card-title" style="margin-top: 0;">Inputs</h2>'),
  "tools/compute/ram-sizing/index.html",
  "RAM input card should use Planning Inputs title and RAM planning copy."
);

check(
  "RAM_SCRIPT_RENDERS_ACTIVE_WORKLOAD_CONTEXT_CARD",
  ramScript.includes('workloadContextCard: $("computeWorkloadContextCard")') &&
    ramScript.includes("workloadContextTitle") &&
    ramScript.includes("workloadContextMeta") &&
    ramScript.includes("ramPlannerContextFromCpu(data)") &&
    ramScript.includes("els.workloadContextCard.hidden = false"),
  "tools/compute/ram-sizing/script.js",
  "RAM script must populate the active workload card from existing CPU/planner context."
);

check(
  "RAM_TOP_SHELL_CACHE_BUST_UPDATED",
  ramHtml.includes("./script.js?v=compute-ram-top-shell-parity-0620"),
  "tools/compute/ram-sizing/index.html",
  "RAM page should cache-bust the local script after top shell parity wiring."
);

check(
  "MODULE_MAP_RECORDS_RAM_TOP_SHELL_PARITY",
  moduleMap.includes("### Compute RAM top shell parity") &&
    moduleMap.includes("audit-compute-ram-top-shell-parity-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document RAM top shell parity and audit ownership."
);

check(
  "BATCH_RUNNER_INCLUDES_RAM_TOP_SHELL_PARITY_AUDIT",
  batch.includes("scripts/audit-compute-ram-top-shell-parity-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "Closeout batch runner must include the RAM top shell parity audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
