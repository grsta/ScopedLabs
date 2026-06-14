const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.cwd();

const files = {
  contract: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
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

const contract = read(files.contract);
const html = read(files.html);
const script = read(files.script);

console.log("ScopedLabs Compute CPU Input Clear Race Audit V1");
console.log("Repo:", root);

for (const token of [
  "function wire()",
  "calc.addEventListener",
  "window.setTimeout(mountCpuSizing, 80)",
  "window.setTimeout(mountCpuSizing, 240)",
  "if (getStep() === \"cpu-sizing\") return;",
  "input/change event can erase"
]) {
  result(contract.includes(token) ? "PASS" : "FAIL", "contract lifecycle token: " + token);
}

for (const token of [
  "function invalidate()",
  "clearComputeAssistant();",
  "clearComputeCpuVisual();",
  "addEventListener(\"input\", invalidate)",
  "addEventListener(\"change\", invalidate)"
]) {
  result(script.includes(token) ? "PASS" : "FAIL", "CPU page-owned invalidation token: " + token);
}

result(/\/assets\/scopedlabs-compute-assistant-contract\.js\?v=scopedlabs-compute-assistant-contract-[^"']+/.test(html) ? "PASS" : "FAIL", "CPU loads cache-busted compute assistant contract");

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
