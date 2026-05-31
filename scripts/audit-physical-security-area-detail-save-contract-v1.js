const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-area-detail-save-contract-audit-001";
const REPORT_VERSION = "physical-security-report-summary-023-single-report-render";
const SCENE_SCRIPT_VERSION = "scene-illumination-area-detail-save-contract-002";

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

const summaryIndex = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");
const sceneIndex = read("tools/physical-security/scene-illumination/index.html");
const sceneScript = read("tools/physical-security/scene-illumination/script.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("scene-index-exists", exists("tools/physical-security/scene-illumination/index.html"), "Scene Illumination index exists");
safe("scene-script-exists", exists("tools/physical-security/scene-illumination/script.js"), "Scene Illumination script exists");
safe("report-cache-bumped", summaryIndex.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "Summary report asset cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "report summary asset version bumped");
safe("scene-script-cache-bumped", sceneIndex.includes("./script.js?v=" + SCENE_SCRIPT_VERSION), "Scene Illumination script cache bumped");
safe("scene-save-summary", sceneScript.includes("function sceneIlluminationAreaDetail(data)") && sceneScript.includes("sceneIlluminationSummary: sceneIlluminationAreaDetail(data)") && sceneScript.includes("lightingSummary: sceneIlluminationAreaDetail(data)"), "Scene Illumination saves area-specific summary detail");
safe("scene-save-action-next-step", sceneScript.includes("sceneIlluminationAction: sceneIlluminationAreaAction(data)") && sceneScript.includes("sceneIlluminationNextStep: sceneIlluminationAreaNextStep(data)"), "Scene Illumination saves area-specific action and next step");
safe("scene-save-status", sceneScript.includes("sceneIlluminationStatus: sceneIlluminationGuidanceStatus(data)") && sceneScript.includes("lightingStatus: data.status"), "Scene Illumination saves scoped status");
safe("report-reads-scene-detail", report.includes('"sceneIlluminationSummary"') && report.includes('"lightingInterpretation"') && report.includes('"estimatedLumensRequired"'), "Summary report reads Scene Illumination detail fields");
safe("generated-fallback", report.includes("function generatedAreaDetailFallback(definition, status)") && report.includes("status is saved as") && report.includes("Recalculate this tool to refresh"), "generated statuses get an honest missing-detail fallback");
safe("detail-fallback-status-aware", report.includes("areaToolDetail(area, definition, status)") && report.includes("if (statusIsGenerated(status))"), "area detail fallback is status-aware");
safe("scene-numeric-labels", report.includes("Target illumination:") && report.includes("Estimated required light:") && report.includes("Lighting class:"), "Scene Illumination numeric details are labeled");
safe("no-generated-false-empty-contract", !report.includes('detail: areaToolDetail(area, definition)') && report.includes('detail: areaToolDetail(area, definition, status)'), "generated rows do not use blind no-detail path");
safe("no-math-change", sceneScript.includes("const lumens = (input.fc * area) / effectiveFactor;") && sceneScript.includes("const effectiveFactor = Math.max(0.05, input.uf * input.llf);"), "Scene Illumination math remains unchanged");

console.log("");
console.log("Physical Security Area Detail Save Contract Audit");
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
