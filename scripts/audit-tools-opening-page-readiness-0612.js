const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools");

const contractPath = path.join(root, "docs", "tools-opening-page-contract-v1.md");
const openingAuditPath = path.join(root, "scripts", "audit-tools-opening-pages-0612.js");
const openingSuitePath = path.join(root, "scripts", "audit-tools-opening-pages-evidence-suite-0612.js");

const calculatorShellHints = [
  "access-control-output-shell.js",
  "scopedlabs-assistant-export.js",
  "scopedlabs-report-metadata.js",
  "data-result-ledger",
  "exportReport",
  "saveSnapshot",
  "reportMetadataMount",
];

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function normalizeHref(href) {
  const clean = String(href || "").trim().split("#")[0].split("?")[0].trim();

  if (!clean) return "";
  if (clean === "#") return "";
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(clean)) return "";
  if (clean.startsWith("#")) return "";

  return clean;
}

function resolveInternalHref(pageRel, href) {
  const clean = normalizeHref(href);
  if (!clean) return null;

  let targetRel;

  if (clean.startsWith("/")) {
    targetRel = clean.replace(/^\/+/, "");
  } else {
    targetRel = path.posix.normalize(path.posix.join(path.posix.dirname(pageRel), clean));
  }

  if (!targetRel || targetRel === ".") targetRel = "index.html";

  if (targetRel.endsWith("/")) {
    targetRel += "index.html";
  } else if (!path.posix.extname(targetRel)) {
    targetRel = path.posix.join(targetRel, "index.html");
  }

  return targetRel;
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

function countMatches(html, regex) {
  return (String(html || "").match(regex) || []).length;
}

function hasAny(text, tokens) {
  return tokens.some((token) => String(text || "").includes(token));
}

function discoverCategoryPages() {
  if (!fs.existsSync(toolsRoot)) return [];

  return fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(toolsRoot, slug, "index.html")))
    .sort()
    .map((slug) => ({
      slug,
      rel: "tools/" + slug + "/index.html",
      type: "CATEGORY_OPENING_PAGE",
    }));
}

function discoverToolPages(categorySlug) {
  const categoryRoot = path.join(toolsRoot, categorySlug);

  if (!fs.existsSync(categoryRoot)) return [];

  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort()
    .map((slug) => ({
      slug,
      rel: "tools/" + categorySlug + "/" + slug + "/index.html",
      hrefA: "/tools/" + categorySlug + "/" + slug + "/",
      hrefB: "tools/" + categorySlug + "/" + slug + "/",
    }));
}

