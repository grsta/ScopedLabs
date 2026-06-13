const fs = require("fs");
const path = require("path");

const root = process.cwd();

const paths = {
  contract: "docs/access-control-summary-master-assistant-contract-v1.md",
  psIndex: "tools/physical-security/summary/index.html",
  psScript: "tools/physical-security/summary/script.js",
  acCategory: "tools/access-control/index.html",
  acSummaryIndex: "tools/access-control/summary/index.html",
  acSummaryScript: "tools/access-control/summary/script.js",
  acOpeningProof: "scripts/audit-access-control-opening-page-link-coverage-0612.js",
  openingLinkCoverage: "scripts/audit-tools-opening-page-link-coverage-0612.js",
  reportMetadataAsset: "assets/scopedlabs-report-metadata.js",
  assistantExportAsset: "assets/scopedlabs-assistant-export.js",
};

const accessControlToolOrder = [
  "scope-planner",
  "door-count-planner",
  "reader-type-selector",
  "credential-format",
  "access-level-sizing",
  "panel-capacity",
  "lock-power-budget",
  "door-cable-length",
  "elevator-reader-count",
  "fail-safe-fail-secure",
  "special-locking-scope",
  "anti-passback-zones",
];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

function discoverAccessControlTools() {
  const categoryRoot = path.join(root, "tools", "access-control");
  if (!fs.existsSync(categoryRoot)) return [];

  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(path.join(categoryRoot, slug, "index.html")))
    .filter((slug) => slug !== "summary")
    .sort((a, b) => {
      const ai = accessControlToolOrder.indexOf(a);
      const bi = accessControlToolOrder.indexOf(b);

      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;

      return a.localeCompare(b);
    });
}

function hasAny(text, tokens) {
  return tokens.some((token) => String(text || "").includes(token));
}

function countAny(text, tokens) {
  return tokens.reduce((count, token) => count + (String(text || "").includes(token) ? 1 : 0), 0);
}

function scanAccessControlForMarkers(tokens) {
  const start = path.join(root, "tools", "access-control");
  const hits = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "summary") continue;
        walk(full);
        continue;
      }

      if (!/\.(html|js)$/i.test(entry.name)) continue;

      const rel = path.relative(root, full).replace(/\\/g, "/");
      const text = fs.readFileSync(full, "utf8");

      for (const token of tokens) {
        if (text.includes(token)) hits.push({ rel, token });
      }
    }
  }

  walk(start);
  return hits;
}

let failCount = 0;

const contract = read(paths.contract);
const psIndex = read(paths.psIndex);
const psScript = read(paths.psScript);
const acCategory = read(paths.acCategory);
const acOpeningProof = read(paths.acOpeningProof);
const reportMetadataAsset = read(paths.reportMetadataAsset);
const assistantExportAsset = read(paths.assistantExportAsset);

const acTools = discoverAccessControlTools();

console.log("ScopedLabs Access Control summary/master assistant readiness audit - 0612");
console.log("Repo:", root);
console.log("");

console.log("Contract / baseline files");

const contractOk =
  contract.includes("ACCESS_CONTROL_SUMMARY_PAGE") &&
  contract.includes("PHYSICAL_SECURITY_SUMMARY_MASTER_ASSISTANT_BASELINE") &&
  contract.includes("NO_IMPLEMENTATION_PATCH_YET");

console.log((contractOk ? "SAFE  " : "FAIL  ") + "Access Control summary/master assistant contract markers present");
if (!contractOk) failCount += 1;

const physicalBaselineOk =
  psIndex.includes("Physical Security Summary") &&
  psIndex.includes("Master Assistant") &&
  psIndex.includes("Final Report Export") &&
  psScript.includes("physical-security-summary-tool-notes-menu-016") &&
  psScript.includes("ScopedLabsPhysicalSecurityGuidanceMemory") &&
  psScript.includes("ScopedLabsPhysicalSecurityAreaState");

console.log((physicalBaselineOk ? "SAFE  " : "FAIL  ") + "Physical Security summary/master assistant baseline markers present");
if (!physicalBaselineOk) failCount += 1;

const openingProofOk =
  acOpeningProof.includes("ACCESS_CONTROL_OPENING_PAGE_LINK_COVERAGE_COMPLETE") &&
  acOpeningProof.includes("NO_CALCULATOR_SHELL_PATCH_YET");

console.log((openingProofOk ? "SAFE  " : "WATCH ") + "Access Control opening page proof audit present");

console.log("");
console.log("Access Control summary page state");

const summaryIndexExists = exists(paths.acSummaryIndex);
const summaryScriptExists = exists(paths.acSummaryScript);

