const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();

const files = {
  js: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  envelope: path.join(root, "scripts", "audit-compute-cpu-capacity-envelope-visual-v1.js"),
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

const js = read(files.js);
const html = read(files.html);

console.log("ScopedLabs Compute CPU Status Authority Audit V1");
console.log("Repo:", root);
console.log("");

for (const token of [
  "function cpuEnvelopeThresholds(result)",
  "function cpuEnvelopeStatus(result)",
  "const envelopeStatus = cpuEnvelopeStatus(result);",
  "const status = cpuEnvelopeStatus(result || {}).toUpperCase();",
  "const cpuEnvelopeAuthority = cpuEnvelopeThresholds({",
  "const finalCpuStatus = cpuEnvelopeAuthority.status;",
  "const finalAnalyzerStatus = finalCpuStatus === \"GOOD\" ? \"HEALTHY\" : finalCpuStatus;",
  "status: cpuStatusForPlan(finalCpuStatus)",
  "analyzerStatus: finalCpuStatus",
  "metricAnalyzerStatus: analyzer.status",
  "status: finalCpuStatus",
  "planStatus: cpuStatusForPlan(finalCpuStatus)",
  "envelopeStatus: finalCpuStatus",
  "statusAuthority: \"cpu-capacity-envelope\"",
  "envelopeFinalDemandCores",
  "envelopeWatchThresholdCores",
  "envelopeRiskThresholdCores"
]) {
  result(js.includes(token) ? "PASS" : "FAIL", "CPU status authority token: " + token);
}

for (const removed of [
  "status: analyzer.status",
  "planStatus: cpuStatusForPlan(analyzer.status)",
  "const status = String(result && (result.analyzerStatus || result.status) || \"WATCH\").toUpperCase();"
]) {
  result(!js.includes(removed) ? "PASS" : "FAIL", "old CPU status authority token removed: " + removed);
}

result(html.includes("script.js?v=compute-cpu-status-authority-0616b") ? "PASS" : "FAIL", "CPU page cache bust updated");

runAudit("CPU envelope visual", files.envelope);
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
