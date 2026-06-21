const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

let failures = 0;

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

function hasAll(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

function hasFieldId(text, id) {
  const re = new RegExp("id\\s*:\\s*[\"\']" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\"\']");
  return re.test(text);
}

function hasAnyDetailedFieldId(text, ids) {
  return ids.some((id) => hasFieldId(text, id));
}

const adapter = read("assets/scopedlabs-compute-planner-adapter.js");
const state = read("assets/scopedlabs-compute-plan-state.js");
const route = read("assets/scopedlabs-compute-guided-route-engine.js");
const moduleMap = read("docs/scopedlabs-module-map.md");

console.log("Compute Planner Input Contract Audit V1");
console.log("");

const identityFields = ["workloadName", "environmentType", "planningPath", "workloadType"];
const demandFields = ["demandPattern", "concurrencyBaseline", "operatingWindow", "criticality"];
const constraintFields = ["targetUtilization", "growthMargin", "redundancyGoal", "primaryConstraint", "workloadNotes"];
const branchInputs = ["needsVmDensity", "storageHeavy", "needsGpu", "needsPowerThermal", "needsRaid", "needsBackup", "needsNic"];
const branchKeys = ["vmDensity", "storageHeavy", "gpu", "powerThermal", "raid", "backup", "nicBonding"];

check("PLANNER_HAS_PROJECT_WORKLOAD_IDENTITY_FIELDS", hasAll(adapter, identityFields), identityFields.join(", "));
check("PLANNER_HAS_BROAD_DEMAND_CONTEXT_FIELDS", hasAll(adapter, demandFields), demandFields.join(", "));
check("PLANNER_HAS_PLANNING_CONSTRAINT_FIELDS", hasAll(adapter, constraintFields), constraintFields.join(", "));
check("PLANNER_HAS_ROUTE_BRANCH_INPUTS", hasAll(adapter, branchInputs), branchInputs.join(", "));
check("PLANNER_COLLECTS_BRANCH_KEYS", hasAll(adapter, branchKeys), branchKeys.join(", "));

check(
  "PLANNER_HAS_PLANNING_PATH_DEFAULTS",
  adapter.includes("function branchDefaults") &&
    adapter.includes("planningPath") &&
    branchKeys.filter((key) => adapter.includes("defaults." + key)).length >= 5,
  "planningPath should seed multiple broad branch defaults without requiring exact path-label names"
);

check(
  "PLANNER_SYNC_BRANCHES_FROM_PATH_AND_CHECKBOXES",
  adapter.includes("function syncBranches()") &&
    adapter.includes("function updateBranchCards()") &&
    adapter.includes("els.planningPath") &&
    adapter.includes("els.needsGpu") &&
    adapter.includes("els.storageHeavy"),
  "planner should expose branch intent from broad user input"
);

check(
  "PLAN_STATE_WRITES_BRANCH_SEEDS",
  state.includes("function branchSeeds(workload)") &&
    state.includes("\"gpu-vram\": Boolean(branches.gpu)") &&
    state.includes("\"storage-iops\": Boolean(branches.storageHeavy)") &&
    state.includes("\"storage-throughput\": Boolean(branches.storageHeavy)") &&
    state.includes("\"power-thermal\": Boolean(branches.powerThermal)") &&
    state.includes("\"backup-window\": Boolean(branches.backup)") &&
    state.includes("\"nic-bonding\": Boolean(branches.nicBonding)") &&
    state.includes("\"raid-rebuild-time\": Boolean(branches.raid)"),
  "branch seeds must connect planner intent to downstream tools"
);

check(
  "ROUTE_ENGINE_CONSUMES_MATCHING_BRANCH_KEYS",
  route.includes("key: \"storageHeavy\"") &&
    route.includes("key: \"vmDensity\"") &&
    route.includes("key: \"gpu\"") &&
    route.includes("key: \"powerThermal\"") &&
    route.includes("key: \"nicBonding\"") &&
    route.includes("key: \"raid\"") &&
    route.includes("key: \"backup\""),
  "route engine branch keys must match planner-collected branches"
);

const detailedToolFieldIds = [
  "perProc", "osGb", "reads", "writes", "penalty", "driveTb", "changePct",
  "vramGb", "modelGb", "watts", "amps120", "amps208", "mbps", "dataTb"
];

check(
  "PLANNER_DOES_NOT_DUPLICATE_DETAILED_TOOL_INPUTS",
  !hasAnyDetailedFieldId(adapter, detailedToolFieldIds),
  "planner should collect route intent, not exact calculator field IDs"
);

check("MODULE_MAP_DOCUMENTS_PLANNER_INPUT_CONTRACT", moduleMap.includes("Compute planner input contract"), "docs/scopedlabs-module-map.md");

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (11 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
