const fs = require("fs");
const path = require("path");

const root = process.cwd();
const files = {
  html: path.join(root, "tools", "compute", "storage-throughput", "index.html"),
  script: path.join(root, "tools", "compute", "storage-throughput", "script.js"),
  shell: path.join(root, "assets", "scopedlabs-compute-shell-contract.js"),
  visuals: path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"),
  assistant: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md"),
  ledger: path.join(root, "docs", "scopedlabs-pattern-promotion-ledger.md")
};

function read(file) { return fs.readFileSync(file, "utf8"); }

const src = Object.fromEntries(Object.entries(files).map(([key, value]) => [key, read(value)]));
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail);
}

function count(text, token) {
  return text.split(token).length - 1;
}

check("SHELL_VERSION_PROMOTED", src.shell.includes("scopedlabs-compute-shell-contract-017-storage-throughput-promotion"), "Shared Compute shell contract should carry the Storage Throughput promotion version.");
check("SHELL_FLOW_CONTEXT_RECURSION_REMOVED", !src.shell.includes("watchGeneratedFlowContext();\n\n    var observer") && !src.shell.includes("ensureFlowActionsPlacement();\n      return;"), "Shared shell guards should not recursively call themselves.");
check("SHELL_SINGLE_FLOW_CONTEXT_OWNER", count(src.shell, "function hideGeneratedFlowContext()") === 1, "Shared shell should have one generated flow-context hiding function.");
check("SHELL_STORAGE_THROUGHPUT_FLOW_CONFIG", src.shell.includes('tool: "storage-throughput"') && src.shell.includes('continueHref: "/tools/compute/vm-density/"') && src.shell.includes('continueLabel: "Continue &rarr; VM Density"'), "Storage Throughput next-tool routing should be owned by the Compute shell contract.");
check("SHELL_STORAGE_THROUGHPUT_UI_OVERLAY", src.shell.includes("compute-shell-storage-throughput-planner-ui-overlay-0706") && src.shell.includes("data-compute-planner-routing-context") && src.shell.includes("Storage Throughput uses the active workload context"), "Active Workflow placement and future planner context should be shell-owned.");
check("HTML_CACHE_BUSTS_PROMOTED", src.html.includes("compute-shell-storage-throughput-promotion-0706") && src.html.includes("compute-storage-throughput-planner-routing-0706"), "Storage Throughput page should cache-bust the promoted shell and planner-routing local script.");
check("HTML_VISIBLE_RESULT_SUMMARY_HIDDEN_BY_CONTRACT", src.html.includes("computeStorageThroughputResultCard") && src.shell.includes("#computeStorageThroughputResultCard.storage-throughput-result-summary-card { display: none !important") && src.script.includes("renderStorageThroughputSharedAssistant(flowPayload)"), "Assistant card should be the first visible output after Calculate while the legacy/result-summary shell stays hidden.");
check("PLANNER_ROUTING_PAYLOAD_FIELDS", src.script.includes("storage-throughput-planner-routing-0706") && src.script.includes("plannerRouting") && src.script.includes("plannerAssistantDecisionNeeded") && src.script.includes("specialtyBranchCandidates"), "Storage Throughput payload should expose future planner assistant routing and specialty branch hints.");
check("PLANNER_BRANCH_CANDIDATES_PRESENT", src.script.includes('tool: "nic-bonding"') && src.script.includes('tool: "backup-window"') && src.script.includes('tool: "storage-iops"') && src.script.includes('tool: "summary"'), "Planner assistant branch candidates should include NIC Bonding, Backup Window, Storage IOPS revalidation, and Summary stop logic.");
check("SHARED_VISUAL_AND_ASSISTANT_PRESERVED", src.visuals.includes("renderStorageThroughputCapacityEnvelope") && src.assistant.includes("renderStorageThroughputAssistantStatusCard"), "Storage Throughput should keep shared capacity visual and shared assistant ownership.");
check("DOCS_UPDATED", src.moduleMap.includes("COMPUTE_STORAGE_THROUGHPUT_PLANNER_ROUTING_0706") && src.ledger.includes("COMPUTE-STORAGE-THROUGHPUT-PLANNER-ROUTING-0706"), "Module map and pattern promotion ledger should document the planner-routing promotion.");

const failed = results.filter((item) => !item.pass);
console.log("\nStorage Throughput promotion closeout audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);

