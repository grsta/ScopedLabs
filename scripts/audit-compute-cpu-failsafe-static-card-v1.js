const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  contract: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  payloadAudit: path.join(root, "scripts", "audit-compute-cpu-assistant-payload-decision-v1.js"),
  standardAudit: path.join(root, "scripts", "audit-compute-cpu-result-standard-v1.js"),
  legendAudit: path.join(root, "scripts", "audit-status-legend-standard-v1.js"),
  lifecycleAudit: path.join(root, "scripts", "audit-assistant-lifecycle-contract-v1.js")
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

console.log("ScopedLabs Compute CPU Fail-Safe Static Card Audit V1");
console.log("Repo:", root);

for (const token of [
  'id="computeAssistantCard"',
  'id="computeAssistantMount"',
  'id="computeCpuStatusCard"',
  'id="computeCpuStatusTitle"',
  'id="computeCpuStatusSubtitle"',
  'id="computeCpuStatusText"',
  'id="computeCpuStatusRecommendation"',
  'id="computeCpuStatusConfidence"',
  'id="computeCpuStatusFlags"',
  'id="computeCpuStatusRisk"',
  'id="computeCpuStatusAction"',
  "scopedlabs-result-summary-card",
  "scopedlabs-result-summary-grid",
  "scopedlabs-result-summary-action"
]) {
  result(html.includes(token) ? "PASS" : "FAIL", "CPU static Fail-Safe card HTML token: " + token);
}

result(order(html, [
  'id="computeInternalResultsLedger"',
  'id="computeAssistantCard"',
  'id="computeFirstToolLegend"',
  'id="computeCpuVisualCard"',
  'id="exportReport"'
]) ? "PASS" : "FAIL", "CPU DOM order remains ledger -> fixed decision card -> legend -> visual -> export");

for (const token of [
  "function buildCpuDecisionCore(result)",
  "function renderVisibleCpuDecisionStatus(core)",
  "function renderComputeAssistant(result)",
  "return renderVisibleCpuDecisionStatus(core);",
  "function clearComputeAssistant()",
  "computeCpuStatusCard",
  "computeCpuStatusRecommendation",
  "computeCpuStatusConfidence",
  "computeCpuStatusFlags",
  "computeCpuStatusRisk",
  "computeCpuStatusAction",
  "Planner context active",
  "Current CPU inputs applied",
  "RAM sizing next",
  "Downstream validation pending"
]) {
  result(script.includes(token) ? "PASS" : "FAIL", "CPU page-local decision renderer token: " + token);
}

result(!script.includes("window.ScopedLabsComputeAssistant.renderToolAssistant") ? "PASS" : "FAIL", "CPU renderComputeAssistant no longer delegates to shared assistant renderer");

for (const token of [
  "function wire()",
  "if (getStep() === \"cpu-sizing\") return;",
  "page-local Fail-Safe-style decision card"
]) {
  result(contract.includes(token) ? "PASS" : "FAIL", "shared contract CPU skip token: " + token);
}

result(/\/assets\/scopedlabs-compute-assistant-contract\.js\?v=scopedlabs-compute-assistant-contract-[^"']+/.test(html) ? "PASS" : "FAIL", "CPU loads cache-busted compute assistant contract");
result(/\.\/script\.js\?v=compute-cpu-context-[^"']+/.test(html) ? "PASS" : "FAIL", "CPU loads cache-busted page script");

runAudit("payload decision", files.payloadAudit);
runAudit("CPU result standard", files.standardAudit);
runAudit("status legend", files.legendAudit);
runAudit("assistant lifecycle", files.lifecycleAudit);

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
