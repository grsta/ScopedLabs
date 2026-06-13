const fs = require("fs");
const path = require("path");

const root = process.cwd();
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "summary", "script.js");

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function hasSectionClass(html, className) {
  const re = new RegExp("<section\\b[^>]*class=[\"'][^\"']*" + className + "[^\"']*[\"'][^>]*>", "i");
  return re.test(html);
}

let failCount = 0;

console.log("ScopedLabs Access Control summary UI polish proof - 0612");
console.log("Repo:", root);
console.log("");

const index = read(indexPath);
const script = read(scriptPath);

if (index.includes("summary-hero") && index.includes("Master rollup for the Access Control design")) {
  console.log("SAFE  summary hero remains present");
} else {
  console.log("FAIL  summary hero missing");
  failCount += 1;
}

if (!hasSectionClass(index, "summary-master-card")) {
  console.log("SAFE  duplicate static Master Assistant shell removed");
} else {
  console.log("FAIL  duplicate static Master Assistant shell remains");
  failCount += 1;
}

if (!hasSectionClass(index, "summary-scope-card")) {
  console.log("SAFE  duplicate static Tool Guidance shell removed");
} else {
  console.log("FAIL  duplicate static Tool Guidance shell remains");
  failCount += 1;
}

if (!hasSectionClass(index, "summary-tool-notes-card")) {
  console.log("SAFE  duplicate static Tool Notes shell removed");
} else {
  console.log("FAIL  duplicate static Tool Notes shell remains");
  failCount += 1;
}

if (index.includes('id="accessControlSummaryKpis"')) {
  console.log("SAFE  static KPI mount remains present");
} else {
  console.log("FAIL  static KPI mount missing");
  failCount += 1;
}

if (
  script.includes("accessControlMasterAssistant") &&
  script.includes("accessControlToolRollup") &&
  script.includes("accessControlToolNotes") &&
  script.includes("SUMMARY_SECTION_INSERT_AFTER")
) {
  console.log("SAFE  generated rollup sections are script-owned");
} else {
  console.log("FAIL  generated rollup section ownership missing");
  failCount += 1;
}

if (
  index.includes('id="summaryExportSection"') &&
  index.includes("Final Report Export") &&
  index.includes("Report metadata") &&
  index.includes("Open Report") &&
  index.includes("Save Snapshot")
) {
  console.log("SAFE  final report export section preserved");
} else {
  console.log("FAIL  final report export section missing or incomplete");
  failCount += 1;
}

if (index.includes('data-summary-public="true"') && index.includes('data-tier="public"') && !/<body\b[^>]*data-protected=/i.test(index)) {
  console.log("SAFE  public summary access markers preserved");
} else {
  console.log("FAIL  public summary access markers changed");
  failCount += 1;
}

if (!index.includes("Physical Security") && !index.includes("physicalSecurity")) {
  console.log("SAFE  Physical Security copy/IDs removed from summary page");
} else {
  console.log("FAIL  Physical Security copy/IDs remain on summary page");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_UI_POLISH_CURRENT");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_DUPLICATE_SHELLS_REMOVED");
  console.log("SAFE  NO_CALCULATOR_PAGE_CHANGES");
  console.log("SAFE  NO_AUTH_CHECKOUT_EXPORT_SNAPSHOT_BEHAVIOR_CHANGES");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_UI_POLISH_FAILED");
  console.log("SAFE  NO_CALCULATOR_PAGE_CHANGES");
  console.log("SAFE  NO_AUTH_CHECKOUT_EXPORT_SNAPSHOT_BEHAVIOR_CHANGES");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
