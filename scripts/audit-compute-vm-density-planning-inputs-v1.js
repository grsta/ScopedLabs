const fs = require("fs");
const path = require("path");
const root = process.cwd();
const files = {
  html: path.join(root, "tools", "compute", "vm-density", "index.html"),
  script: path.join(root, "tools", "compute", "vm-density", "script.js"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md"),
  ledger: path.join(root, "docs", "scopedlabs-pattern-promotion-ledger.md")
};
const src = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]));
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? "[PASS] " : "[FAIL] ") + name + " - " + detail);
}
const ids = ["hostCount","haPolicy","maintenanceReservePct","targetVmCount","growthPct","workloadMix","burstRisk","storagePressure","gpuWorkload","backupPressure"];
check("VM_DENSITY_VISIBLE_PLANNING_INPUTS", src.html.includes("Planning Inputs") && ids.every((id) => src.html.includes('id="' + id + '"')), "VM Density should expose the new planning-grade controls.");
check("VM_DENSITY_CLUSTER_AWARE_CAPACITY", ["getHaReservedHosts","usableHostCount","baseCpuPoolPerHost","baseRamPoolPerHost","maintenanceFactor"].every((t) => src.script.includes(t)), "VM Density should scale capacity by host count, HA reserve, and maintenance reserve.");
check("VM_DENSITY_TARGET_AND_GROWTH_DEMAND", ["plannedVmDemand","growthAdjustedVmDemand","capacityGapVms"].every((t) => src.script.includes(t)), "VM Density should model target and growth-adjusted demand.");
check("VM_DENSITY_PLANNING_RISK_STATUS", ["planningPressureFlags","target-demand-exceeds-modeled-density","high-burst-or-noisy-neighbor-risk","storage-pressure-risk-from-prior-compute-tools",'analyzer.status = "RISK"','analyzer.status = "WATCH"'].every((t) => src.script.includes(t)), "Planning risks should influence status.");
check("VM_DENSITY_UPSTREAM_STORAGE_PREFILL", ["prefillStoragePressureFromUpstream",'els.storagePressure.value = "risk"','els.storagePressure.value = "watch"',"storagePressurePrefilled"].every((t) => src.script.includes(t)), "Storage pressure should prefill from upstream Storage Throughput once.");
check("VM_DENSITY_RESULT_ROWS_EXPANDED", ["Target Demand","Growth Demand","Usable Hosts","HA Policy","Capacity Gap","Workload Mix","Risk Factors"].every((t) => src.script.includes(t)), "Rows should expose planning inputs and gap.");
check("VM_DENSITY_ROUTING_BASIS_EXPANDED", ["Planned hosts: ","Usable hosts after HA: ","Maintenance reserve: ","Growth-adjusted demand: ","Capacity gap: ","Burst risk: ","Storage pressure: "].every((t) => src.script.includes(t)), "Planner decision basis should carry new evidence.");
check("VM_DENSITY_PAYLOAD_CARRIES_PLANNING_INPUTS", ["hostCount","haPolicy","haReservedHosts","maintenanceReservePct","targetVmCount","growthPct","workloadMix","burstRisk","storagePressure","gpuWorkload","backupPressure","planningPressureFlags"].every((t) => src.script.includes(t)), "Payload should carry planning inputs and flags.");
check("VM_DENSITY_COMPUTE_ONLY_BRANCH_BOUNDARY", src.script.includes('tool: "power-thermal"') && src.script.includes('tool: "gpu-vram"') && src.script.includes('tool: "nic-bonding"') && src.script.includes('tool: "backup-window"') && src.script.includes("futureGoldTierDependencies"), "Branches stay Compute-only.");
check("VM_DENSITY_KB_OWNERSHIP_PRESERVED", src.html.includes("/assets/help.js?v=help-026") && !src.html.includes("vm-density-kb-card-0706"), "help.js KB ownership should remain intact.");
check("VM_DENSITY_DOCS_UPDATED", src.moduleMap.includes("COMPUTE_VM_DENSITY_PLANNING_INPUTS_0706") && src.ledger.includes("COMPUTE-VM-DENSITY-PLANNING-INPUTS-0706"), "Docs should document this lane.");
const failed = results.filter((item) => !item.pass);
console.log("\nVM Density planning inputs audit: " + (results.length - failed.length) + " passed / " + failed.length + " failed");
if (failed.length) process.exit(1);
