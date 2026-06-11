const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const assetsRoot = path.join(root, "assets");

const STRICT = process.argv.includes("--strict");
const SUMMARY_ONLY = process.argv.includes("--summary-only");

const REQUIRED_SHARED_ASSETS = [
  "export.js",
  "scopedlabs-tool-shell.js",
  "scopedlabs-assistant-export.js",
  "access-control-output-shell.js",
  "access-control-planning-visuals.js",
  "access-control-tool-polish.js",
  "scopedlabs-report-metadata.js",
  "scopedlabs-local-assistant.js",
  "access-control-scope-state.js",
  "help.js"
];

const TOOL_ALLOW = new Map([
  ["scope-planner", {
    visualOptional: true,
    notes: ["Scope Planner may use a dedicated print/copy summary path instead of calculator output-shell visual flow."]
  }]
]);

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

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

function listToolDirs() {
  if (!exists(categoryRoot)) return [];
  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => exists(path.join(categoryRoot, name, "index.html")))
    .sort((a, b) => a.localeCompare(b));
}

function scriptSrcs(html) {
  const results = [];
  const regex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) results.push(match[1]);
  return results;
}

function cssBlocks(html) {
  const results = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = regex.exec(html))) results.push(match[1]);
  return results;
}

function hasLoaded(srcs, fileName) {
  return srcs.some((src) => src.includes("/assets/" + fileName) || src.includes("assets/" + fileName) || src.includes(fileName));
}

