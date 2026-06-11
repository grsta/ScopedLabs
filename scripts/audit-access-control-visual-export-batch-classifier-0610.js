const fs = require("fs");
const path = require("path");

const root = process.cwd();

const TOOLS = [
  "reader-type-selector",
  "lock-power-budget",
  "fail-safe-fail-secure",
  "elevator-reader-count",
  "anti-passback-zones",
  "special-locking-scope"
];

function rel(...parts) {
  return path.join(...parts).replaceAll("\\", "/");
}

function file(...parts) {
  return path.join(root, ...parts);
}

function exists(...parts) {
  return fs.existsSync(file(...parts));
}

function read(...parts) {
  return fs.readFileSync(file(...parts), "utf8");
}

function has(text, token) {
  return String(text || "").includes(token);
}

function bool(value) {
  return value ? "YES" : "NO";
}

function classify(tool) {
  const dir = file("tools", "access-control", tool);
  const indexRel = rel("tools", "access-control", tool, "index.html");
  const scriptRel = rel("tools", "access-control", tool, "script.js");

  const indexExists = exists("tools", "access-control", tool, "index.html");
  const scriptExists = exists("tools", "access-control", tool, "script.js");

  const html = indexExists ? read("tools", "access-control", tool, "index.html") : "";
  const script = scriptExists ? read("tools", "access-control", tool, "script.js") : "";

  const loadsSharedVisuals = has(html, "/assets/access-control-planning-visuals.js");
  const usesSharedVisuals = has(script, "ScopedLabsAccessControlPlanningVisuals");
  const loadsOutputShell = has(html, "/assets/access-control-output-shell.js");
  const loadsAssistantExport = has(html, "/assets/scopedlabs-assistant-export.js");
  const loadsLegacyExport = has(html, "/assets/export.js");
  const hasExportConfig = has(html, "window.ScopedLabsExportConfig");
  const printLowInkChart = has(html, '"printLowInkChart": true') || has(html, "printLowInkChart: true");

  const hasExportButtons = has(html, 'id="exportReport"') && has(html, 'id="saveSnapshot"');
  const registersOutputShell = has(script, ".register(") && has(script, "getChartImage");
  const hasExportChartGetter = has(script, "getExportChartImage");
  const hasChartImage = has(script, "chartImage") || has(script, "getChartImage");
  const hasChartSvg = has(script, "chartSvg");
  const hasChartBlock = has(script, "chartBlock") || has(script, "Planning Visual");
  const hasLocalReportWindow = has(script, "function openReportWindow") || has(script, "buildReportHTML");
  const hasLocalReportOverride =
    has(script, "stopImmediatePropagation") &&
    has(script, "openReportWindow") &&
    has(script, "addEventListener") &&
    has(script, "true");

  const localSvgBuilder =
    /function\s+build[A-Za-z0-9_]*Svg/.test(script) ||
    /const\s+[A-Za-z0-9_]*Svg\s*=/.test(script) ||
    has(script, "<svg") ||
    has(script, "svgDataUri");

  const sharedRendererNames = [
    "renderReaderType",
    "renderLockPowerBudget",
    "renderFailSafe",
    "renderElevator",
    "renderAntiPassback",
    "renderSpecialLocking",
    "buildReaderType",
    "buildLockPowerBudget",
    "buildFailSafe",
    "buildElevator",
    "buildAntiPassback",
    "buildSpecialLocking"
  ];

  const likelySharedRenderer = sharedRendererNames.some((name) => has(script, name) || has(html, name));

  const hasTablesOrSchedules =
    has(script, "<table") ||
    has(script, "schedule") ||
    has(script, "matrix") ||
    has(script, "summary") ||
    has(script, "rows.map") ||
    has(html, "<table");

  const hasPrintSvgCss =
    has(script, ".chart-wrap svg") ||
    has(script, "chart-wrap img,.chart-wrap svg") ||
    has(script, ".report-visual svg") ||
    has(html, ".chart-wrap svg");

  let pattern = "NEEDS_INSPECTION";
  let reason = "No confident pattern detected.";

  if (loadsSharedVisuals && usesSharedVisuals && (registersOutputShell || hasChartImage)) {
    pattern = "A_SHARED_RENDERER_PREVIEW_PRINT_SPLIT";
    reason = "Already uses shared visual path; likely needs preview/export/print mode split and report-safe CSS.";
  }

  if (localSvgBuilder && !usesSharedVisuals) {
    pattern = "B_LOCAL_SVG_NEEDS_SHARED_BRIDGE";
    reason = "Has local SVG/report visual behavior but does not use the shared Access Control visual library.";
  }

  if (!localSvgBuilder && !usesSharedVisuals && hasTablesOrSchedules) {
    pattern = "C_TABLE_OR_SCHEDULE_ONLY_EXPORT_RULE";
    reason = "Looks table/schedule driven; may not need a chart, but export should explicitly support table-only output.";
  }

  if (loadsAssistantExport && loadsOutputShell && hasLocalReportWindow && !hasLocalReportOverride) {
    pattern = "D_SHARED_EXPORT_ROUTE_CONFLICT_RISK";
    reason = "Has local report logic plus shared export route; may need Access-Level-style route proof or override.";
  }

  if (loadsSharedVisuals && !usesSharedVisuals && localSvgBuilder) {
    pattern = "E_SHARED_MODULE_LOADED_BUT_NOT_USED";
    reason = "Loads shared visual module, but local script appears to keep its own SVG path.";
  }

  const blockers = [];
  if (!indexExists) blockers.push("missing index.html");
  if (!scriptExists) blockers.push("missing script.js");
  if (!hasExportButtons) blockers.push("missing expected export buttons");
  if (!hasExportConfig) blockers.push("missing ScopedLabsExportConfig");
  if (!printLowInkChart) blockers.push("missing printLowInkChart");
  if ((hasChartImage || localSvgBuilder || usesSharedVisuals) && !hasPrintSvgCss) blockers.push("missing print svg/css proof");
  if ((loadsAssistantExport && loadsOutputShell && hasLocalReportWindow) && !hasLocalReportOverride) blockers.push("route conflict unproven");

  return {
    tool,
    pattern,
    reason,
    blockers,
    facts: {
      loadsSharedVisuals,
      usesSharedVisuals,
      likelySharedRenderer,
      loadsOutputShell,
      loadsAssistantExport,
      loadsLegacyExport,
      hasExportConfig,
      printLowInkChart,
      hasExportButtons,
      registersOutputShell,
      hasExportChartGetter,
      hasChartImage,
      hasChartSvg,
      hasChartBlock,
      hasLocalReportWindow,
      hasLocalReportOverride,
      localSvgBuilder,
      hasTablesOrSchedules,
      hasPrintSvgCss
    },
    files: { indexRel, scriptRel }
  };
}

