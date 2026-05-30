const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-proof-audit-001";

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
const index = read(indexRel);
const script = read(scriptRel);

add("summary-index-exists", exists(indexRel) ? "SAFE" : "FAIL", indexRel + " exists");
add("summary-script-exists", exists(scriptRel) ? "SAFE" : "FAIL", scriptRel + " exists");

[
  "Physical Security Summary",
  "physicalSecuritySummaryMasterMount",
  "physicalSecurityScopeMount",
  "physicalSecurityReportMount",
  "physicalSecurityCrossCategoryPayload",
  "summaryExportSection",
  "data-export-section",
  "/assets/physical-security-guidance-memory.js",
  "/assets/physical-security-category-guidance.js",
  "/assets/physical-security-category-guidance-renderer.js",
  "/assets/physical-security-report-summary.js",
  "./script.js?v=physical-security-summary-proof-001"
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

const lens = read("tools/physical-security/lens-selection/index.html");
const area = read("tools/physical-security/area-planner/index.html");
const spacing = read("tools/physical-security/camera-spacing/index.html");

add("phase1-lens-routing-unchanged", !lens.includes("/tools/physical-security/summary/") ? "SAFE" : "WATCH", !lens.includes("/tools/physical-security/summary/") ? "Phase 1 does not change Lens routing" : "Lens already references Summary");
add("phase1-area-planner-unchanged", !area.includes("physical-security-summary") ? "SAFE" : "WATCH", !area.includes("physical-security-summary") ? "Phase 1 does not change Area Planner behavior" : "Area Planner already references Summary");
add("phase1-camera-spacing-master-proof-remains", spacing.includes("physical-security-category-guidance-renderer.js") ? "SAFE" : "WATCH", spacing.includes("physical-security-category-guidance-renderer.js") ? "Camera Spacing master proof host remains for Phase 1" : "Camera Spacing master proof host not found");

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
