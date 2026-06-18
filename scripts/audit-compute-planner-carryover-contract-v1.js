const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const checks = [];
function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

const state = read("assets/scopedlabs-compute-plan-state.js");
const cpu = read("tools/compute/cpu-sizing/script.js");
const cpuIndex = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/script.js");

check(
  "PLANNER_EXPOSES_TARGET_AND_GROWTH_CONTEXT",
  state.includes("Target Utilization") &&
    state.includes("Growth Margin") &&
    state.includes("workload.targetUtilization") &&
    state.includes("workload.growthMargin"),
  "assets/scopedlabs-compute-plan-state.js",
  "Planner display context should expose target utilization and growth margin."
);

check(
  "CPU_HYDRATES_WORKLOAD_FROM_PLANNER",
  cpu.includes("function hydrateCpuInputsFromPlanner") &&
    cpu.includes("normalizeComputeCarryoverWorkloadValue(workload.workloadType)") &&
    cpu.includes("els.workload.value = carriedWorkload"),
  "tools/compute/cpu-sizing/script.js",
  "CPU workload input should hydrate from planner workloadType."
);

check(
  "CPU_HYDRATES_TARGET_UTILIZATION_FROM_PLANNER",
  cpu.includes("workload.targetUtilization") &&
    cpu.includes("workload.targetUtilizationPercent") &&
    cpu.includes("els.targetUtil.value"),
  "tools/compute/cpu-sizing/script.js",
  "CPU target utilization should hydrate from planner target utilization."
);

check(
  "CPU_HYDRATES_GROWTH_RESERVE_FROM_PLANNER_MARGIN",
  cpu.includes("workload.growthMargin") &&
    cpu.includes("workload.growthMarginPercent") &&
    cpu.includes("els.growthReserve.value"),
  "tools/compute/cpu-sizing/script.js",
  "CPU growth reserve should hydrate from planner growth margin."
);

check(
  "CPU_HYDRATES_PATTERN_FROM_PLANNER_DEMAND",
  cpu.includes("normalizeCpuCarryoverPattern") &&
    cpu.includes("workload.demandPattern") &&
    cpu.includes("workload.demandProfile") &&
    cpu.includes("els.workloadPattern.value"),
  "tools/compute/cpu-sizing/script.js",
  "CPU workload pattern should hydrate from planner demand pattern/profile where possible."
);

check(
  "CPU_MAPS_PLANNER_BURSTY_DEMAND_TO_BURST_HEAVY",
  cpu.includes('bursty: "burstHeavy"') &&
    cpu.includes("burstHeavy: 1.22") &&
    cpuIndex.includes("Burst-heavy / queue spikes"),
  "tools/compute/cpu-sizing/script.js",
  "Planner Demand value Bursty should hydrate CPU Workload Pattern to Burst-heavy / queue spikes."
);

check(
  "CPU_PIPELINE_CARRIES_PLANNER_CONTEXT_TO_RAM",
  cpu.includes("plannerContext: activeWorkloadForResult ?") &&
    cpu.includes("targetUtilization: activeWorkloadForResult.targetUtilization") &&
    cpu.includes("growthMargin: activeWorkloadForResult.growthMargin") &&
    cpu.includes("demandPattern: activeWorkloadForResult.demandPattern") &&
    cpu.includes("branches: activeWorkloadForResult.branches"),
  "tools/compute/cpu-sizing/script.js",
  "CPU pipeline result should include planner context for downstream tools."
);

check(
  "RAM_READS_PLANNER_CONTEXT_FROM_CPU",
  ram.includes("function ramPlannerContextFromCpu") &&
    ram.includes("const plannerContext = ramPlannerContextFromCpu(data)") &&
    ram.includes("Planner Growth Margin"),
  "tools/compute/ram-sizing/script.js",
  "RAM should read planner context from CPU carryover and show it in flow context."
);

check(
  "RAM_CARRIES_PLANNER_AND_CPU_CONTEXT_FORWARD",
  ram.includes("plannerContext,") &&
    ram.includes("upstreamCpuContext,") &&
    ram.includes("capacityEnvelope: ramCapacityEnvelope"),
  "tools/compute/ram-sizing/script.js",
  "RAM flow payload should retain planner and upstream CPU context."
);

check(
  "RAM_HEADROOM_NOT_HYDRATED_FROM_PLANNER_GROWTH",
  !/els\.headroom\.value\s*=\s*[^;]*(growthMargin|growthReserve|plannerContext)/.test(ram),
  "tools/compute/ram-sizing/script.js",
  "RAM headroom is an operating/cache reserve and must not be silently overwritten by planner growth margin."
);

console.log("SCOPEDLABS COMPUTE PLANNER CARRYOVER CONTRACT AUDIT V1\n");

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
  if (item.detail) console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