function assetVersion(srcs, fileName) {
  const hits = srcs.filter((src) => src.includes(fileName));
  return hits.map((src) => {
    const match = src.match(/[?&]v=([^"&]+)/);
    return match ? match[1] : "";
  }).filter(Boolean);
}

function orderIndex(srcs, token) {
  return srcs.findIndex((src) => src.includes(token));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function classifyTool(slug, html, script) {
  const allow = TOOL_ALLOW.get(slug) || {};
  const srcs = scriptSrcs(html);
  const styles = cssBlocks(html).join("\n");

  const loaded = Object.fromEntries(REQUIRED_SHARED_ASSETS.map((asset) => [asset, hasLoaded(srcs, asset)]));
  const versions = Object.fromEntries(REQUIRED_SHARED_ASSETS.map((asset) => [asset, unique(assetVersion(srcs, asset))]));

  const usesSharedVisuals = hasAny(script, [
    /ScopedLabsAccessControlPlanningVisuals/,
    /planningVisuals\s*\(/,
    /render[A-Za-z0-9]+Decision\s*\(/,
    /build[A-Za-z0-9]+Svg\s*\(/,
    /buildLockPowerBudgetSupplyRailSvg/,
    /buildAccessLevelSizingSvg/,
    /buildReaderTypeDecisionSvg/,
    /buildDoorCountSvg/,
    /buildDoorCableSvg/,
    /buildCredentialFormatSvg/,
    /buildFailSafeStateDiagramSvg/,
    /buildElevatorReaderSvg/,
    /buildAntiPassbackSvg/,
    /buildSpecialLockingSvg/
  ]);

  const outputShellUse = hasAny(script, [
    /ScopedLabsAccessControlOutputShell/,
    /outputShell\s*\(/,
    /\.register\s*\(\s*STEP/,
    /\.register\s*\(\s*["'][a-z0-9-]+["']/,
    /attachOutputShellExport/
  ]);

  const assistantExportUse = hasAny(script + html, [
    /ScopedLabsAssistantExport/,
    /scopedlabs-assistant-export/,
    /attachExportGetter/
  ]);

  const reportMetaUse = hasAny(script + html, [
    /ScopedLabsReportMetadata/,
    /reportMetadataMount/,
    /scopedlabs-report-metadata/
  ]);

  const exportConfig = /ScopedLabsExportConfig/.test(html + script);
  const customPayload = /customPayloadBuilder/.test(html + script) || /getPayload/.test(script);
  const printLowInk = /printLowInkChart\s*:\s*true/.test(html + script);
  const chartImage = /chartImage\s*:/.test(script) || /getChartImage/.test(script) || /getExportChartImage/.test(script);
  const openReportOverride = /openReportWindow\s*\(\s*payload\s*\)/.test(script) || /stopImmediatePropagation\s*\(/.test(script);
  const localExportOverride = openReportOverride || /routeConflictExportBound|LocalReportBound|local export override|bindRouteExportOverride|_bindRouteExportOverride/i.test(script);

  const localSvgFunctionNames = [];
  const svgFunctionRegex = /function\s+(build[A-Za-z0-9_]*Svg)\s*\(/g;
  let svgMatch;
  while ((svgMatch = svgFunctionRegex.exec(script))) localSvgFunctionNames.push(svgMatch[1]);

  const localSvgReturn = /<svg[\s\S]{0,2000}<\/svg>/.test(script) || /data:image\/svg\+xml/.test(script);
  const localSvgBuilder = localSvgFunctionNames.length > 0 || localSvgReturn;

  const localStyleInjection = /document\.createElement\s*\(\s*["']style["']\s*\)/.test(script) ||
    /style\.textContent\s*=/.test(script) ||
    /ensure[A-Za-z0-9_]*Styles\s*\(/.test(script) ||
    styles.length > 0;

  const localChipStyle = /statusChipHtml|status-chip|status_pill|status pill|\.pill|\.badge|pill-row/i.test(script + "\n" + styles);
  const helperPotential = /assistantProofShort|assistantProofWrap|assistantProofTextLines/.test(script);
  const rawDynamicSvgTextRisk = localSvgBuilder && /<text[\s\S]{0,240}\+\s*(escapeHtml|String|\w+\()/i.test(script) && !helperPotential;

  const broadExportModeTrue = /exportMode\s*:\s*true/.test(script);
  const hasResultTable = /<table|summary-table|data-reader-type-summary-table|extra-export-table/i.test(script + html);

  const issues = [];
  const warnings = [];
  const info = [];

  if (!loaded["scopedlabs-tool-shell.js"]) issues.push("missing scopedlabs-tool-shell.js");
  if (!loaded["access-control-tool-polish.js"]) warnings.push("missing shared access-control-tool-polish.js");
  if (!loaded["export.js"]) warnings.push("missing export.js");
  if (!loaded["scopedlabs-assistant-export.js"]) warnings.push("missing scopedlabs-assistant-export.js");
  if (!loaded["scopedlabs-report-metadata.js"]) warnings.push("missing report metadata plugin");
  if (!loaded["access-control-output-shell.js"] && !allow.visualOptional) warnings.push("missing access-control-output-shell.js");

  if (loaded["access-control-planning-visuals.js"] && !usesSharedVisuals && !allow.visualOptional) warnings.push("loads shared visual factory but no clear script usage");
  if (!loaded["access-control-planning-visuals.js"] && usesSharedVisuals) issues.push("uses shared visual factory but does not load asset");
  if (!loaded["access-control-planning-visuals.js"] && !usesSharedVisuals && !allow.visualOptional) warnings.push("no shared visual factory load/use detected");

  if (loaded["access-control-output-shell.js"] && !outputShellUse && !allow.visualOptional) warnings.push("loads output shell but no register/use detected");
  if (outputShellUse && !loaded["access-control-output-shell.js"]) issues.push("uses output shell but does not load asset");

  if (chartImage && !printLowInk && !allow.visualOptional) warnings.push("chart image/export visual path without printLowInkChart proof");
  if (exportConfig && !customPayload) warnings.push("export config present without custom payload proof");
  if (localExportOverride) info.push("local export route adapter detected");
  if (localSvgBuilder) warnings.push("local SVG builder detected: " + (localSvgFunctionNames.length ? localSvgFunctionNames.join(", ") : "inline SVG/data URI"));
  if (rawDynamicSvgTextRisk) warnings.push("local SVG dynamic text may overflow; no shared text wrap helper detected");
  if (localStyleInjection) warnings.push("page-local style injection or inline style block detected");
  if (localChipStyle) warnings.push("page-local chip/pill/status styling or markup detected");
  if (broadExportModeTrue) warnings.push("contains exportMode:true; verify popup dark mode is not being forced to print palette");

  const toolScriptIndex = orderIndex(srcs, "./script.js");
  const sharedVisualIndex = orderIndex(srcs, "access-control-planning-visuals.js");
  const outputShellIndex = orderIndex(srcs, "access-control-output-shell.js");
  const polishIndex = orderIndex(srcs, "access-control-tool-polish.js");

  if (toolScriptIndex >= 0 && sharedVisualIndex >= 0 && sharedVisualIndex > toolScriptIndex) issues.push("shared visual factory loads after tool script");
  if (toolScriptIndex >= 0 && outputShellIndex >= 0 && outputShellIndex > toolScriptIndex) issues.push("output shell loads after tool script");
  if (toolScriptIndex >= 0 && polishIndex >= 0 && polishIndex > toolScriptIndex) info.push("tool polish loads after tool script; verify observer normalizes generated output");

  Object.entries(versions).forEach(([asset, assetVersions]) => {
    if (assetVersions.length > 1) warnings.push("multiple cache-bust versions for " + asset + ": " + assetVersions.join(", "));
  });

  if (allow.notes) info.push(...allow.notes);

  let status = "SAFE_SHARED_FACTORY";
  if (allow.visualOptional) status = "SKIP_SPECIAL_PATH";
  if (localSvgBuilder || localStyleInjection || localChipStyle) status = "WATCH_FACTORY_DEBT";
  if (localSvgBuilder && usesSharedVisuals && loaded["access-control-planning-visuals.js"]) status = "WATCH_MIXED_SHARED_AND_LOCAL";
  if (localExportOverride && !localSvgBuilder && usesSharedVisuals) status = "SAFE_ADAPTER_ONLY";
  if (loaded["access-control-planning-visuals.js"] && !usesSharedVisuals && !allow.visualOptional) status = "WATCH_LOADED_NOT_USED";
  if (issues.length) status = "FAIL_CONTRACT";

  return {
    slug,
    status,
    loaded,
    versions,
    usesSharedVisuals,
    outputShellUse,
    assistantExportUse,
    reportMetaUse,
    exportConfig,
    customPayload,
    printLowInk,
    chartImage,
    localExportOverride,
    localSvgBuilder,
    localSvgFunctionNames,
    localStyleInjection,
    localChipStyle,
    hasResultTable,
    issues,
    warnings,
    info
  };
}

function extractFunctionBody(source, functionName) {
  const token = "function " + functionName + "(";
  const start = source.indexOf(token);
  if (start < 0) return "";

  const signatureStart = source.indexOf("(", start);
  if (signatureStart < 0) return "";

  let parenDepth = 0;
  let braceStart = -1;

  for (let i = signatureStart; i < source.length; i++) {
    const ch = source[i];

    if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === "{" && parenDepth === 0) {
      braceStart = i;
      break;
    }
  }

  if (braceStart < 0) return "";

  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }

    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) return source.slice(start, i + 1);
  }

  return source.slice(start);
}

function visualFactoryAudit(toolResults) {
  const visualPath = path.join(assetsRoot, "access-control-planning-visuals.js");
  const source = read(visualPath);
  if (!source) {
    return {
      exists: false,
      renderers: [],
      duplicateSvgIds: [],
      notes: ["Missing assets/access-control-planning-visuals.js"]
    };
  }

  const buildNames = unique(Array.from(source.matchAll(/function\s+(build[A-Za-z0-9_]*Svg)\s*\(/g)).map((m) => m[1]));
  const renderNames = unique(Array.from(source.matchAll(/function\s+(render[A-Za-z0-9_]*)\s*\(/g)).map((m) => m[1]));

  const buildToRenderWrappers = new Map();
  renderNames.forEach((renderName) => {
    const body = extractFunctionBody(source, renderName);
    buildNames.forEach((buildName) => {
      if (!body.includes(buildName)) return;
      if (!buildToRenderWrappers.has(buildName)) buildToRenderWrappers.set(buildName, []);
      buildToRenderWrappers.get(buildName).push(renderName);
    });
  });

  const exportRegionIndex = source.indexOf("window.ScopedLabsAccessControlPlanningVisuals");
  const exportRegion = exportRegionIndex >= 0 ? source.slice(exportRegionIndex) : "";

  const toolScripts = new Map();
  listToolDirs().forEach((slug) => {
    const scriptPath = path.join(categoryRoot, slug, "script.js");
    toolScripts.set(slug, read(scriptPath));
  });

  const renderers = buildNames.map((name) => {
    const body = extractFunctionBody(source, name);
    const renderWrappers = buildToRenderWrappers.get(name) || [];
    const exportedDirectly = exportRegion.includes(name);
    const exportedViaWrapper = renderWrappers.some((renderName) => exportRegion.includes(renderName));
    const exported = exportedDirectly || exportedViaWrapper;
    const usedBy = [];
    for (const [slug, script] of toolScripts.entries()) {
      if (script.includes(name) || renderWrappers.some((renderName) => script.includes(renderName))) usedBy.push(slug);
    }

    const usesWrap = /assistantProofShort|assistantProofWrap|assistantProofTextLines|short\s*\(/.test(body);
    const usesStatusHelpers = /statusBadge|statusTone|statusLabel/.test(body);
    const hasNote = /sl-vis-note/.test(body);
    const hasViewBox = /viewBox=/.test(body);
    const hasShell = /access-control-planning-visual-shell/.test(body);
    const exportModeAware = /exportMode|accessVisualPalette|data-export-palette|print-safe/.test(body);
    const rawDynamicText = /<text[\s\S]{0,260}\+\s*(escapeHtml|String|\w+\()/i.test(body);
    const rawDynamicRisk = rawDynamicText && !usesWrap;
    const repeatedScheduleRisk =
      /(Reader Type|Interface|Security basis|Verification Status|Credential Format)[\s\S]{0,900}(Reader Type|Interface|Security basis|Verification Status|Credential Format)/.test(body) &&
      /(decisionChip|tableRows|Schedule|summary-table)/i.test(body);

    const markerIds = Array.from(body.matchAll(/\bid=["']([^"']+)["']/g)).map((m) => m[1]);

    const warnings = [];
    const issues = [];
    if (!exported) issues.push("renderer not exported from ScopedLabsAccessControlPlanningVisuals");
    if (!usedBy.length) warnings.push("no Access Control tool script references this renderer directly");
    if (!hasShell) warnings.push("missing access-control-planning-visual-shell wrapper");
    if (!hasViewBox) warnings.push("missing SVG viewBox proof");
    if (!hasNote) warnings.push("missing .sl-vis-note explanatory note");
    if (!usesStatusHelpers) warnings.push("no shared status helper use detected");
    if (rawDynamicRisk) warnings.push("dynamic SVG text without shared wrap/short helper");
    if (repeatedScheduleRisk) warnings.push("possible schedule/detail duplication inside visual renderer");
    if (!exportModeAware) warnings.push("no exportMode / print-safe palette proof detected");

    let status = "SAFE_VISUAL_FACTORY";
    if (warnings.length) status = "WATCH_VISUAL_FACTORY";
    if (issues.length) status = "FAIL_VISUAL_FACTORY";

    return {
      name,
      status,
      exported,
      usedBy,
      usesWrap,
      usesStatusHelpers,
      hasNote,
      hasViewBox,
      hasShell,
      exportModeAware,
      markerIds,
      issues,
      warnings
    };
  });

  const allIds = [];
  renderers.forEach((renderer) => {
    renderer.markerIds.forEach((id) => allIds.push({ id, renderer: renderer.name }));
  });

  const duplicateSvgIds = [];
  const byId = new Map();
  allIds.forEach((item) => {
    if (!byId.has(item.id)) byId.set(item.id, []);
    byId.get(item.id).push(item.renderer);
  });
  byId.forEach((renderersForId, id) => {
    const uniqueRenderers = unique(renderersForId);
    if (uniqueRenderers.length > 1) duplicateSvgIds.push({ id, renderers: uniqueRenderers });
  });

  return {
    exists: true,
    path: rel(visualPath),
    buildCount: buildNames.length,
    renderCount: renderNames.length,
    renderNames,
    renderers,
    duplicateSvgIds
  };
}

function sharedAssetAudit() {
  return REQUIRED_SHARED_ASSETS.map((asset) => {
    const assetPath = path.join(assetsRoot, asset);
    const source = read(assetPath);
    return {
      asset,
      exists: !!source,
      path: rel(assetPath),
      version: (source.match(/const\s+VERSION\s*=\s*["']([^"']+)["']/) || [])[1] || "",
      bytes: source.length
    };
  });
}

function printToolResult(result) {
  const level =
    result.status.startsWith("FAIL") ? "FAIL" :
    result.status.startsWith("WATCH") ? "WATCH" :
    result.status.startsWith("SKIP") ? "SKIP" :
    "SAFE";

  console.log(`${level.padEnd(5)} ${result.slug} — ${result.status}`);

  if (SUMMARY_ONLY) return;

  const flags = [
    result.loaded["access-control-planning-visuals.js"] ? "loads visual factory" : "no visual factory load",
    result.usesSharedVisuals ? "uses shared visuals" : "no shared visual use",
    result.outputShellUse ? "uses output shell" : "no output shell use",
    result.printLowInk ? "printLowInk" : "no printLowInk",
    result.localSvgBuilder ? "local SVG" : "no local SVG",
    result.localExportOverride ? "local export adapter" : "no export adapter"
  ];

  console.log("      " + flags.join(" | "));

  result.issues.forEach((item) => console.log("      FAIL  " + item));
  result.warnings.forEach((item) => console.log("      WATCH " + item));
  result.info.forEach((item) => console.log("      note  " + item));
}

function main() {
  const tools = listToolDirs();

  console.log("Access Control factory debt audit v1a");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  const assets = sharedAssetAudit();
  const missingAssets = assets.filter((item) => !item.exists);

  console.log("Shared asset inventory");
  assets.forEach((item) => {
    const status = item.exists ? "SAFE " : "FAIL ";
    console.log(`${status} ${item.asset}${item.version ? " — " + item.version : ""}`);
  });
  console.log("");

  const toolResults = tools.map((slug) => {
    const htmlPath = path.join(categoryRoot, slug, "index.html");
    const scriptPath = path.join(categoryRoot, slug, "script.js");
    return classifyTool(slug, read(htmlPath), read(scriptPath));
  });

  console.log("Tool factory compliance");
  toolResults.forEach(printToolResult);
  console.log("");

  const visualAudit = visualFactoryAudit(toolResults);

  console.log("Visual factory quality");
  if (!visualAudit.exists) {
    console.log("FAIL  assets/access-control-planning-visuals.js missing");
  } else {
    console.log(`SAFE  ${visualAudit.path} — build renderers: ${visualAudit.buildCount}, render functions: ${visualAudit.renderCount}`);

    visualAudit.renderers.forEach((renderer) => {
      const level =
        renderer.status.startsWith("FAIL") ? "FAIL" :
        renderer.status.startsWith("WATCH") ? "WATCH" :
        "SAFE";
      console.log(`${level.padEnd(5)} ${renderer.name} — ${renderer.status}`);
      if (!SUMMARY_ONLY) {
        console.log("      used by: " + (renderer.usedBy.length ? renderer.usedBy.join(", ") : "(none detected)"));
        renderer.issues.forEach((item) => console.log("      FAIL  " + item));
        renderer.warnings.forEach((item) => console.log("      WATCH " + item));
      }
    });

    if (visualAudit.duplicateSvgIds.length) {
      console.log("");
      console.log("WATCH duplicate SVG IDs across shared renderers");
      visualAudit.duplicateSvgIds.forEach((item) => {
        console.log(`      ${item.id}: ${item.renderers.join(", ")}`);
      });
    }
  }

  console.log("");

  const counts = {
    toolSafe: toolResults.filter((item) => item.status.startsWith("SAFE")).length,
    toolWatch: toolResults.filter((item) => item.status.startsWith("WATCH")).length,
    toolSkip: toolResults.filter((item) => item.status.startsWith("SKIP")).length,
    toolFail: toolResults.filter((item) => item.status.startsWith("FAIL")).length,
    visualSafe: visualAudit.exists ? visualAudit.renderers.filter((item) => item.status.startsWith("SAFE")).length : 0,
    visualWatch: visualAudit.exists ? visualAudit.renderers.filter((item) => item.status.startsWith("WATCH")).length : 0,
    visualFail: visualAudit.exists ? visualAudit.renderers.filter((item) => item.status.startsWith("FAIL")).length : 1,
    missingAssets: missingAssets.length
  };

  console.log("Summary");
  console.log(`Tools: ${counts.toolSafe} SAFE / ${counts.toolWatch} WATCH / ${counts.toolSkip} SKIP / ${counts.toolFail} FAIL`);
  console.log(`Visual renderers: ${counts.visualSafe} SAFE / ${counts.visualWatch} WATCH / ${counts.visualFail} FAIL`);
  console.log(`Shared assets missing: ${counts.missingAssets}`);

  const shouldFail = counts.toolFail > 0 || counts.visualFail > 0 || counts.missingAssets > 0;
  if (STRICT && shouldFail) process.exit(1);
}

main();