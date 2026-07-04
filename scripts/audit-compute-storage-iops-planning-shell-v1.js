const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "script.js"), "utf8");
const moduleMap = fs.readFileSync(path.join(root, "docs", "scopedlabs-module-map.md"), "utf8");

const checks = [];

function check(name, ok) {
  checks.push({ name, ok });
}

check("STORAGE_IOPS_BODY_SHELL_MARKER", html.includes('data-compute-tool-shell="storage-iops-planning-shell-0704"'));
check("STORAGE_IOPS_TOOL_SHELL_CLASS", html.includes("scopedlabs-tool-shell"));
check("STORAGE_IOPS_EXPORT_CARD_CLASS", html.includes("compute-export-card"));
check("STORAGE_IOPS_FLOW_ACTIONS_CLASS", html.includes("compute-flow-actions"));
check("STORAGE_IOPS_ASSISTANT_EXPORT_STACK", html.includes("scopedlabs-assistant-export"));
check("STORAGE_IOPS_PLANNING_INPUT_AVAILABLE_IOPS", html.includes('id="availableIops"'));
check("STORAGE_IOPS_PLANNING_INPUT_PEAK", html.includes('id="peakMultiplier"'));
check("STORAGE_IOPS_PLANNING_INPUT_GROWTH", html.includes('id="growthPct"'));
check("STORAGE_IOPS_PLANNING_INPUT_LATENCY", html.includes('id="targetLatency"'));
check("STORAGE_IOPS_PLANNING_INPUT_BLOCK_SIZE", html.includes('id="blockSizeKb"'));
check("STORAGE_IOPS_PLANNING_INPUT_MEDIA", html.includes('id="mediaTier"'));
check("STORAGE_IOPS_PLANNING_INPUT_PATTERN", html.includes('id="workloadPattern"'));
check("STORAGE_IOPS_SCRIPT_CACHE_BUST", html.includes("./script.js?v=compute-storage-iops-planning-shell-0704"));
check("STORAGE_IOPS_PROOF_RENDERER", js.includes("function renderStorageIopsProof(payload)"));
check("STORAGE_IOPS_REFERENCES_VISIBLE", js.includes("*1 Required IOPS") && js.includes("*2 Utilization") && js.includes("*3 Latency"));
check("STORAGE_IOPS_LEDGER_PLANNING_INPUTS", js.includes("planningInputs") && js.includes("assistantRecommendation"));
check("STORAGE_IOPS_SUMMARY_CARRYOVER", js.includes("availableIops") && js.includes("utilizationPct") && js.includes("dominantConstraint"));
check("STORAGE_IOPS_MODULE_MAP_ENTRY", moduleMap.includes("COMPUTE_STORAGE_IOPS_PLANNING_SHELL_0704"));

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.name);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.name);
  }
}

console.log("");
console.log("SCOPEDLABS COMPUTE STORAGE IOPS PLANNING SHELL AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) process.exit(1);
