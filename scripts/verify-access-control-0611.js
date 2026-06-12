const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();
const verbose = process.argv.includes("--verbose");

const syntaxFiles = [
  "assets/access-control-tool-polish.js",
  "assets/access-control-planning-visuals.js",
  "assets/access-control-output-shell.js",
  "scripts/audit-access-control-main-gates-0610.js",
  "scripts/audit-access-control-evidence-suite-0611.js",
  "scripts/audit-access-control-cache-bust-map-0610.js",
  "scripts/audit-access-control-small-chip-alias-0611.js",
  "scripts/audit-access-control-small-chip-style-bodies-0611.js",
].filter((file) => fs.existsSync(path.join(root, file)));

const checks = [];
const failures = [];

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });

  return {
    label,
    command,
    args,
    code: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function shortFailure(result) {
  const text = [result.stdout, result.stderr]
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return text.slice(-12).join("\n");
}

function addCheck(kind, label, result, passPattern) {
  const output = result.stdout + "\n" + result.stderr;
  const passed = result.code === 0 && (!passPattern || passPattern.test(output));

  checks.push({
    kind,
    label,
    passed,
    code: result.code,
  });

  if (!passed) {
    failures.push({
      kind,
      label,
      code: result.code,
      detail: shortFailure(result),
    });
  }

  if (verbose || !passed) {
    console.log("");
    console.log("========================================================================");
    console.log(kind + " :: " + label);
    console.log("========================================================================");
    console.log(output.trim() || "(no output)");
  }
}

console.log("ScopedLabs Access Control Compact Verification - 0611");
console.log("Repo:", root);
console.log("");

for (const file of syntaxFiles) {
  const result = run("syntax " + file, "node", ["--check", path.join(root, file)]);
  addCheck("SYNTAX", file, result);
}

addCheck(
  "AUDIT",
  "main gates",
  run("main gates", "node", [path.join(root, "scripts/audit-access-control-main-gates-0610.js"), "--summary-only"]),
  /\[PASS\] Access Control main gates passed\./
);

addCheck(
  "AUDIT",
  "evidence suite",
  run("evidence suite", "node", [path.join(root, "scripts/audit-access-control-evidence-suite-0611.js")]),
  /PASS all evidence audits completed\./
);

const gitStatus = run("git status", "git", ["status", "--short"]);
const gitClean = gitStatus.code === 0 && gitStatus.stdout.trim() === "";

checks.push({
  kind: "GIT",
  label: "working tree",
  passed: gitClean,
  code: gitStatus.code,
});

if (!gitClean) {
  failures.push({
    kind: "GIT",
    label: "working tree",
    code: gitStatus.code,
    detail: gitStatus.stdout.trim() || gitStatus.stderr.trim() || "(unknown git status issue)",
  });
}

const byKind = checks.reduce((acc, check) => {
  if (!acc[check.kind]) acc[check.kind] = { pass: 0, fail: 0 };
  if (check.passed) acc[check.kind].pass += 1;
  else acc[check.kind].fail += 1;
  return acc;
}, {});

console.log("");
console.log("========================================================================");
console.log("ACCESS CONTROL FINAL VERIFICATION SUMMARY");
console.log("========================================================================");

for (const kind of Object.keys(byKind).sort()) {
  const row = byKind[kind];
  console.log(kind.padEnd(8) + " PASS " + String(row.pass).padStart(2, " ") + " / FAIL " + String(row.fail).padStart(2, " "));
}

console.log("");

if (failures.length) {
  console.log("FAILURES");
  for (const failure of failures) {
    console.log("");
    console.log("[" + failure.kind + "] " + failure.label + " — exit " + failure.code);
    console.log(failure.detail || "(no detail)");
  }

  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
console.log("");
console.log("Commit-ready if this was the final check before git add/commit/push.");