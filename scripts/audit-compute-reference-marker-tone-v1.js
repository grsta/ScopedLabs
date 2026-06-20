const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function extractChartFill(source, className) {
  const token = "." + className;
  const start = source.indexOf(token);
  if (start === -1) return "";
  const blockStart = source.indexOf("{", start);
  const blockEnd = source.indexOf("}", blockStart);
  if (blockStart === -1 || blockEnd === -1) return "";
  const block = source.slice(blockStart, blockEnd);
  const fillMatch = block.match(/fill\s*:\s*([^;\n}]+)/i);
  return fillMatch ? fillMatch[1].trim() : "";
}

let pass = 0;
let fail = 0;

function check(id, ok, file, detail) {
  if (ok) pass += 1;
  else fail += 1;
  console.log("[" + (ok ? "PASS" : "FAIL") + "] " + id);
  console.log("  " + file);
  console.log("  " + detail);
}

console.log("SCOPEDLABS COMPUTE REFERENCE MARKER TONE AUDIT V1\n");

const visual = read("assets/scopedlabs-compute-capacity-visuals.js");
const css = read("assets/scopedlabs-compute-result-visuals.css");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

const demandColor = extractChartFill(visual, "legend-current");
const reserveColor = extractChartFill(visual, "legend-growth");
const validationColor = extractChartFill(visual, "legend-failover");

check(
  "CHART_FOOTNOTE_COLORS_ARE_DISCOVERABLE",
  !!demandColor && !!reserveColor && !!validationColor,
  "assets/scopedlabs-compute-capacity-visuals.js",
  "Shared Compute capacity visual module must expose chart footnote fill colors through legend-current, legend-growth, and legend-failover."
);

check(
  "CSS_MARKER_TONES_MATCH_CHART_FOOTNOTE_COLORS",
  css.includes("--compute-reference-marker-demand: " + demandColor + ";") &&
    css.includes("--compute-reference-marker-reserve: " + reserveColor + ";") &&
    css.includes("--compute-reference-marker-validation: " + validationColor + ";"),
  "assets/scopedlabs-compute-result-visuals.css",
  "Recommendation References marker variables must exactly match chart footnote colors from the shared visual module."
);

check(
  "REFERENCE_TABLE_MARKER_ROWS_USE_TONE_SELECTORS",
  css.includes(".compute-recommendation-references-table tbody tr:nth-child(1) td:first-child") &&
    css.includes(".compute-recommendation-references-table tbody tr:nth-child(2) td:first-child") &&
    css.includes(".compute-recommendation-references-table tbody tr:nth-child(3) td:first-child"),
  "assets/scopedlabs-compute-result-visuals.css",
  "Recommendation References table marker-number cells must receive demand/reserve/downstream tone selectors."
);

check(
  "REFERENCE_MARKER_TONE_CLASSES_EXIST_FOR_MODULE_RENDERERS",
  css.includes(".compute-reference-marker--demand") &&
    css.includes(".compute-reference-marker--reserve") &&
    css.includes(".compute-reference-marker--validation"),
  "assets/scopedlabs-compute-result-visuals.css",
  "Shared renderers may use semantic marker tone classes without page-local CSS."
);

check(
  "MODULE_MAP_RECORDS_REFERENCE_MARKER_TONE_CONTRACT",
  moduleMap.includes("### Compute reference marker tone contract") &&
    moduleMap.includes("audit-compute-reference-marker-tone-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document the shared marker tone contract and audit."
);

check(
  "BATCH_RUNNER_INCLUDES_REFERENCE_MARKER_TONE_AUDIT",
  batch.includes("scripts/audit-compute-reference-marker-tone-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "Closeout batch runner must include the reference marker tone audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
