#!/usr/bin/env node

/*
  ScopedLabs Access Control Style Selector Map - 0610

  Audit only. No writes.

  Purpose:
  - Inspect remaining inline/page-local style selectors.
  - Separate generic shared-polish candidates from page-specific, visual, export, print, and JS-injected styles.
  - Do not change pages/assets.
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

function extractStyleBlocks(html) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;

  while ((match = regex.exec(html))) {
    blocks.push(match[1] || "");
  }

  return blocks;
}

function stripCssComments(css) {
  return String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractSelectors(css) {
  const source = stripCssComments(css)
    .replace(/@media[^{]+\{/g, "")
    .replace(/@supports[^{]+\{/g, "");

  const selectors = new Set();
  const regex = /([^{}@]+)\{/g;
  let match;

  while ((match = regex.exec(source))) {
    const raw = (match[1] || "").trim();

    if (!raw) continue;
    if (raw.includes(";")) continue;
    if (/^(from|to|\d+%)$/i.test(raw)) continue;

    raw.split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)
      .forEach((selector) => selectors.add(selector));
  }

  return Array.from(selectors).sort((a, b) => a.localeCompare(b));
}

function removeExportPopupStyleTemplates(source) {
  let text = String(source || "");

  // Export popup/report-preview templates often contain their own <style> block.
  // That CSS belongs to the print/export route adapter, not page-visible JS style injection.
  text = text.replace(/(?:const|let|var)\s+[A-Za-z0-9_$]*(?:popup|Popup|preview|Preview|report|Report|html|Html|print|Print)[A-Za-z0-9_$]*\s*=\s*`[\s\S]*?<style\b[\s\S]*?<\/style>[\s\S]*?`;/g, "");
  text = text.replace(/`[\s\S]*?<style\b[\s\S]*?<\/style>[\s\S]*?(?:payload\.reportId|exportMode|print-color-adjust|status-pill|window\.print)[\s\S]*?`/g, "``");

  return text;
}


function hasJsStyleInjection(script) {
  const cleaned = removeExportPopupStyleTemplates(script);

  return [
    /document\.createElement\(["']style["']\)/,
    /\.appendChild\([^)]*style/i,
    /<style\b/i,
    /insertAdjacentHTML\([^)]*style/i,
  ].some((pattern) => pattern.test(cleaned));
}

function selectorBucket(selector, slug) {
  const text = selector.toLowerCase();
  const slugParts = slug.toLowerCase().split("-").filter(Boolean);

  if (slugParts.some((part) => part.length > 3 && text.includes(part))) {
    return "PAGE_NAMED_SELECTOR";
  }

  if (/(print|export|report|popup|preview|paper|letter)/i.test(selector)) {
    return "EXPORT_OR_PRINT_SELECTOR";
  }

  if (/(visual|svg|chart|canvas|diagram|rail|map|branch|state|flow|graph)/i.test(selector)) {
    return "VISUAL_OR_GRAPHIC_SELECTOR";
  }

  if (/(status|pill|badge|chip|healthy|watch|risk)/i.test(selector)) {
    return "STATUS_SELECTOR";
  }

  if (/(result|summary|metric|field|note|grid|row|label|value)/i.test(selector)) {
    return "GENERIC_RESULT_LAYOUT_SELECTOR";
  }

  if (/(btn|button|action|controls|toolbar|cta)/i.test(selector)) {
    return "GENERIC_CONTROL_SELECTOR";
  }

  if (/(card|panel|section|shell|wrap|container)/i.test(selector)) {
    return "GENERIC_CARD_LAYOUT_SELECTOR";
  }

  if (/^(body|main|section|header|footer|h1|h2|h3|p|label|input|select|textarea|table|thead|tbody|tr|td|th)\b/i.test(selector)) {
    return "GLOBAL_ELEMENT_SELECTOR";
  }

  return "UNKNOWN_SELECTOR_REVIEW";
}

function classifyTool(slug) {
  const htmlPath = path.join(categoryRoot, slug, "index.html");
  const scriptPath = path.join(categoryRoot, slug, "script.js");

  const html = read(htmlPath);
  const script = read(scriptPath);
  const styleBlocks = extractStyleBlocks(html);
  const selectors = styleBlocks.flatMap(extractSelectors);

  const bucketCounts = new Map();

  for (const selector of selectors) {
    const bucket = selectorBucket(selector, slug);
    bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
  }

  const buckets = [];

  if (SPECIAL_PATH_TOOLS.has(slug)) buckets.push("SPECIAL_PATH_SKIP");
  if (styleBlocks.length === 0) buckets.push("STYLE_NONE");
  if (styleBlocks.length > 0) buckets.push("STYLE_INLINE_BLOCK_PRESENT");
  if (hasJsStyleInjection(script)) buckets.push("STYLE_JS_INJECTION_PRESENT");

  for (const bucket of bucketCounts.keys()) {
    buckets.push(bucket);
  }

  const pageSpecificCount = (bucketCounts.get("PAGE_NAMED_SELECTOR") || 0);
  const exportPrintCount = (bucketCounts.get("EXPORT_OR_PRINT_SELECTOR") || 0);
  const visualCount = (bucketCounts.get("VISUAL_OR_GRAPHIC_SELECTOR") || 0);
  const statusCount = (bucketCounts.get("STATUS_SELECTOR") || 0);
  const unknownCount = (bucketCounts.get("UNKNOWN_SELECTOR_REVIEW") || 0);
  const genericCount =
    (bucketCounts.get("GENERIC_RESULT_LAYOUT_SELECTOR") || 0) +
    (bucketCounts.get("GENERIC_CONTROL_SELECTOR") || 0) +
    (bucketCounts.get("GENERIC_CARD_LAYOUT_SELECTOR") || 0) +
    (bucketCounts.get("GLOBAL_ELEMENT_SELECTOR") || 0);

  let recommendedFirstMove = "KEEP_AS_IS_FOR_NOW";

  if (SPECIAL_PATH_TOOLS.has(slug)) {
    recommendedFirstMove = "KEEP_SPECIAL_PATH_SEPARATE";
  } else if (styleBlocks.length === 0) {
    recommendedFirstMove = "STYLE_NONE";
  } else if (hasJsStyleInjection(script)) {
    recommendedFirstMove = "INSPECT_JS_STYLE_INJECTION_FIRST";
  } else if (pageSpecificCount || visualCount || exportPrintCount) {
    recommendedFirstMove = "INSPECT_PAGE_VISUAL_EXPORT_STYLE_BEFORE_REMOVAL";
  } else if (genericCount > 0 && unknownCount === 0 && statusCount === 0) {
    recommendedFirstMove = "SHARED_POLISH_EXTRACTION_CANDIDATE";
  } else {
    recommendedFirstMove = "INSPECT_SELECTOR_MIX_BEFORE_REMOVAL";
  }

  return {
    slug,
    recommendedFirstMove,
    buckets,
    styleBlockCount: styleBlocks.length,
    styleBytes: styleBlocks.join("\n").length,
    selectorCount: selectors.length,
    selectors,
    bucketCounts,
    hasJsStyleInjection: hasJsStyleInjection(script),
  };
}

function countBucket(results, bucket) {
  return results.filter((result) => result.buckets.includes(bucket)).length;
}

function countMove(results, move) {
  return results.filter((result) => result.recommendedFirstMove === move).length;
}

function main() {
  const tools = listToolDirs();
  const results = tools.map(classifyTool);

  console.log("Access Control style selector map - 0610");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  const allBuckets = [
    "SPECIAL_PATH_SKIP",
    "STYLE_NONE",
    "STYLE_INLINE_BLOCK_PRESENT",
    "STYLE_JS_INJECTION_PRESENT",
    "PAGE_NAMED_SELECTOR",
    "EXPORT_OR_PRINT_SELECTOR",
    "VISUAL_OR_GRAPHIC_SELECTOR",
    "STATUS_SELECTOR",
    "GENERIC_RESULT_LAYOUT_SELECTOR",
    "GENERIC_CONTROL_SELECTOR",
    "GENERIC_CARD_LAYOUT_SELECTOR",
    "GLOBAL_ELEMENT_SELECTOR",
    "UNKNOWN_SELECTOR_REVIEW",
  ];

  console.log("Bucket summary");
  for (const bucket of allBuckets) {
    console.log(String(countBucket(results, bucket)).padStart(2, " ") + "  " + bucket);
  }

  const moves = Array.from(new Set(results.map((result) => result.recommendedFirstMove))).sort();

  console.log("");
  console.log("Recommended first-move summary");
  for (const move of moves) {
    console.log(String(countMove(results, move)).padStart(2, " ") + "  " + move);
  }

  if (!SUMMARY_ONLY) {
    console.log("");
    console.log("Tool selector map");

    for (const result of results) {
      const level = result.buckets.includes("SPECIAL_PATH_SKIP") ? "SKIP" : "INFO";

      console.log(level.padEnd(5) + " " + result.slug + " — " + result.recommendedFirstMove);
      console.log("      style blocks: " + result.styleBlockCount + ", bytes: " + result.styleBytes + ", selectors: " + result.selectorCount);
      console.log("      buckets: " + result.buckets.join(", "));

      const bucketSummary = Array.from(result.bucketCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([bucket, count]) => bucket + "=" + count)
        .join(", ");

      if (bucketSummary) {
        console.log("      selector buckets: " + bucketSummary);
      }

      if (result.selectors.length) {
        console.log("      selectors:");
        for (const selector of result.selectors) {
          console.log("        - " + selector + "  [" + selectorBucket(selector, result.slug) + "]");
        }
      }
    }
  }

  const skipCount = results.filter((result) => result.buckets.includes("SPECIAL_PATH_SKIP")).length;
  console.log("");
  console.log("Summary: " + (results.length - skipCount) + " INFO / " + skipCount + " SKIP / 0 FAIL");
}

main();