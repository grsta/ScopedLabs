const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const checks = [];
function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

const shell = read("assets/scopedlabs-compute-shell-contract.js");
const cpu = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/index.html");

function count(source, pattern) {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

check(
  "SHELL_OWNS_FLOW_ACTION_PLACEMENT",
  shell.includes("scopedlabs-compute-shell-contract-004-flow-actions-placement") &&
    shell.includes("function computeFlowActionConfig") &&
    shell.includes("function ensureFlowActionsPlacement") &&
    shell.includes("function buildFlowActionRow") &&
    shell.includes("removeExistingFlowActionRows") &&
    shell.includes("findExportReportSection") &&
    shell.includes("data-compute-flow-owner") &&
    shell.includes("ensureFlowActionsPlacement();"),
  "assets/scopedlabs-compute-shell-contract.js",
  "Compute shell contract should own Back/Continue row config, duplicate cleanup, build, and placement."
);

check(
  "SHELL_DEFINES_CPU_ROUTE_CONTRACT",
  shell.includes('/tools/compute/workload-planner/') &&
    shell.includes("Back to Workload Planner") &&
    shell.includes('/tools/compute/ram-sizing/') &&
    shell.includes("Continue &rarr; RAM Sizing"),
  "assets/scopedlabs-compute-shell-contract.js",
  "CPU flow routes and labels should be defined in the shell contract."
);

check(
  "SHELL_DEFINES_RAM_ROUTE_CONTRACT",
  shell.includes('/tools/compute/cpu-sizing/') &&
    shell.includes("Back to CPU Sizing") &&
    shell.includes('/tools/compute/storage-iops/') &&
    shell.includes("Continue &rarr; Storage IOPS"),
  "assets/scopedlabs-compute-shell-contract.js",
  "RAM flow routes and labels should be defined in the shell contract."
);

check(
  "CPU_HAS_NO_STATIC_FLOW_ACTION_ROW",
  count(cpu, /class="compute-flow-actions"/g) === 0 &&
    count(cpu, /id="continue-wrap"/g) === 0 &&
    count(cpu, /id="continue"/g) === 0 &&
    !cpu.includes(">Back to Compute<"),
  "tools/compute/cpu-sizing/index.html",
  "CPU index should not own static flow-action placement or duplicate continue IDs."
);

check(
  "RAM_HAS_NO_STATIC_FLOW_ACTION_ROW",
  count(ram, /class="compute-flow-actions"/g) === 0 &&
    count(ram, /id="continue-wrap"/g) === 0 &&
    count(ram, /id="continue"/g) === 0 &&
    !ram.includes(">Back to Compute<") &&
    !ram.includes("Continue ?"),
  "tools/compute/ram-sizing/index.html",
  "RAM index should not own static flow-action placement or duplicate continue IDs."
);

check(
  "CPU_AND_RAM_LOAD_FLOW_PLACEMENT_SHELL",
  cpu.includes("scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-004-flow-actions-placement") &&
    ram.includes("scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-004-flow-actions-placement"),
  "tools/compute/*/index.html",
  "CPU and RAM should load the shell version that owns flow-action placement."
);

check(
  "SHELL_NORMALIZER_IS_IDEMPOTENT",
  shell.includes("setAttributeIfNeeded") &&
    shell.includes("setStyleIfNeeded") &&
    shell.includes("var scheduled = false"),
  "assets/scopedlabs-compute-shell-contract.js",
  "Shell observer and normalizer should remain idempotent to avoid page responsiveness regressions."
);

console.log("SCOPEDLABS COMPUTE FLOW ACTIONS SHELL CONTRACT AUDIT V1\n");

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.id);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.id);
  }

  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
