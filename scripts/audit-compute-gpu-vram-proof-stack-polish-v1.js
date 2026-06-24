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
  "GPU_PROOF_STACK_POLISH_STYLE_BLOCK_PRESENT",
  html.includes('id="compute-gpu-proof-stack-polish-0624g"') &&
    html.includes("#computeGpuReferencesCard") &&
    html.includes("#computeGpuRecommendedActionsCard") &&
    html.includes("#computeGpuDecisionScheduleCard"),
  "GPU proof-stack polish style block should target all three proof cards."
);

check(
  "GPU_PROOF_STACK_POLISH_REFERENCE_TABLE_GRID",
  html.includes("#computeGpuReferences tr") &&
    html.includes("grid-template-columns: minmax(138px, 170px) 1fr") &&
    html.includes("white-space: nowrap") &&
    html.includes("text-transform: uppercase"),
  "GPU Recommendation References should use a clean two-column proof grid with non-wrapping marker labels."
);

check(
  "GPU_PROOF_STACK_POLISH_ACTION_CARDS",
  html.includes("#computeGpuRecommendedActions ol") &&
    html.includes("counter-reset: gpuProofAction") &&
    html.includes("#computeGpuRecommendedActions li::before") &&
    html.includes("content: counter(gpuProofAction)"),
  "GPU Recommended Actions should render as numbered action rows rather than raw list text."
);

check(
  "GPU_PROOF_STACK_POLISH_DECISION_GRID",
  html.includes("#computeGpuDecisionSchedule table") &&
    html.includes("#computeGpuDecisionSchedule tr") &&
    html.includes("grid-template-columns: minmax(132px, 180px) 1fr") &&
    html.includes("#computeGpuDecisionSchedule th"),
  "GPU Decision Schedule should render as a clean two-column decision grid."
);

check(
  "GPU_PROOF_STACK_POLISH_RESPONSIVE_RULES",
  html.includes("@media (max-width: 760px)") &&
    html.includes("grid-template-columns: 1fr") &&
    html.includes("#computeGpuDecisionSchedule th"),
  "GPU proof-stack polish should include responsive single-column fallback."
);

check(
  "GPU_PROOF_STACK_POLISH_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROOF_STACK_POLISH_0624G") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-proof-stack-polish-v1.js"),
  "Module map should document the GPU proof-stack polish lane.",
  moduleMapFile
);

check(
  "GPU_PROOF_STACK_POLISH_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-PROOF-STACK-POLISH-0624G") &&
    ledger.includes("scripts/audit-compute-gpu-vram-proof-stack-polish-v1.js"),
  "Pattern promotion ledger should record the GPU proof-stack polish lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROOF STACK POLISH AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
