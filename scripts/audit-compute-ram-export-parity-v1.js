const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
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

function sectionOpen(html, id) {
  const needle = '<section id="' + id + '"';
  const start = html.indexOf(needle);
  if (start === -1) return "";
  const end = html.indexOf(">", start);
  return end === -1 ? "" : html.slice(start, end + 1);
}

console.log("SCOPEDLABS COMPUTE RAM EXPORT PARITY AUDIT V1\n");

const ramHtml = read("tools/compute/ram-sizing/index.html");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const exportJs = read("assets/export.js");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

const ramSections = [
  ["computeRamVisualCard", "RAM Capacity Envelope"],
  ["computeRamReferencesCard", "Recommendation References"],
  ["computeRamRecommendedActionsCard", "Recommended Actions"],
  ["computeRamDecisionScheduleCard", "RAM Capacity Decision Schedule"]
];

const cpuSections = [
  ["computeCpuVisualCard", "CPU Capacity Envelope"],
  ["computeCpuRecommendationReferencesCard", "Recommendation References"],
  ["computeCpuRecommendedActionsCard", "Recommended Actions"],
  ["computeCpuDecisionScheduleCard", "CPU Capacity Decision Schedule"]
];

check(
  "CPU_EXPORT_PROOF_STACK_BASELINE_PRESENT",
  cpuSections.every(([id, title]) => {
    const open = sectionOpen(cpuHtml, id);
    return open.includes('data-export-section="true"') &&
      open.includes('data-export-title="' + title + '"');
  }),
  "tools/compute/cpu-sizing/index.html",
  "CPU baseline must keep export-aware proof cards for visual, references, actions, and decision schedule."
);

for (const [id, title] of ramSections) {
  const open = sectionOpen(ramHtml, id);
  check(
    "RAM_EXPORT_SECTION_" + id.replace(/^computeRam/, "").replace(/Card$/, "").toUpperCase(),
    open.includes('data-export-section="true"') &&
      open.includes('data-export-title="' + title + '"'),
    "tools/compute/ram-sizing/index.html",
    "RAM proof card " + id + " must be marked as an export section titled " + title + "."
  );
}

check(
  "RAM_EXPORT_PROOF_STACK_ORDER_MATCHES_CPU_PATTERN",
  ramHtml.indexOf("computeRamVisualCard") !== -1 &&
    ramHtml.indexOf("computeRamReferencesCard") !== -1 &&
    ramHtml.indexOf("computeRamRecommendedActionsCard") !== -1 &&
    ramHtml.indexOf("computeRamDecisionScheduleCard") !== -1 &&
    ramHtml.indexOf("Export Report") !== -1 &&
    ramHtml.indexOf("computeRamVisualCard") < ramHtml.indexOf("computeRamReferencesCard") &&
    ramHtml.indexOf("computeRamReferencesCard") < ramHtml.indexOf("computeRamRecommendedActionsCard") &&
    ramHtml.indexOf("computeRamRecommendedActionsCard") < ramHtml.indexOf("computeRamDecisionScheduleCard") &&
    ramHtml.indexOf("computeRamDecisionScheduleCard") < ramHtml.indexOf("Export Report"),
  "tools/compute/ram-sizing/index.html",
  "RAM export proof stack order must be Capacity Envelope, Recommendation References, Recommended Actions, Decision Schedule, then Export Report."
);

check(
  "SHARED_EXPORT_EXTRA_SECTION_SELECTOR_PRESENT",
  exportJs.includes('extraSectionSelector: "[data-export-section]"'),
  "assets/export.js",
  "Shared export engine must still collect data-export-section proof cards."
);

check(
  "MODULE_MAP_RECORDS_RAM_EXPORT_PARITY",
  moduleMap.includes("### Compute RAM export proof parity") &&
    moduleMap.includes("audit-compute-ram-export-parity-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document RAM export proof parity and audit ownership."
);

check(
  "BATCH_RUNNER_INCLUDES_RAM_EXPORT_PARITY_AUDIT",
  batch.includes("scripts/audit-compute-ram-export-parity-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "Closeout batch runner must include the RAM export parity audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
