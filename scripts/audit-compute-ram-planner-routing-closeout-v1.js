const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "ram-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "ram-sizing", "script.js"),
  shell: path.join(root, "assets", "scopedlabs-compute-shell-contract.js"),
  visuals: path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"),
  assistant: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md"),
  ledger: path.join(root, "docs", "scopedlabs-pattern-promotion-ledger.md")
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const src = Object.fromEntries(Object.entries(files).map(([key, value]) => [key, read(value)]));
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail);
}

check("RAM_SCRIPT_CACHE_BUSTED", src.html.includes("compute-ram-footer-cleanup-0621-planner-routing-0706"), "RAM local script should use the planner-routing cache bust.");
check("RAM_PLANNER_ROUTING_MARKER", src.script.includes("ram-sizing-planner-routing-0706"), "RAM script should contain the planner routing promotion marker.");
check("RAM_PLANNER_ROUTING_PAYLOAD_FIELDS", src.script.includes("plannerRouting") && src.script.includes("plannerAssistantDecisionNeeded") && src.script.includes("plannerRouteHint") && src.script.includes("specialtyBranchCandidates"), "RAM payload should expose planner routing fields.");
check("RAM_ROUTING_IN_CAPACITY_ENVELOPE", /const ramCapacityEnvelope = \{[\s\S]*plannerRouting[\s\S]*specialtyBranchCandidates[\s\S]*renderRamCapacityVisual\(ramCapacityEnvelope\)/.test(src.script), "RAM capacity envelope should carry planner-routing context for assistant/export consumers.");
check("RAM_ROUTING_IN_WRITE_FLOW", /ScopedLabsAnalyzer\.writeFlow\([\s\S]*plannerRouting[\s\S]*plannerRouteHint[\s\S]*specialtyBranchCandidates/.test(src.script), "RAM writeFlow data should carry planner-routing context.");
check("RAM_CORE_AND_SPECIALTY_BRANCHES", src.script.includes('tool: "storage-iops"') && src.script.includes('tool: "gpu-vram"') && src.script.includes('tool: "summary"'), "Planner branch hints should include Storage IOPS, GPU VRAM, and Summary.");
check("RAM_SHARED_SHELL_ROUTE_PRESERVED", src.shell.includes('tool: "ram-sizing"') && (src.shell.includes("/tools/compute/storage-iops/") || src.shell.includes("/tools/compute/gpu-vram/")), "Shared Compute shell should still own RAM downstream/guided routing.");
check("RAM_SHARED_VISUAL_OWNER_PRESERVED", /ram[-\s]?sizing|RamSizing|RAM/i.test(src.visuals), "Shared Compute capacity visual ownership should still reference RAM.");
check("RAM_SHARED_ASSISTANT_OWNER_PRESERVED", /ram[-\s]?sizing|RamSizing|RAM/i.test(src.assistant), "Shared Compute assistant ownership should still reference RAM.");
check("RAM_DOCS_UPDATED", src.moduleMap.includes("COMPUTE_RAM_PLANNER_ROUTING_0706") && src.ledger.includes("COMPUTE-RAM-PLANNER-ROUTING-0706"), "Module map and pattern promotion ledger should document RAM planner-routing ownership.");

const failed = results.filter((item) => !item.pass);
console.log("\nRAM planner-routing closeout audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);

