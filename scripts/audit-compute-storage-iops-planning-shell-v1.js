const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "script.js"), "utf8");
const moduleMap = fs.readFileSync(path.join(root, "docs", "scopedlabs-module-map.md"), "utf8");

const combined = html + "\n" + js;
const checks = [];

function check(name, ok) {
  checks.push({ name, ok });
}

[
  'data-compute-tool-shell="storage-iops-full-shell-parity-0704"',
  "scopedlabs-tool-shell",
  "compute-export-card",
  "scopedlabs-assistant-export",
  "scopedlabs-user-tool-notes",
  "compute-flow-actions",
  "assets/scopedlabs-report-metadata.js",
  "assets/scopedlabs-tool-shell.js",
  "assets/scopedlabs-user-tool-notes.js",
  "assets/scopedlabs-assistant-export.js",
  "assets/scopedlabs-compute-capacity-visuals.js",
  "assets/scopedlabs-compute-result-visuals.css",
  "Planning Inputs",
  "Recommendation References",
  "Assistant Recommended Actions",
  "reportMetadataMount",
  "computeStorageIopsReferencesCard",
  "computeStorageIopsRecommendedActionsCard",
  "computeStorageIopsDecisionScheduleCard",
  "storage-iops-full-shell-parity-0704",
  "compute-storage-iops-full-shell-parity-0704"
].forEach((token) => check("HAS_" + token.replace(/[^A-Za-z0-9]+/g, "_"), combined.includes(token)));

check("STORAGE_IOPS_PLANNING_INPUTS_PRESERVED", html.includes('id="availableIops"') && html.includes('id="peakMultiplier"') && html.includes('id="targetLatency"'));
check("STORAGE_IOPS_REFERENCES_VISIBLE", js.includes("*1 Required IOPS") && js.includes("*2 Utilization") && js.includes("*3 Latency"));
check("STORAGE_IOPS_ACTIONS_RENDERED", js.includes("recommendedActions") && js.includes("decisionSchedule"));
check("STORAGE_IOPS_LEDGER_PAYLOAD_PRESERVED", js.includes("planningInputs") && js.includes("assistantRecommendation"));
check("STORAGE_IOPS_MODULE_MAP_ENTRY", moduleMap.includes("COMPUTE_STORAGE_IOPS_FULL_SHELL_PARITY_0704"));

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
