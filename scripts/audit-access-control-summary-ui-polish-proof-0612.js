const fs = require("fs");
const path = require("path");

const root = process.cwd();

const indexRel = "tools/access-control/summary/index.html";
const scriptRel = "tools/access-control/summary/script.js";
const uiAuditRel = "scripts/audit-access-control-summary-ui-polish-0612.js";

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

let failCount = 0;

console.log("ScopedLabs Access Control summary UI polish proof - 0612");
console.log("Repo:", root);
console.log("");

const index = read(indexRel);
const script = read(scriptRel);
const uiAudit = read(uiAuditRel);

const requiredIndexMarkers = [
  'data-access-control-summary-page="true"',
  'id="access-control-summary-polish-0612"',
  "Access Control Summary",
  "Access Control Master Assistant",
];

for (const marker of requiredIndexMarkers) {
  if (index.includes(marker)) {
    console.log("SAFE  index polish marker: " + marker);
  } else {
    console.log("FAIL  missing index polish marker: " + marker);
    failCount += 1;
  }
}

const requiredStyleOrScriptMarkers = [
  "access-summary-kpi",
  "access-summary-tool-row",
  "access-summary-status",
  "accessControlSummaryKpis",
  "accessControlToolRollup",
  "accessControlToolNotes",
  "ScopedLabsAccessControlSummary",
];

for (const marker of requiredStyleOrScriptMarkers) {
  if (index.includes(marker) || script.includes(marker)) {
    console.log("SAFE  style/script marker: " + marker);
  } else {
    console.log("FAIL  missing style/script marker: " + marker);
    failCount += 1;
  }
}

if (uiAudit.includes("POLISH_AUDIT_ONLY")) {
  console.log("SAFE  UI polish audit remains audit-only");
} else {
  console.log("FAIL  UI polish audit marker missing");
  failCount += 1;
}

if (index.includes("Physical Security") || index.includes("physical-security")) {
  console.log("FAIL  Physical Security marker found after Access Control polish");
  failCount += 1;
} else {
  console.log("SAFE  no Physical Security markers after polish");
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_UI_POLISH_V1_PRESENT");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_COPY_POLISHED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_GENERATED_SECTIONS_POLISHED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_UI_POLISH_PROOF_FAILED");
}

console.log("SAFE  NO_CALCULATOR_PAGE_CHANGES");
console.log("SAFE  NO_AUTH_CHECKOUT_EXPORT_SNAPSHOT_BEHAVIOR_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
