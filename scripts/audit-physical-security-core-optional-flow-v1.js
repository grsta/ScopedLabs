const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-core-optional-flow-audit-004-lens-summary-route";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasAny(text, values) {
  return values.some((value) => text.includes(value));
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

const pipelines = read("assets/pipelines.js");
const pipeline = read("assets/pipeline.js");
const category = read("tools/physical-security/index.html");
const areaPlanner = read("tools/physical-security/area-planner/index.html");
const lensSelection = read("tools/physical-security/lens-selection/index.html");

const coreSlugs = [
  "scene-illumination",
  "mounting-height",
  "field-of-view",
  "camera-coverage-area",
  "camera-spacing",
  "blind-spot-check",
  "pixel-density",
  "lens-selection"
];

const optionalSlugs = [
  "face-recognition-range",
  "license-plate-range"
];

console.log("");
console.log("Physical Security Core / Optional Flow Display Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "pipeline-metadata-foundation",
  pipelines.includes("area-planner") && hasAny(pipelines, ['flowGroup: "foundation"', "flowGroup: 'foundation'"])
    ? "SAFE"
    : "FAIL",
  "Physical Security pipeline marks Area Planner as foundation"
);

add(
  "pipeline-metadata-core",
  coreSlugs.every((slug) => pipelines.includes(slug)) &&
    countMatches(pipelines, /flowGroup\s*:\s*["']core["']/g) >= coreSlugs.length
    ? "SAFE"
    : "FAIL",
  "Physical Security pipeline marks core area tools"
);

add(
  "pipeline-metadata-optional",
  optionalSlugs.every((slug) => pipelines.includes(slug)) &&
    countMatches(pipelines, /flowGroup\s*:\s*["']optional-specialty-zone["']/g) >= optionalSlugs.length &&
    pipelines.includes("optional: true")
    ? "SAFE"
    : "FAIL",
  "Physical Security pipeline marks Face/Plate as optional specialty zones"
);

add(
  "pipeline-renderer-group-support",
  pipeline.includes("function flowGroupFor(step)") &&
    pipeline.includes("optional-specialty-zone") &&
    pipeline.includes("Core area pipeline")
    ? "SAFE"
    : "FAIL",
  "shared pipeline renderer supports grouped flow rows"
);

add(
  "pipeline-renderer-backward-compatible",
  pipeline.includes("hasFlowGroups") &&
    pipeline.includes("pipeline-step") &&
    pipeline.includes("currentIndex")
    ? "SAFE"
    : "FAIL",
  "shared pipeline renderer keeps flat fallback for other categories"
);

add(
  "pipeline-renderer-no-fetch",
  pipeline.includes("fetch(") ? "FAIL" : "SAFE",
  "pipeline renderer adds no runtime fetch"
);

add(
  "pipeline-separator-unicode-arrow",
  /arrow\.textContent\s*=\s*["']\\u2192["'];/.test(pipeline) &&
    !pipeline.includes('arrow.textContent = "->";') &&
    !pipeline.includes('arrow.textContent = "?";')
    ? "SAFE"
    : "FAIL",
  "shared pipeline uses source-safe Unicode arrow separators"
);

add(
  "optional-branch-progress-isolated",
  pipeline.includes('currentGroup !== "optional-specialty-zone"')
    ? "SAFE"
    : "FAIL",
  "optional specialty zone pages do not mark the core pipeline as completed by flat index"
);

add(
  "pipeline-descriptions-include-individual-tool",
  pipeline.includes("select an individual core tool") &&
    pipeline.includes("select an individual specialty tool")
    ? "SAFE"
    : "FAIL",
  "core and optional descriptions explain direct tool selection"
);

add(
  "category-preview-foundation",
  category.includes("Foundation") && category.includes("Area / Zone Planner")
    ? "SAFE"
    : "FAIL",
  "category preview shows foundation lane"
);

add(
  "category-preview-core",
  category.includes("Core area pipeline") && category.includes("Lens Selection")
    ? "SAFE"
    : "FAIL",
  "category preview shows core pipeline ending at Lens Selection"
);

add(
  "category-preview-optional",
  category.includes("Optional specialty zones") &&
    category.includes("Face Recognition Zone") &&
    category.includes("License Plate Zone")
    ? "SAFE"
    : "FAIL",
  "category preview separates optional specialty zones"
);

add(
  "category-copy-zone-language",
  category.includes("specialty zones") || category.includes("specialty zone")
    ? "SAFE"
    : "FAIL",
  "category copy explains specialty zones"
);

add(
  "area-planner-not-guidance-wired",
  areaPlanner &&
    !areaPlanner.includes("physical-security-guidance-event-bridge") &&
    !areaPlanner.includes("physical-security-category-guidance-renderer")
    ? "SAFE"
    : "FAIL",
  "Area Planner remains skipped from guidance bridge/visible renderer"
);

add(
  "lens-selection-summary-aligned",
  lensSelection &&
    (
      lensSelection.includes("/tools/physical-security/summary/") ||
      lensSelection.includes("Physical Security Summary") ||
      lensSelection.includes("Open Physical Security Summary")
    )
    ? "SAFE"
    : "FAIL",
  "Lens Selection is intentionally unlocked and aligned to the Summary route"
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
