const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  contract: path.join(root, "docs", "access-control-export-report-system-contract-v1.md"),
  rollupAudit: path.join(root, "scripts", "audit-access-control-export-report-system-rollup-0611.js"),
  safeFixAudit: path.join(root, "scripts", "audit-access-control-export-report-safe-fix-readiness-0611.js"),
};

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function checkText(label, text, marker) {
  const ok = text.includes(marker);
  console.log((ok ? "SAFE  " : "FAIL  ") + label + " — " + marker);
  return ok;
}

let failCount = 0;

console.log("Access Control export/report parked-state audit - 0611");
console.log("Repo:", root);
console.log("");

for (const [label, filePath] of Object.entries(files)) {
  const exists = fs.existsSync(filePath);
  console.log((exists ? "SAFE  " : "FAIL  ") + label + " present");
  if (!exists) failCount += 1;
}

const contract = read(files.contract);
const rollupAudit = read(files.rollupAudit);
const safeFixAudit = read(files.safeFixAudit);

console.log("");
console.log("Contract markers");

if (!checkText("contract", contract, "ACCESS_CONTROL_EXPORT_REPORT_SYSTEM_CONTRACT_NEEDED")) failCount += 1;
if (!checkText("contract", contract, "SHARED_OUTPUT_SHELL_READY_OR_PARTIAL")) failCount += 1;
if (!checkText("contract", contract, "EXPORT_REPORT_NO_SAFE_FIX_TARGETS_YET")) failCount += 1;
if (!checkText("contract", contract, "DRY_RUN_FIXER_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS")) failCount += 1;
if (!checkText("contract", contract, "NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;

console.log("");
console.log("Audit markers");

if (!checkText("rollup audit", rollupAudit, "SHARED_OUTPUT_SHELL_READY_OR_PARTIAL")) failCount += 1;
if (!checkText("rollup audit", rollupAudit, "PREVIEW_PRINT_MODE_SAFE_TO_AUDIT")) failCount += 1;
if (!checkText("rollup audit", rollupAudit, "EXPORT_STATUS_KEEP_SEPARATE")) failCount += 1;
if (!checkText("rollup audit", rollupAudit, "SCOPE_PLANNER_SPECIAL_PATH_SKIPPED")) failCount += 1;

if (!checkText("safe-fix audit", safeFixAudit, "EXPORT_REPORT_NO_SAFE_FIX_TARGETS_YET")) failCount += 1;
if (!checkText("safe-fix audit", safeFixAudit, "DRY_RUN_FIXER_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS")) failCount += 1;
if (!checkText("safe-fix audit", safeFixAudit, "NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;

console.log("");
console.log("Parked-state summary");
console.log(" 1  EXPORT_REPORT_NO_SAFE_FIX_TARGETS_YET");
console.log(" 1  DRY_RUN_FIXER_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS");
console.log(" 1  ROUTE_OVERRIDE_KEEP_REVIEW");
console.log(" 1  PREVIEW_PRINT_KEEP_REVIEW");
console.log(" 1  EXPORT_STATUS_KEEP_SEPARATE");
console.log(" 1  REPORT_VISUAL_OWNER_KEEP_REVIEW");
console.log(" 1  EXPORT_PAYLOAD_PROOF_GAP_KEEP_REVIEW");
console.log(" 1  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log(" 1  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");
console.log(" 1  NO_IMPLEMENTATION_PATCH_YET");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
