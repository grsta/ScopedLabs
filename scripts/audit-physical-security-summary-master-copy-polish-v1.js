const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-master-copy-polish-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const renderer = read("assets/physical-security-category-guidance-renderer.js");
const index = read("tools/physical-security/summary/index.html");
const proof = read("scripts/audit-physical-security-summary-proof-v1.js");
const guidance = exists("assets/physical-security-category-guidance.js") ? read("assets/physical-security-category-guidance.js") : "";
const knowledge = exists("assets/physical-security-category-knowledge.js") ? read("assets/physical-security-category-knowledge.js") : "";

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

check("renderer-copy-polish", "renderer", renderer, [
  "physical-security-category-guidance-renderer-003-draft-next-action-copy",
  "summaryMaster: clone(explanation.summaryMaster || null)",
  "function priorityLabel(model)",
  "type === \"start-core-pipeline\"",
  "return \"Next Action\"",
  "return \"Priority Tool\"",
  "escapeHtml(label)"
]);

check("summary-index-renderer-cache", "summary index", index, [
  "/assets/physical-security-category-guidance-renderer.js?v=physical-security-category-guidance-renderer-003-draft-next-action-copy",
  "physical-security-summary-master-copy-polish-040"
]);

check("proof-audit-renderer-cache", "summary proof audit", proof, [
  "physical-security-summary-proof-audit-024-master-copy-polish",
  "/assets/physical-security-category-guidance-renderer.js?v=physical-security-category-guidance-renderer-003-draft-next-action-copy"
]);

[
  ["renderer", renderer],
  ["category guidance", guidance],
  ["category knowledge", knowledge]
].forEach(([name, source]) => {
  add(
    "no-plnning-typo-" + name.replace(/[^a-z0-9]+/gi, "-"),
    !source.includes("Plnning draft") ? "SAFE" : "FAIL",
    !source.includes("Plnning draft") ? name + " does not contain Plnning draft typo" : name + " still contains Plnning draft typo"
  );
});

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Master Copy Polish Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
