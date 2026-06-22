#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: "tools/compute/gpu-vram/index.html",
  js: "tools/compute/gpu-vram/script.js",
  moduleMap: "docs/scopedlabs-module-map.md"
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function check(results, pass, code, file, detail) {
  results.push({ pass, code, file, detail });
}

function print(results) {
  console.log("SCOPEDLABS COMPUTE GPU VRAM ENGINEERING INPUTS AUDIT V1");
  console.log("");

  let pass = 0;
  let fail = 0;

  for (const result of results) {
    if (result.pass) pass += 1;
    else fail += 1;

    console.log(`[${result.pass ? "PASS" : "FAIL"}] ${result.code}`);
    console.log(`  ${result.file}`);
    console.log(`  ${result.detail}`);
  }

  console.log("");
  console.log("SUMMARY");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log(`OVERALL: ${fail ? "FAIL" : "PASS"}`);

  if (fail) process.exit(1);
}

const html = read(files.html);
const js = read(files.js);
const moduleMap = read(files.moduleMap);
const results = [];

const requiredInputIds = [
  "installedVramGb",
  "targetUtilization",
  "displayReserveGb",
  "precisionMode",
  "parallelismMode",
  "replicaCount",
  "growthReserve",
  "kvCacheGb",
  "checkpointReserveGb",
  "failoverMultiplier",
  "gpuSharingMode"
];

for (const id of requiredInputIds) {
  check(
    results,
    html.includes(`id="${id}"`) || html.includes(`id='${id}'`) || js.includes(`"${id}"`),
    `GPU_ENGINEERING_INPUT_PRESENT_${id.toUpperCase()}`,
    files.html,
    `GPU engineering input should exist and be addressable: ${id}.`
  );
}

check(
  results,
  html.includes("Planning Inputs") && html.includes("GPU VRAM engineering factors"),
  "GPU_PLANNING_INPUTS_SECTION_PRESENT",
  files.html,
  "GPU should expose an engineering-style Planning Inputs section, not only the older bare calculator inputs."
);

check(
  results,
  html.includes("computeGpuEngineeringSummary") && html.includes("computeGpuEnvelope"),
  "GPU_ENGINEERING_OUTPUT_MOUNTS_PRESENT",
  files.html,
  "GPU should render engineering summary and capacity envelope mounts below the normal result text."
);

check(
  results,
  html.includes('data-export-title="GPU VRAM Engineering Summary"') && html.includes('data-export-title="GPU VRAM Capacity Envelope"'),
  "GPU_ENGINEERING_OUTPUTS_EXPORT_READY",
  files.html,
  "GPU engineering summary and capacity envelope should be export-section ready."
);

[
  "ScopedLabsComputeGpuVramEngineeringInputs",
  "readGpuEngineeringInputs",
  "buildGpuEngineeringPlan",
  "precisionMultiplier",
  "modelCopyFactor",
  "sharingPenalty",
  "requiredVramGb",
  "usableVramGb",
  "capacityPressure",
  "scopedlabs.compute.gpu-vram.engineeringPlan"
].forEach((token) => {
  check(
    results,
    js.includes(token),
    `GPU_ENGINEERING_JS_TOKEN_${token.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`,
    files.js,
    `GPU script should include engineering calculation token: ${token}.`
  );
});

check(
  results,
  moduleMap.includes("COMPUTE_GPU_VRAM_ENGINEERING_INPUTS_V1"),
  "MODULE_MAP_RECORDS_GPU_ENGINEERING_INPUTS",
  files.moduleMap,
  "Module map should record GPU VRAM engineering input proof and current scope."
);

print(results);
