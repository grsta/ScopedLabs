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

const index = read("tools/access-control/scope-planner/index.html");
const script = read("tools/access-control/scope-planner/script.js");

const badDisplaySeparatorsGone =
  !script.match(/\\+ ['"] \\? ['"] \\+/) &&
  !script.match(/\\+ ['"] ? ['"] \\+/) &&
  !script.includes("' ? free egress: '") &&
  !script.includes("' ? fire release: '") &&
  !script.includes("' ? threat: '") &&
  !script.includes("' ? traffic: '");

check("Planner version bumped to print-palette lane", index.includes("./script.js?v=access-control-scope-planner-branch-map-print-palette-025") && index.includes("<!-- access-control-scope-planner-branch-map-print-palette-025 -->"));
check("Active scope card uses breadcrumb mini flow", script.includes("access-scope-mini-flow") && script.includes("branchLabel(key)") && script.includes("&rarr;"));
check("Active scope card keeps branch classification", script.includes("function branchLabel(key)") && script.includes("Core Door Scope"));
check("Summary has grouped branch helper", script.includes("function branchTable(key, items)"));
check("Summary includes Core Door Scopes", script.includes("Core Door Scopes"));
check("Summary includes Elevator Bank Scopes", script.includes("Elevator Bank Scopes"));
check("Summary includes Anti-Passback Zones", script.includes("Anti-Passback Zones"));
check("Summary includes Special Locking / High-Security Scopes", script.includes("Special Locking / High-Security Scopes"));
check("Summary branch tables use Physical Security-style columns", ["Scope / Door", "Selected", "Status", "Checks", "Key Saved Result", "Next Action"].every((token) => script.includes(token)));
check("Selected Active Scope uses green text class", index.includes("access-status-active-text") && script.includes("access-status-active-text"));
check("Status values use plain colored text classes", index.includes("access-status-authority") && index.includes("access-status-risk") && index.includes("access-status-watch") && script.includes("accessStatusClass"));
check("Summary includes status legend", index.includes("access-status-legend") && script.includes("renderStatusLegend") && script.includes("AUTHORITY REVIEW") && script.includes("AHJ/code/fire/life-safety review may be required"));
check("Scope Planner summary includes branch-map visual", index.includes("/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-060-access-level-matrix-layout") && script.includes("buildScopePlannerBranchMapHtml") && script.includes("ScopedLabsAccessControlPlanningVisuals"));
check("Scope Planner print report requests export branch-map palette", index.includes("./script.js?v=access-control-scope-planner-branch-map-print-palette-025") && script.includes("renderScopeSummary(ledger, { exportMode: true })") && script.includes("exportMode: !!options.exportMode") && script.includes("exportMode: !!rollup.exportMode"));
check("Bad display separator strings are gone", badDisplaySeparatorsGone);
check("Authority review caution remains in summary", script.includes("Authority review caution:") && script.includes("Final approval must come from applicable code review"));

console.log("\nAccess Scope Planner branch summary audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
