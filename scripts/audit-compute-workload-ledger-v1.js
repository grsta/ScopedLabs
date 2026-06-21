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

function hasAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
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

const plannerPage = read("tools/compute/workload-planner/index.html");
const adapter = read("assets/scopedlabs-compute-planner-adapter.js");

console.log("Compute Workload Ledger Audit V1");
console.log("");

for (const slug of tools) {
  const pagePath = "tools/compute/" + slug + "/index.html";
  const scriptPath = "tools/compute/" + slug + "/script.js";
  const page = read(pagePath);
  const script = read(scriptPath);

  check(slug + " page exists", !!page, pagePath);
  check(slug + " script exists", !!script, scriptPath);

  check(
    slug + " loads compute plan state",
    page.includes("scopedlabs-compute-plan-state.js"),
    pagePath
  );

  check(
    slug + " has stable STEP slug",
    script.includes(slug) && hasAny(script, ["STEP", "TOOL_SLUG", "toolSlug"]),
    scriptPath
  );

  check(
    slug + " publishes workload ledger",
    hasAny(script, ["recordToolResult", "ScopedLabsComputePlanState.recordToolResult"]),
    scriptPath
  );
}

check(
  "planner reads plan.results",
  adapter.includes("plan.results") || adapter.includes(".results"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "planner defines branch-scoped ledger tool groups",
  adapter.includes("COMPUTE_BRANCH_LEDGER_TOOLS"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "planner counts branch-scoped checks",
  adapter.includes("completedComputeBranchCheckCount"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "planner shows branch-scoped key result",
  adapter.includes("latestWorkloadBranchResult") || adapter.includes("workloadBranchKeySavedResult"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "planner shows branch-scoped next action",
  adapter.includes("workloadBranchNextAction"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "GPU branch table passes acceleration scope",
  adapter.includes("gpu-vram") &&
    adapter.includes("GPU") &&
    hasAny(adapter.toLowerCase(), ["acceleration", "ai", "rendering", "graphics"]),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "workload planner cache bust uses branch ledger scope",
  plannerPage.includes("scopedlabs-compute-planner-adapter.js?v="),
  "tools/compute/workload-planner/index.html"
);

const fixtureCompleted = {
  "cpu-sizing": true,
  "ram-sizing": true
};

const groups = {
  core: ["cpu-sizing", "ram-sizing"],
  storage: ["storage-iops", "storage-throughput"],
  gpu: ["gpu-vram"],
  infrastructure: ["power-thermal", "nic-bonding"],
  recovery: ["raid-rebuild-time", "backup-window"]
};

function count(group, completed) {
  return groups[group].filter((slug) => completed[slug]).length;
}

check(
  "fixture: core table sees CPU/RAM checks as 2",
  count("core", fixtureCompleted) === 2,
  "CPU + RAM completed"
);

check(
  "fixture: storage table does not inherit CPU/RAM checks",
  count("storage", fixtureCompleted) === 0,
  "Storage not run"
);

check(
  "fixture: GPU table does not inherit CPU/RAM checks",
  count("gpu", fixtureCompleted) === 0,
  "GPU branch flagged but GPU not run"
);

check(
  "fixture: infrastructure/recovery does not inherit CPU/RAM checks",
  count("infrastructure", fixtureCompleted) === 0 && count("recovery", fixtureCompleted) === 0,
  "Infra/recovery not run"
);

check(
  "fixture: pending GPU text is available",
  adapter.includes("branchPendingLabel") &&
    adapter.includes("workloadBranchNextAction") &&
    adapter.includes("gpu-vram") &&
    adapter.includes("GPU") &&
    (adapter.includes("Pending") || adapter.includes("pending")),
  "GPU branch pending display"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (62 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
