const fs = require("fs");
const path = require("path");

const root = process.cwd();

const candidates = [
  { label: "global tools page", rel: "tools/index.html", type: "GLOBAL_TOOLS_OPENING_PAGE" },
  { label: "access control category page", rel: "tools/access-control/index.html", type: "CATEGORY_OPENING_PAGE" },
  { label: "physical security category page", rel: "tools/physical-security/index.html", type: "CATEGORY_OPENING_PAGE" },
  { label: "networking category page", rel: "tools/networking/index.html", type: "CATEGORY_OPENING_PAGE" },
  { label: "life safety category page", rel: "tools/life-safety/index.html", type: "CATEGORY_OPENING_PAGE" },
  { label: "all tools page", rel: "all-tools/index.html", type: "GLOBAL_TOOLS_OPENING_PAGE" },
];

const calculatorShellHints = [
  "access-control-output-shell.js",
  "scopedlabs-assistant-export.js",
  "scopedlabs-report-metadata.js",
  "data-result-ledger",
  "exportReport",
  "saveSnapshot",
  "reportMetadataMount",
];

const landingPagePositiveHints = [
  "card",
  "tool-card",
  "category",
  "tools",
  "href=",
];

const seoHints = [
  "<title",
  'name="description"',
  'rel="canonical"',
  "sitemap",
];

const proHints = [
  "Pro",
  "Unlock",
  "pill--pro",
  "requiresPro",
  "locked",
];

const kbHints = [
  "knowledge-base",
  "KB",
  "Guide",
  "Open KB",
  "help",
];

const pipelineHints = [
  "pipeline",
  "Continue",
  "Start",
  "entry",
  "scope",
  "planner",
];

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function hasAny(text, tokens) {
  return tokens.some((token) => String(text || "").includes(token));
}

