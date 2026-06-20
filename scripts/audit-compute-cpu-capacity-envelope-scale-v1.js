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

function buildSvg(source, payload) {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "assets/scopedlabs-compute-capacity-visuals.js" });
  return context.window.ScopedLabsComputeCapacityVisuals.buildCpuCapacityEnvelopeSvg(payload);
}

console.log("SCOPEDLABS CPU CAPACITY ENVELOPE SCALE AUDIT V1\n");

const visual = read("assets/scopedlabs-compute-capacity-visuals.js");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const ramHtml = read("tools/compute/ram-sizing/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");

check(
  "CPU_SCALE_IS_SHARED_MODULE_PATCH",
  visual.includes('const VERSION = "scopedlabs-compute-capacity-visuals-013-cpu-scale-callout"') &&
    visual.includes("buildCpuCapacityEnvelopeSvg") &&
    visual.includes("renderCpuCapacityEnvelope"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "CPU readable scale fix must live in the shared compute capacity visual module."
);

check(
  "CPU_SCALE_EXCLUDES_RAW_RECOMMENDED_FROM_YMAX",
  visual.includes("visualPeakCores") &&
    visual.includes("visualRecommendedDisplayCores") &&
    visual.includes("visualScaleBasisCores") &&
    visual.includes("recommendedAbovePlotScale") &&
    !visual.includes("const yMax = Math.max(4, Math.ceil(Math.max(\n      recommendedLogicalCores"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Raw recommended logical cores should not be the first-order Y-axis scale driver."
);

check(
  "CPU_SCALE_KEEP_RECOMMENDED_AS_CALLOUT",
  visual.includes("const logicalLabel = \"Recommended - \" + recommendedLogicalCores + \" logical cores\"") &&
    visual.includes("svgText(logicalLabel)") &&
    visual.includes("(above scale)"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Recommended logical cores must remain visible as a callout when it is above the readable plot scale."
);

let lowSvg = "";
let lowError = null;
try {
  lowSvg = buildSvg(visual, {
    inputs: { targetUtilizationPercent: 10, concurrency: 100, growthReservePercent: 20, failoverMultiplier: 1 },
    outputs: {
      recommendedLogicalCores: 161,
      recommendedPhysicalCores: 81,
      baseDemandCores: 4.8,
      demandAfterGrowthCores: 12.4,
      effectiveDemandCores: 16.1,
      usableCapacityCores: 16.1
    },
    status: "GOOD"
  });
} catch (error) {
  lowError = error;
}

check(
  "CPU_LOW_UTILIZATION_SVG_BUILDS",
  !!lowSvg &&
    lowSvg.includes("<svg") &&
    lowSvg.includes("CPU CAPACITY ENVELOPE") &&
    lowSvg.includes("Usable capacity - 16.1 cores") &&
    lowSvg.includes("Recommended - 161 logical cores (above scale)") &&
    !lowSvg.includes("NaN") &&
    !lowSvg.includes("undefined"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  lowError ? "Runtime error: " + lowError.message : "Low-utilization case renders without dropping the chart."
);

check(
  "CPU_LOW_UTILIZATION_AXIS_REMAINS_READABLE",
  !!lowSvg &&
    !lowSvg.includes(">160<") &&
    !lowSvg.includes(">188<"),
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Low-utilization chart should not display a huge axis scale that crushes the demand curve."
);

check(
  "CPU_RAM_LOAD_READABLE_SCALE_VERSION",
  cpuHtml.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-013-cpu-scale-callout") &&
    ramHtml.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-013-cpu-scale-callout"),
  "tools/compute/cpu-sizing/index.html; tools/compute/ram-sizing/index.html",
  "CPU/RAM pages should load the shared readable-scale capacity visual version."
);

check(
  "MODULE_MAP_RECORDS_READABLE_SCALE_AUDIT",
  moduleMap.includes("### Compute CPU capacity readable scale") &&
    moduleMap.includes("audit-compute-cpu-capacity-envelope-scale-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document the shared visual scale fix and audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
