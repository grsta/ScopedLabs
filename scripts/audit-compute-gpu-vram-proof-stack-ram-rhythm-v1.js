const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const scriptFile = "tools/compute/gpu-vram/script.js";
const moduleMapFile = "docs/scopedlabs-module-map.md";
const ledgerFile = "docs/scopedlabs-pattern-promotion-ledger.md";

const html = fs.readFileSync(path.join(root, htmlFile), "utf8");
const script = fs.readFileSync(path.join(root, scriptFile), "utf8");
const moduleMap = fs.readFileSync(path.join(root, moduleMapFile), "utf8");
const ledger = fs.readFileSync(path.join(root, ledgerFile), "utf8");

let pass = 0;
let fail = 0;

function check(code, condition, message, file = htmlFile) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + code);
  } else {
    fail += 1;
    console.log("[FAIL] " + code);
    console.log("  " + file);
    console.log("  " + message);
  }
}

function functionBlock(source, functionName) {
  const header = "  function " + functionName + "(";
  const start = source.indexOf(header);
  if (start === -1) return "";

  const openBrace = source.indexOf("{", start);
  if (openBrace === -1) return "";

  let depth = 0;
  let cursor = openBrace;

  while (cursor < source.length) {
    const ch = source[cursor];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, cursor + 1);
    }
    cursor += 1;
  }

  return "";
}

const renderActions = functionBlock(script, "renderActions");
const renderSchedule = functionBlock(script, "renderSchedule");

check(
  "GPU_PROOF_STACK_RAM_RHYTHM_STYLE_PRESENT",
  html.includes('id="compute-gpu-proof-cards-ram-rhythm-0624h"') &&
    html.includes(".compute-gpu-proof-action") &&
    html.includes(".compute-gpu-decision-summary") &&
    html.includes(".compute-gpu-decision-table"),
  "GPU RAM-rhythm proof-card style block should be present."
);

check(
  "GPU_PROOF_STACK_ACTIONS_USE_RAM_CARD_ROWS",
  renderActions.includes("compute-gpu-proof-actions-list") &&
    renderActions.includes("compute-gpu-proof-action") &&
    renderActions.includes("<strong>") &&
    renderActions.includes("<span>") &&
    !renderActions.includes("<ol>"),
  "GPU Recommended Actions should render RAM-style action rows, not a raw ordered list.",
  scriptFile
);

check(
  "GPU_PROOF_STACK_DECISION_USES_RAM_TABLE",
  renderSchedule.includes("compute-gpu-decision-summary") &&
    renderSchedule.includes("compute-gpu-decision-table") &&
    renderSchedule.includes("<thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead>") &&
    renderSchedule.includes("Capacity pressure") &&
    renderSchedule.includes("Watch begins at 70% of usable VRAM"),
  "GPU Decision Schedule should render a RAM-style summary block plus structured decision table.",
  scriptFile
);

check(
  "GPU_PROOF_STACK_RAM_RHYTHM_SCRIPT_VERSION",
  html.includes('./script.js?v=compute-gpu-vram-export-dynamic-placement-0624m'),
  "GPU local script version should be bumped for RAM-rhythm proof cards."
);

check(
  "GPU_PROOF_STACK_RAM_RHYTHM_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROOF_STACK_RAM_RHYTHM_0624H") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js"),
  "Module map should document the RAM-rhythm proof-stack lane.",
  moduleMapFile
);

check(
  "GPU_PROOF_STACK_RAM_RHYTHM_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-PROOF-STACK-RAM-RHYTHM-0624H") &&
    ledger.includes("scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js"),
  "Pattern promotion ledger should record the RAM-rhythm proof-stack lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROOF STACK RAM RHYTHM AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
