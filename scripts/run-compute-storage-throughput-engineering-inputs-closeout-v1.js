const { spawnSync } = require("child_process");

const checks = [
  {
    label: "Storage Throughput script syntax",
    command: "node",
    args: ["--check", ".\\tools\\compute\\storage-throughput\\script.js"]
  },
  {
    label: "Storage Throughput engineering inputs audit",
    command: "node",
    args: [".\\scripts\\audit-compute-storage-throughput-engineering-inputs-v1.js"]
  },
  {
    label: "ScopedLabs module map audit",
    command: "node",
    args: [".\\scripts\\audit-scopedlabs-module-map-v1.js"]
  }
];

let pass = 0;
let fail = 0;

for (const check of checks) {
  console.log("");
  console.log("=== " + check.label + " ===");

  const result = spawnSync(check.command, check.args, {
    stdio: "inherit",
    shell: true
  });

  if (result.status === 0) {
    pass += 1;
    console.log("[PASS] " + check.label);
  } else {
    fail += 1;
    console.log("[FAIL] " + check.label);
  }
}

console.log("");
console.log("Storage Throughput engineering inputs closeout");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);

if (fail) process.exit(1);
