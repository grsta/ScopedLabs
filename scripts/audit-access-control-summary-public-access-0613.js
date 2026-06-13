const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryPath = path.join(root, "tools", "access-control", "index.html");
const summaryPath = path.join(root, "tools", "access-control", "summary", "index.html");
const configPath = path.join(root, "scripts", "config", "access-control-category-cards-0613.json");

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
    const block = match[0];
    const hrefMatch = block.match(/href\s*=\s*["']([^"']+)["']/i);
    const classMatch = block.match(/class\s*=\s*["']([^"']+)["']/i);

    anchors.push({
      href: hrefMatch ? hrefMatch[1] : "",
      className: classMatch ? classMatch[1] : "",
      text: cleanText(block),
      block,
    });
  }

  return anchors;
}

function hasClass(anchor, className) {
  return anchor && anchor.className.split(/\s+/).filter(Boolean).includes(className);
}

let failCount = 0;

console.log("ScopedLabs Access Control summary public access audit - 0613");
console.log("Repo:", root);
console.log("");

const categoryHtml = read(categoryPath);
const summaryHtml = read(summaryPath);
const config = JSON.parse(read(configPath));
const anchors = extractAnchors(categoryHtml);
const summaryAnchor = anchors.find((anchor) => anchor.href === "/tools/access-control/summary/");
const bodyMatch = summaryHtml.match(/<body\b[^>]*>/i);
const bodyTag = bodyMatch ? bodyMatch[0] : "";

if (summaryAnchor) {
  console.log("SAFE  Summary landing link exists");
} else {
  console.log("FAIL  Summary landing link missing");
  failCount += 1;
}

if (
  summaryAnchor &&
  summaryAnchor.href === "/tools/access-control/summary/" &&
  hasClass(summaryAnchor, "tool-row") &&
  !hasClass(summaryAnchor, "pro") &&
  !summaryAnchor.block.includes("data-tool=") &&
  !summaryAnchor.block.includes("lock-icon") &&
  !summaryAnchor.text.includes("Pro Tier")
) {
  console.log("SAFE  Summary landing link is public and not Pro-gated");
} else {
  console.log("FAIL  Summary landing link still looks Pro-gated");
  failCount += 1;
}

if (bodyTag && /data-tier\s*=\s*["']public["']/i.test(bodyTag)) {
  console.log("SAFE  Summary page body tier is public");
} else {
  console.log("FAIL  Summary page body tier is not public");
  failCount += 1;
}

if (bodyTag && !/data-tier\s*=\s*["']pro["']/i.test(bodyTag)) {
  console.log("SAFE  Summary page body is not marked Pro");
} else {
  console.log("FAIL  Summary page body is still marked Pro");
  failCount += 1;
}

if (bodyTag && /data-summary-public\s*=\s*["']true["']/i.test(bodyTag)) {
  console.log("SAFE  Summary page declares public summary role");
} else {
  console.log("FAIL  Summary page missing public summary role marker");
  failCount += 1;
}

const summaryConfig = Array.isArray(config.summaryCards)
  ? config.summaryCards.find((card) => card.href === "/tools/access-control/summary/")
  : null;

if (
  summaryConfig &&
  summaryConfig.publicDirectLink === true &&
  summaryConfig.className === "tool-row" &&
  !summaryConfig.dataTool &&
  !summaryConfig.tier &&
  summaryConfig.useLockIcon === false
) {
  console.log("SAFE  Summary config declares public direct row");
} else {
  console.log("FAIL  Summary config does not declare public direct row");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PUBLIC_SIGNED_OUT_PATH");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PAGE_NOT_PRO_GATED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_LINK_NOT_PRO_GATED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_PUBLIC_ACCESS_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
