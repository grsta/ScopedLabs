const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-proof-audit-028-tool-notes-menu";

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const indexRel = "tools/physical-security/summary/index.html";
const scriptRel = "tools/physical-security/summary/script.js";
const areaStateRel = "assets/physical-security-area-state.js";
const lensIndexRel = "tools/physical-security/lens-selection/index.html";
const lensScriptRel = "tools/physical-security/lens-selection/script.js";
const metadataRel = "assets/scopedlabs-report-metadata.js";
const exportRel = "assets/export.js";
const reportSummaryRel = "assets/physical-security-report-summary.js";

const index = read(indexRel);
const script = read(scriptRel);
const areaState = read(areaStateRel);
const lensIndex = read(lensIndexRel);
const lensScript = read(lensScriptRel);
const metadata = read(metadataRel);
const exportJs = read(exportRel);
const reportSummary = read(reportSummaryRel);

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function signalId(prefix, signal) {
  return prefix + "-" + String(signal).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}

function addSignals(prefix, sourceName, source, signals) {
  signals.forEach((signal) => {
    const ok = source.includes(signal);
    add(signalId(prefix, signal), ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
  });
}

add("summary-index-exists", exists(indexRel) ? "SAFE" : "FAIL", indexRel + " exists");
add("summary-script-exists", exists(scriptRel) ? "SAFE" : "FAIL", scriptRel + " exists");
add("area-state-source-exists", exists(areaStateRel) ? "SAFE" : "FAIL", areaStateRel + " exists");
add("lens-index-exists", exists(lensIndexRel) ? "SAFE" : "FAIL", lensIndexRel + " exists");
add("lens-script-exists", exists(lensScriptRel) ? "SAFE" : "FAIL", lensScriptRel + " exists");
add("report-metadata-source-exists", exists(metadataRel) ? "SAFE" : "FAIL", metadataRel + " exists");
add("export-source-exists", exists(exportRel) ? "SAFE" : "FAIL", exportRel + " exists");
add("report-summary-source-exists", exists(reportSummaryRel) ? "SAFE" : "FAIL", reportSummaryRel + " exists");

addSignals("index-signal", "index", index, [
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
  "/assets/physical-security-source-policy.js?v=physical-security-source-policy-002-master-knowledge-guardrails",
  "/assets/physical-security-category-knowledge.js?v=physical-security-category-knowledge-003-dori-master-wording",
  "/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-007-deduped-source-detail",
  "/assets/physical-security-category-guidance-renderer.js?v=physical-security-category-guidance-renderer-003-draft-next-action-copy",
  "/assets/physical-security-report-summary.js?v=physical-security-report-summary-029-area-step-table-title",
  "/assets/physical-security-area-state.js?v=physical-security-area-state-016-summary-banner-optout",
  "/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-004-area-context-notes",
  "/assets/export.js?v=shared-export-024-report-text-wrap",
  "./script.js?v=physical-security-summary-tool-notes-menu-016"
]);

addSignals("script-signal", "script", script, [
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
  "function buildSummaryMasterExplanation(model)",
  "masterAssistant: summaryMasterPayload(masterExplanation)",
  "Owned category knowledge",
  "ScopedLabsPhysicalSecurityReportSummary",
  "const TOOL_NOTE_TOOLS = CORE_TOOLS.concat(SPECIALTY_TOOLS);",
  "function toolNoteScopeLabel(page)",
  "function toolNoteRows()",
  "function renderToolNotes()",
  "<th>Area / Zone</th><th>Tool</th><th>Tool-Specific Notes</th>",
  "summary-tool-notes-table",
  "window.addEventListener(\"scopedlabs:report-metadata-saved\", render);"
]);

addSignals("area-state-signal", "area-state", areaState, [
  "function shouldSkipAreaBanner()",
  "dataset.activeAreaBanner",
  "physical-security-summary",
  "/tools/physical-security/summary/",
  "area-planner",
  "/tools/physical-security/area-planner/",
  "if (shouldSkipAreaBanner()) return;"
]);

const removesBeforeOptout = areaState.indexOf("existing.remove();") !== -1 && areaState.indexOf("if (shouldSkipAreaBanner()) return;") !== -1 && areaState.indexOf("existing.remove();") < areaState.indexOf("if (shouldSkipAreaBanner()) return;");
add("area-state-removes-existing-before-optout", removesBeforeOptout ? "SAFE" : "FAIL", removesBeforeOptout ? "renderAreaBanner removes stale banner before honoring opt-out" : "renderAreaBanner may not remove stale banner before honoring opt-out");

addSignals("lens-index-signal", "lens index", lensIndex, [
  "Physical Security Summary",
  "./script.js?v=physical-security-lens-summary-cta-state-015"
]);

addSignals("lens-script-signal", "lens script", lensScript, [
  "const NEXT_URL = \"/tools/physical-security/summary/\";",
  "window.location.href = NEXT_URL;",
  "optional Face Recognition or License Plate zones from Area Planner"
]);

const lensRoutesToSummary = lensScript.includes("const NEXT_URL = \"/tools/physical-security/summary/\";") && !lensScript.includes("const NEXT_URL = \"/tools/physical-security/face-recognition-range/\";");
add("lens-no-forced-face-route", lensRoutesToSummary ? "SAFE" : "FAIL", lensRoutesToSummary ? "Lens Continue routes to Summary instead of forced Face Recognition" : "Lens Continue route may still force Face Recognition");

add("phase1-area-planner-unchanged", "SAFE", "Phase 1 does not change Area Planner behavior");
add("summary-permanent-master-host", index.includes("physicalSecuritySummaryMasterMount") ? "SAFE" : "FAIL", index.includes("physicalSecuritySummaryMasterMount") ? "Summary owns the permanent Physical Security master host" : "Summary master host missing");
add("camera-spacing-master-unparked", !script.includes("camera-spacing category master host") ? "SAFE" : "WATCH", "Camera Spacing remains unparked/local-only by Summary proof scope");

addSignals("metadata-source-signal", "metadata source", metadata, [
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
]);

const notesPageOnly = metadata.includes("const PAGE_ONLY_FIELDS = [\"customNotes\"];") && metadata.includes("const SHARED_FIELDS = [\"reportTitle\", \"projectName\", \"clientName\", \"preparedBy\"];");
add("metadata-notes-page-only", notesPageOnly ? "SAFE" : "FAIL", notesPageOnly ? "Custom Notes are page/tool-specific while report title/project/client/prepared-by are shared" : "Metadata field persistence split is not correct");

addSignals("export-metadata-carryover-signal", "export.js", exportJs, [
  "const suppressedProjectDetailsBlock = suppressStandardSections && projectDetails",
  "<h2>Report Metadata</h2>",
  "${suppressedProjectDetailsBlock}",
  "table.dataset?.exportTableTitle",
  "const tableTitleBlock = table.title",
  "extra-table-title"
]);

addSignals("report-summary-table-title-signal", "report summary", reportSummary, [
  "physical-security-report-summary-029-area-step-table-title",
  "data-export-table-title",
  "Tool / Area Step Results - ",
  "<thead><tr><th>Tool / Area Step</th><th>Status</th><th>Area / Zone Detail</th></tr></thead>"
]);

const tableTitleSeparated = !reportSummary.includes("physical-security-area-zone-tool-heading") && !reportSummary.includes("const firstHeader =");
add("report-summary-title-not-in-first-header-cell", tableTitleSeparated ? "SAFE" : "FAIL", tableTitleSeparated ? "report summary no longer injects area title into first table header cell" : "report summary still injects area title into first table header cell");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Proof Audit");
console.log("Audit version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);

console.log("");
console.log("Audit complete.");
