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

check("HTML_CUSTOM_PAYLOAD_BUILDER", html.includes('"customPayloadBuilder": "ScopedLabsComputeStorageThroughputExport.buildPayload"'));
check("HTML_SCRIPT_CACHE_BUSTED", (html.includes("compute-storage-throughput-export-payload-0705") || html.includes("compute-shell-contract-storage-throughput-next-0705")) || (html.includes("compute-storage-throughput-shell-parity-0705") || html.includes("compute-shell-contract-storage-throughput-next-0705")));
check("JS_EXPORT_NAMESPACE_PRESENT", js.includes("window.ScopedLabsComputeStorageThroughputExport") && js.includes("buildPayload: buildStorageThroughputExportPayload"));
check("JS_EXPORT_RESULT_STATE_PRESENT", js.includes("let currentStorageThroughputExportResult = null;") && js.includes("currentStorageThroughputExportResult = flowPayload;"));
check("JS_EXPORT_RESULT_CLEARS", js.includes("function clearStorageThroughputShellSections()") && js.includes("currentStorageThroughputExportResult = null;"));
check("JS_EXPORT_HELPERS_PRESENT", js.includes("function buildStorageThroughputVisualExportSection") && js.includes("function buildStorageThroughputReferenceExportSection") && js.includes("function buildStorageThroughputRecommendedActionsExportSection") && js.includes("function buildStorageThroughputDecisionScheduleExportSection") && js.includes("function buildStorageThroughputInterpretationExportSection"));
check("JS_EXTRA_SECTIONS_PRESENT", js.includes("const extraSections = [") && js.includes("buildStorageThroughputVisualExportSection()") && js.includes("buildStorageThroughputReferenceExportSection()") && js.includes("buildStorageThroughputRecommendedActionsExportSection(result)") && js.includes("buildStorageThroughputDecisionScheduleExportSection()") && js.includes("buildStorageThroughputInterpretationExportSection(result)"));
check("JS_EXPORT_CONTRACT_PRESENT", js.includes('exportSectionsContract: "storage-throughput-visual-references-actions-schedule"'));
check("MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_EXPORT_PAYLOAD_0705"));

console.log("");
console.log("Storage Throughput export payload audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
