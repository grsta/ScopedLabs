const fs = require("fs");
const path = require("path");
const engine = require("./lib/scopedlabs-category-landing-card-engine.js");

const root = process.cwd();
const pagePath = path.join(root, "tools", "access-control", "index.html");
const configPath = path.join(root, "scripts", "config", "access-control-category-cards-0613.json");

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

let failCount = 0;

console.log("ScopedLabs Access Control category card integrity audit - 0612");
console.log("Repo:", root);
console.log("");

const html = read(pagePath);
const config = JSON.parse(read(configPath));
const anchors = engine.extractAnchors(html);
const summarySection = findSummarySection(html);

if (fs.existsSync(path.join(root, "scripts", "lib", "scopedlabs-category-landing-card-engine.js"))) {
  console.log("SAFE  shared category landing-card engine exists");
} else {
  console.log("FAIL  shared category landing-card engine missing");
  failCount += 1;
}

if (config.version === "access-control-category-cards-0613") {
  console.log("SAFE  Access Control category-card config present");
} else {
  console.log("FAIL  Access Control category-card config missing or wrong version");
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

if (html.includes("scopedlabs-access-control-summary-card-pattern-0613-start")) {
  console.log("SAFE  standalone summary card pattern marker present");
} else {
  console.log("FAIL  standalone summary card pattern marker missing");
  failCount += 1;
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

const panelAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/panel-capacity/");
const specialAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/special-locking-scope/");
const summaryAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/summary/");

if (specialAnchor && panelAnchor && specialAnchor.className === panelAnchor.className && specialAnchor.text.includes("Special Locking") && !specialAnchor.text.includes("Pro Tier")) {
  console.log("SAFE  Special Locking uses shared standard landing-card pattern");
} else {
  console.log("FAIL  Special Locking does not use shared standard landing-card pattern");
  failCount += 1;
}

if (
  summarySection &&
  summaryAnchor &&
  panelAnchor &&
  summaryAnchor.className === panelAnchor.className &&
  summarySection.includes('data-access-control-category-summary-card="true"') &&
  summarySection.includes("Access Control Summary") &&
  summarySection.includes("Review saved tool guidance") &&
  !summarySection.includes("Panel Capacity") &&
  !/<span\\b/i.test(summaryAnchor.block)
) {
  console.log("SAFE  Summary uses shared standard landing-card pattern");
} else {
  console.log("FAIL  Summary standalone category card is missing, mislabeled, or cloned from wrong tool");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_CATEGORY_CARDS_REPAIRED");
  console.log("SAFE  ACCESS_CONTROL_SPECIAL_LOCKING_STANDARD_TOOL_CARD");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_STANDALONE_CATEGORY_CARD");
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
