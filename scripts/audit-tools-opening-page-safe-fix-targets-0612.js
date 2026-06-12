const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools");

const contractPath = path.join(root, "docs", "tools-opening-page-contract-v1.md");
const baseAuditPath = path.join(root, "scripts", "audit-tools-opening-pages-0612.js");
const readinessAuditPath = path.join(root, "scripts", "audit-tools-opening-page-readiness-0612.js");
const evidenceSuitePath = path.join(root, "scripts", "audit-tools-opening-pages-evidence-suite-0612.js");

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

function extractLinks(html) {
  const links = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html))) links.push(match[1]);

  return [...new Set(links)].sort();
}

function countMatches(html, regex) {
  return (String(html || "").match(regex) || []).length;
}

function normalizeHref(href) {
  const clean = String(href || "").trim().split("#")[0].split("?")[0].trim();

  if (!clean || clean === "#" || clean.startsWith("#")) return "";
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(clean)) return "";

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

  if (targetRel.endsWith("/")) targetRel += "index.html";
  else if (!path.posix.extname(targetRel)) targetRel = path.posix.join(targetRel, "index.html");

  return targetRel;
}

function discoverCategoryPages() {
  if (!exists(toolsRoot)) return [];

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

  if (!exists(categoryRoot)) return [];

  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort()
    .map((slug) => ({
      slug,
      href: "/tools/" + categorySlug + "/" + slug + "/",
      hrefAltA: "tools/" + categorySlug + "/" + slug + "/",
      hrefAltB: "./" + slug + "/",
      hrefAltC: slug + "/",
    }));
}

