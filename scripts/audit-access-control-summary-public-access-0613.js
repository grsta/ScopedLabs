const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryPath = path.join(root, "tools", "access-control", "index.html");
const summaryPath = path.join(root, "tools", "access-control", "summary", "index.html");

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
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

  while ((match = regex.exec(String(html || "")))) {
    const block = match[0];
    const hrefMatch = block.match(/href\s*=\s*["\']([^"\']+)["\']/i);
    const classMatch = block.match(/class\s*=\s*["\']([^"\']+)["\']/i);

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

function bodyTag(html) {
  const match = String(html || "").match(/<body\b[^>]*>/i);
  return match ? match[0] : "";
}

function isSummaryAnchorSafe(anchor) {
  return anchor &&
    anchor.href === "/tools/access-control/summary/" &&
    !hasClass(anchor, "pro") &&
    !anchor.block.includes("data-tool=") &&
    !anchor.block.includes("lock-icon") &&
    !anchor.text.includes("Pro Tier");
}

let failCount = 0;

console.log("ScopedLabs Access Control summary public access audit - 0613");
console.log("Repo:", root);
console.log("");

const categoryHtml = read(categoryPath);
const summaryHtml = read(summaryPath);
const anchors = extractAnchors(categoryHtml);
const summaryAnchors = anchors.filter((anchor) => anchor.href === "/tools/access-control/summary/");
const body = bodyTag(summaryHtml);

if (summaryAnchors.length > 0) {
  console.log("SAFE  Summary landing link exists");
  console.log("INFO  Summary link count: " + summaryAnchors.length);
} else {
  console.log("FAIL  Summary landing link missing");
  failCount += 1;
}

const unsafeSummaryAnchors = summaryAnchors.filter((anchor) => !isSummaryAnchorSafe(anchor));

if (summaryAnchors.length > 0 && unsafeSummaryAnchors.length === 0) {
  console.log("SAFE  All Summary category links are public and not Pro-gated");
} else {
  console.log("FAIL  One or more Summary category links still look Pro-gated");
  unsafeSummaryAnchors.forEach((anchor, index) => {
    console.log("INFO  unsafe summary anchor " + (index + 1) + ": class=" + anchor.className + " text=" + anchor.text);
  });
  failCount += 1;
}

if (summaryAnchors.some((anchor) => hasClass(anchor, "tool-row"))) {
  console.log("SAFE  Summary card row remains present");
} else {
  console.log("FAIL  Summary card row missing");
  failCount += 1;
}

if (summaryAnchors.some((anchor) => anchor.block.includes('data-guided-flow-terminal="summary"'))) {
  console.log("SAFE  Guided Flow Summary terminal remains present");
} else {
  console.log("INFO  Guided Flow Summary terminal not found on category page");
}

if (/data-tier\s*=\s*["\']public["\']/i.test(body)) {
  console.log("SAFE  Summary page body tier is public");
} else {
  console.log("FAIL  Summary page body tier is not public");
  failCount += 1;
}

if (!/data-protected\s*=/i.test(body)) {
  console.log("SAFE  Summary page has no page-level protected marker");
} else {
  console.log("FAIL  Summary page still has page-level protected marker");
  failCount += 1;
}

if (!/data-tier\s*=\s*["\']pro["\']/i.test(body)) {
  console.log("SAFE  Summary page body is not marked Pro");
} else {
  console.log("FAIL  Summary page body is still marked Pro");
  failCount += 1;
}

if (/data-summary-public\s*=\s*["\']true["\']/i.test(body)) {
  console.log("SAFE  Summary page declares public summary role");
} else {
  console.log("FAIL  Summary page missing public summary role marker");
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PUBLIC_ACCESS_CURRENT");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_PAGE_NOT_PRO_GATED");
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_LINKS_NOT_PRO_GATED");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_PUBLIC_ACCESS_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
