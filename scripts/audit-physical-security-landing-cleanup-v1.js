const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-landing-cleanup-audit-002-data-tool-links";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function targetPresent(source, url) {
  return source.includes('href="' + url + '"') ||
    source.includes('data-tool="' + url + '"') ||
    source.includes('data-guide="' + url + '"') ||
    source.includes("data-tool='" + url + "'") ||
    source.includes("data-guide='" + url + "'");
}

const index = read("tools/physical-security/index.html");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("cleanup-marker", "Physical Security index", index, "physical-security-landing-cleanup-001");
has("hide-crumbs", "Physical Security index", index, ".page-head .crumbs");
has("hide-direct-card-pill", "Physical Security index", index, "main > section.card > .pill");
has("hide-pill-row", "Physical Security index", index, "main > section.card > .pill-row");
has("hide-tool-row-pill", "Physical Security index", index, ".tool-row-pill");
has("tight-page-head", "Physical Security index", index, "padding-top: 12px;");
has("card-heading-reset", "Physical Security index", index, "margin-top: 0 !important;");
has("tool-row-title-spacing", "Physical Security index", index, ".tool-row-title");
has("tool-row-sub-spacing", "Physical Security index", index, ".tool-row-sub");
has("tool-row-height", "Physical Security index", index, "min-height: 104px;");

[
  "/tools/physical-security/area-planner/",
  "/guides/physical-security-planning/",
  "/tools/physical-security/field-of-view/",
  "/tools/physical-security/mounting-height/",
  "/tools/physical-security/pixel-density/",
  "/tools/physical-security/blind-spot-check/",
  "/tools/physical-security/camera-coverage-area/",
  "/tools/physical-security/camera-spacing/",
  "/tools/physical-security/face-recognition-range/",
  "/tools/physical-security/lens-selection/",
  "/tools/physical-security/license-plate-range/",
  "/tools/physical-security/scene-illumination/"
].forEach((url) => {
  const ok = targetPresent(index, url);
  add(
    "target-" + url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    ok ? "SAFE" : "FAIL",
    ok ? "Physical Security index contains target " + url : "Physical Security index missing target " + url
  );
});

add(
  "upgrade-links-preserved",
  index.includes('/upgrade/?category=physical-security#checkout') ? "SAFE" : "FAIL",
  index.includes('/upgrade/?category=physical-security#checkout')
    ? "Upgrade checkout links preserved"
    : "Upgrade checkout links missing"
);

add(
  "auth-data-attributes-preserved",
  index.includes('data-category="physical-security"') && index.includes('data-upgrade-href="/upgrade/?category=physical-security#checkout"') ? "SAFE" : "FAIL",
  index.includes('data-category="physical-security"') && index.includes('data-upgrade-href="/upgrade/?category=physical-security#checkout"')
    ? "Protected tool auth data attributes preserved"
    : "Protected tool auth data attributes missing"
);

add(
  "html-css-only",
  !index.includes("physical-security-landing-cleanup-script") ? "SAFE" : "FAIL",
  "Landing cleanup is inline CSS only"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Landing Cleanup Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
