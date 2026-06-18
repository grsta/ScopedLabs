const fs = require("fs");

const file = "tools/compute/cpu-sizing/index.html";
const src = fs.readFileSync(file, "utf8");

const checks = [
  {
    id: "CPU_BACK_POINTS_TO_WORKLOAD_PLANNER",
    ok: src.includes('href="/tools/compute/workload-planner/"') && !src.includes('href="/tools/compute/"') && !src.includes(">Back to Compute<"),
    detail: "CPU back action should return to the Compute Workload Planner, not the Compute tools landing page."
  },
  {
    id: "CPU_BACK_ACTION_INSIDE_TOOL_FLOW",
    ok: src.includes('data-compute-cpu-back-actions="true"') && src.indexOf('data-compute-cpu-back-actions="true"') < src.indexOf("</main>"),
    detail: "CPU back action should be inside the main CPU page flow."
  },
  {
    id: "CPU_CONTINUE_STILL_RAM",
    ok: src.includes('/tools/compute/ram-sizing/'),
    detail: "CPU continue route should still go to RAM Sizing."
  },
  {
    id: "CPU_SCRIPT_CACHE_BUSTED",
    ok: src.includes("script.js?v=compute-cpu-planner-back-0617"),
    detail: "CPU script cache-bust should be updated with this lane."
  }
];

console.log("SCOPEDLABS COMPUTE CPU BACK ROUTE AUDIT V1\n");

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

  console.log("  " + file);
  console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
