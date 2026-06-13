const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pagePath = path.join(root, "tools", "access-control", "index.html");
const configPath = path.join(root, "scripts", "config", "access-control-category-cards-0613.json");
const toolsRoot = path.join(root, "tools", "access-control");

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

console.log("ScopedLabs Access Control guided-flow terminal audit - 0613");
console.log("Repo:", root);
console.log("");

const html = read(pagePath);
const config = JSON.parse(read(configPath));
const anchors = extractAnchors(html);

const terminalAnchor = anchors.find((anchor) =>
  anchor.href === "/tools/access-control/summary/" &&
  anchor.text.includes("Summary / Report")
);

if (config.guidedFlow && config.guidedFlow.version === "access-control-guided-flow-terminal-0613") {
  console.log("SAFE  Guided Flow terminal config exists");
} else {
  console.log("FAIL  Guided Flow terminal config missing");
  failCount += 1;
}

if (html.includes("GUIDED DESIGN FLOW") && html.includes("Access Scope") && html.includes("Access Levels")) {
  console.log("SAFE  Core Guided Flow sequence remains present");
} else {
  console.log("FAIL  Core Guided Flow sequence missing");
  failCount += 1;
}

if (terminalAnchor) {
  console.log("SAFE  Summary / Report appears as Guided Flow terminal endpoint");
} else {
  console.log("FAIL  Summary / Report terminal endpoint missing from Guided Flow card");
  failCount += 1;
}

if (
  terminalAnchor &&
  terminalAnchor.href === "/tools/access-control/summary/" &&
  terminalAnchor.block.includes('data-guided-flow-terminal="summary"') &&
  !terminalAnchor.block.includes("data-tool=") &&
  !terminalAnchor.block.includes("lock-icon") &&
  !hasClass(terminalAnchor, "pro") &&
  !terminalAnchor.text.includes("Pro Tier")
) {
  console.log("SAFE  Guided Flow Summary terminal is public direct link");
} else {
  console.log("FAIL  Guided Flow Summary terminal looks gated or mislabeled");
  failCount += 1;
}

const childDirs = fs.readdirSync(toolsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => slug !== "summary");

let leakedToToolPages = [];

for (const slug of childDirs) {
  const childIndex = path.join(toolsRoot, slug, "index.html");
  if (!fs.existsSync(childIndex)) continue;

  const childHtml = read(childIndex);

  if (childHtml.includes('data-guided-flow-terminal="summary"')) {
    leakedToToolPages.push(slug);
  }
}

if (leakedToToolPages.length === 0) {
  console.log("SAFE  Summary terminal was not added to tool-page pipeline nav");
} else {
  console.log("FAIL  Summary terminal leaked into tool pages: " + leakedToToolPages.join(", "));
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_GUIDED_FLOW_SUMMARY_TERMINAL");
  console.log("SAFE  SUMMARY_TERMINAL_CATEGORY_PAGE_ONLY");
  console.log("SAFE  SUMMARY_TERMINAL_PUBLIC_DIRECT_LINK");
} else {
  console.log("FAIL  ACCESS_CONTROL_GUIDED_FLOW_TERMINAL_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
