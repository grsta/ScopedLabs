const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-master-draft-queue-audit-002-proof-sync";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const category = read("assets/physical-security-category-guidance.js");
const index = read("tools/physical-security/summary/index.html");
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

check("category-draft-queue", "category guidance", category, [
  "physical-security-category-guidance-005-master-draft-queue",
  "const generatedCount = Number((source.counts && source.counts.generated) || 0);",
  "if (!riskWatch.length && !generatedCount && missingCoreRows.length)",
  "type: \"start-core-pipeline\"",
  "status: \"unknown\"",
  "label: \"Start core pipeline\"",
  "Start with ",
  "Open \" + toolLabel + \" to begin generating saved guidance for this Summary.",
  "Summary remains a planning draft until core Physical Security guidance is generated.",
  "const readyStatus = !generatedCount ? \"unknown\" : (status === \"unknown\" && missingCore.length ? \"watch\" : status);",
  "explanation.nextStep = priority\n      ? (priority.detail || priority.correctionFocus || explanation.nextStep)"
]);

check("summary-index-draft-queue", "summary index", index, [
  "/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-005-master-draft-queue",
  "physical-security-summary-master-draft-queue-039"
]);

check("proof-audit-draft-queue", "summary proof audit", proof, [
  "physical-security-summary-proof-audit-023-master-draft-queue",
  "/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-005-master-draft-queue",
]);

add(
  "old-route-only-next-step-removed",
  !category.includes('(priority.label || "Review priority item") + ": " + priority.route') ? "SAFE" : "FAIL",
  !category.includes('(priority.label || "Review priority item") + ": " + priority.route')
    ? "category guidance no longer uses route-only nextStep language"
    : "category guidance still uses route-only nextStep language"
);

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Master Draft Queue Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
