const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = dir + "/" + entry.name;
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
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

console.log("SCOPEDLABS COMPUTE WORKLOAD LEDGER AUDIT V1\n");

const planState = read("assets/scopedlabs-compute-plan-state.js");
const plannerAdapter = read("assets/scopedlabs-compute-planner-adapter.js");
const publisher = read("assets/scopedlabs-compute-tool-ledger-publisher.js");
const plannerHtml = read("tools/compute/workload-planner/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

const computeToolPages = walkFiles("tools/compute")
  .filter((file) => file.endsWith("/index.html"))
  .filter((file) => !file.includes("/workload-planner/"))
  .filter((file) => !file.includes("/summary/"))
  .filter((file) => file !== "tools/compute/index.html");

check(
  "COMPUTE_PLAN_STATE_OWNS_PER_WORKLOAD_TOOL_LEDGER",
  planState.includes("active.toolLedger") &&
    planState.includes("active.completedToolCount") &&
    planState.includes("active.lastCompletedTool") &&
    planState.includes("active.nextSuggestedTool") &&
    planState.includes("rollupToolStatuses") &&
    planState.includes("summarizeToolResult"),
  "assets/scopedlabs-compute-plan-state.js",
  "Shared plan state must persist completed tools, key saved results, last completed tool, rollup status, and next suggested tool per workload."
);

check(
  "COMPUTE_TOOL_LEDGER_PUBLISHER_EXISTS",
  publisher.includes('var VERSION = "scopedlabs-compute-tool-ledger-publisher-001"') &&
    publisher.includes("State.recordToolResult(slug") &&
    publisher.includes("MutationObserver") &&
    publisher.includes("existingDirectToolResult"),
  "assets/scopedlabs-compute-tool-ledger-publisher.js",
  "Shared publisher must detect Compute tool result changes and publish them to plan state without overwriting richer direct publishers."
);

check(
  "COMPUTE_TOOL_PAGES_LOAD_PLAN_STATE_AND_LEDGER_PUBLISHER",
  computeToolPages.length >= 8 &&
    computeToolPages.every((file) => {
      const html = read(file);
      return html.includes("/assets/scopedlabs-compute-plan-state.js?v=scopedlabs-compute-plan-state-008-tool-ledger") &&
        html.includes("/assets/scopedlabs-compute-tool-ledger-publisher.js?v=scopedlabs-compute-tool-ledger-publisher-001");
    }),
  "tools/compute/*/index.html",
  "Compute tool pages must load shared plan state and shared ledger publisher."
);

check(
  "COMPUTE_PLANNER_READS_LEDGER_RESULTS",
  plannerAdapter.includes("workloadResultMap(workload, plan)") &&
    plannerAdapter.includes("completedComputeCheckCount(workload, plan)") &&
    plannerAdapter.includes("latestWorkloadToolResult(workload, plan)") &&
    plannerAdapter.includes("workloadKeySavedResult(workload, plan)") &&
    plannerAdapter.includes("workloadNextAction(workload, plan)"),
  "assets/scopedlabs-compute-planner-adapter.js",
  "Planner adapter must read per-workload tool results from shared plan state."
);

check(
  "WORKLOAD_PLANNER_LOADS_LEDGER_AWARE_ADAPTER",
  plannerHtml.includes("/assets/scopedlabs-compute-plan-state.js?v=scopedlabs-compute-plan-state-008-tool-ledger") &&
    plannerHtml.includes("/assets/scopedlabs-compute-planner-adapter.js?v=scopedlabs-compute-planner-adapter-012-workload-ledger"),
  "tools/compute/workload-planner/index.html",
  "Workload Planner must load the ledger-aware state and adapter versions."
);

check(
  "COMPUTE_WORKLOAD_LEDGER_AUDIT_IS_IN_BATCH",
  batch.includes("audit-compute-workload-ledger-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "New Compute workload ledger audit must be part of the reusable audit batch."
);

check(
  "MODULE_MAP_RECORDS_COMPUTE_WORKLOAD_LEDGER",
  moduleMap.includes("### Compute workload tool ledger") &&
    moduleMap.includes("assets/scopedlabs-compute-tool-ledger-publisher.js") &&
    moduleMap.includes("audit-compute-workload-ledger-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document the shared Compute workload ledger and audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));
process.exit(fail ? 1 : 0);
