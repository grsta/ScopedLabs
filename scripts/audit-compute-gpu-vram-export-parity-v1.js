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

function check(code, condition, message, file = scriptFile) {
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
  "GPU_EXPORT_CONFIG_CUSTOM_PAYLOAD_BUILDER",
  html.includes("customPayloadBuilder") &&
    html.includes("ScopedLabsComputeGpuVramExport.buildPayload") &&
    html.includes("report") &&
    html.includes("gpu-vram"),
  "GPU export config should point to the custom GPU VRAM export payload builder and include a report prefix.",
  htmlFile
);

check(
  "GPU_EXPORT_OWNER_OBJECT_PRESENT",
  script.includes("ScopedLabsComputeGpuVramExport0624K") &&
    script.includes("window.ScopedLabsComputeGpuVramExport") &&
    script.includes("buildPayload: buildPayload"),
  "GPU script should expose ScopedLabsComputeGpuVramExport.buildPayload."
);

check(
  "GPU_EXPORT_PAYLOAD_CONTRACT",
  script.includes('exportSectionsContract: "gpu-vram-visual-references-actions-schedule"') &&
    script.includes("extraSections: extraSections") &&
    script.includes("printLowInkChart: false") &&
    script.includes("assumptions: Array.isArray(options.assumptions)"),
  "GPU custom export payload should declare the visual/references/actions/schedule contract."
);

check(
  "GPU_EXPORT_VISUAL_SECTION",
  script.includes('title: "GPU VRAM Capacity Envelope"') &&
    script.includes('document.querySelector("#computeGpuEnvelope svg")') &&
    script.includes("svgs: svg ? [svg] : []"),
  "GPU export should include the live GPU VRAM Capacity Envelope SVG."
);

check(
  "GPU_EXPORT_REFERENCE_ACTION_DECISION_SECTIONS",
  script.includes('title: "Recommendation References"') &&
    script.includes('title: "Recommended Actions"') &&
    script.includes('title: "GPU VRAM Decision Schedule"') &&
    script.includes("#computeGpuReferences table.compute-gpu-reference-table") &&
    script.includes("#computeGpuRecommendedActions .compute-gpu-proof-action") &&
    script.includes("#computeGpuDecisionSchedule table.compute-gpu-decision-table"),
  "GPU export should include references, recommended actions, and decision schedule sections."
);

check(
  "GPU_EXPORT_INPUT_OUTPUT_ROWS",
  script.includes("function inputRows(plan)") &&
    script.includes("function outputRows(plan)") &&
    script.includes("Raw Demand") &&
    script.includes("Required VRAM") &&
    script.includes("Usable VRAM") &&
    script.includes("Capacity Pressure"),
  "GPU export should provide report-ready input and output rows."
);

check(
  "GPU_EXPORT_REFRESH_ON_PLAN_RENDER",
  script.includes('window.addEventListener("scopedlabs:compute-gpu-vram-plan-rendered"') &&
    script.includes("window.ScopedLabsExport.refresh"),
  "GPU export should refresh export readiness after the active plan renders."
);

check(
  "GPU_EXPORT_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_EXPORT_PARITY_0624K") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-export-parity-v1.js"),
  "Module map should document the GPU export parity lane.",
  moduleMapFile
);

check(
  "GPU_EXPORT_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-EXPORT-PARITY-0624K") &&
    ledger.includes("scripts/audit-compute-gpu-vram-export-parity-v1.js"),
  "Pattern promotion ledger should record the GPU export parity lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM EXPORT PARITY AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
