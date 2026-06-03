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
const accessIndex = read("tools/access-control/index.html");
const pipelines = read("assets/pipelines.js");
const catalog = read("assets/catalog.js");

check("Planner uses Area Planner shell IDs", ["pipeline","lockedCard","toolCard","scopeList","scopeSummaryCard","next-step-row","continue"].every((id) => index.includes('id="' + id + '"')));
check("Planner has no metadata inputs", !["reportName","clientName","projectName","projectLocation","preparedBy","reportNotes"].some((id) => index.includes('id="' + id + '"')));
check("Planner has Area-style intro card", index.includes("Define the doors and zones before running the Access Control flow"));
check("Planner has Active Access Scope Setup", index.includes("Active Access Scope Setup"));
check("Planner has Scope Ledger section", index.includes("Scope Ledger") && index.includes("Planning Scopes"));
check("Planner has Access Control scope summary", index.includes("Access Control scope and door summary"));
check("Planner uses same plugin module stack", ["tool-flow.js","catalog.js","pipelines.js","pipeline-state.js","pipeline.js","scopedlabs-tool-shell.js","help.js"].every((token) => index.includes(token)));
check("Planner uses Access scope state", index.includes("/assets/access-control-scope-state.js"));
check("Planner has no standalone auth bridge", !index.includes("/api/unlocks/list") && !index.includes("data-access-scope-unlocked"));
check("Script mirrors Area Planner unlock pattern", script.includes("function hasStoredAuth()") && script.includes("function getUnlockedCategories()") && script.includes("function unlockCategoryPage()"));
check("Script initializes after DOMContentLoaded unlock", script.includes("window.addEventListener(\"DOMContentLoaded\"") && script.includes("if (unlocked) init()"));
check("Planner remains protected/pro gated", index.includes('data-tier="pro"'));
check("No pill classes on planner", !index.includes("pill--") && !/class="[^"]*\\bpill\\b/.test(index));
check("Access landing routes guided flow to planner", accessIndex.includes('href="/tools/access-control/scope-planner/">Start Guided Flow'));
check("Access landing does not list planner as Free Tier card", !accessIndex.includes('<div class="tool-row-title">Access Scope Planner</div>'));
check("Access pipeline includes scope foundation", pipelines.includes('id: "scope-planner", label: "Access Scope Planner"') && pipelines.includes('flowGroup: "foundation"'));
check("Catalog registers scope planner as pro", catalog.includes('{ slug: "scope-planner", label: "Access Scope Planner", tier: "pro"'));

console.log("\nAccess Scope Planner Area match audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
