const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "area-planner-summary-report-audit-001";

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
const lensIndex = read("tools/physical-security/lens-selection/index.html");

console.log("");
console.log("Area Planner Summary Report Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "summary-cache-bumped",
  index.includes("physical-security-area-planner-summary-report-001")
    ? "SAFE"
    : "FAIL",
  "Area Planner local script cache is bumped for summary/report polish"
);

add(
  "summary-copy-updated",
  index.includes("Physical Security area and zone summary") &&
    index.includes("separates core coverage areas from optional Face Recognition and License Plate zones")
    ? "SAFE"
    : "FAIL",
  "Area Summary card copy reflects core/specialty zone planner behavior"
);

add(
  "route-group-helpers",
  script.includes("function areaRouteGroup") &&
    script.includes("function areaRouteGroupLabel") &&
    script.includes("function areaRouteGroupNote")
    ? "SAFE"
    : "FAIL",
  "Area Planner has route group helpers"
);

add(
  "summary-model-grouped",
  script.includes("groupCounts") &&
    script.includes("groupedAreas") &&
    script.includes("activeAreaId") &&
    script.includes("keyResult")
    ? "SAFE"
    : "FAIL",
  "Summary model stores grouped areas, active area, and key saved results"
);

add(
  "in-page-summary-groups",
  script.includes("data-area-summary-group") &&
    script.includes("Core Coverage Areas") &&
    script.includes("Face Recognition Zones") &&
    script.includes("License Plate Zones")
    ? "SAFE"
    : "FAIL",
  "In-page summary separates core, face, and plate groups"
);

add(
  "in-page-compact-columns",
  script.includes("Area / Zone") &&
    script.includes("Selected") &&
    script.includes("Checks") &&
    script.includes("Key Saved Result") &&
    script.includes("Next Action")
    ? "SAFE"
    : "FAIL",
  "In-page summary uses compact planner columns"
);

add(
  "print-report-groups",
  script.includes("data-area-report-group") &&
    script.includes("compact-area-table") &&
    script.includes("model.groupCounts.core") &&
    script.includes("model.groupCounts.face") &&
    script.includes("model.groupCounts.plate")
    ? "SAFE"
    : "FAIL",
  "Printable report separates grouped area/zone sections"
);

add(
  "print-copy-actions-preserved",
  script.includes("function printAreaSummary") &&
    script.includes("function copyAreaSummaryJson") &&
    script.includes("openAreaSummaryReportWindow")
    ? "SAFE"
    : "FAIL",
  "Print and copy summary actions remain wired"
);

add(
  "route-intent-preserved",
  script.includes("function routeIntentUrl") &&
    script.includes("/tools/physical-security/face-recognition-range/") &&
    script.includes("/tools/physical-security/license-plate-range/")
    ? "SAFE"
    : "FAIL",
  "Area Planner route intent behavior remains intact"
);

add(
  "button-scroll-preserved",
  script.includes("scrollToAreaEditForm();") &&
    script.includes("scrollToAreaContinue();")
    ? "SAFE"
    : "FAIL",
  "Area Planner Edit/Use scroll feedback remains intact"
);

add(
  "no-guidance-bridge-added",
  !index.includes("physical-security-guidance-event-bridge") &&
    !index.includes("physical-security-category-guidance-renderer") &&
    !index.includes("physical-security-report-summary")
    ? "SAFE"
    : "FAIL",
  "Area Planner remains skipped from guidance bridge, visible renderer, and report summary helper"
);

add(
  "lens-selection-protected",
  !lensIndex.includes("physical-security-guidance-event-bridge") &&
    !lensIndex.includes("physical-security-category-guidance-renderer") &&
    !lensIndex.includes("physical-security-report-summary")
    ? "SAFE"
    : "FAIL",
  "Lens Selection remains protected"
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
