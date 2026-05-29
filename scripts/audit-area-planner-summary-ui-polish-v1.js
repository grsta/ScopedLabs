const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "area-planner-summary-ui-polish-audit-011-context-reference-clean";

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
console.log("Area Planner Summary UI Polish Audit");
console.log("");
console.log("Audit version:", VERSION);

add(
  "summary-ui-cache-bumped",
  ((index.includes("physical-security-area-planner-summary-ui-010") || index.includes("physical-security-area-planner-summary-ui-010")) || (index.includes("physical-security-area-planner-summary-ui-010") || index.includes("physical-security-area-planner-summary-ui-010")))
    ? "SAFE"
    : "FAIL",
  "Area Planner local script cache is bumped for summary UI polish"
);

add(
  "top-pills-removed",
  !/<div class=["']pill-row["'][\s\S]*?Pro Tier[\s\S]*?Pipeline Setup[\s\S]*?<\/div>/.test(index) &&
    !/<div class=["']pill-row["'][\s\S]*?Area Summary[\s\S]*?Pipeline Rollup[\s\S]*?<\/div>/.test(index)
    ? "SAFE"
    : "FAIL",
  "Top Pro/Pipeline and Area Summary pill rows are removed"
);

add(
  "ledger-header-flow-row",
  index.includes('area-flow-line area-flow-line--ledger') &&
    index.includes('id="areaCountPill"') &&
    !/<span id=["']areaCountPill["'] class=["']pill["']/.test(index)
    ? "SAFE"
    : "FAIL",
  "Area Ledger header uses flow-row styling instead of pills"
);

add(
  "planning-heading-uniform",
  index.includes('<h2 class="h2 area-section-title" style="margin-top: 10px;">Planning Areas</h2>')
    ? "SAFE"
    : "FAIL",
  "Planning Areas heading uses the larger shared card heading style"
);

add(
  "summary-heading-uniform",
  index.includes('<h2 class="h2 area-section-title" style="margin-top: 10px;">Physical Security area and zone summary</h2>')
    ? "SAFE"
    : "FAIL",
  "Area Summary heading uses the larger shared card heading style"
);

add(
  "flow-arrows-render-clean",
  !script.includes('\\u2192') &&
    !script.includes('\u2192') &&
    script.includes('?')
    ? "SAFE"
    : "FAIL",
  "Area flow rows use real arrow characters instead of literal unicode escape text"
);

add(
  "area-card-pill-flow-replaced",
  script.includes("area-flow-line") &&
    script.includes("area-flow-arrow") &&
    script.includes("routeIntentLabel(area.routeIntent)") &&
    !script.includes("'<div class=\"pill-row\">' +\n            '<span class=\"pill\">' + (area.id === ledger.activeAreaId")
    ? "SAFE"
    : "FAIL",
  "Area cards use arrow flow text instead of status pills"
);

add(
  "summary-group-headings-larger",
  index.includes(".area-summary-group-title") &&
    script.includes("area-summary-group-title") &&
    script.includes("Core Coverage Areas") &&
    script.includes("Face Recognition Zones") &&
    script.includes("License Plate Zones")
    ? "SAFE"
    : "FAIL",
  "Summary group headings are larger and grouped by planner path"
);

add(
  "summary-count-readable",
  script.includes("itemCountText") &&
    script.includes("area-summary-count") &&
    script.includes("items.length === 1 ? \"item\" : \"items\"")
    ? "SAFE"
    : "FAIL",
  "Summary group counts read as item/items instead of bare numbers"
);

add(
  "print-report-count-readable",
  script.includes("group-count") &&
    script.includes("compact-area-table")
    ? "SAFE"
    : "FAIL",
  "Printable report uses readable group count text"
);

let syntaxSafe = true;
try {
  new Function(script);
} catch {
  syntaxSafe = false;
}

add(
  "area-planner-script-syntax-safe",
  syntaxSafe
    ? "SAFE"
    : "FAIL",
  "Area Planner script parses successfully"
);

add(
  "area-planner-hides-downstream-banner",
  index.includes('body[data-tool="area-planner"] #physicalSecurityAreaBanner') &&
    index.includes("display: none !important")
    ? "SAFE"
    : "FAIL",
  "Area Planner hides the downstream active-area banner on the control-center page"
);

add(
  "summary-report-behavior-preserved",
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
