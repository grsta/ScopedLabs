const fs = require("fs");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

function check(label, ok, detail) {
  console.log((ok ? "PASS" : "FAIL") + "  " + label);
  if (detail) console.log("      " + detail);
  if (!ok) failures += 1;
}

let failures = 0;

const adapter = read("assets/scopedlabs-compute-planner-adapter.js");
const page = read("tools/compute/workload-planner/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");

console.log("Compute Workload Planner Metadata Placement Audit V1");
console.log("");

check(
  "ADAPTER_HAS_METADATA_BOTTOM_MOVER",
  adapter.includes("function moveReportMetadataToBottom()"),
  "assets/scopedlabs-compute-planner-adapter.js"
);

check(
  "METADATA_MOVES_AFTER_SCOPE_SUMMARY_CARD",
  adapter.includes("summary.parentNode.insertBefore(metadata, summary.nextSibling)") &&
    adapter.includes("data-compute-metadata-placement"),
  "metadata section must be moved directly after scopeSummaryCard"
);

check(
  "MOVER_RUNS_AFTER_SHELL_RENDER_BEFORE_CACHE",
  adapter.includes("Shell.render(mount, config);\n    moveReportMetadataToBottom();\n    cacheEls();"),
  "metadata placement must happen before cacheEls binds the generated IDs"
);

check(
  "WORKLOAD_PLANNER_CACHE_BUSTS_METADATA_BOTTOM",
  page.includes("scopedlabs-compute-planner-adapter-014-metadata-bottom"),
  "tools/compute/workload-planner/index.html"
);

check(
  "MODULE_MAP_DOCUMENTS_METADATA_BOTTOM",
  moduleMap.includes("Compute workload planner metadata placement"),
  "docs/scopedlabs-module-map.md"
);

console.log("");
console.log("SUMMARY");
console.log("PASS: " + (5 - failures));
console.log("FAIL: " + failures);
console.log("OVERALL: " + (failures ? "FAIL" : "PASS"));

process.exit(failures ? 1 : 0);
