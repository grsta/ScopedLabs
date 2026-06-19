const fs = require("fs");
const { execSync } = require("child_process");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function exists(file) {
  return fs.existsSync(file);
}

function gitStatusFiles() {
  try {
    return execSync("git status --short", { encoding: "utf8" })
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^..\s+/, "").replace(/^\S+\s+/, ""));
  } catch (error) {
    return [];
  }
}

function hasReusablePatternSmell(file, content) {
  if (!/^tools\//.test(file)) return false;
  if (!/(script\.js|index\.html)$/.test(file)) return false;

  const smells = [
    "ExportPlainCell",
    "ExportValueCell",
    "ExportNoteCell",
    "ExportStatusTone",
    "colWidths:",
    "statusTone",
    "proof table",
    "Recommended Actions",
    "Decision Schedule"
  ];

  return smells.some((token) => content.includes(token));
}

const checks = [];

function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

const ledgerFile = "docs/scopedlabs-pattern-promotion-ledger.md";
const moduleMapFile = "docs/scopedlabs-module-map.md";
const batchRunnerFile = "scripts/run-scopedlabs-audit-batch-v1.js";

const ledger = read(ledgerFile);
const moduleMap = read(moduleMapFile);
const batchRunner = read(batchRunnerFile);
const changedFiles = gitStatusFiles();

console.log("SCOPEDLABS PATTERN PROMOTION AUDIT V1\n");

check(
  "PATTERN_PROMOTION_LEDGER_EXISTS",
  exists(ledgerFile) &&
    ledger.includes("Active promotion decisions") &&
    ledger.includes("Approved local exceptions") &&
    ledger.includes("BLOCKED_PROMOTION_REQUIRED"),
  ledgerFile,
  "Pattern Promotion Ledger must exist with active decisions and local exception sections."
);

check(
  "MODULE_MAP_REFERENCES_PATTERN_PROMOTION_LEDGER",
  moduleMap.includes("scopedlabs-pattern-promotion-ledger.md") &&
    moduleMap.includes("audit-scopedlabs-pattern-promotion-v1.js"),
  moduleMapFile,
  "Module map must reference the Pattern Promotion Ledger and this audit gate."
);

check(
  "BATCH_RUNNER_INCLUDES_PATTERN_PROMOTION_AUDIT",
  batchRunner.includes("scripts/audit-scopedlabs-pattern-promotion-v1.js"),
  batchRunnerFile,
  "Closeout batch runner must include the pattern-promotion gate."
);

const blockedEntries = [];
const entryRegex = /###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s+|\n##\s+|$)/g;
let match;

while ((match = entryRegex.exec(ledger)) !== null) {
  const id = match[1].trim();
  const body = match[2];

  if (/Status:\s*BLOCKED_PROMOTION_REQUIRED/i.test(body)) {
    blockedEntries.push(id);
  }

  const sharedOwnerMatch = body.match(/Shared owner:\s*([^\n]+)/i);
  const exceptionMatch = body.match(/Approved local exception:\s*([^\n]+)/i);
  const auditMatch = body.match(/Audit:\s*([^\n]+)/i);

  const sharedOwner = sharedOwnerMatch ? sharedOwnerMatch[1].trim() : "";
  const exception = exceptionMatch ? exceptionMatch[1].trim() : "";
  const audit = auditMatch ? auditMatch[1].trim() : "";

  if (/Status:\s*(SHARED_PATTERN|ADAPTER_CONSUMER)/i.test(body)) {
    check(
      "LEDGER_SHARED_OWNER_EXISTS_" + id.replace(/[^A-Z0-9]+/gi, "_").toUpperCase(),
      sharedOwner && sharedOwner !== "TBD" && exists(sharedOwner),
      ledgerFile,
      "Shared/adapted pattern entries must point to an existing shared owner path. Entry: " + id
    );

    check(
      "LEDGER_AUDIT_EXISTS_" + id.replace(/[^A-Z0-9]+/gi, "_").toUpperCase(),
      audit && audit !== "TBD" && exists(audit),
      ledgerFile,
      "Shared/adapted pattern entries must point to an existing audit. Entry: " + id
    );
  }

  if (/Status:\s*APPROVED_LOCAL_EXCEPTION/i.test(body)) {
    check(
      "LEDGER_EXCEPTION_HAS_REASON_" + id.replace(/[^A-Z0-9]+/gi, "_").toUpperCase(),
      exception && !/none|TBD/i.test(exception) && /Revisit trigger:\s*[^\n]+/i.test(body),
      ledgerFile,
      "Approved local exceptions must include a reason and revisit trigger. Entry: " + id
    );
  }
}

check(
  "NO_BLOCKED_PROMOTION_ENTRIES_FOR_CLOSEOUT",
  blockedEntries.length === 0,
  ledgerFile,
  blockedEntries.length
    ? "Blocked promotion entries remain: " + blockedEntries.join(", ")
    : "No blocked promotion entries remain."
);

const reusableSmells = changedFiles
  .filter((file) => exists(file))
  .map((file) => ({ file, content: read(file) }))
  .filter((item) => hasReusablePatternSmell(item.file, item.content))
  .filter((item) => {
    const documented = ledger.includes(item.file) || moduleMap.includes(item.file);
    const consumesShared =
      item.content.includes("ScopedLabs") &&
      (
        item.content.includes("window.ScopedLabs") ||
        item.content.includes("/assets/") ||
        item.content.includes("scopedlabs-")
      );

    const hasException = ledger.includes("APPROVED_LOCAL_EXCEPTION") && ledger.includes(item.file);

    return !(documented && (consumesShared || hasException));
  })
  .map((item) => item.file);

check(
  "CHANGED_REUSABLE_LOOKING_TOOL_FIXES_ARE_CLASSIFIED",
  reusableSmells.length === 0,
  "working tree",
  reusableSmells.length
    ? "Reusable-looking tool fixes need shared promotion or approved local exception: " + reusableSmells.join(", ")
    : "No unclassified reusable-looking changed tool fixes detected."
);

const sharedChanges = changedFiles.filter((file) =>
  /^assets\/scopedlabs-/.test(file) ||
  /^scripts\/audit-/.test(file)
);

if (sharedChanges.length) {
  check(
    "SHARED_OR_AUDIT_CHANGES_UPDATE_MODULE_MAP",
    changedFiles.includes(moduleMapFile),
    moduleMapFile,
    "Shared module or audit changes should update docs/scopedlabs-module-map.md in the same lane."
  );
}

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
