const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-area-planner-summary-button-retired-audit-002-reset-confirm-clear";

function read(rel) {
  const target = path.join(ROOT, rel);
  return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function safe(id, ok, detail) {
  add(id, ok ? "SAFE" : "FAIL", detail);
}

const index = read("tools/physical-security/area-planner/index.html");
const script = read("tools/physical-security/area-planner/script.js");
const pipelines = read("assets/pipelines.js");

safe("area-planner-index-exists", exists("tools/physical-security/area-planner/index.html"), "Area Planner index exists");
safe("area-planner-script-exists", exists("tools/physical-security/area-planner/script.js"), "Area Planner script exists");
safe("script-cache-bumped", index.includes("script.js?v=physical-security-area-planner-reset-confirm-clear-020"), "Area Planner script cache bumped");
safe("retirement-marker", index.includes("physical-security-area-planner-reset-confirm-clear-020"), "Area Planner retirement marker exists");

safe("summary-in-pipeline-nav", pipelines.includes('id: "physical-security-summary"') && pipelines.includes('href: "/tools/physical-security/summary/"'), "Summary is available through Physical Security pipeline nav");
safe("legacy-summary-button-removed", !script.includes("Open Physical Security Summary"), "Area Planner no longer creates visible Open Summary button text");
safe("legacy-summary-button-id-not-created", !script.includes('id = "openPhysicalSecuritySummary"') && !script.includes('button.id = "openPhysicalSecuritySummary"'), "Area Planner no longer creates openPhysicalSecuritySummary button");
safe("legacy-summary-url-removed", !script.includes('const SUMMARY_URL = "/tools/physical-security/summary/";'), "Area Planner no longer keeps Summary URL constant for retired button");
safe("legacy-summary-handler-removed", !script.includes("function openSummary()"), "Area Planner openSummary handler removed");
safe("legacy-summary-binding-removed", !script.includes('addEventListener("click", openSummary)'), "Area Planner summary click binding removed");
safe("legacy-summary-cleanup-kept", script.includes("function removeLegacySummaryButton()") && script.includes('const existing = $("openPhysicalSecuritySummary");'), "Area Planner removes stale legacy Summary button if cached DOM exists");

safe("continue-route-preserved", script.includes("function continueFlow()") && script.includes("window.location.href = getActiveAreaRouteUrl();"), "existing Continue flow still routes by active area intent");
safe("core-route-preserved", script.includes("return NEXT_URL;") && script.includes('"/tools/physical-security/scene-illumination/"'), "Core route remains Scene Illumination");
safe("face-route-preserved", script.includes('"/tools/physical-security/face-recognition-range/"'), "Face Recognition route remains");
safe("plate-route-preserved", script.includes('"/tools/physical-security/license-plate-range/"'), "License Plate route remains");
safe("area-planner-actions-preserved", script.includes("saveArea") && script.includes("newArea") && script.includes("resetAreas") && script.includes("printAreaSummary") && script.includes("copyAreaSummaryJson"), "Area Planner actions remain");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Area Planner Summary Button Retirement Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
