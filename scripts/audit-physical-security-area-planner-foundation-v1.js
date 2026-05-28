const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-area-planner-foundation-audit-002-core-rollup-labels";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const index = read("tools/physical-security/area-planner/index.html");
const script = read("tools/physical-security/area-planner/script.js");
const state = read("assets/physical-security-area-state.js");
const registry = read("assets/physical-security-tool-registry.js");

console.log("");
console.log("Physical Security Area Planner Foundation Audit");
console.log("");
console.log("Audit version:", VERSION);

add("area-planner-index-exists", index ? "SAFE" : "FAIL", "Area Planner index exists");
add("area-planner-script-exists", script ? "SAFE" : "FAIL", "Area Planner local script exists");
add("area-state-asset-exists", state ? "SAFE" : "FAIL", "shared area state asset exists");
add("tool-registry-exists", registry ? "SAFE" : "FAIL", "physical security tool registry exists");

add(
  "foundation-body-metadata",
  index.includes('data-tool="area-planner"') &&
    index.includes('data-step="area-planner"') &&
    index.includes('data-category="physical-security"')
    ? "SAFE"
    : "FAIL",
  "Area Planner keeps expected body metadata"
);

add(
  "loads-required-shared-assets",
  index.includes("/assets/tool-flow.js") &&
    index.includes("/assets/catalog.js") &&
    index.includes("/assets/pipelines.js") &&
    index.includes("/assets/pipeline-state.js") &&
    index.includes("/assets/pipeline.js") &&
    index.includes("/assets/physical-security-area-state.js") &&
    index.includes("/assets/physical-security-tool-registry.js") &&
    index.includes("/assets/scopedlabs-tool-shell.js") &&
    index.includes("/assets/help.js")
    ? "SAFE"
    : "FAIL",
  "Area Planner loads expected shared assets"
);

add(
  "no-guidance-bridge-or-renderer",
  !index.includes("physical-security-guidance-event-bridge") &&
    !index.includes("physical-security-category-guidance-renderer") &&
    !index.includes("physical-security-report-summary")
    ? "SAFE"
    : "FAIL",
  "Area Planner remains skipped from guidance bridge, visible renderer, and report summary helper"
);

add(
  "area-ledger-ui",
  index.includes("areaList") &&
    index.includes("areaCountPill") &&
    index.includes("Save / Update Area") &&
    index.includes("Add Another Area") &&
    index.includes("Reset Area Plan")
    ? "SAFE"
    : "FAIL",
  "Area Planner exposes area ledger controls"
);

add(
  "area-summary-ui",
  index.includes("areaSummaryCard") &&
    index.includes("Physical Security area summary") &&
    index.includes("printAreaSummary") &&
    index.includes("copyAreaSummaryJson")
    ? "SAFE"
    : "FAIL",
  "Area Planner exposes area summary, print, and copy actions"
);

add(
  "area-form-fields",
  index.includes('id="areaName"') &&
    index.includes('id="areaType"') &&
    index.includes('id="protectedLengthFt"') &&
    index.includes('id="distanceToTargetPlaneFt"') &&
    index.includes('id="assumedHfovDeg"') &&
    index.includes('id="detailGoal"') &&
    index.includes('id="targetCameraCount"')
    ? "SAFE"
    : "FAIL",
  "Area Planner has expected foundation input fields"
);

add(
  "area-state-global-used",
  script.includes("ScopedLabsPhysicalSecurityAreaState")
    ? "SAFE"
    : "FAIL",
  "Area Planner uses shared Physical Security area state"
);

add(
  "area-form-model",
  script.includes("function areaFromForm") &&
    script.includes("sourceMode: \"area-planner\"") &&
    script.includes("status: \"PLANNING\"")
    ? "SAFE"
    : "FAIL",
  "Area Planner builds normalized planning area records"
);

add(
  "core-tool-rollup",
  script.includes("function areaToolRows") &&
    script.includes("Lighting") &&
    script.includes("Mounting") &&
    script.includes("Field of View") &&
    script.includes("Coverage") &&
    script.includes("Spacing") &&
    script.includes("Blind Spot") &&
    script.includes("Pixel Density") &&
    script.includes("Lens")
    ? "SAFE"
    : "FAIL",
  "Area Planner rolls up core Physical Security tool progress"
);

add(
  "optional-zone-rollup",
  script.includes("Face Recognition") &&
    script.includes("License Plate") &&
    script.includes("faceRecognitionStatus") &&
    script.includes("licensePlateStatus")
    ? "SAFE"
    : "FAIL",
  "Area Planner already tracks optional specialty zone results"
);

add(
  "not-standard-last-result-tool",
  !script.includes("scopedlabs:pipeline:last-result")
    ? "SAFE"
    : "WATCH",
  "Area Planner does not behave like a single-result pipeline calculator"
);

add(
  "registry-optional-branch-language",
  registry.includes("optional") &&
    registry.includes("face-recognition-range") &&
    registry.includes("license-plate-range")
    ? "SAFE"
    : "FAIL",
  "registry keeps optional branch language for Face/Plate"
);

console.table(rows);

const summary = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Summary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", summary.SAFE || 0);
console.log("- WATCH:", summary.WATCH || 0);
console.log("- FAIL:", summary.FAIL || 0);

if (summary.FAIL) {
  console.log("");
  console.log("Audit complete with FAIL items.");
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
