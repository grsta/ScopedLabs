#!/usr/bin/env node

/*
  ScopedLabs Access Control Main Gates - 0610

  Runs the Access Control category checkpoint gates from repo root.

  Current manual checkpoint gates:
  1. audit-access-control-factory-debt-v1.js
  2. audit-access-control-preview-print-mode-map-0610.js

  Notes:
  - This is intentionally category-local for Access Control.
  - It does not patch pages.
  - It forwards CLI args such as --summary-only to each child audit.
*/

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = process.cwd();

const gates = [
  {
    label: "Access Control factory debt audit",
    script: path.join("scripts", "audit-access-control-factory-debt-v1.js"),
  },
  {
    label: "Access Control preview/print mode map audit",
    script: path.join("scripts", "audit-access-control-preview-print-mode-map-0610.js"),
  },
];

const forwardedArgs = process.argv.slice(2);

function printHeader(title) {
  console.log("");
  console.log("=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

function runGate(gate) {
  const scriptPath = path.join(repoRoot, gate.script);

  if (!fs.existsSync(scriptPath)) {
    console.error(`[FAIL] Missing gate script: ${gate.script}`);
    return {
      label: gate.label,
      script: gate.script,
      status: "FAIL",
      code: 1,
    };
  }

  printHeader(gate.label);

  const result = spawnSync(
    process.execPath,
    [scriptPath, ...forwardedArgs],
    {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    }
  );

  const code = typeof result.status === "number" ? result.status : 1;

  return {
    label: gate.label,
    script: gate.script,
    status: code === 0 ? "PASS" : "FAIL",
    code,
  };
}

console.log("ScopedLabs Access Control Main Gates - 0610");
console.log(`Repo root: ${repoRoot}`);

const results = gates.map(runGate);
const failed = results.filter((result) => result.status !== "PASS");

printHeader("Access Control main gate summary");

for (const result of results) {
  console.log(`${result.status.padEnd(4)}  ${result.label}  (${result.script})`);
}

if (failed.length) {
  console.error("");
  console.error(`[FAIL] ${failed.length} Access Control gate(s) failed.`);
  process.exit(1);
}

console.log("");
console.log("[PASS] Access Control main gates passed.");