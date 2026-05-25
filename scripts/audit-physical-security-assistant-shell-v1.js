const fs = require("fs");
const path = require("path");

const root = process.cwd();

const tools = [
  {
    slug: "area-planner",
    role: "pipeline-entry",
    title: "Area / Zone Planner",
    assistantMode: "not-required"
  },
  {
    slug: "scene-illumination",
    role: "pipeline-step",
    title: "Scene Illumination",
    assistantMode: "specialist-visual",
    renderer: "scene-illumination-lighting-plan",
    liveSignals: ["LiveVisual", "scene-illumination-lighting-plan"],
    exportSignals: ["ExportVisualSvg", "scene-illumination-lighting-plan"]
  },
  {
    slug: "mounting-height",
    role: "pipeline-step",
    title: "Mounting Height",
    assistantMode: "standard"
  },
  {
    slug: "field-of-view",
    role: "pipeline-step",
    title: "Field of View",
    assistantMode: "graphics-renderer",
    renderer: "fov-geometry-plan"
  },
  {
    slug: "camera-coverage-area",
    role: "pipeline-step",
    title: "Coverage Area",
    assistantMode: "graphics-renderer",
    renderer: "coverage-footprint-plan"
  },
  {
    slug: "camera-spacing",
    role: "pipeline-step",
    title: "Camera Spacing",
    assistantMode: "graphics-renderer",
    renderer: "camera-layout-iso"
  },
  {
    slug: "blind-spot-check",
    role: "pipeline-step",
    title: "Blind Spot Check",
    assistantMode: "graphics-renderer",
    renderer: "camera-layout-iso"
  },
  {
    slug: "pixel-density",
    role: "pipeline-step",
    title: "Pixel Density",
    assistantMode: "graphics-renderer",
    renderer: "pixel-density-detail-plan"
  },
  {
    slug: "lens-selection",
    role: "protected",
    title: "Lens Selection",
    assistantMode: "protected"
  },
  {
    slug: "face-recognition-range",
    role: "optional-validation",
    title: "Face Recognition Range",
    assistantMode: "specialist-visual",
    renderer: "face-recognition-range-plan",
    liveVisualIds: ["faceRecognitionLiveVisual"],
    presetIds: ["resPreset", "hfovPreset", "ppfPreset"],
    exportSignals: ["faceRecognitionExportVisualSvg", "face-recognition-range-plan"]
  },
  {
    slug: "license-plate-range",
    role: "optional-validation",
    title: "License Plate Capture Range",
    assistantMode: "specialist-visual",
    renderer: "license-plate-range-plan",
    liveVisualIds: ["licensePlateLiveVisual"],
    presetIds: ["resPreset", "hfovPreset", "pppPreset", "pwPreset"],
    exportSignals: ["licensePlateExportVisualSvg", "license-plate-range-plan"]
  }
];

const graphicsPath = path.join(root, "assets", "physical-security-graphics.js");
const graphics = fs.existsSync(graphicsPath) ? fs.readFileSync(graphicsPath, "utf8") : "";

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasId(source, id) {
  return source.includes('id="' + id + '"') || source.includes("id='" + id + "'");
}

function hasAny(source, signals) {
  if (!Array.isArray(signals) || !signals.length) return true;
  return signals.some((signal) => source.includes(signal));
}

function hasAll(source, signals) {
  if (!Array.isArray(signals) || !signals.length) return true;
  return signals.every((signal) => source.includes(signal));
}

function countVisibleAssistantStatus(html) {
  const matches = html.match(/Assistant Status/gi) || [];
  return matches.length;
}

function rendererRegistered(renderer) {
  if (!renderer) return true;
  return graphics.includes('registerRenderer("' + renderer + '"') ||
    graphics.includes("registerRenderer('" + renderer + "'");
}

function classify(watch, fail) {
  if (fail.length) return "FAIL";
  if (watch.length) return "WATCH";
  return "SAFE";
}

const results = [];

