const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  ramHtml: path.join(root, "tools", "compute", "ram-sizing", "index.html"),
  ramScript: path.join(root, "tools", "compute", "ram-sizing", "script.js"),
  cpuHtml: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  cpuScript: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  exportJs: path.join(root, "assets", "export.js"),
  capacityVisuals: path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"),
  visualCss: path.join(root, "assets", "scopedlabs-compute-result-visuals.css"),
  moduleMap: path.join(root, "docs", "scopedlabs-module-map.md")
};

let pass = 0;
let watch = 0;
let fail = 0;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function has(text, token) {
  return text.includes(token);
}

function any(text, tokens) {
  return tokens.some((token) => text.includes(token));
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
const capacityVisuals = read(files.capacityVisuals);
const visualCss = read(files.visualCss);
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
passCheck("RAM keeps analyzer render output path", has(ramScript, "ScopedLabsAnalyzer.renderOutput"));

heading("SHARED COMPUTE CAPACITY MODULE WIRING");

passCheck("shared capacity module exists", has(capacityVisuals, "ScopedLabsComputeCapacityVisuals"));
passCheck("shared module owns RAM Capacity Envelope SVG builder", has(capacityVisuals, "function buildRamCapacityEnvelopeSvg"));
passCheck("shared module uses CPU proof marker palette", has(capacityVisuals, "#38d9ff") && has(capacityVisuals, "#a78bfa") && has(capacityVisuals, "#f59e0b"));
passCheck("shared module exports RAM capacity renderer", has(capacityVisuals, "renderRamCapacityEnvelope"));
passCheck("shared module exports clear helper", has(capacityVisuals, "clear"));
passCheck("shared Compute visual CSS includes capacity extension", has(visualCss, "scopedlabs-compute-capacity-visuals-001"));

passCheck("RAM loads shared Compute result visual CSS", has(ramHtml, "scopedlabs-compute-result-visuals.css"));
passCheck("RAM loads shared Compute capacity visual module", has(ramHtml, "scopedlabs-compute-capacity-visuals.js"));
passCheck("RAM has shared visual card mount", has(ramHtml, "computeRamVisualCard") && has(ramHtml, "computeRamVisual"));
passCheck("RAM script calls shared RAM renderer", has(ramScript, "ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope"));
passCheck("RAM script clears shared visual through module", has(ramScript, "ScopedLabsComputeCapacityVisuals.clear"));
passCheck("RAM writes shared capacity envelope into flow payload", has(ramScript, "capacityEnvelope: ramCapacityEnvelope"));

heading("NO PAGE-LOCAL VISUAL STACK");

passCheck("RAM script does not own page-local Capacity Envelope SVG builder", !has(ramScript, "function buildRamCapacityEnvelopeSvg"));
passCheck("RAM script does not own page-local proof section renderer", !has(ramScript, "function renderRamProofSections"));
passCheck("RAM script does not own page-local recommendation reference table", !has(ramScript, "buildRamRecommendationReferences"));
passCheck("RAM script does not own page-local decision schedule table", !has(ramScript, "buildRamDecisionSchedule"));
passCheck("RAM HTML does not contain literal backslash-n artifacts", !has(ramHtml, "\\n"));

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
passCheck("module map records shared capacity visual module", has(moduleMap, "assets/scopedlabs-compute-capacity-visuals.js"));
passCheck("module map records no one-off visual rule", has(moduleMap, "Do not add page-local one-off capacity SVG/table stacks"));

heading("REMAINING UPGRADE WATCHES BEFORE SHELL/EXPORT CLOSEOUT");

watchCheck("RAM does not yet use custom export payload", !has(ramHtml, "customPayloadBuilder"), "Expected later route: ScopedLabsComputeRamExport.buildPayload");
watchCheck("RAM does not yet load compute assistant contract", !has(ramHtml, "scopedlabs-compute-assistant-contract"), "Expected after shared visual is live-accepted.");
watchCheck("RAM does not yet load user tool notes", !has(ramHtml, "scopedlabs-user-tool-notes"), "Expected for report context parity.");
watchCheck("RAM does not yet expose custom chart image export route", !has(ramScript, "chartImage") && !has(ramScript, "ScopedLabsComputeRamExport"), "Expected after live visual is accepted.");

heading("RECOMMENDED STATUS");

console.log("STATUS: SHARED_RAM_CAPACITY_VISUAL_LIVE_PENDING_REVIEW");
console.log("");
console.log("Recommended next patch lane:");
console.log("- Live-verify shared RAM Capacity Envelope visual.");
console.log("- If accepted, add RAM custom export payload route through the shared capacity module.");
console.log("- Then connect assistant contract and user notes.");
console.log("- Defer broad shell rollout until RAM shared visual/export route is accepted.");

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
