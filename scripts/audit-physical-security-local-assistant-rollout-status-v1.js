const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-local-assistant-rollout-status-audit-001";

function abs(rel) {
  return path.join(ROOT, rel);
}

function read(rel) {
  return fs.existsSync(abs(rel)) ? fs.readFileSync(abs(rel), "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function has(text, needle) {
  return text.includes(needle);
}

function add(checks, id, status, detail) {
  checks.push({ id, status, detail });
}

const checks = [];

const normalProofTools = [
  {
    slug: "scene-illumination",
    label: "Scene Illumination",
    mountId: "sceneIlluminationLocalAssistantMount",
    proofGlobal: "ScopedLabsSceneIlluminationLocalAssistantProof",
    version: "scene-illumination-local-assistant-proof-001",
    auditRel: "scripts/audit-scene-illumination-local-assistant-proof-v1.js"
  },
  {
    slug: "mounting-height",
    label: "Mounting Height",
    mountId: "mountingHeightLocalAssistantMount",
    proofGlobal: "ScopedLabsMountingHeightLocalAssistantProof",
    version: "mounting-height-local-assistant-proof-001",
    auditRel: "scripts/audit-mounting-height-local-assistant-proof-v1.js"
  },
  {
    slug: "field-of-view",
    label: "Field of View",
    mountId: "fieldOfViewLocalAssistantMount",
    proofGlobal: "ScopedLabsFieldOfViewLocalAssistantProof",
    version: "field-of-view-local-assistant-proof-001",
    auditRel: "scripts/audit-field-of-view-local-assistant-proof-v1.js"
  },
  {
    slug: "camera-coverage-area",
    label: "Camera Coverage Area",
    mountId: "cameraCoverageAreaLocalAssistantMount",
    proofGlobal: "ScopedLabsCameraCoverageAreaLocalAssistantProof",
    version: "camera-coverage-area-local-assistant-proof-001",
    auditRel: "scripts/audit-camera-coverage-area-local-assistant-proof-v1.js"
  },
  {
    slug: "blind-spot-check",
    label: "Blind Spot Check",
    mountId: "blindSpotCheckLocalAssistantMount",
    proofGlobal: "ScopedLabsBlindSpotCheckLocalAssistantProof",
    version: "blind-spot-check-local-assistant-proof-001",
    auditRel: "scripts/audit-blind-spot-check-local-assistant-proof-v1.js"
  },
  {
    slug: "pixel-density",
    label: "Pixel Density",
    mountId: "pixelDensityLocalAssistantMount",
    proofGlobal: "ScopedLabsPixelDensityLocalAssistantProof",
    version: "pixel-density-local-assistant-proof-001",
    auditRel: "scripts/audit-pixel-density-local-assistant-proof-v1.js"
  },
  {
    slug: "face-recognition-range",
    label: "Face Recognition Range",
    mountId: "faceRecognitionRangeLocalAssistantMount",
    proofGlobal: "ScopedLabsFaceRecognitionRangeLocalAssistantProof",
    version: "face-recognition-range-local-assistant-proof-001",
    auditRel: "scripts/audit-face-recognition-range-local-assistant-proof-v1.js"
  },
  {
    slug: "license-plate-range",
    label: "License Plate Capture Range",
    mountId: "licensePlateRangeLocalAssistantMount",
    proofGlobal: "ScopedLabsLicensePlateRangeLocalAssistantProof",
    version: "license-plate-range-local-assistant-proof-001",
    auditRel: "scripts/audit-license-plate-range-local-assistant-proof-v1.js"
  }
];

const sharedAssets = [
  "assets/physical-security-ui-kit.js",
  "assets/physical-security-graphics-library.js",
  "assets/physical-security-local-assistant.js",
  "assets/physical-security-tool-assistant-adapters.js",
  "assets/physical-security-guidance-memory.js",
  "assets/physical-security-guidance-event-bridge.js",
  "assets/physical-security-tool-registry.js"
];

const proposedApiSignals = [
  ["assets/physical-security-ui-kit.js", "ScopedLabsPhysicalSecurityUiKit"],
  ["assets/physical-security-graphics-library.js", "ScopedLabsPhysicalSecurityGraphicsLibrary"],
  ["assets/physical-security-local-assistant.js", "ScopedLabsPhysicalSecurityLocalAssistant"],
  ["assets/physical-security-tool-assistant-adapters.js", "ScopedLabsPhysicalSecurityToolAssistantAdapters"]
];

sharedAssets.forEach(function (rel) {
  add(
    checks,
    "shared-asset-exists-" + rel.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    exists(rel) ? "SAFE" : "FAIL",
    exists(rel) ? rel + " exists" : rel + " is missing"
  );
});

proposedApiSignals.forEach(function (pair) {
  const rel = pair[0];
  const signal = pair[1];
  const text = read(rel);

  add(
    checks,
    "shared-api-signal-" + signal,
    has(text, signal) ? "SAFE" : "FAIL",
    has(text, signal) ? rel + " exposes " + signal : rel + " missing " + signal
  );
});

normalProofTools.forEach(function (tool) {
  const indexRel = "tools/physical-security/" + tool.slug + "/index.html";
  const scriptRel = "tools/physical-security/" + tool.slug + "/script.js";
  const index = read(indexRel);
  const script = read(scriptRel);
  const combined = index + "\n" + script;

  add(checks, tool.slug + "-index-exists", index ? "SAFE" : "FAIL", tool.label + " index exists");
  add(checks, tool.slug + "-script-exists", script ? "SAFE" : "FAIL", tool.label + " script exists");
  add(checks, tool.slug + "-audit-exists", exists(tool.auditRel) ? "SAFE" : "FAIL", tool.auditRel + " exists");

  sharedAssets.forEach(function (assetRel) {
    const assetName = path.basename(assetRel);
    add(
      checks,
      tool.slug + "-loads-" + assetName.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
      has(index, assetName) ? "SAFE" : "FAIL",
      has(index, assetName) ? tool.label + " loads " + assetName : tool.label + " missing " + assetName
    );
  });

  add(
    checks,
    tool.slug + "-mount-present",
    has(index, 'id="' + tool.mountId + '"') || has(index, "id='" + tool.mountId + "'") ? "SAFE" : "FAIL",
    tool.label + " has dedicated local assistant mount"
  );

  add(
    checks,
    tool.slug + "-proof-global-present",
    has(combined, tool.proofGlobal) ? "SAFE" : "FAIL",
    tool.label + " proof global present"
  );

  add(
    checks,
    tool.slug + "-cache-bumped",
    has(index, "./script.js?v=" + tool.version) ? "SAFE" : "FAIL",
    tool.label + " local script cache uses " + tool.version
  );

  add(
    checks,
    tool.slug + "-no-category-renderer",
    !has(index, "physical-security-category-guidance-renderer.js") ? "SAFE" : "FAIL",
    tool.label + " does not load category/master renderer"
  );

  add(
    checks,
    tool.slug + "-no-report-summary-helper",
    !has(index, "physical-security-report-summary.js") ? "SAFE" : "FAIL",
    tool.label + " does not load category report summary helper"
  );
});

const spacingIndexRel = "tools/physical-security/camera-spacing/index.html";
const spacingScriptRel = "tools/physical-security/camera-spacing/script.js";
const spacingIndex = read(spacingIndexRel);
const spacingScript = read(spacingScriptRel);
const spacingCombined = spacingIndex + "\n" + spacingScript;

add(checks, "camera-spacing-index-exists", spacingIndex ? "SAFE" : "FAIL", "Camera Spacing index exists");
add(checks, "camera-spacing-script-exists", spacingScript ? "SAFE" : "FAIL", "Camera Spacing script exists");
add(checks, "camera-spacing-master-audit-exists", exists("scripts/audit-camera-spacing-assistant-master-host-v1.js") ? "SAFE" : "FAIL", "Camera Spacing master host audit exists");

sharedAssets.forEach(function (assetRel) {
  const assetName = path.basename(assetRel);
  add(
    checks,
    "camera-spacing-loads-" + assetName.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    has(spacingIndex, assetName) ? "SAFE" : "FAIL",
    has(spacingIndex, assetName) ? "Camera Spacing loads " + assetName : "Camera Spacing missing " + assetName
  );
});

[
  "physical-security-category-guidance.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-category-guidance-renderer.css",
  "physical-security-report-summary.js"
].forEach(function (assetName) {
  add(
    checks,
    "camera-spacing-master-loads-" + assetName.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    has(spacingIndex, assetName) ? "SAFE" : "FAIL",
    has(spacingIndex, assetName) ? "Camera Spacing master host loads " + assetName : "Camera Spacing master host missing " + assetName
  );
});

add(
  checks,
  "camera-spacing-existing-assistant-preserved",
  has(spacingCombined, "updateCameraSpacingUserGuidance") ? "SAFE" : "FAIL",
  "Camera Spacing existing local assistant signal is preserved"
);

add(
  checks,
  "camera-spacing-no-generic-duplicate-proof",
  !has(spacingCombined, "cameraSpacingLocalAssistantMount") &&
  !has(spacingCombined, "ScopedLabsCameraSpacingLocalAssistantProof")
    ? "SAFE"
    : "FAIL",
  "Camera Spacing has no generic duplicate local assistant proof"
);

const areaPlanner = read("tools/physical-security/area-planner/index.html");
const lensSelection = read("tools/physical-security/lens-selection/index.html");

[
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-report-summary.js",
  "ScopedLabsSceneIlluminationLocalAssistantProof",
  "ScopedLabsMountingHeightLocalAssistantProof",
  "ScopedLabsFieldOfViewLocalAssistantProof",
  "ScopedLabsCameraCoverageAreaLocalAssistantProof",
  "ScopedLabsBlindSpotCheckLocalAssistantProof",
  "ScopedLabsPixelDensityLocalAssistantProof",
  "ScopedLabsFaceRecognitionRangeLocalAssistantProof",
  "ScopedLabsLicensePlateRangeLocalAssistantProof"
].forEach(function (signal) {
  add(
    checks,
    "area-planner-protected-free-of-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(areaPlanner, signal) ? "SAFE" : "FAIL",
    !has(areaPlanner, signal) ? "Area Planner remains free of " + signal : "Area Planner contains protected signal " + signal
  );

  add(
    checks,
    "lens-selection-protected-free-of-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(lensSelection, signal) ? "SAFE" : "FAIL",
    !has(lensSelection, signal) ? "Lens Selection remains free of " + signal : "Lens Selection contains protected signal " + signal
  );
});

add(
  checks,
  "broad-assistant-library-audit-exists",
  exists("scripts/audit-physical-security-assistant-library-modules-v1.js") ? "SAFE" : "FAIL",
  "Broad assistant/library module audit exists"
);

const proofDoneCount = normalProofTools.filter(function (tool) {
  const index = read("tools/physical-security/" + tool.slug + "/index.html");
  const script = read("tools/physical-security/" + tool.slug + "/script.js");
  return (has(index, 'id="' + tool.mountId + '"') || has(index, "id='" + tool.mountId + "'")) &&
    has(index, "./script.js?v=" + tool.version) &&
    has(index + "\n" + script, tool.proofGlobal);
}).length;

add(
  checks,
  "normal-visible-local-proof-count",
  proofDoneCount === normalProofTools.length ? "SAFE" : "FAIL",
  "Visible local assistant proofs complete for " + proofDoneCount + "/" + normalProofTools.length + " normal eligible tools"
);

console.log("");
console.log("Physical Security Local Assistant Rollout Status Audit");
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

console.log("");
console.log("Rollout status:");
console.log("- Normal visible local assistant proofs:", proofDoneCount + "/" + normalProofTools.length);
console.log("- Camera Spacing:", "special category/master host verification");
console.log("- Area Planner:", "frozen/skipped");
console.log("- Lens Selection:", "protected");

if (failCount) {
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
