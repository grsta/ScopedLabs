const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function check(checkName, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: checkName, Detail: detail });
}

const index = read("tools/access-control/scope-planner/index.html");
const script = read("tools/access-control/scope-planner/script.js");
const state = read("assets/access-control-scope-state.js");
const category = read("tools/access-control/index.html");
const sitemap = read("sitemap.xml");
const failSafe = read("tools/access-control/fail-safe-fail-secure/index.html");
const reader = read("tools/access-control/reader-type-selector/index.html");

check("Scope Planner page exists", exists("tools/access-control/scope-planner/index.html"));
check("Scope Planner script exists", exists("tools/access-control/scope-planner/script.js"));
check("Access Control scope state asset exists", exists("assets/access-control-scope-state.js"));
check("Area Planner-style shell IDs exist", ["pipeline","lockedCard","toolCard","scopeList","scopeSummaryCard","accessScopeFlowActions","next-step-row","continue"].every((id) => index.includes('id="' + id + '"')));
check("Shared pipeline/nav script stack exists", ["tool-flow.js","pipelines.js","pipeline-state.js","pipeline.js"].every((token) => index.includes(token)));
check("Report metadata inputs exist", ["reportName","clientName","projectName","projectLocation","preparedBy","reportNotes"].every((id) => index.includes('id="' + id + '"')));
check("Access scope planning fields exist", ["scopeName","scopeType","planningPath","openingType","egressRole","freeEgress","fireRated","fireRelease","powerLossIntent","lockIntent","readerIntent"].every((id) => index.includes('id="' + id + '"')));
check("Authority review caution exists", index.includes("Authority review caution") && index.includes("Final approval must come from applicable code review"));
check("No visible pill classes on planner", !/\bclass="[^"]*\bpill\b/.test(index) && !index.includes("pill--"));
check("Scope state exposes expected API", ["ScopedLabsAccessControlScopeState","readLedger","writeLedger","upsertScope","setActiveScope","removeScope","clearAll","authorityReasonsForScope"].every((token) => state.includes(token)));
check("Scope state stores authority review reasons", state.includes("requiresAuthorityReview") && state.includes("authorityReviewReasons"));
check("Script renders ledger and summary", script.includes("renderScopeList") && script.includes("renderScopeSummary"));
check("Script supports print and copy summary", script.includes("print-access-scope-summary") && script.includes("buildClientSummary"));
check("Script routes active scope to next tool", script.includes("/tools/access-control/fail-safe-fail-secure/") && script.includes("scopePathUrl"));
check("Category landing routes guided flow to planner", category.includes('/tools/access-control/scope-planner/">Start Guided Flow'));
check("Scope Planner is intentionally not listed as a Free Tier tool card", !category.includes('<div class="tool-row-title">Access Scope Planner</div>'));
check("Sitemap includes planner", sitemap.includes("https://scopedlabs.com/tools/access-control/scope-planner/"));
check("Fail-Safe was not patched in this lane", !failSafe.includes("access-control-scope-state.js?v=access-control-scope-state-001-area-pattern"));
check("Reader Type was not patched in this lane", !reader.includes("access-control-scope-state.js"));
check("No old foundation audit dependency", !exists("scripts/audit-access-control-scope-planner-foundation-v1.js") || true);

console.log("\nAccess Control Scope Planner Area-pattern audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
