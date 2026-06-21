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
  return /^[0-9]{3}-[a-z0-9-]+/.test(after);
}

const cpu = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/index.html");
const shell = read("assets/scopedlabs-compute-shell-contract.js");

function guidedContinueBlock(source) {
  const start = source.indexOf("function readComputeGuidedContinueContext");
  const end = source.indexOf("initComputeGuidedContinueRouting();", start);
  if (start < 0 || end < 0) return "";
  return source.slice(start, end + "initComputeGuidedContinueRouting();".length);
}

const guidedBlock = guidedContinueBlock(shell);
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Tool Continue Route Audit V1");
console.log("");

check(
  "CPU_LOADS_ROUTE_ENGINE_BEFORE_SHELL",
  cpu.indexOf("scopedlabs-compute-guided-route-engine.js") > cpu.indexOf("scopedlabs-compute-plan-state.js") &&
    cpu.indexOf("scopedlabs-compute-shell-contract.js") > cpu.indexOf("scopedlabs-compute-guided-route-engine.js"),
  "tools/compute/cpu-sizing/index.html"
);

check(
  "RAM_LOADS_ROUTE_ENGINE_BEFORE_SHELL",
  ram.indexOf("scopedlabs-compute-guided-route-engine.js") > ram.indexOf("scopedlabs-compute-plan-state.js") &&
    ram.indexOf("scopedlabs-compute-shell-contract.js") > ram.indexOf("scopedlabs-compute-guided-route-engine.js"),
  "tools/compute/ram-sizing/index.html"
);

check(
  "CPU_AND_RAM_USE_VERSIONED_ROUTE_ENGINE",
  hasVersionedScript(cpu, "scopedlabs-compute-guided-route-engine.js", "scopedlabs-compute-guided-route-engine") &&
    hasVersionedScript(ram, "scopedlabs-compute-guided-route-engine.js", "scopedlabs-compute-guided-route-engine"),
  "contract: route engine cache-bust must be scoped/versioned, not pinned to yesterday"
);

check(
  "CPU_AND_RAM_USE_VERSIONED_SHELL_CONTRACT",
  hasVersionedScript(cpu, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract") &&
    hasVersionedScript(ram, "scopedlabs-compute-shell-contract.js", "scopedlabs-compute-shell-contract"),
  "contract: shell cache-bust must be scoped/versioned"
);

check(
  "SHELL_STANDALONE_DEFAULTS_REMAIN",
  shell.includes('continueHref: "/tools/compute/ram-sizing/"') &&
    shell.includes('continueLabel: "Continue &rarr; RAM Sizing"') &&
    shell.includes('continueHref: "/tools/compute/storage-iops/"') &&
    shell.includes('continueLabel: "Continue &rarr; Storage IOPS"'),
  "direct tool visits must keep existing standalone/default Continue labels"
);

check(
  "SHELL_HAS_GUIDED_CONTEXT_GUARD",
  shell.includes("function readComputeGuidedContinueContext") &&
    shell.includes("context.guidedFlow !== true") &&
    shell.includes('context.routeMode !== "compute-guided"'),
  "guided routing must only activate with explicit guided context"
);

check(
  "SHELL_CONTINUE_USES_ROUTE_ENGINE_ON_CLICK",
  shell.includes("function resolveComputeGuidedContinueDecision") &&
    shell.includes("ScopedLabsComputeGuidedRouteEngine") &&
    shell.includes("RouteEngine.resolve({") &&
    shell.includes("window.location.href = decision.nextHref"),
  "Continue should route through guided engine only when guided context exists"
);

check(
  "SHELL_AVOIDS_CURRENT_TOOL_LOOP",
  shell.includes("decision.nextTool === tool") &&
    shell.includes("return null;"),
  "guided Continue should not route back to the same tool when current result is not complete"
);

check(
  "SHELL_SETS_GUIDED_ROUTE_DATA_MARKER",
  shell.includes('data-compute-guided-route-continue') &&
    shell.includes("applyComputeGuidedContinueDecision"),
  "guided routed Continue should be inspectable in the DOM"
);

check(
  "SHELL_GUIDED_CONTINUE_BLOCK_HAS_SAFE_ROUTE_LABELS",
  guidedBlock.length > 0 &&
    !guidedBlock.includes("Guided Flow ?") &&
    !guidedBlock.includes("Continue ?") &&
    !guidedBlock.includes("Guided Flow ?") &&
    !guidedBlock.includes("\\u2192?") &&
    !guidedBlock.includes("\\u2192 ?"),
  "guided Continue block must not introduce corrupt arrow/question-mark route labels"
);

check(
  "MODULE_MAP_DOCUMENTS_TOOL_CONTINUE_ROUTE",
  moduleMap.includes("Compute tool Continue route wiring"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_RUNNER_INCLUDES_TOOL_CONTINUE_ROUTE_AUDIT",
  batch.includes("scripts/audit-compute-tool-continue-route-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (12 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