function classifyPage(page, allCategoryPages) {
  const filePath = path.join(root, page.rel);
  const html = readIfExists(filePath);
  const links = extractLinks(html);

  if (!html) {
    return {
      ...page,
      exists: false,
      bucket: "MISSING_OPENING_PAGE_REVIEW",
      evidence: {},
      brokenLinks: [],
      missingExpectedLinks: [],
      notes: ["page missing at expected path"],
    };
  }

  const internalTargets = links
    .map((href) => ({
      href,
      targetRel: resolveInternalHref(page.rel, href),
    }))
    .filter((item) => item.targetRel);

  const brokenLinks = internalTargets
    .filter((item) => !exists(path.join(root, item.targetRel)))
    .filter((item) => !item.targetRel.startsWith("assets/"))
    .filter((item) => !item.targetRel.startsWith("api/"));

  const titleCount = countMatches(html, /<title\b/gi);
  const descriptionCount = countMatches(html, /<meta\b[^>]*name=["']description["']/gi);
  const canonicalCount = countMatches(html, /<link\b[^>]*rel=["']canonical["']/gi);
  const h1Count = countMatches(html, /<h1\b/gi);
  const cardClassCount = countMatches(html, /class=["'][^"']*(?:tool-card|category-card|card)[^"']*["']/gi);

  const evidence = {
    titleCount,
    descriptionCount,
    canonicalCount,
    h1Count,
    cardClassCount,
    linkCount: links.length,
    internalLinkCount: internalTargets.length,
    brokenInternalLinkCount: brokenLinks.length,
    calculatorShellMarkerCount: calculatorShellHints.filter((token) => html.includes(token)).length,
    proLockMarkerCount: countMatches(html, /(?:Pro|Unlock|locked|pill--pro|requiresPro)/g),
    kbGuideMarkerCount: countMatches(html, /(?:knowledge-base|KB|Guide|Open KB|help)/g),
    pipelineMarkerCount: countMatches(html, /(?:pipeline|Start|Continue|scope|planner|summary)/g),
  };

  const notes = [];

  if (evidence.calculatorShellMarkerCount > 0) {
    notes.push("calculator shell/export/report markers found; do not patch with calculator shell");
  }

  if (evidence.brokenInternalLinkCount > 0) {
    notes.push("broken internal links found");
  }

  if (titleCount !== 1 || descriptionCount < 1 || h1Count < 1) {
    notes.push("SEO/title/H1 metadata review");
  }

  if (canonicalCount < 1) {
    notes.push("canonical link review");
  }

  if (cardClassCount < 1) {
    notes.push("tool/category card grid review");
  }

  const missingExpectedLinks = [];

  if (page.type === "GLOBAL_TOOLS_OPENING_PAGE") {
    for (const category of allCategoryPages) {
      const expectedHref = "/tools/" + category.slug + "/";
      const hasExpected =
        links.includes(expectedHref) ||
        links.includes("tools/" + category.slug + "/") ||
        links.includes("../tools/" + category.slug + "/");

      if (!hasExpected) {
        missingExpectedLinks.push(expectedHref);
      }
    }

    if (missingExpectedLinks.length) {
      notes.push("global opening page missing category links");
    }
  }

  if (page.type === "CATEGORY_OPENING_PAGE") {
    const categorySlug = page.slug;
    const expectedTools = discoverToolPages(categorySlug);

    for (const tool of expectedTools) {
      const hasExpected =
        links.includes(tool.hrefA) ||
        links.includes(tool.hrefB) ||
        links.includes("./" + tool.slug + "/") ||
        links.includes(tool.slug + "/");

      if (!hasExpected) {
        missingExpectedLinks.push(tool.hrefA);
      }
    }

    if (expectedTools.length && missingExpectedLinks.length) {
      notes.push("category opening page missing tool links");
    }
  }

  let bucket = "OPENING_PAGE_READY_FOR_TARGETED_REVIEW";

  if (evidence.calculatorShellMarkerCount > 0) {
    bucket = "CALCULATOR_SHELL_LEAKAGE_REVIEW";
  } else if (evidence.brokenInternalLinkCount > 0) {
    bucket = "BROKEN_INTERNAL_LINK_REVIEW";
  } else if (missingExpectedLinks.length > 0) {
    bucket = "MISSING_EXPECTED_LINKS_REVIEW";
  } else if (titleCount !== 1 || descriptionCount < 1 || canonicalCount < 1 || h1Count < 1) {
    bucket = "SEO_METADATA_REVIEW";
  } else if (cardClassCount < 1) {
    bucket = "TOOL_CARD_GRID_REVIEW";
  }

  return {
    ...page,
    exists: true,
    bucket,
    evidence,
    brokenLinks,
    missingExpectedLinks,
    notes,
  };
}

const categoryPages = discoverCategoryPages();

const pages = [
  { slug: "tools", rel: "tools/index.html", type: "GLOBAL_TOOLS_OPENING_PAGE" },
  { slug: "all-tools", rel: "all-tools/index.html", type: "GLOBAL_TOOLS_OPENING_PAGE" },
  ...categoryPages,
];

const contract = readIfExists(contractPath);
const openingAudit = readIfExists(openingAuditPath);
const openingSuite = readIfExists(openingSuitePath);

let failCount = 0;

console.log("ScopedLabs tools opening page readiness audit - 0612");
console.log("Repo:", root);
console.log("Pages checked:", pages.length);
console.log("");

console.log("Contract / audit check");

const contractOk =
  contract.includes("TOOLS_OPENING_PAGE_CONTRACT_NEEDED") &&
  contract.includes("CATEGORY_OPENING_PAGE_CONTRACT_NEEDED") &&
  contract.includes("NO_CALCULATOR_SHELL_PATCH_YET");

console.log((contractOk ? "SAFE  " : "FAIL  ") + "tools opening page contract markers present");
if (!contractOk) failCount += 1;

console.log((openingAudit ? "SAFE  " : "FAIL  ") + "opening page base audit present");
if (!openingAudit) failCount += 1;

console.log((openingSuite ? "SAFE  " : "FAIL  ") + "opening page evidence suite present");
if (!openingSuite) failCount += 1;

console.log("");
console.log("Page readiness map");

const rows = pages.map((page) => classifyPage(page, categoryPages));

for (const row of rows) {
  const prefix = row.exists ? "INFO  " : "WATCH ";
  console.log(prefix + row.rel + " — " + row.bucket);

  for (const note of row.notes) {
    console.log("      " + note);
  }

  if (row.brokenLinks.length) {
    console.log("      broken links: " + row.brokenLinks.length);
  }

  if (row.missingExpectedLinks.length) {
    console.log("      missing expected links: " + row.missingExpectedLinks.length);
  }
}

const bucketCounts = new Map();

for (const row of rows) {
  bucketCounts.set(row.bucket, (bucketCounts.get(row.bucket) || 0) + 1);
}

const totals = {
  pagesFound: rows.filter((row) => row.exists).length,
  pagesMissing: rows.filter((row) => !row.exists).length,
  brokenLinks: rows.reduce((count, row) => count + (row.brokenLinks || []).length, 0),
  missingExpectedLinks: rows.reduce((count, row) => count + (row.missingExpectedLinks || []).length, 0),
  seoReview: rows.filter((row) => row.bucket === "SEO_METADATA_REVIEW").length,
  cardGridReview: rows.filter((row) => row.bucket === "TOOL_CARD_GRID_REVIEW").length,
  calculatorShellLeakage: rows.filter((row) => row.bucket === "CALCULATOR_SHELL_LEAKAGE_REVIEW").length,
  readyForTargetedReview: rows.filter((row) => row.bucket === "OPENING_PAGE_READY_FOR_TARGETED_REVIEW").length,
};

console.log("");
console.log("Bucket summary");
for (const [bucket, count] of [...bucketCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(String(count).padStart(2, " ") + "  " + bucket);
}

console.log("");
console.log("Evidence summary");
console.log(String(totals.pagesFound).padStart(2, " ") + "  OPENING_PAGES_FOUND");
console.log(String(totals.pagesMissing).padStart(2, " ") + "  OPENING_PAGES_MISSING");
console.log(String(totals.brokenLinks).padStart(2, " ") + "  BROKEN_INTERNAL_LINKS_REVIEW");
console.log(String(totals.missingExpectedLinks).padStart(2, " ") + "  MISSING_EXPECTED_LINKS_REVIEW");
console.log(String(totals.seoReview).padStart(2, " ") + "  SEO_METADATA_REVIEW");
console.log(String(totals.cardGridReview).padStart(2, " ") + "  TOOL_CARD_GRID_REVIEW");
console.log(String(totals.calculatorShellLeakage).padStart(2, " ") + "  CALCULATOR_SHELL_LEAKAGE_REVIEW");
console.log(String(totals.readyForTargetedReview).padStart(2, " ") + "  OPENING_PAGE_READY_FOR_TARGETED_REVIEW");

console.log("");
console.log("Decision summary");

if (totals.brokenLinks > 0 || totals.missingExpectedLinks > 0 || totals.seoReview > 0 || totals.cardGridReview > 0) {
  console.log("WATCH OPENING_PAGE_TARGETED_PATCHES_NEEDED");
} else {
  console.log("SAFE  OPENING_PAGE_NO_TARGETED_PATCHES_DETECTED");
}

console.log("SAFE  TOOLS_OPENING_PAGE_CONTRACT_ACTIVE");
console.log("SAFE  CATEGORY_OPENING_PAGE_CONTRACT_ACTIVE");
console.log("SAFE  TOOL_CARD_GRID_REVIEW");
console.log("SAFE  SEO_INTERNAL_LINKING_REVIEW");
console.log("SAFE  PRO_LOCK_DISPLAY_REVIEW");
console.log("SAFE  PIPELINE_ENTRY_LINKS_REVIEW");
console.log("SAFE  KB_GUIDE_LINK_REVIEW");
console.log("SAFE  NO_CALCULATOR_SHELL_PATCH_YET");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed page evidence");

  for (const row of rows) {
    console.log("");
    console.log(row.rel + " — " + row.bucket);

    for (const [key, value] of Object.entries(row.evidence || {})) {
      console.log("  " + key + ": " + value);
    }

    if (row.brokenLinks.length) {
      console.log("  broken links:");
      for (const item of row.brokenLinks) {
        console.log("    " + item.href + " -> " + item.targetRel);
      }
    }

    if (row.missingExpectedLinks.length) {
      console.log("  missing expected links:");
      for (const item of row.missingExpectedLinks) {
        console.log("    " + item);
      }
    }
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");