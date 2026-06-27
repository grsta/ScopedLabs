const fs = require("fs");
const path = require("path");

const root = process.cwd();

const helperFile = "assets/scopedlabs-compute-export-proof-tables.js";
const htmlFile = "tools/compute/gpu-vram/index.html";
const scriptFile = "tools/compute/gpu-vram/script.js";
const moduleMapFile = "docs/scopedlabs-module-map.md";
const ledgerFile = "docs/scopedlabs-pattern-promotion-ledger.md";

const helper = fs.readFileSync(path.join(root, helperFile), "utf8");
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
  "GPU_EXPORT_REFERENCE_WIDTH_PRESET_SHARED",
  /recommendationReferences\s*:\s*\[\s*["']12%["']\s*,\s*["']23%["']\s*,\s*["']65%["']\s*\]/.test(helper) &&
    helper.includes('version: "scopedlabs-compute-export-proof-tables-002"'),
  "Shared Compute export proof table helper should expose Recommendation References column widths.",
  helperFile
);

check(
  "GPU_EXPORT_REFERENCE_WIDTHS_CONSUMED",
  script.includes('widthsFor("recommendationReferences")') &&
    script.includes("colWidths: referenceColumnWidths"),
  "GPU Recommendation References export section should consume the shared column width preset."
);

check(
  "GPU_EXPORT_REFERENCE_WIDTHS_FALLBACK",
  script.includes('["12%", "23%", "65%"]'),
  "GPU Recommendation References export section should keep a local fallback width split."
);

check(
  "GPU_EXPORT_REFERENCE_WIDTHS_CACHE_BUST",
  html.includes("scopedlabs-compute-export-proof-tables.js?v=scopedlabs-compute-export-proof-tables-002") &&
    html.includes("script.js?v=compute-gpu-vram-export-reference-widths-0627"),
  "GPU page should cache-bust the changed shared helper and GPU script.",
  htmlFile
);

check(
  "GPU_EXPORT_REFERENCE_WIDTHS_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_EXPORT_REFERENCE_WIDTHS_0627") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-export-reference-column-widths-v1.js"),
  "Module map should record the GPU export reference column width polish.",
  moduleMapFile
);

check(
  "GPU_EXPORT_REFERENCE_WIDTHS_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-EXPORT-REFERENCE-WIDTHS-0627") &&
    ledger.includes("12% / 23% / 65%"),
  "Pattern promotion ledger should record accepted export Recommendation References width polish.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM EXPORT REFERENCE COLUMN WIDTHS AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
