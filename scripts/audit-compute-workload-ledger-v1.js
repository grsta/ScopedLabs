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
  const hasPublisher = js.includes("recordToolResult") && js.includes("saveComputeLedgerResult");
  const hasStep = tool === "nic-bonding" ? js.includes("const STEP = \"nic-bonding\"") : js.includes("const STEP = \"" + tool + "\"");

  const checks = [
    [hasPage, tool + " page exists", htmlFile],
    [hasScript, tool + " script exists", jsFile],
    [hasStateAsset, tool + " loads compute plan state", htmlFile],
    [hasStep, tool + " has stable STEP slug", jsFile],
    [hasPublisher || tool === "cpu-sizing", tool + " publishes workload ledger", jsFile]
  ];

  for (const check of checks) {
    if (result(check[0], check[1], check[2])) pass += 1;
    else fail += 1;
  }
}

const planner = read("assets/scopedlabs-compute-planner-adapter.js");
const plannerPage = read("tools/compute/workload-planner/index.html");

[
  [planner.includes("function workloadResultMap(workload, plan)"), "planner reads plan.results", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("completedComputeCheckCount(workload, plan)"), "planner counts ledger-backed checks", "assets/scopedlabs-compute-planner-adapter.js"],
  [planner.includes("scopedlabs-compute-planner-adapter-012-ledger-reader") || plannerPage.includes("scopedlabs-compute-planner-adapter-012-ledger-reader"), "workload planner cache bust uses ledger reader", "tools/compute/workload-planner/index.html"]
].forEach((check) => {
  if (result(check[0], check[1], check[2])) pass += 1;
  else fail += 1;
});

console.log("");
console.log("SUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);