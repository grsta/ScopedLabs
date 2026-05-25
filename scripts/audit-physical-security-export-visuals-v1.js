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
    mode: "required",
    renderer: "scene-illumination-lighting-plan",
    exportSignals: ["ExportVisualSvg", "scene-illumination-lighting-plan"]
  },
  {
    slug: "mounting-height",
    role: "pipeline-step",
    mode: "standard"
  },
  {
    slug: "field-of-view",
    role: "pipeline-step",
    mode: "renderer-required",
    renderer: "fov-geometry-plan"
  },
  {
    slug: "camera-coverage-area",
    role: "pipeline-step",
    mode: "renderer-required",
    renderer: "coverage-footprint-plan"
  },
  {
    slug: "camera-spacing",
    role: "pipeline-step",
    mode: "observe-only",
    renderer: "camera-layout-iso"
  },
  {
    slug: "blind-spot-check",
    role: "pipeline-step",
    mode: "observe-only",
    renderer: "camera-layout-iso"
  },
  {
    slug: "pixel-density",
    role: "pipeline-step",
    mode: "renderer-required",
    renderer: "pixel-density-detail-plan"
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
    renderer: "face-recognition-range-plan",
    exportSignals: ["faceRecognitionExportVisualSvg", "face-recognition-range-plan"]
  },
  {
    slug: "license-plate-range",
    role: "optional-validation",
    mode: "required",
    renderer: "license-plate-range-plan",
    exportSignals: ["licensePlateExportVisualSvg", "license-plate-range-plan"]
  }
];

const graphicsPath = path.join(root, "assets", "physical-security-graphics.js");
const graphics = fs.existsSync(graphicsPath) ? fs.readFileSync(graphicsPath, "utf8") : "";

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function rendererRegistered(renderer) {
  if (!renderer) return true;
  return graphics.includes('registerRenderer("' + renderer + '"') ||
    graphics.includes("registerRenderer('" + renderer + "'");
}

function rendererSvgBlock(renderer) {
  if (!renderer) return "";

  const marker = 'data-report-renderer="' + renderer + '"';
  const pos = graphics.indexOf(marker);
  if (pos < 0) return "";

  const start = Math.max(0, graphics.lastIndexOf("<svg", pos));
  const end = graphics.indexOf("</svg>", pos);

  if (start < 0 || end < 0) return "";
  return graphics.slice(start, end + 6);
}

function hasAll(source, signals) {
  return !Array.isArray(signals) || !signals.length || signals.every((signal) => source.includes(signal));
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
  const svgBlock = rendererSvgBlock(tool.renderer);

  const watch = [];
  const fail = [];

  if (tool.mode === "protected") {
    rows.push({
      slug: tool.slug,
      role: tool.role,
      mode: tool.mode,
      class: "SKIP",
      renderer: "-",
      exportSvg: "-",
      visualOwner: "-",
      suppressLegacy: "-",
      exportHook: "-",
      notes: "protected/gold-standard"
    });
    continue;
  }

  if (!html) fail.push("missing index.html");
  if (!script) fail.push("missing script.js");

  const registered = tool.renderer ? rendererRegistered(tool.renderer) : false;
  const referenced = tool.renderer ? combined.includes(tool.renderer) : false;
  const rendererStatus = tool.renderer ? (registered || referenced ? "present" : "missing") : "-";

  const exportSvg =
    svgBlock.includes("data-export-svg") ||
    combined.includes("data-export-svg") ||
    combined.includes("data-export-section");

  const visualOwner =
    svgBlock.includes("data-report-visual-owner") ||
    combined.includes("data-report-visual-owner") ||
    combined.includes("data-report-renderer");

  const suppressLegacy =
    svgBlock.includes("data-suppress-legacy-chart-export") ||
    combined.includes("data-suppress-legacy-chart-export") ||
    combined.includes("suppressLegacyChartExport");

  const exportHook = hasAll(combined, tool.exportSignals || [])
    ? "present"
    : tool.exportSignals && tool.exportSignals.length
      ? "missing"
      : "-";

  if ((tool.mode === "required" || tool.mode === "renderer-required") && tool.renderer && !registered && !referenced) {
    watch.push("renderer missing: " + tool.renderer);
  }

  if (tool.mode === "required" && exportHook === "missing") {
    watch.push("export visual hook missing");
  }

  if ((tool.mode === "required" || tool.mode === "renderer-required") && !exportSvg) {
    watch.push("export SVG/section signal missing");
  }

  if ((tool.mode === "required" || tool.mode === "renderer-required") && !visualOwner) {
    watch.push("report visual owner/renderer signal missing");
  }

  if ((tool.mode === "required" || tool.mode === "renderer-required") && !suppressLegacy) {
    watch.push("legacy chart suppression signal missing");
  }

  rows.push({
    slug: tool.slug,
    role: tool.role,
    mode: tool.mode,
    class: classify(watch, fail),
    renderer: rendererStatus,
    exportSvg: exportSvg ? "present" : "-",
    visualOwner: visualOwner ? "present" : "-",
    suppressLegacy: suppressLegacy ? "present" : "-",
    exportHook,
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

console.log("\nPhysical Security Export Visual Audit V1");
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
