const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "landing-page-chrome-polish-audit-002-homepage-story-sync";
const LANDING_STYLE_CACHE = "landing-card-button-polish-v2-001";
const HOMEPAGE_STYLE_CACHE = "homepage-product-story-014-proof-card-final-width";

function file(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(file(rel));
}

function read(rel) {
  const target = file(rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function listDirs(rel) {
  const dir = file(rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.posix.join(rel.replace(/\\/g, "/"), entry.name));
}

function walkGuideIndexes(rel) {
  const dir = file(rel);
  if (!fs.existsSync(dir)) return [];

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const childRel = path.posix.join(rel.replace(/\\/g, "/"), entry.name);
    if (entry.isDirectory()) {
      const indexRel = path.posix.join(childRel, "index.html");
      if (exists(indexRel)) out.push(indexRel);
      out.push(...walkGuideIndexes(childRel));
    }
  }
  return Array.from(new Set(out));
}

const rows = [];

function countClassToken(html, token) {
  const re = /\bclass\s*=\s*(["'])(.*?)\1/g;
  let count = 0;
  let match;
  while ((match = re.exec(html))) {
    const classes = match[2].split(/\s+/).filter(Boolean);
    if (classes.includes(token)) count += 1;
  }
  return count;
}


function add(page, id, status, detail) {
  rows.push({ page, id, status, detail });
}

function has(page, id, source, signal) {
  const ok = source.includes(signal);
  add(page, id, ok ? "SAFE" : "FAIL", ok ? "contains " + signal : "missing " + signal);
}

const targetFiles = [];

if (exists("index.html")) targetFiles.push("index.html");
if (exists("tools/index.html")) targetFiles.push("tools/index.html");
if (exists("guides/index.html")) targetFiles.push("guides/index.html");

for (const dir of listDirs("tools")) {
  const indexRel = path.posix.join(dir, "index.html");
  if (exists(indexRel)) targetFiles.push(indexRel);
}

for (const rel of walkGuideIndexes("guides")) {
  targetFiles.push(rel);
}

const uniqueTargets = Array.from(new Set(targetFiles));
const style = read("assets/style.css");

has("assets/style.css", "chrome-style-marker", style, LANDING_STYLE_CACHE);
has("assets/style.css", "homepage-style-marker", style, HOMEPAGE_STYLE_CACHE);
has("assets/style.css", "chrome-body-scope", style, "body.landing-chrome-polish");
has("assets/style.css", "primary-button-scope", style, "body.landing-chrome-polish .btn-primary");
has("assets/style.css", "button-padding", style, "padding: 10px 16px !important;");

for (const rel of uniqueTargets) {
  const html = read(rel);
    const navTabCount = countClassToken(html, "nav-tab");
  const expectedCache = rel === "index.html" ? HOMEPAGE_STYLE_CACHE : LANDING_STYLE_CACHE;

  has(rel, "landing-body-class", html, "landing-chrome-polish");
  has(rel, "style-cache", html, "/assets/style.css?v=" + expectedCache);
  has(rel, "chrome-marker", html, expectedCache);
  has(rel, "nav-tabs-present", html, "nav-tabs");

  add(
    rel,
    "nav-tab-count",
    navTabCount >= 5 ? "SAFE" : "FAIL",
    "found " + navTabCount + " nav-tab links"
  );

  add(
    rel,
    "no-legacy-nav-link-primary",
    !html.includes('class="nav-link is-active"') ? "SAFE" : "FAIL",
    !html.includes('class="nav-link is-active"')
      ? "no active legacy nav-link pattern"
      : "legacy nav-link active pattern still present"
  );
}

const categoryFiles = uniqueTargets.filter((rel) => /^tools\/[^/]+\/index\.html$/.test(rel));

for (const rel of categoryFiles) {
  const slug = rel.split("/")[1];
  const html = read(rel);

  add(
    rel,
    "category-data-attribute",
    html.includes('data-category="' + slug + '"') ? "SAFE" : "FAIL",
    html.includes('data-category="' + slug + '"')
      ? "data-category preserved"
      : "data-category missing"
  );

  add(
    rel,
    "upgrade-checkout-preserved",
    html.includes("/upgrade/?category=" + slug + "#checkout") ? "SAFE" : "FAIL",
    html.includes("/upgrade/?category=" + slug + "#checkout")
      ? "upgrade checkout route preserved"
      : "upgrade checkout route missing"
  );
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Landing Page Chrome Polish Audit");
console.log("Version:", VERSION);
console.log("Landing/guide files checked:", uniqueTargets.length);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
