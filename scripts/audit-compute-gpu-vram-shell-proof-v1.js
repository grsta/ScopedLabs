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
  console.log("SCOPEDLABS COMPUTE GPU VRAM SHELL PROOF AUDIT V1");
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

[
  "data-compute-tool-shell",
  "data-sl-square-ctas",
  "scopedlabs-tool-shell",
  "data-internal-results-ledger",
  "data-compute-assistant-card",
  "data-compute-assistant-mount",
  "data-compute-result-visual-card",
  "data-compute-recommendation-references-card",
  "data-compute-recommended-actions-card",
  "data-compute-decision-schedule-card",
  "data-scopedlabs-user-tool-notes-card",
  "data-scopedlabs-user-tool-notes",
  "data-compute-flow-actions",
  "id=\"reportMetadataMount\""
].forEach((token) => {
  check(
    results,
    html.includes(token),
    `GPU_SHELL_HTML_TOKEN_${token.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`,
    files.html,
    `GPU shell proof should include HTML token: ${token}.`
  );
});

[
  "/assets/scopedlabs-report-metadata.js",
  "/assets/scopedlabs-tool-shell.js",
  "/assets/scopedlabs-assistant-export.js",
  "/assets/scopedlabs-compute-capacity-visuals.js",
  "/assets/scopedlabs-local-assistant.js",
  "/assets/scopedlabs-compute-assistant-contract.js",
  "/assets/scopedlabs-user-tool-notes.js",
  "/assets/scopedlabs-compute-shell-contract.js"
].forEach((token) => {
  check(
    results,
    html.includes(token),
    `GPU_SHELL_SCRIPT_${token.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`,
    files.html,
    `GPU should load shared shell/module script: ${token}.`
  );
});

[
  "ScopedLabsComputeGpuVramShellProof",
  "renderShellProof",
  "renderAssistant",
  "renderReferences",
  "renderActions",
  "renderSchedule",
  "computeInternalResultsLedger"
].forEach((token) => {
  check(
    results,
    js.includes(token),
    `GPU_SHELL_JS_TOKEN_${token.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`,
    files.js,
    `GPU script should include shell proof bridge token: ${token}.`
  );
});

check(
  results,
  moduleMap.includes("COMPUTE_GPU_VRAM_SHELL_PROOF_V1"),
  "MODULE_MAP_RECORDS_GPU_SHELL_PROOF",
  files.moduleMap,
  "Module map should record the GPU VRAM shell proof lane."
);

print(results);
