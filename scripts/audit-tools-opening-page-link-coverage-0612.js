const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools");

const contractPath = path.join(root, "docs", "tools-opening-page-link-coverage-contract-v1.md");
const baseContractPath = path.join(root, "docs", "tools-opening-page-contract-v1.md");
const safeFixAuditPath = path.join(root, "scripts", "audit-tools-opening-page-safe-fix-targets-0612.js");

const calculatorShellHints = [
  "access-control-output-shell.js",
  "scopedlabs-assistant-export.js",
  "scopedlabs-report-metadata.js",
  "data-result-ledger",
  "exportReport",
  "saveSnapshot",
  "reportMetadataMount",
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readIfExists(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function extractLinks(html) {
  const links = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html))) {
    links.push(match[1]);
  }

  return [...new Set(links)].sort();
}

function extractTitle(html, fallback) {
  const h1 = String(html || "").match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1 && h1[1]) return cleanText(h1[1]) || fallback;

  const title = String(html || "").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (title && title[1]) return cleanText(title[1]).replace(/\s*\|\s*ScopedLabs\s*$/i, "") || fallback;

  return fallback;
}

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function discoverCategoryPages() {
  if (!exists(toolsRoot)) return [];

  return fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(toolsRoot, slug, "index.html")))
    .sort()
    .map((slug) => {
      const rel = "tools/" + slug + "/index.html";
      const html = readIfExists(path.join(root, rel));

      return {
        slug,
        title: extractTitle(html, titleFromSlug(slug)),
        rel,
        href: "/tools/" + slug + "/",
      };
    });
}

function discoverToolPages(categorySlug) {
  const categoryRoot = path.join(toolsRoot, categorySlug);

  if (!exists(categoryRoot)) return [];

  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort()
    .map((slug) => {
      const rel = "tools/" + categorySlug + "/" + slug + "/index.html";
      const html = readIfExists(path.join(root, rel));

      return {
        slug,
        title: extractTitle(html, titleFromSlug(slug)),
        rel,
        href: "/tools/" + categorySlug + "/" + slug + "/",
        alternates: [
          "/tools/" + categorySlug + "/" + slug + "/",
          "tools/" + categorySlug + "/" + slug + "/",
          "./" + slug + "/",
          slug + "/",
        ],
      };
    });
}

function hasExpectedLink(links, expected) {
  return expected.alternates.some((href) => links.includes(href));
}

function pageHasCalculatorShell(html) {
  return calculatorShellHints.some((token) => html.includes(token));
}

function analyzeGlobalToolsPage(categoryPages) {
  const rel = "tools/index.html";
  const html = readIfExists(path.join(root, rel));
  const links = extractLinks(html);

  if (!html) {
    return {
      rel,
      bucket: "GLOBAL_TOOLS_PAGE_MISSING_REVIEW",
      missing: [],
      present: [],
      calculatorShell: false,
    };
  }

  const missing = [];
  const present = [];

  for (const category of categoryPages) {
    const alternates = [category.href, "tools/" + category.slug + "/", "./" + category.slug + "/", category.slug + "/"];

    if (alternates.some((href) => links.includes(href))) {
      present.push(category);
    } else {
      missing.push(category);
    }
  }

  let bucket = "GLOBAL_TOOLS_CATEGORY_LINK_COVERAGE_COMPLETE";

  if (missing.length) {
    bucket = "GLOBAL_TOOLS_MISSING_CATEGORY_LINKS";
  }

  if (pageHasCalculatorShell(html)) {
    bucket = "GLOBAL_TOOLS_CALCULATOR_SHELL_LEAKAGE_REVIEW";
  }

  return {
    rel,
    bucket,
    missing,
    present,
    calculatorShell: pageHasCalculatorShell(html),
  };
}

function analyzeCategoryPage(category) {
  const html = readIfExists(path.join(root, category.rel));
  const links = extractLinks(html);
  const childTools = discoverToolPages(category.slug);

  const missing = [];
  const present = [];
  const summary = [];
  const regularMissing = [];

  for (const tool of childTools) {
    if (hasExpectedLink(links, tool)) {
      present.push(tool);
    } else {
      missing.push(tool);

      if (tool.slug === "summary") {
        summary.push(tool);
      } else {
        regularMissing.push(tool);
      }
    }
  }

  let bucket = "CATEGORY_PAGE_LINK_COVERAGE_COMPLETE";

  if (missing.length) {
    bucket = "CATEGORY_PAGE_MISSING_TOOL_LINKS";
  }

  if (summary.length) {
    bucket = "SUMMARY_PAGE_LINK_REVIEW";
  }

  if (pageHasCalculatorShell(html)) {
    bucket = "CATEGORY_PAGE_CALCULATOR_SHELL_LEAKAGE_REVIEW";
  }

  return {
    category,
    rel: category.rel,
    bucket,
    childTools,
    present,
    missing,
    regularMissing,
    summary,
    calculatorShell: pageHasCalculatorShell(html),
  };
}

let failCount = 0;

const baseContract = readIfExists(baseContractPath);
const linkContract = readIfExists(contractPath);
const safeFixAudit = readIfExists(safeFixAuditPath);

console.log("ScopedLabs tools opening page link coverage audit - 0612");
console.log("Repo:", root);
console.log("");

console.log("Contract / audit check");

const baseOk =
  baseContract.includes("NO_CALCULATOR_SHELL_PATCH_YET") &&
  baseContract.includes("CATEGORY_OPENING_PAGE_CONTRACT_NEEDED");

console.log((baseOk ? "SAFE  " : "FAIL  ") + "base opening page contract markers present");
if (!baseOk) failCount += 1;

