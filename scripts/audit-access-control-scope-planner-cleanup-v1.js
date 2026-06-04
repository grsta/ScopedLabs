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

check("Planner version bumped to print report tab lane", index.includes("access-control-scope-planner-area-match-012-print-report-tab"));
check("Square button override uses tighter radius", index.includes("border-radius: 7px !important"));
check("Scope Ledger hides authority review arrow/status CSS", index.includes("#scopeList .access-scope-flow-arrow") && index.includes("#scopeList .access-scope-flow-label"));
check("Scope Ledger hides authority warning box CSS", index.includes("#scopeList .access-scope-warn"));
check("Question-mark join is not present", !script.includes('.join(" ? ")') && !script.includes(".join(' ? ')"));
check("Bad display separators are not present", badDisplaySeparatorsGone);
check("Pipe separator exists in generated planner text", script.includes("' | '") || script.includes('" | "'));
check("Summary authority review caution remains", script.includes("Authority review caution:") && script.includes("Final approval must come from applicable code review"));

console.log("\nAccess Scope Planner cleanup audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
