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

check("PHYSICAL_SECURITY_SUMMARY_REFERENCE_EXISTS", physical.includes("summary-page-heading") && physical.includes("summary-master-card") && physical.includes("Final Report Export"), "Physical Security Summary reference page should expose the accepted summary rhythm.", physicalFile);
check("COMPUTE_SUMMARY_PAGE_HEADING", compute.includes("summary-page-heading") && compute.includes("Compute Summary"), "Compute Summary should use the summary page heading pattern.");
check("COMPUTE_SUMMARY_DESIGN_FLOW_CARD", compute.includes("Design flow") && compute.includes("Foundation") && compute.includes("Core compute pipeline") && compute.includes("Optional compute branches"), "Compute Summary should mirror the Physical Security Design Flow card.");
check("COMPUTE_SUMMARY_MASTER_ROLLUP_CARD", compute.includes("Master rollup for the Compute design") && compute.includes("Final category rollup") && compute.includes("Cross-category ready"), "Compute Summary should mirror the master rollup intro card.");
check("COMPUTE_SUMMARY_MASTER_ASSISTANT_CARD", compute.includes("summary-master-card") && compute.includes("Compute Master Assistant") && compute.includes("Category master"), "Compute Summary should expose the master assistant card rhythm.");
check("COMPUTE_SUMMARY_MASTER_ASSISTANT_PANEL", compute.includes("Generated") && compute.includes("Healthy") && compute.includes("Watch") && compute.includes("Risk") && compute.includes("Knowledge state"), "Compute Summary should mirror the Physical Security master assistant panel rhythm.");
check("COMPUTE_SUMMARY_GUIDANCE_ROLLUP", compute.includes("summary-results-card") && compute.includes("Compute Workload Guidance Rollup") && compute.includes("Core and Branch Guidance for Selected Workload"), "Compute Summary should expose the category guidance rollup rhythm.");
check("COMPUTE_SUMMARY_OPTIONAL_BRANCHES", compute.includes("Optional Compute Branches") && compute.includes("computeSummaryGapList"), "Compute Summary should keep optional branch gaps inside the rollup section.");
check("COMPUTE_SUMMARY_TOOL_NOTES_CARD", compute.includes("summary-tool-notes-card") && compute.includes("Tool Notes"), "Compute Summary should include a Tool Notes card.");
check("COMPUTE_SUMMARY_EXPORT_CARD", compute.includes("summary-export-card") && compute.includes("Final Report Export") && compute.includes("Watch/Risk detail only"), "Compute Summary should include a Physical Security-style Final Report Export section.");
check("COMPUTE_SUMMARY_REPORT_DETAIL_TABLE", compute.includes("Summary item") && compute.includes("Report next step") && compute.includes("computeSummaryWatchRiskDetail"), "Compute Summary should mirror the report detail posture.");
check("COMPUTE_SUMMARY_NEXT_CARD", compute.includes("summary-next-card") && compute.includes("Continue Planning"), "Compute Summary should include a Continue Planning card.");
check("COMPUTE_SUMMARY_ROUTE_NAV_PRESERVED", compute.includes("Back to Workload Planner") && compute.includes("Review GPU VRAM"), "Compute Summary should preserve existing route-host nav actions.");
check("COMPUTE_SUMMARY_ASSISTANT_FOUNDATION_MARKER", compute.includes("data-compute-summary-assistant-foundation") && compute.includes("Summary Assistant foundation") && compute.includes("computeSummaryAssistantList"), "Compute Summary should preserve the assistant foundation contract marker.");
check("COMPUTE_SUMMARY_PLAN_STATE_PRESERVED", compute.includes("scopedlabs-compute-plan-state.js") && compute.includes("ScopedLabsComputeSummaryRollup"), "Compute Summary plan-state rollup script should remain wired.");
check("COMPUTE_SUMMARY_STATUS_CHIPS", compute.includes("summary-status-chip") && compute.includes("statusChipHtml"), "Compute Summary should render rectangular status chips.");
check("COMPUTE_SUMMARY_ROUTE_MARKER_PRESERVED", compute.includes('data-compute-summary-route-host="0627"') && compute.includes("Summary route is live"), "Compute Summary route-host marker and text should remain for existing route audit.");
check("COMPUTE_SUMMARY_TARGET_MARKER", compute.includes('data-compute-summary-physical-security-target="0628"'), "Compute Summary should carry the Physical Security target marker.");

console.log("");
console.log("SCOPEDLABS COMPUTE SUMMARY PHYSICAL SECURITY PARITY AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

process.exit(fail ? 1 : 0);
