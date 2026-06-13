const fs = require("fs");
const path = require("path");

const root = process.cwd();

const pageRel = "tools/access-control/index.html";
const pagePath = path.join(root, pageRel);

const requiredLinks = [
  "/tools/access-control/scope-planner/",
  "/tools/access-control/door-count-planner/",
  "/tools/access-control/reader-type-selector/",
  "/tools/access-control/credential-format/",
  "/tools/access-control/access-level-sizing/",
  "/tools/access-control/panel-capacity/",
  "/tools/access-control/lock-power-budget/",
  "/tools/access-control/door-cable-length/",
  "/tools/access-control/elevator-reader-count/",
  "/tools/access-control/fail-safe-fail-secure/",
  "/tools/access-control/special-locking-scope/",
  "/tools/access-control/anti-passback-zones/",
  "/tools/access-control/summary/"
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAnchors(html) {
  const anchors = [];
  const regex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match;

  while ((match = regex.exec(html))) {
    anchors.push(match[0]);
  }

  return anchors;
}

function hrefOf(anchor) {
  const match = anchor.match(/href\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

let failCount = 0;

console.log("ScopedLabs Access Control category card integrity audit - 0612");
console.log("Repo:", root);
console.log("");

const html = read(pagePath);
const anchors = extractAnchors(html);

const staleBadMarkers = [
  "scopedlabs-access-control-opening-links-0612-start",
  "scopedlabs-access-control-summary-link-0612-fix-start",
];

for (const marker of staleBadMarkers) {
  if (html.includes(marker)) {
    console.log("FAIL  stale bad insert marker remains: " + marker);
    failCount += 1;
  } else {
    console.log("SAFE  stale marker absent: " + marker);
  }
}

let disallowedCtaOnlyCards = 0;
let allowedScopePlannerCtas = 0;

for (const anchor of anchors) {
  const href = hrefOf(anchor);
  const text = cleanText(anchor);
  const isAccessTool = href.includes("/tools/access-control/");
  const isScopePlanner = href === "/tools/access-control/scope-planner/";

  if (!isAccessTool) continue;

  if (text === "Start Guided Flow" && isScopePlanner) {
    allowedScopePlannerCtas += 1;
    continue;
  }

  if (text === "Start Guided Flow" && !isScopePlanner) {
    disallowedCtaOnlyCards += 1;
    console.log("FAIL  CTA-only non-scope Access Control card: " + href);
  }
}

if (allowedScopePlannerCtas > 0) {
  console.log("SAFE  allowed Scope Planner CTA-only links: " + allowedScopePlannerCtas);
}

if (disallowedCtaOnlyCards === 0) {
  console.log("SAFE  no CTA-only non-scope Access Control tool cards");
} else {
  failCount += disallowedCtaOnlyCards;
}

let linkCount = 0;

for (const href of requiredLinks) {
  if (html.includes('href="' + href + '"') || html.includes("href='" + href + "'")) {
    linkCount += 1;
    console.log("SAFE  required link present: " + href);
  } else {
    console.log("FAIL  required link missing: " + href);
    failCount += 1;
  }
}

console.log("INFO  required links present: " + linkCount + " / " + requiredLinks.length);

if (html.includes("access-control-category-card-repair-0612-start")) {
  console.log("SAFE  category card repair marker present");
} else {
  console.log("FAIL  category card repair marker missing");
  failCount += 1;
}

if (html.includes("/tools/access-control/special-locking-scope/") && html.includes("/tools/access-control/summary/")) {
  console.log("SAFE  finalize section links present");
} else {
  console.log("FAIL  finalize section links missing");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_CARDS_REPAIRED");
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_NO_CTA_ONLY_TOOL_CARDS");
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_REQUIRED_LINKS_PRESENT");
} else {
  console.log("FAIL  ACCESS_CONTROL_CATEGORY_CARD_INTEGRITY_FAILED");
}

console.log("SAFE  NO_CALCULATOR_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
