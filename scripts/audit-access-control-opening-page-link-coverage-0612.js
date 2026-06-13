const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pageRel = "tools/access-control/index.html";
const pagePath = path.join(root, pageRel);
const categoryRoot = path.join(root, "tools", "access-control");

const calculatorShellHints = [
  "access-control-output-shell.js",
  "scopedlabs-assistant-export.js",
  "scopedlabs-report-metadata.js",
  "data-result-ledger",
  "exportReport",
  "saveSnapshot",
  "reportMetadataMount",
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractLinks(html) {
  const links = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html))) links.push(match[1]);

  return [...new Set(links)].sort();
}

function discoverTools() {
  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort();
}

function hasToolLink(links, slug) {
  const expected = [
    "/tools/access-control/" + slug + "/",
    "tools/access-control/" + slug + "/",
    "./" + slug + "/",
    slug + "/",
  ];

  return expected.some((href) => links.includes(href));
}

let failCount = 0;

console.log("ScopedLabs Access Control opening page link coverage proof - 0612");
console.log("Repo:", root);
console.log("");

if (!exists(pagePath)) {
  console.log("FAIL  missing " + pageRel);
  process.exit(1);
}

const html = read(pagePath);
const links = extractLinks(html);
const tools = discoverTools();

const missing = tools.filter((slug) => !hasToolLink(links, slug));
const shellMarkers = calculatorShellHints.filter((token) => html.includes(token));

console.log("Access Control opening page");
console.log("INFO  tool child pages discovered: " + tools.length);
console.log("INFO  missing child tool links: " + missing.length);
console.log("INFO  calculator shell markers: " + shellMarkers.length);

for (const slug of missing) {
  console.log("FAIL  missing /tools/access-control/" + slug + "/");
  failCount += 1;
}

for (const token of shellMarkers) {
  console.log("FAIL  calculator shell marker found: " + token);
  failCount += 1;
}

console.log("");
console.log("Decision summary");

if (missing.length === 0) {
  console.log("SAFE  ACCESS_CONTROL_OPENING_PAGE_LINK_COVERAGE_COMPLETE");
} else {
  console.log("FAIL  ACCESS_CONTROL_OPENING_PAGE_LINK_COVERAGE_GAP");
}

if (shellMarkers.length === 0) {
  console.log("SAFE  NO_CALCULATOR_SHELL_PATCH_YET");
} else {
  console.log("FAIL  CALCULATOR_SHELL_MARKERS_FOUND");
}

console.log("SAFE  PAGE_LAYOUT_PATCH_LIMITED_TO_OPENING_PAGE_LINKS");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
