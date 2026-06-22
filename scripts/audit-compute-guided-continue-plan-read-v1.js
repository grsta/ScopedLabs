const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

let failures = 0;

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

function hasVersionedScript(page, scriptName, prefix) {
  const marker = scriptName + "?v=" + prefix + "-";
  const index = page.indexOf(marker);
  if (index < 0) return false;
  const after = page.slice(index + marker.length);
  return /^[0-9]{3}(?:-[a-z0-9-]+)?/.test(after);
}

const planState = read("assets/scopedlabs-compute-plan-state.js");
const ramScript = read("tools/compute/ram-sizing/script.js");
const ramIndex = read("tools/compute/ram-sizing/index.html");
const shell = read("assets/scopedlabs-compute-shell-contract.js");
const cpu = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Guided Continue Plan Read Audit V1");
console.log("");

check(
  "SHELL_READS_PLAN_STATE_LOAD_API",
  shell.includes("\"load\"") && shell.includes("getPlanSnapshot") && shell.includes("readPlan"),
  "shared shell must use current Compute plan-state API, including load()"
);

check(
  "SHELL_READS_ACTUAL_WORKLOAD_PLAN_KEYS",
  shell.includes("scopedlabs:compute:workload-plan") && shell.includes("scopedlabs:pipeline:compute:workload-plan"),
  "shared shell must read current workload plan storage keys before legacy fallbacks"
);

check(
  "SHELL_PASSES_GUIDED_CONTEXT_TO_ROUTE_ENGINE",
  shell.includes("guidedContext: context") && shell.includes("routeMode: \"compute-guided\""),
  "route engine should receive explicit guided context"
);

check(
  "SHELL_CAN_USE_CONTEXT_EMBEDDED_WORKLOAD",
  shell.includes("context.workload") && shell.includes("return context.workload"),
  "guided fallback should use the workload carried in context"
);

check(
  "SHELL_UPDATES_VISIBLE_ROW_CTA_FIRST",
  shell.includes("data-compute-flow-owner") &&
    shell.includes("compute-shell-contract") &&
    shell.includes("suppressLegacyComputeContinueControls(row)") &&
    shell.includes("data-compute-dynamic-continue-suppressed") &&
    shell.includes("normalizeComputeGuidedContinueLabel(decision)"),
  "refresh should target the shell-owned visible CTA and suppress duplicate legacy controls"
);

check(
  "SHELL_MARKS_GUIDED_NEXT_TOOL",
  shell.includes("data-compute-guided-next-tool"),
  "guided Continue CTA should expose the resolved next tool"
);

check(
  "CPU_RAM_LOAD_VERSIONED_GUIDED_SHELL",
  hasVersionedScript(cpu, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    hasVersionedScript(ram, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    /scopedlabs-compute-shell-contract\.js\?v=scopedlabs-compute-shell-contract-[0-9]{3}-[a-z0-9-]+/.test(cpu) &&
    /scopedlabs-compute-shell-contract\.js\?v=scopedlabs-compute-shell-contract-[0-9]{3}-[a-z0-9-]+/.test(ram),
  "CPU/RAM pages must load a scoped versioned shared shell with guided plan-read support"
);

check(
  "MODULE_MAP_DOCUMENTS_GUIDED_CONTINUE_PLAN_READ",
  moduleMap.includes("Compute guided Continue plan read"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_GUIDED_CONTINUE_PLAN_READ_AUDIT",
  batch.includes("scripts/audit-compute-guided-continue-plan-read-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (9 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);

check(
  "PLAN_STATE_INVALIDATES_TOOL_AND_DOWNSTREAM_LEDGER",
  planState.includes("function invalidateToolAndDownstream") &&
    planState.includes("delete active.completedTools[tool]") &&
    planState.includes("delete active.completedChecks[tool]") &&
    planState.includes("delete plan.results[workloadId][tool]") &&
    planState.includes("tool-downstream-invalidated") &&
    planState.includes("invalidateToolAndDownstream: invalidateToolAndDownstream"),
  "plan-state should clear saved completion/results for a changed tool and downstream guided steps"
);

check(
  "RAM_INVALIDATE_CLEARS_DOWNSTREAM_GUIDED_LEDGER",
  ramScript.includes("const DOWNSTREAM_STEPS_AFTER_RAM") &&
    ramScript.includes("gpu-vram") &&
    ramScript.includes("State.invalidateToolAndDownstream(STEP") &&
    ramScript.includes("includeSelf: true") &&
    ramScript.includes("downstreamTools: DOWNSTREAM_STEPS_AFTER_RAM"),
  "RAM input invalidation should clear RAM and downstream guided ledger results so Continue can route to GPU again after recalculation"
);

check(
  "RAM_LOADS_DOWNSTREAM_INVALIDATION_PLAN_STATE",
  ramIndex.includes("scopedlabs-compute-plan-state.js?v=scopedlabs-compute-plan-state-008-downstream-invalidation") &&
    ramIndex.includes("./script.js?v=compute-ram-downstream-invalidation-0621"),
  "RAM page should load the plan-state and local script versions that own downstream invalidation"
);