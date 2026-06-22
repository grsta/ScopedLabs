#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const scriptFile = "tools/compute/gpu-vram/script.js";
const html = fs.readFileSync(path.join(root, htmlFile), "utf8");
const script = fs.readFileSync(path.join(root, scriptFile), "utf8");

const checks = [];

function check(code, pass, detail) {
  checks.push({ code, pass, detail });
}

function findDivBlockById(text, id) {
  const idNeedle = 'id="' + id + '"';
  const idIdx = text.indexOf(idNeedle);
  if (idIdx === -1) return "";

  const start = text.lastIndexOf("<div", idIdx);
  if (start === -1) return "";

  let cursor = start;
  let depth = 0;

  while (cursor < text.length) {
    const nextOpen = text.indexOf("<div", cursor);
    const nextClose = text.indexOf("</div>", cursor);

    if (nextClose === -1) return "";

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + 4;
      continue;
    }

    depth -= 1;
    cursor = nextClose + "</div>".length;

    if (depth === 0) return text.slice(start, cursor);
  }

  return "";
}

function countToken(text, token) {
  let count = 0;
  let cursor = 0;

  while (cursor < text.length) {
    const idx = text.indexOf(token, cursor);
    if (idx === -1) return count;
    count += 1;
    cursor = idx + token.length;
  }

  return count;
}

const ledgerBlock = findDivBlockById(html, "computeInternalResultsLedger");
const resultsBlock = findDivBlockById(html, "results");
const analysisBlock = findDivBlockById(html, "analysis-copy");

const ledgerIndex = html.indexOf('id="computeInternalResultsLedger"');
const resultsIndex = html.indexOf('id="results"');
const analysisIndex = html.indexOf('id="analysis-copy"');
const assistantIndex = html.indexOf('id="computeAssistantCard"');

check(
  "GPU_LEGACY_RESULTS_LEDGER_LEDGER_BLOCK_HIDDEN",
  ledgerBlock.includes("hidden") &&
    ledgerBlock.includes('aria-hidden="true"') &&
    ledgerBlock.includes('style="display:none;"') &&
    ledgerBlock.includes("data-internal-results-ledger") &&
    ledgerBlock.includes('data-compute-ledger-payload="gpu-vram"'),
  "GPU internal results ledger should remain hidden and marked as the source payload owner."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_RESULTS_SOURCE_HIDDEN",
  resultsBlock.includes('data-compute-legacy-results-source="true"') &&
    resultsBlock.includes('data-compute-ledger-source="true"') &&
    resultsBlock.includes("hidden") &&
    resultsBlock.includes('aria-hidden="true"') &&
    resultsBlock.includes('aria-live="off"'),
  "GPU legacy visible results should be hidden while remaining available as a source element."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_ANALYSIS_SOURCE_HIDDEN",
  analysisBlock.includes('data-compute-legacy-analysis-source="true"') &&
    analysisBlock.includes("hidden") &&
    analysisBlock.includes('aria-hidden="true"') &&
    analysisBlock.includes('style="display:none;"'),
  "GPU legacy analysis/interpretion source should remain hidden."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_ORDER_PRESERVED",
  ledgerIndex !== -1 &&
    resultsIndex !== -1 &&
    analysisIndex !== -1 &&
    assistantIndex !== -1 &&
    ledgerIndex < resultsIndex &&
    resultsIndex < analysisIndex &&
    analysisIndex < assistantIndex,
  "GPU should preserve ledger -> hidden result source -> hidden analysis source -> assistant order."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_STYLE_TOKEN_PRESENT",
  html.includes('id="compute-gpu-legacy-results-ledger-parity-0622"') &&
    html.includes("display: none !important"),
  "GPU page should include scoped CSS forcing legacy source blocks to stay hidden."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_SCRIPT_VERSION_BUMPED",
  html.includes("compute-gpu-vram-legacy-results-ledger-parity-0622"),
  "GPU script cache bust should identify the legacy results ledger parity lane."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_SCRIPT_HELPER_PRESENT",
  script.includes("function hideLegacyResultsSource()") &&
    script.includes('data-compute-legacy-results-source') &&
    script.includes('data-compute-legacy-analysis-source'),
  "GPU script should include a helper that keeps legacy result/analysis sources hidden."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_SCRIPT_HELPER_CALLED",
  countToken(script, "hideLegacyResultsSource();") >= 3,
  "GPU script should call the hidden-source helper during invalidate, renderShellProof, and clearShellProof paths."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_RENDER_LEDGER_STILL_WRITES_PAYLOAD",
  script.includes("function renderLedger(plan)") &&
    script.includes("mount.hidden = true") &&
    script.includes("JSON.stringify") &&
    script.includes("requiredVramGb") &&
    script.includes("usableVramGb") &&
    script.includes("capacityPressure"),
  "GPU renderLedger should still write the hidden structured payload needed by downstream/report logic."
);

check(
  "GPU_LEGACY_RESULTS_LEDGER_CARRYOVER_TOKENS_PRESERVED",
  script.includes("saveComputeLedgerResult") &&
    script.includes("ScopedLabsComputePlanState") &&
    script.includes("ScopedLabsAnalyzer.writeFlow") &&
    script.includes("scopedlabs.compute.gpu-vram.engineeringPlan"),
  "GPU carryover/session/ledger tokens should remain present."
);

let pass = 0;
let fail = 0;

console.log("SCOPEDLABS COMPUTE GPU VRAM LEGACY RESULTS LEDGER PARITY AUDIT V1\n");

for (const item of checks) {
  if (item.pass) pass += 1;
  else fail += 1;

  console.log("[" + (item.pass ? "PASS" : "FAIL") + "] " + item.code);
  console.log("  " + (item.code.includes("SCRIPT") || item.code.includes("CARRYOVER") ? scriptFile : htmlFile));
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

if (fail) process.exit(1);
