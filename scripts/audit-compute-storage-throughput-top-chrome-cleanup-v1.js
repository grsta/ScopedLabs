const fs = require("fs");
const path = require("path");

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "index.html"), "utf8");
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

check("TOP_CHROME_MARKER_PRESENT", html.includes('data-storage-throughput-top-chrome-cleanup="0705"'));
check("BREADCRUMBS_REMOVED", !html.includes('<div class="crumbs">') && !html.includes('<span class="sep">/</span>'));
check("PRO_TIER_PILLS_REMOVED", !html.includes("Pro Tier") && !html.includes("pill--pro"));
check("PIPELINE_RESTORED", html.includes('id="pipeline"') && html.includes('data-storage-throughput-pipeline-restored="0705"') && !html.includes('data-storage-throughput-pipeline-suppressed="0705"'));
check("DESIGN_FLOW_CARD_REMOVED", !html.includes("Part of a Design Flow") && !html.includes("This tool continues the Compute design flow"));
check("BEST_FOR_REMOVED", !html.includes('class="tool-best-for"'));
check("KB_CARD_SUPPRESSOR_PRESENT", html.includes("data-storage-throughput-kb-card-suppressor-0705") && html.includes("Storage Throughput Guide") && html.includes("Open KB Guide"));
check("SQUARE_CTA_STYLE_PRESENT", html.includes("data-storage-throughput-pill-cleanup-0705") && html.includes("border-radius: 8px !important"));
check("SHELL_PARITY_STILL_PRESENT", html.includes("computeInternalResultsLedger") && html.includes("compute-export-card") && html.includes("reportMetadataMount") && html.includes("data-compute-flow-actions"));
check("PROOF_STACK_STILL_PRESENT", html.includes("computeStorageThroughputReferencesCard") && html.includes("computeStorageThroughputRecommendedActionsCard") && html.includes("computeStorageThroughputDecisionScheduleCard"));
check("CUSTOM_EXPORT_STILL_PRESENT", html.includes('"customPayloadBuilder": "ScopedLabsComputeStorageThroughputExport.buildPayload"'));
check("MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_TOP_CHROME_CLEANUP_0705"));

console.log("");
console.log("Storage Throughput top chrome cleanup audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
