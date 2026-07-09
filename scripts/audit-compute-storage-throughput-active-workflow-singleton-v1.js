const fs = require("fs");

const shell = fs.readFileSync("assets/scopedlabs-compute-shell-contract.js", "utf8");
const html = fs.readFileSync("tools/compute/storage-throughput/index.html", "utf8");
const moduleMap = fs.readFileSync("docs/scopedlabs-module-map.md", "utf8");

let pass = 0;
let fail = 0;

function check(label, ok, message) {
  if (ok) {
    pass += 1;
    console.log("[PASS] " + label + " - " + message);
  } else {
    fail += 1;
    console.log("[FAIL] " + label + " - " + message);
  }
}

const strictMarker = "compute-shell-storage-throughput-active-workflow-strict-singleton-0709b";
const strictAt = shell.indexOf(strictMarker);
const strictBlock = strictAt >= 0 ? shell.slice(strictAt) : "";

check(
  "STORAGE_THROUGHPUT_ACTIVE_WORKFLOW_LEGACY_0705_DISABLED",
  shell.includes("storage-throughput-active-workflow-0709b: legacy 0705 renderer disabled") &&
    !/^\s*placeStorageThroughputWorkflowCard\(\);/m.test(shell),
  "Legacy 0705 Storage Throughput Active Workflow renderer should not create a second card."
);

check(
  "STORAGE_THROUGHPUT_ACTIVE_WORKFLOW_STRICT_SINGLETON",
  shell.includes(strictMarker) &&
    shell.includes("strictDedupeStorageThroughputWorkflowCards") &&
    shell.includes("collectStorageThroughputWorkflowCards") &&
    shell.includes("scoreWorkflowCard") &&
    shell.includes('data-storage-throughput-active-workflow-strict-singleton", "0709b"') &&
    html.includes("/assets/scopedlabs-compute-shell-contract.js?v=compute-shell-storage-throughput-active-workflow-strict-singleton-0709b"),
  "Storage Throughput should enforce one Active Workflow card after older render paths run."
);

check(
  "STORAGE_THROUGHPUT_ACTIVE_WORKFLOW_NO_OBSERVER_RECURSION",
  strictBlock && !strictBlock.includes("MutationObserver"),
  "Strict singleton guard should avoid MutationObserver recursion."
);

check(
  "STORAGE_THROUGHPUT_ACTIVE_WORKFLOW_MODULE_MAP",
  moduleMap.includes("COMPUTE_STORAGE_THROUGHPUT_ACTIVE_WORKFLOW_STRICT_SINGLETON_0709B"),
  "Module map should document the strict singleton guard."
);

console.log("");
console.log("Storage Throughput Active Workflow singleton audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
