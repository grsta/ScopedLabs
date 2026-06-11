const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");

const SUMMARY_ONLY = process.argv.includes("--summary-only");
const STRICT = process.argv.includes("--strict");

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
  "help.js",
];

const SPECIAL_PATH_TOOLS = new Set([
  "scope-planner",
]);

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
  if (!exists(categoryRoot)) return [];
  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => exists(path.join(categoryRoot, name, "index.html")))
    .sort((a, b) => a.localeCompare(b));
}

function scriptSrcs(html) {
  const results = [];
  const regex = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) results.push(match[1]);
  return results;
}

function cssBlocks(html) {
  const results = [];
  const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = regex.exec(html))) results.push(match[1]);
  return results;
}

function srcAssetName(src) {
  const clean = String(src || "").split("?")[0].split("#")[0].replace(/\\/g, "/");
  return clean.slice(clean.lastIndexOf("/") + 1);
}

function hasLoaded(srcs, fileName) {
  return srcs.some((src) => srcAssetName(src) === fileName);
}

function orderIndex(srcs, token) {
  return srcs.findIndex((src) => src.includes(token));
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function classifyTool(slug) {
  const htmlPath = path.join(categoryRoot, slug, "index.html");
  const scriptPath = path.join(categoryRoot, slug, "script.js");
  const html = read(htmlPath);
  const script = read(scriptPath);
  const srcs = scriptSrcs(html);
  const styles = cssBlocks(html).join("\n");
  const combined = html + "\n" + script;

  const loaded = Object.fromEntries(
    REQUIRED_SHARED_ASSETS.map((asset) => [asset, hasLoaded(srcs, asset)])
  );

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
    /buildSpecialLockingSvg/,
  ]);

  const outputShellUse = hasAny(script, [
    /ScopedLabsAccessControlOutputShell/,
    /outputShell\s*\(/,
    /\.register\s*\(\s*STEP/,
    /\.register\s*\(\s*["'][a-z0-9-]+["']/,
    /attachOutputShellExport/,
  ]);

  const exportConfig = /ScopedLabsExportConfig/.test(combined);
  const customPayload = /customPayloadBuilder/.test(combined) || /getPayload/.test(script);
  const printLowInk = /printLowInkChart\s*:\s*true/.test(combined);
  const exportModeTrue = /exportMode\s*:\s*true/.test(combined);

  const localExportAdapter = /openReportWindow\s*\(\s*payload\s*\)/.test(script)
    || /stopImmediatePropagation\s*\(/.test(script)
    || /routeConflictExportBound|LocalReportBound|local export override|bindRouteExportOverride|_bindRouteExportOverride/i.test(script);

  const localStyleInjection = /document\.createElement\s*\(\s*["']style["']\s*\)/.test(script)
    || /style\.textContent\s*=/.test(script)
    || /ensure[A-Za-z0-9_]*Styles\s*\(/.test(script)
    || styles.length > 0;

  const localChipStyle = /statusChipHtml|status-chip|status_pill|status pill|\.pill|\.badge|pill-row/i.test(script + "\n" + styles);

  const sharedVisualIndex = orderIndex(srcs, "access-control-planning-visuals.js");
  const outputShellIndex = orderIndex(srcs, "access-control-output-shell.js");
  const polishIndex = orderIndex(srcs, "access-control-tool-polish.js");

  const toolScriptIndex = srcs.findIndex((src) => {
    const name = srcAssetName(src);
    return name === "script.js" || src.includes("/tools/access-control/" + slug + "/script.js");
  });

  const warnings = [];
  const notes = [];
  const buckets = [];

  if (SPECIAL_PATH_TOOLS.has(slug)) {
    buckets.push("SPECIAL_PATH_SKIP");
  }

  if (localExportAdapter) {
    buckets.push("EXPORT_ROUTE_ADAPTER");
    notes.push("local export route adapter detected");
  }

  if (exportConfig && !customPayload) {
    buckets.push("EXPORT_CONFIG_PROOF_GAP");
    warnings.push("export config present without custom payload proof");
  }

  if (localStyleInjection) {
    buckets.push("STYLE_CLEANUP_CANDIDATE");
    warnings.push("page-local style injection or inline style block detected");
  }

  if (localChipStyle) {
    buckets.push("STATUS_CHIP_CLEANUP_CANDIDATE");
    warnings.push("page-local chip/pill/status styling or markup detected");
  }

  if (exportModeTrue) {
    buckets.push("PRINT_MODE_VERIFY");
    warnings.push("contains exportMode:true; verify popup dark mode is not being forced to print palette");
  }

  if (toolScriptIndex >= 0 && polishIndex >= 0 && polishIndex > toolScriptIndex) {
    buckets.push("SHARED_POLISH_DEPENDENT");
    notes.push("tool polish loads after tool script; verify observer normalizes generated output");
  }

  if (usesSharedVisuals && outputShellUse && localExportAdapter) {
    buckets.push("ACCEPTED_ADAPTER");
  }

  if (!buckets.length) {
    buckets.push("NO_SOFT_WARNINGS");
  }

  const missingSharedAssets = REQUIRED_SHARED_ASSETS.filter((asset) => !loaded[asset]);

  return {
    slug,
    htmlPath: rel(htmlPath),
    scriptPath: rel(scriptPath),
    buckets: Array.from(new Set(buckets)),
    warnings,
    notes,
    missingSharedAssets,
    usesSharedVisuals,
    outputShellUse,
    printLowInk,
    localExportAdapter,
    exportConfig,
    customPayload,
    localStyleInjection,
    localChipStyle,
    exportModeTrue,
  };
}

function main() {
  const tools = listToolDirs();
  const results = tools.map(classifyTool);

  console.log("Access Control adapter warning map - 0610");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  const bucketCounts = new Map();

  for (const result of results) {
    for (const bucket of result.buckets) {
      bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
    }
  }

  console.log("Bucket summary");
  Array.from(bucketCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([bucket, count]) => {
      console.log(String(count).padStart(2, " ") + "  " + bucket);
    });

  console.log("");

  if (!SUMMARY_ONLY) {
    console.log("Tool map");

    for (const result of results) {
      const level = result.buckets.includes("SPECIAL_PATH_SKIP")
        ? "SKIP"
        : result.warnings.length
          ? "WATCH"
          : "SAFE";

      console.log(`${level.padEnd(5)} ${result.slug} — ${result.buckets.join(", ")}`);
      console.log("      " + [
        result.usesSharedVisuals ? "uses shared visuals" : "no shared visual use",
        result.outputShellUse ? "uses output shell" : "no output shell use",
        result.printLowInk ? "printLowInk" : "no printLowInk",
        result.localExportAdapter ? "local export adapter" : "no export adapter",
        result.exportConfig ? "export config" : "no export config",
        result.customPayload ? "custom payload proof" : "no custom payload proof",
      ].join(" | "));

      result.warnings.forEach((warning) => console.log("      WATCH " + warning));
      result.notes.forEach((note) => console.log("      note  " + note));

      if (result.missingSharedAssets.length) {
        console.log("      missing shared assets: " + result.missingSharedAssets.join(", "));
      }
    }

    console.log("");
  }

  const warningTools = results.filter((result) => result.warnings.length && !result.buckets.includes("SPECIAL_PATH_SKIP"));
  const specialPathTools = results.filter((result) => result.buckets.includes("SPECIAL_PATH_SKIP"));

  console.log("Summary");
  console.log(`Tools: ${results.length}`);
  console.log(`Warning candidates excluding special paths: ${warningTools.length}`);
  console.log(`Special path skips: ${specialPathTools.length}`);

  if (STRICT && warningTools.length) {
    process.exit(1);
  }
}

main();