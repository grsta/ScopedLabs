#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFile = "tools/compute/gpu-vram/index.html";
const html = fs.readFileSync(path.join(root, htmlFile), "utf8");
const scriptFile = "tools/compute/gpu-vram/script.js";
const script = fs.readFileSync(path.join(root, scriptFile), "utf8");

const checks = [];

function check(code, pass, detail) {
  checks.push({ code, pass, detail });
}

function indexOfToken(token) {
  const idx = html.indexOf(token);
  return idx === -1 ? 999999999 : idx;
}

function has(token) {
  return html.includes(token);
}

function count(re) {
  return (html.match(re) || []).length;
}

const order = [
  ["toolCard", 'id="toolCard"'],
  ["ledger", 'id="computeInternalResultsLedger"'],
  ["results", 'id="results"'],
  ["analysis", 'id="analysis-copy"'],
  ["assistant", 'id="computeAssistantCard"'],
  ["visualCard", 'id="computeGpuVisualCard"'],
  ["visual", 'id="computeGpuVisual"'],
  ["references", 'id="computeGpuReferencesCard"'],
  ["actions", 'id="computeGpuRecommendedActionsCard"'],
  ["schedule", 'id="computeGpuDecisionScheduleCard"'],
  ["reportMetadata", 'id="reportMetadataMount"'],
  ["exportStatus", 'id="exportStatus"'],
  ["userNotes", 'data-scopedlabs-user-tool-notes-card="true"'],
  ["flowActions", 'data-compute-flow-actions="true"']
];

for (const [name, token] of order) {
  check(
    "GPU_LAYOUT_TOKEN_PRESENT_" + name.toUpperCase(),
    has(token),
    "GPU layout should include canonical token: " + token
  );
}

for (let i = 1; i < order.length; i += 1) {
  const prev = order[i - 1];
  const current = order[i];

  check(
    "GPU_LAYOUT_ORDER_" + prev[0].toUpperCase() + "_BEFORE_" + current[0].toUpperCase(),
    indexOfToken(prev[1]) < indexOfToken(current[1]),
    "Expected " + prev[0] + " before " + current[0] + "."
  );
}

check(
  "GPU_LAYOUT_NO_REPORT_METADATA_INSIDE_BUTTON_OPEN",
  !/<button\s*\n\s*<div\s+id=["']reportMetadataMount["']/i.test(html),
  "reportMetadataMount must not be inserted inside an opening button tag."
);

check(
  "GPU_LAYOUT_NO_USER_NOTES_INSIDE_DIV_OPEN",
  !/<div\s*\n\s*<div\s+class=["']scopedlabs-user-tool-notes-inline/i.test(html),
  "User Tool Notes must not be inserted inside an unfinished div opening tag."
);

check(
  "GPU_LAYOUT_NO_EXPORT_STATUS_BROKEN_OPEN_TAG",
  !/<\/div>\s*id=["']exportStatus["']/i.test(html),
  "exportStatus must be a valid element, not an id fragment after a closing div."
);

check(
  "GPU_LAYOUT_SINGLE_REPORT_METADATA_MOUNT",
  count(/id=["']reportMetadataMount["']/g) === 1,
  "GPU should have exactly one reportMetadataMount."
);

check(
  "GPU_LAYOUT_SINGLE_EXPORT_STATUS",
  count(/id=["']exportStatus["']/g) === 1,
  "GPU should have exactly one exportStatus."
);

check(
  "GPU_LAYOUT_SINGLE_FLOW_ACTIONS",
  count(/data-compute-flow-actions=["']true["']/g) === 1,
  "GPU should have exactly one shell-owned flow action row."
);

check(
  "GPU_LAYOUT_USES_RESULT_VISUAL_CARD_WRAPPER",
  has('id="computeGpuVisualCard"') &&
    has('class="card compute-result-visual-card"') &&
    has('id="computeGpuVisual"') &&
    has('class="compute-result-visual-shell"'),
  "GPU visual should use the CPU/RAM visual card wrapper and visual shell."
);

check(
  "GPU_LAYOUT_REPORT_METADATA_AFTER_DECISION_SCHEDULE",
  indexOfToken('id="computeGpuDecisionScheduleCard"') < indexOfToken('id="reportMetadataMount"'),
  "Report metadata should sit after visual/references/actions/schedule, matching CPU/RAM."
);

check(
  "GPU_LAYOUT_USER_NOTES_AFTER_EXPORT_STATUS",
  indexOfToken('id="exportStatus"') < indexOfToken('data-scopedlabs-user-tool-notes-card="true"'),
  "User Tool Notes should sit after export status, matching CPU/RAM export/report rhythm."
);

check(
  "GPU_LAYOUT_SCRIPT_SHOWS_VISUAL_CARD",
  script.includes('computeGpuVisualCard') &&
    /computeGpuVisualCard[\s\S]{0,240}hidden\s*=\s*false/i.test(script),
  "GPU script should unhide the CPU/RAM-style visual card wrapper when rendering the envelope."
);

check(
  "GPU_LAYOUT_SCRIPT_CLEARS_VISUAL_CARD",
  script.includes('"computeGpuVisualCard"') &&
    script.includes('"computeGpuEnvelope"') &&
    script.includes('"computeGpuEngineeringSummary"'),
  "GPU shell clear path should hide/clear the visual wrapper, envelope, and engineering summary."
);

let pass = 0;
let fail = 0;

console.log("SCOPEDLABS COMPUTE GPU VRAM LAYOUT PARITY AUDIT V1\n");

for (const item of checks) {
  if (item.pass) pass += 1;
  else fail += 1;

  console.log("[" + (item.pass ? "PASS" : "FAIL") + "] " + item.code);
  console.log("  " + htmlFile);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

if (fail) process.exit(1);
