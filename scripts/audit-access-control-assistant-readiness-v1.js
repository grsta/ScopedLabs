const fs = require("fs");
const path = require("path");

const root = process.cwd();
const checks = [];

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function add(status, check, detail = "") {
  checks.push({ Status: status, Check: check, Detail: detail });
}

function safe(check, ok, detail = "") {
  add(ok ? "SAFE" : "FAIL", check, detail);
}

function watch(check, ok, detail = "") {
  add(ok ? "SAFE" : "WATCH", check, detail);
}

const tools = [
  "fail-safe-fail-secure",
  "reader-type-selector",
  "credential-format",
  "lock-power-budget",
  "door-cable-length",
  "panel-capacity",
  "door-count-planner",
  "access-level-sizing",
  "elevator-reader-count",
  "anti-passback-zones"
];

const physicalRefs = [
  "assets/physical-security-local-assistant.js",
  "assets/physical-security-tool-assistant-adapters.js",
  "assets/physical-security-guidance-memory.js",
  "assets/physical-security-guidance-event-bridge.js",
  "tools/physical-security/scene-illumination/index.html",
  "tools/physical-security/scene-illumination/script.js",
  "tools/physical-security/summary/index.html",
  "tools/physical-security/summary/script.js"
];

safe("Access Control category landing exists", exists("tools/access-control/index.html"));
safe("Access Control guide exists", exists("guides/access-control-planning/index.html"));
safe("Shared export engine present", exists("assets/scopedlabs-assistant-export.js") && exists("assets/scopedlabs-report-metadata.js"));
safe("Shared tool shell present", exists("assets/scopedlabs-tool-shell.js"));

physicalRefs.forEach((rel) => {
  safe("Physical Security reference present: " + rel, exists(rel));
});

const matrix = [];

for (const slug of tools) {
  const htmlRel = path.join("tools", "access-control", slug, "index.html");
  const jsRel = path.join("tools", "access-control", slug, "script.js");
  const html = read(htmlRel);
  const js = read(jsRel);

  safe(`${slug}: index.html exists`, !!html, htmlRel);
  safe(`${slug}: script.js exists`, !!js, jsRel);

  if (!html || !js) continue;

  const hasResults = html.includes('id="results"');
  const hasCalc = html.includes('id="calc"');
  const hasReset = html.includes('id="reset"');
  const hasExport = html.includes('id="exportReport"') && html.includes('id="saveSnapshot"') && html.includes('id="exportStatus"');
  const hasHelp = html.includes("/assets/help.js");
  const hasPipeline = html.includes("/assets/tool-flow.js") && html.includes("/assets/pipeline.js") && html.includes('id="pipeline"');
  const hasAnalyzer = html.includes("/assets/analyzer.js") && html.includes("analysis-copy");
  const hasContinue = html.includes('id="continue"');
  const hasToolCard = html.includes('id="toolCard"');
  const hasAssistant = html.includes("scopedlabs-local-assistant.js") || html.includes("access-control-local-assistant.js") || /AssistantMount|assistantMount|localAssistantMount/.test(html);
  const rendersResults = js.includes("function render") && js.includes("results.innerHTML");
  const invalidates = js.includes("function invalidate") || js.includes("Inputs changed");
  const hasCalcHandler = js.includes('addEventListener("click", calculate)') || js.includes('addEventListener("click", calc)');
  const hasExportPayload = js.includes("buildReportPayload") || js.includes("ScopedLabsExport");

  safe(`${slug}: result region present`, hasResults);
  safe(`${slug}: calculate/reset controls present`, hasCalc && hasReset);
  safe(`${slug}: export controls preserved`, hasExport);
  safe(`${slug}: Knowledge Base runtime preserved`, hasHelp);
  safe(`${slug}: script renders results`, rendersResults);
  safe(`${slug}: stale-result invalidation present`, invalidates);
  safe(`${slug}: calculate click handler present`, hasCalcHandler);
  safe(`${slug}: export payload/support present`, hasExportPayload);

  watch(`${slug}: pipeline shell already present`, hasPipeline, hasPipeline ? "Modern pipeline shell exists." : "Older standalone tool; rollout later.");
  watch(`${slug}: analyzer support already present`, hasAnalyzer, hasAnalyzer ? "Analyzer block exists." : "No analyzer block yet.");
  watch(`${slug}: continue action present`, hasContinue, hasContinue ? "Pipeline continuation exists." : "No continuation button.");
  watch(`${slug}: toolCard shell present`, hasToolCard, hasToolCard ? "Modern toolCard wrapper exists." : "Older card structure.");
  watch(`${slug}: local assistant not wired yet`, !hasAssistant, hasAssistant ? "Already wired; inspect before patching." : "Expected baseline.");

  matrix.push({
    Tool: slug,
    Pipeline: hasPipeline ? "yes" : "no",
    Analyzer: hasAnalyzer ? "yes" : "no",
    Continue: hasContinue ? "yes" : "no",
    ToolCard: hasToolCard ? "yes" : "no",
    Chart: html.includes("chart.js") ? "yes" : "no",
    Assistant: hasAssistant ? "present" : "none"
  });
}

const proofHtml = read("tools/access-control/fail-safe-fail-secure/index.html");
const proofJs = read("tools/access-control/fail-safe-fail-secure/script.js");

safe("Recommended first proof is Fail-Safe vs Fail-Secure", !!proofHtml && !!proofJs);
safe("First proof has no Chart.js visual to disturb", proofHtml && !proofHtml.includes("chart.js"));
safe(
  "First proof has modern pipeline/analyzer/result/export surface",
  proofHtml.includes("/assets/tool-flow.js") &&
  proofHtml.includes("/assets/analyzer.js") &&
  proofHtml.includes('id="results"') &&
  proofHtml.includes('id="exportReport"')
);
safe(
  "First proof has simple recommendation/status variables",
  ["recommendation", "confidence", "risk", "guidance", "status"].every((token) => proofJs.includes(token))
);

watch(
  "Generic local assistant engine is not present yet",
  !exists("assets/scopedlabs-local-assistant.js"),
  exists("assets/scopedlabs-local-assistant.js")
    ? "Generic engine already exists; inspect before adding."
    : "Expected: create reusable engine instead of copying Physical Security names."
);

console.log("\nAccess Control assistant readiness matrix:");
console.table(matrix);

console.log("\nReadiness checks:");
console.table(checks);

const safeCount = checks.filter((row) => row.Status === "SAFE").length;
const watchCount = checks.filter((row) => row.Status === "WATCH").length;
const failCount = checks.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safeCount);
console.log("- WATCH: " + watchCount);
console.log("- FAIL: " + failCount);

console.log("\nRecommendation:");
console.log("Use Fail-Safe vs Fail-Secure as the one-tool Access Control assistant proof.");
console.log("Create a generic ScopedLabs local assistant engine, an Access Control adapter map, and one explicit mount on that tool only.");
console.log("Do not roll out category-wide until the proof is pushed and live-accepted.");

if (failCount) process.exit(1);