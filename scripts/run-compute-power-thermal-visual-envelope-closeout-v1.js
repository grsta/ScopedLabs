const { spawnSync } = require("child_process");

const checks = [
  ["node", ["--check", "assets/scopedlabs-compute-capacity-visuals.js"]],
  ["node", ["--check", "tools/compute/power-thermal/script.js"]],
  ["node", ["--check", "scripts/audit-compute-power-thermal-planning-shell-v1.js"]],
  ["node", ["--check", "scripts/audit-compute-power-thermal-visual-envelope-v1.js"]],
  ["node", ["scripts/audit-compute-power-thermal-planning-shell-v1.js"]],
  ["node", ["scripts/audit-compute-power-thermal-visual-envelope-v1.js"]],
  ["node", ["scripts/audit-scopedlabs-module-map-v1.js"]]
];

let failed = 0;
const passed = [];
const failures = [];

for (const [cmd, args] of checks) {
  const label = [cmd].concat(args).join(" ");
  const result = spawnSync(cmd, args, { encoding: "utf8", shell: false });
  if (result.status === 0) {
    passed.push(label);
  } else {
    failed += 1;
    failures.push(label + "\n" + (result.stdout || "") + (result.stderr || ""));
  }
}

console.log("Compute Power / Thermal visual envelope closeout");
console.log("PASS " + passed.length + " / FAIL " + failed);
if (failures.length) {
  console.log("\nFailed sections:");
  failures.forEach((failure) => console.log("- " + failure));
}
if (passed.length) {
  console.log("\nPassed sections:");
  passed.forEach((label) => console.log("- " + label));
}

const git = spawnSync("git", ["status", "--short"], { encoding: "utf8", shell: false });
console.log("\nGit status:");
console.log(git.status === 0 ? (git.stdout.trim() || "clean") : "git status unavailable\n" + git.stderr);
if (failed) process.exit(1);
