const cp = require("child_process");

const commands = [
  ["node", ["--check", "assets/scopedlabs-compute-shell-contract.js"]],
  ["node", ["--check", "assets/scopedlabs-compute-capacity-visuals.js"]],
  ["node", ["--check", "assets/scopedlabs-compute-assistant-contract.js"]],
  ["node", ["--check", "tools/compute/storage-throughput/script.js"]],
  ["node", ["--check", "scripts/audit-compute-storage-throughput-promotion-closeout-v1.js"]],
  ["node", ["scripts/audit-compute-storage-throughput-capacity-visual-v1.js"]],
  ["node", ["scripts/audit-compute-storage-throughput-proof-stack-v1.js"]],
  ["node", ["scripts/audit-compute-storage-throughput-export-payload-v1.js"]],
  ["node", ["scripts/audit-compute-storage-throughput-shell-parity-v1.js"]],
  ["node", ["scripts/audit-compute-storage-throughput-top-chrome-cleanup-v1.js"]],
  ["node", ["scripts/audit-compute-storage-throughput-promotion-closeout-v1.js"]],
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
try {
  status = cp.execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim();
} catch (error) {
  status = "git status unavailable: " + error.message;
}

const failed = results.filter((item) => !item.pass);

console.log("Compute Storage Throughput promotion closeout");
console.log("PASS " + (results.length - failed.length) + " / FAIL " + failed.length);

if (failed.length) {
  console.log("\nFailed sections:");
  failed.forEach((item) => {
    console.log("- " + item.label);
    if (item.output) console.log(item.output.split("\n").slice(-18).join("\n"));
  });
}

console.log("\nPassed sections:");
results.filter((item) => item.pass).forEach((item) => console.log("- " + item.label));

console.log("\nGit status:");
console.log(status || "clean");

if (failed.length) process.exit(1);

