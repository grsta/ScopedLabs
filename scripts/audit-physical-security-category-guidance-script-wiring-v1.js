const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "physical-security-category-guidance-script-wiring-audit-001";

const provenTools = [
  "scene-illumination",
  "mounting-height",
  "field-of-view",
  "camera-coverage-area",
  "camera-spacing",
  "blind-spot-check",
  "pixel-density",
  "face-recognition-range",
  "license-plate-range"
];

const protectedOrSkippedTools = [
  "area-planner",
  "lens-selection"
];

const managedIncludes = [
  "/assets/physical-security-source-policy.js",
  "/assets/physical-security-category-knowledge.js",
  "/assets/physical-security-guidance-registry.js",
  "/assets/physical-security-category-guidance.js"
];

const assetFiles = [
  "assets/physical-security-source-policy.js",
  "assets/physical-security-category-knowledge.js",
  "assets/physical-security-guidance-registry.js",
  "assets/physical-security-category-guidance.js"
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
}

function baseOf(src) {
  return String(src || "").split("?")[0];
}

function countBase(srcs, base) {
  return srcs.filter((src) => baseOf(src) === base).length;
}

function indexOfBase(srcs, base) {
  return srcs.findIndex((src) => baseOf(src) === base);
}

function auditToolPage(slug) {
  const file = path.join(root, "tools", "physical-security", slug, "index.html");
  const html = read(file);
  const srcs = scriptSrcs(html);

  const sourcePolicyIndex = indexOfBase(srcs, "/assets/physical-security-source-policy.js");
  const knowledgeIndex = indexOfBase(srcs, "/assets/physical-security-category-knowledge.js");
  const registryIndex = indexOfBase(srcs, "/assets/physical-security-guidance-registry.js");
  const categoryGuidanceIndex = indexOfBase(srcs, "/assets/physical-security-category-guidance.js");
  const localIndex = indexOfBase(srcs, "./script.js");

  const countsOk = managedIncludes.every((base) => countBase(srcs, base) === 1);

  const orderOk =
    sourcePolicyIndex >= 0 &&
    knowledgeIndex >= 0 &&
    registryIndex >= 0 &&
    categoryGuidanceIndex >= 0 &&
    localIndex >= 0 &&
    sourcePolicyIndex < knowledgeIndex &&
    knowledgeIndex < categoryGuidanceIndex &&
    registryIndex < categoryGuidanceIndex &&
    categoryGuidanceIndex < localIndex;

  const versionsOk =
    srcs.includes("/assets/physical-security-source-policy.js?v=physical-security-source-policy-001-web-intake-gate") &&
    srcs.includes("/assets/physical-security-category-knowledge.js?v=physical-security-category-knowledge-001-web-ready") &&
    srcs.includes("/assets/physical-security-guidance-registry.js?v=physical-security-guidance-registry-001-foundation") &&
    srcs.includes("/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-001-web-ready-master");

  return {
    id: "tool-page-" + slug,
    status: fs.existsSync(file) && countsOk && orderOk && versionsOk ? "SAFE" : "WATCH",
    detail: JSON.stringify({
      file: rel(file),
      exists: fs.existsSync(file),
      sourcePolicyIndex,
      knowledgeIndex,
      registryIndex,
      categoryGuidanceIndex,
      localIndex,
      countsOk,
      orderOk,
      versionsOk
    })
  };
}

function auditProtectedPage(slug) {
  const file = path.join(root, "tools", "physical-security", slug, "index.html");
  const html = read(file);
  const srcs = scriptSrcs(html);

  const loaded = managedIncludes.some((base) => countBase(srcs, base) > 0);

  return {
    id: "protected-skip-page-" + slug,
    status: !fs.existsSync(file) || !loaded ? "SAFE" : "WATCH",
    detail: JSON.stringify({
      file: rel(file),
      exists: fs.existsSync(file),
      managedCategoryGuidanceScriptsLoaded: loaded
    })
  };
}

const sourcePolicyText = read(path.join(root, "assets", "physical-security-source-policy.js"));
const knowledgeText = read(path.join(root, "assets", "physical-security-category-knowledge.js"));
const registryText = read(path.join(root, "assets", "physical-security-guidance-registry.js"));
const guidanceText = read(path.join(root, "assets", "physical-security-category-guidance.js"));

const rows = [
  {
    id: "asset-files",
    status: assetFiles.every((file) => fs.existsSync(path.join(root, file))) ? "SAFE" : "FAIL",
    detail: "source policy, knowledge core, registry, and category guidance assets exist"
  },
  {
    id: "source-policy-version",
    status: sourcePolicyText.includes("physical-security-source-policy-001-web-intake-gate") ? "SAFE" : "WATCH",
    detail: "source policy version marker"
  },
  {
    id: "knowledge-version",
    status: knowledgeText.includes("physical-security-category-knowledge-001-web-ready") ? "SAFE" : "WATCH",
    detail: "knowledge core version marker"
  },
  {
    id: "registry-version",
    status: registryText.includes("physical-security-guidance-registry-001-foundation") ? "SAFE" : "WATCH",
    detail: "guidance registry version marker"
  },
  {
    id: "category-guidance-version",
    status: guidanceText.includes("physical-security-category-guidance-001-web-ready-master") ? "SAFE" : "WATCH",
    detail: "category guidance master version marker"
  },
  ...provenTools.map(auditToolPage),
  ...protectedOrSkippedTools.map(auditProtectedPage)
];

console.log("\nPhysical Security Category Guidance Script Wiring Audit\n");
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
