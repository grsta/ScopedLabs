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

const renderGpuEngineeringPlan = functionBlock(script, "renderGpuEngineeringPlan");
const renderProofSectionsFromPlan = functionBlock(script, "renderProofSectionsFromPlan");
const renderShellProof = functionBlock(script, "renderShellProof");
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
  html.includes("data-compute-recommendation-references-card") &&
    html.includes("data-compute-recommended-actions-card") &&
    html.includes("data-compute-decision-schedule-card") &&
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
  script.includes("Required/status-driving point") &&
    script.includes("status-driving point") &&
    script.includes("Capacity rail context") &&
    script.includes("Usable and installed VRAM remain horizontal capacity rails"),
  "GPU references should match accepted chart grammar: *2 is Required/status-driving point; *3 is capacity rail context."
);

check(
  "GPU_PROOF_STACK_ACTIVE_RENDER_DISPATCHES_PLAN_EVENT",
  renderGpuEngineeringPlan.includes("envelope.innerHTML = envelopeSvg(plan);") &&
    renderGpuEngineeringPlan.includes('window.dispatchEvent(new CustomEvent("scopedlabs:compute-gpu-vram-plan-rendered"') &&
    renderGpuEngineeringPlan.includes("detail: { plan }") &&
    renderGpuEngineeringPlan.indexOf("envelope.innerHTML = envelopeSvg(plan);") <
      renderGpuEngineeringPlan.indexOf('window.dispatchEvent(new CustomEvent("scopedlabs:compute-gpu-vram-plan-rendered"'),
  "GPU active engineering renderer should dispatch a local plan-rendered event immediately after writing the chart.",
  scriptFile
);

check(
  "GPU_PROOF_STACK_EVENT_BRIDGE_LISTENS_AND_RENDERS",
  script.includes('window.addEventListener("scopedlabs:compute-gpu-vram-plan-rendered"') &&
    script.includes("renderProofSectionsFromPlan(plan);") &&
    renderProofSectionsFromPlan.includes("renderReferences(plan)") &&
    renderProofSectionsFromPlan.includes("renderActions(plan)") &&
    renderProofSectionsFromPlan.includes("renderSchedule(plan)"),
  "GPU shell proof bridge should listen for the active renderer event and render proof sections from the supplied plan.",
  scriptFile
);

check(
  "GPU_PROOF_STACK_SHELL_PROOF_REUSES_EVENT_RENDERER",
  renderShellProof.includes("renderLedger(plan)") &&
    renderShellProof.includes("renderAssistant(plan)") &&
    renderShellProof.includes("renderProofSectionsFromPlan(plan)") &&
    !renderShellProof.includes("renderReferences(plan);\n    renderActions(plan);\n    renderSchedule(plan);"),
  "GPU shell proof path should reuse the same proof-section renderer used by the event bridge.",
  scriptFile
);

check(
  "GPU_PROOF_STACK_RENDERERS_PRESENT",
  script.includes("function renderReferences") &&
    script.includes("function renderActions") &&
    script.includes("function renderSchedule") &&
    script.includes("computeGpuRecommendedActionsCard") &&
    script.includes("computeGpuDecisionScheduleCard") &&
    script.includes("computeGpuDecisionSchedule"),
  "GPU script should render references, recommended actions, and decision schedule through the existing proof stack.",
  scriptFile
);

check(
  "GPU_PROOF_STACK_LOCAL_SCRIPT_VERSION",
  html.includes('./script.js?v=compute-gpu-vram-export-parity-0624k') &&
    script.includes('scopedlabs:compute-gpu-vram-plan-rendered') &&
    script.includes("renderProofSectionsFromPlan(plan);"),
  "GPU local script version should reflect the latest proof-stack lane while preserving the event bridge wiring."
)

check(
  "GPU_PROOF_STACK_MODULE_MAP_UPDATED",
  moduleMap.includes("COMPUTE_GPU_VRAM_PROOF_STACK_EVENT_BRIDGE_0624F") &&
    moduleMap.includes("scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js"),
  "Module map should document the GPU proof-stack event bridge lane.",
  moduleMapFile
);

check(
  "GPU_PROOF_STACK_PROMOTION_LEDGER_UPDATED",
  ledger.includes("COMPUTE-GPU-VRAM-PROOF-STACK-EVENT-BRIDGE-0624F") &&
    ledger.includes("scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js"),
  "Pattern promotion ledger should record the GPU proof-stack event bridge lane.",
  ledgerFile
);

console.log("");
console.log("SCOPEDLABS COMPUTE GPU VRAM PROOF STACK PARITY AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) {
  process.exit(1);
}
