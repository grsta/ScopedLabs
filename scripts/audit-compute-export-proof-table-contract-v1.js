const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

const checks = [];

function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

const shared = read("assets/scopedlabs-compute-export-proof-tables.js");
const cpuHtml = read("tools/compute/cpu-sizing/index.html");
const cpuScript = read("tools/compute/cpu-sizing/script.js");

check(
  "COMPUTE_EXPORT_PROOF_TABLE_MODULE_EXISTS",
  shared.includes("window.ScopedLabsComputeExportProofTables") &&
    shared.includes("widthsFor") &&
    shared.includes("plainCell") &&
    shared.includes("valueCell") &&
    shared.includes("noteCell") &&
    shared.includes("statusTone"),
  "assets/scopedlabs-compute-export-proof-tables.js",
  "Shared Compute proof-table export module should expose widths and cell helpers."
);

check(
  "COMPUTE_EXPORT_PROOF_TABLE_WIDTHS_DEFINED",
  shared.includes('recommendedActions: ["34%", "66%"]') &&
    shared.includes('decisionSchedule: ["16%", "22%", "18%", "44%"]'),
  "assets/scopedlabs-compute-export-proof-tables.js",
  "Shared Compute export proof table widths should define Recommended Actions and Decision Schedule layouts."
);

check(
  "CPU_LOADS_SHARED_PROOF_TABLE_MODULE_BEFORE_LOCAL_SCRIPT",
  cpuHtml.indexOf("scopedlabs-compute-export-proof-tables.js") >= 0 &&
    cpuHtml.indexOf("scopedlabs-compute-export-proof-tables.js") < cpuHtml.indexOf("./script.js?v="),
  "tools/compute/cpu-sizing/index.html",
  "CPU page should load the shared proof-table helper before the CPU local script."
);

check(
  "CPU_EXPORT_CELLS_DELEGATE_TO_SHARED_MODULE",
  cpuScript.includes("function computeCpuExportProofTables()") &&
    cpuScript.includes("api.statusTone") &&
    cpuScript.includes("api.plainCell") &&
    cpuScript.includes("api.valueCell") &&
    cpuScript.includes("api.noteCell") &&
    cpuScript.includes("api.widthsFor"),
  "tools/compute/cpu-sizing/script.js",
  "CPU export cell helpers should delegate to the shared Compute proof-table module with local fallback."
);

check(
  "CPU_EXPORT_TABLES_USE_SHARED_WIDTH_CONTRACT",
  cpuScript.includes('colWidths: computeCpuProofTableWidths("recommendedActions")') &&
    cpuScript.includes('colWidths: computeCpuProofTableWidths("decisionSchedule")'),
  "tools/compute/cpu-sizing/script.js",
  "CPU Recommended Actions and Decision Schedule export tables should consume shared width keys."
);

console.log("SCOPEDLABS COMPUTE EXPORT PROOF TABLE CONTRACT AUDIT V1\n");

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.id);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.id);
  }

  console.log("  " + item.file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
