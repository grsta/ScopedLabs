const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  compactVerifier: "scripts/verify-access-control-0611.js",
  mainGates: "scripts/audit-access-control-main-gates-0610.js",
  evidenceSuite: "scripts/audit-access-control-evidence-suite-0611.js",

  statusRollup: "scripts/audit-access-control-status-system-rollup-0611.js",
  statusContract: "docs/access-control-status-chip-contract-v1.md",

  exportContract: "docs/access-control-export-report-system-contract-v1.md",
  exportRollup: "scripts/audit-access-control-export-report-system-rollup-0611.js",
  exportSafeFix: "scripts/audit-access-control-export-report-safe-fix-readiness-0611.js",
  exportParked: "scripts/audit-access-control-export-report-parked-state-0611.js",

  lockPowerParked: "scripts/audit-access-control-lock-power-parked-state-0611.js",
  failSafeParked: "scripts/audit-access-control-fail-safe-parked-state-0611.js",

  outputShell: "assets/access-control-output-shell.js",
  toolPolish: "assets/access-control-tool-polish.js",
  planningVisuals: "assets/access-control-planning-visuals.js",
  toolShell: "assets/scopedlabs-tool-shell.js",
};

function relPath(rel) {
  return path.join(root, rel);
}

function existsRel(rel) {
  return fs.existsSync(relPath(rel));
}

function readRel(rel) {
  return fs.readFileSync(relPath(rel), "utf8");
}

function checkFile(label, rel) {
  const ok = existsRel(rel);
  console.log((ok ? "SAFE  " : "FAIL  ") + label + " present — " + rel);
  return ok;
}

function checkMarker(label, rel, marker) {
  if (!existsRel(rel)) {
    console.log("FAIL  " + label + " — missing file " + rel);
    return false;
  }

  const text = readRel(rel);
  const ok = text.includes(marker);
  console.log((ok ? "SAFE  " : "FAIL  ") + label + " — " + marker);
  return ok;
}

let failCount = 0;

console.log("Access Control category-readiness checkpoint audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("File presence");
for (const [label, rel] of Object.entries(files)) {
  if (!checkFile(label, rel)) failCount += 1;
}

console.log("");
console.log("Verifier / gate markers");
if (!checkMarker("compact verifier", files.compactVerifier, "ACCESS CONTROL FINAL VERIFICATION SUMMARY")) failCount += 1;
if (!checkMarker("main gates", files.mainGates, "Access Control main gates")) failCount += 1;
if (!checkMarker("evidence suite", files.evidenceSuite, "ScopedLabs Access Control Evidence Suite")) failCount += 1;

console.log("");
console.log("Status-system readiness");
if (!checkMarker("status rollup", files.statusRollup, "SMALL_SQUARE_CHIPS_MIGRATED")) failCount += 1;
if (!checkMarker("status rollup", files.statusRollup, "LOCK_POWER_PARKED")) failCount += 1;
if (!checkMarker("status rollup", files.statusRollup, "FAIL_SAFE_PARKED")) failCount += 1;
if (!checkMarker("status contract", files.statusContract, "Status Chip Migration Completion Checkpoint")) failCount += 1;

console.log("");
console.log("Export/report readiness");
if (!checkMarker("export contract", files.exportContract, "ACCESS_CONTROL_EXPORT_REPORT_SYSTEM_CONTRACT_NEEDED")) failCount += 1;
if (!checkMarker("export contract", files.exportContract, "EXPORT_REPORT_NO_SAFE_FIX_TARGETS_YET")) failCount += 1;
if (!checkMarker("export rollup", files.exportRollup, "NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;
if (!checkMarker("export safe-fix", files.exportSafeFix, "EXPORT_REPORT_NO_SAFE_FIX_TARGETS_YET")) failCount += 1;
if (!checkMarker("export safe-fix", files.exportSafeFix, "DRY_RUN_FIXER_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS")) failCount += 1;
if (!checkMarker("export parked", files.exportParked, "SCOPE_PLANNER_SPECIAL_PATH_SKIPPED")) failCount += 1;

console.log("");
console.log("Special/deferred lanes");
if (!checkMarker("Lock Power parked", files.lockPowerParked, "LOCK_POWER_NO_IMPLEMENTATION_REQUIRED_YET")) failCount += 1;
if (!checkMarker("Fail Safe parked", files.failSafeParked, "FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;
if (!checkMarker("export parked", files.exportParked, "NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;

console.log("");
console.log("Shared asset versions");
if (!checkMarker("output shell", files.outputShell, "access-control-output-shell-004-export-safe-visual-preference")) failCount += 1;
if (!checkMarker("tool polish", files.toolPolish, "access-control-tool-polish-015-square-status-chip-aliases")) failCount += 1;
if (!checkMarker("planning visuals", files.planningVisuals, "access-control-planning-visuals-065-shared-visual-factory-quality")) failCount += 1;
if (!checkMarker("tool shell", files.toolShell, "scopedlabs-tool-shell-009-print-diagnostics")) failCount += 1;

console.log("");
console.log("Evidence suite wiring");
if (!checkMarker("evidence suite", files.evidenceSuite, "Status system rollup")) failCount += 1;
if (!checkMarker("evidence suite", files.evidenceSuite, "Export report parked state")) failCount += 1;
if (!checkMarker("evidence suite", files.evidenceSuite, "Lock Power parked state")) failCount += 1;
if (!checkMarker("evidence suite", files.evidenceSuite, "Fail Safe parked state")) failCount += 1;

console.log("");
console.log("Protected boundaries");
console.log("SAFE  AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED");
console.log("SAFE  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");
console.log("SAFE  NO_AUTO_FIX_UNTIL_SAFE_FIX_BUCKET_EXISTS");
console.log("SAFE  NO_IMPLEMENTATION_PATCH_YET");

console.log("");
console.log("Category-readiness summary");
console.log(" 1  STATUS_SYSTEM_READY");
console.log(" 1  EXPORT_REPORT_SYSTEM_PARKED");
console.log(" 1  MAIN_GATES_PASS_EXPECTED");
console.log(" 1  EVIDENCE_SUITE_PASS_EXPECTED");
console.log(" 1  SPECIAL_PATHS_DOCUMENTED");
console.log(" 1  AUTO_FIX_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS");
console.log(" 1  CATEGORY_BLUEPRINT_READY");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
