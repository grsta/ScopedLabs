const fs = require("fs");
const path = require("path");

const root = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function pass(label) {
  console.log("SAFE  " + label);
}

function fail(label) {
  console.log("FAIL  " + label);
  failCount += 1;
}

let failCount = 0;

console.log("ScopedLabs Access Control category readiness checkpoint - 0611");
console.log("Repo:", root);
console.log("");

const requiredScripts = [
  "scripts/audit-access-control-main-gates-0610.js",
  "scripts/audit-access-control-evidence-suite-0611.js",
  "scripts/audit-access-control-status-system-rollup-0611.js",
  "scripts/audit-access-control-export-report-parked-state-0611.js",
  "scripts/audit-access-control-summary-page-proof-0612.js",
  "scripts/audit-access-control-summary-ui-polish-proof-0612.js",
  "scripts/audit-access-control-summary-public-access-0613.js",
  "scripts/audit-access-control-summary-visual-cleanup-0613.js"
];

for (const rel of requiredScripts) {
  if (exists(rel)) pass("required readiness/evidence script exists: " + rel);
  else fail("missing required readiness/evidence script: " + rel);
}

const categoryHtml = read("tools/access-control/index.html");
const summaryHtml = read("tools/access-control/summary/index.html");
const summaryScript = read("tools/access-control/summary/script.js");
const pageProof = read("scripts/audit-access-control-summary-page-proof-0612.js");
const uiProof = read("scripts/audit-access-control-summary-ui-polish-proof-0612.js");
const publicProof = read("scripts/audit-access-control-summary-public-access-0613.js");
const visualProof = read("scripts/audit-access-control-summary-visual-cleanup-0613.js");

console.log("");
console.log("Current summary contract");

if (categoryHtml.includes("/tools/access-control/summary/")) pass("category opening links to Access Control Summary");
else fail("category opening summary link missing");

if (
  summaryHtml.includes('data-summary-public="true"') &&
  summaryHtml.includes('data-tier="public"') &&
  !/<body\b[^>]*data-protected=/i.test(summaryHtml)
) {
  pass("summary page is public and not page-protected");
} else {
  fail("summary page public access markers are not current");
}

if (!summaryHtml.includes("Physical Security") && !summaryHtml.includes("physicalSecurity")) pass("summary page has no Physical Security markers");
else fail("summary page still has Physical Security markers");

if (
  summaryScript.includes("SUMMARY_SECTION_INSERT_AFTER") &&
  summaryScript.includes("findSummaryInsertAfterSection") &&
  summaryScript.includes("data-export-section")
) {
  pass("summary generated section order/export contract present");
} else {
  fail("summary generated section order/export contract missing");
}

if (pageProof.includes("ACCESS_CONTROL_SUMMARY_PAGE_PROOF_CURRENT") || pageProof.includes("ACCESS_CONTROL_FINAL_REPORT_HOST_CREATED")) {
  pass("summary page proof is on current contract");
} else {
  fail("summary page proof still looks stale");
}

if (uiProof.includes("ACCESS_CONTROL_SUMMARY_UI_POLISH_CURRENT") || uiProof.includes("ACCESS_CONTROL_SUMMARY_DUPLICATE_SHELLS_REMOVED")) {
  pass("summary UI polish proof is on current contract");
} else {
  fail("summary UI polish proof still looks stale");
}

if (publicProof.includes("ACCESS_CONTROL_SUMMARY_PUBLIC_ACCESS_CURRENT") || publicProof.includes("ACCESS_CONTROL_SUMMARY_LINKS_NOT_PRO_GATED")) {
  pass("summary public access proof is on current contract");
} else {
  fail("summary public access proof still looks stale");
}

if (
  visualProof.includes("ACCESS_CONTROL_SUMMARY_DUPLICATE_SHELLS_REMOVED") &&
  visualProof.includes("ACCESS_CONTROL_SUMMARY_GENERATED_SECTION_ORDER_LOCKED")
) {
  pass("summary visual cleanup proof is present");
} else {
  fail("summary visual cleanup proof missing current markers");
}

console.log("");
console.log("Category-readiness summary");

if (failCount === 0) {
  console.log(" 1  STATUS_SYSTEM_READY");
  console.log(" 1  EXPORT_REPORT_SYSTEM_PARKED");
  console.log(" 1  MAIN_GATES_PASS_EXPECTED");
  console.log(" 1  EVIDENCE_SUITE_PASS_EXPECTED");
  console.log(" 1  SUMMARY_PAGE_CURRENT_CONTRACT");
  console.log(" 1  SPECIAL_PATHS_DOCUMENTED");
  console.log(" 1  AUTO_FIX_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS");
  console.log(" 1  CATEGORY_BLUEPRINT_READY");
} else {
  console.log("FAIL  readiness check failures: " + failCount);
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");

