const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-pipeline-nav-audit-001";
const CACHE = "physical-security-summary-pipeline-nav-001";

const pagePaths = [
  "tools/physical-security/area-planner/index.html",
  "tools/physical-security/scene-illumination/index.html",
  "tools/physical-security/mounting-height/index.html",
  "tools/physical-security/field-of-view/index.html",
  "tools/physical-security/camera-coverage-area/index.html",
  "tools/physical-security/camera-spacing/index.html",
  "tools/physical-security/blind-spot-check/index.html",
  "tools/physical-security/pixel-density/index.html",
  "tools/physical-security/lens-selection/index.html",
  "tools/physical-security/summary/index.html",
  "tools/physical-security/face-recognition-range/index.html",
  "tools/physical-security/license-plate-range/index.html"
];

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const pipelines = read("assets/pipelines.js");
const pipelineRuntime = read("assets/pipeline.js");
const summaryIndex = read("tools/physical-security/summary/index.html");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

const summaryLine = '{ id: "physical-security-summary", label: "Summary", href: "/tools/physical-security/summary/", flowGroup: "core" }';

has("pipelines-summary-step", "pipelines.js", pipelines, summaryLine);
has("pipelines-summary-label", "pipelines.js", pipelines, 'label: "Summary"');
has("pipelines-summary-href", "pipelines.js", pipelines, 'href: "/tools/physical-security/summary/"');
has("runtime-renders-current-step", "pipeline.js", pipelineRuntime, "const currentIndex = steps.findIndex((step) => step.id === currentStep);");
has("summary-body-step", "Summary index", summaryIndex, 'data-step="physical-security-summary"');

const summaryCount = pipelines.split('id: "physical-security-summary"').length - 1;
add(
  "summary-step-single",
  summaryCount === 1 ? "SAFE" : "FAIL",
  "physical-security-summary step count is " + summaryCount
);

const lensIndex = pipelines.indexOf('id: "lens-selection"');
const summaryIndexInPipeline = pipelines.indexOf('id: "physical-security-summary"');
const faceIndex = pipelines.indexOf('id: "face-recognition-range"');

add(
  "summary-after-lens",
  lensIndex !== -1 && summaryIndexInPipeline > lensIndex ? "SAFE" : "FAIL",
  "Summary appears after Lens Selection in Physical Security pipeline"
);

add(
  "summary-before-optional-branches",
  summaryIndexInPipeline !== -1 && faceIndex !== -1 && summaryIndexInPipeline < faceIndex ? "SAFE" : "FAIL",
  "Summary appears before optional specialty branch steps"
);

for (const rel of pagePaths) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    add("page-missing-" + rel.replace(/[^a-z0-9]+/gi, "-"), "FAIL", rel + " missing");
    continue;
  }

  const html = read(rel);
  if (!html.includes("/assets/pipelines.js")) {
    add("page-no-pipeline-" + rel.replace(/[^a-z0-9]+/gi, "-"), "WATCH", rel + " does not load pipelines.js");
    continue;
  }

  has(
    "page-cache-" + rel.replace(/[^a-z0-9]+/gi, "-"),
    rel,
    html,
    "/assets/pipelines.js?v=" + CACHE
  );
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Pipeline Nav Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
