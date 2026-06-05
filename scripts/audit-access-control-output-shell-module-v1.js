const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

let failed = false;
const rows = [];

const html = read("tools/access-control/lock-power-budget/index.html");
const script = read("tools/access-control/lock-power-budget/script.js");
const moduleText = read("assets/access-control-output-shell.js");

check(
  "Access Control output shell module exists",
  moduleText.includes("ScopedLabsAccessControlOutputShell") &&
    moduleText.includes("access-control-output-shell-001-lock-power-visual-export")
);

check(
  "Output shell exposes visual show/hide helpers",
  moduleText.includes("showVisual") &&
    moduleText.includes("hideVisual")
);

check(
  "Output shell exposes export chart getter handoff",
  moduleText.includes("attachExportGetter") &&
    moduleText.includes("getChartImage")
);

check(
  "Lock Power loads output shell module",
  html.includes("/assets/access-control-output-shell.js?v=access-control-output-shell-001-lock-power-visual-export")
);

check(
  "Lock Power local script cache is output shell module lane",
  html.includes("./script.js?v=access-control-lock-power-output-shell-module-029")
);

check(
  "User-facing architecture note is hidden/removed",
  !html.includes("The visible output is the assistant decision shell plus")
);

check(
  "Lock Power uses module for visual rendering",
  script.includes("function outputShell()") &&
    script.includes("shell.showVisual") &&
    script.includes("shell.hideVisual")
);

check(
  "Lock Power registers export visual with module",
  script.includes("attachOutputShellExport") &&
    script.includes("shell.attachExportGetter") &&
    script.includes("getCadPowerRailImage(lastMetrics, { exportMode: true })")
);

check(
  "Lock Power fixed undefined metrics render call",
  script.includes("renderVisualOutput(lastMetrics);") &&
    !script.includes("renderVisualOutput(metrics);\n\n    currentReport")
);

check(
  "Lock Power preserves core formulas",
  script.includes("const peak = effectiveSimul * amps;") &&
    script.includes("const required = peak * (1 + headroom / 100);") &&
    script.includes("const watts = required * voltage;")
);

check(
  "Lock Power keeps required visual/export IDs",
  html.includes('id="results"') &&
    html.includes('id="chartWrap"') &&
    html.includes('id="chart"') &&
    html.includes('id="exportReport"') &&
    html.includes('id="saveSnapshot"')
);


check(
  "Output shell contract is exported",
  moduleText.includes("ACCESS_CONTROL_OUTPUT_SHELL_CONTRACT_001") &&
    moduleText.includes("CONTRACT,") &&
    moduleText.includes('role: "assistant-owned-output-visual-export-handoff"')
);

console.log("\nAccess Control output shell module audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
