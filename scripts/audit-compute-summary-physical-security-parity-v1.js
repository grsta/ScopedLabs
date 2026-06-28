const fs = require("fs");
const path = require("path");

const root = process.cwd();
const computeFile = "tools/compute/summary/index.html";
const physicalFile = "tools/physical-security/summary/index.html";

const compute = fs.readFileSync(path.join(root, computeFile), "utf8");
const physical = fs.readFileSync(path.join(root, physicalFile), "utf8");

let pass = 0;
let fail = 0;

function check(code, condition, message, file = computeFile) {
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

check("PHYSICAL_SECURITY_SUMMARY_REFERENCE_EXISTS", physical.includes("summary-page-heading") && physical.includes("summary-master-card"), "Physical Security Summary reference page should expose the accepted summary rhythm.", physicalFile);
check("COMPUTE_SUMMARY_PAGE_HEADING", compute.includes("summary-page-heading") && compute.includes("Compute Summary"), "Compute Summary should use the summary page heading pattern.");
check("COMPUTE_SUMMARY_HERO_PARITY", compute.includes("card summary-hero summary-page-hero") && compute.includes("summary-hero-flow"), "Compute Summary should use the same hero/flow rhythm as Physical Security Summary.");
check("COMPUTE_SUMMARY_MASTER_CARD", compute.includes("card summary-master-card") && compute.includes("Compute Master Assistant"), "Compute Summary should expose the master assistant card rhythm.");
check("COMPUTE_SUMMARY_RESULTS_CARD", compute.includes("card summary-results-card") && compute.includes("Compute Rollup"), "Compute Summary should expose the summary results card rhythm.");
check("COMPUTE_SUMMARY_GRID", compute.includes("summary-grid") && compute.includes("compute-summary-kpi"), "Compute Summary should show KPI cards instead of a debug table.");
check("COMPUTE_SUMMARY_SCOPE_CARD", compute.includes("card summary-scope-card") && compute.includes("Selected Branch Gaps"), "Compute Summary should use summary scope-card rhythm for branch gaps.");
check("COMPUTE_SUMMARY_TOOL_NOTES_CARD", compute.includes("card summary-tool-notes-card") && compute.includes("Tool Notes"), "Compute Summary should include a Tool Notes card placeholder.");
check("COMPUTE_SUMMARY_EXPORT_CARD", compute.includes("card summary-export-card") && compute.includes("Final Report Export"), "Compute Summary should include a Final Report Export card placeholder.");
check("COMPUTE_SUMMARY_NEXT_CARD", compute.includes("card summary-next-card") && compute.includes("Continue Planning"), "Compute Summary should include a Continue Planning card.");
check("COMPUTE_SUMMARY_PLAN_STATE_PRESERVED", compute.includes("scopedlabs-compute-plan-state.js") && compute.includes("ScopedLabsComputeSummaryRollup"), "Compute Summary plan-state rollup script should remain wired.");
check("COMPUTE_SUMMARY_STATUS_CHIPS", compute.includes("summary-status-chip") && compute.includes("statusChipHtml"), "Compute Summary should render rectangular status chips.");
check("COMPUTE_SUMMARY_ROUTE_MARKER_PRESERVED", compute.includes('data-compute-summary-route-host="0627"') && compute.includes("Summary route is live"), "Compute Summary route-host marker and text should remain for existing route audit.");

console.log("");
console.log("SCOPEDLABS COMPUTE SUMMARY PHYSICAL SECURITY PARITY AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

process.exit(fail ? 1 : 0);
