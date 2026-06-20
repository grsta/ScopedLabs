const { spawnSync } = require("child_process");
const fs = require("fs");

const audits = process.argv.slice(2);

const defaultAudits = [
  "scripts/audit-compute-cpu-status-guidance-v1.js",
  "scripts/audit-compute-export-proof-stack-order-v1.js",
  "scripts/audit-compute-export-proof-table-contract-v1.js",
  "scripts/audit-compute-flow-actions-shell-contract-v1.js",
  "scripts/audit-scopedlabs-module-map-v1.js",
  "scripts/audit-scopedlabs-pattern-promotion-v1.js",
  "scripts/audit-scopedlabs-planner-summary-nav-contract-v1.js",
  "scripts/audit-compute-planner-summary-pipeline-nav-v1.js",
  "scripts/audit-scopedlabs-tool-assistant-contract-v1.js",
  "scripts/audit-compute-assistant-rendering-contract-v1.js",
  "scripts/audit-compute-ram-proof-layout-v1.js",
  "scripts/audit-compute-ram-export-parity-v1.js",
  "scripts/audit-compute-ram-export-shell-parity-v1.js",
  "scripts/audit-compute-ram-top-shell-parity-v1.js",
  "scripts/audit-compute-reference-marker-tone-v1.js",
  "scripts/audit-compute-tool-shell-consumption-v1.js"
];

const list = audits.length ? audits : defaultAudits;

function extractIssues(output, kind) {
  const lines = String(output || "").split(/\r?\n/);
  const issues = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!line.startsWith("[" + kind + "]")) continue;

    const detail = [];
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      if (/^\[(PASS|WATCH|SKIP|FAIL)\]/.test(lines[j])) break;
      if (/^SUMMARY\b/.test(lines[j])) break;
      if (lines[j].trim()) detail.push(lines[j].trim());
    }

    issues.push({
      header: line.trim(),
      detail
    });
  }

  return issues;
}

console.log("SCOPEDLABS AUDIT BATCH RUNNER V1\n");

const results = [];

for (const audit of list) {
  if (!fs.existsSync(audit)) {
    results.push({
      audit,
      status: "FAIL",
      exitCode: 1,
      stdout: "",
      stderr: "Audit file not found.",
      failIssues: [{ header: "[FAIL] AUDIT_FILE_NOT_FOUND", detail: [audit] }],
      watchIssues: []
    });
    continue;
  }

  const run = spawnSync(process.execPath, [audit], {
    encoding: "utf8",
    shell: false
  });

  const stdout = run.stdout || "";
  const stderr = run.stderr || "";
  const failIssues = extractIssues(stdout + "\n" + stderr, "FAIL");
  const watchIssues = extractIssues(stdout + "\n" + stderr, "WATCH");

  results.push({
    audit,
    status: run.status === 0 ? "PASS" : "FAIL",
    exitCode: run.status,
    stdout,
    stderr,
    failIssues,
    watchIssues
  });

  console.log("[" + (run.status === 0 ? "PASS" : "FAIL") + "] " + audit);
  if (watchIssues.length) {
    console.log("  WATCH: " + watchIssues.length);
  }
  if (failIssues.length) {
    console.log("  FAIL: " + failIssues.length);
  }
}

const failed = results.filter((item) => item.status === "FAIL");
const watched = results.filter((item) => item.watchIssues.length);

console.log("\nSUMMARY");
console.log("AUDITS: " + results.length);
console.log("PASS: " + results.filter((item) => item.status === "PASS").length);
console.log("FAIL: " + failed.length);
console.log("WATCHING AUDITS: " + watched.length);
console.log("OVERALL: " + (failed.length ? "FAIL" : "PASS"));

if (failed.length) {
  console.log("\nFAILED AUDITS");
  for (const item of failed) {
    console.log("\n- " + item.audit);
    console.log("  Exit code: " + item.exitCode);

    if (item.failIssues.length) {
      for (const issue of item.failIssues) {
        console.log("  " + issue.header);
        for (const detail of issue.detail) {
          console.log("    " + detail);
        }
      }
    } else {
      console.log("  [FAIL] AUDIT_EXITED_NONZERO_WITHOUT_STRUCTURED_FAIL_LINE");
      const tail = (item.stderr || item.stdout || "").split(/\r?\n/).filter(Boolean).slice(-12);
      for (const line of tail) console.log("    " + line);
    }
  }
}

if (watched.length) {
  console.log("\nWATCH ITEMS");
  for (const item of watched) {
    console.log("\n- " + item.audit);
    for (const issue of item.watchIssues) {
      console.log("  " + issue.header);
      for (const detail of issue.detail) {
        console.log("    " + detail);
      }
    }
  }
}

process.exit(failed.length ? 1 : 0);
