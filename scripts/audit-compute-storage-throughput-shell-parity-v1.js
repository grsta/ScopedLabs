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

check("HTML_SHELL_ATTRIBUTES", html.includes('data-compute-tool-shell="storage-throughput-0705"') && html.includes('data-sl-square-ctas="true"'));
check("HTML_INTERNAL_LEDGER", html.includes("computeInternalResultsLedger") && html.includes("compute-internal-results-ledger") && html.includes("data-internal-results-ledger"));
check("HTML_RESULT_SUMMARY_CARD", html.includes("computeStorageThroughputResultCard") && html.includes("compute-static-summary-card-shell") && html.includes("Storage Throughput Result Summary"));
check("HTML_ASSISTANT_CARD", html.includes("computeAssistantCard") && html.includes("computeAssistantMount"));
check("HTML_EXPORT_CARD_SHELL", html.includes("compute-export-card") && html.includes("reportMetadataMount") && !html.includes("Documentation & Export"));
check("HTML_FLOW_ACTIONS", html.includes("compute-flow-actions") && html.includes('data-compute-flow-tool="storage-throughput"') && html.includes("Back to Storage IOPS") && html.includes("VM Density"));
check("HTML_SHELL_SCRIPTS", ["scopedlabs-report-metadata.js", "scopedlabs-tool-shell.js", "scopedlabs-compute-guided-route-engine.js", "scopedlabs-assistant-export.js", "scopedlabs-compute-shell-contract.js", "scopedlabs-local-assistant.js", "scopedlabs-compute-assistant-contract.js", "scopedlabs-user-tool-notes.js"].every(function(token) { return html.includes(token); }));
check("HTML_SCRIPT_CACHE_BUST", html.includes("compute-storage-throughput-export-payload-0705") || html.includes("compute-storage-throughput-shell-parity-0705") || html.includes("compute-storage-throughput-next-tool-cta-0705"));
check("JS_RESULT_SUMMARY_WIRED", js.includes('resultCard: $("computeStorageThroughputResultCard")') && js.includes("function renderStorageThroughputResultSummary") && js.includes("renderStorageThroughputResultSummary(flowPayload);"));
check("JS_RESULT_SUMMARY_CLEARS", js.includes("function clearStorageThroughputResultSummary") && js.includes("clearStorageThroughputResultSummary();"));
check("MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_SHELL_PARITY_0705"));

console.log("");
console.log("Storage Throughput shell parity audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
