const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const COMPUTE_ROOT = path.join(ROOT, "tools", "compute");

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function exists(file) {
  return fs.existsSync(file);
}

function norm(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const checks = [];

function check(status, id, file, detail) {
  checks.push({ status, id, file, detail });
}

function listComputeTools() {
  return fs.readdirSync(COMPUTE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function scriptForTool(tool) {
  const script = path.join(COMPUTE_ROOT, tool, "script.js");
  return exists(script) ? script : null;
}

function htmlForTool(tool) {
  const html = path.join(COMPUTE_ROOT, tool, "index.html");
  return exists(html) ? html : null;
}

function indexOfAll(source, tokens) {
  return tokens.map((token) => source.indexOf(token));
}

function strictlyIncreasing(values) {
  return values.every((value) => value >= 0) &&
    values.every((value, index) => index === 0 || value > values[index - 1]);
}

function extractExtraSectionsBlock(script) {
  const match = script.match(/const\s+extraSections\s*=\s*\[[\s\S]*?\]\s*\.filter\(Boolean\);/);
  return match ? match[0] : "";
}

function hasCustomPayload(html) {
  return /customPayloadBuilder\s*:\s*["'][^"']+["']/.test(html) ||
    /payloadBuilder\s*:\s*["'][^"']+["']/.test(html);
}

function hasProofStackSignals(script, html) {
  return [
    /Recommended Actions/i.test(script) || /Recommended Actions/i.test(html),
    /Recommendation References/i.test(script) || /Recommendation References/i.test(html),
    /Decision Schedule/i.test(script) || /Decision Schedule/i.test(html),
    /VisualExportSection|Capacity Envelope|Planning Visual|chartImage/i.test(script) || /data-compute-result-visual/i.test(html)
  ].filter(Boolean).length >= 3;
}

function auditCpuSizing() {
  const tool = "cpu-sizing";
  const scriptPath = scriptForTool(tool);
  const htmlPath = htmlForTool(tool);

  if (!scriptPath || !htmlPath) {
    check("FAIL", "CPU_EXPORT_PROOF_STACK_FILES_EXIST", "tools/compute/cpu-sizing", "CPU sizing index.html and script.js must exist.");
    return;
  }

  const script = read(scriptPath);
  const html = read(htmlPath);
  const extra = extractExtraSectionsBlock(script);

  check(
    script.includes("function buildComputeCpuVisualExportSection(result, chartSvg)") ? "PASS" : "FAIL",
    "CPU_VISUAL_EXPORT_SECTION_EXISTS",
    "tools/compute/cpu-sizing/script.js",
    "CPU custom export payload must expose the CPU Capacity Envelope as an ordered extraSection."
  );

  check(
    strictlyIncreasing(indexOfAll(extra, [
      "buildComputeCpuVisualExportSection(result, chartSvg)",
      "buildComputeCpuReferenceExportSection(result)",
      "buildComputeCpuRecommendedActionsExportSection(result)",
      "buildComputeCpuDecisionScheduleExportSection()"
    ])) ? "PASS" : "FAIL",
    "CPU_EXPORT_STACK_ORDER_VISUAL_REFERENCES_ACTIONS_SCHEDULE",
    "tools/compute/cpu-sizing/script.js",
    "CPU export order must be visual first, then Recommendation References, Recommended Actions, and CPU Capacity Decision Schedule."
  );

  check(
    script.includes('chartImage: ""') ? "PASS" : "FAIL",
    "CPU_EXPORT_AVOIDS_DUPLICATE_BOTTOM_CHART",
    "tools/compute/cpu-sizing/script.js",
    "CPU custom export should not also send chartImage when the chart is already included as the first ordered extraSection."
  );

  check(
    script.includes('exportSectionsContract: "cpu-visual-references-actions-schedule"') ? "PASS" : "FAIL",
    "CPU_EXPORT_STACK_CONTRACT_MARKER",
    "tools/compute/cpu-sizing/script.js",
    "CPU payload should carry the visual-references-actions-schedule export contract marker."
  );

  check(
    !script.includes("function clearComputeCpuVisual() {\n  function computeCpuExportRowValue") ? "PASS" : "FAIL",
    "CPU_EXPORT_HELPERS_NOT_NESTED",
    "tools/compute/cpu-sizing/script.js",
    "CPU export helpers must not be nested inside clearComputeCpuVisual or another runtime-only function."
  );

  check(
    html.includes("script.js?v=compute-cpu-export-table-style-0618") ? "PASS" : "WATCH",
    "CPU_EXPORT_ORDER_CACHE_BUST",
    "tools/compute/cpu-sizing/index.html",
    "CPU page should cache-bust the script version that owns the final export order and table-style contract."
  );
}

function auditFutureComputeTools() {
  for (const tool of listComputeTools()) {
    if (tool === "cpu-sizing") continue;

    const scriptPath = scriptForTool(tool);
    const htmlPath = htmlForTool(tool);
    if (!scriptPath || !htmlPath) continue;

    const script = read(scriptPath);
    const html = read(htmlPath);

    if (!hasCustomPayload(html) && !hasProofStackSignals(script, html)) {
      check(
        "SKIP",
        "COMPUTE_TOOL_NOT_ON_CUSTOM_PROOF_EXPORT_STACK",
        path.relative(ROOT, htmlPath).replace(/\\/g, "/"),
        tool + " does not currently expose a custom visual/references/actions proof export stack."
      );
      continue;
    }

    const extra = extractExtraSectionsBlock(script);
    const hasVisualSection = /VisualExportSection|CapacityEnvelopeExportSection|EnvelopeExportSection|PlanningVisualExportSection/i.test(script);
    const hasGuidanceSection = /RecommendedActionsExportSection|GuidanceExportSection/i.test(script);
    const hasReferencesSection = /ReferenceExportSection|ReferencesExportSection/i.test(script);
    const chartImageBlank = /chartImage\s*:\s*["']["']/.test(script);

    if (hasProofStackSignals(script, html)) {
      check(
        hasVisualSection ? "PASS" : "WATCH",
        "COMPUTE_PROOF_STACK_HAS_VISUAL_EXPORT_SECTION",
        path.relative(ROOT, scriptPath).replace(/\\/g, "/"),
        tool + " should put its proof visual into the ordered export stack before references/guidance."
      );

      check(
        hasGuidanceSection ? "PASS" : "WATCH",
        "COMPUTE_PROOF_STACK_HAS_GUIDANCE_EXPORT_SECTION",
        path.relative(ROOT, scriptPath).replace(/\\/g, "/"),
        tool + " should export guidance/recommended actions when the live page renders guidance."
      );

      check(
        hasReferencesSection ? "PASS" : "WATCH",
        "COMPUTE_PROOF_STACK_HAS_REFERENCES_EXPORT_SECTION",
        path.relative(ROOT, scriptPath).replace(/\\/g, "/"),
        tool + " should export proof references/footnotes when the visual uses markers."
      );

      check(
        hasVisualSection && chartImageBlank ? "PASS" : "WATCH",
        "COMPUTE_PROOF_STACK_AVOIDS_BOTTOM_CHART_DUPLICATE",
        path.relative(ROOT, scriptPath).replace(/\\/g, "/"),
        tool + " should not leave the main chart in chartImage when the visual is already in ordered extraSections."
      );

      check(
        extra ? "PASS" : "WATCH",
        "COMPUTE_PROOF_STACK_HAS_EXTRA_SECTIONS_BLOCK",
        path.relative(ROOT, scriptPath).replace(/\\/g, "/"),
        tool + " should use ordered extraSections for visual, references, guidance, and decision schedule."
      );
    }
  }
}

console.log("SCOPEDLABS COMPUTE EXPORT PROOF STACK ORDER AUDIT V1\n");

auditCpuSizing();
auditFutureComputeTools();

let pass = 0;
let watch = 0;
let skip = 0;
let fail = 0;

for (const item of checks) {
  if (item.status === "PASS") pass += 1;
  else if (item.status === "WATCH") watch += 1;
  else if (item.status === "SKIP") skip += 1;
  else fail += 1;

  console.log("[" + item.status + "] " + item.id);
  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("WATCH: " + watch);
console.log("SKIP: " + skip);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
