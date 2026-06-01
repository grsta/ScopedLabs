const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "category-landing-cleanup-audit-003-landing-chrome-sync";

const categories = [
  "access-control",
  "compute",
  "infrastructure",
  "network",
  "performance",
  "physical-security",
  "power",
  "thermal",
  "video-storage",
  "wireless"
];

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function attributeTargets(html) {
  const out = [];
  const re = /\b(?:href|data-tool|data-guide)\s*=\s*["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(html))) {
    out.push(match[1]);
  }
  return Array.from(new Set(out));
}

const rows = [];

function add(page, id, status, detail) {
  rows.push({ page, id, status, detail });
}

function has(page, id, source, signal) {
  const ok = source.includes(signal);
  add(page, id, ok ? "SAFE" : "FAIL", ok ? "contains " + signal : "missing " + signal);
}

for (const slug of categories) {
  const rel = "tools/" + slug + "/index.html";
  const html = read(rel);
  const attrs = attributeTargets(html);
  const acceptedMarker = slug === "physical-security"
    ? "physical-security-landing-cleanup-001"
    : "category-landing-cleanup-001";

  const toolTargets = attrs.filter((url) => url.startsWith("/tools/" + slug + "/"));
  const guideTargets = attrs.filter((url) => url.startsWith("/guides/"));

  has(slug, "cleanup-marker", html, acceptedMarker);
  has(slug, "landing-chrome-class", html, "landing-chrome-polish");
  has(slug, "landing-chrome-style-cache", html, "/assets/style.css?v=landing-page-chrome-polish-001");
  has(slug, "hide-crumbs-selector", html, ".page-head .crumbs");
  has(slug, "hide-tool-row-pills-selector", html, ".tool-row-pill");
  has(slug, "card-heading-reset", html, "margin-top: 0 !important;");
  has(slug, "tool-row-height", html, "min-height: 104px;");

  add(
    slug,
    "category-tool-targets",
    toolTargets.length >= 1 ? "SAFE" : "FAIL",
    "found " + toolTargets.length + " unique /tools/" + slug + "/ target(s)"
  );

  add(
    slug,
    "planning-guide-target",
    guideTargets.length >= 1 ? "SAFE" : "FAIL",
    "found " + guideTargets.length + " guide target(s): " + (guideTargets.join(", ") || "-")
  );

  add(
    slug,
    "upgrade-checkout-target",
    html.includes("/upgrade/?category=" + slug + "#checkout") ? "SAFE" : "FAIL",
    html.includes("/upgrade/?category=" + slug + "#checkout")
      ? "upgrade checkout target preserved"
      : "upgrade checkout target missing"
  );

  add(
    slug,
    "auth-category-attribute",
    html.includes('data-category="' + slug + '"') ? "SAFE" : "FAIL",
    html.includes('data-category="' + slug + '"')
      ? "data-category preserved"
      : "data-category missing"
  );
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Category Landing Cleanup Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
