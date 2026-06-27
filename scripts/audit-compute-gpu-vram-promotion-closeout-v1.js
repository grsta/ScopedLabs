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

const requiredAudits = [
  "scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js",
  "scripts/audit-compute-gpu-vram-proof-stack-polish-v1.js",
  "scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js",
  "scripts/audit-compute-gpu-vram-proof-stack-table-reset-v1.js",
  "scripts/audit-compute-gpu-vram-proof-stack-reference-rhythm-v1.js",
  "scripts/audit-compute-gpu-vram-export-parity-v1.js",
  "scripts/audit-compute-gpu-vram-export-card-placement-v1.js",
  "scripts/audit-compute-gpu-vram-export-dynamic-placement-v1.js",
  "scripts/audit-compute-gpu-vram-export-card-cta-placement-v1.js"
];

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

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function order(tokens, text) {
  let last = -1;
  for (const token of tokens) {
    const idx = text.indexOf(token);
    if (idx === -1 || idx <= last) return false;
    last = idx;
  }
  return true;
}

check(
  "GPU_PROMOTION_REQUIRED_AUDITS_EXIST",
  requiredAudits.every(exists),
  "GPU VRAM promotion requires all proof, export, placement, and CTA audits to exist.",
  "scripts"
);

check(
  "GPU_PROMOTION_ACCEPTED_VISUAL_STACK_PRESENT",
  html.includes('id="computeGpuVisualCard"') &&
    html.includes('id="computeGpuEnvelope"') &&
    html.includes("GPU VRAM Capacity Envelope") &&
    script.includes("envelopeSvg(plan)") &&
    script.includes("scopedlabs:compute-gpu-vram-plan-rendered"),
  "GPU VRAM accepted Capacity Envelope and active renderer event bridge must remain present."
);

check(
  "GPU_PROMOTION_PROOF_STACK_ORDER_ACCEPTED",
  order([
    'id="computeGpuVisualCard"',
    'id="computeGpuReferencesCard"',
    'id="computeGpuRecommendedActionsCard"',
    'id="computeGpuDecisionScheduleCard"'
  ], html),
  "GPU VRAM proof stack should remain chart, references, actions, decision schedule."
);

check(
  "GPU_PROMOTION_REFERENCE_GRAMMAR_ACCEPTED",
  script.includes("Required/status-driving point") &&
    script.includes("Capacity rail context") &&
    script.includes("Usable and installed VRAM remain horizontal capacity rails") &&
    !script.includes("Required status point"),
  "GPU references should preserve accepted two plotted points plus capacity rail context grammar."
);

check(
  "GPU_PROMOTION_RAM_RHYTHM_ACCEPTED",
  html.includes("compute-gpu-reference-table") &&
    html.includes("compute-gpu-proof-actions-list") &&
    html.includes("compute-gpu-decision-table") &&
    html.includes("GROUP") &&
    html.includes("ENGINEERING NOTE"),
  "GPU VRAM references, actions, and decision schedule should retain RAM-style card/table rhythm."
);

check(
  "GPU_PROMOTION_EXPORT_PAYLOAD_ACCEPTED",
  html.includes('customPayloadBuilder = "ScopedLabsComputeGpuVramExport.buildPayload"') &&
    script.includes("window.ScopedLabsComputeGpuVramExport") &&
    script.includes('exportSectionsContract: "gpu-vram-visual-references-actions-schedule"') &&
    script.includes('title: "GPU VRAM Capacity Envelope"') &&
    script.includes('title: "Recommendation References"') &&
    script.includes('title: "Recommended Actions"') &&
    script.includes('title: "GPU VRAM Decision Schedule"'),
  "GPU VRAM custom export payload should carry chart, references, actions, and decision schedule."
);

check(
  "GPU_PROMOTION_DYNAMIC_EXPORT_PLACEMENT_ACCEPTED",
  html.includes('./script.js?v=compute-gpu-vram-export-dynamic-placement-0624m') &&
    script.includes("ScopedLabsComputeGpuVramExportDynamicPlacement0624M") &&
    script.includes("placeExportInInputs") &&
    script.includes("placeExportAfterProofStack") &&
    script.includes("!card.contains(flow)"),
  "GPU VRAM export card should keep accepted dynamic placement before and after calculation."
);

check(
  "GPU_PROMOTION_CTA_INSIDE_EXPORT_CARD_ACCEPTED",
  html.includes('data-compute-flow-inside-export-card="true"') &&
    html.includes('href="/tools/compute/summary/"') &&
    html.includes("Review Compute Summary"),
  "GPU VRAM Review Compute Summary CTA should remain inside the Export Report card."
);

check(
  "GPU_PROMOTION_USER_TOOL_NOTES_ACCEPTED",
  html.includes("scopedlabs-user-tool-notes-inline") &&
    html.includes("data-scopedlabs-user-tool-notes") &&
    html.includes('data-tool-slug="gpu-vram"'),
  "GPU VRAM User Tool Notes should remain inside the export/report card."
);

check(
  "GPU_PROMOTION_GUIDED_ROUTE_AND_LEDGER_PRESERVED",
  html.includes("compute-flow-actions") &&
    html.includes('data-compute-flow-actions="true"') &&
    html.includes('id="computeInternalResultsLedger"') &&
    script.includes("renderLedger(plan)") &&
    script.includes('"tool":"gpu-vram"') === false,
  "GPU VRAM flow CTA and internal ledger should remain owned by the tool without replacing guided behavior."
);

check(
  "GPU_PROMOTION_MODULE_MAP_ACCEPTED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROMOTION_CLOSEOUT_0627") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-promotion-closeout-v1.js") &&
    moduleMap.includes("tools/compute/gpu-vram/index.html") &&
    moduleMap.includes("tools/compute/gpu-vram/script.js"),
  "Module map should record GPU VRAM promotion closeout.",
  moduleMapFile
);

check(
  "GPU_PROMOTION_LEDGER_ACCEPTED",
  ledger.includes("COMPUTE-GPU-VRAM-PROMOTION-CLOSEOUT-0627") &&
    ledger.includes("ACCEPTED_COMPUTE_PROOF_BASELINE") &&
    ledger.includes("scripts/audit-compute-gpu-vram-promotion-closeout-v1.js"),
  "Pattern promotion ledger should mark GPU VRAM as an accepted Compute proof baseline.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROMOTION CLOSEOUT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
