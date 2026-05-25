const fs = require("fs");
const path = require("path");

const root = process.cwd();

const tools = [
  { slug: "area-planner", role: "pipeline-entry", mode: "area-entry" },
  { slug: "scene-illumination", role: "pipeline-step", mode: "pipeline" },
  { slug: "mounting-height", role: "pipeline-step", mode: "pipeline" },
  { slug: "field-of-view", role: "pipeline-step", mode: "pipeline" },
  { slug: "camera-coverage-area", role: "pipeline-step", mode: "pipeline" },
  { slug: "camera-spacing", role: "pipeline-step", mode: "pipeline" },
  { slug: "blind-spot-check", role: "pipeline-step", mode: "pipeline" },
  { slug: "pixel-density", role: "pipeline-step", mode: "pipeline" },
  { slug: "lens-selection", role: "protected", mode: "protected" },
  { slug: "face-recognition-range", role: "optional-validation", mode: "manual-override-required" },
  { slug: "license-plate-range", role: "optional-validation", mode: "manual-override-required" }
];

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasId(source, id) {
  return source.includes('id="' + id + '"') || source.includes("id='" + id + "'");
}

function hasAny(source, signals) {
  return signals.some((signal) => source.includes(signal));
}

function classify(watch, fail) {
  if (fail.length) return "FAIL";
  if (watch.length) return "WATCH";
  return "SAFE";
}

const rows = [];

for (const tool of tools) {
  const dir = path.join(root, "tools", "physical-security", tool.slug);
  const htmlPath = path.join(dir, "index.html");
  const scriptPath = path.join(dir, "script.js");

  const html = readIfExists(htmlPath);
  const script = readIfExists(scriptPath);
  const combined = html + "\n" + script;

  const watch = [];
  const fail = [];

  if (tool.mode === "protected") {
    rows.push({
      slug: tool.slug,
      role: tool.role,
      mode: tool.mode,
      class: "SKIP",
      flowAnchor: "-",
      areaState: "-",
      pipelineWrite: "-",
      clearFlow: "-",
      manualOverride: "-",
      planningContext: "-",
      notes: "protected/gold-standard"
    });
    continue;
  }

  if (!html) fail.push("missing index.html");
  if (!script) fail.push("missing script.js");

  const flowAnchor = hasId(html, "flow-note") || combined.includes("flow-note");
  const resultsAnchor = hasId(html, "results");
  const areaState = html.includes("physical-security-area-state.js") || combined.includes("ScopedLabsPhysicalSecurityAreaState");
  const pipelineSignal = combined.includes("scopedlabs:pipeline") || combined.includes("FLOW_KEYS");
  const pipelineWrite = hasAny(combined, ["writeFlow", "ScopedLabsAnalyzer.writeFlow", "pipeline:last-result"]);
  const renderFlow = hasAny(combined, ["renderFlowNote", "refreshManualOverrideBanner", "flowNote"]);
  const clearFlow = hasAny(combined, ["clearFlow: true", "clearFlow", "invalidate({"]);
  const activeAreaSignal = hasAny(combined, ["getActiveArea", "updateActiveAreaResult", "activeArea", "Active Area"]);
  const importedContext = hasAny(combined, ["Imported Assumptions", "Area Context", "Planning Context", "manual override", "manual-override"]);
  const manualOverride = hasAny(combined, ["manualFlowOverrides", "manual-override", "markFlowInputOverride", "getManualOverrideMetadata"]);
  const sourceMode = hasAny(combined, ["sourceMode", "manualOverride", "ManualOverrides", "manualOverrides"]);

  if (tool.mode === "area-entry") {
    if (!areaState) watch.push("area state signal missing");
    if (!activeAreaSignal) watch.push("active area signal missing");
  }

  if (tool.mode === "pipeline" || tool.mode === "manual-override-required") {
    if (!flowAnchor) watch.push("#flow-note anchor missing");
    if (!resultsAnchor) watch.push("#results anchor missing");
    if (!areaState) watch.push("area state signal missing");
    if (!pipelineSignal) watch.push("pipeline storage signal missing");
    if (!pipelineWrite) watch.push("pipeline write signal missing");
    if (!renderFlow) watch.push("flow-note render/refresh signal missing");
    if (!clearFlow) watch.push("input invalidation/clearFlow signal missing");
  }

  if (tool.mode === "manual-override-required") {
    if (!manualOverride) watch.push("manual override signal missing");
    if (!sourceMode) watch.push("source mode/manual override metadata signal missing");
    if (!importedContext) watch.push("imported/planning context signal missing");
  }

  rows.push({
    slug: tool.slug,
    role: tool.role,
    mode: tool.mode,
    class: classify(watch, fail),
    flowAnchor: flowAnchor ? "present" : "-",
    areaState: areaState ? "present" : "-",
    pipelineWrite: pipelineWrite ? "present" : "-",
    clearFlow: clearFlow ? "present" : "-",
    manualOverride: manualOverride ? "present" : "-",
    planningContext: importedContext ? "present" : "-",
    notes: fail.concat(watch).join(" | ") || "-"
  });
}

const summary = {
  tools: rows.length,
  safe: rows.filter((row) => row.class === "SAFE").length,
  watch: rows.filter((row) => row.class === "WATCH").length,
  skip: rows.filter((row) => row.class === "SKIP").length,
  fail: rows.filter((row) => row.class === "FAIL").length
};

console.log("\nPhysical Security Source Integrity Audit V1");
console.log("Mode: audit/no-op");
console.log("Files modified: 0\n");

console.table(rows);

console.log("\nSummary:");
console.log("- Tools audited: " + summary.tools);
console.log("- SAFE: " + summary.safe);
console.log("- WATCH: " + summary.watch);
console.log("- SKIP: " + summary.skip);
console.log("- FAIL: " + summary.fail);

if (summary.fail > 0) {
  process.exitCode = 1;
}

console.log("\nAudit complete. No files modified.");
