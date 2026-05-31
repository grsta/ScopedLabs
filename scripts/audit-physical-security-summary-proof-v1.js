const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-proof-audit-017-tool-notes-area-context";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

const indexRel = "tools/physical-security/summary/index.html";
const scriptRel = "tools/physical-security/summary/script.js";
const areaStateRel = "assets/physical-security-area-state.js";
const lensIndexRel = "tools/physical-security/lens-selection/index.html";
const lensScriptRel = "tools/physical-security/lens-selection/script.js";
const metadataRel = "assets/scopedlabs-report-metadata.js";
const exportRel = "assets/export.js";

const index = read(indexRel);
const script = read(scriptRel);
const areaState = read(areaStateRel);
const lensIndex = read(lensIndexRel);
const lensScript = read(lensScriptRel);
const metadata = read(metadataRel);
const exportJs = read(exportRel);

add("summary-index-exists", exists(indexRel) ? "SAFE" : "FAIL", indexRel + " exists");
add("summary-script-exists", exists(scriptRel) ? "SAFE" : "FAIL", scriptRel + " exists");
add("area-state-source-exists", exists(areaStateRel) ? "SAFE" : "FAIL", areaStateRel + " exists");
add("lens-index-exists", exists(lensIndexRel) ? "SAFE" : "FAIL", lensIndexRel + " exists");
add("lens-script-exists", exists(lensScriptRel) ? "SAFE" : "FAIL", lensScriptRel + " exists");
add("report-metadata-source-exists", exists(metadataRel) ? "SAFE" : "FAIL", metadataRel + " exists");
add("export-source-exists", exists(exportRel) ? "SAFE" : "FAIL", exportRel + " exists");
add("summary-export-exists", exists(exportRel) ? "SAFE" : "FAIL", exportRel + " exists");

