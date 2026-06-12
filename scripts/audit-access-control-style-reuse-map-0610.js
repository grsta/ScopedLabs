#!/usr/bin/env node

/*
  ScopedLabs Access Control Style Reuse Map - 0610

  Audit only. No writes.

  Purpose:
  - Find inline CSS selectors repeated across Access Control tools.
  - Separate shared-polish extraction candidates from page/export/visual/status keep-review selectors.
  - Avoid using Scope Planner as a shared-pattern driver because it is a special path.
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

function sharedCandidateBucket(selector) {
  if (/(result|summary|metric|field|note|grid|row|label|value)/i.test(selector)) {
    return "SHARED_RESULT_LAYOUT_CANDIDATE";
  }

  if (/(card|panel|section|shell|wrap|container)/i.test(selector)) {
    return "SHARED_CARD_LAYOUT_CANDIDATE";
  }

  if (/(btn|button|action|controls|toolbar|cta)/i.test(selector)) {
    return "SHARED_CONTROL_CANDIDATE";
  }

  if (/^(body|main|section|header|footer|h1|h2|h3|p|label|input|select|textarea|table|thead|tbody|tr|td|th)\b/i.test(selector)) {
    return "GLOBAL_ELEMENT_REVIEW";
  }

  return "NOT_SHARED_POLISH_CANDIDATE";
}

function pageNamedInAnyTool(selector, tools) {
  const text = selector.toLowerCase();

  return tools.some((slug) => {
    const parts = slug.toLowerCase().split("-").filter(Boolean);
    return parts.some((part) => part.length > 3 && text.includes(part));
  });
}

function classifySelector(selector, slugs, standardTools) {
  const bucketsByTool = slugs.map((slug) => selectorBucket(selector, slug));
  const uniqueBuckets = Array.from(new Set(bucketsByTool)).sort();

  const standardSlugs = slugs.filter((slug) => !SPECIAL_PATH_TOOLS.has(slug));
  const specialSlugs = slugs.filter((slug) => SPECIAL_PATH_TOOLS.has(slug));

  let recommendation = "KEEP_REVIEW";

  const hasOnlySpecial = standardSlugs.length === 0;
  const hasPageNamed = pageNamedInAnyTool(selector, standardTools);
  const hasExport = uniqueBuckets.includes("EXPORT_OR_PRINT_SELECTOR");
  const hasVisual = uniqueBuckets.includes("VISUAL_OR_GRAPHIC_SELECTOR");
  const hasStatus = uniqueBuckets.includes("STATUS_SELECTOR");
  const hasUnknown = uniqueBuckets.includes("UNKNOWN_SELECTOR_REVIEW");
  const sharedBucket = sharedCandidateBucket(selector);

  if (hasOnlySpecial) {
    recommendation = "IGNORE_SPECIAL_PATH_ONLY";
  } else if (hasPageNamed) {
    recommendation = "KEEP_PAGE_NAMED_LOCAL";
  } else if (hasExport) {
    recommendation = "KEEP_EXPORT_PRINT_LOCAL_FOR_NOW";
  } else if (hasVisual) {
    recommendation = "KEEP_VISUAL_STYLE_LOCAL_FOR_NOW";
  } else if (hasStatus) {
    recommendation = "STATUS_STYLE_REVIEW_ONLY";
  } else if (sharedBucket !== "NOT_SHARED_POLISH_CANDIDATE" && standardSlugs.length >= 2 && !hasUnknown) {
    recommendation = sharedBucket;
  } else if (hasUnknown) {
    recommendation = "UNKNOWN_SELECTOR_REVIEW";
  }

  return {
    selector,
    slugs,
    standardSlugs,
    specialSlugs,
    uniqueBuckets,
    sharedBucket,
    recommendation,
  };
}

function main() {
  const tools = listToolDirs();
  const standardTools = tools.filter((slug) => !SPECIAL_PATH_TOOLS.has(slug));

  const selectorMap = new Map();
  const toolSelectorCount = new Map();

  for (const slug of tools) {
    const htmlPath = path.join(categoryRoot, slug, "index.html");
    const html = read(htmlPath);
    const styleBlocks = extractStyleBlocks(html);
    const selectors = styleBlocks.flatMap(extractSelectors);

    toolSelectorCount.set(slug, selectors.length);

    for (const selector of selectors) {
      if (!selectorMap.has(selector)) selectorMap.set(selector, new Set());
      selectorMap.get(selector).add(slug);
    }
  }

  const repeated = Array.from(selectorMap.entries())
    .map(([selector, slugSet]) => classifySelector(selector, Array.from(slugSet).sort(), standardTools))
    .filter((item) => item.slugs.length >= 2)
    .sort((a, b) => {
      const countDelta = b.standardSlugs.length - a.standardSlugs.length;
      if (countDelta) return countDelta;
      return a.selector.localeCompare(b.selector);
    });

  const recommendations = new Map();

  for (const item of repeated) {
    recommendations.set(item.recommendation, (recommendations.get(item.recommendation) || 0) + 1);
  }

  const sharedCandidates = repeated.filter((item) => /^SHARED_/.test(item.recommendation));
  const localKeep = repeated.filter((item) => /^KEEP_/.test(item.recommendation));
  const review = repeated.filter((item) => /REVIEW/.test(item.recommendation) || /STATUS/.test(item.recommendation));

  console.log("Access Control style reuse map - 0610");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  console.log("Tool selector counts");
  for (const slug of tools) {
    const level = SPECIAL_PATH_TOOLS.has(slug) ? "SKIP" : "INFO";
    console.log(level.padEnd(5) + " " + slug + " — selectors: " + toolSelectorCount.get(slug));
  }

  console.log("");
  console.log("Repeated selector summary");
  console.log("Repeated selectors total: " + repeated.length);
  console.log("Shared-polish candidates: " + sharedCandidates.length);
  console.log("Local keep/review selectors: " + (localKeep.length + review.length));

  console.log("");
  console.log("Recommendation summary");
  Array.from(recommendations.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, count]) => {
      console.log(String(count).padStart(2, " ") + "  " + key);
    });

  if (!SUMMARY_ONLY) {
    console.log("");
    console.log("Shared-polish extraction candidates");
    if (!sharedCandidates.length) {
      console.log("  none");
    }

    for (const item of sharedCandidates) {
      console.log("CANDIDATE " + item.recommendation + " — " + item.selector);
      console.log("      tools: " + item.standardSlugs.join(", "));
      console.log("      buckets: " + item.uniqueBuckets.join(", "));
    }

    console.log("");
    console.log("Repeated selectors keep/review map");
    for (const item of repeated.filter((entry) => !/^SHARED_/.test(entry.recommendation))) {
      console.log("REVIEW " + item.recommendation + " — " + item.selector);
      console.log("      tools: " + item.slugs.join(", "));
      console.log("      buckets: " + item.uniqueBuckets.join(", "));
    }
  }

  const skipCount = tools.filter((slug) => SPECIAL_PATH_TOOLS.has(slug)).length;
  console.log("");
  console.log("Summary: " + (tools.length - skipCount) + " INFO / " + skipCount + " SKIP / 0 FAIL");
}

main();