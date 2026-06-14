const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.cwd();

const files = {
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  contract: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  lifecycle: path.join(root, "scripts", "audit-assistant-lifecycle-contract-v1.js"),
  cpuStandard: path.join(root, "scripts", "audit-compute-cpu-result-standard-v1.js")
};

let pass = 0;
let fail = 0;
let watch = 0;

function result(kind, label, detail) {
  kind = String(kind || "WATCH").toUpperCase();
  if (kind === "PASS") pass++;
  if (kind === "FAIL") fail++;
  if (kind === "WATCH") watch++;
  console.log(kind.padEnd(6), label);
  if (detail) console.log("       " + detail);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function order(text, tokens) {
  const indexes = tokens.map((token) => text.indexOf(token));
  return indexes.every((index) => index >= 0) && indexes.every((index, i) => i === 0 || indexes[i - 1] < index);
}

const script = read(files.script);
const contract = read(files.contract);
const html = read(files.html);

console.log("ScopedLabs Compute CPU Assistant Payload Decision Audit V1");
console.log("Repo:", root);

for (const token of [
  "const cpuWorkloadResult = {",
  "const cpuPipelineResult = {",
  "plannerContext:",
  "cores: rec",
  "physicalCores: physicalRec",
  "eff,",
  "status: analyzer.status",
  "planStatus: cpuStatusForPlan(analyzer.status)",
  "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP]",
  "saveCpuResultToWorkload(cpuPipelineResult);",
  "renderComputeAssistant(cpuPipelineResult);",
  "renderComputeCpuVisual(cpuPipelineResult);"
]) {
  result(script.includes(token) ? "PASS" : "FAIL", "CPU script payload token: " + token);
}

result(order(script, [
  "const cpuWorkloadResult = {",
  "const cpuPipelineResult = {",
  "ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP]",
  "saveCpuResultToWorkload(cpuPipelineResult);",
  "renderWorkloadContext();",
  "renderComputeAssistant(cpuPipelineResult);",
  "renderComputeCpuVisual(cpuPipelineResult);",
  "showContinue();"
]) ? "PASS" : "FAIL", "CPU calculation order uses full payload before assistant/visual");

for (const token of [
  "function cpuPayloadOutputs(data)",
  "return data && typeof data === \"object\" ? data : {};",
  "function computeCpuTopCardModel(data)",
  "activeWorkloadContext(\"CPU Sizing\")",
  "activeWorkloadRecord()",
  "Planner context active",
  "Planner context missing",
  "Current CPU inputs applied",
  "RAM sizing next",
  "Downstream validation pending",
  "recommended for the active",
  "current CPU inputs",
  "Do not treat the Compute plan as complete"
]) {
  result(contract.includes(token) ? "PASS" : "FAIL", "assistant decision token: " + token);
}

for (const token of [
  "/assets/scopedlabs-compute-assistant-contract.js?v=scopedlabs-compute-assistant-contract-0614-payload-decision",
  "./script.js?v=compute-cpu-context-009-payload-decision"
]) {
  result(html.includes(token) ? "PASS" : "FAIL", "CPU cache-bust token: " + token);
}

for (const [label, file] of [["lifecycle", files.lifecycle], ["cpu standard", files.cpuStandard]]) {
  if (!fs.existsSync(file)) {
    result("WATCH", label + " audit missing");
    continue;
  }

  try {
    const output = childProcess.execFileSync(process.execPath, [file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    result(output.includes("FAIL : 0") || output.includes("OVERALL: PASS") ? "PASS" : "FAIL", label + " audit passes");
  } catch (error) {
    result("FAIL", label + " audit failed", error.message);
  }
}

console.log("");
console.log("========================================================================");
console.log("SUMMARY");
console.log("========================================================================");
console.log("PASS :", pass);
console.log("WATCH:", watch);
console.log("FAIL :", fail);

if (fail) {
  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("");
console.log(watch ? "OVERALL: PASS WITH WATCH" : "OVERALL: PASS");