function analyzePage(page, categoryPages) {
  const htmlPath = path.join(root, page.rel);
  const html = readIfExists(htmlPath);

  if (!html) {
    return {
      ...page,
      bucket: "KEEP_REVIEW_MISSING_PAGE",
      safeFixes: [],
      keepReviews: ["page missing at expected path; do not auto-create without design source"],
      evidence: {},
    };
  }

  const links = extractLinks(html);
  const internalTargets = links
    .map((href) => ({ href, targetRel: resolveInternalHref(page.rel, href) }))
    .filter((item) => item.targetRel);

  const brokenLinks = internalTargets
    .filter((item) => !exists(path.join(root, item.targetRel)))
    .filter((item) => !item.targetRel.startsWith("assets/"))
    .filter((item) => !item.targetRel.startsWith("api/"));

  const expectedLinks = [];

  if (page.type === "GLOBAL_TOOLS_OPENING_PAGE") {
    for (const category of categoryPages) {
      expectedLinks.push({
        type: "CATEGORY_LINK",
        href: "/tools/" + category.slug + "/",
        alternates: [
          "/tools/" + category.slug + "/",
          "tools/" + category.slug + "/",
          "../tools/" + category.slug + "/",
        ],
      });
    }
  }

  if (page.type === "CATEGORY_OPENING_PAGE") {
    for (const tool of discoverToolPages(page.slug)) {
      expectedLinks.push({
        type: "TOOL_LINK",
        href: tool.href,
        alternates: [tool.href, tool.hrefAltA, tool.hrefAltB, tool.hrefAltC],
      });
    }
  }

  const missingExpectedLinks = expectedLinks.filter((expected) => {
    return !expected.alternates.some((href) => links.includes(href));
  });

  const evidence = {
    titleCount: countMatches(html, /<title\b/gi),
    descriptionCount: countMatches(html, /<meta\b[^>]*name=["']description["']/gi),
    canonicalCount: countMatches(html, /<link\b[^>]*rel=["']canonical["']/gi),
    h1Count: countMatches(html, /<h1\b/gi),
    cardClassCount: countMatches(html, /class=["'][^"']*(?:tool-card|category-card|card)[^"']*["']/gi),
    calculatorShellMarkerCount: calculatorShellHints.filter((token) => html.includes(token)).length,
    brokenLinkCount: brokenLinks.length,
    missingExpectedLinkCount: missingExpectedLinks.length,
  };

  const safeFixes = [];
  const keepReviews = [];

  if (evidence.calculatorShellMarkerCount > 0) {
    keepReviews.push("calculator shell markers detected; review manually before changing");
  }

  if (evidence.brokenLinkCount > 0) {
    keepReviews.push("broken links detected; review exact replacements before auto-fix");
  }

  if (evidence.titleCount !== 1) {
    keepReviews.push("title count is " + evidence.titleCount + "; needs review");
  }

  if (evidence.descriptionCount < 1) {
    safeFixes.push("SAFE_FIX_METADATA_DESCRIPTION_MISSING");
  }

  if (evidence.canonicalCount < 1) {
    safeFixes.push("SAFE_FIX_CANONICAL_MISSING_REVIEWABLE");
  }

  if (evidence.h1Count < 1) {
    keepReviews.push("H1 missing; page content/design review needed");
  }

  if (evidence.cardClassCount < 1) {
    keepReviews.push("card grid class not detected; visual layout review needed");
  }

  if (missingExpectedLinks.length > 0) {
    keepReviews.push("missing expected category/tool links: " + missingExpectedLinks.length);
  }

  let bucket = "OPENING_PAGE_NO_SAFE_FIX_TARGETS";

  if (safeFixes.length > 0) {
    bucket = "SAFE_FIX_READY_OPENING_PAGE_METADATA";
  }

  if (keepReviews.length > 0 && safeFixes.length > 0) {
    bucket = "SAFE_FIX_READY_WITH_KEEP_REVIEW";
  } else if (keepReviews.length > 0) {
    bucket = "KEEP_REVIEW_OPENING_PAGE_TARGETS";
  }

  return {
    ...page,
    bucket,
    safeFixes,
    keepReviews,
    evidence,
    brokenLinks,
    missingExpectedLinks,
  };
}

const contract = readIfExists(contractPath);
const baseAudit = readIfExists(baseAuditPath);
const readinessAudit = readIfExists(readinessAuditPath);
const evidenceSuite = readIfExists(evidenceSuitePath);

let failCount = 0;

console.log("ScopedLabs tools opening page SAFE_FIX target audit - 0612");
console.log("Repo:", root);
console.log("");

console.log("Contract / audit check");

const contractOk =
  contract.includes("TOOLS_OPENING_PAGE_CONTRACT_NEEDED") &&
  contract.includes("NO_CALCULATOR_SHELL_PATCH_YET") &&
  contract.includes("SAFE_FIX");

console.log((contractOk ? "SAFE  " : "FAIL  ") + "opening page contract markers present");
if (!contractOk) failCount += 1;

console.log((baseAudit ? "SAFE  " : "FAIL  ") + "base opening page audit present");
if (!baseAudit) failCount += 1;

console.log((readinessAudit ? "SAFE  " : "FAIL  ") + "opening page readiness audit present");
if (!readinessAudit) failCount += 1;

console.log((evidenceSuite ? "SAFE  " : "FAIL  ") + "opening page evidence suite present");
if (!evidenceSuite) failCount += 1;

const categoryPages = discoverCategoryPages();

const pages = [
  { slug: "tools", rel: "tools/index.html", type: "GLOBAL_TOOLS_OPENING_PAGE" },
  { slug: "all-tools", rel: "all-tools/index.html", type: "GLOBAL_TOOLS_OPENING_PAGE" },
  ...categoryPages,
];

const rows = pages.map((page) => analyzePage(page, categoryPages));

console.log("");
console.log("SAFE_FIX target map");

for (const row of rows) {
  console.log("INFO  " + row.rel + " — " + row.bucket);

  for (const fix of row.safeFixes) {
    console.log("      SAFE_FIX " + fix);
  }

  for (const review of row.keepReviews) {
    console.log("      KEEP_REVIEW " + review);
  }
}

const bucketCounts = new Map();
for (const row of rows) bucketCounts.set(row.bucket, (bucketCounts.get(row.bucket) || 0) + 1);

const safeFixCount = rows.reduce((count, row) => count + row.safeFixes.length, 0);
const keepReviewCount = rows.reduce((count, row) => count + row.keepReviews.length, 0);

console.log("");
console.log("Bucket summary");
for (const [bucket, count] of [...bucketCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(String(count).padStart(2, " ") + "  " + bucket);
}

console.log("");
console.log("Fix readiness summary");
console.log(String(safeFixCount).padStart(2, " ") + "  SAFE_FIX_TARGETS");
console.log(String(keepReviewCount).padStart(2, " ") + "  KEEP_REVIEW_TARGETS");
console.log(" 1  NO_CALCULATOR_SHELL_PATCH_YET");

console.log("");
console.log("Decision summary");

if (safeFixCount > 0) {
  console.log("WATCH OPENING_PAGE_SAFE_FIX_TARGETS_FOUND — build dry-run patch before applying");
} else {
  console.log("SAFE  OPENING_PAGE_NO_SAFE_FIX_TARGETS_YET");
}

console.log("SAFE  OPENING_PAGE_KEEP_REVIEW_TARGETS_IDENTIFIED");
console.log("SAFE  PRO_LOCK_DISPLAY_KEEP_REVIEW");
console.log("SAFE  PIPELINE_ENTRY_LINKS_KEEP_REVIEW");
console.log("SAFE  KB_GUIDE_LINK_KEEP_REVIEW");
console.log("SAFE  CATEGORY_SUMMARY_LINKS_KEEP_REVIEW");
console.log("SAFE  NO_CALCULATOR_SHELL_PATCH_YET");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed target map");

  for (const row of rows) {
    console.log("");
    console.log(row.rel + " — " + row.bucket);

    for (const [key, value] of Object.entries(row.evidence || {})) {
      console.log("  " + key + ": " + value);
    }

    if (row.brokenLinks && row.brokenLinks.length) {
      console.log("  broken links:");
      for (const item of row.brokenLinks) console.log("    " + item.href + " -> " + item.targetRel);
    }

    if (row.missingExpectedLinks && row.missingExpectedLinks.length) {
      console.log("  missing expected links:");
      for (const item of row.missingExpectedLinks) console.log("    " + item.href);
    }
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");