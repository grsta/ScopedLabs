const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "field-of-view-local-assistant-proof-001";
const MOUNT_ID = "fieldOfViewLocalAssistantMount";

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

const indexRel = "tools/physical-security/field-of-view/index.html";
const scriptRel = "tools/physical-security/field-of-view/script.js";
const areaPlannerRel = "tools/physical-security/area-planner/index.html";
const lensRel = "tools/physical-security/lens-selection/index.html";

const index = read(indexRel);
const localScript = read(scriptRel);
const combined = index + "\n" + localScript;

add(checks, "index-exists", index ? "SAFE" : "FAIL", index ? "Field of View index exists" : "Missing Field of View index");
add(checks, "script-exists", localScript ? "SAFE" : "FAIL", localScript ? "Field of View script exists" : "Missing Field of View script");

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
    has(index, asset) ? "Field of View loads " + asset : "Field of View missing " + asset
  );
});

add(
  checks,
  "visible-mount-present",
  has(index, 'id="' + MOUNT_ID + '"') || has(index, "id='" + MOUNT_ID + "'") ? "SAFE" : "FAIL",
  "Field of View has dedicated local assistant mount"
);

add(
  checks,
  "local-script-cache-bumped",
  has(index, "./script.js?v=" + VERSION) ? "SAFE" : "FAIL",
  "Field of View local script cache points to " + VERSION
);

[
  "ScopedLabsFieldOfViewLocalAssistantProof",
  "ScopedLabsPhysicalSecurityLocalAssistant",
  "ScopedLabsPhysicalSecurityToolAssistantAdapters",
  "scopedlabs:physical-security-guidance-updated",
  "fieldOfViewLocalAssistantProof",
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
  "category-renderer-still-not-on-tool",
  !has(index, "physical-security-category-guidance-renderer.js") ? "SAFE" : "FAIL",
  "Field of View does not load visible category/master renderer"
);

add(
  checks,
  "report-summary-still-not-on-tool",
  !has(index, "physical-security-report-summary.js") ? "SAFE" : "FAIL",
  "Field of View does not load category report summary helper"
);

const areaPlanner = read(areaPlannerRel);
const lens = read(lensRel);

[
  "physical-security-local-assistant.js",
  "physical-security-tool-assistant-adapters.js",
  "physical-security-category-guidance-renderer.js",
  "physical-security-report-summary.js",
  MOUNT_ID,
  "ScopedLabsFieldOfViewLocalAssistantProof"
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
console.log("Field of View Local Assistant Proof Audit");
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
