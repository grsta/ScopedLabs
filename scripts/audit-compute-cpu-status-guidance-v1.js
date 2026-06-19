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

const payloadStart = script.indexOf("function buildComputeCpuExportPayload");
const payloadEnd = payloadStart >= 0 ? script.indexOf("window.ScopedLabsComputeCpuExport", payloadStart) : -1;
const payloadBlock = payloadStart >= 0 && payloadEnd > payloadStart ? script.slice(payloadStart, payloadEnd) : "";

check(
  "CPU_RECOMMENDED_ACTIONS_CARD_EXISTS",
  html.includes('id="computeCpuRecommendedActionsCard"') &&
    html.includes('id="computeCpuRecommendedActions"') &&
    html.includes("Recommended Actions"),
  "tools/compute/cpu-sizing/index.html",
  "CPU page should include a Recommended Actions card."
);


check(
  "CPU_RECOMMENDED_ACTIONS_DOM_EXPORT_VISIBLE",
  html.includes('id="computeCpuRecommendedActionsCard"') &&
    html.includes('data-compute-cpu-recommended-actions-card data-export-section="true" data-export-title="Recommended Actions"'),
  "tools/compute/cpu-sizing/index.html",
  "Recommended Actions must be visible to the fallback DOM export scanner."
);

check(
  "CPU_RECOMMENDED_ACTIONS_DOM_EXPORT_ORDER",
  html.indexOf('id="computeCpuRecommendationReferencesCard"') >= 0 &&
    html.indexOf('id="computeCpuRecommendedActionsCard"') > html.indexOf('id="computeCpuRecommendationReferencesCard"') &&
    html.indexOf('id="computeCpuDecisionScheduleCard"') > html.indexOf('id="computeCpuRecommendedActionsCard"'),
  "tools/compute/cpu-sizing/index.html",
  "Fallback DOM export order should be Recommendation References, Recommended Actions, then CPU Capacity Decision Schedule."
);

check(
  "CPU_RECOMMENDED_ACTIONS_RENDER_OPTIONALLY",
  script.includes("function buildComputeCpuRecommendedActions(result)") &&
    script.includes("actionsCard && actionsTarget") &&
    script.includes("buildComputeCpuRecommendedActionsHtml(buildComputeCpuRecommendedActions(result))"),
  "tools/compute/cpu-sizing/script.js",
  "Recommended Actions should render if the card exists without blocking Recommendation References or Decision Schedule."
);

check(
  "CPU_PROOF_SECTIONS_STAY_INDEPENDENT",
  script.includes("if (!result || !scheduleCard || !scheduleTarget || !referencesCard || !referencesTarget) return false;") &&
    !script.includes("!actionsCard || !actionsTarget) return false"),
  "tools/compute/cpu-sizing/script.js",
  "Existing proof sections must not depend on Recommended Actions mount."
);

check(
  "CPU_EXPORT_RECOMMENDED_ACTIONS_HELPER_EXISTS",
  script.includes("function buildComputeCpuRecommendedActionsExportSection(result)") &&
    script.includes('title: "Recommended Actions"') &&
    script.includes('headers: ["Action", "Reason"]'),
  "tools/compute/cpu-sizing/script.js",
  "CPU custom export payload should have a Recommended Actions export section helper."
);

check(
  "CPU_EXPORT_PAYLOAD_INCLUDES_RECOMMENDED_ACTIONS",
  payloadBlock.includes("buildComputeCpuReferenceExportSection(result)") &&
    payloadBlock.includes("buildComputeCpuRecommendedActionsExportSection(result)") &&
    payloadBlock.includes("buildComputeCpuDecisionScheduleExportSection()") &&
    payloadBlock.indexOf("buildComputeCpuReferenceExportSection(result)") < payloadBlock.indexOf("buildComputeCpuRecommendedActionsExportSection(result)") &&
    payloadBlock.indexOf("buildComputeCpuRecommendedActionsExportSection(result)") < payloadBlock.indexOf("buildComputeCpuDecisionScheduleExportSection()") &&
    payloadBlock.includes('exportSectionsContract: "cpu-references-actions-schedule"'),
  "tools/compute/cpu-sizing/script.js",
  "CPU custom export payload should pass Recommendation References, Recommended Actions, then CPU Capacity Decision Schedule."
);

check(
  "CPU_EXPORT_USES_ENVELOPE_STATUS_AUTHORITY",
  script.includes("function computeCpuAuthoritativeExportStatus") &&
    script.includes("const status = computeCpuAuthoritativeExportStatus(result, outputs);"),
  "tools/compute/cpu-sizing/script.js",
  "CPU export status should use envelope authority first."
);

check(
  "CPU_CACHE_BUSTED_FOR_GUIDANCE_EXPORT",
  html.includes("script.js?v=compute-cpu-guidance-export-0618b"),
  "tools/compute/cpu-sizing/index.html",
  "CPU page should load the guidance-export script version."
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
