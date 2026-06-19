const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function exists(file) {
  return fs.existsSync(file);
}

function listCategories() {
  if (!fs.existsSync("tools")) return [];

  return fs.readdirSync("tools")
    .filter((name) => {
      if (name.startsWith("_")) return false;

      const full = path.join("tools", name);
      return fs.statSync(full).isDirectory();
    })
    .sort();
}

function listToolPages(category) {
  const root = path.join("tools", category);
  if (!fs.existsSync(root)) return [];

  return fs.readdirSync(root)
    .map((name) => path.join(root, name).replace(/\\/g, "/"))
    .filter((full) => fs.existsSync(path.join(full, "index.html")))
    .filter((full) => !full.endsWith("/summary"))
    .filter((full) => full !== root)
    .map((full) => full + "/index.html")
    .sort();
}

function anchorHrefs(content) {
  const hrefs = [];
  const pattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    hrefs.push(String(match[1] || "").trim());
  }

  return hrefs;
}

function scriptSrcs(content) {
  const srcs = [];
  const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    srcs.push(String(match[1] || "").trim());
  }

  return srcs;
}

function normalizeHref(href) {
  let value = String(href || "")
    .trim()
    .split(String.fromCharCode(92)).join("/")
    .replace(/[?#].*$/, "")
    .replace(/\/index\.html$/i, "/")
    .replace(/index\.html$/i, "");

  if (value && !value.endsWith("/") && !value.includes(".") && !value.startsWith("#")) {
    value += "/";
  }

  return value.toLowerCase();
}

function hasPipelineNav(content) {
  return [
    "pipeline",
    "flow-actions",
    "Continue Planning",
    "Back",
    "Continue"
  ].some((token) => content.includes(token));
}

function hasScript(content, scriptName) {
  return scriptSrcs(content).some((src) => src.includes(scriptName));
}

function pipelineConfigHasSummary(category) {
  const pipelines = read("assets/pipelines.js");
  return pipelines.includes("/tools/" + category + "/summary/");
}

function accessControlCategoryNavHasSummary() {
  return read("assets/access-control-category-nav.js").includes("/tools/access-control/summary/");
}

function hasPlannerLink(content, category) {
  const categoryRoot = "/tools/" + category + "/";

  return anchorHrefs(content).some((href) => {
    const normalized = normalizeHref(href);

    return normalized === "../" ||
      normalized === "./" ||
      normalized === categoryRoot ||
      normalized === "tools/" + category + "/" ||
      normalized.endsWith(categoryRoot);
  });
}

function hasStaticSummaryLink(content, category) {
  const absoluteSummary = "/tools/" + category + "/summary/";

  return anchorHrefs(content).some((href) => {
    const normalized = normalizeHref(href);

    return normalized === "summary/" ||
      normalized === "./summary/" ||
      normalized === "../summary/" ||
      normalized === absoluteSummary ||
      normalized === "tools/" + category + "/summary/" ||
      normalized.endsWith(absoluteSummary);
  });
}

function hasDynamicSummaryLink(content, category) {
  if (category === "access-control" && hasScript(content, "access-control-category-nav.js")) {
    return accessControlCategoryNavHasSummary();
  }

  return hasScript(content, "pipelines.js") &&
    hasScript(content, "pipeline.js") &&
    pipelineConfigHasSummary(category);
}

function hasSummaryLink(content, category) {
  return hasStaticSummaryLink(content, category) || hasDynamicSummaryLink(content, category);
}

const PENDING_SUMMARY_CATEGORIES = new Set([
  "compute",
  "infrastructure",
  "network",
  "performance",
  "power",
  "thermal",
  "video-storage",
  "wireless"
]);

const checks = [];

function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

console.log("SCOPEDLABS PLANNER / SUMMARY NAV CONTRACT AUDIT V1\n");

const ledger = read("docs/scopedlabs-pattern-promotion-ledger.md");
const moduleMap = read("docs/scopedlabs-module-map.md");

check(
  "LEDGER_HAS_PLANNER_SUMMARY_NAV_PROMOTION_ENTRY",
  ledger.includes("CATEGORY-PLANNER-SUMMARY-NAV-0618") &&
    ledger.includes("scripts/audit-scopedlabs-planner-summary-nav-contract-v1.js"),
  "docs/scopedlabs-pattern-promotion-ledger.md",
  "Pattern ledger must track the category Planner/Summary nav promotion entry."
);

check(
  "MODULE_MAP_RECORDS_PLANNER_SUMMARY_NAV_CONTRACT",
  moduleMap.includes("CATEGORY-PLANNER-SUMMARY-NAV-0618") ||
    moduleMap.includes("planner/summary nav contract"),
  "docs/scopedlabs-module-map.md",
  "Module map must record the Planner/Summary nav contract."
);

check(
  "ACCESS_CONTROL_CATEGORY_NAV_ADAPTER_HAS_SUMMARY_STEP",
  accessControlCategoryNavHasSummary(),
  "assets/access-control-category-nav.js",
  "Access Control category nav adapter should render a Summary step for tools."
);

check(
  "PIPELINE_CONFIG_HAS_PHYSICAL_SECURITY_SUMMARY_STEP",
  pipelineConfigHasSummary("physical-security"),
  "assets/pipelines.js",
  "Physical Security pipeline config should include the Summary step."
);

const categories = listCategories();
let pendingCount = 0;

for (const category of categories) {
  const categoryIndex = "tools/" + category + "/index.html";
  const summaryIndex = "tools/" + category + "/summary/index.html";

  const hasCategoryIndex = exists(categoryIndex);
  const hasSummary = exists(summaryIndex);
  const isPending = PENDING_SUMMARY_CATEGORIES.has(category);

  check(
    "CATEGORY_INDEX_EXISTS_" + category.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
    hasCategoryIndex,
    categoryIndex,
    "Every category should have a Planner/command index page."
  );

  check(
    "CATEGORY_SUMMARY_EXISTS_OR_PENDING_" + category.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
    hasSummary || isPending,
    summaryIndex,
    hasSummary
      ? "Category Summary page exists."
      : "Category Summary page is missing and category must be explicitly listed as PENDING_SUMMARY."
  );

  if (!hasSummary && isPending) {
    pendingCount += 1;
    console.log("[PENDING] " + category + " summary page is not built yet.");
  }

  if (hasSummary) {
    const categoryHtml = read(categoryIndex);

    check(
      "CATEGORY_PAGE_LINKS_SUMMARY_" + category.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
      hasStaticSummaryLink(categoryHtml, category),
      categoryIndex,
      "Category Planner/command page should expose an actual href to the Summary/rollup page when it exists."
    );

    const missingToolSummaryLinks = [];
    const missingPlannerLinks = [];

    for (const toolPage of listToolPages(category)) {
      const html = read(toolPage);
      if (!hasPipelineNav(html)) continue;

      if (!hasPlannerLink(html, category)) missingPlannerLinks.push(toolPage);
      if (!hasSummaryLink(html, category)) missingToolSummaryLinks.push(toolPage);
    }

    check(
      "TOOL_NAV_LINKS_PLANNER_" + category.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
      missingPlannerLinks.length === 0,
      "tools/" + category,
      missingPlannerLinks.length
        ? "Tool pages missing actual Planner/category hrefs: " + missingPlannerLinks.slice(0, 12).join(", ") + (missingPlannerLinks.length > 12 ? " ..." : "")
        : "Tool pages with pipeline nav expose actual Planner/category hrefs."
    );

    check(
      "TOOL_NAV_LINKS_SUMMARY_" + category.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
      missingToolSummaryLinks.length === 0,
      "tools/" + category,
      missingToolSummaryLinks.length
        ? "Tool pages missing Summary/rollup hrefs or dynamic shared Summary nav: " + missingToolSummaryLinks.slice(0, 12).join(", ") + (missingToolSummaryLinks.length > 12 ? " ..." : "")
        : "Tool pages with pipeline nav expose Summary/rollup links through static hrefs or shared dynamic nav."
    );
  }
}

check(
  "PENDING_SUMMARY_CATEGORIES_ARE_EXPLICIT",
  pendingCount >= 1,
  "scripts/audit-scopedlabs-planner-summary-nav-contract-v1.js",
  "Categories without Summary pages should be explicitly listed as pending instead of silently skipped."
);

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.id);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.id);
  }

  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("PENDING_SUMMARY_CATEGORIES: " + pendingCount);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
