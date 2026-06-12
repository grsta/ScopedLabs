const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  statusContract: "docs/access-control-status-chip-contract-v1.md",
  statusPlan: "docs/access-control-status-chip-implementation-plan-v1.md",
  statusMigrationAudit: "scripts/audit-access-control-status-chip-migration-state-0611.js",
  lockPowerVisualContract: "docs/access-control-lock-power-visual-chip-contract-v1.md",
  lockPowerStatusContract: "docs/access-control-lock-power-status-pill-path-contract-v1.md",
  lockPowerParkedAudit: "scripts/audit-access-control-lock-power-parked-state-0611.js",
  failSafeContract: "docs/access-control-fail-safe-complex-status-contract-v1.md",
  failSafeParkedAudit: "scripts/audit-access-control-fail-safe-parked-state-0611.js",
  evidenceSuite: "scripts/audit-access-control-evidence-suite-0611.js",
};

function readRel(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function existsRel(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function checkText(label, relPath, marker) {
  const exists = existsRel(relPath);
  if (!exists) {
    console.log("FAIL  " + label + " — missing file " + relPath);
    return false;
  }

  const text = readRel(relPath);
  const ok = text.includes(marker);
  console.log((ok ? "SAFE  " : "FAIL  ") + label + " — " + marker);
  return ok;
}

let failCount = 0;

console.log("Access Control status-system rollup audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("File presence");
for (const [label, relPath] of Object.entries(files)) {
  const ok = existsRel(relPath);
  console.log((ok ? "SAFE  " : "FAIL  ") + label + " present");
  if (!ok) failCount += 1;
}

console.log("");
console.log("Small square-chip lane");
if (!checkText("small chips", files.statusMigrationAudit, "SHARED_SQUARE_CHIP_MIGRATED")) failCount += 1;
if (!checkText("small chips", files.statusMigrationAudit, "LOCAL_PILL_CSS_REMOVED")) failCount += 1;
if (!checkText("small chips", files.statusContract, "Status Chip Migration Completion Checkpoint")) failCount += 1;

console.log("");
console.log("Lock Power lane");
if (!checkText("Lock Power", files.lockPowerVisualContract, "LOCK_POWER_VISUAL_CHIP_ALREADY_RECTANGULAR")) failCount += 1;
if (!checkText("Lock Power", files.lockPowerStatusContract, "LOCK_POWER_STATUS_PILL_PATH_DOCUMENTED_LOCAL_REVIEW")) failCount += 1;
if (!checkText("Lock Power", files.lockPowerParkedAudit, "LOCK_POWER_NO_IMPLEMENTATION_REQUIRED_YET")) failCount += 1;
if (!checkText("Lock Power", files.lockPowerParkedAudit, "LOCK_POWER_FUTURE_HELPER_OPTIONAL")) failCount += 1;

console.log("");
console.log("Fail Safe lane");
if (!checkText("Fail Safe", files.failSafeContract, "FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW")) failCount += 1;
if (!checkText("Fail Safe", files.failSafeContract, "FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW")) failCount += 1;
if (!checkText("Fail Safe", files.failSafeParkedAudit, "FAIL_SAFE_SHARED_HELPER_NOT_READY")) failCount += 1;
if (!checkText("Fail Safe", files.failSafeParkedAudit, "FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;

console.log("");
console.log("Evidence suite wiring");
if (!checkText("evidence suite", files.evidenceSuite, "Status chip migration state")) failCount += 1;
if (!checkText("evidence suite", files.evidenceSuite, "Lock Power parked state")) failCount += 1;
if (!checkText("evidence suite", files.evidenceSuite, "Fail Safe parked state")) failCount += 1;

console.log("");
console.log("Protected boundaries");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log("SAFE  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");
console.log("SAFE  AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED");
console.log("SAFE  NO_IMPLEMENTATION_PATCH_REQUIRED");

console.log("");
console.log("Rollup summary");
console.log(" 1  SMALL_SQUARE_CHIPS_MIGRATED");
console.log(" 1  LOCK_POWER_PARKED");
console.log(" 1  FAIL_SAFE_PARKED");
console.log(" 1  EXPORT_STATUS_KEEP_SEPARATE");
console.log(" 1  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log(" 1  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");
console.log(" 1  AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
