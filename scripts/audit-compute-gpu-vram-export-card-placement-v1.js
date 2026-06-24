const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const moduleMapFile = "docs/scopedlabs-module-map.md";
const ledgerFile = "docs/scopedlabs-pattern-promotion-ledger.md";

const html = fs.readFileSync(path.join(root, htmlFile), "utf8");
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

function count(needle) {
  return html.split(needle).length - 1;
}

const resetIndex = html.indexOf('id="reset"');
const exportCardIndex = html.indexOf("compute-export-card");
const ledgerIndex = html.indexOf('id="computeInternalResultsLedger"');
const flowIndex = html.indexOf("compute-flow-actions");
const exportCardEnd = html.indexOf("</section>", exportCardIndex);
const exportCardBlock = exportCardIndex === -1 || exportCardEnd === -1 ? "" : html.slice(exportCardIndex, exportCardEnd);

check(
  "GPU_EXPORT_CARD_SINGLE_OWNER",
  count("compute-export-card") === 1 &&
    count('id="exportStatus"') === 1 &&
    count('id="exportReport"') === 1 &&
    count('id="saveSnapshot"') === 1,
  "GPU should have one export card, one export status, one export button, and one snapshot button."
);

check(
  "GPU_EXPORT_CARD_AFTER_RESET",
  resetIndex !== -1 &&
    exportCardIndex !== -1 &&
    resetIndex < exportCardIndex,
  "GPU export card should sit after the Calculate/Reset button row."
);

check(
  "GPU_EXPORT_CARD_BEFORE_RESULTS_STACK",
  exportCardIndex !== -1 &&
    ledgerIndex !== -1 &&
    exportCardIndex < ledgerIndex,
  "GPU export card should be inside the Planning Inputs card before internal ledger/results/proof sections."
);

check(
  "GPU_EXPORT_CARD_BEFORE_FLOW_CTA",
  exportCardIndex !== -1 &&
    flowIndex !== -1 &&
    exportCardIndex < flowIndex,
  "GPU export card should appear before the flow CTA, not beside the footer/summary CTA."
);

check(
  "GPU_EXPORT_STATUS_AND_NOTES_INSIDE_CARD",
  exportCardBlock.includes('id="exportStatus"') &&
    exportCardBlock.includes("scopedlabs-user-tool-notes-inline") &&
    exportCardBlock.includes("data-scopedlabs-user-tool-notes"),
  "GPU export status and User Tool Notes should remain inside the Export Report card."
);

check(
  "GPU_EXPORT_CARD_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_EXPORT_CARD_PLACEMENT_0624L") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-export-card-placement-v1.js"),
  "Module map should document the GPU export card placement lane.",
  moduleMapFile
);

check(
  "GPU_EXPORT_CARD_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-EXPORT-CARD-PLACEMENT-0624L") &&
    ledger.includes("scripts/audit-compute-gpu-vram-export-card-placement-v1.js"),
  "Pattern promotion ledger should record the GPU export card placement lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM EXPORT CARD PLACEMENT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
