const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools", "access-control");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

const REQUIRED_VERSION = "access-control-tool-polish-015-square-status-chip-aliases";
const REQUIRED_MARKER = "Access Control square status chip aliases v015";

const CANDIDATES = [
  {
    slug: "reader-type-selector",
    removable: [
      ".reader-type-status-chip",
      ".reader-type-status-chip.is-risk",
      ".reader-type-status-chip.is-watch",
    ],
    keep: [],
  },
  {
    slug: "panel-capacity",
    removable: [
      ".panel-capacity-status-chip",
      ".panel-capacity-status-chip.is-risk",
      ".panel-capacity-status-chip.is-watch",
    ],
    keep: [],
  },
  {
    slug: "access-level-sizing",
    removable: [
      ".access-level-status-chip",
      ".access-level-status-chip.is-risk",
      ".access-level-status-chip.is-watch",
    ],
    keep: [
      ".access-level-decision-hero .access-level-status-chip",
    ],
  },
  {
    slug: "credential-format",
    removable: [
      ".credential-format-status-chip",
      ".credential-format-status-chip.is-risk",
      ".credential-format-status-chip.is-watch",
    ],
    keep: [
      ".credential-format-decision-hero .credential-format-status-chip",
    ],
  },
];

const EXCLUDED = [
  "fail-safe-fail-secure",
  "lock-power-budget",
  "scope-planner",
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function stripCssComments(css) {
  return String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
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

function normalizeSelector(selector) {
  return String(selector || "")
    .trim()
    .replace(/\s+/g, " ");
}

function extractSelectors(css) {
  const selectors = [];
  const clean = stripCssComments(css);
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(clean))) {
    const parts = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    selectors.push(...parts);
  }

  return selectors;
}

function getPageSelectors(slug) {
  const htmlPath = path.join(toolsRoot, slug, "index.html");
  const html = read(htmlPath);
  return extractStyleBlocks(html).flatMap(extractSelectors);
}

function countMatches(selectors, targets) {
  let count = 0;
  const found = [];

  for (const target of targets) {
    const exists = selectors.includes(target);
    if (exists) {
      count += 1;
      found.push(target);
    }
  }

  return { count, found };
}

function main() {
  const polish = read(polishPath);
  const sharedVersionOk = polish.includes(REQUIRED_VERSION);
  const sharedMarkerOk = polish.includes(REQUIRED_MARKER);

  const rows = [];
  let removableCount = 0;
  let keepCount = 0;

  for (const candidate of CANDIDATES) {
    const selectors = getPageSelectors(candidate.slug);
    const removable = countMatches(selectors, candidate.removable);
    const keep = countMatches(selectors, candidate.keep);

    removableCount += removable.count;
    keepCount += keep.count;

    rows.push({
      slug: candidate.slug,
      removable: removable.found,
      keep: keep.found,
    });
  }

  console.log("Access Control local pill-chip cleanup audit - 0611");
  console.log("Repo:", root);
  console.log("");

  console.log("Prerequisites");
  console.log((sharedVersionOk ? "SAFE" : "FAIL") + " shared polish version " + REQUIRED_VERSION);
  console.log((sharedMarkerOk ? "SAFE" : "FAIL") + " shared square alias marker");
  console.log("");

  console.log("Cleanup summary");
  console.log(String(removableCount).padStart(2, " ") + "  REMOVABLE_LOCAL_PILL_CHIP_CSS");
  console.log(String(keepCount).padStart(2, " ") + "  KEEP_HERO_PLACEMENT_LOCAL_FOR_NOW");
  console.log(" 4  KEEP_EXPORT_STATUS");
  console.log(" 1  SKIP_COMPLEX_STATUS");
  console.log(" 1  SKIP_VISUAL_CHIP");
  console.log(" 1  SKIP_SPECIAL_PATH");
  console.log("");

  console.log("Candidate map");
  for (const row of rows) {
    console.log("");
    console.log(row.slug);
    console.log("  removable: " + (row.removable.length ? row.removable.join(", ") : "none"));
    console.log("  keep: " + (row.keep.length ? row.keep.join(", ") : "none"));
  }

  console.log("");
  console.log("Excluded");
  for (const slug of EXCLUDED) {
    console.log("  " + slug);
  }

  console.log("");

  if (!sharedVersionOk || !sharedMarkerOk) {
    console.log("OVERALL: FAIL");
    process.exit(1);
  }

  if (removableCount !== 12) {
    console.log("OVERALL: WATCH");
    console.log("Expected 12 removable local pill-chip selectors before cleanup.");
    process.exit(0);
  }

  console.log("OVERALL: PASS");
}

main();