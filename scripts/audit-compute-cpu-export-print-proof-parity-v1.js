const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();

const files = {
  html: path.join(root, "tools", "compute", "cpu-sizing", "index.html"),
  script: path.join(root, "tools", "compute", "cpu-sizing", "script.js"),
  assistantExport: path.join(root, "assets", "scopedlabs-assistant-export.js"),
  computeContract: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
  reportMetadata: path.join(root, "assets", "scopedlabs-report-metadata.js"),
  proofAudit: path.join(root, "scripts", "audit-compute-cpu-assistant-proof-references-v1.js"),
  resultAudit: path.join(root, "scripts", "audit-compute-cpu-result-standard-v1.js")
};

let pass = 0;
let watch = 0;
let fail = 0;

function log(kind, label, detail) {
  const padded = kind.padEnd(6, " ");
  console.log(`${padded} ${label}`);
  if (detail) console.log(`       ${detail}`);
}

function result(ok, label, detail) {
  if (ok) {
    pass++;
    log("PASS", label, detail);
  } else {
    fail++;
    log("FAIL", label, detail);
  }
}

function soft(ok, label, detail) {
  if (ok) {
    pass++;
    log("PASS", label, detail);
  } else {
    watch++;
    log("WATCH", label, detail);
  }
}

function readRequired(file, label) {
  try {
    const text = fs.readFileSync(file, "utf8");
    result(true, `${label} readable`, path.relative(root, file));
    return text;
  } catch (error) {
    result(false, `${label} readable`, error.message);
    return "";
  }
}

function readOptional(file, label) {
  try {
    const text = fs.readFileSync(file, "utf8");
    soft(true, `${label} readable`, path.relative(root, file));
    return text;
  } catch {
    soft(false, `${label} readable`, path.relative(root, file));
    return "";
  }
}

function runAudit(file, label) {
  if (!fs.existsSync(file)) {
    soft(false, `${label} audit exists`, path.relative(root, file));
    return;
  }

  try {
    cp.execFileSync(process.execPath, [file], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe"
    });
    result(true, `${label} audit passes`, path.relative(root, file));
  } catch (error) {
    result(false, `${label} audit passes`, path.relative(root, file));
    const output = String((error && (error.stdout || error.stderr)) || error.message || "").trim();
    if (output) {
      console.log(output.split(/\r?\n/).slice(-24).join("\n"));
    }
  }
}

function indexOrder(text, ids) {
  const indexes = ids.map((id) => text.indexOf(id));
  return indexes.every((value) => value >= 0) && indexes.every((value, index) => index === 0 || value > indexes[index - 1]);
}

function around(text, token, size = 700) {
  const index = text.indexOf(token);
  if (index < 0) return "";
  return text.slice(Math.max(0, index - size), Math.min(text.length, index + size));
}

function collectAssetRefs(html) {
  const refs = [];
  const re = /src="([^"]*assets\/[^"]+\.js[^"]*)"/g;
  let match;
  while ((match = re.exec(html))) {
    refs.push(match[1]);
  }
  return refs;
}

