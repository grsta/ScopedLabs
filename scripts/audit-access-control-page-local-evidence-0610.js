#!/usr/bin/env node

/*
  ScopedLabs Access Control Page-Local Evidence Audit - 0610

  Audit only. No writes.

  Purpose:
  - Separate generic shared-style leftovers from page-specific style obligations.
  - Identify local status/chip functions that may already be covered by shared polish.
  - Identify export adapters that should be kept until shared routing replaces them safely.
  - Identify export config proof gaps and print-mode verification candidates.
*/

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const SUMMARY_ONLY = process.argv.includes("--summary-only");
const JSON_OUT = process.argv.includes("--json");

const SPECIAL_PATH_TOOLS = new Set(["scope-planner"]);
const sharedPolishAsset = "access-control-tool-polish.js";

const GENERIC_STYLE_PATTERNS = [
  /\.results-grid\b/,
  /\.result-row\b/,
  /\.result-label\b/,
  /\.result-value\b/,
  /\.mini-note\b/,
  /\.export-status\b/,
  /\.export-grid\b/,
  /\.export-grid\s+\.field/,
];

const SHARED_STYLE_COVERAGE_PATTERNS = [
  /\.results-grid\b/,
  /\.result-row\b/,
  /\.result-label\b/,
  /\.result-value\b/,
  /\.mini-note\b/,
  /\.export-status\b/,
];

const PAGE_SPECIFIC_STYLE_HINTS = [
  /reader-result/i,
  /reader-type/i,
  /verification/i,
  /decision/i,
  /fail-safe/i,
  /fail-secure/i,
  /sequence/i,
  /matrix/i,
  /schedule/i,
  /access-level/i,
  /credential/i,
  /anti-passback/i,
  /elevator/i,
  /lock-power/i,
  /panel/i,
  /special-locking/i,
  /cad/i,
  /hero/i,
  /trace/i,
  /flow/i,
  /diagram/i,
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function listToolDirs() {
  if (!exists(categoryRoot)) {
    console.error("FAIL missing tools/access-control");
    process.exit(1);
  }

  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort((a, b) => a.localeCompare(b));
}

function scriptSrcs(html) {
  const srcs = [];
  const regex = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) srcs.push(match[1]);
  return srcs;
}

function srcAssetName(src) {
  const clean = String(src || "").split("?")[0].split("#")[0].replace(/\\/g, "/");
  return clean.slice(clean.lastIndexOf("/") + 1);
}

function hasLoaded(srcs, asset) {
  return srcs.some((src) => srcAssetName(src) === asset);
}

function cssBlocks(html) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = regex.exec(html))) blocks.push(match[1]);
  return blocks;
}

