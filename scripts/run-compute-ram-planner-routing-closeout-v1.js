const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const commands = [
  ["node", ["--check", "tools/compute/ram-sizing/script.js"]],
  ["node", ["--check", "scripts/audit-compute-ram-planner-routing-closeout-v1.js"]],
  ["node", ["scripts/audit-compute-ram-planner-routing-closeout-v1.js"]]
];

const optional = [
  "scripts/audit-compute-ram-proof-layout-v1.js",
  "scripts/audit-compute-ram-shell-consumption-v1.js",
  "scripts/audit-scopedlabs-module-map-v1.js"
];

optional.forEach((rel) => {
  if (fs.existsSync(path.join(process.cwd(), rel))) commands.push(["node", [rel]]);
});

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

console.log("Compute RAM planner-routing closeout");
console.log("PASS " + (results.length - failed.length) + " / FAIL " + failed.length);

if (failed.length) {
  console.log("\nFailed sections:");
  failed.forEach((item) => {
    console.log("- " + item.label);
    if (item.output) console.log(item.output.split("\n").slice(-20).join("\n"));
  });
}

console.log("\nPassed sections:");
results.filter((item) => item.pass).forEach((item) => console.log("- " + item.label));

console.log("\nGit status:");
console.log(status || "clean");

if (failed.length) process.exit(1);

