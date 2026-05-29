const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-assistant-library-module-audit-001";

const existingFoundationAssets = [
  "assets/physical-security-guidance-memory.js",
  "assets/physical-security-guidance-event-bridge.js",
  "assets/physical-security-category-guidance.js",
  "assets/physical-security-category-guidance-renderer.js",
  "assets/physical-security-category-guidance-renderer.css",
  "assets/physical-security-report-summary.js",
  "assets/physical-security-tool-registry.js",
  "assets/scopedlabs-tool-shell.js",
  "assets/pipeline.js",
  "assets/pipelines.js"
];

const proposedAssistantAssets = [
  {
    rel: "assets/physical-security-ui-kit.js",
    label: "shared UI kit",
    apiSignals: [
      "ScopedLabsPhysicalSecurityUiKit",
      "flowLabel",
      "setButtonFeedback"
    ]
  },
  {
    rel: "assets/physical-security-graphics-library.js",
    label: "shared graphics/icon library",
    apiSignals: [
      "ScopedLabsPhysicalSecurityGraphicsLibrary",
      "getIcon",
      "listIcons"
    ]
  },
  {
    rel: "assets/physical-security-local-assistant.js",
    label: "shared local assistant renderer/engine",
    apiSignals: [
      "ScopedLabsPhysicalSecurityLocalAssistant",
      "buildModel",
      "renderHtml",
      "mount",
      "clear"
    ]
  },
  {
    rel: "assets/physical-security-tool-assistant-adapters.js",
    label: "tool assistant adapter map",
    apiSignals: [
      "ScopedLabsPhysicalSecurityToolAssistantAdapters",
      "getAdapter",
      "listAdapters"
    ]
  }
];

const eligibleTools = [
  { slug: "scene-illumination", label: "Scene Illumination", group: "core" },
  { slug: "mounting-height", label: "Mounting Height", group: "core" },
  { slug: "field-of-view", label: "Field of View", group: "core" },
  { slug: "camera-coverage-area", label: "Camera Coverage Area", group: "core" },
  { slug: "camera-spacing", label: "Camera Spacing", group: "core-proof" },
  { slug: "blind-spot-check", label: "Blind Spot Check", group: "core" },
  { slug: "pixel-density", label: "Pixel Density", group: "core" },
  { slug: "face-recognition-range", label: "Face Recognition Range", group: "optional-specialty" },
  { slug: "license-plate-range", label: "License Plate Capture Range", group: "optional-specialty" }
];

const protectedTools = [
  { slug: "area-planner", label: "Area Planner", rule: "frozen/skipped" },
  { slug: "lens-selection", label: "Lens Selection", rule: "protected" }
];

function relPath(...parts) {
  return path.join(...parts).replace(/\\/g, "/");
}

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) return "";
  return fs.readFileSync(abs(rel), "utf8");
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function scriptLoad(text, assetName) {
  return text.includes(assetName);
}

function statusFromBoolean(ok, failStatus = "FAIL") {
  return ok ? "SAFE" : failStatus;
}

const checks = [];
const toolRows = [];

function add(id, status, detail) {
  checks.push({ id, status, detail });
}

function toolFiles(slug) {
  return {
    indexRel: relPath("tools", "physical-security", slug, "index.html"),
    scriptRel: relPath("tools", "physical-security", slug, "script.js")
  };
}

function inspectTool(tool) {
  const files = toolFiles(tool.slug);
  const index = read(files.indexRel);
  const script = read(files.scriptRel);
  const combined = index + "\n" + script;

  const pageExists = !!index;
  const scriptExists = !!script;

  const row = {
    tool: tool.slug,
    group: tool.group,
    page: pageExists ? "yes" : "missing",
    script: scriptExists ? "yes" : "missing",

    memory: scriptLoad(index, "physical-security-guidance-memory.js") ? "yes" : "no",
    bridge: scriptLoad(index, "physical-security-guidance-event-bridge.js") ? "yes" : "no",

    localAssistantModule: scriptLoad(index, "physical-security-local-assistant.js") ? "yes" : "no",
    adapterModule: scriptLoad(index, "physical-security-tool-assistant-adapters.js") ? "yes" : "no",
    uiKit: scriptLoad(index, "physical-security-ui-kit.js") ? "yes" : "no",

    categoryRenderer: scriptLoad(index, "physical-security-category-guidance-renderer.js") ? "yes" : "no",
    reportSummary: scriptLoad(index, "physical-security-report-summary.js") ? "yes" : "no",

    toolRegistry: scriptLoad(index, "physical-security-tool-registry.js") ? "yes" : "no",

    iconLibrarySignal: hasAny(index, [
      "physical-security-graphics-library.js",
      "physical-security-icons",
      "physical-security-cad",
      "cad-graphics",
      "graphics-library",
      "graphics-adapter"
    ]) ? "yes" : "no",

    visibleAssistantSignal: hasAny(combined, [
      "Design Assistant",
      "design assistant",
      "tool assistant",
      "Tool Assistant",
      "local assistant",
      "Local Assistant",
      "assistant-card",
      "designAssistant",
      "updateCameraSpacingUserGuidance"
    ]) ? "yes" : "no",

    inlineSvgSignal: hasAny(combined, [
      "<svg",
      "createElementNS",
      "drawSvg",
      "innerHTML = '<svg",
      "viewBox="
    ]) ? "yes" : "no"
  };

  toolRows.push(row);
  return row;
}

