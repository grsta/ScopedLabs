const fs = require("fs");
const path = require("path");

const root = process.cwd();

const htmlPath = path.join(root, "tools", "access-control", "access-level-sizing", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "access-level-sizing", "script.js");

const html = fs.readFileSync(htmlPath, "utf8");
const script = fs.readFileSync(scriptPath, "utf8");
const combined = html + "\n" + script;

let failCount = 0;

console.log("ScopedLabs Access Level direct Summary CTA audit - 0613");
console.log("Repo:", root);
console.log("");

function requireMarker(label, marker) {
  if (combined.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker("Complete Pipeline text", "Complete Pipeline");
requireMarker("Summary URL", "/tools/access-control/summary/");
requireMarker("script marker", "access-level-complete-pipeline-summary-0613");
requireMarker("binding function", "function bindCompletePipelineSummaryDestination");
requireMarker("click route", "window.location.href = summaryUrl");
requireMarker("carryover before navigation", "persistAccessLevelSummaryCarryover");

if (/Complete Pipeline[\s\S]{0,900}\/tools\/access-control\/summary\//i.test(combined) ||
    /\/tools\/access-control\/summary\/[\s\S]{0,900}Complete Pipeline/i.test(combined)) {
  console.log("SAFE  Complete Pipeline is near Summary route");
} else {
  console.log("FAIL  Complete Pipeline is not near Summary route");
  failCount += 1;
}

if (/Complete Pipeline[\s\S]{0,900}\/tools\/access-control\/(?!summary)/i.test(html)) {
  console.log("FAIL  Complete Pipeline still appears near a non-summary Access Control route in HTML");
  failCount += 1;
} else {
  console.log("SAFE  Complete Pipeline HTML has no nearby non-summary Access Control route");
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_LEVEL_COMPLETE_PIPELINE_FORCES_SUMMARY_DESTINATION");
} else {
  console.log("FAIL  ACCESS_LEVEL_COMPLETE_PIPELINE_DESTINATION_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
