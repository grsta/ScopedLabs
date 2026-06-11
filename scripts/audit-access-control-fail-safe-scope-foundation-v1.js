const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
}

const html = read("tools/access-control/fail-safe-fail-secure/index.html");
const script = read("tools/access-control/fail-safe-fail-secure/script.js");

check("Fail-Safe cache bumped to final shell polish lane", html.includes("access-control-fail-safe-fail-secure-preview-print-batch-001") && html.includes("./script.js?v=access-control-fail-safe-fail-secure-preview-print-batch-001"));
check("Fail-Safe loads Access Scope state", html.includes("/assets/access-control-scope-state.js"));
check("Active scope context card exists", html.includes('id="activeAccessScopeCard"') && html.includes("access-scope-context-card"));
check("Script tracks active scope elements", script.includes("activeScopeCard") && script.includes("activeScopeMeta"));
check("Script reads active Access Scope", script.includes("function getActiveAccessScope()") && script.includes("ScopedLabsAccessControlScopeState"));
check("Script renders active scope context", script.includes("function renderActiveScopeContext()") && script.includes("Power Intent") && script.includes("Authority Review"));
check("Script writes Fail-Safe result to scope ledger", script.includes("function publishFailSafeResultToScopeLedger") && script.includes("completedTools[STEP]"));
check("Calculation carries active scope into pipeline result", script.includes("activeScope: activeScope ?") && script.includes("requiresAuthorityReview"));
check("Report payload includes scope context", script.includes("scopeContext: scopeContextForReport(core.activeScope)") && script.includes("<h2>Active Scope Context</h2>") && script.includes("scopeRows ||"));
check("Access Control status language is used", script.includes('return "AUTHORITY REVIEW"') && script.includes('return "COMPLETE"') && !script.includes('return "HEALTHY"'));
check("Existing export buttons remain wired", html.includes('id="exportReport"') && html.includes('id="saveSnapshot"'));
check("Continue route remains Reader Type", html.includes('id="continue"') && html.includes("Reader Type") && script.includes('/tools/access-control/reader-type-selector/'));

console.log("\nAccess Control Fail-Safe scope foundation audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
