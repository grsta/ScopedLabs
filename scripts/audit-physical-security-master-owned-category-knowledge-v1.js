const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-master-owned-category-knowledge-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const knowledge = read("assets/physical-security-category-knowledge.js");
const policy = read("assets/physical-security-source-policy.js");
const guidance = read("assets/physical-security-category-guidance.js");
const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const proof = read("scripts/audit-physical-security-summary-proof-v1.js");

const rows = [];

function add(name, status, detail) {
  rows.push({ name, status, detail });
}

function check(prefix, sourceName, source, signals) {
  signals.forEach((signal) => {
    const ok = source.includes(signal);
    add(
      prefix + "-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
      ok ? "SAFE" : "FAIL",
      ok ? sourceName + " contains " + signal : sourceName + " missing " + signal
    );
  });
}

check("knowledge-owned-category", "category knowledge", knowledge, [
  "physical-security-category-knowledge-002-owned-category-master",
  "const masterAssistantProfile =",
  "const reportReadinessRules =",
  "const areaZoneModel =",
  "const crossCategoryDependencies =",
  "const toolCorrectionProfiles =",
  "const siteAssistantHandoffModel =",
  "function getMasterAssistantProfile()",
  "function getToolCorrectionProfile(slug)",
  "function explainCorrection(slug, status)",
  "function buildOwnedCategoryKnowledgeSnapshot()",
  "Does not change tool formulas",
  "Risk/Watch corrections must be made by returning to the source tool"
]);

check("source-policy-master", "source policy", policy, [
  "physical-security-source-policy-002-master-knowledge-guardrails",
  "const masterAssistantSourceRules =",
  "function getMasterAssistantSourceRules()",
  "Current-method or web-derived information can make the master assistant smarter about procedures, but it cannot change ScopedLabs calculations."
]);

check("category-guidance-master", "category guidance", guidance, [
  "physical-security-category-guidance-004-owned-category-master",
  "function explainSummaryMasterGuidance(context)",
  "function buildSummaryMasterReview(categoryGuidance, context)",
  "function correctionQueue(categoryGuidance, context)",
  "ownedCategoryKnowledge: getKnowledgeSnapshot()",
  "source tool math remains authoritative",
  "explainSummaryMasterGuidance,"
]);

check("summary-index-loads", "summary index", index, [
  "/assets/physical-security-source-policy.js?v=physical-security-source-policy-002-master-knowledge-guardrails",
  "/assets/physical-security-category-knowledge.js?v=physical-security-category-knowledge-002-owned-category-master",
  "/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-004-owned-category-master",
  "./script.js?v=physical-security-summary-owned-category-master-014",
  "physical-security-summary-owned-category-master-038"
]);

check("summary-script-master", "summary script", script, [
  "physical-security-summary-owned-category-master-014",
  "function buildSummaryMasterExplanation(model)",
  "categoryApi.explainSummaryMasterGuidance({",
  "function summaryMasterPayload(explanation)",
  "masterAssistant: summaryMasterPayload(masterExplanation)",
  "Owned category knowledge",
  "master.ownedCategoryKnowledge"
]);

check("proof-audit", "summary proof audit", proof, [
  "physical-security-summary-proof-audit-022-owned-category-master",
  "/assets/physical-security-source-policy.js?v=physical-security-source-policy-002-master-knowledge-guardrails",
  "/assets/physical-security-category-knowledge.js?v=physical-security-category-knowledge-002-owned-category-master",
  "function buildSummaryMasterExplanation(model)",
  "masterAssistant: summaryMasterPayload(masterExplanation)"
]);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Master Owned Category Knowledge Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