function assetPathFromRef(ref) {
  const clean = ref.replace(/^\//, "").replace(/\?v=.*$/, "");
  return path.join(root, clean);
}

console.log("ScopedLabs Compute CPU Export / Print Proof Parity Audit V1");
console.log("Repo:", root);
console.log("");

const html = readRequired(files.html, "CPU HTML");
const script = readRequired(files.script, "CPU script");
const assistantExport = readOptional(files.assistantExport, "assistant export asset");
const computeContract = readOptional(files.computeContract, "compute assistant contract");
const reportMetadata = readOptional(files.reportMetadata, "report metadata asset");

console.log("");

const assetRefs = collectAssetRefs(html);
const exportAssetRefs = assetRefs.filter((ref) => /export|report|metadata/i.test(ref));
const referencedExportAssets = exportAssetRefs
  .map((ref) => ({ ref, file: assetPathFromRef(ref) }))
  .filter((item) => fs.existsSync(item.file));

let referencedExportText = "";
for (const item of referencedExportAssets) {
  referencedExportText += "\n/* " + item.ref + " */\n" + fs.readFileSync(item.file, "utf8");
}

const exportText = [
  assistantExport,
  computeContract,
  reportMetadata,
  referencedExportText
].join("\n");

const combinedPage = html + "\n" + script;
const combinedAll = combinedPage + "\n" + exportText;

console.log("========================================================================");
console.log("LIVE CPU PROOF LAYOUT");
console.log("========================================================================");

result(indexOrder(html, [
  'id="computeCpuVisualCard"',
  'id="computeCpuRecommendationReferencesCard"',
  'id="computeCpuDecisionScheduleCard"',
  'id="exportReport"'
]), "live DOM order is chart -> recommendation references -> decision schedule -> export");

for (const token of [
  'id="computeCpuRecommendationReferencesCard"',
  'id="computeCpuRecommendationReferences"',
  "CPU Capacity Envelope",
  "Recommendation References",
  "data-export-section=\"true\"",
  "data-compute-cpu-reference-marker-plain",
  "border: none !important",
  "border-radius: 0 !important",
  "background: transparent !important"
]) {
  result(html.includes(token), `live reference marker/plain-style token: ${token}`);
}

result(!/\.compute-cpu-proof-marker\s*\{[\s\S]*?border:\s*1px\s+solid\s+currentColor/.test(combinedPage), "live CPU marker circle border removed");
result(!/\.compute-cpu-proof-marker\s*\{[\s\S]*?border-radius:\s*(999px|50%)/.test(combinedPage), "live CPU marker pill/circle radius removed");

console.log("");
console.log("========================================================================");
console.log("CPU RESULT PAYLOAD / PROOF DATA");
console.log("========================================================================");

for (const token of [
  "function buildComputeCpuRecommendationReferences(result)",
  "function buildComputeCpuRecommendationReferencesHtml(references)",
  "computeCpuMarkerColor(tone, marker)",
  "function computeCpuMarkerHtml(marker, tone)",
  "style=\"color:",
  "data-export-svg=\"true\"",
  "function computeCpuMarkerColor",
  "function buildComputeCpuDecisionScheduleHtml(result)",
  "cpuWorkloadResult.recommendationReferences = buildComputeCpuRecommendationReferences(cpuWorkloadResult);",
  "recommendationReferences = buildComputeCpuRecommendationReferences",
  "renderComputeCpuProofSections(result);",
  "window.ScopedLabsExport.refresh"
]) {
  result(script.includes(token), `CPU script proof/export token: ${token}`);
}

const recommendationBuildIndex = script.indexOf("cpuWorkloadResult.recommendationReferences = buildComputeCpuRecommendationReferences");
const pipelineIndex = script.indexOf("const cpuPipelineResult = {");
const exportRefreshIndex = script.indexOf("window.ScopedLabsExport.refresh");
soft(
  recommendationBuildIndex >= 0 && pipelineIndex > recommendationBuildIndex,
  "recommendationReferences are built before cpuPipelineResult",
  "needed so export/assistant payload can receive the same references"
);
soft(
  pipelineIndex >= 0 && exportRefreshIndex > pipelineIndex,
  "export refresh runs after cpuPipelineResult is built",
  "needed so export sees the final result payload"
);

console.log("");
console.log("========================================================================");
console.log("EXPORT / PRINT PARITY");
console.log("========================================================================");

soft(exportText.length > 0, "export-related assets discovered", referencedExportAssets.map((item) => item.ref).join(", ") || "using known asset candidates only");

for (const token of [
  "Recommendation References",
  "data-assistant-export-table=\"recommendationReferences\"",
  "renderRecommendationReferencesTable",
  "function exportableTableCellStyle",
  "report-reference-marker",
  "cell.style",
  "styleAttr",
  "#f59e0b",
  "#a78bfa",
  "#38d9ff",
  "recommendationReferenceMarkerColor",
  "recommendationReferences",
  "Marker",
  "Reference",
  "Reason"
]) {
  result(exportText.includes(token), `export renderer token: ${token}`);
}

soft(/print|@media print|beforeprint|afterprint/i.test(exportText + "\n" + html), "print mode hook/style present", "checks assets and CPU page");
soft(/low-ink|print|export/i.test(exportText), "export/print mode language present", "checks export assets");
result(!/Recommendation References[\s\S]{0,1200}border-radius:\s*(999px|50%)/i.test(exportText + "\n" + html), "export/reference area does not reintroduce pill/circle radius");
result(!/Recommendation References[\s\S]{0,1200}border:\s*1px\s+solid\s+currentColor/i.test(exportText + "\n" + html), "export/reference area does not reintroduce marker circle border");

const referenceSectionContext = around(exportText, "Recommendation References", 1200);
soft(
  referenceSectionContext.includes("Marker") && referenceSectionContext.includes("Reference") && referenceSectionContext.includes("Reason"),
  "export recommendation references appear table-ready",
  "Marker / Reference / Reason should travel together"
);

console.log("");
console.log("========================================================================");
console.log("EXISTING AUDIT GATES");
console.log("========================================================================");

runAudit(files.proofAudit, "CPU proof references");
runAudit(files.resultAudit, "CPU result standard");

console.log("");
console.log("========================================================================");
console.log("SUMMARY");
console.log("========================================================================");
console.log("PASS :", pass);
console.log("WATCH:", watch);
console.log("FAIL :", fail);
console.log("");

if (fail > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

if (watch > 0) {
  console.log("OVERALL: WATCH");
  process.exit(0);
}

console.log("OVERALL: PASS");