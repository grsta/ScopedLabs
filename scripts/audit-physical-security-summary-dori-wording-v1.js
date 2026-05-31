const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-dori-wording-audit-002-dedupe-sync";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const guidance = read("assets/physical-security-category-guidance.js");
const knowledge = read("assets/physical-security-category-knowledge.js");
const summaryIndex = read("tools/physical-security/summary/index.html");
const proofAudit = read("scripts/audit-physical-security-summary-proof-v1.js");
const coverageScript = fs.existsSync(path.join(ROOT, "tools/physical-security/camera-coverage-area/script.js"))
  ? read("tools/physical-security/camera-coverage-area/script.js")
  : "";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("guidance-version", "category guidance", guidance, "physical-security-category-guidance-007-deduped-source-detail");
has("guidance-detail-helper", "category guidance", guidance, "function correctionDetailFor(item, profile)");
has("guidance-focus-helper", "category guidance", guidance, "function correctionFocusFor(item, profile)");
has("guidance-prefers-item-reason", "category guidance", guidance, "correctionTextValue(item && item.reason)");
has("guidance-uses-helper-detail", "category guidance", guidance, "detail: correctionDetailFor(item, profile)");
has("guidance-uses-helper-focus", "category guidance", guidance, "correctionFocus: correctionFocusFor(item, profile)");

add(
  "guidance-no-profile-first-detail",
  !guidance.includes("detail: profile.meaning || item.nextStep || item.detail || item.reason")
    ? "SAFE"
    : "FAIL",
  !guidance.includes("detail: profile.meaning || item.nextStep || item.detail || item.reason")
    ? "Summary correction queue no longer hides source-tool-specific reasons behind generic profile meaning"
    : "Summary correction queue still prefers generic profile meaning first"
);

has("knowledge-version", "category knowledge", knowledge, "physical-security-category-knowledge-003-dori-master-wording");
has("knowledge-dori-risk-wording", "category knowledge", knowledge, "DORI/pixel-density feasibility");
has("knowledge-dori-correction-focus", "category knowledge", knowledge, "Rework the usable footprint before spacing by checking DORI detection feasibility");
has("knowledge-dori-question", "category knowledge", knowledge, "Does the usable width require more horizontal pixels than a normal detection baseline can provide?");
has("knowledge-dori-impact", "category knowledge", knowledge, "pixel-density confidence");

has("summary-index-guidance-cache", "Summary index", summaryIndex, "physical-security-category-guidance-007-deduped-source-detail");
has("summary-index-knowledge-cache", "Summary index", summaryIndex, "physical-security-category-knowledge-003-dori-master-wording");
has("summary-index-marker", "Summary index", summaryIndex, "physical-security-summary-dori-master-wording-041");

has("proof-audit-version", "Summary proof audit", proofAudit, "physical-security-summary-proof-audit-026-deduped-source-detail");
has("proof-audit-guidance-cache", "Summary proof audit", proofAudit, "physical-security-category-guidance-007-deduped-source-detail");
has("proof-audit-knowledge-cache", "Summary proof audit", proofAudit, "physical-security-category-knowledge-003-dori-master-wording");

if (coverageScript) {
  has("coverage-dori-reason-source", "Coverage Area script", coverageScript, "doriReason: doriCheck.reason");
  has("coverage-dori-required-pixels-source", "Coverage Area script", coverageScript, "doriRequiredDetectionHorizontalPx");
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary DORI Wording Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
