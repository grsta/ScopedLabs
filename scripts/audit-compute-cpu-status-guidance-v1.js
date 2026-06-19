const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const checks = [];
function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

const html = read("tools/compute/cpu-sizing/index.html");
const script = read("tools/compute/cpu-sizing/script.js");

check(
  "CPU_STATUS_CHIPS_ARE_COMPACT_BOXES",
  html.includes("CPU STATUS GUIDANCE CONTRACT 0618") &&
    html.includes(".scopedlabs-result-summary-status,") &&
    html.includes(".compute-cpu-proof-status-chip") &&
    html.includes("border-radius: 5px") &&
    html.includes("width: fit-content"),
  "tools/compute/cpu-sizing/index.html",
  "CPU status chips should render as compact engineering boxes instead of wide rounded pills."
);

check(
  "CPU_RECOMMENDED_ACTIONS_CARD_EXISTS",
  html.includes('id="computeCpuRecommendedActionsCard"') &&
    html.includes('id="computeCpuRecommendedActions"') &&
    html.includes("Recommended Actions"),
  "tools/compute/cpu-sizing/index.html",
  "CPU page should include a Recommended Actions proof card."
);

check(
  "CPU_BUILDS_RECOMMENDED_ACTIONS",
  script.includes("function buildComputeCpuRecommendedActions(result)") &&
    script.includes("Increase CPU capacity before continuing") &&
    script.includes("Validate CPU margin before procurement") &&
    script.includes("Continue to RAM sizing, but keep CPU flagged"),
  "tools/compute/cpu-sizing/script.js",
  "CPU script should generate practical corrective actions for Risk/Watch/Good results."
);

check(
  "CPU_EXPORT_USES_ENVELOPE_STATUS_AUTHORITY",
  script.includes("function computeCpuAuthoritativeExportStatus") &&
    script.includes("source.envelopeStatus") &&
    script.includes("resultOutputs.envelopeStatus") &&
    script.includes("const status = computeCpuAuthoritativeExportStatus(result, outputs);"),
  "tools/compute/cpu-sizing/script.js",
  "CPU export header status should use the CPU Capacity Envelope authority before generic status fallbacks."
);

check(
  "CPU_EXPORT_INCLUDES_RECOMMENDED_ACTIONS",
  script.includes("function buildComputeCpuRecommendedActionsExportSection(result)") &&
    script.includes("buildComputeCpuRecommendedActionsExportSection(result)") &&
    script.includes('title: "Recommended Actions"'),
  "tools/compute/cpu-sizing/script.js",
  "CPU export should include Recommended Actions."
);

check(
  "CPU_OUTPUT_ROWS_INCLUDE_STATUS",
  script.includes('{ label: "Status", value: finalCpuStatus }'),
  "tools/compute/cpu-sizing/script.js",
  "CPU calculated outputs should include the authoritative envelope status row."
);

check(
  "CPU_CACHE_BUSTED_FOR_STATUS_GUIDANCE",
  html.includes("script.js?v=compute-cpu-status-guidance-0618"),
  "tools/compute/cpu-sizing/index.html",
  "CPU page should load the status/guidance script version."
);

console.log("SCOPEDLABS COMPUTE CPU STATUS GUIDANCE AUDIT V1\n");

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.id);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.id);
  }

  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
