const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-dori-dedupe-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const guidance = read("assets/physical-security-category-guidance.js");
const summaryIndex = read("tools/physical-security/summary/index.html");
const proofAudit = read("scripts/audit-physical-security-summary-proof-v1.js");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("guidance-version", "category guidance", guidance, "physical-security-category-guidance-007-deduped-source-detail");
has("readiness-helper", "category guidance", guidance, "function readinessDetailFor(priority, status)");
has("readiness-risk-summary", "category guidance", guidance, "is blocking report readiness and needs correction at the source tool.");
has("readiness-watch-summary", "category guidance", guidance, "needs validation before the category summary is treated as clean.");
has("readiness-detail-use-helper", "category guidance", guidance, "detail: readinessDetailFor(queue[0], readyStatus)");
has("next-step-focus-first", "category guidance", guidance, "priority.correctionFocus || priority.detail || explanation.nextStep");
has("priority-reason-report-impact-first", "category guidance", guidance, "reason: priority.reportImpact || priority.detail ||");

add(
  "no-readiness-source-detail-repeat",
  !guidance.includes("? queue[0].detail")
    ? "SAFE"
    : "FAIL",
  !guidance.includes("? queue[0].detail")
    ? "readiness detail no longer reuses full source detail as top summary"
    : "readiness detail still reuses full source detail"
);

add(
  "no-next-step-detail-first",
  !guidance.includes("priority.detail || priority.correctionFocus || explanation.nextStep")
    ? "SAFE"
    : "FAIL",
  !guidance.includes("priority.detail || priority.correctionFocus || explanation.nextStep")
    ? "next step no longer prefers source detail before action focus"
    : "next step still prefers source detail first"
);

has("summary-index-guidance-cache", "Summary index", summaryIndex, "physical-security-category-guidance-007-deduped-source-detail");
has("summary-index-marker", "Summary index", summaryIndex, "physical-security-summary-dori-dedupe-042");

has("proof-version", "Summary proof audit", proofAudit, "physical-security-summary-proof-audit-026-deduped-source-detail");
has("proof-guidance-cache", "Summary proof audit", proofAudit, "physical-security-category-guidance-007-deduped-source-detail");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary DORI Dedupe Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