const linkOk =
  linkContract.includes("CATEGORY_PAGE_MISSING_TOOL_LINKS") &&
  linkContract.includes("SUMMARY_PAGE_LINK_REVIEW") &&
  linkContract.includes("NO_CALCULATOR_SHELL_PATCH_YET");

console.log((linkOk ? "SAFE  " : "FAIL  ") + "link coverage contract markers present");
if (!linkOk) failCount += 1;

const safeFixOk =
  safeFixAudit.includes("OPENING_PAGE_KEEP_REVIEW_TARGETS_IDENTIFIED") &&
  safeFixAudit.includes("NO_CALCULATOR_SHELL_PATCH_YET");

console.log((safeFixOk ? "SAFE  " : "FAIL  ") + "safe-fix target audit markers present");
if (!safeFixOk) failCount += 1;

const categoryPages = discoverCategoryPages();
const globalResult = analyzeGlobalToolsPage(categoryPages);
const categoryResults = categoryPages.map(analyzeCategoryPage);

console.log("");
console.log("Global opening page link coverage");
console.log("INFO  " + globalResult.rel + " — " + globalResult.bucket);
console.log("      present category links: " + globalResult.present.length);
console.log("      missing category links: " + globalResult.missing.length);
console.log("      calculator shell markers: " + (globalResult.calculatorShell ? "yes" : "no"));

console.log("");
console.log("Category opening page link coverage");

for (const row of categoryResults) {
  console.log("INFO  " + row.rel + " — " + row.bucket);
  console.log("      child tool pages: " + row.childTools.length);
  console.log("      present links: " + row.present.length);
  console.log("      missing links: " + row.missing.length);
  console.log("      summary links needing review: " + row.summary.length);
  console.log("      calculator shell markers: " + (row.calculatorShell ? "yes" : "no"));
}

const bucketCounts = new Map();

function addBucket(bucket) {
  bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
}

addBucket(globalResult.bucket);
for (const row of categoryResults) addBucket(row.bucket);

const missingCategoryLinks = globalResult.missing.length;
const missingToolLinks = categoryResults.reduce((count, row) => count + row.regularMissing.length, 0);
const summaryReviewLinks = categoryResults.reduce((count, row) => count + row.summary.length, 0);
const shellLeakageCount = (globalResult.calculatorShell ? 1 : 0) + categoryResults.filter((row) => row.calculatorShell).length;

console.log("");
console.log("Bucket summary");
for (const [bucket, count] of [...bucketCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(String(count).padStart(2, " ") + "  " + bucket);
}

console.log("");
console.log("Link coverage summary");
console.log(String(categoryPages.length).padStart(2, " ") + "  CATEGORY_OPENING_PAGES_DISCOVERED");
console.log(String(missingCategoryLinks).padStart(2, " ") + "  GLOBAL_TOOLS_MISSING_CATEGORY_LINKS");
console.log(String(missingToolLinks).padStart(2, " ") + "  CATEGORY_PAGE_MISSING_TOOL_LINKS");
console.log(String(summaryReviewLinks).padStart(2, " ") + "  SUMMARY_PAGE_LINK_REVIEW");
console.log(String(shellLeakageCount).padStart(2, " ") + "  CALCULATOR_SHELL_LEAKAGE_REVIEW");

console.log("");
console.log("Decision summary");

if (missingToolLinks > 0 || missingCategoryLinks > 0) {
  console.log("WATCH OPENING_PAGE_LINK_PATCH_PLAN_READY");
} else {
  console.log("SAFE  OPENING_PAGE_LINK_COVERAGE_COMPLETE");
}

if (summaryReviewLinks > 0) {
  console.log("WATCH SUMMARY_PAGE_LINK_REVIEW");
} else {
  console.log("SAFE  SUMMARY_PAGE_LINK_REVIEW_READY_FOR_ACCESS_CONTROL_LANE");
}

console.log("SAFE  CATEGORY_PAGE_MISSING_TOOL_LINKS_CLASSIFIED");
console.log("SAFE  PRO_LOCK_DISPLAY_KEEP_REVIEW");
console.log("SAFE  PIPELINE_ENTRY_LINKS_KEEP_REVIEW");
console.log("SAFE  KB_GUIDE_LINK_KEEP_REVIEW");
console.log("SAFE  NO_CALCULATOR_SHELL_PATCH_YET");

if (process.argv.includes("--details") || process.argv.includes("--plan")) {
  console.log("");
  console.log("Detailed missing link map");

  if (globalResult.missing.length) {
    console.log("");
    console.log(globalResult.rel + " missing category links:");
    for (const category of globalResult.missing) {
      console.log("  " + category.href + " — " + category.title);
    }
  }

  for (const row of categoryResults) {
    if (!row.missing.length) continue;

    console.log("");
    console.log(row.rel + " missing tool links:");

    for (const tool of row.missing) {
      const prefix = tool.slug === "summary" ? "SUMMARY_REVIEW" : "TOOL_LINK";
      console.log("  " + prefix + " " + tool.href + " — " + tool.title);
    }
  }
}

if (process.argv.includes("--plan")) {
  console.log("");
  console.log("Patch planner");
  console.log("1. Patch one category opening page at a time.");
  console.log("2. Start with tools/access-control/index.html because Access Control is the active blueprint category.");
  console.log("3. Preserve current page layout and card rhythm.");
  console.log("4. Add only links/cards for existing child pages.");
  console.log("5. Keep summary/master assistant links on review unless the category already has a summary page.");
  console.log("6. Do not add calculator shell/export/report/result-ledger behavior.");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