function stripCssComments(css) {
  return String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractSelectors(css) {
  const cleaned = stripCssComments(css)
    .replace(/@media[^{]+\{/g, "")
    .replace(/@supports[^{]+\{/g, "");

  const selectors = [];
  const regex = /([^{}]+)\{/g;
  let match;

  while ((match = regex.exec(cleaned))) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    if (!selector || selector.startsWith("@") || selector.includes(";")) continue;
    selectors.push(selector);
  }

  return selectors;
}

function countMatches(text, patterns) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function findFunctionNames(script, regex) {
  const names = new Set();
  let match;
  while ((match = regex.exec(script))) names.add(match[1]);
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function classifyStyle(html, script, sharedPolishLoaded) {
  const blocks = cssBlocks(html);
  const blockText = blocks.join("\n");
  const selectors = blocks.flatMap(extractSelectors);
  const genericHits = countMatches(blockText, GENERIC_STYLE_PATTERNS);
  const sharedCoverageHits = countMatches(blockText, SHARED_STYLE_COVERAGE_PATTERNS);
  const pageSpecificSelectors = selectors.filter((selector) =>
    PAGE_SPECIFIC_STYLE_HINTS.some((pattern) => pattern.test(selector))
  );

  const styleInjectorFunctions = findFunctionNames(
    script,
    /function\s+([A-Za-z0-9_]*(?:ensure|inject|install|apply)[A-Za-z0-9_]*Styles[A-Za-z0-9_]*)\s*\(/g
  );

  const createsStyleElement = /document\.createElement\s*\(\s*["']style["']\s*\)/.test(script)
    || /style\.textContent\s*=/.test(script)
    || /appendChild\s*\(\s*style\s*\)/.test(script);

  const buckets = [];

  if (blocks.length) buckets.push("STYLE_INLINE_BLOCK_PRESENT");
  if (genericHits >= 5) buckets.push("STYLE_GENERIC_SHARED_CANDIDATE");
  if (sharedPolishLoaded && sharedCoverageHits >= 5) buckets.push("STYLE_SHARED_POLISH_COVERAGE_PROBABLE");
  if (pageSpecificSelectors.length) buckets.push("STYLE_PAGE_SPECIFIC_KEEP_REVIEW");
  if (createsStyleElement || styleInjectorFunctions.length) buckets.push("STYLE_JS_INJECTION_PRESENT");
  if (createsStyleElement && pageSpecificSelectors.length) buckets.push("STYLE_JS_OR_PAGE_SPECIFIC_KEEP_REVIEW");
  if (!blocks.length && !createsStyleElement) buckets.push("STYLE_NONE");

  return {
    buckets,
    blockCount: blocks.length,
    blockBytes: blockText.length,
    selectorCount: selectors.length,
    genericHits,
    sharedCoverageHits,
    pageSpecificSelectorCount: pageSpecificSelectors.length,
    pageSpecificSelectorSample: pageSpecificSelectors.slice(0, 8),
    styleInjectorFunctions,
    createsStyleElement,
  };
}

function classifyStatus(script, sharedPolishLoaded) {
  const statusFunctions = findFunctionNames(
    script,
    /function\s+([A-Za-z0-9_]*(?:status|Status|chip|Chip|pill|Pill|badge|Badge)[A-Za-z0-9_]*)\s*\(/g
  );

  const statusMarkupPatterns = [
    /statusChipHtml/,
    /status-chip/,
    /status_pill/,
    /status-pill/,
    /className\s*=\s*["'][^"']*(?:pill|badge|status)[^"']*["']/i,
    /class=["'][^"']*(?:pill|badge|status-chip)[^"']*["']/i,
  ];

  const hasStatusMarkup = statusMarkupPatterns.some((pattern) => pattern.test(script));
  const buckets = [];

  if (statusFunctions.length || hasStatusMarkup) buckets.push("STATUS_LOCAL_RENDERING_PRESENT");
  if (sharedPolishLoaded && (statusFunctions.length || hasStatusMarkup)) buckets.push("STATUS_SHARED_POLISH_COVERAGE_PROBABLE");
  if (statusFunctions.some((name) => /setExportStatus/i.test(name))) buckets.push("STATUS_EXPORT_CONTROL_KEEP");
  if (!statusFunctions.length && !hasStatusMarkup) buckets.push("STATUS_NO_LOCAL_CHIP_SIGNAL");

  return {
    buckets,
    statusFunctions,
    hasStatusMarkup,
  };
}

function classifyExport(combined, script) {
  const exportConfig = /ScopedLabsExportConfig/.test(combined);
  const customPayloadProof = /customPayloadBuilder/.test(combined)
    || /getSharedExportPayload/.test(script)
    || /getExportPayload/.test(script)
    || /getSpecialLockingExportPayload/.test(script)
    || /buildFailSafeExportPayload/.test(script)
    || /build[A-Za-z0-9_]*ExportPayload/.test(script)
    || /build[A-Za-z0-9_]*ExportSections/.test(script);

  const outputShellBinding = /attachOutputShellExport/.test(script)
    || /ensureExportVisualBinding/.test(script)
    || /ScopedLabsAccessControlOutputShell/.test(script);

  const localRouteAdapter = /openReportWindow\s*\(\s*payload\s*\)/.test(script)
    || /stopImmediatePropagation\s*\(/.test(script)
    || /bind[A-Za-z0-9_]*RouteExportOverride/.test(script)
    || /open[A-Za-z0-9_]*LocalExportReport/.test(script)
    || /routeExport/i.test(script);

  const popupWindowBuilder = /window\.open\s*\(/.test(script) || /document\.write\s*\(/.test(script);
  const printLowInk = /printLowInkChart\s*:\s*true/.test(combined);
  const exportModeTrue = /exportMode\s*:\s*true/.test(combined);
  const darkPreviewWrapper = /preview|popup|dark|report-window|sl-export-popup/i.test(script);

  const buckets = [];

  if (exportConfig) buckets.push("EXPORT_CONFIG_PRESENT");
  if (customPayloadProof) buckets.push("EXPORT_PAYLOAD_PROOF_PRESENT");
  if (exportConfig && !customPayloadProof) buckets.push("EXPORT_PAYLOAD_PROOF_GAP");
  if (outputShellBinding) buckets.push("EXPORT_OUTPUT_SHELL_BINDING_PRESENT");
  if (localRouteAdapter) buckets.push("EXPORT_ROUTE_ADAPTER_KEEP_REVIEW");
  if (popupWindowBuilder) buckets.push("EXPORT_POPUP_WINDOW_BUILDER_PRESENT");
  if (printLowInk) buckets.push("PRINT_LOW_INK_PROOF_PRESENT");
  if (exportModeTrue) buckets.push("PRINT_MODE_VERIFY_EXPORTMODE_TRUE");
  if (exportModeTrue && printLowInk) buckets.push("PRINT_MODE_LOW_INK_PAIR_PRESENT");
  if (exportModeTrue && !printLowInk) buckets.push("PRINT_MODE_EXPORTMODE_WITHOUT_LOW_INK_REVIEW");
  if (darkPreviewWrapper) buckets.push("EXPORT_DARK_PREVIEW_SIGNAL_PRESENT");

  return {
    buckets,
    exportConfig,
    customPayloadProof,
    outputShellBinding,
    localRouteAdapter,
    popupWindowBuilder,
    printLowInk,
    exportModeTrue,
    darkPreviewWrapper,
  };
}

function orderIndex(srcs, token) {
  return srcs.findIndex((src) => src.includes(token));
}

function classifyScriptOrder(srcs, slug) {
  const indexes = {
    toolShell: orderIndex(srcs, "scopedlabs-tool-shell.js"),
    planningVisuals: orderIndex(srcs, "access-control-planning-visuals.js"),
    outputShell: orderIndex(srcs, "access-control-output-shell.js"),
    toolPolish: orderIndex(srcs, "access-control-tool-polish.js"),
    toolScript: srcs.findIndex((src) => srcAssetName(src) === "script.js" || src.includes("/tools/access-control/" + slug + "/script.js")),
  };

  const buckets = [];

  if (indexes.toolScript >= 0 && indexes.toolPolish >= 0 && indexes.toolPolish > indexes.toolScript) {
    buckets.push("SCRIPT_ORDER_POLISH_AFTER_TOOL_OBSERVER_DEPENDENT");
  }

  if (indexes.planningVisuals >= 0 && indexes.toolScript >= 0 && indexes.planningVisuals < indexes.toolScript) {
    buckets.push("SCRIPT_ORDER_VISUAL_FACTORY_BEFORE_TOOL");
  }

  if (indexes.outputShell >= 0 && indexes.toolScript >= 0 && indexes.outputShell < indexes.toolScript) {
    buckets.push("SCRIPT_ORDER_OUTPUT_SHELL_BEFORE_TOOL");
  }

  if (!buckets.length) buckets.push("SCRIPT_ORDER_NO_SIGNAL");

  return { indexes, buckets };
}

function classifyTool(slug) {
  const htmlPath = path.join(categoryRoot, slug, "index.html");
  const scriptPath = path.join(categoryRoot, slug, "script.js");
  const html = read(htmlPath);
  const script = read(scriptPath);
  const combined = html + "\n" + script;
  const srcs = scriptSrcs(html);
  const sharedPolishLoaded = hasLoaded(srcs, sharedPolishAsset);

  const style = classifyStyle(html, script, sharedPolishLoaded);
  const status = classifyStatus(script, sharedPolishLoaded);
  const exportInfo = classifyExport(combined, script);
  const scriptOrder = classifyScriptOrder(srcs, slug);

  const buckets = [
    ...(SPECIAL_PATH_TOOLS.has(slug) ? ["SPECIAL_PATH_SKIP"] : []),
    ...style.buckets,
    ...status.buckets,
    ...exportInfo.buckets,
    ...scriptOrder.buckets,
  ];

  const recommendedFirstMove = (() => {
    if (SPECIAL_PATH_TOOLS.has(slug)) return "KEEP_SPECIAL_PATH_SEPARATE";
    if (style.buckets.includes("STYLE_PAGE_SPECIFIC_KEEP_REVIEW") || style.buckets.includes("STYLE_JS_INJECTION_PRESENT")) {
      return "INSPECT_PAGE_SPECIFIC_STYLE_BEFORE_REMOVAL";
    }
    if (style.buckets.includes("STYLE_GENERIC_SHARED_CANDIDATE") && style.buckets.includes("STYLE_SHARED_POLISH_COVERAGE_PROBABLE")) {
      return "STYLE_GENERIC_CLEANUP_CANDIDATE";
    }
    if (status.buckets.includes("STATUS_LOCAL_RENDERING_PRESENT") && status.buckets.includes("STATUS_SHARED_POLISH_COVERAGE_PROBABLE")) {
      return "STATUS_CHIP_SHARED_POLISH_REVIEW";
    }
    if (exportInfo.buckets.includes("EXPORT_PAYLOAD_PROOF_GAP")) return "EXPORT_PAYLOAD_PROOF_REVIEW";
    return "KEEP_AS_IS_FOR_NOW";
  })();

  return {
    slug,
    htmlPath: rel(htmlPath),
    scriptPath: rel(scriptPath),
    sharedPolishLoaded,
    recommendedFirstMove,
    buckets: Array.from(new Set(buckets)),
    style,
    status,
    export: exportInfo,
    scriptOrder,
  };
}

function countBucket(results, bucket) {
  return results.filter((result) => result.buckets.includes(bucket)).length;
}

function printTool(result) {
  const level = result.buckets.includes("SPECIAL_PATH_SKIP") ? "SKIP" : "INFO";

  console.log(level.padEnd(5) + " " + result.slug + " — " + result.recommendedFirstMove);
  console.log("      buckets: " + result.buckets.join(", "));

  console.log(
    "      style: " +
    result.style.blockCount + " block(s), " +
    result.style.blockBytes + " bytes, " +
    result.style.selectorCount + " selector(s), " +
    result.style.pageSpecificSelectorCount + " page-specific selector hint(s)"
  );

  if (result.style.styleInjectorFunctions.length) {
    console.log("      style injectors: " + result.style.styleInjectorFunctions.join(", "));
  }

  if (result.style.pageSpecificSelectorSample.length) {
    console.log("      page-specific selector sample: " + result.style.pageSpecificSelectorSample.join(" | "));
  }

  if (result.status.statusFunctions.length) {
    console.log("      status functions: " + result.status.statusFunctions.join(", "));
  }

  console.log(
    "      export: " + [
      result.export.exportConfig ? "config" : "no config",
      result.export.customPayloadProof ? "payload proof" : "no payload proof",
      result.export.outputShellBinding ? "output shell binding" : "no output shell binding",
      result.export.localRouteAdapter ? "route adapter" : "no route adapter",
      result.export.printLowInk ? "printLowInk" : "no printLowInk",
      result.export.exportModeTrue ? "exportMode:true" : "no exportMode:true",
    ].join(" | ")
  );
}

function main() {
  const tools = listToolDirs();
  const results = tools.map(classifyTool);

  if (JSON_OUT) {
    console.log(JSON.stringify({ tools: results }, null, 2));
    return;
  }

  console.log("Access Control page-local evidence audit - 0610");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  const summaryRows = [
    ["SPECIAL_PATH_SKIP", countBucket(results, "SPECIAL_PATH_SKIP")],
    ["STYLE_GENERIC_SHARED_CANDIDATE", countBucket(results, "STYLE_GENERIC_SHARED_CANDIDATE")],
    ["STYLE_SHARED_POLISH_COVERAGE_PROBABLE", countBucket(results, "STYLE_SHARED_POLISH_COVERAGE_PROBABLE")],
    ["STYLE_PAGE_SPECIFIC_KEEP_REVIEW", countBucket(results, "STYLE_PAGE_SPECIFIC_KEEP_REVIEW")],
    ["STYLE_JS_INJECTION_PRESENT", countBucket(results, "STYLE_JS_INJECTION_PRESENT")],
    ["STATUS_LOCAL_RENDERING_PRESENT", countBucket(results, "STATUS_LOCAL_RENDERING_PRESENT")],
    ["STATUS_SHARED_POLISH_COVERAGE_PROBABLE", countBucket(results, "STATUS_SHARED_POLISH_COVERAGE_PROBABLE")],
    ["EXPORT_ROUTE_ADAPTER_KEEP_REVIEW", countBucket(results, "EXPORT_ROUTE_ADAPTER_KEEP_REVIEW")],
    ["EXPORT_PAYLOAD_PROOF_GAP", countBucket(results, "EXPORT_PAYLOAD_PROOF_GAP")],
    ["PRINT_MODE_VERIFY_EXPORTMODE_TRUE", countBucket(results, "PRINT_MODE_VERIFY_EXPORTMODE_TRUE")],
    ["SCRIPT_ORDER_POLISH_AFTER_TOOL_OBSERVER_DEPENDENT", countBucket(results, "SCRIPT_ORDER_POLISH_AFTER_TOOL_OBSERVER_DEPENDENT")],
  ];

  console.log("Evidence bucket summary");
  for (const [label, count] of summaryRows) {
    console.log(String(count).padStart(2, " ") + "  " + label);
  }

  const moves = new Map();
  for (const result of results) {
    moves.set(result.recommendedFirstMove, (moves.get(result.recommendedFirstMove) || 0) + 1);
  }

  console.log("");
  console.log("Recommended first-move summary");
  Array.from(moves.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([move, count]) => console.log(String(count).padStart(2, " ") + "  " + move));

  if (!SUMMARY_ONLY) {
    console.log("");
    console.log("Tool evidence map");
    for (const result of results) {
      printTool(result);
    }
  }

  const skipCount = results.filter((result) => result.buckets.includes("SPECIAL_PATH_SKIP")).length;
  console.log("");
  console.log("Summary: " + (results.length - skipCount) + " INFO / " + skipCount + " SKIP / 0 FAIL");
}

main();