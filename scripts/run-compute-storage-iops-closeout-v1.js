const { spawnSync } = require("child_process");

const sections = [
  {
    label: "Storage IOPS script syntax",
    command: "node",
    args: ["--check", ".\\tools\\compute\\storage-iops\\script.js"]
  },
  {
    label: "Compute capacity visuals syntax",
    command: "node",
    args: ["--check", ".\\assets\\scopedlabs-compute-capacity-visuals.js"]
  },
  {
    label: "Storage IOPS chart/layout audit",
    command: "node",
    args: [".\\scripts\\audit-compute-storage-iops-chart-layout-v1.js"]
  },
  {
    label: "Storage IOPS planning shell audit",
    command: "node",
    args: [".\\scripts\\audit-compute-storage-iops-planning-shell-v1.js"]
  },
  {
    label: "ScopedLabs module map audit",
    command: "node",
    args: [".\\scripts\\audit-scopedlabs-module-map-v1.js"]
  }
];

function run(section) {
  const result = spawnSync(section.command, section.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join("\\n");
  const failedLines = combined
    .split(/\\r?\\n/)
    .filter((line) => /\\[FAIL\\]|FAIL:\\s*[1-9]|OVERALL:\\s*FAIL|SyntaxError|Error:/.test(line));

  return {
    label: section.label,
    command: section.command + " " + section.args.join(" "),
    status: result.status === 0 ? "PASS" : "FAIL",
    failedLines,
    stderr: stderr.trim()
  };
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false
  });

  return (result.stdout || "").trim();
}

const results = sections.map(run);
const failed = results.filter((item) => item.status !== "PASS");

console.log("SCOPEDLABS COMPUTE STORAGE IOPS CLOSEOUT");
console.log("");
console.log("OVERALL: " + (failed.length ? "FAIL" : "PASS"));
console.log("PASS: " + (results.length - failed.length));
console.log("FAIL: " + failed.length);
console.log("");

if (failed.length) {
  console.log("FAILED SECTIONS");
  failed.forEach((item) => {
    console.log("- " + item.label);
    console.log("  Command: " + item.command);
    if (item.failedLines.length) {
      console.log("  Failed:");
      item.failedLines.forEach((line) => console.log("    " + line));
    } else {
      console.log("  Failed: command exited non-zero but no [FAIL] lines were found.");
    }
  });
  console.log("");
}

console.log("PASSED SECTIONS");
results
  .filter((item) => item.status === "PASS")
  .forEach((item) => console.log("- " + item.label));

console.log("");
console.log("GIT STATUS");
const status = gitStatus();
console.log(status || "clean");

process.exit(failed.length ? 1 : 0);
