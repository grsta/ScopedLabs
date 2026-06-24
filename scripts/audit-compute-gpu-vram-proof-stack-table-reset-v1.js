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

check(
  "GPU_PROOF_STACK_TABLE_RESET_STYLE_PRESENT",
  html.includes('id="compute-gpu-proof-stack-table-reset-0624i"') &&
    html.includes("table.compute-gpu-decision-table") &&
    html.includes("display: table !important") &&
    html.includes("display: table-row !important") &&
    html.includes("display: table-cell !important"),
  "GPU decision schedule should reset the earlier grid/block proof-card styles back to table semantics for desktop."
);

check(
  "GPU_PROOF_STACK_TABLE_RESET_COLUMN_WIDTHS",
  html.includes("tbody td:first-child") &&
    html.includes("width: 15%") &&
    html.includes("tbody td:nth-child(2)") &&
    html.includes("width: 19%") &&
    html.includes("tbody td:nth-child(3)") &&
    html.includes("width: 18%") &&
    html.includes("tbody td:nth-child(4)") &&
    html.includes("width: 48%"),
  "GPU decision schedule should use RAM-style table column proportions."
);

check(
  "GPU_PROOF_STACK_TABLE_RESET_RESPONSIVE_FALLBACK",
  html.includes("@media (max-width: 760px)") &&
    html.includes("display: block !important") &&
    html.includes("display: none !important") &&
    html.includes("white-space: normal !important"),
  "GPU decision schedule table reset should preserve mobile stacked fallback."
);

check(
  "GPU_PROOF_STACK_TABLE_RESET_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROOF_STACK_TABLE_RESET_0624I") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-proof-stack-table-reset-v1.js"),
  "Module map should document the GPU proof-stack table reset lane.",
  moduleMapFile
);

check(
  "GPU_PROOF_STACK_TABLE_RESET_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-PROOF-STACK-TABLE-RESET-0624I") &&
    ledger.includes("scripts/audit-compute-gpu-vram-proof-stack-table-reset-v1.js"),
  "Pattern promotion ledger should record the GPU proof-stack table reset lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROOF STACK TABLE RESET AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
