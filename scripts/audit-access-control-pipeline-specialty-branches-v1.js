const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
}

const pipelineJs = read("assets/pipeline.js");
const pipelines = read("assets/pipelines.js");
const index = read("tools/access-control/scope-planner/index.html");

const coreLabelsPresent = [
  "Fail-Safe",
  "Reader",
  "Lock Power",
  "Panel",
  "Access Level"
].every((token) => pipelines.includes(token));

check("Planner cache bumped to specialty pipeline lane", index.includes("access-control-scope-planner-area-match-008-specialty-pipeline"));
check("Pipeline renderer has category-aware grouped copy", pipelineJs.includes("const groupedFlowCopy") && pipelineJs.includes('category === "access-control"'));
check("Access foundation copy is present", pipelineJs.includes("Create or select the access scope being planned."));
check("Access core pipeline copy is present", pipelineJs.includes("Core access pipeline") && pipelineJs.includes("normal access-controlled doors"));
check("Access specialty copy is present", pipelineJs.includes("elevator, anti-passback, or special locking review"));
check("Access scope planner has foundation flowGroup", pipelines.includes('id: "scope-planner"') && pipelines.includes('flowGroup: "foundation"'));
check("Access core pipeline steps are present and default to core group", coreLabelsPresent && pipelineJs.includes('return "core";'));
check("Access pipeline includes elevator specialty branch", pipelines.includes('id: "elevator-bank-scope"') && pipelines.includes("Elevator Bank Scope"));
check("Access pipeline includes anti-passback specialty branch", pipelines.includes('id: "anti-passback-zone"') && pipelines.includes("Anti-Passback Zone"));
check("Access pipeline includes special locking specialty branch", pipelines.includes('id: "special-locking-scope"') && pipelines.includes("Special Locking / High-Security Scope"));
check("Specialty branches are optional", pipelines.includes("optional: true") && pipelines.includes('flowGroup: "optional-specialty-zone"'));

console.log("\nAccess Control pipeline specialty branches audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
