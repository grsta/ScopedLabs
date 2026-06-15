const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  js: path.join(root, "tools", "compute", "cpu-sizing", "script.js")
};

let pass = 0;
let fail = 0;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function result(kind, label, detail) {
  kind = String(kind || "FAIL").toUpperCase();
  if (kind === "PASS") pass++;
  if (kind === "FAIL") fail++;
  console.log(kind.padEnd(6), label);
  if (detail) console.log("       " + detail);
}

const html = read(files.html);
const js = read(files.js);

console.log("ScopedLabs Compute CPU V2 Capacity Factors Audit V1");
console.log("Repo:", root);
console.log("");

const oldIds = [
  "workload",
  "concurrency",
  "cpuPerWorker",
  "peak",
  "targetUtil",
  "smt",
  "calc",
  "reset",
  "computeCpuStatusCard",
  "computeCpuVisual",
  "exportReport",
  "saveSnapshot"
];

const newIds = [
  "workloadPattern",
  "growthReserve",
  "platformOverhead",
  "osReserve",
  "coreEfficiency",
  "sustainedDerate",
  "failoverMultiplier"
];

for (const id of oldIds) {
  result(html.includes('id="' + id + '"') ? "PASS" : "FAIL", "preserved HTML id: " + id);
}

for (const id of newIds) {
  result(html.includes('id="' + id + '"') ? "PASS" : "FAIL", "new CPU V2 input id: " + id);
  result(js.includes(id + ": $(") || js.includes('"' + id + '"') ? "PASS" : "FAIL", "script references CPU V2 input: " + id);
}

for (const token of [
  "cpuCapacityClamp",
  "cpuWorkloadPatternFactor",
  "baseDemand",
  "patternDemand",
  "growthDemand",
  "platformDemand",
  "reserveDemand",
  "failoverDemand",
  "coreEfficiencyRatio",
  "sustainedRatio",
  "planningReservePressure",
  "Planning Reserve",
  "Reserve / platform overhead",
  "baseDemandCores",
  "demandAfterPatternCores",
  "demandAfterGrowthCores",
  "demandAfterPlatformReserveCores",
  "demandAfterOsReserveCores",
  "demandAfterFailoverCores",
  "growthReservePercent",
  "platformOverheadPercent",
  "osReservePercent",
  "coreEfficiencyPercent",
  "sustainedDeratePercent",
  "failoverMultiplier"
]) {
  result(js.includes(token) ? "PASS" : "FAIL", "CPU V2 calculation token: " + token);
}

for (const token of [
  "ScopedLabsAnalyzer.writeFlow",
  "saveCpuResultToWorkload(cpuPipelineResult)",
  "renderWorkloadContext()",
  "renderComputeAssistant(cpuPipelineResult)",
  "renderComputeCpuVisual(cpuPipelineResult)",
  "showContinue()",
  "window.ScopedLabsExport.refresh"
]) {
  result(js.includes(token) ? "PASS" : "FAIL", "preserved CPU flow token: " + token);
}

result(html.includes("script.js?v=compute-cpu-v2-capacity-factors-0614b") ? "PASS" : "FAIL", "CPU script cache bust updated");

console.log("");
console.log("========================================================================");
console.log("SUMMARY");
console.log("========================================================================");
console.log("PASS :", pass);
console.log("FAIL :", fail);

if (fail) {
  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("");
console.log("OVERALL: PASS");
