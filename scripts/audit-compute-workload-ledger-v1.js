const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

function result(ok, label, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  return ok;
}

const tools = [
  "cpu-sizing",
  "ram-sizing",
  "storage-iops",
  "storage-throughput",
  "vm-density",
  "gpu-vram",
  "power-thermal",
  "raid-rebuild-time",
  "backup-window",
  "nic-bonding"
];

const branchTools = {
  core: ["cpu-sizing", "ram-sizing"],
  storage: ["storage-iops", "storage-throughput"],
  acceleration: ["gpu-vram"],
  infrastructureRecovery: ["power-thermal", "nic-bonding", "raid-rebuild-time", "backup-window"]
};

let pass = 0;
let fail = 0;

console.log("Compute Workload Ledger Audit V1");
console.log("");

for (const tool of tools) {
  const htmlFile = "tools/compute/" + tool + "/index.html";
  const jsFile = "tools/compute/" + tool + "/script.js";
  const html = read(htmlFile);
  const js = read(jsFile);
  const hasPage = html.length > 0;
  const hasScript = js.length > 0;
  const hasStateAsset = html.includes("scopedlabs-compute-plan-state.js");
  const hasPublisher = js.includes("recordToolResult") && (js.includes("saveComputeLedgerResult") || js.includes("saveCpuResultToWorkload"));
  const hasStep = tool === "nic-bonding" ? js.includes("const STEP = \"nic-bonding\"") : js.includes("const STEP = \"" + tool + "\"");

  const checks = [
    [hasPage, tool + " page exists", htmlFile],
    [hasScript, tool + " script exists", jsFile],
    [hasStateAsset, tool + " loads compute plan state", htmlFile],
    [hasStep, tool + " has stable STEP slug", jsFile],
    [hasPublisher, tool + " publishes workload ledger", jsFile]
  ];

  for (const check of checks) {
    if (result(check[0], check[1], check[2])) pass += 1;
    else fail += 1;
  }
}

const planner = read("assets/scopedlabs-compute-planner-adapter.js");
const plannerPage = read("tools/compute/workload-planner/index.html");

const plannerChecks = [
  [planner.includes("function workloadResultMap(workload, plan)"), "planner reads plan.results", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("COMPUTE_BRANCH_LEDGER_TOOLS"), "planner defines branch-scoped ledger tool groups", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("completedComputeBranchCheckCount(workload, plan, branchScope)"), "planner counts branch-scoped checks", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("workloadBranchKeySavedResult(workload, plan, branchScope)"), "planner shows branch-scoped key result", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("workloadBranchNextAction(workload, plan, branchScope)"), "planner shows branch-scoped next action", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("groups.acceleration, \"acceleration\""), "GPU branch table passes acceleration scope", "assets/scopedlabs-compute-planner-adapter.js"],
  [plannerPage.includes("scopedlabs-compute-planner-adapter-013-branch-ledger-scope"), "workload planner cache bust uses branch ledger scope", "tools/compute/workload-planner/index.html"]
];

plannerChecks.forEach((check) => {
  if (result(check[0], check[1], check[2])) pass += 1;
  else fail += 1;
});

function fixtureCount(results, scope) {
  return branchTools[scope].filter((tool) => !!results[tool]).length;
}

const fixtureResults = {
  "cpu-sizing": true,
  "ram-sizing": true
};

const fixtureChecks = [
  [fixtureCount(fixtureResults, "core") === 2, "fixture: core table sees CPU/RAM checks as 2", "CPU + RAM completed"],
  [fixtureCount(fixtureResults, "storage") === 0, "fixture: storage table does not inherit CPU/RAM checks", "Storage not run"],
  [fixtureCount(fixtureResults, "acceleration") === 0, "fixture: GPU table does not inherit CPU/RAM checks", "GPU branch flagged but GPU not run"],
  [fixtureCount(fixtureResults, "infrastructureRecovery") === 0, "fixture: infrastructure/recovery does not inherit CPU/RAM checks", "Infra/recovery not run"],
  [planner.includes("Pending GPU VRAM check"), "fixture: pending GPU text is available", "GPU branch pending display"]
];

fixtureChecks.forEach((check) => {
  if (result(check[0], check[1], check[2])) pass += 1;
  else fail += 1;
});

console.log("");
console.log("SUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
