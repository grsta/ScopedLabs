const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

let failures = 0;

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

function riskyGlyphsIn(text) {
  const risky = [0x2192, 0x21D2, 0x2014, 0x2013, 0x201C, 0x201D, 0x2018, 0x2019];
  return risky.filter(function (code) {
    return text.indexOf(String.fromCharCode(code)) >= 0;
  }).map(function (code) {
    return "U+" + code.toString(16).toUpperCase();
  });
}

function hasVersionedScript(page, scriptName, prefix) {
  const marker = scriptName + "?v=" + prefix + "-";
  const index = page.indexOf(marker);
  if (index < 0) return false;
  const after = page.slice(index + marker.length);
  return /^[0-9]{3}(?:-[a-z0-9-]+)?/.test(after);
}

const pipeline = read("assets/pipeline.js");

function computeGuidedPipelineBlock(source) {
  const start = source.indexOf("function readScopedJsonStorage");
  const end = source.indexOf("function appendStepAnchor", start);
  if (start < 0 || end < 0) return "";
  return source.slice(start, end);
}

const guidedPipelineBlock = computeGuidedPipelineBlock(pipeline);
const guidedPipelineGlyphs = riskyGlyphsIn(guidedPipelineBlock);
const gpuPage = read("tools/compute/gpu-vram/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Guided Pipeline LED State Audit V1");
console.log("");

check(
  "PIPELINE_HAS_COMPUTE_GUIDED_STEP_STATE",
  pipeline.includes("function computeGuidedPipelineStepState") &&
    pipeline.includes("RouteEngine.applicableSteps") &&
    pipeline.includes("RouteEngine.completedMap"),
  "assets/pipeline.js"
);

check(
  "PIPELINE_INFERS_UPSTREAM_APPLICABLE_STEPS_COMPLETE",
  pipeline.includes("var applicableTools = []") &&
    pipeline.includes("currentApplicableIndex") &&
    pipeline.includes("toolApplicableIndex < currentApplicableIndex") &&
    pipeline.includes("return \"complete\";"),
  "guided pipeline should mark applicable upstream steps complete when current guided tool is downstream"
);

check(
  "PIPELINE_USES_LEDGER_COMPLETION_FOR_COMPUTE",
  pipeline.includes("if (completed[tool]) return \"complete\";") &&
    pipeline.includes("if (applicable[tool]) return \"future\";") &&
    pipeline.includes("return \"skipped\";"),
  "completed tools glow; selected future work remains future; non-applicable tools are skipped/muted"
);

check(
  "PIPELINE_SUMMARY_NOT_AUTO_COMPLETE",
  pipeline.includes("if (step.categoryEndpoint === \"summary\") return \"future\";"),
  "Summary should not glow until user is actually on/reviewing Summary"
);

check(
  "PIPELINE_WRITES_GUIDED_STATE_DOM_MARKER",
  pipeline.includes("data-guided-pipeline-state") &&
    pipeline.includes("is-skipped"),
  "guided LED state should be inspectable in DOM"
);

check(
  "GPU_LOADS_ROUTE_ENGINE_BEFORE_PIPELINE_RENDERER",
  gpuPage.indexOf("scopedlabs-compute-guided-route-engine.js") > gpuPage.indexOf("pipeline-state.js") &&
    gpuPage.indexOf("pipeline.js") > gpuPage.indexOf("scopedlabs-compute-guided-route-engine.js"),
  "tools/compute/gpu-vram/index.html"
);

check(
  "GPU_PIPELINE_RENDERER_IS_CACHE_BUSTED",
  hasVersionedScript(gpuPage, "pipeline.js", "compute-guided-pipeline-led-state"),
  "contract: GPU page must load a scoped versioned pipeline renderer"
);

check(
  "NEW_PIPELINE_BLOCK_AVOIDS_RISKY_LITERAL_GLYPHS",
  guidedPipelineBlock.length > 0 && guidedPipelineGlyphs.length === 0,
  guidedPipelineGlyphs.length ? "offenders: " + guidedPipelineGlyphs.join(" ") : "golden rule: new Compute guided pipeline helper block avoids risky literal glyphs"
);

check(
  "MODULE_MAP_DOCUMENTS_GUIDED_PIPELINE_LED_STATE",
  moduleMap.includes("Compute guided pipeline LED state"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_GUIDED_PIPELINE_LED_AUDIT",
  batch.includes("scripts/audit-compute-guided-pipeline-led-state-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (8 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
