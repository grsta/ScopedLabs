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
  "RAM_CACHE_BUSTS_PROOF_LAYOUT_ASSETS",
  ramHtml.includes("scopedlabs-compute-result-visuals-0620-ram-proof-layout") &&
    ramHtml.includes("compute-assistant-ram-proof-layout-0620") &&
    ramHtml.includes("compute-ram-proof-layout-0620"),
  "tools/compute/ram-sizing/index.html",
  "RAM page should cache-bust CSS, assistant contract, and local script after the proof layout change."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
