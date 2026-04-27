const fs = require("fs");
const path = require("path");

const root = process.cwd();
const SITE_ORIGIN = "https://scopedlabs.com";

const PARKED = new Set([
  "tools/power/ups-runtime-advanced/index.html"
]);

const UTILITY_EXCLUDE = new Set([
  "auth/callback/index.html",
  "account/index.html",
  "upgrade/checkout/index.html"
]);

const issues = [];
const pages = [];

function rel(file) {
  return file.replace(root + path.sep, "").replace(/\\/g, "/");
}

function add(severity, area, file, detail) {
  issues.push({ severity, area, file, detail });
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "_archive") continue;
      walk(full, files);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      files.push(full);
    }
  }

  return files;
}

function pathToUrl(relative) {
  if (relative === "index.html") return "/";
  return "/" + relative.replace(/index\.html$/i, "").replace(/\\/g, "/");
}

function getTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function getMetaDescription(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    || html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function hasNoIndex(html) {
  return /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
}

function isProTool(relative, html) {
  return /^tools\/[^/]+\/[^/]+\/index\.html$/i.test(relative) &&
    /data-tier=["']pro["']/i.test(html);
}

function isToolPage(relative) {
  return /^tools\/[^/]+\/[^/]+\/index\.html$/i.test(relative);
}

function isCategoryPage(relative) {
  return /^tools\/[^/]+\/index\.html$/i.test(relative);
}

function isRecommendedCrawlable(relative, html) {
  if (PARKED.has(relative)) return false;
  if (UTILITY_EXCLUDE.has(relative)) return false;
  if (isProTool(relative, html)) return false;
  if (hasNoIndex(html)) return false;
  return true;
}

const htmlFiles = walk(root);

for (const file of htmlFiles) {
  const relative = rel(file);
  const html = fs.readFileSync(file, "utf8");
  const urlPath = pathToUrl(relative);

  const title = getTag(html, "title");
  const desc = getMetaDescription(html);
  const h1 = getTag(html, "h1");

  const parked = PARKED.has(relative);
  const utilityExcluded = UTILITY_EXCLUDE.has(relative);
  const proTool = isProTool(relative, html);
  const crawlable = isRecommendedCrawlable(relative, html);

  pages.push({
    file: relative,
    url: SITE_ORIGIN + urlPath,
    crawlable,
    parked,
    utilityExcluded,
    proTool,
    toolPage: isToolPage(relative),
    categoryPage: isCategoryPage(relative),
    title,
    desc
  });

  if (!parked) {
    if (!title) add("FAIL", "metadata", relative, "Missing <title>.");
    if (!desc) add("FAIL", "metadata", relative, "Missing meta description.");
    if (!h1 && !relative.startsWith("auth/")) add("WARN", "metadata", relative, "Missing visible <h1>.");

    if (title && title.length < 15) {
      add("WARN", "metadata", relative, `Title may be short (${title.length} chars): ${title}`);
    }

    if (desc && desc.length < 70) {
      add("WARN", "metadata", relative, `Meta description may be short (${desc.length} chars).`);
    }

    if (desc && desc.length > 180) {
      add("WARN", "metadata", relative, `Meta description may be long (${desc.length} chars).`);
    }
  }

  if (proTool && !hasNoIndex(html)) {
    add("INFO", "indexing-policy", relative, "Protected Pro tool page is excluded from recommended sitemap. Consider adding noindex later if JS-gated pages appear in search.");
  }

  if (utilityExcluded && !hasNoIndex(html)) {
    add("INFO", "indexing-policy", relative, "Utility/account/auth page is excluded from recommended sitemap. Consider noindex if needed.");
  }
}

/* robots.txt */
const robotsPath = path.join(root, "robots.txt");
if (!fs.existsSync(robotsPath)) {
  add("FAIL", "robots", "robots.txt", "Missing robots.txt.");
} else {
  const robots = fs.readFileSync(robotsPath, "utf8");

  if (!/User-agent:\s*\*/i.test(robots)) {
    add("WARN", "robots", "robots.txt", "Missing User-agent: * rule.");
  }

  if (!/Sitemap:\s*https:\/\/scopedlabs\.com\/sitemap\.xml/i.test(robots)) {
    add("WARN", "robots", "robots.txt", "Missing or incorrect Sitemap line.");
  }
}

/* sitemap.xml */
const sitemapPath = path.join(root, "sitemap.xml");
const expectedUrls = pages
  .filter(p => p.crawlable)
  .map(p => p.url)
  .sort();

if (!fs.existsSync(sitemapPath)) {
  add("FAIL", "sitemap", "sitemap.xml", "Missing sitemap.xml.");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gi)]
    .map(m => m[1].trim())
    .sort();

  const locSet = new Set(locs);
  const expectedSet = new Set(expectedUrls);

  const missing = expectedUrls.filter(url => !locSet.has(url));
  const extra = locs.filter(url => !expectedSet.has(url));

  for (const url of missing.slice(0, 40)) {
    add("WARN", "sitemap", "sitemap.xml", `Missing recommended URL: ${url}`);
  }

  if (missing.length > 40) {
    add("WARN", "sitemap", "sitemap.xml", `Additional missing recommended URLs not shown: ${missing.length - 40}`);
  }

  for (const url of extra.slice(0, 40)) {
    add("WARN", "sitemap", "sitemap.xml", `Extra/non-recommended URL present: ${url}`);
  }

  if (extra.length > 40) {
    add("WARN", "sitemap", "sitemap.xml", `Additional extra URLs not shown: ${extra.length - 40}`);
  }

  if (!/<urlset/i.test(sitemap)) {
    add("FAIL", "sitemap", "sitemap.xml", "sitemap.xml does not appear to contain <urlset>.");
  }
}

