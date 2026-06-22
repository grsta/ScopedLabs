#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function check(results, ok, label, detail) {
  results.push({ ok, label, detail: detail || "" });
}

function indexOfOrMinus(source, value) {
  const idx = source.indexOf(value);
  return idx === -1 ? -1 : idx;
}

const results = [];

const moduleFile = "assets/scopedlabs-compute-capacity-visuals.js";
const cpuIndexFile = "tools/compute/cpu-sizing/index.html";
const cpuScriptFile = "tools/compute/cpu-sizing/script.js";
const ramIndexFile = "tools/compute/ram-sizing/index.html";
const ramScriptFile = "tools/compute/ram-sizing/script.js";

const moduleSrc = read(moduleFile);
const cpuIndex = read(cpuIndexFile);
const cpuScriptSrc = read(cpuScriptFile);
const ramIndex = read(ramIndexFile);
const ramScriptSrc = read(ramScriptFile);

[
  "buildCapacityEnvelopeSvg",
  "buildCpuCapacityEnvelopeSvg",
  "renderCpuCapacityEnvelope",
  "buildRamCapacityEnvelopeSvg",
  "renderRamCapacityEnvelope",
  "clear"
].forEach((name) => {
  check(results, moduleSrc.includes(name), "MODULE_EXPORT_" + name, moduleFile);
});

check(results, moduleSrc.includes("scopedlabs-compute-capacity-visuals-016-ram-footer-cleanup"), "MODULE_VERSION_003_CPU_RAM_ENVELOPE", moduleFile);
check(results, moduleSrc.includes("data-compute-visual=\"cpu-capacity-envelope\""), "MODULE_OWNS_CPU_CAPACITY_SVG", moduleFile);
check(results, moduleSrc.includes("data-compute-capacity-visual=\"ram-envelope\""), "MODULE_OWNS_RAM_CAPACITY_SVG", moduleFile);

check(
  results,
  !moduleSrc.includes("RAM planning checkpoints") &&
    !moduleSrc.includes("legend-text legend-current") &&
    !moduleSrc.includes("legend-text legend-growth") &&
    !moduleSrc.includes("legend-text legend-failover"),
  "RAM_SHARED_VISUAL_REMOVES_OLD_FOOTER_CHECKPOINT_LABELS",
  moduleFile
);

const cpuModuleIdx = indexOfOrMinus(cpuIndex, "/assets/scopedlabs-compute-capacity-visuals.js");
const cpuScriptIdx = indexOfOrMinus(cpuIndex, "./script.js");
check(results, cpuModuleIdx !== -1, "CPU_INDEX_LOADS_SHARED_CAPACITY_MODULE", cpuIndexFile);
check(results, cpuModuleIdx !== -1 && cpuScriptIdx !== -1 && cpuModuleIdx < cpuScriptIdx, "CPU_MODULE_LOADS_BEFORE_PAGE_SCRIPT", cpuIndexFile);
check(results, cpuScriptSrc.includes("ScopedLabsComputeCapacityVisuals.buildCpuCapacityEnvelopeSvg"), "CPU_SCRIPT_DELEGATES_TO_SHARED_CPU_BUILDER", cpuScriptFile);
check(results, !cpuScriptSrc.includes("data-compute-visual=\"cpu-capacity-envelope\""), "CPU_SCRIPT_HAS_NO_LOCAL_CPU_CAPACITY_SVG", cpuScriptFile);
check(results, cpuScriptSrc.includes("window.ScopedLabsComputeCpuExport"), "CPU_CUSTOM_EXPORT_ROUTE_STILL_PRESENT", cpuScriptFile);
check(results, cpuIndex.includes('href="/tools/compute/ram-sizing/"'), "CPU_CONTINUE_ROUTE_STILL_RAM", cpuIndexFile);

check(
  results,
  ramIndex.includes("/assets/scopedlabs-compute-capacity-visuals.js?v=" + "scopedlabs-compute-capacity-visuals-016-ram-footer-cleanup"),
  "RAM_INDEX_LOADS_VERSIONED_SHARED_CAPACITY_MODULE",
  ramIndexFile
);
check(results, ramScriptSrc.includes("ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope"), "RAM_SCRIPT_USES_SHARED_RAM_RENDERER", ramScriptFile);
check(results, ramScriptSrc.includes("capacityEnvelope: ramCapacityEnvelope"), "RAM_FLOW_PAYLOAD_INCLUDES_CAPACITY_ENVELOPE", ramScriptFile);
check(results, ramScriptSrc.includes('window.location.href = "/tools/compute/storage-iops/"'), "RAM_CONTINUE_ROUTE_STILL_STORAGE_IOPS", ramScriptFile);

let fail = 0;
console.log("SCOPEDLABS COMPUTE CAPACITY ENVELOPE SHARED CONTRACT AUDIT V1");
console.log("");
results.forEach((item) => {
  if (!item.ok) fail += 1;
  console.log("[" + (item.ok ? "PASS" : "FAIL") + "] " + item.label);
  if (item.detail) console.log("  " + item.detail);
});
console.log("");
console.log("SUMMARY");
console.log("PASS: " + (results.length - fail));
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

if (fail) process.exitCode = 1;
