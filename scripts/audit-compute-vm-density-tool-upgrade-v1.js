const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "vm-density", "index.html"),
  script: path.join(root, "tools", "compute", "vm-density", "script.js"),
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

check("VM_DENSITY_SHARED_ASSETS_INCLUDED", src.html.includes("scopedlabs-compute-capacity-visuals.js") && src.html.includes("scopedlabs-compute-assistant-contract.js") && src.html.includes("scopedlabs-compute-shell-contract.js"), "VM Density should load shared Compute visual, assistant, and shell contracts.");
check("VM_DENSITY_SCRIPT_CACHE_BUSTED", (src.html.includes("compute-vm-density-tool-upgrade-0706") || src.html.includes("compute-vm-density-planning-inputs-0706") || src.html.includes("compute-vm-density-full-shell-result-0706")), "VM Density local script should be cache-busted for this upgrade.");
check("VM_DENSITY_KB_SYSTEM_PRESERVED", src.html.includes("/assets/help.js?v=help-026") || src.html.includes("data-kb-guide") || src.html.includes("Open KB Guide"), "VM Density should preserve the existing KB/help system instead of adding a duplicate static KB card.");
check("VM_DENSITY_SHARED_VISUAL_OWNER", src.visuals.includes("compute-vm-density-capacity-envelope-0706") && src.visuals.includes("renderVmDensityCapacityEnvelope"), "Shared Compute capacity visuals should own VM Density envelope rendering.");
check("VM_DENSITY_SHARED_ASSISTANT_OWNER", src.assistant.includes("compute-assistant-vm-density-status-card-0706") && src.assistant.includes("renderVmDensityAssistantStatusCard"), "Shared Compute assistant contract should own VM Density assistant status rendering.");
check("VM_DENSITY_LOCAL_RENDER_HOOKS", src.script.includes("renderVmDensityCapacityVisual(vmDensityResult)") && src.script.includes("renderVmDensityAssistant(vmDensityResult)"), "VM Density script should render shared visual and assistant output.");
check("VM_DENSITY_PLANNER_ROUTING_PAYLOAD", src.script.includes("plannerRouting") && src.script.includes("plannerAssistantDecisionNeeded") && src.script.includes("plannerRouteHint") && src.script.includes("specialtyBranchCandidates"), "VM Density result should expose planner routing fields.");
check("VM_DENSITY_COMPUTE_BRANCHES_ONLY_ACTIVE", src.script.includes('tool: "power-thermal"') && src.script.includes('tool: "gpu-vram"') && src.script.includes('tool: "nic-bonding"') && src.script.includes('tool: "backup-window"') && src.script.includes('tool: "summary"'), "Active planner branches should stay inside Compute.");
check("VM_DENSITY_GOLD_HANDOFF_NOT_ACTIVE_BRANCH", src.script.includes("futureGoldTierDependencies") && src.script.includes("Gold-tier site coordination"), "Cross-category dependencies should be future Gold-tier handoff notes only.");
check("VM_DENSITY_WRITEFLOW_FULL_RESULT", src.script.includes("data: vmDensityResult") && src.script.includes("saveComputeLedgerResult(vmDensityResult)"), "VM Density writeFlow and ledger should publish enriched result payload.");
check("VM_DENSITY_EXPORT_REFRESH", src.script.includes("ScopedLabsExport.refresh"), "VM Density should refresh export readiness after calculation.");
check("VM_DENSITY_PLANNING_INPUTS_NORMALIZER", src.script.includes("normalizeVmDensityPlanningInputsHeading"), "VM Density should normalize its input heading to Planning Inputs.");
check("VM_DENSITY_NO_STATIC_DUPLICATE_KB_CARD", !src.html.includes("vm-density-kb-card-0706"), "VM Density should not add a duplicate static KB card because the existing KB/help system already owns the guide card.");
check("VM_DENSITY_DOCS_UPDATED", src.moduleMap.includes("COMPUTE_VM_DENSITY_TOOL_UPGRADE_0706") && src.ledger.includes("COMPUTE-VM-DENSITY-TOOL-UPGRADE-0706"), "Docs should map VM Density upgrade ownership.");

const failed = results.filter((item) => !item.pass);
console.log("\nVM Density tool upgrade audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);

