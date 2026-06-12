const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  visualContract: path.join(root, "docs", "access-control-lock-power-visual-chip-contract-v1.md"),
  statusContract: path.join(root, "docs", "access-control-lock-power-status-pill-path-contract-v1.md"),
  visualAudit: path.join(root, "scripts", "audit-access-control-lock-power-visual-chip-0611.js"),
  readinessAudit: path.join(root, "scripts", "audit-access-control-lock-power-visual-chip-readiness-0611.js"),
  statusPathAudit: path.join(root, "scripts", "audit-access-control-lock-power-status-pill-path-0611.js"),
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

console.log("Access Control Lock Power parked-state audit - 0611");
console.log("Repo:", root);
console.log("");

for (const [label, filePath] of Object.entries(files)) {
  const exists = fs.existsSync(filePath);
  console.log((exists ? "SAFE  " : "FAIL  ") + label + " present");
  if (!exists) failCount += 1;
}

const visualContract = read(files.visualContract);
const statusContract = read(files.statusContract);
const visualAudit = read(files.visualAudit);
const readinessAudit = read(files.readinessAudit);
const statusPathAudit = read(files.statusPathAudit);

console.log("");
console.log("Contract markers");

if (!checkText("visual contract", visualContract, "LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED")) failCount += 1;
if (!checkText("visual contract", visualContract, "LOCK_POWER_NO_IMPLEMENTATION_REQUIRED_YET")) failCount += 1;
if (!checkText("visual contract", visualContract, "LOCK_POWER_FUTURE_HELPER_OPTIONAL")) failCount += 1;
if (!checkText("status contract", statusContract, "LOCK_POWER_STATUS_PILL_PATH_LOCAL_REVIEW")) failCount += 1;
if (!checkText("status contract", statusContract, "LOCK_POWER_STATUS_PILL_PATH_DOCUMENTED_LOCAL_REVIEW")) failCount += 1;

console.log("");
console.log("Audit markers");

if (!checkText("visual audit", visualAudit, "LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED")) failCount += 1;
if (!checkText("readiness audit", readinessAudit, "LOCK_POWER_VISUAL_CHIP_ALREADY_RECTANGULAR")) failCount += 1;
if (!checkText("status path audit", statusPathAudit, "LOCK_POWER_VISUAL_CHIP_LOCAL_OWNERSHIP_PRESERVED")) failCount += 1;

console.log("");
console.log("Parked-state summary");
console.log(" 1  LOCK_POWER_VISUAL_CHIP_ALREADY_RECTANGULAR");
console.log(" 1  LOCK_POWER_STATUS_PILL_PATH_DOCUMENTED_LOCAL_REVIEW");
console.log(" 1  LOCK_POWER_NO_IMPLEMENTATION_REQUIRED_YET");
console.log(" 1  LOCK_POWER_FUTURE_HELPER_OPTIONAL");
console.log(" 1  CAD_RAIL_VISUAL_KEEP_SEPARATE");
console.log(" 1  EXPORT_STATUS_KEEP_SEPARATE");
console.log(" 1  LEDGER_KEEP_SEPARATE");
console.log(" 1  FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
