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
  "SHELL_OWNS_COMPUTE_FLOW_ACTIONS",
  shell.includes("normalizeFlowActions") &&
    shell.includes("setAttributeIfNeeded") &&
    shell.includes("setStyleIfNeeded") &&
    shell.includes("var scheduled = false") &&
    shell.includes(".compute-flow-actions") &&
    shell.includes("window.ScopedLabsComputeShellContract") &&
    shell.includes("scopedlabs-compute-shell-contract-003-flow-actions-idempotent"),
  "assets/scopedlabs-compute-shell-contract.js",
  "Compute shell contract should own flow action styles and normalization."
);

check(
  "CPU_HAS_ONE_SHELL_OWNED_ACTION_ROW",
  count(cpu, /data-compute-flow-owner="compute-shell-contract"/g) === 1 &&
    count(cpu, /id="continue-wrap"/g) === 1 &&
    count(cpu, /id="continue"/g) === 1,
  "tools/compute/cpu-sizing/index.html",
  "CPU should have one Back/Continue row and no duplicate continue IDs."
);

check(
  "CPU_BACK_AND_CONTINUE_ROUTES",
  cpu.includes('href="/tools/compute/workload-planner/"') &&
    cpu.includes('href="/tools/compute/ram-sizing/"') &&
    cpu.includes("Continue &rarr; RAM Sizing") &&
    !cpu.includes(">Back to Compute<") &&
    !cpu.includes("Continue ?"),
  "tools/compute/cpu-sizing/index.html",
  "CPU Back should go to Planner and Continue should go to RAM with safe arrow entity."
);

check(
  "CPU_LOADS_FLOW_ACTION_SHELL_VERSION",
  cpu.includes("scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-003-flow-actions-idempotent"),
  "tools/compute/cpu-sizing/index.html",
  "CPU should load the current Compute shell contract version."
);

check(
  "RAM_HAS_ONE_SHELL_OWNED_ACTION_ROW",
  count(ram, /data-compute-flow-owner="compute-shell-contract"/g) === 1 &&
    count(ram, /id="continue-wrap"/g) === 1 &&
    count(ram, /id="continue"/g) === 1,
  "tools/compute/ram-sizing/index.html",
  "RAM should have one Back/Continue row and no duplicate continue IDs."
);

check(
  "RAM_BACK_AND_CONTINUE_ROUTES",
  ram.includes('href="/tools/compute/cpu-sizing/"') &&
    ram.includes("Continue &rarr; Storage IOPS") &&
    !ram.includes(">Back to Compute<") &&
    !ram.includes("Continue ?"),
  "tools/compute/ram-sizing/index.html",
  "RAM Back should go to CPU and Continue should show Storage IOPS with safe arrow entity."
);

check(
  "RAM_LOADS_FLOW_ACTION_SHELL_VERSION",
  ram.includes("scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-003-flow-actions-idempotent"),
  "tools/compute/ram-sizing/index.html",
  "RAM should load the current Compute shell contract version."
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