[
  "Physical Security Summary",
  "physicalSecuritySummaryMasterMount",
  "physicalSecurityScopeMount",
  "physicalSecurityReportMount",
  "physicalSecurityCrossCategoryPayload",
  "hidden aria-hidden=\"true\"",
  "summaryExportSection",
  "physicalSecurityToolNotesSection",
  "physicalSecurityToolNotesMount",
  "data-export-title=\"Physical Security Tool Notes\"",
  "data-export-section",
  "data-active-area-banner=\"off\"",
  "/assets/physical-security-guidance-memory.js",
  "/assets/physical-security-category-guidance.js",
  "/assets/physical-security-category-guidance-renderer.js",
  "/assets/physical-security-report-summary.js",
  "/assets/physical-security-area-state.js?v=physical-security-area-state-016-summary-banner-optout",
  "/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-004-area-context-notes",
  "/assets/export.js?v=shared-export-020-summary-metadata-carryover",
  "/assets/export.js?v=shared-export-020-summary-metadata-carryover",
  "./script.js?v=physical-security-summary-tool-notes-area-context-013"
].forEach((signal) => {
  add("index-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), index.includes(signal) ? "SAFE" : "FAIL", index.includes(signal) ? "index contains " + signal : "index missing " + signal);
});

[
  "ScopedLabsPhysicalSecuritySummaryPage",
  "scopedlabs.category-summary.v1",
  "crossCategoryReady: true",
  "core-coverage",
  "face-recognition-zone",
  "license-plate-zone",
  "network-poe",
  "power-runtime",
  "storage-retention",
  "access-control-doors",
  "ScopedLabsPhysicalSecurityGuidanceMemory",
  "ScopedLabsPhysicalSecurityCategoryGuidanceRenderer",
  "ScopedLabsPhysicalSecurityReportSummary"
].forEach((signal) => {
  add("script-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), script.includes(signal) ? "SAFE" : "FAIL", script.includes(signal) ? "script contains " + signal : "script missing " + signal);
});

[
  "function shouldSkipAreaBanner()",
  "dataset.activeAreaBanner",
  "physical-security-summary",
  "/tools/physical-security/summary/",
  "area-planner",
  "/tools/physical-security/area-planner/",
  "if (shouldSkipAreaBanner()) return;"
].forEach((signal) => {
  add("area-state-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), areaState.includes(signal) ? "SAFE" : "FAIL", areaState.includes(signal) ? "area-state contains " + signal : "area-state missing " + signal);
});

add(
  "area-state-removes-existing-before-optout",
  /const existing = document\.getElementById\("physicalSecurityAreaBanner"\);[\s\S]*?if \(existing\) existing\.remove\(\);[\s\S]*?if \(shouldSkipAreaBanner\(\)\) return;/.test(areaState) ? "SAFE" : "FAIL",
  /const existing = document\.getElementById\("physicalSecurityAreaBanner"\);[\s\S]*?if \(existing\) existing\.remove\(\);[\s\S]*?if \(shouldSkipAreaBanner\(\)\) return;/.test(areaState)
    ? "renderAreaBanner removes stale banner before honoring opt-out"
    : "renderAreaBanner does not remove stale banner before opt-out"
);

[
  "Continue → Physical Security Summary",
  "./script.js?v=physical-security-lens-summary-cta-state-015"
].forEach((signal) => {
  add("lens-index-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), lensIndex.includes(signal) ? "SAFE" : "FAIL", lensIndex.includes(signal) ? "lens index contains " + signal : "lens index missing " + signal);
});

[
  "const NEXT_URL = \"/tools/physical-security/summary/\";",
  "window.location.href = NEXT_URL;",
  "optional Face Recognition or License Plate zones from Area Planner"
].forEach((signal) => {
  add("lens-script-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), lensScript.includes(signal) ? "SAFE" : "FAIL", lensScript.includes(signal) ? "lens script contains " + signal : "lens script missing " + signal);
});

add(
  "lens-no-forced-face-route",
  !lensScript.includes("const NEXT_URL = \"/tools/physical-security/face-recognition-range/\";") && !lensIndex.includes("Continue → Face Recognition") ? "SAFE" : "FAIL",
  !lensScript.includes("const NEXT_URL = \"/tools/physical-security/face-recognition-range/\";") && !lensIndex.includes("Continue → Face Recognition")
    ? "Lens Continue routes to Summary instead of forced Face Recognition"
    : "Lens still contains forced Face Recognition route or label"
);

const area = read("tools/physical-security/area-planner/index.html");
const spacing = read("tools/physical-security/camera-spacing/index.html");

add("phase1-area-planner-unchanged", !area.includes("physical-security-summary") ? "SAFE" : "WATCH", !area.includes("physical-security-summary") ? "Phase 1 does not change Area Planner behavior" : "Area Planner already references Summary");
add("summary-permanent-master-host", index.includes("physicalSecuritySummaryMasterMount") && index.includes("/assets/physical-security-category-guidance-renderer.js") ? "SAFE" : "FAIL", index.includes("physicalSecuritySummaryMasterMount") && index.includes("/assets/physical-security-category-guidance-renderer.js") ? "Summary owns the permanent Physical Security master host" : "Summary is missing the permanent master host wiring");
add("camera-spacing-master-unparked", !spacing.includes("physical-security-category-guidance-renderer.js") && !spacing.includes("physical-security-category-guidance-mount") ? "SAFE" : "FAIL", !spacing.includes("physical-security-category-guidance-renderer.js") && !spacing.includes("physical-security-category-guidance-mount") ? "Camera Spacing no longer hosts the full master renderer" : "Camera Spacing still contains full master renderer wiring");


[
  "const suppressedProjectDetailsBlock = suppressStandardSections && projectDetails",
  "<h2>Report Metadata</h2>",
  "${suppressedProjectDetailsBlock}"
].forEach((signal) => {
  add("export-metadata-carryover-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), exportJs.includes(signal) ? "SAFE" : "FAIL", exportJs.includes(signal) ? "export.js contains " + signal : "export.js missing " + signal);
});

// physical-security-summary-report-metadata-shared-page-notes-audit-014
[
  "scopedlabs-report-metadata-004-area-context-notes",
  "const SHARED_STORAGE_KEY = \"scopedlabs:report-metadata:shared:v1\";",
  "const PAGE_STORAGE_PREFIX = \"scopedlabs:report-metadata:page:\";",
  "const SHARED_FIELDS = [\"reportTitle\", \"projectName\", \"clientName\", \"preparedBy\"];",
  "const PAGE_ONLY_FIELDS = [\"customNotes\"];",
  "function hydrateControls(root = document)",
  "function currentAreaContext()",
  "function pageStorageKey()",
  "scopeLabel",
  "function bindPersistence(root = document)",
  "scopedlabs:report-metadata-saved"
].forEach((signal) => {
  add("metadata-source-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), metadata.includes(signal) ? "SAFE" : "FAIL", metadata.includes(signal) ? "metadata source contains " + signal : "metadata source missing " + signal);
});

add(
  "metadata-notes-page-only",
  metadata.includes("const PAGE_ONLY_FIELDS = [\"customNotes\"];") && metadata.includes("const SHARED_FIELDS = [\"reportTitle\", \"projectName\", \"clientName\", \"preparedBy\"];") ? "SAFE" : "FAIL",
  metadata.includes("const PAGE_ONLY_FIELDS = [\"customNotes\"];") && metadata.includes("const SHARED_FIELDS = [\"reportTitle\", \"projectName\", \"clientName\", \"preparedBy\"];")
    ? "Custom Notes are page/tool-specific while report title/project/client/prepared-by are shared"
    : "Metadata field persistence split is not correct"
);

[
  "const suppressedProjectDetailsBlock = suppressStandardSections && projectDetails",
  "<h2>Report Metadata</h2>",
  "${suppressedProjectDetailsBlock}"
].forEach((signal) => {
  add("export-metadata-carryover-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""), exportJs.includes(signal) ? "SAFE" : "FAIL", exportJs.includes(signal) ? "export.js contains " + signal : "export.js missing " + signal);
});

console.log("");
console.log("Physical Security Summary Proof Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
