const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  ramHtml: path.join(root, "tools", "compute", "ram-sizing", "index.html"),
  ramScript: path.join(root, "tools", "compute", "ram-sizing", "script.js"),
  cpuHtml: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  cpuScript: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  exportJs: path.join(root, "assets", "export.js"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md")
};

let pass = 0;
let watch = 0;
let fail = 0;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function check(kind, label, ok, detail = "") {
  if (kind === "PASS" && ok) {
    pass++;
    console.log("PASS   " + label + (detail ? "\n       " + detail : ""));
    return;
  }

  if (kind === "WATCH" && ok) {
    watch++;
    console.log("WATCH  " + label + (detail ? "\n       " + detail : ""));
    return;
  }

  if (kind === "FAIL" && !ok) {
    fail++;
    console.log("FAIL   " + label + (detail ? "\n       " + detail : ""));
    return;
  }

  if (kind === "PASS" && !ok) {
    fail++;
    console.log("FAIL   " + label + (detail ? "\n       " + detail : ""));
    return;
  }

  if (kind === "WATCH" && !ok) {
    pass++;
    console.log("PASS   " + label + (detail ? "\n       " + detail : ""));
  }
}

function has(text, token) {
  return text.includes(token);
}

function any(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function heading(title) {
  console.log("");
  console.log("========================================================================");
  console.log(title);
  console.log("========================================================================");
}

console.log("ScopedLabs Compute RAM Planning Upgrade Audit V1");
console.log("Repo:", root);

const ramHtml = read(files.ramHtml);
const ramScript = read(files.ramScript);
const cpuHtml = read(files.cpuHtml);
const cpuScript = read(files.cpuScript);
const exportJs = read(files.exportJs);
const moduleMap = read(files.moduleMap);

heading("FILES");
for (const [label, file] of Object.entries(files)) {
  check("PASS", label + " readable", !!read(file), path.relative(root, file));
}

heading("CURRENT RAM BASELINE");

check("PASS", "RAM has shared export config", has(ramHtml, "ScopedLabsExportConfig"));
check("PASS", "RAM loads shared export engine", has(ramHtml, "/assets/export.js"));
check("PASS", "RAM has export report button", has(ramHtml, "exportReport"));
check("PASS", "RAM has save snapshot button", has(ramHtml, "saveSnapshot"));
check("PASS", "RAM has pipeline continue target", has(ramHtml, "Continue") && has(ramHtml, "Storage IOPS"));
check("PASS", "RAM has existing calculation function", has(ramScript, "function calc"));
check("PASS", "RAM has existing workload factor logic", has(ramScript, "function workloadFactor"));
check("PASS", "RAM has basic planning terms", any(ramScript, ["growth", "reserve", "overhead", "cache", "swap", "virtual"]));

heading("UPGRADE GAPS BEFORE SHELL ROLLOUT");

check("WATCH", "RAM does not yet use custom export payload", !has(ramHtml, "customPayloadBuilder"), "Expected upgrade: ScopedLabsComputeRamExport.buildPayload");
check("WATCH", "RAM does not yet load compute assistant contract", !has(ramHtml, "scopedlabs-compute-assistant-contract"), "Expected upgrade after planning model is mature.");
check("WATCH", "RAM does not yet load user tool notes", !has(ramHtml, "scopedlabs-user-tool-notes"), "Expected upgrade for report context parity.");
check("WATCH", "RAM script does not yet refresh/invalidate export state", !has(ramScript, "ScopedLabsExport"), "Expected upgrade: invalidate on input changes and refresh after calculation.");
check("WATCH", "RAM has no recommendationReferences payload", !has(ramScript, "recommendationReferences"), "Expected upgrade: *1/*2/*3 proof references.");
check("WATCH", "RAM has no decision schedule", !has(ramScript, "Decision Schedule") && !has(ramScript, "DecisionSchedule"), "Expected upgrade: RAM Capacity Decision Schedule.");
check("WATCH", "RAM has no custom chart/export image route", !has(ramScript, "chartImage") && !has(ramScript, "data:image/svg+xml"), "Expected upgrade: RAM Capacity Envelope visual/export.");

heading("CPU REFERENCE PATTERN AVAILABLE");

check("PASS", "CPU has accepted custom payload export namespace", has(cpuScript, "ScopedLabsComputeCpuExport"));
check("PASS", "CPU has accepted custom export payload builder", has(cpuScript, "function buildComputeCpuExportPayload"));
check("PASS", "CPU has accepted visual SVG builder", has(cpuScript, "buildComputeCpuVisualSvg"));
check("PASS", "CPU has accepted recommendation references", has(cpuScript, "buildComputeCpuRecommendationReferences"));
check("PASS", "CPU has accepted decision schedule", has(cpuScript, "buildComputeCpuDecisionScheduleHtml"));
check("PASS", "shared export supports custom payload builder", has(exportJs, "customPayloadBuilder"));
check("PASS", "shared export supports chart image", has(exportJs, "chartImage"));
check("PASS", "shared export supports extra sections", has(exportJs, "extraSections"));

heading("RAM PLANNING UPGRADE TARGET");

const targetTokens = [
  "RAM Capacity Envelope",
  "Recommended installed RAM tier",
  "usable headroom",
  "Recommendation References",
  "RAM Capacity Decision Schedule",
  "ScopedLabsComputeRamExport.buildPayload"
];

for (const token of targetTokens) {
  const present = has(ramScript, token) || has(ramHtml, token) || has(moduleMap, token);
  check("WATCH", "target not yet implemented: " + token, !present);
}

heading("RECOMMENDED STATUS");

console.log("STATUS: UPGRADE_FIRST");
console.log("");
console.log("Recommended next patch lane:");
console.log("- Preserve current RAM inputs and outputs first.");
console.log("- Add planning factors only where they are defensible.");
console.log("- Build RAM Capacity Envelope visual.");
console.log("- Add RAM Recommendation References.");
console.log("- Add RAM Capacity Decision Schedule.");
console.log("- Add RAM custom export payload route after visual/proof model exists.");
console.log("- Then connect shell/assistant/user notes.");

console.log("");
console.log("SUMMARY");
console.log("PASS :", pass);
console.log("WATCH:", watch);
console.log("FAIL :", fail);

if (fail) {
  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("");
console.log("OVERALL: PASS_WITH_WATCH");
