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

function indexOfRequired(text, token) {
  const index = text.indexOf(token);
  return index;
}

function inOrder(text, tokens) {
  let previous = -1;
  for (const token of tokens) {
    const current = text.indexOf(token);
    if (current === -1 || current <= previous) return false;
    previous = current;
  }
  return true;
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
  "GPU_PROOF_STACK_HTML_ORDER",
  inOrder(html, [
    'id="computeGpuVisualCard"',
    'id="computeGpuReferencesCard"',
    'id="computeGpuRecommendedActionsCard"',
    'id="computeGpuDecisionScheduleCard"',
    'data-scopedlabs-user-tool-notes-card'
  ]),
  "GPU proof stack should keep chart, Recommendation References, Recommended Actions, Decision Schedule, then User Tool Notes in that order."
);

check(
  "GPU_PROOF_STACK_EXPORT_SECTION_TOKENS",
  html.includes('data-compute-recommendation-references-card') &&
    html.includes('data-compute-recommended-actions-card') &&
    html.includes('data-compute-decision-schedule-card') &&
    html.includes('data-output-references-owner="compute-assistant-contract"') &&
    html.includes('data-output-actions-owner="compute-assistant-contract"') &&
    html.includes('data-output-decision-owner="compute-assistant-contract"') &&
    html.includes('data-export-title="Recommendation References"') &&
    html.includes('data-export-title="Recommended Actions"') &&
    html.includes('data-export-title="GPU VRAM Decision Schedule"'),
  "GPU proof cards should keep assistant-contract ownership and export section metadata."
);

check(
  "GPU_PROOF_STACK_RAM_STYLE_CARD_DESCRIPTIONS",
  html.includes("Reference markers for the GPU VRAM Capacity Envelope") &&
    html.includes("Practical validation steps to reduce GPU memory pressure") &&
    html.includes("Compact GPU VRAM status, threshold, recommendation") &&
    html.includes('aria-label="GPU VRAM recommendation references"') &&
    html.includes('aria-label="GPU VRAM recommended actions"') &&
    html.includes('aria-label="GPU VRAM decision schedule"'),
  "GPU proof cards should include RAM-style muted descriptions and accessible group labels."
);

check(
  "GPU_PROOF_STACK_REFERENCE_WORDING_MATCHES_ACCEPTED_CHART",
  renderReferences.includes("*1 demand basis") &&
    renderReferences.includes("*2 required status point") &&
    renderReferences.includes("status-driving point") &&
    renderReferences.includes("watch/risk thresholds") &&
    renderReferences.includes("*3 capacity rail") &&
    renderReferences.includes("horizontal capacity rails") &&
    !renderReferences.includes("*2 capacity rail"),
  "GPU references should match accepted chart grammar: *2 is Required/status-driving point; *3 is capacity rail context."
, scriptFile);

check(
  "GPU_PROOF_STACK_RENDERERS_PRESENT",
  script.includes("function renderReferences") &&
    script.includes("function renderActions") &&
    script.includes("computeGpuRecommendedActionsCard") &&
    script.includes("computeGpuDecisionScheduleCard") &&
    script.includes("computeGpuDecisionSchedule"),
  "GPU script should render references, recommended actions, and decision schedule through the existing proof stack."
, scriptFile);

check(
  "GPU_PROOF_STACK_LOCAL_SCRIPT_VERSION",
  html.includes('./script.js?v=compute-gpu-vram-proof-stack-parity-0624a'),
  "GPU local script version should be bumped for the proof-stack parity lane."
);

check(
  "GPU_PROOF_STACK_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROOF_STACK_PARITY_0624A") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js") &&
    moduleMap.includes("Recommendation References") &&
    moduleMap.includes("Recommended Actions") &&
    moduleMap.includes("Decision Schedule"),
  "Module map should document the GPU proof-stack parity lane."
, moduleMapFile);

check(
  "GPU_PROOF_STACK_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-PROOF-STACK-PARITY-0624A") &&
    ledger.includes("scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js"),
  "Pattern promotion ledger should record this local proof-stack parity lane."
, ledgerFile);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROOF STACK PARITY AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
