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

const marker = "compute-shell-storage-throughput-active-workflow-singleton-0709";
const markerAt = shell.indexOf(marker);
const singletonBlock = markerAt >= 0 ? shell.slice(markerAt) : "";

check(
  "STORAGE_THTORAGE_THROUGHPUT_ACTIVE_WORKFLOW_MODULE_MAP",
  moduleMap.includes("COMPUTE_STORAGE_THROUGHPUT_ACTIVE_WORKFLOW_SINGLETON_0709"),
  "Module map should document the Storage Throughput Active Workflow singleton guard."
);

console.log("");
console.log("Storage Throughput Active Workflow singleton audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
