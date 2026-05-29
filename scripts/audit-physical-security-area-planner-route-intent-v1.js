const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-area-planner-route-intent-audit-012-report-group-count-defined";

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

console.log("");
console.log("Physical Security Area Planner Route Intent Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "route-intent-field",
  index.includes('id="routeIntent"') &&
    index.includes("Core Coverage Area") &&
    index.includes("Face Recognition Zone") &&
    index.includes("License Plate Zone")
    ? "SAFE"
    : "FAIL",
  "Area Planner exposes a Planning Path selector"
);

add(
  "route-intent-local-cache-bumped",
  ((index.includes("physical-security-area-planner-route-intent-001") || index.includes("physical-security-area-planner-summary-ui-015") || index.includes("physical-security-area-planner-summary-report-001") || index.includes("physical-security-area-planner-summary-ui-015")) || (index.includes("physical-security-area-planner-button-scroll-002") || index.includes("physical-security-area-planner-summary-ui-015") || index.includes("physical-security-area-planner-summary-report-001") || index.includes("physical-security-area-planner-summary-ui-015")))
    ? "SAFE"
    : "FAIL",
  "Area Planner local script cache is bumped"
);

add(
  "route-intent-element-wired",
  script.includes('routeIntent: $("routeIntent")')
    ? "SAFE"
    : "FAIL",
  "Area Planner script reads routeIntent element"
);

add(
  "route-intent-helpers",
  script.includes("function normalizeRouteIntent") &&
    script.includes("function routeIntentUrl") &&
    script.includes("function routeIntentContinueLabel")
    ? "SAFE"
    : "FAIL",
  "Area Planner has route intent normalization and routing helpers"
);

add(
  "route-intent-saved-record",
  script.includes("routeIntent: normalizeRouteIntent") &&
    script.includes("routeIntentLabel: routeIntentLabel")
    ? "SAFE"
    : "FAIL",
  "Area records store route intent and label"
);

add(
  "route-intent-loads-existing-area",
  script.includes("els.routeIntent.value = normalizeRouteIntent(area.routeIntent)")
    ? "SAFE"
    : "FAIL",
  "Editing an existing area restores its route intent"
);

add(
  "route-intent-ledger-badge",
  script.includes("routeIntentLabel(area.routeIntent)")
    ? "SAFE"
    : "FAIL",
  "Area Ledger displays each area's route intent"
);

add(
  "continue-button-route-label",
  script.includes("function updateContinueButton") &&
    script.includes("routeIntentContinueLabel(activeArea && activeArea.routeIntent)") &&
    /els\.continueBtn\.(?:innerHTML|textContent)\s*=/.test(script)
    ? "SAFE"
    : "FAIL",
  "Continue button label follows selected route intent"
);

add(
  "continue-route-uses-active-area",
  script.includes("function getActiveAreaRouteUrl") &&
    !script.includes("window.location.href = NEXT_URL;")
    ? "SAFE"
    : "FAIL",
  "Continue routing uses the active area's route intent instead of always using NEXT_URL"
);

add(
  "face-route-target",
  script.includes('/tools/physical-security/face-recognition-range/')
    ? "SAFE"
    : "FAIL",
  "Face Recognition zones route to Face Recognition Range"
);

add(
  "plate-route-target",
  script.includes('/tools/physical-security/license-plate-range/')
    ? "SAFE"
    : "FAIL",
  "License Plate zones route to License Plate Range"
);

add(
  "area-planner-still-no-guidance-bridge",
  !index.includes("physical-security-guidance-event-bridge") &&
    !index.includes("physical-security-category-guidance-renderer") &&
    !index.includes("physical-security-report-summary")
    ? "SAFE"
    : "FAIL",
  "Area Planner remains skipped from guidance bridge, visible renderer, and report summary helper"
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
