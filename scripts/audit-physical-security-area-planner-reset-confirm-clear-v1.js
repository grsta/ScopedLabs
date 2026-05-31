const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-area-planner-reset-confirm-clear-audit-001";
const CACHE = "physical-security-area-planner-reset-confirm-clear-020";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const index = read("tools/physical-security/area-planner/index.html");
const script = read("tools/physical-security/area-planner/script.js");
const summaryLinkAudit = fs.existsSync(path.join(ROOT, "scripts/audit-physical-security-area-planner-summary-link-v1.js"))
  ? read("scripts/audit-physical-security-area-planner-summary-link-v1.js")
  : "";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("index-cache", "Area Planner index", index, "./script.js?v=" + CACHE);
has("index-marker", "Area Planner index", index, "physical-security-area-planner-reset-confirm-clear-020");
has("reset-button-present", "Area Planner index", index, 'id="resetAreas"');

has("confirm-helper", "Area Planner script", script, "function confirmResetAreaPlan()");
has("confirm-title", "Area Planner script", script, "Reset Area Plan?");
has("confirm-destructive-copy", "Area Planner script", script, "delete all saved Physical Security areas/zones");
has("confirm-summary-copy", "Area Planner script", script, "clear the current Physical Security pipeline memory used by the Summary page");
has("confirm-snapshot-safety", "Area Planner script", script, "This does not delete saved account snapshots.");
has("confirm-cancel-guard", "Area Planner script", script, "if (!confirmResetAreaPlan())");
has("cancel-status", "Area Planner script", script, "Area plan reset canceled.");

has("clear-memory-helper", "Area Planner script", script, "function clearPhysicalSecurityPlanningMemory()");
has("pipeline-prefix-clear", "Area Planner script", script, 'const pipelinePrefix = "scopedlabs:pipeline:physical-security:";');
has("guidance-memory-clear", "Area Planner script", script, 'const guidanceMemoryKey = "scopedlabs:physical-security:guidance-memory:v1";');
has("report-page-prefix", "Area Planner script", script, 'const prefix = "scopedlabs:report-metadata:page:";');
has("physical-security-page-filter", "Area Planner script", script, '/tools/physical-security/');
has("tool-notes-cleared", "Area Planner script", script, "removePhysicalSecurityReportPageMetadata(storage)");
has("guidance-api-clear", "Area Planner script", script, "ScopedLabsPhysicalSecurityGuidanceMemory?.clearAll?.()");
has("guidance-clear-event", "Area Planner script", script, "scopedlabs:physical-security-guidance-cleared");
has("metadata-event", "Area Planner script", script, "scopedlabs:report-metadata-saved");

has("ledger-empty-write", "Area Planner script", script, "areas: []");
has("reset-status-expanded", "Area Planner script", script, "Physical Security areas, guidance memory, and Summary tool notes were cleared");
has("reset-binding-preserved", "Area Planner script", script, 'els.resetAreas?.addEventListener("click", resetAreas);');

add(
  "shared-report-metadata-preserved",
  !script.includes("scopedlabs:report-metadata:shared:v1") ? "SAFE" : "FAIL",
  !script.includes("scopedlabs:report-metadata:shared:v1")
    ? "Reset does not target shared report metadata"
    : "Reset targets shared report metadata"
);

add(
  "account-snapshots-preserved",
  !script.toLowerCase().includes("snapshot") || script.includes("This does not delete saved account snapshots.") ? "SAFE" : "FAIL",
  "Reset confirmation protects saved account snapshots"
);

if (summaryLinkAudit) {
  has("summary-link-audit-cache", "Area Planner summary-link audit", summaryLinkAudit, CACHE);
  has("summary-link-audit-version", "Area Planner summary-link audit", summaryLinkAudit, "physical-security-area-planner-summary-button-retired-audit-002-reset-confirm-clear");
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Area Planner Reset Confirm/Clear Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
