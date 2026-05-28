const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "license-plate-active-area-distance-audit-001";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const script = read("tools/physical-security/license-plate-range/script.js");
const index = read("tools/physical-security/license-plate-range/index.html");

console.log("");
console.log("License Plate Active Area Distance Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "plate-reads-active-area",
  script.includes("function getActivePlateArea") &&
    script.includes("ScopedLabsPhysicalSecurityAreaState") &&
    script.includes("api.getActiveArea()")
    ? "SAFE"
    : "FAIL",
  "License Plate reads the active Area Planner area"
);

add(
  "area-distance-source-exists",
  script.includes("dist: num(area?.distanceToTargetPlaneFt ?? area?.faceRecognitionActualDistanceFt ?? DEFAULTS.dist)")
    ? "SAFE"
    : "FAIL",
  "License Plate area import model includes Area Planner distance"
);

add(
  "active-area-distance-wins",
  script.includes("const dist = num(areaValues.dist ?? prev.actualDist ?? prev.dist);") &&
    !script.includes("const dist = num(prev.actualDist ?? prev.dist ?? areaValues.dist);")
    ? "SAFE"
    : "FAIL",
  "Active area distance overrides previous Face result distance"
);

add(
  "distance-input-uses-selected-dist",
  script.includes("if (Number.isFinite(dist) && dist > 0 && els.dist) els.dist.value = String(Number(dist.toFixed(1)));")
    ? "SAFE"
    : "FAIL",
  "Distance input is populated from the selected import distance"
);

add(
  "flow-note-arrow-fixed",
  script.includes("Face / area results detected \\u2192 ") &&
    !script.includes("Face / area results detected ? ")
    ? "SAFE"
    : "FAIL",
  "License Plate flow note uses source-safe arrow text"
);

add(
  "local-script-cache-bumped",
  index.includes("physical-security-license-plate-area-distance-001")
    ? "SAFE"
    : "FAIL",
  "License Plate local script cache is bumped"
);

add(
  "guidance-bridge-preserved",
  index.includes("physical-security-guidance-event-bridge") &&
    script.includes("publishLicensePlateGuidanceEvent")
    ? "SAFE"
    : "FAIL",
  "License Plate guidance event publishing remains present"
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