const results = TOOLS.map(classify);
const groups = new Map();

for (const result of results) {
  if (!groups.has(result.pattern)) groups.set(result.pattern, []);
  groups.get(result.pattern).push(result);
}

console.log("\nACCESS CONTROL VISUAL / EXPORT BATCH CLASSIFIER 0610");
console.log("====================================================");

for (const result of results) {
  console.log(`\n[${result.pattern}] ${result.tool}`);
  console.log(`  reason: ${result.reason}`);

  if (result.blockers.length) {
    console.log(`  blockers: ${result.blockers.join("; ")}`);
  } else {
    console.log("  blockers: none");
  }

  console.log("  facts:");
  for (const [key, value] of Object.entries(result.facts)) {
    console.log(`    ${key}: ${bool(value)}`);
  }
}

console.log("\nGROUPED NEXT PATCH LANES");
console.log("========================");
for (const [pattern, items] of groups.entries()) {
  console.log(`\n${pattern}`);
  for (const item of items) {
    console.log(`  - ${item.tool}`);
  }
}

const safeToBatch = results.filter((item) =>
  item.pattern === "A_SHARED_RENDERER_PREVIEW_PRINT_SPLIT" ||
  item.pattern === "E_SHARED_MODULE_LOADED_BUT_NOT_USED"
);

const routeConflict = results.filter((item) =>
  item.pattern === "D_SHARED_EXPORT_ROUTE_CONFLICT_RISK" ||
  item.blockers.includes("route conflict unproven")
);

console.log("\nRECOMMENDATION");
console.log("==============");
if (safeToBatch.length) {
  console.log("Batch candidate tools:");
  for (const item of safeToBatch) console.log(`  - ${item.tool}`);
} else {
  console.log("No obvious shared-renderer batch candidates yet.");
}

if (routeConflict.length) {
  console.log("\nRoute-conflict proof needed before patch:");
  for (const item of routeConflict) console.log(`  - ${item.tool}`);
}

const watch = results.filter((item) => item.blockers.length).length;
console.log(`\nSummary: ${results.length - watch} LOW-FRICTION / ${watch} NEEDS-PROOF / ${results.length} TOTAL`);