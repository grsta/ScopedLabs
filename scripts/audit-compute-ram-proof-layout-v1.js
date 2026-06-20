const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function exists(file) {
  return fs.existsSync(file);
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

function functionBody(text, name) {
  const start = text.indexOf("function " + name);
  if (start === -1) return "";
  const next = text.indexOf("\n  function ", start + 10);
  return text.slice(start, next === -1 ? text.length : next);
}

console.log("SCOPEDLABS COMPUTE RAM PROOF LAYOUT AUDIT V1\n");

const assistant = read("assets/scopedlabs-compute-assistant-contract.js");
const ramHtml = read("tools/compute/ram-sizing/index.html");
const ramScript = read("tools/compute/ram-sizing/script.js");
const css = read("assets/scopedlabs-compute-result-visuals.css");

const ramTopCard = functionBody(assistant, "renderComputeRamTopSummaryCard");
const ramRefs = functionBody(assistant, "renderComputeRamRecommendationReferences");

check(
  "RAM_TOP_ASSISTANT_DOES_NOT_OWN_DETAILED_REFERENCE_ROWS",
  ramTopCard &&
    !ramTopCard.includes("*1 Demand basis") &&
    !ramTopCard.includes("*2 Reserve pressure") &&
    !ramTopCard.includes("*3 Downstream validation"),
  "assets/scopedlabs-compute-assistant-contract.js",
  "RAM top assistant card must stay compact. Detailed *1/*2/*3 explanations belong in the references card below the chart."
);

check(
  "RAM_RECOMMENDATION_REFERENCES_RENDERER_EXISTS",
  ramRefs.includes("compute-recommendation-references-table") &&
    ramRefs.includes("*1") &&
    ramRefs.includes("*2") &&
    ramRefs.includes("*3"),
  "assets/scopedlabs-compute-assistant-contract.js",
  "Shared Compute assistant contract must own the RAM recommendation references table renderer."
);

check(
  "RAM_REFERENCES_CARD_IS_BELOW_VISUAL_CARD",
  ramHtml.indexOf("computeRamVisualCard") !== -1 &&
    ramHtml.indexOf("computeRamReferencesCard") !== -1 &&
    ramHtml.indexOf("computeRamVisualCard") < ramHtml.indexOf("computeRamReferencesCard"),
  "tools/compute/ram-sizing/index.html",
  "RAM Recommendation References card must render below the RAM Capacity Envelope card."
);

check(
  "RAM_SCRIPT_RENDERS_REFERENCES_AFTER_ASSISTANT_AND_VISUAL",
  ramScript.indexOf("renderRamCapacityVisual(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamAssistant(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamReferences(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamCapacityVisual(ramCapacityEnvelope);") < ramScript.indexOf("renderRamReferences(ramCapacityEnvelope);"),
  "tools/compute/ram-sizing/script.js",
  "RAM script must render the references card from the same ramCapacityEnvelope payload after the visual is rendered."
);

check(
  "RAM_REFERENCES_CLEAR_ON_INVALIDATE",
  ramScript.includes("clearRamReferences();") &&
    ramScript.indexOf("clearRamReferences();") < ramScript.indexOf("ScopedLabsAnalyzer.invalidate"),
  "tools/compute/ram-sizing/script.js",
  "RAM references should clear when inputs invalidate the result."
);

check(
  "SHARED_COMPUTE_CSS_USES_NORMAL_GREEN_PANEL_NOT_BLUE_PANEL",
  exists("assets/scopedlabs-compute-result-visuals.css") &&
    css.includes("rgba(42, 169, 93") &&
    !css.includes("rgba(15, 23, 42, 0.94)") &&
    css.includes(".compute-recommendation-references-card") &&
    css.includes(".compute-recommendation-references-table"),
  "assets/scopedlabs-compute-result-visuals.css",
  "Shared Compute assistant/proof styling should use the normal dark-green ScopedLabs panel style and include references-card/table styles."
);


check(
  "RAM_RECOMMENDED_ACTIONS_RENDERER_EXISTS",
  assistant.includes("function renderComputeRamRecommendedActions") &&
    assistant.includes("compute-recommended-actions-list") &&
    assistant.includes("renderRamRecommendedActions: renderComputeRamRecommendedActions"),
  "assets/scopedlabs-compute-assistant-contract.js",
  "Shared Compute assistant contract must own the RAM recommended actions renderer."
);

check(
  "RAM_RECOMMENDED_ACTIONS_CARD_IS_BELOW_REFERENCES_AND_ABOVE_EXPORT",
  ramHtml.indexOf("computeRamReferencesCard") !== -1 &&
    ramHtml.indexOf("computeRamRecommendedActionsCard") !== -1 &&
    ramHtml.indexOf("Export Report") !== -1 &&
    ramHtml.indexOf("computeRamReferencesCard") < ramHtml.indexOf("computeRamRecommendedActionsCard") &&
    ramHtml.indexOf("computeRamRecommendedActionsCard") < ramHtml.indexOf("Export Report"),
  "tools/compute/ram-sizing/index.html",
  "RAM Recommended Actions card must render below Recommendation References and above Export Report."
);

check(
  "RAM_SCRIPT_RENDERS_ACTIONS_AFTER_REFERENCES",
  ramScript.indexOf("renderRamReferences(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamRecommendedActions(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamReferences(ramCapacityEnvelope);") < ramScript.indexOf("renderRamRecommendedActions(ramCapacityEnvelope);"),
  "tools/compute/ram-sizing/script.js",
  "RAM script must render Recommended Actions after Recommendation References from the same ramCapacityEnvelope payload."
);

check(
  "RAM_RECOMMENDED_ACTIONS_CLEAR_ON_INVALIDATE",
  ramScript.includes("clearRamRecommendedActions();") &&
    ramScript.indexOf("clearRamRecommendedActions();") < ramScript.indexOf("ScopedLabsAnalyzer.invalidate"),
  "tools/compute/ram-sizing/script.js",
  "RAM Recommended Actions should clear when inputs invalidate the result."
);

check(
  "SHARED_COMPUTE_CSS_OWNS_RECOMMENDED_ACTIONS_CARD",
  css.includes(".compute-recommended-actions-card") &&
    css.includes(".compute-recommended-actions-list") &&
    css.includes(".compute-recommended-action"),
  "assets/scopedlabs-compute-result-visuals.css",
  "Shared Compute CSS must own RAM Recommended Actions card/list styling."
);

check(
  "RAM_DECISION_SCHEDULE_RENDERER_EXISTS",
  assistant.includes("function renderComputeRamDecisionSchedule") &&
    assistant.includes("compute-decision-schedule-table") &&
    assistant.includes("renderRamDecisionSchedule: renderComputeRamDecisionSchedule"),
  "assets/scopedlabs-compute-assistant-contract.js",
  "Shared Compute assistant contract must own the RAM decision schedule renderer."
);


check(
  "RAM_DECISION_SCHEDULE_STATUS_VALUE_IS_COLORED_BADGE",
  assistant.includes("function ramDecisionScheduleValueCell") &&
    assistant.includes("row.metric === \"Status\"") &&
    assistant.includes("scopedlabs-result-summary-status") &&
    assistant.includes("ramDecisionStatusClass(status)") &&
    ramHtml.includes("compute-assistant-ram-decision-status-badge-0620"),
  "assets/scopedlabs-compute-assistant-contract.js",
  "RAM Decision Schedule Status value must render as the colored engineering badge class, matching the CPU decision schedule visual contract."
);
check(
  "RAM_DECISION_SCHEDULE_CARD_IS_BELOW_ACTIONS_AND_ABOVE_EXPORT",
  ramHtml.indexOf("computeRamRecommendedActionsCard") !== -1 &&
    ramHtml.indexOf("computeRamDecisionScheduleCard") !== -1 &&
    ramHtml.indexOf("Export Report") !== -1 &&
    ramHtml.indexOf("computeRamRecommendedActionsCard") < ramHtml.indexOf("computeRamDecisionScheduleCard") &&
    ramHtml.indexOf("computeRamDecisionScheduleCard") < ramHtml.indexOf("Export Report"),
  "tools/compute/ram-sizing/index.html",
  "RAM Decision Schedule card must render below Recommended Actions and above Export Report."
);

check(
  "RAM_SCRIPT_RENDERS_DECISION_SCHEDULE_AFTER_ACTIONS",
  ramScript.indexOf("renderRamRecommendedActions(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamDecisionSchedule(ramCapacityEnvelope);") !== -1 &&
    ramScript.indexOf("renderRamRecommendedActions(ramCapacityEnvelope);") < ramScript.indexOf("renderRamDecisionSchedule(ramCapacityEnvelope);"),
  "tools/compute/ram-sizing/script.js",
  "RAM script must render Decision Schedule after Recommended Actions from the same ramCapacityEnvelope payload."
);

check(
  "RAM_DECISION_SCHEDULE_CLEAR_ON_INVALIDATE",
  ramScript.includes("clearRamDecisionSchedule();") &&
    ramScript.indexOf("clearRamDecisionSchedule();") < ramScript.indexOf("ScopedLabsAnalyzer.invalidate"),
  "tools/compute/ram-sizing/script.js",
  "RAM Decision Schedule should clear when inputs invalidate the result."
);

check(
  "SHARED_COMPUTE_CSS_OWNS_DECISION_SCHEDULE_CARD",
  css.includes(".compute-decision-schedule-card") &&
    css.includes(".compute-decision-schedule-table") &&
    css.includes(".compute-decision-schedule-status"),
  "assets/scopedlabs-compute-result-visuals.css",
  "Shared Compute CSS must own RAM Decision Schedule card/table styling."
);
check(
  "RAM_CACHE_BUSTS_PROOF_LAYOUT_ASSETS",
  ramHtml.includes("scopedlabs-compute-result-visuals.css?v=scopedlabs-compute-result-visuals-0620-") &&
    ramHtml.includes("scopedlabs-compute-assistant-contract.js?v=compute-assistant-ram-") &&
    ramHtml.includes("./script.js?v=compute-ram-"),
  "tools/compute/ram-sizing/index.html",
  "RAM page should cache-bust CSS, assistant contract, and local script using the active Compute RAM proof-stack version families."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
