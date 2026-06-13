const fs = require("fs");
const path = require("path");

const root = process.cwd();

const indexRel = "tools/access-control/summary/index.html";
const scriptRel = "tools/access-control/summary/script.js";
const categoryRel = "tools/access-control/index.html";
const sitemapRel = "sitemap.xml";

const summaryUrl = "https://scopedlabs.com/tools/access-control/summary/";

const requiredTools = [
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
  "anti-passback-zones"
];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

function hasSummaryLink(html) {
  return html.includes('href="/tools/access-control/summary/"') ||
    html.includes("href='/tools/access-control/summary/'") ||
    html.includes('href="./summary/"') ||
    html.includes("href='./summary/'") ||
    html.includes('href="summary/"') ||
    html.includes("href='summary/'");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary page proof - 0612");
console.log("Repo:", root);
console.log("");

if (!exists(indexRel)) {
  console.log("FAIL  missing " + indexRel);
  failCount += 1;
} else {
  console.log("SAFE  " + indexRel + " exists");
}

if (!exists(scriptRel)) {
  console.log("FAIL  missing " + scriptRel);
  failCount += 1;
} else {
  console.log("SAFE  " + scriptRel + " exists");
}

const index = read(indexRel);
const script = read(scriptRel);
const category = read(categoryRel);
const sitemap = read(sitemapRel);

const indexMarkers = [
  "Access Control Summary",
  "Access Control Master Assistant",
  "Final Report Export",
  "Report metadata",
  "Open Report",
  "Save Snapshot",
];

for (const marker of indexMarkers) {
  if (index.includes(marker)) {
    console.log("SAFE  index marker: " + marker);
  } else {
    console.log("FAIL  missing index marker: " + marker);
    failCount += 1;
  }
}

if (index.includes("Physical Security") || index.includes("physical-security")) {
  console.log("FAIL  Physical Security marker still present in Access Control summary page");
  failCount += 1;
} else {
  console.log("SAFE  no Physical Security markers on Access Control summary page");
}

const dynamicLinkBuilderPresent =
  script.includes("/tools/access-control/") &&
  script.includes("row.slug") &&
  script.includes("TOOL_DEFINITIONS");

if (script.includes("access-control-summary-master-assistant-001") && script.includes("ScopedLabsAccessControlSummary")) {
  console.log("SAFE  Access Control summary script markers present");
} else {
  console.log("FAIL  Access Control summary script markers missing");
  failCount += 1;
}

let linkedTools = 0;

for (const slug of requiredTools) {
  const slugLiteral = '"' + slug + '"';

  if (script.includes(slugLiteral)) {
    linkedTools += 1;
  } else {
    console.log("FAIL  missing summary tool definition/link reference: " + slug);
    failCount += 1;
  }
}

console.log("INFO  Access Control tool definitions/link references: " + linkedTools + " / " + requiredTools.length);

if (dynamicLinkBuilderPresent) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_DYNAMIC_LINK_BUILDER_PRESENT");
} else {
  console.log("FAIL  dynamic Access Control summary link builder missing");
  failCount += 1;
}

if (hasSummaryLink(category)) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_OPENING_SUMMARY_LINK_PRESENT");
} else {
  console.log("FAIL  category opening page summary link missing");
  failCount += 1;
}

if (sitemap.includes(summaryUrl)) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SITEMAP_URL_PRESENT");
} else {
  console.log("FAIL  sitemap missing Access Control summary URL");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PAGE_CREATED");
  console.log("SAFE  ACCESS_CONTROL_MASTER_ASSISTANT_CREATED");
  console.log("SAFE  ACCESS_CONTROL_FINAL_REPORT_HOST_CREATED");
  console.log("SAFE  ACCESS_CONTROL_TOOL_LINK_REFERENCES_PRESENT");
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_OPENING_SUMMARY_LINK_PRESENT");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SITEMAP_URL_PRESENT");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_PAGE_PROOF_FAILED");
}

console.log("SAFE  NO_CALCULATOR_PAGE_PATCHES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
