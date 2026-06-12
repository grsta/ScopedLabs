const { spawnSync } = require("child_process");
const path = require("path");

const root = process.cwd();

const AUDITS = [
  {
    title: "Status chip contract",
    file: "scripts/audit-access-control-status-chip-contract-0611.js",
    args: ["--summary-only"],
  },
  {
    title: "Status chip migration state",
    file: "scripts/audit-access-control-status-chip-migration-state-0611.js",
    patterns: [
      "Migration summary",
      "SHARED_SQUARE_CHIP_MIGRATED",
      "LOCAL_PILL_CSS_REMOVED",
      "HERO_PLACEMENT_PRESERVED",
      "OVERALL:",
    ],
  },
  {
    title: "Small status chip alias",
    file: "scripts/audit-access-control-small-chip-alias-0611.js",
    args: ["--summary-only"],
  },
  {
    title: "Small status chip style bodies",
    file: "scripts/audit-access-control-small-chip-style-bodies-0611.js",
    patterns: [
      "Summary",
      "DIFF",
      "LOCAL_ONLY",
      "MISSING_BOTH",
      "SHARED_ONLY",
      "Interpretation:",
      "Summary: audit only / 0 FAIL",
    ],
  },
  {
    title: "Status rendering map",
    file: "scripts/audit-access-control-status-rendering-map-0611.js",
    patterns: [
      "Bucket summary",
      "VISIBLE_DECISION_STATUS_REVIEW",
      "STATUS_EXPORT_CONTROL_KEEP_ONLY",
      "SPECIAL_PATH_SKIP",
      "Summary:",
    ],
  },
  {
    title: "Status shared coverage",
    file: "scripts/audit-access-control-status-shared-coverage-0611.js",
    patterns: [
      "Tool bucket summary",
      "NO_VISIBLE_STATUS_SELECTOR",
      "PAGE_NAMED_STATUS_KEEP_REVIEW",
      "SHARED_STATUS_SELECTOR_DIFF_REVIEW",
      "SPECIAL_PATH_SKIP",
      "Summary:",
    ],
  },
  {
    title: "Status chip evidence",
    file: "scripts/audit-access-control-status-chip-evidence-0610.js",
    args: ["--summary-only"],
  },
  {
    title: "Lock Power visual chip",
    file: "scripts/audit-access-control-lock-power-visual-chip-0611.js",
    patterns: [
      "Decision bucket",
      "LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED",
      "FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED",
      "EXPORT_STATUS_CONTROLS_UNTOUCHED",
      "LEDGERS_AND_CARRY_FORWARD_UNTOUCHED",
      "OVERALL:",
    ],
  },
  {
    title: "Lock Power visual chip readiness",
    file: "scripts/audit-access-control-lock-power-visual-chip-readiness-0611.js",
    patterns: [
      "Visual ownership map",
      "LOCK_POWER_VISUAL_CHIP_ALREADY_RECTANGULAR",
      "GENERATED_STATUS_PILL_PATH",
      "EXPORT_STATUS_KEEP_SEPARATE",
      "LEDGER_KEEP_SEPARATE",
      "FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED",
      "OVERALL:",
    ],
  },  {
    title: "Lock Power status pill path",
    file: "scripts/audit-access-control-lock-power-status-pill-path-0611.js",
    patterns: [
      "Generated status path",
      "Style ownership",
      "Decision summary",
      "LOCK_POWER_VISUAL_CHIP_LOCAL_OWNERSHIP_PRESERVED",
      "EXPORT_STATUS_KEEP_SEPARATE",
      "LEDGER_KEEP_SEPARATE",
      "FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED",
      "OVERALL:",
    ],
  },
  {
    title: "Page-local evidence",
    file: "scripts/audit-access-control-page-local-evidence-0610.js",
    args: ["--summary-only"],
  },
  {
    title: "Style reuse map",
    file: "scripts/audit-access-control-style-reuse-map-0610.js",
    args: ["--summary-only"],
  },
  {
    title: "Style selector map",
    file: "scripts/audit-access-control-style-selector-map-0610.js",
    args: ["--summary-only"],
  },
  {
    title: "Shared result style parity",
    file: "scripts/audit-access-control-shared-result-style-parity-0610.js",
    patterns: [
      "Status summary",
      "Selector summary",
      "EXACT_SHARED_MATCH",
      "MISSING_SHARED_RULE",
      "MISSING_PAGE_RULE",
      "Summary:",
    ],
  },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runAudit(audit) {
  const filePath = path.join(root, audit.file);
  const args = [filePath].concat(audit.args || []);

  const result = spawnSync("node", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });

  const output = [result.stdout || "", result.stderr || ""].join("");

  return {
    audit,
    code: typeof result.status === "number" ? result.status : 1,
    output,
  };
}

function filterOutput(output, patterns) {
  if (!patterns || !patterns.length) return String(output || "").trim();

  const regexes = patterns.map((pattern) => new RegExp(escapeRegExp(pattern), "i"));

  return String(output || "")
    .split(/\r?\n/)
    .filter((line) => regexes.some((regex) => regex.test(line)))
    .join("\n")
    .trim();
}

let failCount = 0;

console.log("ScopedLabs Access Control Evidence Suite - 0611");
console.log("Repo root:", root);
console.log("");
console.log("This suite is informational. Main gates remain scripts/audit-access-control-main-gates-0610.js.");
console.log("");

for (const audit of AUDITS) {
  console.log("========================================================================");
  console.log(audit.title);
  console.log("========================================================================");

  const result = runAudit(audit);
  const filtered = filterOutput(result.output, audit.patterns);

  if (filtered) {
    console.log(filtered);
  } else {
    console.log("(no filtered output)");
  }

  if (result.code !== 0) {
    failCount += 1;
    console.log("");
    console.log("FAIL " + audit.file + " exited with code " + result.code);
  } else {
    console.log("");
    console.log("PASS " + audit.file);
  }

  console.log("");
}

console.log("========================================================================");
console.log("Evidence suite summary");
console.log("========================================================================");

if (failCount > 0) {
  console.log("FAIL " + failCount + " audit(s) returned non-zero.");
  process.exit(1);
}

console.log("PASS all evidence audits completed.");
console.log("");
console.log("Reminder: run the main gates before commit/push:");
console.log("node .\\scripts\\audit-access-control-main-gates-0610.js --summary-only");