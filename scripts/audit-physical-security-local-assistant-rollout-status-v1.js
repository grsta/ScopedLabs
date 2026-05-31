const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "scene-illumination-local-assistant-proof-002-area-detail-contract";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function count(text, needle) {
  return String(text || "").split(needle).length - 1;
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }
function watch(id, ok, detail) { add(id, ok ? "SAFE" : "WATCH", detail); }

const sceneIndex = read("tools/physical-security/scene-illumination/index.html");
const sceneScript = read("tools/physical-security/scene-illumination/script.js");
const areaIndex = read("tools/physical-security/area-planner/index.html");
const lensIndex = read("tools/physical-security/lens-selection/index.html");

safe("scene-index-exists", exists("tools/physical-security/scene-illumination/index.html"), "Scene Illumination index exists");
safe("scene-script-exists", exists("tools/physical-security/scene-illumination/script.js"), "Scene Illumination script exists");

[
  "physical-security-ui-kit.js",
  "physical-security-graphics-library.js",
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-guidance-memory.js",
  "physical-security-guidance-event-bridge.js",
  "physical-security-tool-registry.js"
].forEach((asset) => {
  safe("loads-" + asset.replace(/[^a-z0-9]/gi, "-"), sceneIndex.includes(asset), "Scene Illumination loads " + asset);
});

safe("visible-mount-present", sceneIndex.includes("sceneIlluminationLocalAssistantMount"), "Scene Illumination has dedicated local assistant mount");
safe(
  "local-script-cache-current",
  sceneIndex.includes("./script.js?v=scene-illumination-area-detail-save-contract-002") ||
    sceneIndex.includes("./script.js?v=scene-illumination-local-assistant-proof-001"),
  "Scene Illumination local script cache is current for area-detail contract or original proof"
);

[
  "ScopedLabsSceneIlluminationLocalAssistantProof",
  "ScopedLabsPhysicalSecurityLocalAssistant",
  "ScopedLabsPhysicalSecurityToolAssistantAdapters",
  "scopedlabs:physical-security-guidance-updated",
  "sceneIlluminationLocalAssistantProof",
  "buildModel",
  "render",
  "clear"
].forEach((signal) => {
  safe("proof-signal-" + signal.replace(/[^a-z0-9]/gi, "-"), sceneScript.includes(signal), "Detected proof signal: " + signal);
});

safe("category-renderer-still-not-on-scene", !sceneIndex.includes("physical-security-category-guidance-renderer.js"), "Scene Illumination does not load visible category/master renderer");
safe("report-summary-still-not-on-scene", !sceneIndex.includes("physical-security-report-summary.js"), "Scene Illumination does not load category report summary helper");

[
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-report-summary.js",
  "sceneIlluminationLocalAssistantMount",
  "ScopedLabsSceneIlluminationLocalAssistantProof"
].forEach((signal) => {
  safe("area-planner-guard-" + signal.replace(/[^a-z0-9]/gi, "-"), !areaIndex.includes(signal), "Area Planner remains free of " + signal);
});

safe("lens-unlocked-local-assistant-ok", lensIndex.includes("physical-security-local-assistant.js"), "Lens Selection is intentionally unlocked and may load local assistant module");
safe("lens-unlocked-adapters-ok", lensIndex.includes("physical-security-tool-assistant-adapters.js"), "Lens Selection is intentionally unlocked and may load tool assistant adapters");
safe("lens-no-category-master-renderer", !lensIndex.includes("physical-security-category-guidance-renderer.js"), "Lens Selection still does not host the category master renderer");
safe("lens-no-report-summary-helper", !lensIndex.includes("physical-security-report-summary.js"), "Lens Selection still does not load the Summary report helper");
safe("lens-no-scene-mount", !lensIndex.includes("sceneIlluminationLocalAssistantMount"), "Lens Selection does not contain Scene Illumination mount");
safe("lens-no-scene-proof-global", !lensIndex.includes("ScopedLabsSceneIlluminationLocalAssistantProof"), "Lens Selection does not contain Scene Illumination proof global");

safe("scene-area-detail-contract", sceneScript.includes("sceneIlluminationAreaDetail") && sceneScript.includes("sceneIlluminationSummary") && sceneScript.includes("lightingSummary"), "Scene Illumination area detail save contract remains");
safe("no-duplicate-local-assistant", count(sceneIndex, "physical-security-local-assistant.js") === 1, "Scene Illumination local assistant asset appears once");
safe("no-duplicate-adapters", count(sceneIndex, "physical-security-tool-assistant-adapters.js") === 1, "Scene Illumination adapter asset appears once");

console.log("");
console.log("Scene Illumination Local Assistant Proof Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (watchCount) {
  console.log("");
  console.log("Watch items:");
  rows.filter((row) => row.status === "WATCH").forEach((row) => console.log("- " + row.id + ": " + row.detail));
}

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete. No files modified.");