console.log("");
console.log("Physical Security Assistant + Library Module Audit");
console.log("");
console.log("Audit version:", VERSION);

const missingFoundation = existingFoundationAssets.filter((rel) => !exists(rel));
add(
  "existing-physical-security-foundation-assets",
  missingFoundation.length ? "FAIL" : "SAFE",
  missingFoundation.length
    ? "Missing existing foundation assets: " + missingFoundation.join(", ")
    : "Existing Physical Security/shared foundation assets are present"
);

proposedAssistantAssets.forEach((asset) => {
  const text = read(asset.rel);
  const apiOk = exists(asset.rel) &&
    (!asset.apiSignals || asset.apiSignals.every((signal) => text.includes(signal)));

  add(
    "proposed-module-" + path.basename(asset.rel, ".js"),
    apiOk ? "SAFE" : "WATCH",
    exists(asset.rel)
      ? apiOk
        ? asset.label + " exists and exposes expected dormant API"
        : asset.label + " exists but expected API signals were not all detected"
      : asset.label + " does not exist yet; expected before full assistant rollout"
  );
});

add(
  "proposed-module-apis",
  proposedAssistantAssets.every((asset) => {
    const text = read(asset.rel);
    return exists(asset.rel) &&
      (!asset.apiSignals || asset.apiSignals.every((signal) => text.includes(signal)));
  }) ? "SAFE" : "WATCH",
  "Dormant assistant/UI/library modules expose expected API names"
);

const inspected = eligibleTools.map(inspectTool);

const missingPages = inspected.filter((row) => row.page !== "yes").map((row) => row.tool);
const missingScripts = inspected.filter((row) => row.script !== "yes").map((row) => row.tool);

add(
  "eligible-tool-pages-exist",
  missingPages.length ? "FAIL" : "SAFE",
  missingPages.length
    ? "Missing eligible tool pages: " + missingPages.join(", ")
    : "All eligible Physical Security tool pages exist"
);

add(
  "eligible-tool-scripts-exist",
  missingScripts.length ? "FAIL" : "SAFE",
  missingScripts.length
    ? "Missing eligible tool scripts: " + missingScripts.join(", ")
    : "All eligible Physical Security tool scripts exist"
);

const missingMemory = inspected.filter((row) => row.memory !== "yes").map((row) => row.tool);
const missingBridge = inspected.filter((row) => row.bridge !== "yes").map((row) => row.tool);

add(
  "eligible-tools-load-guidance-memory",
  missingMemory.length ? "FAIL" : "SAFE",
  missingMemory.length
    ? "Eligible tools missing guidance memory load: " + missingMemory.join(", ")
    : "All eligible tools load Physical Security guidance memory"
);

add(
  "eligible-tools-load-guidance-event-bridge",
  missingBridge.length ? "FAIL" : "SAFE",
  missingBridge.length
    ? "Eligible tools missing guidance event bridge load: " + missingBridge.join(", ")
    : "All eligible tools load Physical Security guidance event bridge"
);

const rendererOutsideCameraSpacing = inspected
  .filter((row) => row.tool !== "camera-spacing" && row.categoryRenderer === "yes")
  .map((row) => row.tool);

add(
  "visible-category-renderer-limited-to-camera-spacing",
  rendererOutsideCameraSpacing.length ? "FAIL" : "SAFE",
  rendererOutsideCameraSpacing.length
    ? "Category renderer appears outside Camera Spacing: " + rendererOutsideCameraSpacing.join(", ")
    : "Visible category/master renderer remains limited to Camera Spacing"
);

const cameraSpacing = inspected.find((row) => row.tool === "camera-spacing");

