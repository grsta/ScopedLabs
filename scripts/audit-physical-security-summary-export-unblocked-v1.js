const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-export-unblocked-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const exportJs = read("assets/export.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("export-engine-exists", exists("assets/export.js"), "shared export engine exists");
safe("summary-export-cache", index.includes("/assets/export.js?v=shared-export-017-summary-always-ready"), "Summary uses bumped export engine cache");
safe("summary-always-allow", index.includes("alwaysAllowExport: true"), "Summary allows report export without category unlock gate");
safe("summary-always-ready", index.includes("alwaysExportReady: true"), "Summary is report-ready without calculator results");
safe("summary-no-input-invalidate", index.includes("invalidateOnInput: false"), "Summary report metadata does not disable export buttons");
safe("summary-ready-message", index.includes("Summary report ready. Open Report or Save Snapshot."), "Summary has report-ready status message");
safe("summary-fallback-outputs", index.includes("emptyExportOutputs") && index.includes("Ready without calculator step"), "Summary provides fallback export output rows");
safe("export-default-options", exportJs.includes("alwaysExportReady: false") && exportJs.includes("invalidateOnInput: true") && exportJs.includes("emptyExportOutputs: []"), "shared export defaults preserve calculator-tool behavior");
safe("export-ready-option", exportJs.includes("state.options.alwaysExportReady === true") && exportJs.includes("getFallbackOutputRows()"), "shared export engine supports always-ready pages");
safe("export-build-payload-fallback", exportJs.includes("let outputs = getResultRows();") && exportJs.includes("outputs = getFallbackOutputRows();"), "buildPayload can use Summary fallback outputs");
safe("export-ready-message-option", exportJs.includes("state.options.readyStatusMessage || \"Calculation ready. Open Export Report or Save Snapshot.\""), "ready status message is configurable");
safe("export-input-invalidation-option", exportJs.includes("inputContainer && state.options.invalidateOnInput !== false"), "metadata/input invalidation can be disabled for Summary");
safe("calculator-message-preserved", exportJs.includes("Run the calculator to enable export."), "calculator tools still keep calculator-gated status message");
safe("summary-controls-remain", index.includes("id=\"exportReport\"") && index.includes("id=\"saveSnapshot\"") && index.includes("id=\"exportStatus\""), "Summary export controls remain");

console.log("");
console.log("Physical Security Summary Export Unblocked Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
