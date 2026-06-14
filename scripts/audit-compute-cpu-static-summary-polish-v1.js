const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  css: path.join(root, "assets", "scopedlabs-result-summary-card.css"),
  staticAudit: path.join(root, "scripts", "audit-compute-cpu-failsafe-static-card-v1.js"),
  resultAudit: path.join(root, "scripts", "audit-compute-cpu-result-standard-v1.js"),
  payloadAudit: path.join(root, "scripts", "audit-compute-cpu-assistant-payload-decision-v1.js"),
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

const html = read(files.html);
const script = read(files.script);
const css = read(files.css);

console.log("ScopedLabs Compute CPU Static Summary Polish Audit V1");
console.log("Repo:", root);

for (const token of [
  "compute-static-summary-card-shell",
  'id="computeCpuStatusText"',
  "scopedlabs-result-summary-status is-watch",
  "scopedlabs-result-summary-card-0614-cpu-static-polish",
  "compute-cpu-context-013-static-card-polish"
]) {
  result(html.includes(token) ? "PASS" : "FAIL", "CPU HTML polish token: " + token);
}

for (const token of [
  'className: "is-good"',
  'className: "is-watch"',
  'className: "is-risk"',
  "function renderVisibleCpuDecisionStatus(core)",
  "scopedlabs-result-summary-status is-watch"
]) {
  result(script.includes(token) ? "PASS" : "FAIL", "CPU script status token: " + token);
}

for (const token of [
  "CPU static decision card polish",
  ".compute-static-summary-card-shell",
  "background: transparent !important",
  "box-shadow: none !important",
  ".scopedlabs-result-summary-status.is-good",
  ".scopedlabs-result-summary-status.is-watch",
  ".scopedlabs-result-summary-status.is-risk",
  ".scopedlabs-result-summary-status.is-review"
]) {
  result(css.includes(token) ? "PASS" : "FAIL", "Summary CSS polish token: " + token);
}

runAudit("CPU static card", files.staticAudit);
runAudit("CPU result standard", files.resultAudit);
runAudit("CPU payload decision", files.payloadAudit);
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
