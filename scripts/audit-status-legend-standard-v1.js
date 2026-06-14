const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.cwd();

const failSafeFile = path.join(root, "tools", "access-control", "fail-safe-fail-secure", "index.html");
const cpuFile = path.join(root, "tools", "compute", "cpu-sizing", "index.html");
const sharedCssFile = path.join(root, "assets", "scopedlabs-status-legend.css");
const lifecycleAudit = path.join(root, "scripts", "audit-assistant-lifecycle-contract-v1.js");

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

function count(text, token) {
  return text.split(token).length - 1;
}

const failSafe = read(failSafeFile);
const cpu = read(cpuFile);
const css = read(sharedCssFile);

console.log("ScopedLabs Status Legend Standard Audit V1");
console.log("Repo:", root);

const failSafeSourceTokens = [
  '<section id="failSafeStatusLegend" class="access-tool-status-legend" aria-label="Fail-Safe status legend">',
  '<h3>Status Legend</h3>',
  '<div class="access-tool-status-legend-grid">',
  'access-tool-status-complete',
  'access-tool-status-watch',
  'access-tool-status-risk',
  'access-tool-status-authority'
];

for (const token of failSafeSourceTokens) {
  result(failSafe.includes(token) ? "PASS" : "FAIL", "Fail-Safe pinned source token: " + token);
}

const sharedCssTokens = [
  ".access-tool-status-legend",
  ".access-tool-status-legend h3",
  ".access-tool-status-legend-grid",
  ".access-tool-status-legend-grid div",
  ".access-tool-status-legend-grid strong",
  ".access-tool-status-complete",
  ".access-tool-status-watch",
  ".access-tool-status-risk",
  ".access-tool-status-authority",
  ".scopedlabs-status-legend"
];

for (const token of sharedCssTokens) {
  result(css.includes(token) ? "PASS" : "FAIL", "Shared status legend CSS token: " + token);
}

const cpuRequired = [
  '/assets/scopedlabs-status-legend.css?v=scopedlabs-status-legend-001',
  'id="computeFirstToolLegend"',
  'class="access-tool-status-legend"',
  'data-compute-first-tool-legend',
  'data-status-legend-standard',
  '<h3>Status Legend</h3>',
  'access-tool-status-legend-grid',
  'access-tool-status-complete',
  'access-tool-status-watch',
  'access-tool-status-risk',
  'access-tool-status-authority',
  'Good',
  'Watch',
  'Risk',
  'Review',
  'data-internal-results-ledger',
  'id="computeAssistantCard"',
  'id="computeAssistantMount"',
  'id="exportReport"',
  'id="saveSnapshot"'
];

for (const token of cpuRequired) {
  result(cpu.includes(token) ? "PASS" : "FAIL", "CPU standard legend/preserved token: " + token);
}

const cpuForbidden = [
  "CPU Sizing Legend",
  "compute-first-tool-legend-styles",
  "compute-first-tool-legend-grid",
  "compute-first-tool-legend-row",
  "compute-first-tool-legend-mark",
  "compute-first-tool-legend-label",
  "compute-first-tool-legend-text"
];

for (const token of cpuForbidden) {
  result(!cpu.includes(token) ? "PASS" : "FAIL", "CPU removed custom legend token: " + token);
}

result(count(cpu, "computeFirstToolLegend") === 1 ? "PASS" : "FAIL", "CPU legend appears once");

if (fs.existsSync(lifecycleAudit)) {
  try {
    const output = childProcess.execFileSync(process.execPath, [lifecycleAudit], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    result(output.includes("FAIL : 0") ? "PASS" : "FAIL", "assistant lifecycle audit has zero failures");
    result(output.includes("OVERALL: PASS WITH WATCH") || output.includes("OVERALL: PASS") ? "PASS" : "FAIL", "assistant lifecycle audit passes");
  } catch (error) {
    result("FAIL", "assistant lifecycle audit execution failed", error.message);
  }
} else {
  result("WATCH", "assistant lifecycle audit not found");
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
