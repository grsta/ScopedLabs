const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "area-planner-button-scroll-audit-004-summary-ui-cache";

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
console.log("Area Planner Button Scroll Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "scroll-helper-exists",
  script.includes("function scrollAreaPlannerTarget") &&
    script.includes("scrollIntoView") &&
    script.includes('behavior: "smooth"')
    ? "SAFE"
    : "FAIL",
  "Area Planner has smooth scroll helper"
);

add(
  "edit-scroll-helper",
  script.includes("function scrollToAreaEditForm") &&
    script.includes('"toolCard"') &&
    script.includes('focusId: "areaName"')
    ? "SAFE"
    : "FAIL",
  "Edit action scrolls to Planning Inputs and focuses Area Name"
);

add(
  "use-scroll-helper",
  script.includes("function scrollToAreaContinue") &&
    script.includes('"areaPlannerFlowActions"')
    ? "SAFE"
    : "FAIL",
  "Use Area action scrolls to the continue/action row"
);

add(
  "edit-handler-calls-scroll",
  script.includes("[data-edit-area]") &&
    script.includes("scrollToAreaEditForm();")
    ? "SAFE"
    : "FAIL",
  "Edit handler calls scroll after loading the selected area"
);

add(
  "use-handler-calls-scroll",
  script.includes("[data-use-area]") &&
    script.includes("scrollToAreaContinue();")
    ? "SAFE"
    : "FAIL",
  "Use Area handler calls scroll after setting the active area"
);

add(
  "cache-bumped",
  (index.includes("physical-security-area-planner-button-scroll-002") || index.includes("physical-security-area-planner-summary-ui-015") || index.includes("physical-security-area-planner-summary-report-001") || index.includes("physical-security-area-planner-summary-ui-015"))
    ? "SAFE"
    : "FAIL",
  "Area Planner local script cache is bumped"
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
  "no-guidance-bridge-added",
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
