#!/usr/bin/env node

/*
  ScopedLabs Access Control Status Chip Evidence Audit - 0610

  Audit only. No writes.

  Purpose:
  - Separate local status calculation functions from actual local chip/pill/badge rendering.
  - Identify shared schedule statusChip usage.
  - Identify local fallback chips that should be kept until shared schedule coverage is proven.
*/

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const SUMMARY_ONLY = process.argv.includes("--summary-only");

const SPECIAL_PATH_TOOLS = new Set(["scope-planner"]);

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

function functionNames(script, regex) {
  const names = new Set();
  let match;

  while ((match = regex.exec(script))) {
    names.add(match[1]);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function countLiteral(text, literal) {
  return String(text || "").split(literal).length - 1;
}

function classifyTool(slug) {
  const htmlPath = path.join(categoryRoot, slug, "index.html");
  const scriptPath = path.join(categoryRoot, slug, "script.js");
  const html = read(htmlPath);
  const script = read(scriptPath);
  const combined = html + "\n" + script;

  const statusFunctions = functionNames(
    script,
    /function\s+([A-Za-z0-9_]*(?:status|Status)[A-Za-z0-9_]*)\s*\(/g
  );

  const chipFunctions = functionNames(
    script,
    /function\s+([A-Za-z0-9_]*(?:chip|Chip|pill|Pill|badge|Badge)[A-Za-z0-9_]*)\s*\(/g
  );

  const localChipMarkup = [
    /statusChipHtml/,
    /status-chip/,
    /status_pill/,
    /status-pill/,
    /class=["'][^"']*(?:status-chip|pill|badge)[^"']*["']/i,
    /className\s*=\s*["'][^"']*(?:status-chip|pill|badge)[^"']*["']/i,
    /<span\s+class=["'][^"']*(?:status-chip|pill|badge)[^"']*["']/i,
  ].some((pattern) => pattern.test(combined));

  const sharedScheduleChipCount = countLiteral(script, "schedule.statusChip");
  const sharedScheduleObject = /ScopedLabsAccessControlDecisionSchedule/.test(script);
  const exportStatusControl = /\bsetExportStatus\s*\(/.test(script) || /function\s+setExportStatus\s*\(/.test(script);
  const routeExportStatusControl = /setRouteExportStatus/i.test(script);
  const visibleDecisionStatusControl = /renderVisibleDecisionStatus|clearVisibleDecisionStatus|normalizeStatusClass/i.test(script);

  const chipFallbackLikely =
    sharedScheduleChipCount > 0 &&
    (chipFunctions.length > 0 || localChipMarkup);

  const calcOnly =
    statusFunctions.length > 0 &&
    chipFunctions.length === 0 &&
    !localChipMarkup;

  const buckets = [];

  if (SPECIAL_PATH_TOOLS.has(slug)) buckets.push("SPECIAL_PATH_SKIP");
  if (sharedScheduleObject) buckets.push("SHARED_DECISION_SCHEDULE_PRESENT");
  if (sharedScheduleChipCount > 0) buckets.push("SHARED_SCHEDULE_STATUS_CHIP_USED");
  if (chipFunctions.length > 0) buckets.push("LOCAL_CHIP_HELPER_PRESENT");
  if (localChipMarkup) buckets.push("LOCAL_CHIP_MARKUP_PRESENT");
  if (chipFallbackLikely) buckets.push("LOCAL_CHIP_FALLBACK_KEEP_REVIEW");
  if (calcOnly) buckets.push("STATUS_CALC_ONLY_NO_CHIP_CLEANUP");
  if (exportStatusControl) buckets.push("STATUS_EXPORT_CONTROL_KEEP");
  if (routeExportStatusControl) buckets.push("STATUS_ROUTE_EXPORT_CONTROL_KEEP");
  if (visibleDecisionStatusControl) buckets.push("VISIBLE_DECISION_STATUS_KEEP_REVIEW");

  if (!buckets.length) buckets.push("NO_STATUS_CHIP_SIGNAL");

  let recommendedFirstMove = "KEEP_AS_IS_FOR_NOW";

  if (SPECIAL_PATH_TOOLS.has(slug)) {
    recommendedFirstMove = "KEEP_SPECIAL_PATH_SEPARATE";
  } else if (chipFallbackLikely) {
    recommendedFirstMove = "KEEP_LOCAL_FALLBACK_UNTIL_SHARED_SCHEDULE_PROVEN";
  } else if (calcOnly) {
    recommendedFirstMove = "NO_CHIP_CLEANUP_STATUS_CALC_ONLY";
  } else if (chipFunctions.length || localChipMarkup) {
    recommendedFirstMove = "INSPECT_LOCAL_CHIP_RENDERING";
  }

  return {
    slug,
    recommendedFirstMove,
    buckets,
    statusFunctions,
    chipFunctions,
    localChipMarkup,
    sharedScheduleChipCount,
    sharedScheduleObject,
    exportStatusControl,
    routeExportStatusControl,
    visibleDecisionStatusControl,
  };
}

function countBucket(results, bucket) {
  return results.filter((result) => result.buckets.includes(bucket)).length;
}

function main() {
  const tools = listToolDirs();
  const results = tools.map(classifyTool);

  console.log("Access Control status chip evidence audit - 0610");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  const buckets = [
    "SPECIAL_PATH_SKIP",
    "SHARED_DECISION_SCHEDULE_PRESENT",
    "SHARED_SCHEDULE_STATUS_CHIP_USED",
    "LOCAL_CHIP_HELPER_PRESENT",
    "LOCAL_CHIP_MARKUP_PRESENT",
    "LOCAL_CHIP_FALLBACK_KEEP_REVIEW",
    "STATUS_CALC_ONLY_NO_CHIP_CLEANUP",
    "STATUS_EXPORT_CONTROL_KEEP",
    "STATUS_ROUTE_EXPORT_CONTROL_KEEP",
    "VISIBLE_DECISION_STATUS_KEEP_REVIEW",
  ];

  console.log("Bucket summary");
  for (const bucket of buckets) {
    console.log(String(countBucket(results, bucket)).padStart(2, " ") + "  " + bucket);
  }

  const moves = new Map();
  for (const result of results) {
    moves.set(result.recommendedFirstMove, (moves.get(result.recommendedFirstMove) || 0) + 1);
  }

  console.log("");
  console.log("Recommended first-move summary");
  Array.from(moves.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([move, count]) => {
      console.log(String(count).padStart(2, " ") + "  " + move);
    });

  if (!SUMMARY_ONLY) {
    console.log("");
    console.log("Tool status-chip evidence map");

    for (const result of results) {
      const level = result.buckets.includes("SPECIAL_PATH_SKIP") ? "SKIP" : "INFO";
      console.log(level.padEnd(5) + " " + result.slug + " — " + result.recommendedFirstMove);
      console.log("      buckets: " + result.buckets.join(", "));

      if (result.statusFunctions.length) {
        console.log("      status functions: " + result.statusFunctions.join(", "));
      }

      if (result.chipFunctions.length) {
        console.log("      chip functions: " + result.chipFunctions.join(", "));
      }

      console.log(
        "      signals: " + [
          result.localChipMarkup ? "local chip markup" : "no local chip markup",
          result.sharedScheduleChipCount ? "shared schedule chip x" + result.sharedScheduleChipCount : "no shared schedule chip",
          result.exportStatusControl ? "export status control" : "no export status control",
          result.routeExportStatusControl ? "route export status control" : "no route export status control",
        ].join(" | ")
      );
    }
  }

  const skipCount = results.filter((result) => result.buckets.includes("SPECIAL_PATH_SKIP")).length;
  console.log("");
  console.log("Summary: " + (results.length - skipCount) + " INFO / " + skipCount + " SKIP / 0 FAIL");
}

main();