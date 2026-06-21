const Engine = require("../assets/scopedlabs-compute-guided-route-engine.js");

let failures = 0;

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

function planFor(workload, completedTools) {
  const results = {};
  results[workload.id] = {};
  (completedTools || []).forEach((tool) => {
    results[workload.id][tool] = {
      contract: "scopedlabs.compute.tool-result." + tool + ".v1",
      category: "compute",
      tool,
      workloadId: workload.id,
      result: { status: "GOOD", summary: tool + " complete" },
      updatedAt: "fixture"
    };
  });

  return {
    contract: "scopedlabs.compute.workload-plan.v1",
    category: "compute",
    activeWorkloadId: workload.id,
    workloads: [workload],
    results
  };
}

function guided(workload) {
  return {
    contract: "scopedlabs.compute.guided-flow.v1",
    category: "compute",
    guidedFlow: true,
    routeMode: "compute-guided",
    activeWorkloadId: workload.id,
    workloadId: workload.id,
    currentTool: "workload-planner"
  };
}

const cpuRamOnly = {
  id: "wl-core",
  name: "CPU RAM Only",
  branches: {}
};

const storage = {
  id: "wl-storage",
  name: "Storage Workload",
  branches: { storageHeavy: true }
};

const gpu = {
  id: "wl-gpu",
  name: "GPU Workload",
  branches: { gpu: true }
};

const gpuPower = {
  id: "wl-gpu-power",
  name: "GPU Power Workload",
  branches: { gpu: true, powerThermal: true }
};

const manyBranches = {
  id: "wl-many",
  name: "Many Branches",
  branches: { storageHeavy: true, gpu: true, powerThermal: true, backup: true }
};

console.log("Compute Guided Route Engine Audit V1");
console.log("");

let result = Engine.resolve({ plan: planFor(cpuRamOnly, []), currentTool: "cpu-sizing" });
check("STANDALONE_WITHOUT_GUIDED_CONTEXT", result.mode === "standalone" && result.action === "standalone" && !result.nextHref, "direct visits must remain standalone");

result = Engine.resolve({ plan: planFor(cpuRamOnly, []), guidedContext: guided(cpuRamOnly), currentTool: "workload-planner" });
check("NEW_GUIDED_FLOW_STARTS_AT_CPU", result.mode === "guided" && result.action === "start" && result.nextTool === "cpu-sizing", JSON.stringify(result));

result = Engine.resolve({ plan: planFor(cpuRamOnly, ["cpu-sizing"]), guidedContext: guided(cpuRamOnly), currentTool: "workload-planner" });
check("MID_PIPELINE_RESUMES_AT_RAM", result.action === "resume" && result.nextTool === "ram-sizing" && /Resume Guided Flow \u2192 /.test(result.nextLabel), JSON.stringify(result));

result = Engine.resolve({ plan: planFor(cpuRamOnly, ["cpu-sizing", "ram-sizing"]), guidedContext: guided(cpuRamOnly), currentTool: "workload-planner" });
check("CPU_RAM_COMPLETE_REVIEWS_SUMMARY_NOT_AUTO_REDIRECT", result.action === "review-summary" && result.nextTool === "summary" && /Review Compute Summary/.test(result.nextLabel), JSON.stringify(result));

result = Engine.resolve({ plan: planFor(storage, ["cpu-sizing", "ram-sizing"]), guidedContext: guided(storage), currentTool: "workload-planner" });
check("STORAGE_BRANCH_RESUMES_AT_IOPS", result.nextTool === "storage-iops" && result.remainingTools.includes("storage-throughput"), JSON.stringify(result));

result = Engine.resolve({ plan: planFor(storage, ["cpu-sizing", "ram-sizing", "storage-iops"]), guidedContext: guided(storage), currentTool: "workload-planner" });
check("STORAGE_BRANCH_CONTINUES_TO_THROUGHPUT", result.nextTool === "storage-throughput", JSON.stringify(result));

result = Engine.resolve({ plan: planFor(gpu, ["cpu-sizing", "ram-sizing"]), guidedContext: guided(gpu), currentTool: "workload-planner" });
check("GPU_SELECTED_RESUMES_AT_GPU_VRAM", result.nextTool === "gpu-vram" && /GPU/.test(result.reason), JSON.stringify(result));

result = Engine.resolve({ plan: planFor(gpuPower, ["cpu-sizing", "ram-sizing", "gpu-vram"]), guidedContext: guided(gpuPower), currentTool: "workload-planner" });
check("SPECIALTY_COMPLETE_CONTINUES_TO_NEXT_SELECTED_TOOL", result.nextTool === "power-thermal", JSON.stringify(result));

result = Engine.resolve({ plan: planFor(manyBranches, ["cpu-sizing", "ram-sizing", "storage-iops", "storage-throughput"]), guidedContext: guided(manyBranches), currentTool: "workload-planner" });
check("MULTIPLE_SELECTED_BRANCHES_QUEUE_IN_ORDER", result.nextTool === "gpu-vram" && result.remainingTools.includes("power-thermal") && result.remainingTools.includes("backup-window"), JSON.stringify(result));

result = Engine.resolve({ plan: planFor(gpuPower, ["cpu-sizing", "ram-sizing", "gpu-vram", "power-thermal"]), guidedContext: guided(gpuPower), currentTool: "workload-planner" });
check("ALL_APPLICABLE_WORK_COMPLETE_REVIEWS_SUMMARY", result.action === "review-summary" && result.nextHref === "/tools/compute/summary/", JSON.stringify(result));

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (10 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
