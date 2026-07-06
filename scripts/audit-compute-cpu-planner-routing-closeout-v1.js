const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  shell: path.join(root, "assets", "scopedlabs-compute-shell-contract.js"),
  visuals: path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"),
  assistant: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md"),
  ledger: path.join(root, "docs", "scopedlabs-pattern-promotion-ledger.md")
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const src = Object.fromEntries(Object.entries(files).map(([key, value]) => [key, read(value)]));
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail);
}

check("CPU_SCRIPT_CACHE_BUSTED", src.html.includes("planner-routing-0706"), "CPU local script should include the planner-routing cache-bust suffix while preserving the previous cache-bust family.");
check("CPU_PLANNER_ROUTING_MARKER", src.script.includes("cpu-sizing-planner-routing-0706"), "CPU script should contain the planner-routing promotion marker.");
check("CPU_PLANNER_ROUTING_PAYLOAD_FIELDS", src.script.includes("plannerRouting") && src.script.includes("plannerAssistantDecisionNeeded") && src.script.includes("plannerRouteHint") && src.script.includes("specialtyBranchCandidates"), "CPU payload should expose planner-routing fields.");
check("CPU_ROUTING_IN_PIPELINE_RESULT", /const cpuPipelineResult = \{[\s\S]*plannerRouting[\s\S]*plannerRouteHint[\s\S]*specialtyBranchCandidates/.test(src.script), "cpuPipelineResult should carry planner-routing context.");
check("CPU_WRITE_FLOW_USES_PIPELINE_RESULT", src.script.includes("ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP]") && src.script.includes("data: cpuPipelineResult"), "writeFlow should continue to publish cpuPipelineResult.");
check("CPU_SAVE_WORKLOAD_USES_PIPELINE_RESULT", src.script.includes("saveCpuResultToWorkload(cpuPipelineResult)"), "workload state should continue to save cpuPipelineResult.");
check("CPU_BRANCH_HINTS", src.script.includes('tool: "ram-sizing"') && src.script.includes('tool: "storage-iops"') && src.script.includes('tool: "gpu-vram"') && src.script.includes('tool: "vm-density"') && src.script.includes('tool: "summary"'), "Planner branch hints should include RAM, Storage IOPS, GPU VRAM, VM Density, and Summary.");
check("CPU_SHARED_SHELL_ROUTE_PRESERVED", src.shell.includes('tool: "cpu-sizing"') && src.shell.includes("/tools/compute/ram-sizing/"), "Shared Compute shell should still own CPU -> RAM route.");
check("CPU_SHARED_VISUAL_OWNER_PRESERVED", /cpu[-\s]?sizing|CpuSizing|CPU/i.test(src.visuals), "Shared Compute capacity visual ownership should still reference CPU.");
check("CPU_SHARED_ASSISTANT_OWNER_PRESERVED", /cpu[-\s]?sizing|CpuSizing|CPU/i.test(src.assistant), "Shared Compute assistant ownership should still reference CPU.");
check("CPU_DOCS_UPDATED", src.moduleMap.includes("COMPUTE_CPU_PLANNER_ROUTING_0706") && src.ledger.includes("COMPUTE-CPU-PLANNER-ROUTING-0706"), "Module map and pattern promotion ledger should document CPU planner-routing ownership.");

const failed = results.filter((item) => !item.pass);
console.log("\nCPU planner-routing closeout audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);

