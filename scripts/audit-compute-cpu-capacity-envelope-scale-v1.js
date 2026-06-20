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

console.log("SCOPEDLABS CPU CAPACITY ENVELOPE SCALE AUDIT V1\n");

const visual = read("assets/scopedlabs-compute-capacity-visuals.js");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const ramHtml = read("tools/compute/ram-sizing/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");

check(
  "CPU_VISUAL_SCALE_EXCLUDES_RAW_RECOMMENDED_FROM_AXIS_BASIS",
  visual.includes("visualDemandPeakCores") &&
    visual.includes("visualRecommendedCeilingCores") &&
    visual.includes("visualScaleBasisCores") &&
    visual.includes("recommendedAbovePlotScale") &&
    !visual.includes("const logicalY = yScale(recommendedLogicalCores);"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Raw recommended logical cores should not be allowed to stretch the Y-axis and crush the demand curve."
);

check(
  "CPU_VISUAL_STILL_LABELS_RECOMMENDED_LOGICAL_CORES",
  visual.includes("const logicalLabel = \"Recommended - \" + recommendedLogicalCores + \" logical cores\"") &&
    visual.includes("svgText(logicalLabel)") &&
    visual.includes("(above scale)"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "The recommended logical-core count must remain visible as an annotation/callout."
);

check(
  "CPU_VISUAL_TICKS_ARE_READABLE",
  visual.includes("const yStep = yMax <= 16 ? 2 : yMax <= 40 ? 4 : yMax <= 96 ? 8 : 16;"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Y-axis tick density should stay readable for low-utilization/high-recommendation cases."
);

let runtimeOk = false;
let runtimeSvg = "";
let runtimeError = null;

try {
  const context = { window: {}, console: console };
  vm.createContext(context);
  vm.runInContext(visual, context);
  runtimeSvg = context.window.ScopedLabsComputeCapacityVisuals.buildCpuCapacityEnvelopeSvg({
    inputs: { targetUtilizationPercent: 10 },
    outputs: {
      recommendedLogicalCores: 161,
      recommendedPhysicalCores: 81,
      baseDemandCores: 4.8,
      demandAfterGrowthCores: 12.4,
      effectiveDemandCores: 16.1
    },
    status: "GOOD"
  });
  runtimeOk = true;
} catch (error) {
  runtimeError = error;
}

check(
  "CPU_VISUAL_RUNTIME_BUILDS_LOW_UTILIZATION_CASE",
  runtimeOk &&
    runtimeSvg.includes("Recommended - 161 logical cores (above scale)") &&
    runtimeSvg.includes("Usable capacity - 16.1 cores") &&
    !runtimeSvg.includes(">188<") &&
    !runtimeSvg.includes(">160<"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  runtimeOk
    ? "Low target-utilization case renders with readable scale and above-scale recommendation callout."
    : "Runtime SVG build failed: " + (runtimeError && runtimeError.message ? runtimeError.message : runtimeError)
);

check(
  "CPU_RAM_PAGES_CACHE_BUST_SHARED_CAPACITY_VISUAL",
  cpuHtml.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-012-cpu-readable-scale") &&
    ramHtml.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-012-cpu-readable-scale"),
  "tools/compute/cpu-sizing/index.html; tools/compute/ram-sizing/index.html",
  "CPU and RAM should load the shared capacity visual readable-scale version."
);

check(
  "MODULE_MAP_RECORDS_CPU_READABLE_SCALE_FIX",
  moduleMap.includes("### Compute CPU capacity readable scale") &&
    moduleMap.includes("audit-compute-cpu-capacity-envelope-scale-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document this shared visual scale fix and audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
