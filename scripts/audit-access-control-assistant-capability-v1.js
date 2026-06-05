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

function section(title) {
  rows.push({ Status: "----", Check: title, Detail: "" });
}

const html = read("tools/access-control/fail-safe-fail-secure/index.html");
const script = read("tools/access-control/fail-safe-fail-secure/script.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");

section("Fail-Safe decision inputs");

[
  "doorType",
  "life",
  "powerLoss",
  "fire",
  "threat",
  "hardwareType",
  "fireRated",
  "egressControlled",
  "releaseEvent",
  "standbyPower"
].forEach((id) => {
  check("Input exists: " + id, html.includes('id="' + id + '"') || script.includes(id + ":"));
});

check("Fail-Safe reads active scope context", script.includes("getActiveAccessScope") && script.includes("scopeContextForReport"));
check("Fail-Safe reports active scope context", script.includes('"Active Scope Context"') && script.includes("scopeValue"));

section("Decision intelligence branches");

check("Maglock branch forces fail-safe authority review", script.includes('hardware === "maglock"') && script.includes("Maglock release arrangement") && script.includes("AUTHORITY REVIEW"));
check("Special locking branch routes authority review", script.includes('hardware === "delayed-egress"') && script.includes("Special Locking / High-Security") && script.includes("AHJ/code"));
check("Undocumented egress release branch becomes risk", script.includes('egressControlled === "yes"') && script.includes("Egress release not documented") && script.includes("status = \"RISK\""));
check("Fire-rated electric strike branch requires review", script.includes("fireRated === \"yes\"") && script.includes("Fire-rated electric strike review") && script.includes("positive-latching"));
check("Fire-rated no-release branch creates watch/review path", script.includes("Fire-rated opening without documented release event") && script.includes("Confirm whether fire alarm or fire-protection release is required"));
check("Unknown critical values create correction path", script.includes("Incomplete hardware/release assumptions") && script.includes("Replace unknown values before treating the fail-state decision as complete"));
check("Fail-secure egress/no-standby branch becomes risk", script.includes("Fail-secure egress with no standby power") && script.includes("backup-power strategy"));
check("Active scope authority flag carries into Summary", script.includes("Scope marked for authority review") && script.includes("Carry this opening into Summary as an authority-review item"));

section("Guidance quality");

check("Every decision model can return required actions", script.includes("const actions = []") && script.includes("actions.push") && script.includes("requiredActions"));
check("Risk outcomes include required action language", script.includes("Define required release events before choosing reader, lock power, or panel capacity assumptions") && script.includes("Confirm free mechanical egress or provide listed release/backup-power strategy"));
check("Authority Review outcomes include review/AHJ checklist language", script.includes("Document sensor/request-to-exit, fire alarm, power-loss, and manual release behavior before continuing") && script.includes("AHJ/code requirements"));
check("Unknown inputs tell user how to fix the issue", script.includes("Replace unknown values before treating the fail-state decision as complete"));
check("Guidance names downstream tools", script.includes("reader type") && script.includes("lock-power") || script.includes("reader, lock power, or panel capacity"));
check("Continue route names next downstream tool", script.includes('/tools/access-control/reader-type-selector/'));

section("Assistant adapter capability");

check("Access Control assistant adapter exists", adapters.includes("ScopedLabsAccessControlToolAssistantAdapters"));
check("Fail-Safe adapter registered", adapters.includes("fail-safe-fail-secure"));
check("Local assistant receives status/recommendation/confidence", script.includes("status,") && script.includes("recommendation,") && script.includes("confidence,") && script.includes("renderLocalAssistant"));
check("Local assistant receives risk, interpretation, and guidance", script.includes("risk,") && script.includes("interpretation,") && script.includes("guidance,"));
check("Local assistant receives decision flags and required actions", script.includes("decisionFlags: decision.flags") && script.includes("requiredActions: decision.actions"));
check(
  "Assistant adapter builds guidance model and tool passes action content",
  adapters.includes("buildModel") &&
    script.includes("requiredActions: decision.actions") &&
    script.includes("decisionFlags: decision.flags")
);

section("Carry-forward and summary readiness");

check("Fail-Safe saves pipeline result", script.includes("savePipelineResult") && script.includes("ScopedLabsAnalyzer.writeFlow"));
check("Fail-Safe writes completed tool result to active scope ledger", script.includes("publishFailSafeResultToScopeLedger") && script.includes("completedTools[STEP]"));
check("Carry-forward includes decision flags", script.includes("failStateDecisionFlags") && script.includes("decisionFlags"));
check("Carry-forward includes required actions", script.includes("requiredActions"));
check("Carry-forward includes fail-state status", script.includes("failStateStatus"));
check("Carry-forward includes power-loss intent", script.includes("powerLossIntent"));
check("Report includes Required Action section", script.includes('textSection("Required Action"'));
check("Report includes Engineering Interpretation section", script.includes('textSection("Engineering Interpretation"'));
check("Report includes Actionable Guidance section", script.includes('textSection("Actionable Guidance"'));
check("Report includes Decision Flags section", script.includes('textSection("Decision Flags"'));

section("Report/export capability");

check("Fail-Safe exposes canonical export payload", script.includes("ScopedLabsAccessControlFailSafeExport") && script.includes("getSharedExportPayload"));
check("Report suppresses calculator dump sections", html.includes('"suppressStandardReportSections": true') && script.includes("inputs: []") && script.includes("outputs: []"));
check("Report uses Planner-style Active Scope Context", script.includes('"Active Scope Context"') && script.includes('"Scope / Door"') && script.includes('"Key Saved Result"'));
check("Report uses Planner-style Decision Summary", script.includes('"Decision Summary"') && script.includes('"Recommendation", "Status", "Confidence", "Score", "Primary Risk"'));
check("Report uses semantic status tones", script.includes("toneForStatus") && script.includes("cell(decisionStatus || \"Pending\""));
check("Report keeps item count muted", script.includes('countTone: "muted"'));

const visibleRows = rows.filter((row) => row.Status !== "----");

console.log("\nAccess Control assistant capability audit:");
console.table(rows);

const safe = visibleRows.filter((row) => row.Status === "SAFE").length;
const fail = visibleRows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
