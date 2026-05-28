const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-optional-branch-return-audit-002-plate-complete-copy";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const faceIndex = read("tools/physical-security/face-recognition-range/index.html");
const faceScript = read("tools/physical-security/face-recognition-range/script.js");
const plateIndex = read("tools/physical-security/license-plate-range/index.html");
const pipelines = read("assets/pipelines.js");
const areaPlannerScript = read("tools/physical-security/area-planner/script.js");
const lensIndex = read("tools/physical-security/lens-selection/index.html");

console.log("");
console.log("Physical Security Optional Branch Return Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "face-continue-returns-area-planner",
  faceIndex.includes('id="continue"') &&
    faceIndex.includes('href="/tools/physical-security/area-planner/"') &&
    faceIndex.includes("Return &rarr; Area Planner")
    ? "SAFE"
    : "FAIL",
  "Face Recognition primary continue returns to Area Planner"
);

add(
  "face-no-primary-plate-continue",
  !faceIndex.includes('<a id="continue" class="btn btn-primary" href="/tools/physical-security/license-plate-range/">')
    ? "SAFE"
    : "FAIL",
  "Face Recognition no longer has a primary Continue to License Plate button"
);

add(
  "face-guidance-no-forced-plate",
  faceScript.includes('nextTool: "area-planner"') &&
    !faceScript.includes('nextTool: "license-plate-range"') &&
    faceScript.includes("return to Area Planner")
    ? "SAFE"
    : "FAIL",
  "Face Recognition guidance no longer forces License Plate as the next branch"
);

add(
  "face-export-handoff-updated",
  faceScript.includes("create or select a License Plate zone") &&
    !faceScript.includes("continue to License Plate")
    ? "SAFE"
    : "FAIL",
  "Face Recognition export handoff treats License Plate as a separate optional zone"
);

add(
  "face-local-cache-bumped",
  faceIndex.includes("face-recognition-guidance-event-bridge-optional-return-001")
    ? "SAFE"
    : "FAIL",
  "Face Recognition local script cache is bumped"
);

add(
  "plate-continue-returns-area-planner",
  plateIndex.includes('id="continue"') &&
    plateIndex.includes('href="/tools/physical-security/area-planner/"') &&
    plateIndex.includes("Return &rarr; Area Planner")
    ? "SAFE"
    : "FAIL",
  "License Plate primary continue returns to Area Planner"
);

add(
  "plate-no-category-return-primary",
  !plateIndex.includes('<a id="continue" class="btn btn-primary" href="/tools/physical-security/">')
    ? "SAFE"
    : "FAIL",
  "License Plate primary continue no longer returns only to the category page"
);

add(
  "plate-complete-card-optional",
  plateIndex.includes("Optional License Plate Branch Complete") &&
    plateIndex.includes("active Area Planner record") &&
    !plateIndex.includes("<strong>Pipeline Complete</strong>")
    ? "SAFE"
    : "FAIL",
  "License Plate completion copy reflects optional specialty branch behavior"
);

add(
  "pipeline-optional-metadata-preserved",
  pipelines.includes('id: "face-recognition-range"') &&
    pipelines.includes('id: "license-plate-range"') &&
    pipelines.includes('flowGroup: "optional-specialty-zone"') &&
    pipelines.includes("optional: true")
    ? "SAFE"
    : "FAIL",
  "Face and Plate remain optional specialty zones in pipeline metadata"
);

add(
  "area-planner-route-intent-preserved",
  areaPlannerScript.includes("function routeIntentUrl") &&
    areaPlannerScript.includes("/tools/physical-security/face-recognition-range/") &&
    areaPlannerScript.includes("/tools/physical-security/license-plate-range/")
    ? "SAFE"
    : "FAIL",
  "Area Planner route intent behavior remains intact"
);

add(
  "lens-selection-protected",
  !lensIndex.includes("physical-security-guidance-event-bridge") &&
    !lensIndex.includes("physical-security-category-guidance-renderer") &&
    !lensIndex.includes("physical-security-report-summary")
    ? "SAFE"
    : "FAIL",
  "Lens Selection remains protected from guidance bridge, visible renderer, and report summary helper"
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
