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

const category = read("tools/access-control/index.html");
const planner = read("tools/access-control/scope-planner/index.html");
const failSafe = read("tools/access-control/fail-safe-fail-secure/index.html");
const reader = read("tools/access-control/reader-type-selector/index.html");

check("Guided flow still routes to Scope Planner", category.includes('href="/tools/access-control/scope-planner/">Start Guided Flow'));
check("Scope Planner is not listed as a Free Tier tool card", !category.includes('<div class="tool-row-title">Access Scope Planner</div>'));
check("Category preview has no literal newline text", !category.includes("\\n"));
check("Category preview uses arrow separators", category.includes('pipeline-preview-sep">&rarr;</span>'));
check("Category preview starts with Access Scope", category.includes('pipeline-preview-step is-active">Access Scope</span>'));
check("Scope Planner is protected/pro-gated", planner.includes('data-tier="pro"'));
check("Scope Planner locked card is available for signed-out/unauthorized users", planner.includes('id="lockedCard" class="card tool-card" style="margin-top: 18px;"'));
check("Scope Planner tool card is hidden until auth unlocks it", planner.includes('id="toolCard" class="card tool-card" style="display:none; margin-top: 18px;"'));
check(
  "Scope Planner cache was bumped",
  planner.includes("/assets/style.css?v=access-control-scope-planner-area-pattern-004-auth-unlock") &&
  planner.includes("./script.js?v=access-control-scope-planner-area-pattern-004-auth-unlock") &&
  planner.includes("<!-- access-control-scope-planner-area-pattern-004-auth-unlock -->")
);
check("No Scope Planner pill card was added", !category.includes('pill--free">Start Here') && !category.includes('<div class="tool-row-title">Access Scope Planner</div>'));
check("Planner page has no pill markup", !planner.includes("pill--") && !/class="[^"]*\\bpill\\b/.test(planner));
check("Fail-Safe not patched by gating fix", !failSafe.includes("access-control-scope-state.js?v=access-control-scope-state-001-area-pattern"));
check("Reader Type not patched by gating fix", !reader.includes("access-control-scope-state.js"));

console.log("\nAccess Scope Planner gating audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
