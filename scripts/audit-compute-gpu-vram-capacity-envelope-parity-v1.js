#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scriptFile = "tools/compute/gpu-vram/script.js";
const htmlFile = "tools/compute/gpu-vram/index.html";
const moduleFile = "assets/scopedlabs-compute-capacity-visuals.js";

const script = fs.readFileSync(path.join(root, scriptFile), "utf8");
const html = fs.readFileSync(path.join(root, htmlFile), "utf8");
const moduleText = fs.existsSync(path.join(root, moduleFile))
  ? fs.readFileSync(path.join(root, moduleFile), "utf8")
  : "";

const checks = [];

function check(code, pass, detail, file) {
  checks.push({ code, pass, detail, file: file || scriptFile });
}

function findFunctionBlock(source, functionName) {
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

const block = findFunctionBlock(script, "envelopeSvg");

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_FUNCTION_PRESENT",
  block.includes("function envelopeSvg(plan)") &&
    block.includes("GPU VRAM CAPACITY ENVELOPE"),
  "GPU should retain the local envelopeSvg proof function during Lane 4."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_VIEWBOX",
  block.includes("viewBox=\"0 0 ' + width + ' ' + height + '\"") ||
    block.includes("const width = 760") &&
    block.includes("const height = 430"),
  "GPU envelope should use the CPU/RAM-style responsive 760 by 430 analytic canvas."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_BLUE_PANEL_REMOVED",
  !block.includes("#0f172a") &&
    !block.includes("#020617") &&
    !block.includes("#38bdf8") &&
    block.includes("#07110f") &&
    block.includes("#040b09"),
  "GPU envelope should remove the old blue panel/line grammar and use the dark CAD envelope background."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_SHARED_STYLE_TOKENS",
  block.includes(".plot-frame") &&
    block.includes(".zone-good") &&
    block.includes(".zone-watch") &&
    block.includes(".zone-risk") &&
    block.includes(".grid-major") &&
    block.includes(".status-chip"),
  "GPU envelope should use the same visual grammar tokens as CPU/RAM capacity envelopes."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_MARKER_DOTS",
  block.includes("marker-ring") &&
    block.includes("marker-current") &&
    block.includes("marker-growth") &&
    block.includes("marker-failover") &&
    block.includes("#38d9ff") &&
    block.includes("#a78bfa") &&
    block.includes("#f59e0b"),
  "GPU envelope should use CPU/RAM marker ring and colored point tones."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_MARKER_REFERENCES",
  block.includes("*1") &&
    block.includes("*2") &&
    block.includes("*3") &&
    block.includes('data-ref="') &&
    block.includes("ref-label") &&
    block.includes("marker-label-current") &&
    block.includes("marker-label-growth") &&
    block.includes("marker-label-failover"),
  "GPU envelope should keep chart-linked *1/*2/*3 marker references on the plotted points while the explanation lives in the Recommendation References card."
)

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_RAILS",
  block.includes("usable planning rail") &&
    block.includes("installed VRAM rail") &&
    block.includes("capacity-line") &&
    block.includes("installed-line"),
  "GPU envelope should preserve usable and installed VRAM rails."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_MATH_INPUTS_PRESERVED",
  block.includes("plan.rawDemandGb") &&
    block.includes("plan.requiredVramGb") &&
    block.includes("plan.usableVramGb") &&
    block.includes("plan.input.installedVramGb") &&
    block.includes("plan.status"),
  "GPU envelope should preserve existing GPU math/status inputs."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_EXPORT_SVG_PRESENT",
  block.includes('data-export-svg="true"') &&
    block.includes('data-compute-visual="gpu-vram-capacity-envelope"') &&
    block.includes('data-compute-capacity-visual="gpu-vram-envelope"'),
  "GPU envelope should remain export-detectable and identify itself as a Compute capacity visual."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_SCRIPT_VERSION_BUMPED",
  html.includes("./script.js?v=compute-gpu-vram-") && html.includes("0622"),
  "GPU page should keep a GPU-owned chart cache-bust present; later Lane 4 polish passes may advance the exact version."
, htmlFile);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_SHARED_MODULE_NOT_PROMOTED_YET",
  moduleText.includes("buildCpuCapacityEnvelopeSvg") &&
    moduleText.includes("buildRamCapacityEnvelopeSvg") &&
    !moduleText.includes("buildGpuCapacityEnvelopeSvg"),
  "Lane 4 should remain a GPU local proof until the visual is live-accepted, then promote into the shared visual module."
, moduleFile);


check(
  "GPU_CAPACITY_ENVELOPE_PARITY_GREEN_CARD_POLISH",
  html.includes('id="compute-gpu-capacity-envelope-polish-0622"') &&
    html.includes("#computeGpuEngineeringSummary") &&
    html.includes("#computeGpuVisualCard") &&
    html.includes("rgba(44,255,155,.18)"),
  "GPU engineering result and visual wrapper should use the normal green/dark compute card treatment, with blue edge treatment removed."
, htmlFile);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_RAM_REFERENCE_PATTERN",
  !block.includes("legend-ref-current") &&
    !block.includes("legend-ref-growth") &&
    !block.includes("legend-ref-failover") &&
    html.includes('id="computeGpuReferencesCard"') &&
    html.includes('id="computeGpuReferences"'),
  "GPU should follow RAM reference rhythm: no inline SVG legend row, with Recommendation References preserved below the chart."
, htmlFile)


check(
  "GPU_CAPACITY_ENVELOPE_PARITY_NO_INLINE_LEGEND",
  !block.includes("Demand basis</text>") &&
    !block.includes("Reserve pressure</text>") &&
    !block.includes("Validation rail</text>") &&
    !block.includes("legend-ref-current") &&
    !block.includes("legend-ref-growth") &&
    !block.includes("legend-ref-failover"),
  "GPU chart should not keep a RAM-rejected inline footnote legend row inside the SVG."
);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_RECOMMENDATION_REFERENCES_CARD_PRESERVED",
  html.includes('id="computeGpuReferencesCard"') &&
    html.includes('id="computeGpuReferences"'),
  "GPU should keep the Recommendation References card below the chart, matching RAM rhythm."
, htmlFile);

check(
  "GPU_CAPACITY_ENVELOPE_PARITY_BAND_LABELS_PRESENT",
  block.includes("band-label-risk") &&
    block.includes("band-label-watch") &&
    block.includes("band-label-good") &&
    block.includes(">RISK</text>") &&
    block.includes(">WATCH</text>") &&
    block.includes(">GOOD</text>"),
  "GPU chart should restore GOOD / WATCH / RISK band labels inside the color zones."
);

let pass = 0;
let fail = 0;

console.log("SCOPEDLABS COMPUTE GPU VRAM CAPACITY ENVELOPE PARITY AUDIT V1\n");

for (const item of checks) {
  if (item.pass) pass += 1;
  else fail += 1;

  console.log("[" + (item.pass ? "PASS" : "FAIL") + "] " + item.code);
  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

if (fail) process.exit(1);