/* duplicates */
const titleMap = new Map();
const descMap = new Map();

for (const p of pages.filter(p => p.crawlable)) {
  if (p.title) {
    if (!titleMap.has(p.title)) titleMap.set(p.title, []);
    titleMap.get(p.title).push(p.file);
  }

  if (p.desc) {
    if (!descMap.has(p.desc)) descMap.set(p.desc, []);
    descMap.get(p.desc).push(p.file);
  }
}

for (const [title, files] of titleMap.entries()) {
  if (files.length > 1) {
    add("WARN", "metadata", files.join(", "), `Duplicate title across crawlable pages: ${title}`);
  }
}

for (const [desc, files] of descMap.entries()) {
  if (files.length > 1) {
    add("WARN", "metadata", files.join(", "), `Duplicate meta description across crawlable pages.`);
  }
}

const fail = issues.filter(i => i.severity === "FAIL");
const warn = issues.filter(i => i.severity === "WARN");
const info = issues.filter(i => i.severity === "INFO");

console.log("\nSCOPEDLABS SEO / INDEXING AUDIT");
console.log("===============================");
console.log("HTML pages scanned:", htmlFiles.length);
console.log("Recommended crawlable URLs:", expectedUrls.length);
console.log("Protected Pro tool pages excluded from sitemap:", pages.filter(p => p.proTool).length);
console.log("Utility/account/auth pages excluded from sitemap:", pages.filter(p => p.utilityExcluded).length);
console.log("Parked pages excluded from sitemap:", pages.filter(p => p.parked).length);
console.log("FAIL:", fail.length);
console.log("WARN:", warn.length);
console.log("INFO:", info.length);

function printGroup(title, rows, limit = 80) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));

  if (!rows.length) {
    console.log("None");
    return;
  }

  console.table(rows.slice(0, limit));

  if (rows.length > limit) {
    console.log(`... ${rows.length - limit} more not shown`);
  }
}

printGroup("FAIL ITEMS", fail);
printGroup("WARN ITEMS", warn);
printGroup("INFO / POLICY NOTES", info, 40);

console.log("\nRecommended crawlable URL preview:");
console.table(expectedUrls.slice(0, 25).map(url => ({ url })));

if (!fail.length && !warn.length) {
  console.log("\nRESULT: SEO/indexing files look clean.");
} else if (!fail.length) {
  console.log("\nRESULT: No blocking SEO failures. Review warnings.");
} else {
  console.log("\nRESULT: SEO/indexing failures found. Repair FAIL items first.");
}
