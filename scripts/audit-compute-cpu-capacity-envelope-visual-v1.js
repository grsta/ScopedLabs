const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  js: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  legendCss: path.join(root, "assets", "scopedlabs-status-legend.css"),
  styleCss: path.join(root, "assets", "style.css"),
  v2: path.join(root, "scripts", "audit-compute-cpu-v2-capacity-factors-v1.js"),
  standard: path.join(root, "scripts", "audit-compute-cpu-result-standard-v1.js"),
  assistant: path.join(root, "scripts", "audit-compute-cpu-assistant-payload-decision-v1.js")
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

function runAudit(label, file) {
  const rel = path.relative(root, file);
  try {
    cp.execFileSync(process.execPath, [file], { cwd: root, stdio: "pipe" });
    result("PASS", label + " audit passes", rel);
  } catch (error) {
    result("FAIL", label + " audit failed", rel);
    const out = String((error && error.stdout) || "") + String((error && error.stderr) || "");
    if (out.trim()) console.log(out.trim());
  }
}

const html = read(files.html);
const js = read(files.js);
const legendCss = read(files.legendCss);
const styleCss = read(files.styleCss);

console.log("ScopedLabs Compute CPU Capacity Envelope Visual Audit V1");
console.log("Repo:", root);
console.log("");

for (const token of [
  "CPU Capacity Envelope",
  "Dynamic demand curve showing current load",
  'data-compute-result-visual="cpu-capacity-envelope"',
  "script.js?v=compute-cpu-capacity-envelope-zone-fill-tones-0615"
]) {
  result(html.includes(token) ? "PASS" : "FAIL", "CPU HTML visual token: " + token);
}

for (const token of [
  "function buildComputeCpuVisualSvg(result)",
  'data-compute-visual="cpu-capacity-envelope"',
  "CPU CAPACITY ENVELOPE",
  "Demand curve vs usable CPU capacity",
  "currentWorkers",
  "growthWorkers",
  "failoverWorkers",
  "currentRequiredCores",
  "growthRequiredCores",
  "failoverRequiredCores",
  "usableCapacityCores",
  "recommendedLogicalCores",
  "watchThresholdCores",
  "riskThresholdCores",
  "computeCpuEnvelopeBg",
  "const height = 500",
  "h: 280",
  "rgba(239,68,68,.06)",
  "rgba(250,204,21,.055)",
  "rgba(44,255,155,.05)",
  "markerLabelX",
  "markerLabelY",
  "marker-worker",
  "marker-core",
  "tone-current",
  "tone-growth",
  "tone-failover",
  "#2cff9b",
  "rgba(44,255,155",
  "#ef4444",
  "*1 demand basis",
  "*2 reserve pressure",
  "*3 downstream validation"
]) {
  result(js.includes(token) ? "PASS" : "FAIL", "CPU SVG renderer token: " + token);
}

for (const removed of [
  "*1 Current demand",
  "*2 Growth / reserve",
  "*3 Stress validation",
  "zone-risk-text\">RISK",
  "zone-watch-text\">WATCH",
  "zone-good-text\">GOOD",
  "point-label",
  "point-note",
  "#7ef5d5",
  "#9cfccf",
  "rgba(126,245,213",
  "rgba(125,255,152",
  "#fb7185",
  "rgba(248,113,113",
  "CPU load profile and core recommendation"
]) {
  result(!js.includes(removed) ? "PASS" : "FAIL", "removed CPU visual token: " + removed);
}

for (const token of [
  "#2cff9b",
  ".sl-pipeline-step.is-current .sl-pipeline-dot"
]) {
  result(styleCss.includes(token) ? "PASS" : "FAIL", "pipeline green source token: " + token);
}

for (const token of [
  "ScopedLabs stoplight status standard - 0614d",
  "#2cff9b",
  "rgba(44,255,155",
  "ScopedLabs softened risk accent standard - 0614e",
  "#ef4444",
  "rgba(206,32,41"
]) {
  result(legendCss.includes(token) ? "PASS" : "FAIL", "status legend stoplight token: " + token);
}

result(!legendCss.includes("rgba(125,255,152,.96)") ? "PASS" : "FAIL", "old legend Good color removed");
result(!html.includes('data-compute-result-visual="cpu-load-profile"') ? "PASS" : "FAIL", "old CPU visual data attribute removed from HTML");

runAudit("CPU V2 capacity", files.v2);
runAudit("CPU result standard", files.standard);
runAudit("CPU assistant payload", files.assistant);

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
