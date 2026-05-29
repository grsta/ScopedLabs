const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "scene-illumination-local-assistant-proof-001";
const MOUNT_ID = "sceneIlluminationLocalAssistantMount";

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function has(text, needle) {
  return text.includes(needle);
}

function add(checks, id, status, detail) {
  checks.push({ id, status, detail });
}

const checks = [];

const indexRel = "tools/physical-security/scene-illumination/index.html";
const scriptRel = "tools/physical-security/scene-illumination/script.js";
const areaPlannerRel = "tools/physical-security/area-planner/index.html";
const lensRel = "tools/physical-security/lens-selection/index.html";

const index = read(indexRel);
const sceneScript = read(scriptRel);
const combined = index + "\n" + sceneScript;

add(checks, "scene-index-exists", index ? "SAFE" : "FAIL", index ? "Scene Illumination index exists" : "Missing Scene Illumination index");
add(checks, "scene-script-exists", sceneScript ? "SAFE" : "FAIL", sceneScript ? "Scene Illumination script exists" : "Missing Scene Illumination script");

[
  "physical-security-ui-kit.js",
  "physical-security-graphics-library.js",
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-guidance-memory.js",
  "physical-security-guidance-event-bridge.js",
  "physical-security-tool-registry.js"
].forEach(function (asset) {
  add(
    checks,
    "loads-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    has(index, asset) ? "SAFE" : "FAIL",
    has(index, asset) ? "Scene Illumination loads " + asset : "Scene Illumination missing " + asset
  );
});

add(
  checks,
  "visible-mount-present",
  has(index, 'id="' + MOUNT_ID + '"') || has(index, "id='" + MOUNT_ID + "'") ? "SAFE" : "FAIL",
  "Scene Illumination has dedicated local assistant mount"
);

add(
  checks,
  "local-script-cache-bumped",
  has(index, "./script.js?v=" + VERSION) ? "SAFE" : "FAIL",
  "Scene Illumination local script cache points to " + VERSION
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
].forEach(function (signal) {
  add(
    checks,
    "proof-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    has(combined, signal) ? "SAFE" : "FAIL",
    has(combined, signal) ? "Detected proof signal: " + signal : "Missing proof signal: " + signal
  );
});

add(
  checks,
  "category-renderer-still-not-on-scene",
  !has(index, "physical-security-category-guidance-renderer.js") ? "SAFE" : "FAIL",
  "Scene Illumination does not load visible category/master renderer"
);

add(
  checks,
  "report-summary-still-not-on-scene",
  !has(index, "physical-security-report-summary.js") ? "SAFE" : "FAIL",
  "Scene Illumination does not load category report summary helper"
);

const areaPlanner = read(areaPlannerRel);
const lens = read(lensRel);

[
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-report-summary.js",
  MOUNT_ID,
  "ScopedLabsSceneIlluminationLocalAssistantProof"
].forEach(function (asset) {
  add(
    checks,
    "area-planner-guard-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(areaPlanner, asset) ? "SAFE" : "FAIL",
    !has(areaPlanner, asset) ? "Area Planner remains free of " + asset : "Area Planner contains protected proof signal " + asset
  );

  add(
    checks,
    "lens-selection-guard-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(lens, asset) ? "SAFE" : "FAIL",
    !has(lens, asset) ? "Lens Selection remains free of " + asset : "Lens Selection contains protected proof signal " + asset
  );
});

console.log("");
console.log("Scene Illumination Local Assistant Proof Audit");
console.log("Audit version:", VERSION);
console.table(checks);

const failCount = checks.filter(function (check) { return check.status === "FAIL"; }).length;
const watchCount = checks.filter(function (check) { return check.status === "WATCH"; }).length;
const safeCount = checks.filter(function (check) { return check.status === "SAFE"; }).length;

console.log("");
console.log("Summary:");
console.log("- Checks:", checks.length);
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) {
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Audit complete.");
}
