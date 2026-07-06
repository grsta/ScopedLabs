const cp = require("child_process");
const commands = [
  ["node", ["--check", "tools/compute/vm-density/script.js"]],
  ["node", ["--check", "scripts/audit-compute-vm-density-ram-shell-parity-v1.js"]],
  ["node", ["scripts/audit-compute-vm-density-ram-shell-parity-v1.js"]],
  ["node", ["scripts/run-compute-vm-density-planning-inputs-v1.js"]]
];
const results = [];
for (const [cmd,args] of commands) {
  const label = cmd + " " + args.join(" ");
  try { cp.execFileSync(cmd,args,{stdio:"pipe",encoding:"utf8"}); results.push({label,pass:true}); }
  catch(e){ results.push({label,pass:false,output:String((e.stdout||"")+(e.stderr||"")).trim()}); }
}
const failed = results.filter((r)=>!r.pass);
console.log("Compute VM Density RAM shell parity closeout");
console.log("PASS " + (results.length - failed.length) + " / FAIL " + failed.length);
if (failed.length) {
  console.log("\nFailed sections:");
  failed.forEach((r)=>{ console.log("- " + r.label); if (r.output) console.log(r.output.split("\n").slice(-40).join("\n")); });
}
console.log("\nPassed sections:");
results.filter((r)=>r.pass).forEach((r)=>console.log("- " + r.label));
try { console.log("\nGit status:\n" + (cp.execFileSync("git",["status","--short"],{encoding:"utf8"}).trim() || "clean")); } catch {}
if (failed.length) process.exit(1);
