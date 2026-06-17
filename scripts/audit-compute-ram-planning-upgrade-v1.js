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

function passCheck(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log("PASS   " + label + (detail ? "\n       " + detail : ""));
  } else {
    fail++;
    console.log("FAIL   " + label + (detail ? "\n       " + detail : ""));
  }
}

function watchCheck(label, ok, detail = "") {
  if (ok) {
    watch++;
    console.log("WATCH  " + label + (detail ? "\n       " + detail : ""));
  } else {
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
  passCheck(label + " readable", !!read(file), path.relative(root, file));
}

heading("CURRENT RAM BASELINE");

passCheck("RAM has shared export config", has(ramHtml, "ScopedLabsExportConfig"));
passCheck("RAM loads shared export engine", has(ramHtml, "/assets/export.js"));
passCheck("RAM has export report button", has(ramHtml, "exportReport"));
passCheck("RAM has save snapshot button", has(ramHtml, "saveSnapshot"));
passCheck("RAM has pipeline continue target", has(ramHtml, "Continue") && has(ramHtml, "Storage IOPS"));
passCheck("RAM has existing calculation function", has(ramScript, "function calc"));
passCheck("RAM has existing workload factor logic", has(ramScript, "function workloadFactor"));
passCheck("RAM has basic planning terms", any(ramScript, ["growth", "reserve", "overhead", "cache", "swap", "virtual"]));

heading("RAM PROOF LAYER V1");

passCheck("RAM has Capacity Envelope SVG builder", has(ramScript, "function buildRamCapacityEnvelopeSvg"));
passCheck("RAM has Capacity Envelope live title", has(ramScript, "RAM Capacity Envelope"));
passCheck("RAM has Recommendation References section", has(ramScript, "Recommendation References") && has(ramScript, "buildRamRecommendationReferences"));
passCheck("RAM has Capacity Decision Schedule section", has(ramScript, "RAM Capacity Decision Schedule") && has(ramScript, "buildRamDecisionSchedule"));
passCheck("RAM renders proof sections after analyzer output", has(ramScript, "renderRamProofSections(ramProofModel);"));
passCheck("RAM keeps analyzer render output path", has(ramScript, "ScopedLabsAnalyzer.renderOutput"));
passCheck("RAM refreshes export state after calculation", has(ramScript, "refreshRamExportState();"));
passCheck("RAM invalidates export state on input/reset invalidation", has(ramScript, "invalidateRamExportState();"));
passCheck("RAM writes recommendation references to flow payload", has(ramScript, "recommendationReferences,"));
passCheck("RAM writes decision schedule to flow payload", has(ramScript, "ramDecisionSchedule"));

heading("REMAINING UPGRADE WATCHES BEFORE SHELL/EXPORT CLOSEOUT");

watchCheck("RAM does not yet use custom export payload", !has(ramHtml, "customPayloadBuilder"), "Expected later route: ScopedLabsComputeRamExport.buildPayload");
watchCheck("RAM does not yet load compute assistant contract", !has(ramHtml, "scopedlabs-compute-assistant-contract"), "Expected after planning model is live-proven.");
watchCheck("RAM does not yet load user tool notes", !has(ramHtml, "scopedlabs-user-tool-notes"), "Expected for report context parity.");
watchCheck("RAM does not yet expose custom chart image export route", !has(ramScript, "chartImage") && !has(ramScript, "ScopedLabsComputeRamExport"), "Expected after live proof visual is accepted.");

heading("CPU REFERENCE PATTERN AVAILABLE");

passCheck("CPU has accepted custom payload export namespace", has(cpuScript, "ScopedLabsComputeCpuExport"));
passCheck("CPU has accepted custom export payload builder", has(cpuScript, "function buildComputeCpuExportPayload"));
passCheck("CPU has accepted visual SVG builder", has(cpuScript, "buildComputeCpuVisualSvg"));
passCheck("CPU has accepted recommendation references", has(cpuScript, "buildComputeCpuRecommendationReferences"));
passCheck("CPU has accepted decision schedule", has(cpuScript, "buildComputeCpuDecisionScheduleHtml"));
passCheck("shared export supports custom payload builder", has(exportJs, "customPayloadBuilder"));
passCheck("shared export supports chart image", has(exportJs, "chartImage"));
passCheck("shared export supports extra sections", has(exportJs, "extraSections"));

heading("MODULE MAP COVERAGE");

passCheck("module map records RAM sizing path", has(moduleMap, "tools/compute/ram-sizing"));
passCheck("module map records RAM Capacity Envelope target", has(moduleMap, "RAM Capacity Envelope"));
passCheck("module map records future RAM export route", has(moduleMap, "ScopedLabsComputeRamExport.buildPayload"));

heading("RECOMMENDED STATUS");

console.log("STATUS: RAM_PROOF_LAYER_LIVE_PENDING_REVIEW");
console.log("");
console.log("Recommended next patch lane:");
console.log("- Live-verify RAM Capacity Envelope, Recommendation References, and Decision Schedule.");
console.log("- If accepted, add RAM custom export payload route.");
console.log("- Then connect assistant contract and user notes.");
console.log("- Defer broad shell rollout until RAM proof/export route is accepted.");

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
