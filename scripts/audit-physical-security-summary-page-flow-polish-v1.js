const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-page-flow-polish-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const index = read("tools/physical-security/summary/index.html");
const rows = [];
function add(id, ok, detail) { rows.push({ id, status: ok ? "SAFE" : "FAIL", detail }); }

add("description-removed", !index.includes("Final category rollup, master assistant review, and report-ready Physical Security handoff."), "page-title description removed");
add("flow-row-exists", index.includes("summary-hero-flow") && index.includes("summary-flow-step") && index.includes("summary-flow-arrow"), "hero flow row exists");
add("flow-labels-exist", index.includes("Final Category Rollup") && index.includes("Cross-Category Ready"), "flow labels remain");
add("old-pills-removed", !index.includes("<span class=\"pill\">Final Category Rollup</span>") && !index.includes("<span class=\"pill\">Cross-Category Ready</span>"), "old hero pills removed");
add("flow-style-exists", index.includes("physical-security-summary-page-flow-polish-004") && index.includes(".summary-flow-arrow"), "flow row styles exist");
add("master-remains", index.includes("physicalSecuritySummaryMasterMount") && index.includes("physicalSecuritySummaryMasterContext"), "master assistant mounts remain");

console.log("");
console.log("Physical Security Summary Page Flow Polish Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const fail = rows.filter((row) => row.status === "FAIL").length;
const safe = rows.filter((row) => row.status === "SAFE").length;
console.log("");
console.log("Summary:");
console.log("- SAFE:", safe);
console.log("- FAIL:", fail);
if (fail) process.exitCode = 1;
else console.log("\nAudit complete.");
