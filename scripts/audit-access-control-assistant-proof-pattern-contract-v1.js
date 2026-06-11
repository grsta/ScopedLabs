const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  visual: "assets/access-control-planning-visuals.js",
  adapter: "assets/access-control-tool-assistant-adapters.js",
  output: "assets/access-control-output-shell.js",
  html: "tools/access-control/fail-safe-fail-secure/index.html",
  script: "tools/access-control/fail-safe-fail-secure/script.js"
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function parses(text) {
  try {
    new Function(text);
    return true;
  } catch {
    return false;
  }
}

let failed = false;
const rows = [];

function check(label, ok) {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label });
  if (!ok) failed = true;
}

const visual = read(files.visual);
const adapter = read(files.adapter);
const output = read(files.output);
const html = read(files.html);
const script = read(files.script);

check("Assistant proof visual module parses", parses(visual));
check("Assistant proof adapter module parses", parses(adapter));
check("Assistant proof output shell parses", parses(output));

check("Visual contract exposes assistant proof pattern", visual.includes("getAssistantProofPatternContract") && visual.includes("validateAssistantProofPatternModel") && visual.includes("buildAssistantProofPatternAttributes"));
check("Visual contract requires two proof layers", visual.includes("entered-conditions") && visual.includes("assistant-recommendation"));
check("Visual contract requires plain *1/*2/*3 markers", visual.includes("*1") && visual.includes("*2") && visual.includes("*3") && visual.includes("plain-text"));
check("Visual contract documents status split", visual.includes("localDecisionStatus") && visual.includes("carriedReviewFlag") && visual.includes("noOverwriteRule"));

check("Output shell exposes assistant proof export helper", output.includes("buildAssistantProofReferencesSection") && output.includes("normalizeAssistantProofExportReferences"));
check("Output shell contract owns status split", output.includes("ASSISTANT_PROOF_OUTPUT_CONTRACT") && output.includes("overwriteAllowed: false"));
check("Output shell Recommendation References columns are fixed", output.includes('headers: ["Marker", "Reference", "Reason"]'));

check("Adapter exposes assistant proof formatter and contract", adapter.includes("formatAssistantProofReferences") && adapter.includes("getAssistantProofAdapterContract"));
check("Fail-Safe adapter opts into assistant proof pattern", adapter.includes('"fail-safe-fail-secure"') && adapter.includes("assistantProofPattern: getAssistantProofAdapterContract().defaultToolOptIn"));

check("Fail-Safe HTML declares assistant proof opt-in", html.includes('data-assistant-proof-pattern="access-control-assistant-proof-visual-pattern"'));
check("Fail-Safe script uses shared assistant proof export bridge", script.includes("getAssistantProofReferenceExportSection") && script.includes("buildAssistantProofReferencesSection"));
check("Fail-Safe report carries assistant proof pattern", script.includes('assistantProofPattern: "access-control-assistant-proof-visual-pattern"'));
check("Fail-Safe separates local status from carried scope review", script.includes("Scope Review Flag") && script.includes("scopeReviewStatus") && !script.includes('activeScope && activeScope.requiresAuthorityReview) return "AUTHORITY REVIEW"'));
check("Fail-Safe assistant markers remain decorated", script.includes("decorateFailSafeAssistantMarkers") && html.includes("access-fail-safe-ref-marker"));
check("Fail-Safe current script cache is contract lane", html.includes("./script.js?v=access-control-fail-safe-fail-secure-preview-print-batch-001") && script.includes("access-control-fail-safe-fail-secure-preview-print-batch-001"));

console.log("\nAccess Control assistant proof pattern contract audit:");
console.table(rows);

console.log("\nSummary:");
console.log("- SAFE: " + rows.filter((row) => row.Status === "SAFE").length);
console.log("- FAIL: " + rows.filter((row) => row.Status === "FAIL").length);

if (failed) process.exit(1);
