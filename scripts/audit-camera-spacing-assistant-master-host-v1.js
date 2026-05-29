const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "camera-spacing-assistant-master-host-audit-002-special-host";

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

const indexRel = "tools/physical-security/camera-spacing/index.html";
const scriptRel = "tools/physical-security/camera-spacing/script.js";
const areaPlannerRel = "tools/physical-security/area-planner/index.html";
const lensRel = "tools/physical-security/lens-selection/index.html";
const reportSummaryRel = "assets/physical-security-report-summary.js";
const eventBridgeRel = "assets/physical-security-guidance-event-bridge.js";

const index = read(indexRel);
const localScript = read(scriptRel);
const reportSummaryAsset = read(reportSummaryRel);
const eventBridgeAsset = read(eventBridgeRel);
const combined = index + "\n" + localScript;

add(checks, "camera-spacing-index-exists", index ? "SAFE" : "FAIL", index ? "Camera Spacing index exists" : "Missing Camera Spacing index");
add(checks, "camera-spacing-script-exists", localScript ? "SAFE" : "FAIL", localScript ? "Camera Spacing script exists" : "Missing Camera Spacing script");

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
    has(index, asset) ? "Camera Spacing loads " + asset : "Camera Spacing missing " + asset
  );
});

[
  "physical-security-category-guidance.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-category-guidance-renderer.css",
  "physical-security-report-summary.js"
].forEach(function (asset) {
  add(
    checks,
    "master-host-loads-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    has(index, asset) ? "SAFE" : "FAIL",
    has(index, asset) ? "Camera Spacing master host loads " + asset : "Camera Spacing master host missing " + asset
  );
});

[
  "ScopedLabsPhysicalSecurityCategoryGuidanceRenderer",
  "ScopedLabsPhysicalSecurityCategoryGuidance",
  "updateCameraSpacingUserGuidance"
].forEach(function (signal) {
  add(
    checks,
    "master-host-signal-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    has(combined, signal) ? "SAFE" : "FAIL",
    has(combined, signal) ? "Detected Camera Spacing master/local signal: " + signal : "Missing Camera Spacing master/local signal: " + signal
  );
});

add(
  checks,
  "report-summary-helper-present",
  has(index, "physical-security-report-summary.js") && reportSummaryAsset
    ? "SAFE"
    : "FAIL",
  has(index, "physical-security-report-summary.js") && reportSummaryAsset
    ? "Camera Spacing loads the report summary helper asset"
    : "Camera Spacing report summary helper asset/load is missing"
);

add(
  checks,
  "event-bridge-helper-present",
  has(index, "physical-security-guidance-event-bridge.js") && eventBridgeAsset
    ? "SAFE"
    : "FAIL",
  has(index, "physical-security-guidance-event-bridge.js") && eventBridgeAsset
    ? "Camera Spacing loads the shared guidance event bridge asset"
    : "Camera Spacing guidance event bridge asset/load is missing"
);

add(
  checks,
  "no-generic-camera-spacing-local-proof-duplicate",
  !has(combined, "cameraSpacingLocalAssistantMount") &&
  !has(combined, "ScopedLabsCameraSpacingLocalAssistantProof")
    ? "SAFE"
    : "WATCH",
  !has(combined, "cameraSpacingLocalAssistantMount") &&
  !has(combined, "ScopedLabsCameraSpacingLocalAssistantProof")
    ? "No generic duplicate Camera Spacing local proof was added"
    : "Generic Camera Spacing local proof signals detected; inspect for duplicate assistant UI"
);

add(
  checks,
  "existing-camera-spacing-assistant-preserved",
  has(combined, "Design Assistant") ||
  has(combined, "design assistant") ||
  has(combined, "updateCameraSpacingUserGuidance")
    ? "SAFE"
    : "WATCH",
  has(combined, "Design Assistant") ||
  has(combined, "design assistant") ||
  has(combined, "updateCameraSpacingUserGuidance")
    ? "Existing Camera Spacing local assistant signals are present"
    : "Existing Camera Spacing local assistant signal not detected by text audit"
);

add(
  checks,
  "category-master-only-on-camera-spacing",
  has(index, "physical-security-category-guidance-renderer.js") &&
  has(index, "physical-security-report-summary.js")
    ? "SAFE"
    : "FAIL",
  "Camera Spacing remains the category/master host page"
);

const areaPlanner = read(areaPlannerRel);
const lens = read(lensRel);

[
  "physical-security-category-guidance-renderer.js",
  "physical-security-report-summary.js",
  "cameraSpacingLocalAssistantMount",
  "ScopedLabsCameraSpacingLocalAssistantProof"
].forEach(function (asset) {
  add(
    checks,
    "area-planner-guard-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(areaPlanner, asset) ? "SAFE" : "FAIL",
    !has(areaPlanner, asset) ? "Area Planner remains free of " + asset : "Area Planner contains protected Camera Spacing/master signal " + asset
  );

  add(
    checks,
    "lens-selection-guard-" + asset.replace(/[^a-z0-9]+/gi, "-").replace(/-$/, ""),
    !has(lens, asset) ? "SAFE" : "FAIL",
    !has(lens, asset) ? "Lens Selection remains free of " + asset : "Lens Selection contains protected Camera Spacing/master signal " + asset
  );
});

console.log("");
console.log("Camera Spacing Assistant / Master Host Verification Audit");
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
  console.log("Audit complete. No files modified.");
}
