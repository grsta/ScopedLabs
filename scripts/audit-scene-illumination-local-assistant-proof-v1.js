const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

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

const candidateMountIds = [
  "sceneIlluminationAssistantMount",
  "localAssistantMount",
  "designAssistant",
  "assistant",
  "results",
  "next-step-row",
  "flow-note",
  "toolCard"
];

const presentMountSignals = candidateMountIds.filter(function (id) {
  return has(index, 'id="' + id + '"') || has(index, "id='" + id + "'");
});

add(
  checks,
  "mount-anchor-inventory",
  presentMountSignals.length ? "SAFE" : "WATCH",
  presentMountSignals.length
    ? "Potential mount/anchor IDs found: " + presentMountSignals.join(", ")
    : "No obvious mount anchor found; proof script should add a dedicated hidden mount"
);

const updateSignals = [
  "calculate",
  'addEventListener("submit"',
  "addEventListener('submit'",
  "update",
  "render",
  "results",
  "scopedlabs:physical-security-guidance-updated"
].filter(function (signal) {
  return has(sceneScript, signal);
});

add(
  checks,
  "calculation-render-signal-inventory",
  updateSignals.length ? "SAFE" : "WATCH",
  updateSignals.length
    ? "Scene script has calculation/render signals: " + updateSignals.join(", ")
    : "No calculation/render signals detected"
);

add(
  checks,
  "local-assistant-not-visible-yet",
  !has(combined, "sceneIlluminationLocalAssistantMount") && !has(combined, "Scene Illumination Assistant")
    ? "SAFE"
    : "WATCH",
  !has(combined, "sceneIlluminationLocalAssistantMount") && !has(combined, "Scene Illumination Assistant")
    ? "No existing visible Scene Illumination local assistant proof detected"
    : "Existing Scene Illumination assistant proof signals detected"
);

const areaPlanner = read(areaPlannerRel);
const lens = read(lensRel);

[
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-report-summary.js"
].forEach(function (asset) {
  add(
    checks,
    "area-planner-guard-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(areaPlanner, asset) ? "SAFE" : "FAIL",
    !has(areaPlanner, asset) ? "Area Planner remains free of " + asset : "Area Planner contains protected asset " + asset
  );

  add(
    checks,
    "lens-selection-guard-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(lens, asset) ? "SAFE" : "FAIL",
    !has(lens, asset) ? "Lens Selection remains free of " + asset : "Lens Selection contains protected asset " + asset
  );
});

console.log("");
console.log("Scene Illumination Local Assistant Proof Preflight");
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
  console.log("Preflight complete. No files modified.");
}
