const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  js: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  resultAudit: path.join(root, "scripts", "audit-compute-cpu-result-standard-v1.js"),
  assistantAudit: path.join(root, "scripts", "audit-compute-cpu-assistant-payload-decision-v1.js")
};

let pass = 0;
let fail = 0;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function result(kind, label, detail) {
  kind = String(kind || "FAIL").toUpperCase();
  if (kind === "PASS") pass++;
  if (kind === "FAIL") fail++;
  console.log(kind.padEnd(6), label);
  if (detail) console.log("       " + detail);
}

function order(text, tokens) {
  let last = -1;
  return tokens.every((token) => {
    const index = text.indexOf(token);
    if (index < 0 || index <= last) return false;
    last = index;
    return true;
  });
}

const html = read(files.html);
const js = read(files.js);
const resultAudit = read(files.resultAudit);
const assistantAudit = read(files.assistantAudit);

console.log("ScopedLabs Compute CPU Assistant Proof References Audit V1");
console.log("Repo:", root);
console.log("");

for (const token of [
  'id="computeCpuDecisionScheduleCard"',
  'id="computeCpuDecisionSchedule"',
  'id="computeCpuRecommendationReferencesCard"',
  'id="computeCpuRecommendationReferences"',
  'data-compute-cpu-decision-schedule-card',
  'data-compute-cpu-recommendation-references-card',
  'CPU Capacity Decision Schedule',
  'Recommendation References'
]) {
  result(html.includes(token) ? "PASS" : "FAIL", "CPU proof HTML token: " + token);
}

result((function () {
  const visualIndex = html.indexOf('id="computeCpuVisualCard"');
  const referencesIndex = html.indexOf('id="computeCpuRecommendationReferencesCard"');
  const decisionIndex = html.indexOf('id="computeCpuDecisionScheduleCard"');
  const exportIndex = html.indexOf('id="exportReport"');
  return visualIndex >= 0 && referencesIndex > visualIndex && decisionIndex > referencesIndex && exportIndex > decisionIndex;
})(), "CPU proof DOM order is visual -> references -> decision schedule -> export");

for (const token of [
  "function buildComputeCpuDecisionScheduleHtml(result)",
  "function buildComputeCpuRecommendationReferences(result)",
  "function buildComputeCpuRecommendationReferencesHtml(references)",
  "function renderComputeCpuProofSections(result)",
  "function clearComputeCpuProofSections()",
  "cpuWorkloadResult.recommendationReferences = buildComputeCpuRecommendationReferences(cpuWorkloadResult);",
  "renderComputeCpuProofSections(result);",
  "clearComputeCpuProofSections();",
  "data-compute-cpu-decision-schedule-table",
  "data-compute-cpu-recommendation-references-table",
  "Group",
  "Metric",
  "Value",
  "Engineering Note",
  "Marker",
  "Reference",
  "Reason",
  "*1",
  "*2",
  "*3",
  "Demand basis",
  "Reserve pressure",
  "Downstream validation",
  "tone-current",
  "tone-growth",
  "tone-failover",
  "#38d9ff",
  "#a78bfa",
  "#f59e0b"
]) {
  result(js.includes(token) ? "PASS" : "FAIL", "CPU proof script token: " + token);
}

for (const removed of [
  "probe-compute-cpu-proof-structure-0616.js",
  "probe-failsafe-assistant-proof-structure-0616.js"
]) {
  result(!fs.existsSync(path.join(root, "scripts", removed)) ? "PASS" : "FAIL", "temporary probe removed: " + removed);
}

for (const token of [
  "computeCpuDecisionScheduleCard",
  "computeCpuRecommendationReferencesCard",
  "buildComputeCpuDecisionScheduleHtml",
  "buildComputeCpuRecommendationReferences"
]) {
  result(resultAudit.includes(token) ? "PASS" : "FAIL", "result audit carries CPU proof token: " + token);
  result(assistantAudit.includes(token) ? "PASS" : "FAIL", "assistant audit carries CPU proof token: " + token);
}

console.log("");
console.log("========================================================================");
console.log("SUMMARY");
console.log("========================================================================");
console.log("PASS :", pass);
console.log("FAIL :", fail);

if (fail) {
  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("");
console.log("OVERALL: PASS");
