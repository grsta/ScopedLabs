const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  contract: path.join(root, "docs", "access-control-fail-safe-complex-status-contract-v1.md"),
  complexAudit: path.join(root, "scripts", "audit-access-control-fail-safe-complex-status-0611.js"),
  readinessAudit: path.join(root, "scripts", "audit-access-control-fail-safe-readiness-0611.js"),
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

console.log("Access Control Fail Safe parked-state audit - 0611");
console.log("Repo:", root);
console.log("");

for (const [label, filePath] of Object.entries(files)) {
  const exists = fs.existsSync(filePath);
  console.log((exists ? "SAFE  " : "FAIL  ") + label + " present");
  if (!exists) failCount += 1;
}

const contract = read(files.contract);
const complexAudit = read(files.complexAudit);
const readinessAudit = read(files.readinessAudit);

console.log("");
console.log("Contract markers");

if (!checkText("contract", contract, "FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED")) failCount += 1;
if (!checkText("contract", contract, "KEEP_FAIL_SAFE_LOCAL_UNTIL_CONTRACTED")) failCount += 1;
if (!checkText("contract", contract, "FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW")) failCount += 1;
if (!checkText("contract", contract, "FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW")) failCount += 1;
if (!checkText("contract", contract, "FAIL_SAFE_SHARED_HELPER_NOT_READY")) failCount += 1;
if (!checkText("contract", contract, "FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;

console.log("");
console.log("Audit markers");

if (!checkText("complex audit", complexAudit, "FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED")) failCount += 1;
if (!checkText("complex audit", complexAudit, "KEEP_FAIL_SAFE_LOCAL_UNTIL_CONTRACTED")) failCount += 1;
if (!checkText("complex audit", complexAudit, "DIAGRAM_AND_LEGEND_REVIEW_BEFORE_SHARED_HELPER")) failCount += 1;
if (!checkText("readiness audit", readinessAudit, "FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW")) failCount += 1;
if (!checkText("readiness audit", readinessAudit, "FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW")) failCount += 1;
if (!checkText("readiness audit", readinessAudit, "FAIL_SAFE_SHARED_HELPER_NOT_READY")) failCount += 1;
if (!checkText("readiness audit", readinessAudit, "FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET")) failCount += 1;
if (!checkText("readiness audit", readinessAudit, "AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED")) failCount += 1;

console.log("");
console.log("Parked-state summary");
console.log(" 1  FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW");
console.log(" 1  FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW");
console.log(" 1  FAIL_SAFE_SHARED_HELPER_NOT_READY");
console.log(" 1  FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET");
console.log(" 1  FAIL_SAFE_COMPLEX_LOCAL_OWNERSHIP_REVIEW");
console.log(" 1  EXPORT_STATUS_KEEP_SEPARATE");
console.log(" 1  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log(" 1  AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
