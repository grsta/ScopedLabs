const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

let pass = 0;
let fail = 0;

function check(id, ok, file, detail) {
  if (ok) pass += 1;
  else fail += 1;

  console.log("[" + (ok ? "PASS" : "FAIL") + "] " + id);
  console.log("  " + file);
  console.log("  " + detail);
}

console.log("SCOPEDLABS COMPUTE RAM EXPORT SHELL PARITY AUDIT V1\n");

const ramHtml = read("tools/compute/ram-sizing/index.html");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

check(
  "CPU_EXPORT_SHELL_BASELINE_USES_REPORT_METADATA_MOUNT",
  cpuHtml.includes('class="card compute-export-card"') &&
    cpuHtml.includes('id="reportMetadataMount"') &&
    cpuHtml.includes("data-report-metadata") &&
    cpuHtml.includes('data-collapsed="true"'),
  "tools/compute/cpu-sizing/index.html",
  "CPU baseline must continue using the shared collapsed report metadata mount."
);

check(
  "RAM_EXPORT_SHELL_USES_SHARED_REPORT_METADATA_MOUNT",
  ramHtml.includes('class="card compute-export-card"') &&
    ramHtml.includes('id="reportMetadataMount"') &&
    ramHtml.includes("data-report-metadata") &&
    ramHtml.includes('data-report-fields="reportTitle,projectName,clientName,preparedBy,customNotes"') &&
    ramHtml.includes('data-collapsed="true"'),
  "tools/compute/ram-sizing/index.html",
  "RAM export card must use the same shared collapsed report metadata mount as CPU."
);

check(
  "RAM_EXPORT_SHELL_REMOVES_LEGACY_VISIBLE_EXPORT_GRID",
  !ramHtml.includes('class="export-grid"') &&
    !ramHtml.includes('pill--pro') &&
    !ramHtml.includes("Documentation & Export"),
  "tools/compute/ram-sizing/index.html",
  "RAM export shell should not use the old always-visible export-grid fields or Documentation & Export pill."
);

check(
  "RAM_EXPORT_ACTION_BUTTONS_PRESERVED",
  ramHtml.includes('id="exportReport"') &&
    ramHtml.includes('id="saveSnapshot"') &&
    ramHtml.includes('id="exportStatus"'),
  "tools/compute/ram-sizing/index.html",
  "RAM export and snapshot controls must remain available with the same IDs."
);

check(
  "RAM_EXPORT_SHELL_IS_AFTER_PROOF_STACK",
  ramHtml.indexOf("computeRamDecisionScheduleCard") !== -1 &&
    ramHtml.indexOf('class="card compute-export-card"') !== -1 &&
    ramHtml.indexOf("computeRamDecisionScheduleCard") < ramHtml.indexOf('class="card compute-export-card"'),
  "tools/compute/ram-sizing/index.html",
  "RAM export shell must remain below the visual, references, actions, and decision schedule proof stack."
);

check(
  "RAM_LOADS_SHARED_REPORT_METADATA_SCRIPT",
  ramHtml.includes("scopedlabs-report-metadata.js"),
  "tools/compute/ram-sizing/index.html",
  "RAM page must load the shared report metadata script that renders the collapsed Report details UI."
);

check(
  "MODULE_MAP_RECORDS_RAM_EXPORT_SHELL_PARITY",
  moduleMap.includes("### Compute RAM export shell parity") &&
    moduleMap.includes("audit-compute-ram-export-shell-parity-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document RAM export shell parity and audit ownership."
);

check(
  "BATCH_RUNNER_INCLUDES_RAM_EXPORT_SHELL_PARITY_AUDIT",
  batch.includes("scripts/audit-compute-ram-export-shell-parity-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "Closeout batch runner must include the RAM export shell parity audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