function countAny(text, tokens) {
  return tokens.reduce((count, token) => count + (String(text || "").includes(token) ? 1 : 0), 0);
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

function classifyPage(item, html) {
  if (!html) {
    return {
      ...item,
      bucket: "MISSING_PAGE_REVIEW",
      exists: false,
      links: [],
      evidence: {},
      notes: ["page not found at expected path"],
    };
  }

  const links = extractLinks(html);

  const evidence = {
    landingHints: countAny(html, landingPagePositiveHints),
    calculatorShellHints: countAny(html, calculatorShellHints),
    seoHints: countAny(html, seoHints),
    proHints: countAny(html, proHints),
    kbHints: countAny(html, kbHints),
    pipelineHints: countAny(html, pipelineHints),
    internalToolLinks: links.filter((link) => link.includes("/tools/")).length,
    categoryLinks: links.filter((link) => /\/tools\/[^/]+\/?$/.test(link)).length,
    externalLinks: links.filter((link) => /^https?:\/\//i.test(link)).length,
  };

  const notes = [];

  if (evidence.calculatorShellHints > 0) {
    notes.push("calculator shell/export/report markers detected; review before treating as landing page");
  }

  if (evidence.internalToolLinks > 0) {
    notes.push("internal tool links present");
  }

  if (evidence.categoryLinks > 0) {
    notes.push("category-level links present");
  }

  if (evidence.seoHints > 0) {
    notes.push("SEO/discovery markers present");
  } else {
    notes.push("SEO/discovery marker review");
  }

  if (evidence.proHints > 0) {
    notes.push("Pro/lock display markers present");
  }

  if (evidence.kbHints > 0) {
    notes.push("KB/guide/help markers present");
  }

  if (evidence.pipelineHints > 0) {
    notes.push("pipeline/start/scope markers present");
  }

  let bucket = "LANDING_PAGE_REVIEW";

  if (evidence.calculatorShellHints > 0) {
    bucket = "CALCULATOR_SHELL_MARKER_REVIEW";
  } else if (item.type === "GLOBAL_TOOLS_OPENING_PAGE" && evidence.internalToolLinks > 0) {
    bucket = "GLOBAL_TOOLS_OPENING_PAGE_REVIEW";
  } else if (item.type === "CATEGORY_OPENING_PAGE" && evidence.internalToolLinks > 0) {
    bucket = "CATEGORY_OPENING_PAGE_REVIEW";
  } else if (item.type === "CATEGORY_OPENING_PAGE") {
    bucket = "CATEGORY_OPENING_PAGE_PROOF_GAP_REVIEW";
  }

  return {
    ...item,
    bucket,
    exists: true,
    links,
    evidence,
    notes,
  };
}

console.log("ScopedLabs tools opening/category opening page audit - 0612");
console.log("Repo:", root);
console.log("");

const rows = [];

for (const item of candidates) {
  const filePath = path.join(root, item.rel);
  const html = readIfExists(filePath);
  rows.push(classifyPage(item, html));
}

let failCount = 0;

console.log("Page map");

for (const row of rows) {
  const prefix = row.exists ? "INFO  " : "WATCH ";
  console.log(prefix + row.rel + " — " + row.bucket);

  for (const note of row.notes) {
    console.log("      " + note);
  }
}

const bucketCounts = new Map();

for (const row of rows) {
  bucketCounts.set(row.bucket, (bucketCounts.get(row.bucket) || 0) + 1);
}

const existingPages = rows.filter((row) => row.exists).length;
const missingPages = rows.filter((row) => !row.exists).length;
const calculatorShellMarkers = rows.filter((row) => row.evidence.calculatorShellHints > 0).length;
const globalPages = rows.filter((row) => row.bucket === "GLOBAL_TOOLS_OPENING_PAGE_REVIEW").length;
const categoryPages = rows.filter((row) => row.bucket === "CATEGORY_OPENING_PAGE_REVIEW").length;
const categoryProofGaps = rows.filter((row) => row.bucket === "CATEGORY_OPENING_PAGE_PROOF_GAP_REVIEW").length;

console.log("");
console.log("Bucket summary");
for (const [bucket, count] of [...bucketCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(String(count).padStart(2, " ") + "  " + bucket);
}

console.log("");
console.log("Evidence summary");
console.log(String(existingPages).padStart(2, " ") + "  OPENING_PAGES_FOUND");
console.log(String(missingPages).padStart(2, " ") + "  OPENING_PAGES_NOT_FOUND_AT_EXPECTED_PATH");
console.log(String(globalPages).padStart(2, " ") + "  GLOBAL_TOOLS_OPENING_PAGE_REVIEW");
console.log(String(categoryPages).padStart(2, " ") + "  CATEGORY_OPENING_PAGE_REVIEW");
console.log(String(categoryProofGaps).padStart(2, " ") + "  CATEGORY_OPENING_PAGE_PROOF_GAP_REVIEW");
console.log(String(calculatorShellMarkers).padStart(2, " ") + "  CALCULATOR_SHELL_MARKER_REVIEW");

console.log("");
console.log("Decision summary");
console.log("SAFE  TOOLS_OPENING_PAGE_CONTRACT_NEEDED");
console.log("SAFE  CATEGORY_OPENING_PAGE_CONTRACT_NEEDED");
console.log("SAFE  TOOL_CARD_GRID_REVIEW");
console.log("SAFE  SEO_INTERNAL_LINKING_REVIEW");
console.log("SAFE  PRO_LOCK_DISPLAY_REVIEW");
console.log("SAFE  PIPELINE_ENTRY_LINKS_REVIEW");
console.log("SAFE  KB_GUIDE_LINK_REVIEW");
console.log("SAFE  NO_CALCULATOR_SHELL_PATCH_YET");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed link map");

  for (const row of rows) {
    console.log("");
    console.log(row.rel + " — " + row.bucket);

    if (!row.links.length) {
      console.log("  no links found or page missing");
      continue;
    }

    for (const link of row.links) {
      console.log("  " + link);
    }
  }

  console.log("");
  console.log("Detailed evidence map");

  for (const row of rows) {
    console.log("");
    console.log(row.rel + " — " + row.bucket);

    for (const [key, value] of Object.entries(row.evidence || {})) {
      console.log("  " + key + ": " + value);
    }
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");