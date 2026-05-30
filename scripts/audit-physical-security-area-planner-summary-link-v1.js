const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-area-planner-summary-link-audit-002";

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

const index = read("tools/physical-security/area-planner/index.html");
const script = read("tools/physical-security/area-planner/script.js");

safe("area-planner-index-exists", exists("tools/physical-security/area-planner/index.html"), "Area Planner index exists");
safe("area-planner-script-exists", exists("tools/physical-security/area-planner/script.js"), "Area Planner script exists");
safe("script-cache-bumped", index.includes("script.js?v=physical-security-area-planner-summary-link-017"), "Area Planner script cache bumped");
safe("summary-url-constant", script.includes('const SUMMARY_URL = "/tools/physical-security/summary/";'), "Summary URL constant exists");
safe("summary-button-reference", script.includes('summaryBtn: $("openPhysicalSecuritySummary")'), "Summary button element reference exists");
safe("summary-button-source", script.includes("function ensureSummaryButton()") && script.includes("data-sl-area-planner-summary-link") && script.includes("Open Physical Security Summary"), "Summary button is created source-side");
safe("summary-click-handler", script.includes("function openSummary()") && script.includes("window.location.href = SUMMARY_URL;"), "Summary click handler routes to Summary");
safe("incomplete-area-does-not-block", script.includes("validateAreaForm())") && !script.includes("fix highlighted inputs before opening the Summary"), "incomplete draft does not block opening Summary");
safe("summary-bound", script.includes("ensureSummaryButton();") && script.includes('els.summaryBtn?.addEventListener("click", openSummary);'), "Summary button is bound");
safe("continue-route-preserved", script.includes("function continueFlow()") && script.includes("window.location.href = getActiveAreaRouteUrl();"), "existing Continue flow still routes by active area intent");
safe("core-route-preserved", script.includes("return NEXT_URL;") && script.includes('"/tools/physical-security/scene-illumination/"'), "Core route remains Scene Illumination");
safe("face-route-preserved", script.includes('"/tools/physical-security/face-recognition-range/"'), "Face Recognition route remains");
safe("plate-route-preserved", script.includes('"/tools/physical-security/license-plate-range/"'), "License Plate route remains");
safe("area-planner-actions-preserved", script.includes("saveArea") && script.includes("newArea") && script.includes("resetAreas") && script.includes("printAreaSummary") && script.includes("copyAreaSummaryJson"), "Area Planner actions remain");

console.log("");
console.log("Physical Security Area Planner Summary Link Audit");
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
