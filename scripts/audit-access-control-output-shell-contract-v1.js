const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

function scriptOrder(html, first, second) {
  const a = html.indexOf(first);
  const b = html.indexOf(second);
  return a >= 0 && b >= 0 && a < b;
}

let failed = false;
const rows = [];

const moduleText = read("assets/access-control-output-shell.js");
const lockPowerHtml = read("tools/access-control/lock-power-budget/index.html");
const lockPowerScript = read("tools/access-control/lock-power-budget/script.js");

check(
  "Access Control output shell module is present",
  moduleText.includes("window.ScopedLabsAccessControlOutputShell")
);

check(
  "Output shell contract marker is baked into module",
  moduleText.includes("ACCESS_CONTROL_OUTPUT_SHELL_CONTRACT_001") &&
    moduleText.includes('role: "assistant-owned-output-visual-export-handoff"')
);

check(
  "Output shell contract documents the visible/hidden output pattern",
  moduleText.includes('visibleDecisionLayer: "assistant-shell"') &&
    moduleText.includes('visibleEngineeringLayer: "cad-visual"') &&
    moduleText.includes('hiddenDataLayer: "result-ledger"') &&
    moduleText.includes('exportHandoff: "chart-image-getter"')
);

check(
  "Output shell contract declares future core targets",
  moduleText.includes('"panel-capacity"') &&
    moduleText.includes('"access-level-sizing"')
);

check(
  "Output shell exports its contract",
  moduleText.includes("CONTRACT,")
);

check(
  "Output shell exposes reusable visual lifecycle methods",
  moduleText.includes("showVisual") &&
    moduleText.includes("hideVisual")
);

check(
  "Output shell exposes reusable export handoff methods",
  moduleText.includes("register") &&
    moduleText.includes("getChartImage") &&
    moduleText.includes("attachExportGetter")
);

check(
  "Lock Power loads output shell module",
  lockPowerHtml.includes("/assets/access-control-output-shell.js")
);

check(
  "Lock Power loads output shell before local script",
  scriptOrder(
    lockPowerHtml,
    "/assets/access-control-output-shell.js",
    "./script.js?v=access-control-lock-power-"
  )
);

check(
  "Lock Power uses assistant-owned output shell pattern",
  lockPowerScript.includes("function outputShell()") &&
    lockPowerScript.includes("shell.showVisual") &&
    lockPowerScript.includes("shell.hideVisual")
);

check(
  "Lock Power registers CAD visual for export handoff",
  lockPowerScript.includes("attachOutputShellExport") &&
    lockPowerScript.includes("shell.attachExportGetter") &&
    lockPowerScript.includes("getCadPowerRailImage(lastMetrics, { exportMode: true })")
);

check(
  "Lock Power keeps hidden ledger data layer",
  lockPowerHtml.includes('data-result-ledger') &&
    lockPowerHtml.includes('id="results"') &&
    lockPowerScript.includes("collectVisibleResults")
);

check(
  "Lock Power visible output is assistant plus CAD rail",
  lockPowerHtml.includes('id="accessControlLocalAssistantMount"') &&
    lockPowerHtml.includes('id="lockPowerVisualCard"') &&
    lockPowerHtml.includes('id="chartWrap"') &&
    lockPowerHtml.includes('id="chart"') &&
    lockPowerScript.includes("buildCadPowerRailSvg")
);

check(
  "Lock Power preserves required export/snapshot IDs",
  lockPowerHtml.includes('id="exportReport"') &&
    lockPowerHtml.includes('id="saveSnapshot"') &&
    lockPowerHtml.includes('id="reportMetadataMount"')
);

check(
  "Lock Power preserves core formulas",
  lockPowerScript.includes("const peak = effectiveSimul * amps;") &&
    lockPowerScript.includes("const required = peak * (1 + headroom / 100);") &&
    lockPowerScript.includes("const watts = required * voltage;")
);


const polish = read("assets/access-control-tool-polish.js");

check(
  "Access Control export card decoration is module-owned",
  polish.includes("function applyExportCardPolish") &&
    polish.includes("data-access-control-export-decoration-hidden")
);

console.log("\nAccess Control output shell contract audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
