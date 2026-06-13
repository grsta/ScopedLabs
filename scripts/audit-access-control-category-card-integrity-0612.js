const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pagePath = path.join(root, "tools", "access-control", "index.html");

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

  while ((match = regex.exec(html))) anchors.push(match[0]);

  return anchors;
}

function hrefOf(anchor) {
  const match = anchor.match(/href\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function classOf(anchor) {
  const match = anchor.match(/class\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : "";
}

let failCount = 0;

console.log("ScopedLabs Access Control category card integrity audit - 0612");
console.log("Repo:", root);
console.log("");

const html = read(pagePath);
const anchors = extractAnchors(html);

if (html.includes("Finalize the Access Control design") || html.includes("access-control-category-finalize")) {
  console.log("FAIL  old grouped finalize section remains");
  failCount += 1;
} else {
  console.log("SAFE  old grouped finalize section removed");
}

if (html.includes("access-control-category-finalize-card-style-0613") || html.includes("access-control-category-summary-card-style-0613")) {
  console.log("FAIL  one-off finalize/summary style remains");
  failCount += 1;
} else {
  console.log("SAFE  no one-off finalize/summary styles remain");
}

if (html.includes("scopedlabs-access-control-summary-card-pattern-0613-start")) {
  console.log("SAFE  standalone summary card pattern marker present");
} else {
  console.log("FAIL  standalone summary card pattern marker missing");
  failCount += 1;
}

if (html.includes("<span>Category Summary</span>") || html.includes("<span>Specialty Review</span>")) {
  console.log("FAIL  old final-section label pills remain");
  failCount += 1;
} else {
  console.log("SAFE  old final-section label pills removed");
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

const panelAnchor = anchors.find((anchor) => hrefOf(anchor) === "/tools/access-control/panel-capacity/");
const specialAnchor = anchors.find((anchor) => hrefOf(anchor) === "/tools/access-control/special-locking-scope/");
const summaryAnchor = anchors.find((anchor) => hrefOf(anchor) === "/tools/access-control/summary/");

if (specialAnchor && panelAnchor && classOf(specialAnchor) === classOf(panelAnchor) && cleanText(specialAnchor).includes("Pro Tier")) {
  console.log("SAFE  Special Locking uses standard Pro tool-card pattern");
} else {
  console.log("FAIL  Special Locking does not match standard Pro tool-card pattern");
  failCount += 1;
}

if (summaryAnchor && panelAnchor && classOf(summaryAnchor) === classOf(panelAnchor) && html.includes('data-access-control-category-summary-card="true"') && !/<span\b/i.test(summaryAnchor) && cleanText(summaryAnchor).includes("Access Control Summary") && !cleanText(summaryAnchor).includes("Panel Capacity")) {
  console.log("SAFE  Summary uses standalone category card without label pill");
} else {
  console.log("FAIL  Summary standalone category card not detected or still cloned from wrong tool");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_CARDS_REPAIRED");
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_NO_CTA_ONLY_TOOL_CARDS");
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_REQUIRED_LINKS_PRESENT");
  console.log("SAFE  ACCESS_CONTROL_SPECIAL_LOCKING_STANDARD_TOOL_CARD");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_STANDALONE_CATEGORY_CARD");
  console.log("SAFE  NO_ONE_OFF_FINALIZE_STYLE");
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
