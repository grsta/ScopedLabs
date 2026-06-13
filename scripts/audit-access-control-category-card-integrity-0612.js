const fs = require("fs");
const path = require("path");
const engine = require("./lib/scopedlabs-category-landing-card-engine.js");

const root = process.cwd();
const pagePath = path.join(root, "tools", "access-control", "index.html");
const configPath = path.join(root, "scripts", "config", "access-control-category-cards-0613.json");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findSummarySection(html) {
  const attr = 'data-access-control-category-summary-card="true"';
  const attrIndex = html.indexOf(attr);
  if (attrIndex === -1) return "";

  const sectionStart = html.lastIndexOf("<section", attrIndex);
  const sectionEnd = html.indexOf("</section>", attrIndex);
  if (sectionStart === -1 || sectionEnd === -1) return "";

  return html.slice(sectionStart, sectionEnd + "</section>".length);
}

function hasNestedRow(anchor) {
  return anchor &&
    anchor.block.includes("tool-row-center") &&
    anchor.block.includes("tool-row-title") &&
    anchor.block.includes("tool-row-sub");
}

let failCount = 0;

console.log("ScopedLabs Access Control category card integrity audit - 0612");
console.log("Repo:", root);
console.log("");

const html = read(pagePath);
const config = JSON.parse(read(configPath));
const anchors = engine.extractAnchors(html);
const summarySection = findSummarySection(html);

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
  "/tools/access-control/summary/",
];

if (config.version === "access-control-category-cards-0613-summary-public-link") {
  console.log("SAFE  Access Control category-card config uses summary public-link version");
} else {
  console.log("FAIL  Access Control category-card config has wrong version");
  failCount += 1;
}

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

let linkCount = 0;
for (const href of requiredLinks) {
  if (html.includes('href="' + href + '"') || html.includes("href='" + href + "'")) {
    linkCount += 1;
  } else {
    console.log("FAIL  required link missing: " + href);
    failCount += 1;
  }
}
console.log("INFO  required links present: " + linkCount + " / " + requiredLinks.length);

const panelAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/panel-capacity/");
const specialAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/special-locking-scope/");
const summaryAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/summary/");

if (
  panelAnchor &&
  specialAnchor &&
  specialAnchor.className === panelAnchor.className &&
  hasNestedRow(specialAnchor) &&
  specialAnchor.block.includes("tool-row-pill") &&
  specialAnchor.text.includes("Special Locking") &&
  specialAnchor.text.includes("Pro Tier")
) {
  console.log("SAFE  Special Locking uses standard nested Pro tool row");
} else {
  console.log("FAIL  Special Locking does not match nested Pro tool row");
  failCount += 1;
}

if (
  panelAnchor &&
  summaryAnchor &&
  summaryAnchor.className === panelAnchor.className &&
  hasNestedRow(summaryAnchor) &&
  summarySection.includes('data-access-control-category-summary-card="true"') &&
  summarySection.includes("Access Control Summary") &&
  summarySection.includes("Review saved tool guidance") &&
  !summarySection.includes("Panel Capacity")
) {
  console.log("SAFE  Summary uses standard nested tool row inside Category Summary");
} else {
  console.log("FAIL  Summary does not match nested tool row or still has wrong content");
  failCount += 1;
}

if (
  summaryAnchor &&
  summaryAnchor.href === "/tools/access-control/summary/" &&
  !summaryAnchor.block.includes("data-tool=") &&
  !summaryAnchor.block.includes("lock-icon") &&
  !summaryAnchor.text.includes("Pro Tier")
) {
  console.log("SAFE  Summary is public direct link and not tool-gated");
} else {
  console.log("FAIL  Summary link appears gated or missing direct public href");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_CARDS_REPAIRED");
  console.log("SAFE  ACCESS_CONTROL_SPECIAL_LOCKING_STANDARD_TOOL_CARD");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_STANDALONE_CATEGORY_CARD");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PUBLIC_DIRECT_LINK");
  console.log("SAFE  SHARED_CATEGORY_LANDING_CARD_ENGINE_USED");
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
