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
  "GPU_EXPORT_DYNAMIC_SCRIPT_VERSION",
  html.includes('./script.js?v=compute-gpu-vram-export-dynamic-placement-0624m'),
  "GPU local script cache-bust should be bumped for dynamic export placement.",
  htmlFile
);

check(
  "GPU_EXPORT_DYNAMIC_PLACEMENT_OWNER",
  script.includes("ScopedLabsComputeGpuVramExportDynamicPlacement0624M") &&
    script.includes("window.ScopedLabsComputeGpuVramExportPlacement") &&
    script.includes("placeExportInInputs") &&
    script.includes("placeExportAfterProofStack"),
  "GPU script should expose a dynamic export placement owner."
);

check(
  "GPU_EXPORT_DYNAMIC_INITIAL_PLACEMENT",
  script.includes("function placeExportInInputs()") &&
    script.includes("resetRow()") &&
    script.includes("insertAfter(card, row)"),
  "GPU export should start under Calculate/Reset before a calculation."
);

check(
  "GPU_EXPORT_DYNAMIC_AFTER_CALC_PLACEMENT",
  script.includes('window.addEventListener("scopedlabs:compute-gpu-vram-plan-rendered"') &&
    script.includes("placeExportAfterProofStack") &&
    script.includes("flowActions()") &&
    script.includes("decisionScheduleCard()"),
  "GPU export should move after the proof stack once the active plan renders."
);

check(
  "GPU_EXPORT_DYNAMIC_INPUT_RESET_RETURN",
  script.includes("bindInputResetPlacement") &&
    script.includes('el.addEventListener("input"') &&
    script.includes('el.addEventListener("change"') &&
    script.includes('reset.addEventListener("click"'),
  "GPU export should return to the input card on input changes or reset."
);

check(
  "GPU_EXPORT_DYNAMIC_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_EXPORT_DYNAMIC_PLACEMENT_0624M") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-export-dynamic-placement-v1.js"),
  "Module map should document dynamic GPU export placement.",
  moduleMapFile
);

check(
  "GPU_EXPORT_DYNAMIC_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-EXPORT-DYNAMIC-PLACEMENT-0624M") &&
    ledger.includes("scripts/audit-compute-gpu-vram-export-dynamic-placement-v1.js"),
  "Pattern promotion ledger should record dynamic GPU export placement.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM EXPORT DYNAMIC PLACEMENT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
