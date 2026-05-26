const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "physical-security-category-guidance-foundation-audit-001";
const assetFile = path.join(root, "assets", "physical-security-category-guidance.js");
const registryFile = path.join(root, "assets", "physical-security-guidance-registry.js");
const masterSuiteFile = path.join(root, "scripts", "audit-physical-security-guidance-adapters-v1.js");
const generatorFile = path.join(root, "scripts", "guidance-adapter-factory-generator-v1.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const asset = read(assetFile);
const registry = read(registryFile);
const masterSuite = read(masterSuiteFile);
const generator = read(generatorFile);

const rows = [
  {
    id: "asset-file",
    status: fs.existsSync(assetFile) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-category-guidance.js exists"
  },
  {
    id: "asset-version",
    status: asset.includes("physical-security-category-guidance-001-foundation") ? "SAFE" : "WATCH",
    detail: "category guidance version marker is present"
  },
  {
    id: "asset-global",
    status: asset.includes("ScopedLabsPhysicalSecurityCategoryGuidance") ? "SAFE" : "WATCH",
    detail: "category guidance exports expected global"
  },
  {
    id: "asset-api",
    status:
      asset.includes("collectToolGuidance") &&
      asset.includes("summarizeGuidanceItems") &&
      asset.includes("createCategoryGuidance") &&
      asset.includes("explainCurrentGuidance") ? "SAFE" : "WATCH",
    detail: "category guidance exposes collection, summary, creation, and explanation APIs"
  },
  {
    id: "fallback-registry",
    status:
      asset.includes("ScopedLabsSceneIlluminationGuidance") &&
      asset.includes("ScopedLabsMountingHeightGuidance") &&
      asset.includes("ScopedLabsFieldOfViewGuidance") &&
      asset.includes("ScopedLabsCameraCoverageAreaGuidance") &&
      asset.includes("ScopedLabsCameraSpacingGuidance") &&
      asset.includes("ScopedLabsBlindSpotGuidance") &&
      asset.includes("ScopedLabsPixelDensityGuidance") &&
      asset.includes("ScopedLabsFaceRecognitionGuidance") &&
      asset.includes("ScopedLabsLicensePlateGuidance") ? "SAFE" : "WATCH",
    detail: "fallback registry includes the nine proven guidance globals"
  },
  {
    id: "lens-protected",
    status: asset.includes('slug: "lens-selection"') && asset.includes("protected: true") ? "SAFE" : "WATCH",
    detail: "Lens Selection is represented as protected, not an adapter target"
  },
  {
    id: "area-planner-skipped",
    status: asset.includes('slug: "area-planner"') && asset.includes("guidanceCandidate: false") ? "SAFE" : "WATCH",
    detail: "Area Planner is represented as skipped/not required"
  },
  {
    id: "registry-foundation",
    status: registry.includes("physical-security-guidance-registry-001-foundation") ? "SAFE" : "WATCH",
    detail: "Physical Security guidance registry foundation exists"
  },
  {
    id: "master-suite-9",
    status:
      masterSuite.includes("audit-scene-illumination-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-mounting-height-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-field-of-view-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-camera-coverage-area-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-camera-spacing-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-blind-spot-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-pixel-density-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-face-recognition-guidance-adapter-v1.js") &&
      masterSuite.includes("audit-license-plate-guidance-adapter-v1.js") ? "SAFE" : "WATCH",
    detail: "master suite references all nine proven adapter audits"
  },
  {
    id: "generator-gate",
    status: generator.includes("guidance-adapter-factory-generator-001-dry-run-gate") ? "SAFE" : "WATCH",
    detail: "dry-run generator gate exists"
  },
  {
    id: "no-dom-ownership",
    status: !/(appendChild|insertAdjacentHTML|innerHTML\s*=|classList\.add|setAttribute)/.test(asset) ? "SAFE" : "WATCH",
    detail: "category guidance foundation does not own visible DOM rendering"
  }
];

console.log("\nPhysical Security Category Guidance Foundation Audit\n");
console.log("Audit version:", auditVersion);
console.table(rows);

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;
const fail = rows.filter((row) => row.status === "FAIL").length;

console.log("\nSummary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", safe);
console.log("- WATCH:", watch);
console.log("- FAIL:", fail);

console.log("\nAudit complete. No files modified.");

if (watch > 0 || fail > 0) {
  process.exitCode = 1;
}