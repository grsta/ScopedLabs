const fs = require("fs");
const path = require("path");

const root = process.cwd();
const accessRoot = path.join(root, "tools", "access-control");
const activeSlugs = [
  "access-level-sizing",
  "anti-passback-zones",
  "credential-format",
  "door-cable-length",
  "door-count-planner",
  "elevator-reader-count",
  "fail-safe-fail-secure",
  "lock-power-budget",
  "panel-capacity",
  "reader-type-selector",
  "special-locking-scope"
];
const skippedSlugs = [
  "scope-planner"
];

let failCount = 0;

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

console.log("ScopedLabs Access Control user tool notes placement audit - 0614");
console.log("Repo:", root);
console.log("");

const asset = read(path.join(root, "assets", "access-control-user-tool-notes.js"));
requireMarker(asset, "shared asset", "access-control-user-tool-notes-002-export-card-placement");
requireMarker(asset, "shared asset", ".access-control-user-tool-notes-inline");
requireMarker(asset, "shared asset", "scopedlabs:access-control:user-tool-notes:");

activeSlugs.forEach((slug) => {
  const html = read(path.join(accessRoot, slug, "index.html"));
  const mountIndex = html.indexOf("data-access-control-user-tool-notes");
  const exportIndex = html.search(/Export Report|Final Report Export|Documentation\s*&\s*Export/i);
  const footerIndex = html.search(/<footer\b/i);

  requireMarker(html, slug, "class=\"access-control-user-tool-notes-inline\"");
  requireMarker(html, slug, "data-access-control-user-tool-notes");
  requireMarker(html, slug, "/assets/access-control-user-tool-notes.js?v=access-control-user-tool-notes-002-export-card-placement");

  if (/class=["']card access-control-user-tool-notes-card["']/i.test(html)) {
    console.log("FAIL  " + slug + " still has old standalone card class");
    failCount += 1;
  } else {
    console.log("SAFE  " + slug + " old standalone card removed");
  }

  if (mountIndex !== -1 && exportIndex !== -1 && mountIndex > exportIndex) {
    console.log("SAFE  " + slug + " user notes mount is inside/after export card heading");
  } else {
    console.log("FAIL  " + slug + " user notes mount is not placed with export card");
    failCount += 1;
  }

  if (footerIndex !== -1 && mountIndex > footerIndex) {
    console.log("FAIL  " + slug + " user notes mount appears after footer");
    failCount += 1;
  } else {
    console.log("SAFE  " + slug + " user notes mount is before footer");
  }
});

skippedSlugs.forEach((slug) => {
  const html = read(path.join(accessRoot, slug, "index.html"));

  if (html.includes("data-access-control-user-tool-notes") || html.includes("/assets/access-control-user-tool-notes.js")) {
    console.log("FAIL  " + slug + " should be skipped but still has user tool notes mount/asset");
    failCount += 1;
  } else {
    console.log("SAFE  " + slug + " skipped because it has no export/report tool card");
  }
});

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  USER_TOOL_NOTES_NOW_LIVE_INSIDE_EXPORT_CARD_AREA");
  console.log("SAFE  SCOPE_PLANNER_SKIPPED_FOR_USER_TOOL_NOTES");
  console.log("SAFE  OLD_AFTER_FOOTER_CARD_REMOVED");
} else {
  console.log("FAIL  USER_TOOL_NOTES_PLACEMENT_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
