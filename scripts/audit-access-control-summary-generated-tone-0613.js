const fs = require("fs");
const path = require("path");

const root = process.cwd();
const indexPath = path.join(root, "tools", "access-control", "summary", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "summary", "script.js");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary generated tone audit - 0613");
console.log("Repo:", root);
console.log("");

const html = read(indexPath);
const script = read(scriptPath);

if (script.includes('section.className = "card access-control-summary-generated-card"')) {
  console.log("SAFE  generated summary cards use dedicated generated-card class");
} else {
  console.log("FAIL  generated summary cards do not use dedicated generated-card class");
  failCount += 1;
}

if (html.includes("access-control-summary-generated-tone-0613")) {
  console.log("SAFE  generated Summary tone contract marker present");
} else {
  console.log("FAIL  generated Summary tone contract marker missing");
  failCount += 1;
}

if (
  html.includes('body[data-access-control-summary-page="true"] .summary-results-card') &&
  html.includes('body[data-access-control-summary-page="true"] .access-control-summary-generated-card')
) {
  console.log("SAFE  Rollup and generated cards share green/dark Summary tone");
} else {
  console.log("FAIL  Rollup/generated card tone selectors missing");
  failCount += 1;
}

if (
  html.includes('id="summaryExportSection"') &&
  html.includes("Final Report Export") &&
  !/summaryExportSection[\s\S]{0,500}access-control-summary-generated-tone-0613/.test(html)
) {
  console.log("SAFE  Final Report Export section preserved and not folded into generated tone rule");
} else {
  console.log("FAIL  Final Report Export section missing or tone scope is suspicious");
  failCount += 1;
}

if (
  html.includes('data-summary-public="true"') &&
  html.includes('data-tier="public"') &&
  !/<body\b[^>]*data-protected=/i.test(html)
) {
  console.log("SAFE  public Summary access markers preserved");
} else {
  console.log("FAIL  public Summary access markers changed");
  failCount += 1;
}

if (script.includes("SUMMARY_SECTION_INSERT_AFTER") && script.includes("findSummaryInsertAfterSection")) {
  console.log("SAFE  generated section ordering helper preserved");
} else {
  console.log("FAIL  generated section ordering helper missing");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_GENERATED_GREEN_TONE");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_EXPORT_SECTION_PRESERVED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PUBLIC_ACCESS_PRESERVED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_GENERATED_TONE_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
