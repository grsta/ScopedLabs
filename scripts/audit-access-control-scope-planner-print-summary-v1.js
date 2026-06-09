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

const html = read("tools/access-control/scope-planner/index.html");
const script = read("tools/access-control/scope-planner/script.js");

check("Planner cache bumped to print report tab lane", html.includes("access-control-scope-planner-branch-map-024"));
check("Intro card has print-hide ID", html.includes('id="accessScopeIntroCard"'));
check("Scope ledger card has print-hide ID", html.includes('id="scopeLedgerCard"'));
check("Print button remains wired", html.includes('id="printScopeSummary"') && script.includes('printSummary: $("printScopeSummary")') && script.includes('els.printSummary?.addEventListener("click", printSummary)'));
check("Print opens a printable report tab", script.includes("buildAccessScopeSummaryReportHtml") && script.includes("openAccessScopeSummaryReportWindow") && script.includes("window.open(url, \"_blank\")"));
check("Printable report tab has toolbar buttons", script.includes("Print / Save PDF") && script.includes("window.print()") && script.includes("window.close()"));
check("Copy button remains wired", html.includes('id="copyScopeSummary"') && script.includes('copySummary: $("copyScopeSummary")') && script.includes('els.copySummary?.addEventListener("click", copySummary)'));
check("Print and copy actions are below generated summary", html.indexOf('id="printScopeSummary"') > html.indexOf('id="scopeSummary"'));
check("Print CSS hides non-report planner cards", html.includes("#accessScopeIntroCard") && html.includes("#scopeLedgerCard") && html.includes("#accessScopePlannerFlowActions"));
check("Print CSS avoids rollup split", html.includes(".access-scope-summary-rollup") && html.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"));
check("Print CSS tightens metric cards", html.includes("access-scope-print-fit-011") && html.includes("box-sizing: border-box") && html.includes("max-width: 100%"));
check("Bad print selector typo removed", !html.includes("body.print-access-scope-warn,"));

console.log("\nAccess Scope Planner print summary audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
