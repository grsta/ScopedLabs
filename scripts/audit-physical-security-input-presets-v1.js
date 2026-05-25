const fs = require("fs");
const path = require("path");

const root = process.cwd();

const tools = [
  {
    slug: "area-planner",
    role: "pipeline-entry",
    mode: "not-required"
  },
  {
    slug: "scene-illumination",
    role: "pipeline-step",
    mode: "not-required"
  },
  {
    slug: "mounting-height",
    role: "pipeline-step",
    mode: "not-required"
  },
  {
    slug: "field-of-view",
    role: "pipeline-step",
    mode: "not-required"
  },
  {
    slug: "camera-coverage-area",
    role: "pipeline-step",
    mode: "not-required"
  },
  {
    slug: "camera-spacing",
    role: "pipeline-step",
    mode: "not-required"
  },
  {
    slug: "blind-spot-check",
    role: "pipeline-step",
    mode: "not-required"
  },
  {
    slug: "pixel-density",
    role: "pipeline-step",
    mode: "observe-only",
    note: "Pixel Density presets are useful but should not block this first module."
  },
  {
    slug: "lens-selection",
    role: "protected",
    mode: "protected"
  },
  {
    slug: "face-recognition-range",
    role: "optional-validation",
    mode: "required",
    presetIds: ["resPreset", "hfovPreset", "ppfPreset"],
    sourceInputIds: ["res", "hfov", "ppf", "fw", "dist"],
    scriptSignals: ["FACE_GUIDED_PRESETS", "bindFaceGuidedPresets", "applyFaceGuidedPreset", "syncAllFacePresetSelects"],
    overrideSignals: ["markFlowInputOverride"]
  },
  {
    slug: "license-plate-range",
    role: "optional-validation",
    mode: "required",
    presetIds: ["resPreset", "hfovPreset", "pppPreset", "pwPreset"],
    sourceInputIds: ["res", "hfov", "ppp", "pw", "dist"],
    scriptSignals: ["PLATE_GUIDED_PRESETS", "bindPlateGuidedPresets", "applyPlateGuidedPreset", "syncAllPlatePresetSelects"],
    overrideSignals: ["markFlowInputOverride"]
  }
];

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasId(source, id) {
  return source.includes('id="' + id + '"') || source.includes("id='" + id + "'");
}

function hasSignal(source, signal) {
  return source.includes(signal);
}

function classify(watch, fail) {
  if (fail.length) return "FAIL";
  if (watch.length) return "WATCH";
  return "SAFE";
}

function summarizeMissing(list) {
  return list.length ? list.join(",") : "-";
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
      presets: "-",
      sourceInputs: "-",
      scriptBinding: "-",
      overrideSafe: "-",
      numericSourceTruth: "-",
      notes: "protected/gold-standard"
    });
    continue;
  }

  if (!html) fail.push("missing index.html");
  if (!script) fail.push("missing script.js");

  const presetIds = Array.isArray(tool.presetIds) ? tool.presetIds : [];
  const sourceInputIds = Array.isArray(tool.sourceInputIds) ? tool.sourceInputIds : [];
  const scriptSignals = Array.isArray(tool.scriptSignals) ? tool.scriptSignals : [];
  const overrideSignals = Array.isArray(tool.overrideSignals) ? tool.overrideSignals : [];

  const missingPresets = presetIds.filter((id) => !hasId(html, id) && !combined.includes(id));
  const missingSourceInputs = sourceInputIds.filter((id) => !hasId(html, id) && !combined.includes('$("' + id + '")'));
  const missingScriptSignals = scriptSignals.filter((signal) => !hasSignal(combined, signal));
  const missingOverrideSignals = overrideSignals.filter((signal) => !hasSignal(combined, signal));

  if (tool.mode === "required") {
    if (missingPresets.length) watch.push("missing preset ids: " + missingPresets.join(","));
    if (missingSourceInputs.length) watch.push("missing source input ids: " + missingSourceInputs.join(","));
    if (missingScriptSignals.length) watch.push("missing preset script signals: " + missingScriptSignals.join(","));
    if (missingOverrideSignals.length) watch.push("missing override safety signals: " + missingOverrideSignals.join(","));
  }

  const anyPresetSignal =
    combined.includes("Preset") ||
    combined.includes("GUIDED_PRESETS") ||
    combined.includes("guided-preset");

  const numericInputsPresent = sourceInputIds.length
    ? missingSourceInputs.length === 0
    : "-";

  const presetStatus = presetIds.length
    ? (missingPresets.length ? "missing:" + summarizeMissing(missingPresets) : "present")
    : (anyPresetSignal ? "observed" : "-");

  const inputStatus = sourceInputIds.length
    ? (missingSourceInputs.length ? "missing:" + summarizeMissing(missingSourceInputs) : "present")
    : "-";

  const bindingStatus = scriptSignals.length
    ? (missingScriptSignals.length ? "missing:" + summarizeMissing(missingScriptSignals) : "present")
    : (anyPresetSignal ? "observed" : "-");

  const overrideStatus = overrideSignals.length
    ? (missingOverrideSignals.length ? "missing:" + summarizeMissing(missingOverrideSignals) : "present")
    : "-";

  const cls = classify(watch, fail);

  rows.push({
    slug: tool.slug,
    role: tool.role,
    mode: tool.mode,
    class: cls,
    presets: presetStatus,
    sourceInputs: inputStatus,
    scriptBinding: bindingStatus,
    overrideSafe: overrideStatus,
    numericSourceTruth: numericInputsPresent === true ? "yes" : numericInputsPresent,
    notes: fail.concat(watch).join(" | ") || tool.note || "-"
  });
}

const summary = {
  tools: rows.length,
  safe: rows.filter((row) => row.class === "SAFE").length,
  watch: rows.filter((row) => row.class === "WATCH").length,
  skip: rows.filter((row) => row.class === "SKIP").length,
  fail: rows.filter((row) => row.class === "FAIL").length
};

console.log("\nPhysical Security Input Preset Audit V1");
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
