const fs = require("fs");
const path = require("path");

const root = process.cwd();

const pageFile = "tools/compute/workload-planner/index.html";
const page = fs.readFileSync(path.join(root, pageFile), "utf8");

let pass = 0;
let fail = 0;

function check(code, condition, message, file = pageFile) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + code);
  } else {
    fail += 1;
    console.log("[FAIL] " + code);
    console.log("  " + file);
    console.log("  " + message);
  }
}

check(
  "COMPUTE_PLANNER_SUMMARY_ACCESS_SCRIPT",
  page.includes('data-compute-planner-summary-access="0628"') &&
    page.includes("ScopedLabsComputePlannerSummaryAccess0628"),
  "Compute planner should install a Summary access helper."
);

check(
  "COMPUTE_PLANNER_SUMMARY_ESCAPE_CTA",
  page.includes('data-compute-summary-access-cta="review-summary"') &&
    page.includes("Review Compute Summary") &&
    page.includes('var SUMMARY_HREF = "/tools/compute/summary/";'),
  "Compute planner should expose an explicit Review Compute Summary access CTA."
);

check(
  "COMPUTE_PLANNER_SUMMARY_PIPELINE_LINK",
  page.includes("makeSummaryPipelineNavClickable") &&
    page.includes('data-compute-summary-pipeline-link') &&
    page.includes("compute-summary-pipeline-link"),
  "Compute planner should make rendered Summary pipeline labels clickable."
);

check(
  "COMPUTE_PLANNER_START_GUIDED_FLOW_PRESERVED",
  page.includes("Start Guided Flow"),
  "Compute planner should preserve Start Guided Flow access while adding Summary access."
);

console.log("");
console.log("SCOPEDLABS COMPUTE PLANNER SUMMARY ACCESS AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

process.exit(fail ? 1 : 0);