console.log((summaryIndexExists ? "INFO  " : "WATCH ") + paths.acSummaryIndex + (summaryIndexExists ? " exists" : " missing / ready for creation"));
console.log((summaryScriptExists ? "INFO  " : "WATCH ") + paths.acSummaryScript + (summaryScriptExists ? " exists" : " missing / ready for creation"));

console.log("");
console.log("Access Control child tools discovered");
console.log("INFO  count: " + acTools.length);

for (const slug of acTools) {
  console.log("INFO  /tools/access-control/" + slug + "/");
}

const missingKnownTools = accessControlToolOrder.filter((slug) => !acTools.includes(slug));

console.log("");
console.log("Known Access Control tool coverage");
if (missingKnownTools.length) {
  for (const slug of missingKnownTools) {
    console.log("WATCH missing known tool path: " + slug);
  }
} else {
  console.log("SAFE  all known Access Control tool paths discovered");
}

const guidanceHits = scanAccessControlForMarkers([
  "GuidanceMemory",
  "guidance memory",
  "ScopedLabsAccessControl",
  "access-control-guidance",
  "reportSummary",
  "nextStep",
  "customNotes",
  "scopedlabs:report-metadata:page:",
]);

console.log("");
console.log("Access Control memory / notes marker scan");
console.log("INFO  marker hits: " + guidanceHits.length);

const groupedHits = new Map();

for (const hit of guidanceHits) {
  const key = hit.token;
  if (!groupedHits.has(key)) groupedHits.set(key, new Set());
  groupedHits.get(key).add(hit.rel);
}

for (const [token, files] of groupedHits.entries()) {
  console.log("INFO  " + token + " -> " + files.size + " file(s)");
}

console.log("");
console.log("Shared export/report asset check");

const reportMetadataOk =
  reportMetadataAsset.includes("reportMetadata") ||
  reportMetadataAsset.includes("Report Metadata") ||
  reportMetadataAsset.includes("scopedlabs-report-metadata");

const assistantExportOk =
  assistantExportAsset.includes("exportReport") ||
  assistantExportAsset.includes("saveSnapshot") ||
  assistantExportAsset.includes("scopedlabs-assistant-export");

console.log((reportMetadataOk ? "SAFE  " : "WATCH ") + "shared report metadata asset available");
console.log((assistantExportOk ? "SAFE  " : "WATCH ") + "shared assistant export asset available");

console.log("");
console.log("Decision summary");

if (physicalBaselineOk) {
  console.log("SAFE  PHYSICAL_SECURITY_REFERENCE_BASELINE_FOUND");
} else {
  console.log("FAIL  PHYSICAL_SECURITY_REFERENCE_BASELINE_MISSING");
}

if (acTools.length >= 10 && !missingKnownTools.length) {
  console.log("SAFE  ACCESS_CONTROL_CHILD_TOOLS_DISCOVERED");
} else {
  console.log("WATCH ACCESS_CONTROL_CHILD_TOOLS_REVIEW");
}

if (!summaryIndexExists && !summaryScriptExists) {
  console.log("WATCH ACCESS_CONTROL_SUMMARY_PAGE_MISSING_READY_FOR_CREATION");
} else {
  console.log("WATCH ACCESS_CONTROL_SUMMARY_PAGE_EXISTS_REVIEW_BEFORE_PATCH");
}

if (openingProofOk) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_OPENING_LINKS_COMPLETE");
} else {
  console.log("WATCH ACCESS_CONTROL_CATEGORY_OPENING_LINK_PROOF_REVIEW");
}

if (guidanceHits.length > 0) {
  console.log("WATCH ACCESS_CONTROL_GUIDANCE_MEMORY_REVIEW");
} else {
  console.log("WATCH ACCESS_CONTROL_GUIDANCE_MEMORY_NOT_OBVIOUS_REVIEW");
}

if (reportMetadataOk && assistantExportOk) {
  console.log("SAFE  ACCESS_CONTROL_REPORT_METADATA_COMPATIBLE_REVIEW");
} else {
  console.log("WATCH ACCESS_CONTROL_REPORT_METADATA_COMPATIBILITY_REVIEW");
}

console.log("SAFE  ACCESS_CONTROL_SUMMARY_MASTER_ASSISTANT_CONTRACT_ACTIVE");
console.log("SAFE  USE_PHYSICAL_SECURITY_AS_REFERENCE_ONLY");
console.log("SAFE  NO_IMPLEMENTATION_PATCH_YET");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed Access Control marker hits");

  if (!guidanceHits.length) {
    console.log("  no marker hits found");
  } else {
    for (const hit of guidanceHits) {
      console.log("  " + hit.token + " -> " + hit.rel);
    }
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
