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

const flowIdx = html.indexOf('id="accessControlFlowActions"');
const nextIdx = html.indexOf('id="next-step-row"');
const continueIdx = html.indexOf('id="continue"');
const exportIdx = html.indexOf("Export Report");

check("Fail-Safe cache bumped to shell modules lane", html.includes("access-control-fail-safe-fail-secure-preview-print-batch-001") && html.includes("./script.js?v=access-control-fail-safe-fail-secure-preview-print-batch-001"));
check("Tool shell helper is loaded", html.includes("/assets/scopedlabs-tool-shell.js"));
check("Flow action row remains before Export Report", flowIdx >= 0 && exportIdx > flowIdx);
check("Back action remains visible", html.includes('href="/tools/access-control/"') && html.includes("Back to Access Control"));
check("Shell next-step row exists", nextIdx > flowIdx && html.includes('id="next-step-row"'));
check("Continue button keeps standard ID", continueIdx > nextIdx && html.includes('id="continue"'));
check("Old continue-wrap removed", !html.includes('id="continue-wrap"') && !script.includes("continueWrap"));
check("Script tracks next-step row", script.includes('nextStepRow: $("next-step-row")'));
check("Shared Back/Continue shell enhancer is called", script.includes("applyBackContinueShell") && script.includes('rowId: "accessControlFlowActions"'));
check("Show/hide continue behavior remains", script.includes('els.nextStepRow.style.display = "flex"') && script.includes('els.nextStepRow.style.display = "none"'));
check("Continue still routes to Reader Type", script.includes('/tools/access-control/reader-type-selector/'));
check("Visible status card remains", html.includes('id="failSafeStatusCard"') && script.includes("renderVisibleDecisionStatus"));
check("Compact status legend remains", html.includes('id="failSafeStatusLegend"') && html.includes("Authority Review"));
check("Export controls remain wired", html.includes('id="exportReport"') && html.includes('id="saveSnapshot"'));
check("Stale duplicate flow CSS removed", !html.includes("access-fail-safe-flow-actions-004") && !html.includes("access-fail-safe-flow-before-export-005"));

console.log("\nAccess Control Fail-Safe shell module audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
