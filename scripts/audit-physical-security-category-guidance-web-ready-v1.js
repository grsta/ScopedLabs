const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "physical-security-category-guidance-web-ready-audit-001";
const guidanceFile = path.join(root, "assets", "physical-security-category-guidance.js");
const knowledgeFile = path.join(root, "assets", "physical-security-category-knowledge.js");
const sourcePolicyFile = path.join(root, "assets", "physical-security-source-policy.js");
const webReadyKnowledgeAuditFile = path.join(root, "scripts", "audit-physical-security-knowledge-web-ready-v1.js");
const masterAdapterSuiteFile = path.join(root, "scripts", "audit-physical-security-guidance-adapters-v1.js");
const generatorFile = path.join(root, "scripts", "guidance-adapter-factory-generator-v1.js");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const guidance = read(guidanceFile);
const knowledge = read(knowledgeFile);
const sourcePolicy = read(sourcePolicyFile);
const webReadyKnowledgeAudit = read(webReadyKnowledgeAuditFile);
const masterAdapterSuite = read(masterAdapterSuiteFile);
const generator = read(generatorFile);

const requiredApi = [
  "collectToolGuidance",
  "summarizeGuidanceItems",
  "createCategoryGuidance",
  "explainCategoryGuidance",
  "explainCurrentGuidance",
  "classifyExternalSource"
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

const rows = [
  {
    id: "guidance-file",
    status: fs.existsSync(guidanceFile) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-category-guidance.js exists"
  },
  {
    id: "guidance-version",
    status: guidance.includes("physical-security-category-guidance-001-web-ready-master") ? "SAFE" : "WATCH",
    detail: "web-ready category guidance version marker is present"
  },
  {
    id: "guidance-global",
    status: guidance.includes("ScopedLabsPhysicalSecurityCategoryGuidance") ? "SAFE" : "WATCH",
    detail: "category guidance exports expected global"
  },
  {
    id: "guidance-api",
    status: requiredApi.every((name) => guidance.includes(name)) ? "SAFE" : "WATCH",
    detail: "category guidance exposes collection, summary, explanation, and source classification APIs"
  },
  {
    id: "knowledge-file",
    status: fs.existsSync(knowledgeFile) ? "SAFE" : "FAIL",
    detail: "web-ready category knowledge file exists"
  },
  {
    id: "knowledge-version",
    status: knowledge.includes("physical-security-category-knowledge-001-web-ready") ? "SAFE" : "WATCH",
    detail: "category guidance is paired with web-ready knowledge core"
  },
  {
    id: "source-policy-file",
    status: fs.existsSync(sourcePolicyFile) ? "SAFE" : "FAIL",
    detail: "source policy file exists"
  },
  {
    id: "source-policy-version",
    status: sourcePolicy.includes("physical-security-source-policy-001-web-intake-gate") ? "SAFE" : "WATCH",
    detail: "source policy web-intake gate exists"
  },
  {
    id: "knowledge-linked",
    status:
      guidance.includes("ScopedLabsPhysicalSecurityCategoryKnowledge") &&
      guidance.includes("getToolWebPolicy") &&
      guidance.includes("toolKnowledgeFor") ? "SAFE" : "WATCH",
    detail: "category guidance reads category knowledge core"
  },
  {
    id: "source-policy-linked",
    status:
      guidance.includes("ScopedLabsPhysicalSecuritySourcePolicy") &&
      guidance.includes("classifyExternalSource") &&
      guidance.includes("runtimeFetchAllowed: false") ? "SAFE" : "WATCH",
    detail: "category guidance can classify external source candidates without fetching"
  },
  {
    id: "adapter-globals-not-hardcoded-in-guidance",
    status:
      requiredGlobals.every((globalName) => knowledge.includes(globalName)) &&
      guidance.includes("entry.globalName") ? "SAFE" : "WATCH",
    detail: "adapter globals live in registry/knowledge; guidance reads registry entries"
  },
  {
    id: "web-ready-knowledge-audit",
    status: webReadyKnowledgeAudit.includes("physical-security-knowledge-web-ready-audit-001") ? "SAFE" : "WATCH",
    detail: "web-ready knowledge audit exists"
  },
  {
    id: "master-adapter-suite",
    status: masterAdapterSuite.includes("Physical Security Guidance Adapter Audit Suite") ? "SAFE" : "WATCH",
    detail: "master adapter suite remains present"
  },
  {
    id: "generator-gate",
    status: generator.includes("guidance-adapter-factory-generator-001-dry-run-gate") ? "SAFE" : "WATCH",
    detail: "dry-run generator gate remains present"
  },
  {
    id: "no-runtime-fetch",
    status: !/fetch\s*\(/.test(guidance) && guidance.includes("runtimeFetchAllowed: false") ? "SAFE" : "WATCH",
    detail: "category guidance does not fetch the web at runtime"
  },
  {
    id: "no-dom-ownership",
    status: !/(appendChild|insertAdjacentHTML|innerHTML\s*=|classList\.add|setAttribute)/.test(guidance) ? "SAFE" : "WATCH",
    detail: "category guidance foundation does not own visible DOM rendering"
  }
];

console.log("\nPhysical Security Category Guidance Web-Ready Audit\n");
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