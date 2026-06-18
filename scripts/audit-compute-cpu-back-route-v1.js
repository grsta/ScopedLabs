const fs = require("fs");

const file = "tools/compute/cpu-sizing/index.html";
const src = fs.readFileSync(file, "utf8");

const actionIndex = src.indexOf('data-compute-cpu-flow-actions="true"');
const exportIndex = src.indexOf("Export Report");
const footerIndex = src.indexOf("<footer");

const checks = [
  {
    id: "CPU_FLOW_ACTION_ROW_EXISTS",
    ok: actionIndex !== -1,
    detail: "CPU should have one unified planner-style flow action row."
  },
  {
    id: "CPU_BACK_POINTS_TO_WORKLOAD_PLANNER",
    ok: src.includes('href="/tools/compute/workload-planner/"') && !/>\s*Back to Compute\s*</.test(src),
    detail: "CPU Back should return to Workload Planner, not the Compute landing page."
  },
  {
    id: "CPU_CONTINUE_STILL_RAM",
    ok: src.includes('id="continue"') && src.includes("/tools/compute/ram-sizing/"),
    detail: "CPU Continue should still route to RAM Sizing."
  },
  {
    id: "CPU_CONTINUE_WRAP_PRESERVED",
    ok: src.includes('id="continue-wrap"') && actionIndex < src.indexOf('id="continue-wrap"'),
    detail: "Continue wrapper must remain for existing show/hide logic."
  },
  {
    id: "CPU_ACTION_ROW_AFTER_EXPORT_BEFORE_FOOTER",
    ok: actionIndex > exportIndex && (footerIndex === -1 || actionIndex < footerIndex),
    detail: "CPU action row should sit in the main page flow after Export Report and before footer."
  },
  {
    id: "CPU_CONTINUE_TEXT_USES_SAFE_ARROW_ENTITY",
    ok: src.includes("Continue &rarr; RAM Sizing") && !src.includes("Continue ? RAM Sizing"),
    detail: "CPU Continue button should use the HTML arrow entity so it renders consistently without source glyph corruption."
  },
  {
    id: "CPU_SCRIPT_CACHE_BUSTED",
    ok: src.includes("script.js?v=compute-cpu-flow-actions-arrow-0617"),
    detail: "CPU index should reference the current CPU page script version."
  }
];

console.log("SCOPEDLABS COMPUTE CPU FLOW ACTIONS AUDIT V1\n");

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
