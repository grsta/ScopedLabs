const fs = require("fs");
const path = require("path");

const root = process.cwd();
const files = {
  html: path.join(root, "tools", "compute", "storage-iops", "index.html"),
  script: path.join(root, "tools", "compute", "storage-iops", "script.js"),
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

check("STORAGE_IOPS_SCRIPT_CACHE_BUSTED", src.html.includes("compute-storage-iops-planner-routing-0706"), "Storage IOPS local script should use the planner-routing cache bust.");
check("STORAGE_IOPS_SHELL_ROUTE_OWNED", src.shell.includes('tool: "storage-iops"') && src.shell.includes("/tools/compute/storage-throughput/"), "Shared Compute shell should own Storage IOPS -> Storage Throughput route.");
check("STORAGE_IOPS_PLANNER_ROUTING_MARKER", src.script.includes("storage-iops-planner-routing-0706"), "Storage IOPS script should contain the planner routing promotion marker.");
check("STORAGE_IOPS_PLANNER_ROUTING_PAYLOAD_FIELDS", src.script.includes("plannerRouting") && src.script.includes("plannerAssistantDecisionNeeded") && src.script.includes("plannerRouteHint") && src.script.includes("specialtyBranchCandidates"), "Storage IOPS payload should expose planner routing fields.");
check("STORAGE_IOPS_ROUTING_IN_SHELL_SECTIONS", /renderStorageIopsShellSections\(\{[\s\S]*plannerRouting[\s\S]*specialtyBranchCandidates/.test(src.script), "Shell sections payload should carry planner-routing context.");
check("STORAGE_IOPS_ROUTING_IN_LEDGER", /assistantRecommendation:\s*\{[\s\S]*plannerRouting[\s\S]*specialtyBranchCandidates/.test(src.script), "Saved ledger assistant recommendation should carry planner-routing context.");
check("STORAGE_IOPS_BRANCH_CANDIDATES", src.script.includes('tool: "storage-throughput"') && src.script.includes('tool: "raid-rebuild-time"') && src.script.includes('tool: "backup-window"') && src.script.includes('tool: "summary"'), "Planner branch hints should include Storage Throughput, RAID Rebuild Time, Backup Window, and Summary.");
check("STORAGE_IOPS_SHARED_VISUAL_OWNER_PRESERVED", /storage[-\s]?iops|StorageIops|Storage IOPS/i.test(src.visuals), "Shared Compute capacity visual ownership should still reference Storage IOPS.");
check("STORAGE_IOPS_SHARED_ASSISTANT_OWNER_PRESERVED", /storage[-\s]?iops|StorageIops|Storage IOPS/i.test(src.assistant), "Shared Compute assistant ownership should still reference Storage IOPS.");
check("STORAGE_IOPS_DOCS_UPDATED", src.moduleMap.includes("COMPUTE_STORAGE_IOPS_PLANNER_ROUTING_0706") && src.ledger.includes("COMPUTE-STORAGE-IOPS-PLANNER-ROUTING-0706"), "Module map and pattern promotion ledger should document Storage IOPS planner-routing ownership.");

const failed = results.filter((item) => !item.pass);
console.log("\nStorage IOPS planner-routing closeout audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);

