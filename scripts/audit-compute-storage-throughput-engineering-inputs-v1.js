const fs = require("fs");
const path = require("path");

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "script.js"), "utf8");
const ledger = fs.readFileSync(path.join(root, "docs", "compute-planner-update-ledger.md"), "utf8");
const map = fs.readFileSync(path.join(root, "docs", "scopedlabs-module-map.md"), "utf8");

let pass = 0;
let fail = 0;

function check(label, ok) {
  if (ok) {
    pass += 1;
    console.log("[PASS] " + label);
  } else {
    fail += 1;
    console.log("[FAIL] " + label);
  }
}

check("STORAGE_THROUGHPUT_ENGINEERING_INPUTS_PRESENT", [
  'data-storage-throughput-engineering-inputs="0705"',
  'id="availableMBps"',
  'id="peakMultiplier"',
  'id="growthPct"',
  'id="datasetTB"',
  'id="transferWindowHours"',
  'id="transportPath"',
  'id="mediaTier"',
  'id="workloadType"'
].every((token) => html.includes(token)));

check("STORAGE_THROUGHPUT_SCRIPT_CACHE_BUST_UPDATED", html.includes("./script.js?v=compute-storage-throughput-engineering-brain-0705"));

check("STORAGE_THROUGHPUT_ENGINEERING_BRAIN_PRESENT", [
  "requiredThroughputMBps",
  "availableThroughputMBps",
  "throughputUtilizationPct",
  "transferWindowRequiredMBps",
  "headroomMBps",
  "deficitMBps",
  "transportPathLabel",
  "mediaTierLabel",
  "workloadTypeLabel",
  "flowPayload"
].every((token) => js.includes(token)));

check("STORAGE_THROUGHPUT_RESET_AND_INVALIDATION_PRESENT", [
  "els.availableMBps.value = 1000",
  "els.peakMultiplier.value = 1.25",
  "els.growthPct.value = 20",
  "els.datasetTB.value = 2",
  "els.transferWindowHours.value = 4",
  '"availableMBps"',
  '"workloadType"'
].every((token) => js.includes(token)));

check("STORAGE_THROUGHPUT_CARRY_FORWARD_WRITTEN", js.includes("ScopedLabsAnalyzer.writeFlow") && js.includes("saveComputeLedgerResult") && js.includes("outputs: flowPayload"));

check("STORAGE_THROUGHPUT_PLANNER_LEDGER_UPDATED", ledger.includes("requiredThroughputMBps, availableThroughputMBps, throughputUtilizationPct") && ledger.includes("transferWindowRequiredMBps") && ledger.includes("Contributes after valid result"));

check("STORAGE_THROUGHPUT_MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_ENGINEERING_INPUTS_0705"));

console.log("");
console.log("Storage Throughput engineering input audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
