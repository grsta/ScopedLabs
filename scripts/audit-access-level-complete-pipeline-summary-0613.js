const fs = require("fs");
const path = require("path");

const root = process.cwd();

const htmlPath = path.join(root, "tools", "access-control", "access-level-sizing", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "access-level-sizing", "script.js");

const html = fs.readFileSync(htmlPath, "utf8");
const script = fs.readFileSync(scriptPath, "utf8");
const combined = html + "\n" + script;

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Level complete-pipeline summary CTA audit - 0613");
console.log("Repo:", root);
console.log("");

function safe(label) {
  console.log("SAFE  " + label);
}

function watch(label) {
  console.log("WATCH " + label);
  watchCount += 1;
}

function fail(label) {
  console.log("FAIL  " + label);
  failCount += 1;
}

if (/Complete Pipeline/i.test(combined)) safe("Complete Pipeline CTA text exists");
else watch("Complete Pipeline CTA text not found in source");

if (combined.includes("/tools/access-control/summary/")) safe("Access Control Summary route exists");
else fail("Access Control Summary route missing");

const completeToScopePlanner =
  /Complete Pipeline[\s\S]{0,1800}scope-planner|scope-planner[\s\S]{0,1800}Complete Pipeline/i.test(combined);

if (completeToScopePlanner) fail("Complete Pipeline still appears routed near Scope Planner");
else safe("Complete Pipeline no longer routes near Scope Planner");

if (combined.includes("access-level-sizing-summary-scoped-publisher-0613")) {
  safe("Access Level scoped summary publisher remains present");
} else {
  fail("Access Level scoped summary publisher missing");
}

if (combined.includes("toolSlug: STEP") && combined.includes("scopeId,")) {
  safe("Access Level summary carryover still includes toolSlug + scopeId");
} else {
  fail("Access Level summary carryover shape missing toolSlug/scopeId");
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  safe("ACCESS_LEVEL_COMPLETE_PIPELINE_POINTS_TO_SUMMARY");
  safe("ACCESS_LEVEL_SUMMARY_CARRYOVER_STILL_PRESENT");
} else {
  fail("ACCESS_LEVEL_COMPLETE_PIPELINE_ROUTE_NOT_READY");
}

if (watchCount > 0) {
  console.log("WATCH manual review recommended: " + watchCount);
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
