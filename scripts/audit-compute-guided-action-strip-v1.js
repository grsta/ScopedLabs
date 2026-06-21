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

function hasScript(page, scriptName, versionPrefix) {
  const marker = scriptName + "?v=" + versionPrefix + "-";
  const index = page.indexOf(marker);
  if (index < 0) return false;
  return /^[0-9]{3}(?:-[a-z0-9-]+)?/.test(page.slice(index + marker.length));
}

function riskyGlyphsIn(text) {
  const risky = [0x2192, 0x21D2, 0x2014, 0x2013, 0x201C, 0x201D, 0x2018, 0x2019];
  return risky.filter(function (code) { return text.indexOf(String.fromCharCode(code)) >= 0; });
}

const mod = read("assets/scopedlabs-compute-guided-action-strip.js");
const cpu = read("tools/compute/cpu-sizing/index.html");
const ram = read("tools/compute/ram-sizing/index.html");
const gpu = read("tools/compute/gpu-vram/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

console.log("Compute Guided Action Strip Audit V1");
console.log("");

check(
  "GUIDED_ACTION_STRIP_MODULE_EXISTS",
  mod.includes("ScopedLabsComputeGuidedActionStrip") && mod.includes("Guided Compute Path"),
  "assets/scopedlabs-compute-guided-action-strip.js"
);

check(
  "GUIDED_ACTION_STRIP_ONLY_RUNS_IN_GUIDED_MODE",
  mod.includes("context.guidedFlow !== true") && mod.includes("context.routeMode !== \"compute-guided\"") && mod.includes("return null"),
  "direct tool visits must stay standalone"
);

check(
  "GUIDED_ACTION_STRIP_USES_ROUTE_ENGINE",
  mod.includes("ScopedLabsComputeGuidedRouteEngine") && mod.includes("RouteEngine.resolve") && mod.includes("guidedContext: context"),
  "next action must come from route engine"
);

check(
  "GUIDED_ACTION_STRIP_HAS_SINGLE_USER_ACTION_COPY",
  mod.includes("Continue to ") && mod.includes("Run calculation to continue") && !mod.includes("Resume Guided Flow"),
  "use plain user-facing wording, not engine wording"
);

check(
  "GUIDED_ACTION_STRIP_PLACED_BEFORE_EXPORT",
  mod.includes("function findExportReportSection") &&
    mod.includes("before-export-report") &&
    mod.includes("insertBefore(section, exportSection)"),
  "guided strip should sit above Export Report, not at the top of the page"
);

check(
  "GUIDED_ACTION_STRIP_REMOVES_EXTRA_TITLE_SENTENCE",
  !mod.includes("This page is following your selected workload path."),
  "remove redundant sentence from the guided card"
);

check(
  "GUIDED_ACTION_STRIP_BALANCES_CTA_BUTTONS",
  mod.includes("min-height: 42px") &&
    mod.includes("width: 100%") &&
    mod.includes("display: inline-flex"),
  "Back and Continue buttons should share the same visual sizing"
);

check(
  "GUIDED_ACTION_STRIP_CHIPS_ARE_LIGHT_WEIGHT",
  mod.includes("font-weight: 500") &&
    mod.includes("rgba(156,255,180,.76)"),
  "path chips should be lighter and use decision-label green"
);

check(
  "GUIDED_ACTION_STRIP_SEPARATES_OPTIONAL_CHECKS",
  mod.includes("Other optional checks") && mod.includes("OPTIONAL_TOOLS"),
  "non-applicable tools should not look mandatory"
);

check(
  "GUIDED_ACTION_STRIP_SUPPRESSES_LEGACY_ONLY_IN_GUIDED_MODE",
  mod.includes("suppressLegacyGuidedControls") && mod.includes("readGuidedContext()") && mod.includes("data-compute-guided-action-strip-hidden"),
  "legacy CTAs hidden only when guided context exists"
);

check(
  "CPU_RAM_GPU_LOAD_GUIDED_ACTION_STRIP",
  hasScript(cpu, "scopedlabs-compute-guided-action-strip.js", "scopedlabs-compute-guided-action-strip") &&
    hasScript(ram, "scopedlabs-compute-guided-action-strip.js", "scopedlabs-compute-guided-action-strip") &&
    hasScript(gpu, "scopedlabs-compute-guided-action-strip.js", "scopedlabs-compute-guided-action-strip"),
  "CPU/RAM/GPU proof pages must load shared guided strip"
);

check(
  "MODULE_HAS_NO_RISKY_LITERAL_GLYPHS",
  riskyGlyphsIn(mod).length === 0,
  "golden rule: avoid literal special glyphs in JS source"
);

check(
  "MODULE_MAP_DOCUMENTS_GUIDED_ACTION_STRIP",
  moduleMap.includes("Compute guided action strip"),
  "docs/scopedlabs-module-map.md"
);

check(
  "BATCH_INCLUDES_GUIDED_ACTION_STRIP_AUDIT",
  batch.includes("scripts/audit-compute-guided-action-strip-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (14 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
