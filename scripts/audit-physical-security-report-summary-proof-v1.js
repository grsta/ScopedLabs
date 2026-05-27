const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const VERSION = "physical-security-report-summary-proof-audit-001";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return "";
  return fs.readFileSync(abs, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

const assetRel = "assets/physical-security-report-summary.js";
const cameraIndexRel = "tools/physical-security/camera-spacing/index.html";
const areaIndexRel = "tools/physical-security/area-planner/index.html";
const lensIndexRel = "tools/physical-security/lens-selection/index.html";
const exportRel = "assets/export.js";

const asset = read(assetRel);
const cameraIndex = read(cameraIndexRel);
const areaIndex = read(areaIndexRel);
const lensIndex = read(lensIndexRel);
const exportJs = read(exportRel);

console.log("");
console.log("Physical Security Report Summary Proof Audit");
console.log("");
console.log("Audit version:", VERSION);

add("summary-asset-exists", exists(assetRel) ? "SAFE" : "FAIL", exists(assetRel) ? "summary helper asset exists" : "summary helper asset missing");
add("summary-version", asset.includes("physical-security-report-summary-003-inline-export-slot") ? "SAFE" : "FAIL", "summary helper version marker");
add("summary-global", asset.includes("ScopedLabsPhysicalSecurityReportSummary") ? "SAFE" : "FAIL", "summary helper exposes expected global");
add("summary-build-api", asset.includes("buildSummary") && asset.includes("renderExportHtml") && asset.includes("renderReportText") ? "SAFE" : "FAIL", "summary helper exposes report APIs");
add("summary-no-runtime-fetch", asset.includes("fetch(") ? "FAIL" : "SAFE", asset.includes("fetch(") ? "summary helper contains runtime fetch" : "summary helper does not add runtime fetch");

add("export-engine-untouched-seam", exportJs.includes('extraSectionSelector: "[data-export-section]"') ? "SAFE" : "FAIL", "shared export engine still uses export-only section seam");

add("camera-spacing-loads-summary-helper", cameraIndex.includes("physical-security-report-summary.js?v=physical-security-report-summary-003-inline-export-slot") ? "SAFE" : "FAIL", "Camera Spacing loads report summary helper");
add("camera-spacing-summary-helper-singleton", count(cameraIndex, "physical-security-report-summary.js") === 1 ? "SAFE" : "FAIL", "Camera Spacing summary helper script count=" + count(cameraIndex, "physical-security-report-summary.js"));
add("camera-spacing-existing-export-section", cameraIndex.includes('id="spacingExportSection"') && cameraIndex.includes("data-export-section") ? "SAFE" : "FAIL", "Camera Spacing keeps existing export-only section");
add("summary-inline-slot-api", asset.includes("physicalSecurityReportSummaryExportSlot") && asset.includes("findOrCreateExportSlot") ? "SAFE" : "FAIL", "summary helper injects into existing exported spacingExportSection");

add("camera-spacing-existing-visible-renderer-preserved", cameraIndex.includes("physical-security-category-guidance-renderer.js") && cameraIndex.includes("physical-security-category-guidance-renderer.css") ? "SAFE" : "FAIL", "Camera Spacing visible renderer proof remains loaded");
add("area-planner-not-wired", areaIndex.includes("physical-security-report-summary.js") ? "FAIL" : "SAFE", "Area Planner does not load report summary helper");
add("lens-selection-protected", lensIndex.includes("physical-security-report-summary.js") ? "FAIL" : "SAFE", "Lens Selection does not load report summary helper");

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
