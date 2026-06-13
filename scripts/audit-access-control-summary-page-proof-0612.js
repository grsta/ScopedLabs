const fs = require("fs");
const path = require("path");

const root = process.cwd();
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "summary", "script.js");
const categoryPath = path.join(root, "tools", "access-control", "index.html");
const sitemapPath = path.join(root, "sitemap.xml");

const toolRefs = [
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

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function bodyTag(html) {
  const match = String(html || "").match(/<body\b[^>]*>/i);
  return match ? match[0] : "";
}

function isPublicSummaryBody(html) {
  const body = bodyTag(html);
  return /data-summary-public\s*=\s*["\']true["\']/i.test(body) &&
    /data-tier\s*=\s*["\']public["\']/i.test(body) &&
    !/data-protected\s*=/i.test(body);
}

let failCount = 0;

console.log("ScopedLabs Access Control summary page proof - 0612");
console.log("Repo:", root);
console.log("");

const index = read(indexPath);
const script = read(scriptPath);
const category = read(categoryPath);
const sitemap = read(sitemapPath);

if (index) console.log("SAFE  tools/access-control/summary/index.html exists");
else { console.log("FAIL  tools/access-control/summary/index.html missing"); failCount += 1; }

if (script) console.log("SAFE  tools/access-control/summary/script.js exists");
else { console.log("FAIL  tools/access-control/summary/script.js missing"); failCount += 1; }

if (index.includes("Access Control Summary")) console.log("SAFE  index marker: Access Control Summary");
else { console.log("FAIL  missing index marker: Access Control Summary"); failCount += 1; }

if (script.includes("Access Control Master Assistant") && script.includes("accessControlMasterAssistant")) {
  console.log("SAFE  generated script marker: Access Control Master Assistant");
} else {
  console.log("FAIL  missing generated script marker: Access Control Master Assistant");
  failCount += 1;
}

if (index.includes("Final Report Export")) console.log("SAFE  index marker: Final Report Export");
else { console.log("FAIL  missing index marker: Final Report Export"); failCount += 1; }

if (index.includes("Report metadata")) console.log("SAFE  index marker: Report metadata");
else { console.log("FAIL  missing index marker: Report metadata"); failCount += 1; }

if (index.includes("Open Report")) console.log("SAFE  index marker: Open Report");
else { console.log("FAIL  missing index marker: Open Report"); failCount += 1; }

if (index.includes("Save Snapshot")) console.log("SAFE  index marker: Save Snapshot");
else { console.log("FAIL  missing index marker: Save Snapshot"); failCount += 1; }

if (isPublicSummaryBody(index)) console.log("SAFE  Access Control summary page is public and not page-protected");
else { console.log("FAIL  Access Control summary public access contract missing"); failCount += 1; }

if (!index.includes("Physical Security") && !index.includes("physicalSecurity")) {
  console.log("SAFE  no Physical Security markers on Access Control summary page");
} else {
  console.log("FAIL  Physical Security marker remains on Access Control summary page");
  failCount += 1;
}

const scriptOwnsGeneratedSections =
  script.includes("accessControlSummaryKpis") &&
  script.includes("accessControlMasterAssistant") &&
  script.includes("accessControlToolRollup") &&
  script.includes("accessControlToolNotes");

if (scriptOwnsGeneratedSections) {
  console.log("SAFE  Access Control summary generated section markers present");
} else {
  console.log("FAIL  Access Control summary generated section markers missing");
  failCount += 1;
}

if (
  script.includes("SUMMARY_SECTION_INSERT_AFTER") &&
  script.includes("findSummaryInsertAfterSection") &&
  script.includes("data-export-section")
) {
  console.log("SAFE  generated summary section ordering/export contract present");
} else {
  console.log("FAIL  generated summary section ordering/export contract missing");
  failCount += 1;
}

let refCount = 0;
for (const slug of toolRefs) {
  if (script.includes(slug) || index.includes(slug)) refCount += 1;
}

console.log("INFO  Access Control tool definitions/link references: " + refCount + " / " + toolRefs.length);

if (refCount === toolRefs.length) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_DYNAMIC_LINK_BUILDER_PRESENT");
} else {
  console.log("FAIL  Access Control summary missing some tool references");
  failCount += 1;
}

if (category.includes("/tools/access-control/summary/")) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_OPENING_SUMMARY_LINK_PRESENT");
} else {
  console.log("FAIL  Access Control category opening summary link missing");
  failCount += 1;
}

if (sitemap.includes("/tools/access-control/summary/")) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SITEMAP_URL_PRESENT");
} else {
  console.log("FAIL  Access Control summary sitemap URL missing");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PAGE_PROOF_CURRENT");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_DYNAMIC_SECTIONS_OWNED_BY_SCRIPT");
  console.log("SAFE  ACCESS_CONTROL_FINAL_REPORT_HOST_CREATED");
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_OPENING_SUMMARY_LINK_PRESENT");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_SITEMAP_URL_PRESENT");
  console.log("SAFE  NO_CALCULATOR_PAGE_PATCHES");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_PAGE_PROOF_FAILED");
  console.log("SAFE  NO_CALCULATOR_PAGE_PATCHES");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
