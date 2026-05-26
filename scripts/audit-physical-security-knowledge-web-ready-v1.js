const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "physical-security-knowledge-web-ready-audit-001";
const sourcePolicyFile = path.join(root, "assets", "physical-security-source-policy.js");
const knowledgeFile = path.join(root, "assets", "physical-security-category-knowledge.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const sourcePolicy = read(sourcePolicyFile);
const knowledge = read(knowledgeFile);

const requiredTools = [
  "area-planner",
  "scene-illumination",
  "mounting-height",
  "field-of-view",
  "camera-coverage-area",
  "camera-spacing",
  "blind-spot-check",
  "pixel-density",
  "lens-selection",
  "face-recognition-range",
  "license-plate-range"
];

const requiredGlobals = [
  "ScopedLabsSceneIlluminationGuidance",
  "ScopedLabsMountingHeightGuidance",
  "ScopedLabsFieldOfViewGuidance",
  "ScopedLabsCameraCoverageAreaGuidance",
  "ScopedLabsCameraSpacingGuidance",
  "ScopedLabsBlindSpotGuidance",
  "ScopedLabsPixelDensityGuidance",
  "ScopedLabsFaceRecognitionGuidance",
  "ScopedLabsLicensePlateGuidance"
];

const requiredTopics = [
  "lighting-illumination",
  "mounting-geometry",
  "field-of-view",
  "coverage-spacing",
  "blind-spots",
  "pixel-density",
  "lens-optics",
  "face-recognition",
  "license-plate-capture",
  "physical-security-design"
];

const rows = [
  {
    id: "source-policy-file",
    status: fs.existsSync(sourcePolicyFile) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-source-policy.js exists"
  },
  {
    id: "source-policy-version",
    status: sourcePolicy.includes("physical-security-source-policy-001-web-intake-gate") ? "SAFE" : "WATCH",
    detail: "source policy version marker is present"
  },
  {
    id: "source-policy-global",
    status: sourcePolicy.includes("ScopedLabsPhysicalSecuritySourcePolicy") ? "SAFE" : "WATCH",
    detail: "source policy exports expected global"
  },
  {
    id: "source-policy-api",
    status:
      sourcePolicy.includes("classifyText") &&
      sourcePolicy.includes("classifySourceCandidate") &&
      sourcePolicy.includes("getAllowedTopics") &&
      sourcePolicy.includes("getSourceUseRules") ? "SAFE" : "WATCH",
    detail: "source policy has classification and rule APIs"
  },
  {
    id: "allowed-topics",
    status: requiredTopics.every((topic) => sourcePolicy.includes('"' + topic + '"')) ? "SAFE" : "WATCH",
    detail: "physical-security-only topic filter is present"
  },
  {
    id: "blocked-topics",
    status:
      sourcePolicy.includes("shopping-or-vendor-fluff") &&
      sourcePolicy.includes("unrelated-cybersecurity") &&
      sourcePolicy.includes("alarm-sales") &&
      sourcePolicy.includes("privacy-law-advice") ? "SAFE" : "WATCH",
    detail: "blocked-topic filter is present"
  },
  {
    id: "knowledge-file",
    status: fs.existsSync(knowledgeFile) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-category-knowledge.js exists"
  },
  {
    id: "knowledge-version",
    status: knowledge.includes("physical-security-category-knowledge-001-web-ready") ? "SAFE" : "WATCH",
    detail: "web-ready knowledge version marker is present"
  },
  {
    id: "knowledge-global",
    status: knowledge.includes("ScopedLabsPhysicalSecurityCategoryKnowledge") ? "SAFE" : "WATCH",
    detail: "knowledge exports expected global"
  },
  {
    id: "all-tools-covered",
    status: requiredTools.every((slug) => knowledge.includes('"' + slug + '"')) ? "SAFE" : "WATCH",
    detail: "all Physical Security tools are represented"
  },
  {
    id: "guidance-globals-covered",
    status: requiredGlobals.every((globalName) => knowledge.includes(globalName)) ? "SAFE" : "WATCH",
    detail: "all nine proven guidance globals are represented"
  },
  {
    id: "source-policy-linked",
    status:
      knowledge.includes("ScopedLabsPhysicalSecuritySourcePolicy") &&
      knowledge.includes("classifyExternalSource") &&
      knowledge.includes("getToolWebPolicy") ? "SAFE" : "WATCH",
    detail: "knowledge core can use source policy without fetching"
  },
  {
    id: "runtime-fetch-blocked",
    status: knowledge.includes("runtimeFetchAllowed: false") && !/fetch\s*\(/.test(knowledge) ? "SAFE" : "WATCH",
    detail: "browser runtime fetch is blocked in V1"
  },
  {
    id: "source-cache-target",
    status: knowledge.includes("data/physical-security/source-summaries.json") ? "SAFE" : "WATCH",
    detail: "future curated source-summary cache target is declared"
  },
  {
    id: "lens-protected",
    status: knowledge.includes('"lens-selection"') && knowledge.includes("protected: true") ? "SAFE" : "WATCH",
    detail: "Lens Selection remains protected"
  },
  {
    id: "area-planner-skipped",
    status: knowledge.includes('"area-planner"') && knowledge.includes('adapterStatus: "skipped"') ? "SAFE" : "WATCH",
    detail: "Area Planner remains skipped/not adapter-owned"
  },
  {
    id: "no-dom-ownership",
    status:
      !/(appendChild|insertAdjacentHTML|innerHTML\s*=|classList\.add|setAttribute)/.test(sourcePolicy + "\n" + knowledge) ? "SAFE" : "WATCH",
    detail: "source policy and knowledge core do not own visible DOM rendering"
  }
];

console.log("\nPhysical Security Web-Ready Knowledge Audit\n");
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