add(
  "camera-spacing-existing-proof-present",
  cameraSpacing && (cameraSpacing.visibleAssistantSignal === "yes" || cameraSpacing.categoryRenderer === "yes")
    ? "SAFE"
    : "WATCH",
  cameraSpacing && (cameraSpacing.visibleAssistantSignal === "yes" || cameraSpacing.categoryRenderer === "yes")
    ? "Camera Spacing still has assistant/category proof signals"
    : "Camera Spacing proof signals were not detected by this audit"
);

const missingLocalAssistant = inspected
  .filter((row) => row.localAssistantModule !== "yes")
  .map((row) => row.tool);

add(
  "local-assistant-module-not-yet-plugged-globally",
  missingLocalAssistant.length ? "WATCH" : "SAFE",
  missingLocalAssistant.length
    ? "Local assistant module is not yet loaded by these eligible tools: " + missingLocalAssistant.join(", ")
    : "All eligible tools load the local assistant module"
);

const missingAdapters = inspected
  .filter((row) => row.adapterModule !== "yes")
  .map((row) => row.tool);

add(
  "assistant-adapter-map-not-yet-plugged-globally",
  missingAdapters.length ? "WATCH" : "SAFE",
  missingAdapters.length
    ? "Assistant adapter map is not yet loaded by these eligible tools: " + missingAdapters.join(", ")
    : "All eligible tools load the assistant adapter map"
);

const missingUiKit = inspected
  .filter((row) => row.uiKit !== "yes")
  .map((row) => row.tool);

add(
  "shared-ui-kit-not-yet-plugged-globally",
  missingUiKit.length ? "WATCH" : "SAFE",
  missingUiKit.length
    ? "Shared UI kit is not yet loaded by these eligible tools: " + missingUiKit.join(", ")
    : "All eligible tools load the shared UI kit"
);

const missingIconLibrary = inspected
  .filter((row) => row.iconLibrarySignal !== "yes")
  .map((row) => row.tool);

add(
  "graphics-icon-library-inventory",
  missingIconLibrary.length ? "WATCH" : "SAFE",
  missingIconLibrary.length
    ? "Dedicated graphics/icon library signal not detected for: " + missingIconLibrary.join(", ")
    : "All eligible tools show graphics/icon library signals"
);

const inlineSvgTools = inspected
  .filter((row) => row.inlineSvgSignal === "yes")
  .map((row) => row.tool);

add(
  "inline-svg-custom-visual-inventory",
  inlineSvgTools.length ? "WATCH" : "SAFE",
  inlineSvgTools.length
    ? "Inline/custom SVG signals detected; likely candidates for library extraction: " + inlineSvgTools.join(", ")
    : "No inline/custom SVG signals detected in eligible tools"
);

protectedTools.forEach((tool) => {
  const files = toolFiles(tool.slug);
  const index = read(files.indexRel);
  const script = read(files.scriptRel);
  const combined = index + "\n" + script;

  const badSignals = [
    "physical-security-guidance-event-bridge.js",
    "physical-security-category-guidance-renderer.js",
    "physical-security-report-summary.js",
    "physical-security-local-assistant.js",
    "physical-security-tool-assistant-adapters.js"
  ].filter((needle) => combined.includes(needle));

  add(
    tool.slug + "-guard",
    badSignals.length ? "FAIL" : "SAFE",
    badSignals.length
      ? tool.label + " has protected/skipped module signals: " + badSignals.join(", ")
      : tool.label + " remains " + tool.rule
  );
});

const nextProofCandidates = inspected
  .filter((row) =>
    row.tool !== "camera-spacing" &&
    row.page === "yes" &&
    row.script === "yes" &&
    row.memory === "yes" &&
    row.bridge === "yes"
  )
  .map((row) => row.tool);

add(
  "next-visible-proof-candidate",
  nextProofCandidates.length ? "SAFE" : "WATCH",
  nextProofCandidates.length
    ? "Suggested next proof candidates: " + nextProofCandidates.slice(0, 4).join(", ")
    : "No clean next proof candidate detected"
);

console.log("");
console.log("Module matrix:");
console.table(toolRows);

console.log("");
console.log("Checks:");
console.table(checks);

const failCount = checks.filter((check) => check.status === "FAIL").length;
const watchCount = checks.filter((check) => check.status === "WATCH").length;
const safeCount = checks.filter((check) => check.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- Checks:", checks.length);
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) {
  console.log("");
  console.log("Audit complete with FAIL items.");
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
