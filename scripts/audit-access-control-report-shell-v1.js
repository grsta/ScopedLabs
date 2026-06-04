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
const shell = read("assets/access-control-report-shell.js");

check("Fail-Safe cache bumped to report shell lane", html.includes("access-control-fail-safe-final-shell-009-report-shell") && html.includes("./script.js?v=access-control-fail-safe-final-shell-009-report-shell"));
check("Reusable report shell asset exists", shell.includes("ScopedLabsAccessControlReportShell") && shell.includes("access-control-report-shell-002-stacked-sections"));
check("Fail-Safe loads report shell before tool script", html.includes("/assets/access-control-report-shell.js?v=access-control-report-shell-002-stacked-sections") && html.indexOf("/assets/access-control-report-shell.js") < html.indexOf("./script.js?v=access-control-fail-safe-final-shell-009-report-shell"));
check("Report shell uses square toolbar buttons", shell.includes("border-radius:10px") && shell.includes("Print / Save PDF"));
check("Report shell uses plain status text not pill", shell.includes(".report-status") && !shell.includes("status-pill"));
check("Report shell table layout is fixed/wrapped", shell.includes("table-layout:fixed") && shell.includes("overflow-wrap:break-word"));
check("Report shell stacks major sections", shell.includes(".report-grid{display:grid;grid-template-columns:1fr") && shell.includes("@media print") && shell.includes(".report-grid{grid-template-columns:1fr"));
check("Report shell narrows label column for values", shell.includes(".report-table td:first-child{width:28%"));
check("Tool report builder uses reusable shell", script.includes("ScopedLabsAccessControlReportShell.build"));
check("Old inline status-pill removed from tool report builder", !script.includes("status-pill"));
check("Old report grid class removed from tool report builder", !script.includes('class="grid"'));
check("New report grid class used", script.includes("report-grid") && script.includes("report-table"));
check("Report still includes Active Scope Context", script.includes("Active Scope Context") && script.includes("scopeRows"));
check("Report still includes inputs and outputs", script.includes("Inputs") && script.includes("Calculated Outputs"));
check("Report still includes assumptions and disclaimer", script.includes("Assumptions") && script.includes("Disclaimer"));

console.log("\nAccess Control report shell audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
