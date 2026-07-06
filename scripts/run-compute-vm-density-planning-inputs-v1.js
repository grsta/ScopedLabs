const cp = require("child_process");
const commands = [
  ["node", ["--check", "tools/compute/vm-density/script.js"]],
  ["node", ["--check", "scripts/audit-compute-vm-density-planning-inputs-v1.js"]],
  ["node", ["--check", "scripts/audit-compute-vm-density-tool-upgrade-v1.js"]],
  ["node", ["scripts/audit-compute-vm-density-planning-inputs-v1.js"]],
  ["node", ["scripts/audit-compute-vm-density-tool-upgrade-v1.js"]],
  ["node", ["scripts/audit-scopedlabs-module-map-v1.js"]]
];
const results = [];
function run(command, args) {
  const label = command + " " + args.join(" ");
  try {
    cp.execFileSync(command, args, { stdio: "pipe", encoding: "utf8" });
    results.push({ label, pass: true });
  } catch (error) {
    results.push({ label, pass: false, output: String((error.stdout || "") + (error.stderr || "")).trim() });
  }
}
commands.forEach(([command, args]) => run(command, args));
let status = "";
try { status = cp.execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim(); } catch { status = "git status unavailable"; }
const failed = results.filter((item) => !item.pass);
console.log("Compute VM Density planning inputs closeout");
console.log("PASS " + (results.length - failed.length) + " / FAIL " + failed.length);
if (failed.length) {
  console.log("\nFailed sections:");
  failed.forEach((item) => {
    console.log("- " + item.label);
    if (item.output) console.log(item.output.split("\n").slice(-30).join("\n"));
  });
}
console.log("\nPassed sections:");
results.filter((item) => item.pass).forEach((item) => console.log("- " + item.label));
console.log("\nGit status:");
console.log(status || "clean");
if (failed.length) process.exit(1);
