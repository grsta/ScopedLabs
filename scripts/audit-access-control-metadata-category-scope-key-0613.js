const fs = require("fs");
const path = require("path");

const root = process.cwd();
const metadataPath = path.join(root, "assets", "scopedlabs-report-metadata.js");
const pages = [
  "tools\\access-control\\access-level-sizing\\index.html",
  "tools\\access-control\\anti-passback-zones\\index.html",
  "tools\\access-control\\credential-format\\index.html",
  "tools\\access-control\\door-cable-length\\index.html",
  "tools\\access-control\\door-count-planner\\index.html",
  "tools\\access-control\\elevator-reader-count\\index.html",
  "tools\\access-control\\fail-safe-fail-secure\\index.html",
  "tools\\access-control\\lock-power-budget\\index.html",
  "tools\\access-control\\panel-capacity\\index.html",
  "tools\\access-control\\reader-type-selector\\index.html",
  "tools\\access-control\\scope-planner\\index.html",
  "tools\\access-control\\special-locking-scope\\index.html",
  "tools\\access-control\\summary\\index.html"
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

let failCount = 0;

console.log("ScopedLabs Access Control metadata category-scope key audit - 0613");
console.log("Repo:", root);
console.log("");

const metadata = read(metadataPath);

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(metadata, "metadata helper", "scopedlabs-report-metadata-008-access-control-category-scope-key");
requireMarker(metadata, "metadata helper", "function accessControlCategoryMetadataKey");
requireMarker(metadata, "metadata helper", 'PAGE_STORAGE_PREFIX + "/tools/access-control/"');
requireMarker(metadata, "metadata helper", "const categoryKey = accessControlCategoryMetadataKey();");
requireMarker(metadata, "metadata helper", "return categoryKey + \"#access-scope:\" + encodeURIComponent(scope.accessControlScopeId);");

if (metadata.includes("return legacyKey + \"#access-scope:\"")) {
  console.log("FAIL  Access Control metadata still uses page-specific legacy key");
  failCount += 1;
} else {
  console.log("SAFE  Access Control metadata no longer uses page-specific key");
}

for (const rel of pages) {
  const html = read(path.join(root, rel));

  if (html.includes("scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-008-access-control-category-scope-key")) {
    console.log("SAFE  metadata cache current: " + rel);
  } else {
    console.log("FAIL  metadata cache stale: " + rel);
    failCount += 1;
  }
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_METADATA_CARRIES_ACROSS_TOOLS_BY_SCOPE");
  console.log("SAFE  ACCESS_CONTROL_METADATA_CATEGORY_SCOPE_KEY_READY");
} else {
  console.log("FAIL  ACCESS_CONTROL_METADATA_CATEGORY_SCOPE_KEY_FAILED");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
