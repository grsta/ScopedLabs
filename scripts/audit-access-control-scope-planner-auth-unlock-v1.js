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

const planner = read("tools/access-control/scope-planner/index.html");
const failSafe = read("tools/access-control/fail-safe-fail-secure/index.html");
const reader = read("tools/access-control/reader-type-selector/index.html");

check("Scope Planner remains protected/pro-gated", planner.includes('data-tier="pro"'));
check("Locked card exists for signed-out users", planner.includes('id="lockedCard" class="card tool-card" style="margin-top: 18px;"'));
check("Tool card starts hidden until unlock bridge approves access", planner.includes('id="toolCard" class="card tool-card" style="display:none; margin-top: 18px;"'));
check("Unlock bridge reads stored Supabase token", planner.includes("getStoredAccessToken") && planner.includes("sb-"));
check("Unlock bridge checks Access Control category", planner.includes('var CATEGORY = "access-control";'));
check("Unlock bridge calls backend unlock list", planner.includes('/api/unlocks/list') && planner.includes("Authorization"));
check("Unlock bridge can show planner", planner.includes("function showPlanner") && planner.includes('data-access-scope-unlocked", "true"'));
check("Unlock bridge preserves locked state fallback", planner.includes("function showLocked") && planner.includes('data-access-scope-unlocked", "false"'));
check(
  "Scope Planner cache was bumped",
  planner.includes("/assets/style.css?v=access-control-scope-planner-area-pattern-004-auth-unlock") &&
  planner.includes("./script.js?v=access-control-scope-planner-area-pattern-004-auth-unlock") &&
  planner.includes("<!-- access-control-scope-planner-area-pattern-004-auth-unlock -->")
);
check("No pill markup added to planner", !planner.includes("pill--") && !/class="[^"]*\\bpill\\b/.test(planner));
check("Fail-Safe not patched by auth unlock fix", !failSafe.includes("access-control-scope-state.js?v=access-control-scope-state-001-area-pattern"));
check("Reader Type not patched by auth unlock fix", !reader.includes("access-control-scope-state.js"));

console.log("\nAccess Scope Planner auth-unlock audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
