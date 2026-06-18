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
  "SHELL_IS_STATIC_SAFE",
  shell.includes("scopedlabs-compute-shell-contract-005-flow-actions-static-safe") &&
    shell.includes('data-compute-flow-owner") === "compute-shell-contract"') &&
    shell.includes("normalizeFlowActions") &&
    shell.includes("setAttributeIfNeeded") &&
    shell.includes("setStyleIfNeeded") &&
    shell.includes("var scheduled = false"),
  "assets/scopedlabs-compute-shell-contract.js",
  "Shell should normalize flow actions but must not delete valid shell-owned rows."
);

check(
  "CPU_HAS_ONE_VISIBLE_FLOW_ROW_CONTRACT",
  count(cpu, /data-compute-flow-owner="compute-shell-contract"/g) === 1 &&
    count(cpu, /id="continue-wrap"/g) === 1 &&
    count(cpu, /id="continue"/g) === 1,
  "tools/compute/cpu-sizing/index.html",
  "CPU should have exactly one shell-owned Back/Continue row."
);

check(
  "CPU_ROUTES_AND_TEXT_ARE_CORRECT",
  cpu.includes('href="/tools/compute/workload-planner/"') &&
    cpu.includes('href="/tools/compute/ram-sizing/"') &&
    cpu.includes("Back to Workload Planner") &&
    cpu.includes("Continue &rarr; RAM Sizing") &&
    !cpu.includes(">Back to Compute<") &&
    !cpu.includes("Continue ?"),
  "tools/compute/cpu-sizing/index.html",
  "CPU Back should go to Planner and Continue should go to RAM with safe arrow entity."
);

check(
  "RAM_HAS_ONE_VISIBLE_FLOW_ROW_CONTRACT",
  count(ram, /data-compute-flow-owner="compute-shell-contract"/g) === 1 &&
    count(ram, /id="continue-wrap"/g) === 1 &&
    count(ram, /id="continue"/g) === 1,
  "tools/compute/ram-sizing/index.html",
  "RAM should have exactly one shell-owned Back/Continue row."
);

check(
  "RAM_ROUTES_AND_TEXT_ARE_CORRECT",
  ram.includes('href="/tools/compute/cpu-sizing/"') &&
    ram.includes('data-compute-continue-href="/tools/compute/storage-iops/"') &&
    ram.includes("Back to CPU Sizing") &&
    ram.includes("Continue &rarr; Storage IOPS") &&
    !ram.includes(">Back to Compute<") &&
    !ram.includes("Continue ?"),
  "tools/compute/ram-sizing/index.html",
  "RAM Back should go to CPU and Continue should target Storage IOPS with safe arrow entity."
);

check(
  "CPU_AND_RAM_LOAD_STATIC_SAFE_SHELL",
  cpu.includes("scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-005-flow-actions-static-safe") &&
    ram.includes("scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-005-flow-actions-static-safe"),
  "tools/compute/*/index.html",
  "CPU and RAM should load the static-safe Compute shell contract."
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
