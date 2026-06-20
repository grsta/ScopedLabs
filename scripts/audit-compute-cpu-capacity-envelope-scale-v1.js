const fs = require("fs");
const vm = require("vm");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
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

function runShared(payload) {
  const source = read("assets/scopedlabs-compute-capacity-visuals.js");
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "assets/scopedlabs-compute-capacity-visuals.js" });
  return {
    api: context.window.ScopedLabsComputeCapacityVisuals,
    thresholds: context.window.ScopedLabsComputeCapacityVisuals.cpuEnvelopeThresholds(payload),
    svg: context.window.ScopedLabsComputeCapacityVisuals.buildCpuCapacityEnvelopeSvg(payload)
  };
}

console.log("SCOPEDLABS CPU CAPACITY ENVELOPE SCALE AUDIT V1\n");

const visual = read("assets/scopedlabs-compute-capacity-visuals.js");
const cpuScript = read("tools/compute/cpu-sizing/script.js");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const ramHtml = read("tools/compute/ram-sizing/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");

check(
  "CPU_STATUS_AUTHORITY_EXPORTED_BY_SHARED_VISUAL_MODULE",
  visual.includes("cpuEnvelopeThresholds,") &&
    visual.includes("cpuEnvelopeStatus,") &&
    visual.includes('const VERSION = "scopedlabs-compute-capacity-visuals-014-unified-cpu-status"'),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Shared Compute capacity visual module must export CPU envelope thresholds/status authority."
);

check(
  "CPU_STATUS_THRESHOLDS_USE_USABLE_CAPACITY",
  visual.includes("const watchThresholdCores = usableCapacityCores * 0.70;") &&
    visual.includes("const riskThresholdCores = usableCapacityCores * 0.90;") &&
    !visual.includes("const watchThresholdCores = recommendedLogicalCores * 0.70;") &&
    !visual.includes("const riskThresholdCores = recommendedLogicalCores * 0.90;"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "CPU status thresholds must align to usable capacity so chart zones and status chip agree."
);

check(
  "CPU_PAGE_DELEGATES_THRESHOLDS_TO_SHARED_MODULE",
  cpuScript.includes("window.ScopedLabsComputeCapacityVisuals.cpuEnvelopeThresholds(result)") &&
    !cpuScript.includes("const watchThresholdCores = recommendedLogicalCores * 0.70;") &&
    !cpuScript.includes("const riskThresholdCores = recommendedLogicalCores * 0.90;"),
  "tools/compute/cpu-sizing/script.js",
  "CPU page script should delegate CPU envelope thresholds to the shared capacity visual module."
);

let stress = null;
let error = null;
try {
  stress = runShared({
    inputs: {
      targetUtilizationPercent: 10,
      concurrency: 100,
      growthReservePercent: 21,
      failoverMultiplier: 1
    },
    outputs: {
      recommendedLogicalCores: 1005,
      recommendedPhysicalCores: 1005,
      baseDemandCores: 50,
      demandAfterGrowthCores: 75,
      effectiveDemandCores: 100.5,
      usableCapacityCores: 100.5
    },
    status: "GOOD"
  });
} catch (err) {
  error = err;
}

check(
  "CPU_LOW_UTILIZATION_STATUS_MATCHES_CHART",
  !!stress &&
    stress.thresholds.status === "RISK" &&
    Math.abs(stress.thresholds.watchThresholdCores - 70.35) < 0.02 &&
    Math.abs(stress.thresholds.riskThresholdCores - 90.45) < 0.02 &&
    stress.svg.includes(">RISK</text>") &&
    stress.svg.includes("Usable capacity - 100.5 cores") &&
    stress.svg.includes("Recommended - 1005 logical cores (above scale)") &&
    !stress.svg.includes("NaN") &&
    !stress.svg.includes("undefined"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  error ? "Runtime error: " + error.message : "10% target / high recommended-core case must render a readable chart with matching Risk status."
);

check(
  "CPU_RAM_LOAD_UNIFIED_STATUS_VISUAL_VERSION",
  cpuHtml.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-014-unified-cpu-status") &&
    ramHtml.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-014-unified-cpu-status") &&
    cpuHtml.includes("./script.js?v=compute-cpu-unified-envelope-status-0620"),
  "tools/compute/cpu-sizing/index.html; tools/compute/ram-sizing/index.html",
  "CPU/RAM pages must load the unified status shared visual, and CPU must load the delegating script."
);

check(
  "MODULE_MAP_RECORDS_UNIFIED_CPU_STATUS",
  moduleMap.includes("### Compute CPU capacity readable scale") &&
    moduleMap.includes("usable CPU capacity") &&
    moduleMap.includes("audit-compute-cpu-capacity-envelope-scale-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document the shared status/scale authority fix."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
