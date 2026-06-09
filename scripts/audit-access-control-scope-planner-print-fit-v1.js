const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlRel = "tools/access-control/scope-planner/index.html";
const scriptRel = "tools/access-control/scope-planner/script.js";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function check(name, ok) {
  console.log((ok ? "SAFE " : "FAIL ") + name);
  if (!ok) failures += 1;
}

let failures = 0;
const html = read(htmlRel);
const script = read(scriptRel);

console.log("\nAccess Control Scope Planner print disclaimer-keep audit");

check("Scope Planner script cache token bumped", html.includes("script.js?v=access-control-scope-planner-print-disclaimer-keep-028"));
check("Scope Planner stylesheet cache token bumped", html.includes("/assets/style.css?v=access-control-scope-planner-print-disclaimer-keep-028"));
check("Scope Planner print disclaimer-keep token present", script.includes("access-control-scope-planner-print-disclaimer-keep-028"));
check("Print report keeps landscape page fit", script.includes("@page{size:landscape;margin:.38in}"));
check("Print overview branch map remains height constrained", script.includes(".access-scope-branch-map-shell svg") && script.includes("max-height:3.9in"));
check("Print rollup uses compact six-column layout", script.includes(".access-scope-summary-rollup{grid-template-columns:repeat(6"));
check("Print branches pack naturally instead of forced page breaks", script.includes(".access-scope-summary-branch{break-inside:avoid;page-break-inside:avoid;margin-top:12px") && !script.includes(".access-scope-summary-branch{break-before:page;page-break-before:always"));
check("Final disclaimer/caution chip stays together", script.includes(".section:last-of-type{break-inside:avoid;page-break-inside:avoid") && script.includes(".section:last-of-type .access-scope-warn{break-inside:avoid;page-break-inside:avoid"));
check("Print footer avoids orphan split", script.includes(".foot{font-size:.68rem;line-height:1.35;margin-top:10px;padding-top:8px;break-inside:avoid;page-break-inside:avoid"));
check("Print branch tables remain compact", script.includes("table.access-scope-summary-table{font-size:.68rem}") && script.includes(".access-scope-summary-table th,.access-scope-summary-table td{padding:5px 6px"));
check("Print status pill keeps cleaner weight/radius", script.includes(".status-pill{display:inline-flex") && script.includes("border-radius:10px") && script.includes("font-weight:720"));

console.log("\nSummary:", (11 - failures) + " SAFE / " + failures + " FAIL");
if (failures) process.exit(1);
