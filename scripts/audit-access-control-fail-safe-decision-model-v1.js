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

check("Fail-Safe cache bumped to final shell polish lane", html.includes("access-control-fail-safe-two-visuals-polish-019") && html.includes("./script.js?v=access-control-fail-safe-two-visuals-polish-019"));
check("Hardware type input exists", html.includes('id="hardwareType"') && html.includes("Maglock / Electromagnetic Lock") && html.includes("Delayed Egress Locking"));
check("Fire-rated opening input exists", html.includes('id="fireRated"') && html.includes("Fire-Rated Door Assembly"));
check("Egress-control input exists", html.includes('id="egressControlled"') && html.includes("Free Mechanical Egress Remains"));
check("Required release event input exists", html.includes('id="releaseEvent"') && html.includes("Fire Alarm") && html.includes("Loss of Power"));
check("Standby power input exists", html.includes('id="standbyPower"') && html.includes("UPS / Generator Backed"));
check("Script tracks decision-model elements", script.includes('hardwareType: $("hardwareType")') && script.includes('standbyPower: $("standbyPower")'));
check("Decision model helper exists", script.includes("function buildFailSafeDecisionModel") && script.includes("Special locking condition") && script.includes("Fire-rated electric strike review"));
check("Maglock routes to fail-safe authority review", script.includes('hardware === "maglock"') && script.includes('recommendation = "FAIL-SAFE"') && script.includes('status = "AUTHORITY REVIEW"'));
check("Special locking routes to authority review", script.includes('hardware === "delayed-egress"') && script.includes('hardware === "special-locking"') && script.includes("Route this opening to the Special Locking / High-Security branch"));
check("Undocumented egress release can become risk", script.includes('egressControlled === "yes"') && script.includes('status = "RISK"') && script.includes("Egress release not documented"));
check("Report inputs include decision-model fields", script.includes("Hardware Type") && script.includes("Fire-Rated Opening") && script.includes("Required Release Event"));
check("Pipeline result carries decision model fields", script.includes("hardwareType,") && script.includes("decisionFlags: decision.flags") && script.includes("requiredActions: decision.actions"));
check("Scope ledger carries fail-state status and flags", script.includes("failStateStatus") && script.includes("failStateDecisionFlags"));
check("Reset and invalidate watch new inputs", script.includes('els.hardwareType.value = "unknown"') && script.includes("els.releaseEvent") && script.includes("els.standbyPower"));
check("Visible status card exists", html.includes('id="failSafeStatusCard"') && html.includes("access-fail-safe-status-card"));
check("Compact status legend exists", html.includes('id="failSafeStatusLegend"') && html.includes("Status Legend") && html.includes("Authority Review"));
check("Legend uses plain text statuses", html.includes("access-tool-status-complete") && html.includes("access-tool-status-watch") && html.includes("access-tool-status-risk") && html.includes("access-tool-status-authority"));
check("Visible status elements are tracked", script.includes('statusCard: $("failSafeStatusCard")') && script.includes('statusText: $("failSafeStatusText")'));
check("Visible status renderer exists", script.includes("function renderVisibleDecisionStatus") && script.includes("normalizeStatusClass"));
check("Visible status clears on invalidate", script.includes("clearVisibleDecisionStatus();") && script.includes("clearLocalAssistant();"));
check("Calculation renders visible status", script.includes("renderVisibleDecisionStatus({") && script.includes("flags: decision.flags"));
check("Foundation scope card remains", html.includes('id="activeAccessScopeCard"') && script.includes("renderActiveScopeContext"));

console.log("\nAccess Control Fail-Safe decision model audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
