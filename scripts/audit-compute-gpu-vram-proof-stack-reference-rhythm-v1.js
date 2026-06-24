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

const renderReferences = functionBlock(script, "renderReferences");

check(
  "GPU_REFERENCE_RAM_RHYTHM_RENDERER_TABLE",
  renderReferences.includes("compute-gpu-reference-table") &&
    renderReferences.includes("<thead><tr><th>Marker</th><th>Reference</th><th>Reason</th></tr></thead>") &&
    renderReferences.includes("Demand basis") &&
    renderReferences.includes("Required/status-driving point") &&
    renderReferences.includes("Capacity rail"),
  "GPU Recommendation References should render a RAM-style Marker / Reference / Reason table.",
  scriptFile
);

check(
  "GPU_REFERENCE_RAM_RHYTHM_STYLE_BLOCK",
  html.includes('id="compute-gpu-reference-ram-rhythm-0624j"') &&
    html.includes("table.compute-gpu-reference-table") &&
    html.includes("display: table !important") &&
    html.includes("display: table-cell !important") &&
    html.includes(".compute-gpu-ref-marker"),
  "GPU reference card should reset earlier grid styles and render as a real desktop table."
);

check(
  "GPU_REFERENCE_RAM_RHYTHM_MARKER_TONES",
  html.includes(".compute-gpu-ref-marker.is-demand") &&
    html.includes(".compute-gpu-ref-marker.is-required") &&
    html.includes(".compute-gpu-ref-marker.is-capacity"),
  "GPU reference markers should have demand, required, and capacity tones."
);

check(
  "GPU_REFERENCE_RAM_RHYTHM_SCRIPT_VERSION",
  html.includes('./script.js?v=compute-gpu-vram-export-dynamic-placement-0624m'),
  "GPU local script version should be bumped for RAM-style references."
);

check(
  "GPU_REFERENCE_RAM_RHYTHM_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROOF_STACK_REFERENCE_RHYTHM_0624J") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-proof-stack-reference-rhythm-v1.js"),
  "Module map should document the RAM-style reference card lane.",
  moduleMapFile
);

check(
  "GPU_REFERENCE_RAM_RHYTHM_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-PROOF-STACK-REFERENCE-RHYTHM-0624J") &&
    ledger.includes("scripts/audit-compute-gpu-vram-proof-stack-reference-rhythm-v1.js"),
  "Pattern promotion ledger should record the RAM-style reference card lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROOF STACK REFERENCE RHYTHM AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
