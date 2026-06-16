const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  contract: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  css: path.join(root, "assets", "scopedlabs-compute-result-visuals.css"),
  summaryCss: path.join(root, "assets", "scopedlabs-result-summary-card.css"),
  lifecycle: path.join(root, "scripts", "audit-assistant-lifecycle-contract-v1.js"),
  legend: path.join(root, "scripts", "audit-status-legend-standard-v1.js")
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
  return indexes.every((value) => value >= 0) && indexes.every((value, index) => index === 0 || indexes[index - 1] < value);
}

function runAudit(label, file) {
  if (!fs.existsSync(file)) {
    result("WATCH", label + " audit missing");
    return;
  }

  try {
    const output = childProcess.execFileSync(process.execPath, [file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    result(output.includes("FAIL : 0") && (output.includes("OVERALL: PASS") || output.includes("OVERALL: PASS WITH WATCH")) ? "PASS" : "FAIL", label + " audit passes");
  } catch (error) {
    result("FAIL", label + " audit failed", error.message);
  }
}

const html = read(files.html);
const script = read(files.script);
const contract = read(files.contract);
const css = read(files.css);
const summaryCss = read(files.summaryCss);

console.log("ScopedLabs Compute CPU Result Standard Audit V1");
console.log("Repo:", root);

for (const [label, file] of Object.entries(files)) {
  if (label === "lifecycle" || label === "legend") continue;
  result(read(file) ? "PASS" : "FAIL", label + " readable", path.relative(root, file));
}

result(/\/assets\/scopedlabs-compute-result-visuals\.css\?v=scopedlabs-compute-result-visuals-[^"']+/.test(html) ? "PASS" : "FAIL", "CPU loads cache-busted Compute result visuals CSS");
result(/\/assets\/scopedlabs-result-summary-card\.css\?v=scopedlabs-result-summary-card-[^"']+/.test(html) ? "PASS" : "FAIL", "CPU loads cache-busted shared result summary CSS");

for (const token of [
  'id="computeInternalResultsLedger"',
  'id="computeAssistantCard"',
  'id="computeAssistantMount"',
  'id="computeFirstToolLegend"',
  'id="computeCpuVisualCard"',
  'id="computeCpuVisual"',
  'id="exportReport"',
  'id="saveSnapshot"'
]) {
  result(html.includes(token) ? "PASS" : "FAIL", "CPU HTML token: " + token);
}

result(order(html, [
  'id="computeInternalResultsLedger"',
  'id="computeAssistantCard"',
  'id="computeFirstToolLegend"',
  'id="computeCpuVisualCard"',
  'id="exportReport"'
]) ? "PASS" : "FAIL", "CPU result DOM order is ledger -> assistant -> legend -> visual -> export");

for (const token of [
  "function buildComputeCpuVisualSvg(result)",
  "function renderComputeCpuVisual(result)",
  "function clearComputeCpuVisual()",
  "const cpuPipelineResult = {",
  "renderComputeCpuVisual(cpuPipelineResult);",
  "clearComputeCpuVisual();",
  "renderComputeAssistant(cpuPipelineResult);",
  "saveCpuResultToWorkload(cpuPipelineResult);"
]) {
  result(script.includes(token) ? "PASS" : "FAIL", "CPU script token: " + token);
}

result(order(script, [
  "saveCpuResultToWorkload(cpuPipelineResult);",
  "renderWorkloadContext();",
  "renderComputeAssistant(cpuPipelineResult);",
  "renderComputeCpuVisual(cpuPipelineResult);",
  "showContinue();"
]) ? "PASS" : "FAIL", "CPU calculate order is save -> context -> assistant -> visual -> continue");

for (const token of [
  "function cpuPayloadInputs(data)",
  "function cpuPayloadOutputs(data)",
  "function cpuResultSection(data)",
  "function cpuVisualSection(data)",
  "function renderComputeCpuTopSummaryCard(data)",
  "CPU Sizing Summary",
  "CPU Capacity Envelope",
  "recommendedLogicalCores",
  "effectiveDemandCores",
  "utilizationTarget",
  "Planner context active",
  "Downstream validation pending"
]) {
  result(contract.includes(token) ? "PASS" : "FAIL", "assistant contract token: " + token);
}

for (const token of [
  ".compute-result-visual-card",
  ".compute-result-visual-shell",
  "CPU Sizing is the first consumer"
]) {
  result(css.includes(token) ? "PASS" : "FAIL", "Compute visual CSS token: " + token);
}

for (const token of [
  ".scopedlabs-result-summary-card",
  ".scopedlabs-result-summary-top",
  ".scopedlabs-result-summary-grid",
  ".scopedlabs-result-summary-item"
]) {
  result(summaryCss.includes(token) ? "PASS" : "FAIL", "Summary card CSS token: " + token);
}

for (const token of [
  'id="computeCpuStatusCard"',
  "scopedlabs-result-summary-card",
  "scopedlabs-result-summary-top",
  "scopedlabs-result-summary-grid",
  "scopedlabs-result-summary-item",
  "computeCpuStatusRecommendation",
  "computeCpuStatusConfidence",
  "computeCpuStatusFlags",
  "computeCpuStatusRisk",
  "computeCpuStatusAction",
  'if (toolSlug === "cpu-sizing" && data)'
]) {
  const source = html + "\n" + contract + "\n" + css + "\n" + summaryCss;
  result(source.includes(token) ? "PASS" : "FAIL", "CPU Fail-Safe-style top summary token: " + token);
}

runAudit("lifecycle", files.lifecycle);
runAudit("legend", files.legend);

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
