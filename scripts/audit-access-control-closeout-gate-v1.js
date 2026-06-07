const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();

const requiredAudits = [
  "scripts/audit-access-control-tool-factory-contract-v1.js",
  "scripts/audit-access-control-output-shell-contract-v1.js",
  "scripts/audit-access-control-pipeline-specialty-branches-v1.js",
  "scripts/audit-access-control-modern-visual-contract-v1.js",
  "scripts/audit-access-control-visual-fit-seatbelts-v1.js",
  "scripts/audit-access-control-module-seatbelts-v1.js",
  "scripts/audit-access-control-special-locking-module-v1.js",
  "scripts/audit-access-control-elevator-reader-module-v1.js",
  "scripts/audit-access-control-anti-passback-module-v1.js",
  "scripts/audit-access-control-category-completion-map-v1.js"
];

const optionalAudits = [
  "scripts/audit-access-control-export-ownership-v1.js",
  "scripts/audit-access-control-export-card-polish-v1.js"
];

let failed = false;

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function runAudit(rel, required) {
  if (!exists(rel)) {
    const label = required ? "MISSING REQUIRED" : "SKIP OPTIONAL";
    console.log("\n--- " + label + ": " + rel + " ---");
    if (required) failed = true;
    return;
  }

  console.log("\n--- RUNNING: " + rel + " ---");

  const result = spawnSync(process.execPath, [rel], {
    cwd: root,
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    console.log("\nFAIL: " + rel);
    failed = true;
  }
}

console.log("\nAccess Control closeout gate:");
console.log("- Required audits: " + requiredAudits.length);
console.log("- Optional audits: " + optionalAudits.length);

requiredAudits.forEach((rel) => runAudit(rel, true));
optionalAudits.forEach((rel) => runAudit(rel, false));

console.log("\n--- RUNNING: git diff --check ---");
const diff = spawnSync("git", ["diff", "--check"], {
  cwd: root,
  stdio: "inherit",
  shell: true
});

if (diff.status !== 0) {
  console.log("\nFAIL: git diff --check");
  failed = true;
}

console.log("\nAccess Control closeout gate summary:");
console.log(failed ? "- FAIL" : "- SAFE");

if (failed) process.exit(1);
