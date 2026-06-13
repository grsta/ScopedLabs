const fs = require("fs");
const path = require("path");

const root = process.cwd();
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "summary", "script.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function hasSectionWithClass(html, className) {
  const re = new RegExp("<section\\b[^>]*class=[\"'][^\"']*" + className + "[^\"']*[\"'][^>]*>", "i");
  return re.test(html);
}

let failCount = 0;

console.log("ScopedLabs Access Control summary visual cleanup audit - 0613");
console.log("Repo:", root);
console.log("");

const html = read(indexPath);
const script = read(scriptPath);

if (!hasSectionWithClass(html, "summary-master-card")) {
  console.log("SAFE  duplicate static Master Assistant shell removed");
} else {
  console.log("FAIL  duplicate static Master Assistant shell remains");
  failCount += 1;
}

if (!hasSectionWithClass(html, "summary-scope-card")) {
  console.log("SAFE  duplicate static Tool Guidance shell removed");
} else {
  console.log("FAIL  duplicate static Tool Guidance shell remains");
  failCount += 1;
}

if (!hasSectionWithClass(html, "summary-tool-notes-card")) {
  console.log("SAFE  duplicate static Tool Notes shell removed");
} else {
  console.log("FAIL  duplicate static Tool Notes shell remains");
  failCount += 1;
}

if (html.includes('id="summaryExportSection"') && html.includes("Final Report Export")) {
  console.log("SAFE  Final Report Export section remains");
} else {
  console.log("FAIL  Final Report Export section missing");
  failCount += 1;
}

if (html.includes('data-summary-public="true"') && html.includes('data-tier="public"') && !/<body\\b[^>]*data-protected=/i.test(html)) {
  console.log("SAFE  public summary access markers preserved");
} else {
  console.log("FAIL  public summary access markers changed");
  failCount += 1;
}

if (script.includes("SUMMARY_SECTION_INSERT_AFTER") && script.includes("findSummaryInsertAfterSection")) {
  console.log("SAFE  summary script owns generated section order");
} else {
  console.log("FAIL  summary script missing generated section order helper");
  failCount += 1;
}

if (
  script.includes("accessControlMasterAssistant") &&
  script.includes("accessControlToolRollup") &&
  script.includes("accessControlToolNotes") &&
  script.includes("data-export-section")
) {
  console.log("SAFE  generated summary sections remain export-safe");
} else {
  console.log("FAIL  generated summary sections are not export-safe");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_DUPLICATE_SHELLS_REMOVED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_GENERATED_SECTION_ORDER_LOCKED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_EXPORT_SECTION_PRESERVED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_VISUAL_CLEANUP_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
