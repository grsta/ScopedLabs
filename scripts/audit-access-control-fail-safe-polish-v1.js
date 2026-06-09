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
const continueWrapIdx = html.indexOf('id="continue-wrap"');
const continueBtnIdx = html.indexOf('id="continue"');
const exportIdx = html.indexOf("Export Report");

check("Fail-Safe cache bumped to flow before export lane", html.includes("access-control-fail-safe-status-scope-split-020") && html.includes("./script.js?v=access-control-fail-safe-status-scope-split-020"));
check("Standard flow action row exists", flowIdx >= 0 && html.includes("access-control-flow-actions"));
check("Back action remains visible", html.includes('href="/tools/access-control/"') && html.includes("Back to Access Control"));
check("Continue action is nested in flow row", flowIdx >= 0 && continueWrapIdx > flowIdx && continueBtnIdx > continueWrapIdx);
check("Flow row appears before Export Report", flowIdx >= 0 && exportIdx > flowIdx);
check("Continue starts hidden", html.includes('id="continue-wrap"') && html.includes("display:none"));
check("Continue label remains Reader Type", html.includes("Reader Type"));
check("Continue still routes to Reader Type", script.includes('/tools/access-control/reader-type-selector/'));
check("Show/hide continue behavior remains", script.includes('els.continueWrap.style.display = "flex"') && script.includes('els.continueWrap.style.display = "none"'));
check("Visible status card remains", html.includes('id="failSafeStatusCard"') && script.includes("renderVisibleDecisionStatus"));
check("Compact status legend remains", html.includes('id="failSafeStatusLegend"') && html.includes("Authority Review"));
check("Export controls remain wired", html.includes('id="exportReport"') && html.includes('id="saveSnapshot"'));

console.log("\nAccess Control Fail-Safe polish audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