for (const tool of tools) {
  const rel = path.join("tools", "physical-security", tool.slug);
  const htmlPath = path.join(root, rel, "index.html");
  const scriptPath = path.join(root, rel, "script.js");

  const html = readIfExists(htmlPath);
  const script = readIfExists(scriptPath);
  const combined = html + "\n" + script;

  const watch = [];
  const fail = [];

  if (tool.assistantMode === "protected") {
    results.push({
      slug: tool.slug,
      role: tool.role,
      assistantMode: tool.assistantMode,
      class: "SKIP",
      assistantText: "protected",
      renderer: "-",
      liveVisual: "-",
      presets: "-",
      exportVisual: "-",
      duplicateStatus: "-",
      notes: "protected/gold-standard"
    });
    continue;
  }

  if (!html) fail.push("missing index.html");
  if (!script) fail.push("missing script.js");

  const assistantText = combined.toLowerCase().includes("assistant");
  const hasResults = hasId(html, "results");
  const hasAnalysisCopy = hasId(html, "analysis-copy") || hasId(html, "analysis");
  const hasToolShell = html.includes("scopedlabs-tool-shell.js");
  const hasRegistry = html.includes("physical-security-tool-registry.js");

  if (tool.assistantMode !== "not-required" && !assistantText) {
    watch.push("assistant text not detected");
  }

  if (tool.assistantMode !== "not-required" && !hasResults) {
    watch.push("#results missing");
  }

  if (tool.assistantMode !== "not-required" && !hasAnalysisCopy) {
    watch.push("analysis container missing");
  }

  if (!hasToolShell) watch.push("Tool Shell helper not loaded");
  if (!hasRegistry) watch.push("Physical Security registry not loaded");

  let rendererStatus = "-";
  if (tool.renderer) {
    const registered = rendererRegistered(tool.renderer);
    const referenced = combined.includes(tool.renderer);
    rendererStatus = registered || referenced ? "present" : "missing";

    if (!registered && !referenced) {
      watch.push("renderer missing: " + tool.renderer);
    }
  }

  let liveVisualStatus = "-";
  if (Array.isArray(tool.liveVisualIds) && tool.liveVisualIds.length) {
    const missing = tool.liveVisualIds.filter((id) => !hasId(html, id) && !combined.includes(id));
    liveVisualStatus = missing.length ? "missing: " + missing.join(", ") : "present";
    if (missing.length) watch.push("live visual id missing: " + missing.join(", "));
  } else if (Array.isArray(tool.liveSignals) && tool.liveSignals.length) {
    liveVisualStatus = hasAny(combined, tool.liveSignals) ? "present" : "not-detected";
    if (liveVisualStatus === "not-detected") watch.push("live visual signal not detected");
  }

  let presetStatus = "-";
  if (Array.isArray(tool.presetIds) && tool.presetIds.length) {
    const missing = tool.presetIds.filter((id) => !hasId(html, id) && !combined.includes(id));
    presetStatus = missing.length ? "missing: " + missing.join(", ") : "present";
    if (missing.length) watch.push("guided preset missing: " + missing.join(", "));
  }

  let exportStatus = "-";
  if (Array.isArray(tool.exportSignals) && tool.exportSignals.length) {
    exportStatus = hasAll(combined, tool.exportSignals) ? "present" : "missing";
    if (exportStatus === "missing") watch.push("export visual signal missing");
  }

  const assistantStatusCount = countVisibleAssistantStatus(html);
  const duplicateStatus = assistantStatusCount > 1 ? "possible duplicate visible chips: " + assistantStatusCount : "ok";
  if (assistantStatusCount > 1) {
    watch.push("possible duplicate visible Assistant Status text");
  }

  const cls = classify(watch, fail);

  results.push({
    slug: tool.slug,
    role: tool.role,
    assistantMode: tool.assistantMode,
    class: cls,
    assistantText: assistantText ? "yes" : "no",
    renderer: rendererStatus,
    liveVisual: liveVisualStatus,
    presets: presetStatus,
    exportVisual: exportStatus,
    duplicateStatus,
    notes: fail.concat(watch).join(" | ") || "-"
  });
}

const summary = {
  tools: results.length,
  safe: results.filter((r) => r.class === "SAFE").length,
  watch: results.filter((r) => r.class === "WATCH").length,
  skip: results.filter((r) => r.class === "SKIP").length,
  fail: results.filter((r) => r.class === "FAIL").length
};

console.log("\nPhysical Security Assistant Shell Audit V1");
console.log("Mode: audit/no-op");
console.log("Files modified: 0\n");

console.table(results);

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
