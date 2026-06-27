const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  planState: "assets/scopedlabs-compute-plan-state.js",
  cpuHtml: "tools/compute/cpu-sizing/index.html",
  cpuScript: "tools/compute/cpu-sizing/script.js",
  ramHtml: "tools/compute/ram-sizing/index.html",
  ramScript: "tools/compute/ram-sizing/script.js",
  gpuHtml: "tools/compute/gpu-vram/index.html",
  gpuScript: "tools/compute/gpu-vram/script.js",
  summaryHtml: "tools/compute/summary/index.html"
};

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const src = {};
for (const [key, rel] of Object.entries(files)) {
  src[key] = read(rel);
}

const checks = [];

function add(level, id, file, ok, message) {
  checks.push({ level, id, file, ok, message });
}

function has(text, needle) {
  return String(text || "").includes(needle);
}

function hasAny(text, needles) {
  return needles.some((needle) => has(text, needle));
}

function hasAll(text, needles) {
  return needles.every((needle) => has(text, needle));
}

add("FAIL", "PLAN_STATE_FILE_EXISTS", files.planState, !!src.planState, "Shared Compute plan-state file should exist.");
add("FAIL", "PLAN_STATE_CONTRACT", files.planState, has(src.planState, "scopedlabs.compute.workload-plan.v1"), "Shared state should own the Compute workload-plan contract.");
add("FAIL", "PLAN_STATE_KEY", files.planState, has(src.planState, "scopedlabs:pipeline:compute:workload-plan"), "Shared state should use the Compute workload-plan storage key.");
add("FAIL", "PLAN_STATE_LOAD_SAVE", files.planState, hasAll(src.planState, ["function load()", "function save(plan)"]), "Shared state should expose load/save internals.");
add("FAIL", "PLAN_STATE_WORKLOAD_RESULTS_MODEL", files.planState, hasAll(src.planState, ["workloads: []", "results: {}"]), "Shared state should model workloads and per-workload results.");
add("FAIL", "PLAN_STATE_WINDOW_EXPORT", files.planState, has(src.planState, "ScopedLabsComputePlanState"), "Shared state should export window.ScopedLabsComputePlanState.");

add("FAIL", "CPU_USES_PLAN_STATE", files.cpuScript, has(src.cpuScript, "window.ScopedLabsComputePlanState"), "CPU should use shared Compute plan state.");
add("FAIL", "CPU_SAVES_WORKLOAD_RESULT", files.cpuScript, has(src.cpuScript, "saveCpuResultToWorkload"), "CPU should save its result to the active workload.");
add("FAIL", "CPU_HAS_STATUS_DECISION", files.cpuScript, hasAll(src.cpuScript, ["cpuStatusForPlan", "cpuDecisionStatus"]), "CPU should expose status/decision logic.");
add("FAIL", "CPU_HAS_PROOF_SECTIONS", files.cpuScript, hasAll(src.cpuScript, ["buildComputeCpuRecommendationReferences", "buildComputeCpuRecommendedActions", "buildComputeCpuDecisionSchedule"]), "CPU should have references/actions/decision schedule proof sections.");
add("FAIL", "CPU_HAS_CUSTOM_EXPORT_PAYLOAD", files.cpuScript, hasAll(src.cpuScript, ["ScopedLabsComputeCpuExport", "buildComputeCpuExportPayload", "extraSections"]), "CPU should own a custom export payload with proof sections.");

add("FAIL", "RAM_USES_PLAN_STATE", files.ramScript, has(src.ramScript, "window.ScopedLabsComputePlanState"), "RAM should use shared Compute plan state.");
add("FAIL", "RAM_SAVES_LEDGER_RESULT", files.ramScript, has(src.ramScript, "saveComputeLedgerResult"), "RAM should save a ledger/workload result.");
add("FAIL", "RAM_HAS_VISUAL_AND_ASSISTANT", files.ramScript, hasAll(src.ramScript, ["renderRamCapacityVisual", "renderRamAssistant"]), "RAM should render the accepted visual and assistant.");
add("FAIL", "RAM_HAS_PROOF_SECTIONS", files.ramScript, hasAll(src.ramScript, ["renderRamReferences", "renderRamRecommendedActions", "renderRamDecisionSchedule"]), "RAM should have references/actions/decision schedule proof sections.");
add("WATCH", "RAM_CUSTOM_EXPORT_PAYLOAD_PARITY", files.ramScript, hasAny(src.ramScript + src.ramHtml, ["ScopedLabsComputeRamExport", "customPayloadBuilder", "buildComputeRamExportPayload"]), "RAM may need a custom export payload adapter if Summary/export reuse requires the CPU/GPU pattern.");

add("FAIL", "GPU_USES_PLAN_STATE", files.gpuScript, has(src.gpuScript, "window.ScopedLabsComputePlanState"), "GPU should use shared Compute plan state.");
add("FAIL", "GPU_HAS_ENGINEERING_PLAN", files.gpuScript, hasAll(src.gpuScript, ["ScopedLabsComputeGpuVramEngineeringInputs", "buildGpuEngineeringPlan", "currentPlan"]), "GPU should expose the current engineering plan.");
add("FAIL", "GPU_HAS_LEDGER_SAVE", files.gpuScript, hasAll(src.gpuScript, ["renderLedger", "saveComputeLedgerResult"]), "GPU should render/save ledger result data.");
add("FAIL", "GPU_HAS_PROOF_SECTIONS", files.gpuScript, hasAll(src.gpuScript, ["renderReferences", "renderActions", "renderSchedule"]), "GPU should have references/actions/decision schedule proof sections.");
add("FAIL", "GPU_HAS_CUSTOM_EXPORT_PAYLOAD", files.gpuScript, hasAll(src.gpuScript, ["ScopedLabsComputeGpuVramExport", "function buildPayload", "extraSections"]), "GPU should own a custom export payload with proof sections.");

add("FAIL", "SUMMARY_ROUTE_EXISTS", files.summaryHtml, !!src.summaryHtml, "Compute Summary route host should exist.");
add("WATCH", "SUMMARY_CONSUMES_PLAN_STATE", files.summaryHtml, has(src.summaryHtml, "scopedlabs-compute-plan-state.js") || has(src.summaryHtml, "ScopedLabsComputePlanState"), "Summary should eventually consume shared Compute plan state.");

let pass = 0;
let watch = 0;
let fail = 0;

console.log("SCOPEDLABS COMPUTE CPU/RAM/GPU SUMMARY PARITY AUDIT");
console.log("");

for (const check of checks) {
  const status = check.ok ? "PASS" : check.level;
  if (status === "PASS") pass += 1;
  if (status === "WATCH") watch += 1;
  if (status === "FAIL") fail += 1;

  console.log("[" + status + "] " + check.id);
  console.log("  " + check.file);
  console.log("  " + check.message);
}

console.log("");
console.log("SUMMARY");
console.log("PASS: " + pass);
console.log("WATCH: " + watch);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
