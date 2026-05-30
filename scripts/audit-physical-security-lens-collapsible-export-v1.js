const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-collapsible-export-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

function add(rows, id, status, detail) { rows.push({ id, status, detail }); }
function safe(rows, id, ok, detail) { add(rows, id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/lens-selection/index.html");
const script = read("tools/physical-security/lens-selection/script.js");

const rows = [];
safe(rows, "lens-index-exists", exists("tools/physical-security/lens-selection/index.html"), "lens index exists");
safe(rows, "lens-script-exists", exists("tools/physical-security/lens-selection/script.js"), "lens script exists");
safe(rows, "report-metadata-helper-loads", index.includes("/assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-002-title-defaults"), "shared report metadata helper loads before export");
safe(rows, "report-metadata-mount", index.includes("id=\"reportMetadataMount\"") && index.includes("data-report-metadata"), "report metadata mount exists");
safe(rows, "metadata-collapsed", index.includes("data-collapsed=\"true\""), "report metadata defaults collapsed");
safe(rows, "metadata-fields", index.includes("data-report-fields=\"reportTitle,projectName,clientName,preparedBy,customNotes\""), "standard metadata fields configured");
safe(rows, "export-button-remains", index.includes("button id=\"exportReport\"") && index.includes(">Open Report</button>"), "normal Open Report button remains");
safe(rows, "snapshot-remains", index.includes("button id=\"saveSnapshot\""), "snapshot button remains");
safe(rows, "engineering-summary-remains", index.includes("id=\"lensReportSummaryExport\"") && script.includes("renderLensReportSummary(data);"), "hidden Lens Engineering Summary remains");
safe(rows, "lens-cache", index.includes("./script.js?v=physical-security-lens-summary-cta-state-015"), "Lens cache bumped for collapsible export");
safe(rows, "no-old-export-grid", !index.includes("class=\"export-grid\""), "old always-open export grid removed");
safe(rows, "no-old-visible-inputs", !index.includes("<input id=\"reportTitle\"") && !index.includes("<input id=\"projectName\"") && !index.includes("<input id=\"clientName\"") && !index.includes("<input id=\"preparedBy\"") && !index.includes("<textarea id=\"customNotes\""), "old always-visible metadata inputs removed");
safe(rows, "no-old-export-label", !index.includes("Open Export Report"), "old Open Export Report label removed");
safe(rows, "no-report-v2", !index.includes("Open Report V2") && !index.includes("openReportV2") && !script.includes("openReportV2"), "Report V2 remains removed");

console.log("");
console.log("Physical Security Lens Collapsible Export Audit");
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
