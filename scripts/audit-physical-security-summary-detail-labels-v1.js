const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-detail-labels-audit-002-action-next-steps";
const REPORT_VERSION = "physical-security-report-summary-026-area-step-caption";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "report summary version bumped");
safe("hfov-labeled", report.includes("Horizontal field of view (HFOV):") && report.includes("formatDegrees(text)"), "HFOV values are labeled with degrees");
safe("lens-labeled", report.includes("Selected lens:") && report.includes("formatMillimeters(text)"), "lens values are labeled as mm lens");
safe("pixel-density-labeled", report.includes("Pixel density:") && report.includes("formatPpf(text)"), "pixel density values are labeled as PPF");
safe("camera-count-labeled", report.includes("Camera count:") && report.includes("formatCameraCount(text)"), "camera count values are labeled");
safe("mounting-height-labeled", report.includes("Mounting height:") && report.includes("formatFeet(text)"), "mounting height values are labeled");
safe("target-distance-labeled", report.includes("Distance to target plane:") && report.includes("Protected span / scene width:"), "coverage distance/span values are labeled");
safe("specialty-distance-labeled", report.includes("Face recognition max distance:") && report.includes("License plate max distance:"), "specialty max distances are labeled");
safe("summary-text-preserved", report.includes("if (/summary|reason|note|description|interpretation/i.test(normalizedKey))") && report.includes("return text;"), "existing text summaries remain unchanged");
safe("top-priority-uses-labeled-detail", report.includes("Top priority interpretation") && report.includes("scopedPriorityItem.detail"), "top priority interpretation uses labeled detail");
safe("watch-risk-links-remain", report.includes("renderScopedToolLink(row)") && report.includes("data-sl-physical-security-scoped-tool-link"), "watch/risk tool links remain");

console.log("");
console.log("Physical Security Summary Detail Labels Audit");
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
