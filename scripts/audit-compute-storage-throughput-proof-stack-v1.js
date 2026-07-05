const fs = require("fs");
const path = require("path");

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "script.js"), "utf8");
const map = fs.readFileSync(path.join(root, "docs", "scopedlabs-module-map.md"), "utf8");

let pass = 0;
let fail = 0;

function check(label, ok) {
  if (ok) {
    pass += 1;
    console.log("[PASS] " + label);
  } else {
    fail += 1;
    console.log("[FAIL] " + label);
  }
}

check("HTML_PROOF_STACK_MARKER", html.includes('data-storage-throughput-proof-stack="0705"'));
check("HTML_REFERENCES_CARD_PRESENT", html.includes("computeStorageThroughputReferencesCard") && html.includes("Recommendation References"));
check("HTML_ACTIONS_CARD_PRESENT", html.includes("computeStorageThroughputRecommendedActionsCard") && html.includes("Recommended Actions"));
check("HTML_DECISION_CARD_PRESENT", html.includes("computeStorageThroughputDecisionScheduleCard") && html.includes("Storage Throughput Decision Schedule"));
check("JS_ELS_PRESENT", js.includes('referencesCard: $("computeStorageThroughputReferencesCard")') && js.includes('actionsCard: $("computeStorageThroughputRecommendedActionsCard")') && js.includes('decisionCard: $("computeStorageThroughputDecisionScheduleCard")'));
check("JS_RENDERERS_PRESENT", js.includes("function renderStorageThroughputReferenceTable") && js.includes("function renderStorageThroughputRecommendedActions") && js.includes("function renderStorageThroughputDecisionSchedule") && js.includes("function renderStorageThroughputShellSections"));
check("JS_CLEAR_PRESENT", js.includes("function clearStorageThroughputShellSections") && js.includes("clearStorageThroughputShellSections();"));
check("JS_PAYLOAD_FIELDS_PRESENT", js.includes("references,") && js.includes("recommendedActions,") && js.includes("decisionSchedule,") && js.includes("guidance,") && js.includes("interpretation,"));
check("JS_RENDER_CALLED", js.includes("renderStorageThroughputShellSections(flowPayload);"));
check("JS_DECISION_ROWS_PRESENT", js.includes("Required Throughput") && js.includes("Available Throughput") && js.includes("Transfer Window") && js.includes("Next Tool"));
check("MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_PROOF_STACK_0705"));

console.log("");
console.log("Storage Throughput proof stack audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
