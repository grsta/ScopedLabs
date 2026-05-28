const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-core-optional-flow-audit-001-display-proof";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

const pipelines = read("assets/pipelines.js");
const pipeline = read("assets/pipeline.js");
const category = read("tools/physical-security/index.html");
const area = read("tools/physical-security/area-planner/index.html");
const lens = read("tools/physical-security/lens-selection/index.html");

console.log("");
console.log("Physical Security Core / Optional Flow Display Audit");
console.log("");
console.log("Audit version:", VERSION);

add("pipeline-metadata-foundation", pipelines.includes('flowGroup: "foundation"') && pipelines.includes("Area / Zone Planner") ? "SAFE" : "FAIL", "Physical Security pipeline marks Area Planner as foundation");
add("pipeline-metadata-core", count(pipelines, 'flowGroup: "core"') >= 8 ? "SAFE" : "FAIL", "Physical Security pipeline marks core area tools");
add("pipeline-metadata-optional", count(pipelines, 'flowGroup: "optional-specialty-zone"') === 2 && pipelines.includes("Face Recognition Zone") && pipelines.includes("License Plate Zone") ? "SAFE" : "FAIL", "Physical Security pipeline marks Face/Plate as optional specialty zones");

add("pipeline-renderer-group-support", pipeline.includes("function flowGroupFor(step)") && pipeline.includes("Optional specialty zones") ? "SAFE" : "FAIL", "shared pipeline renderer supports grouped flow rows");
add("pipeline-renderer-backward-compatible", pipeline.includes("if (hasFlowGroups)") && pipeline.includes("} else {") && pipeline.includes('row.setAttribute("aria-label", "Pipeline steps")') ? "SAFE" : "FAIL", "shared pipeline renderer keeps flat fallback for other categories");
add("pipeline-renderer-no-fetch", pipeline.includes("fetch(") ? "FAIL" : "SAFE", "pipeline renderer adds no runtime fetch");

add("category-preview-foundation", category.includes("Foundation") && category.includes("Area / Zone Planner") ? "SAFE" : "FAIL", "category preview shows foundation lane");
add("category-preview-core", category.includes("Core area pipeline") && category.includes("Lens Selection") ? "SAFE" : "FAIL", "category preview shows core pipeline ending at Lens Selection");
add("category-preview-optional", category.includes("Optional specialty zones") && category.includes("Face Recognition Zone") && category.includes("License Plate Zone") ? "SAFE" : "FAIL", "category preview separates optional specialty zones");
add("category-copy-zone-language", category.includes("doorway") && category.includes("driveway") && category.includes("vehicle validation") ? "SAFE" : "WATCH", "category copy explains specialty zones");

add("area-planner-not-guidance-wired", area.includes("physical-security-guidance-event-bridge.js") || area.includes("physical-security-category-guidance-renderer.js") ? "FAIL" : "SAFE", "Area Planner remains skipped from guidance bridge/visible renderer");
add("lens-selection-protected", lens.includes("physical-security-guidance-event-bridge.js") || lens.includes("physical-security-category-guidance-renderer.js") ? "FAIL" : "SAFE", "Lens Selection remains protected from guidance bridge/visible renderer");

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
