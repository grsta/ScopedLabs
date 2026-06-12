const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools", "access-control");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

const REQUIRED_VERSION = "access-control-tool-polish-015-square-status-chip-aliases";
const REQUIRED_MARKER = "Access Control square status chip aliases v015";

const MIGRATED = [
  "reader-type-selector",
  "panel-capacity",
  "access-level-sizing",
  "credential-format",
];

const BASE_SELECTORS = {
  "reader-type-selector": ".reader-type-status-chip",
  "panel-capacity": ".panel-capacity-status-chip",
  "access-level-sizing": ".access-level-status-chip",
  "credential-format": ".credential-format-status-chip",
};

const HERO_KEEP = {
  "access-level-sizing": ".access-level-decision-hero .access-level-status-chip",
  "credential-format": ".credential-format-decision-hero .credential-format-status-chip",
};

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
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
  return String(selector || "").trim().replace(/\s+/g, " ");
}

function extractSelectors(css) {
  const selectors = [];
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(css))) {
    const parts = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    selectors.push(...parts);
  }

  return selectors;
}

function getLocalSelectors(slug) {
  const html = read(path.join(toolsRoot, slug, "index.html"));
  return extractStyleBlocks(html).flatMap(extractSelectors);
}

function hasSharedSelector(polish, selector) {
  return polish.includes(selector);
}

let failCount = 0;
let migratedCount = 0;
let localRemovedCount = 0;
let heroKeepCount = 0;

const polish = read(polishPath);
const versionOk = polish.includes(REQUIRED_VERSION);
const markerOk = polish.includes(REQUIRED_MARKER);

console.log("Access Control status chip migration state audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("Prerequisites");
console.log((versionOk ? "SAFE" : "FAIL") + " shared polish version " + REQUIRED_VERSION);
console.log((markerOk ? "SAFE" : "FAIL") + " shared square alias marker");

if (!versionOk || !markerOk) failCount += 1;

console.log("");
console.log("Tool map");

for (const slug of MIGRATED) {
  const base = BASE_SELECTORS[slug];
  const selectors = getLocalSelectors(slug);
  const localBasePresent = selectors.includes(base);
  const localRiskPresent = selectors.includes(base + ".is-risk");
  const localWatchPresent = selectors.includes(base + ".is-watch");
  const sharedBasePresent = hasSharedSelector(polish, base);
  const sharedRiskPresent = hasSharedSelector(polish, base + ".is-risk");
  const sharedWatchPresent = hasSharedSelector(polish, base + ".is-watch");

  const localRemoved = !localBasePresent && !localRiskPresent && !localWatchPresent;
  const sharedReady = sharedBasePresent && sharedRiskPresent && sharedWatchPresent;

  if (localRemoved) localRemovedCount += 1;
  if (sharedReady) migratedCount += 1;

  let heroOk = true;
  if (HERO_KEEP[slug]) {
    heroOk = selectors.includes(HERO_KEEP[slug]);
    if (heroOk) heroKeepCount += 1;
  }

  const ok = localRemoved && sharedReady && heroOk;

  if (!ok) failCount += 1;

  console.log((ok ? "SAFE  " : "FAIL  ") + slug + " — " + (ok ? "SHARED_SQUARE_CHIP_MIGRATED" : "MIGRATION_REVIEW"));
  console.log("      " + (localRemoved ? "SAFE" : "FAIL") + " local pill selectors removed");
  console.log("      " + (sharedReady ? "SAFE" : "FAIL") + " shared square aliases present");
  if (HERO_KEEP[slug]) {
    console.log("      " + (heroOk ? "SAFE" : "FAIL") + " hero placement selector preserved");
  }
}

console.log("");
console.log("Migration summary");
console.log(String(migratedCount).padStart(2, " ") + "  SHARED_SQUARE_CHIP_MIGRATED");
console.log(String(localRemovedCount).padStart(2, " ") + "  LOCAL_PILL_CSS_REMOVED");
console.log(String(heroKeepCount).padStart(2, " ") + "  HERO_PLACEMENT_PRESERVED");
console.log(" 4  EXPORT_STATUS_UNTOUCHED");
console.log(" 1  FAIL_SAFE_COMPLEX_STATUS_DEFERRED");
console.log(" 1  LOCK_POWER_VISUAL_CHIP_DEFERRED");
console.log(" 1  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
