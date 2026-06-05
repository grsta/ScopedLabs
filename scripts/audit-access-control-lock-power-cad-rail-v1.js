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

check("Lock Power local script cache is CAD label cleanup lane", html.includes("./script.js?v=access-control-lock-power-cad-label-cleanup-026"));
check("Lock Power preserves chart DOM hook IDs", html.includes('id="chartWrap"') && html.includes('id="chart"'));
check("Lock Power uses CAD rail mount, not canvas", html.includes("access-lock-power-cad-rail") && !html.includes('<canvas id="chart"></canvas>'));
check("Lock Power includes CAD power rail styles", html.includes("access-lock-power-cad-power-rail-025"));
check("CAD renderer creates power supply symbol", script.includes("function accessPowerSupplySymbol") && script.includes("ACCESS POWER"));
check("CAD renderer creates terminal pair symbol", script.includes("function terminalPair"));
check("CAD renderer creates labeled DC rail", script.includes("function dcPowerRail") && script.includes("DC RAIL"));
check("CAD renderer creates peak and required markers", script.includes("function currentMarker") && script.includes("Peak load") && script.includes("Required supply"));
check("CAD renderer creates headroom bracket", script.includes("function headroomBracket") && script.includes("headroom"));
check("CAD renderer creates lock load bank", script.includes("function electricStrikeLoadSymbol") && script.includes("Lock Loads"));
check("CAD renderer uses only existing calculated metrics", script.includes("metrics?.peak") && script.includes("metrics?.required") && script.includes("metrics?.watts") && script.includes("metrics?.utilizationPct"));
check("CAD renderer remains report-safe SVG data image", script.includes("function getCadPowerRailImage") && script.includes("data:image/svg+xml;charset=utf-8"));
check("renderChart uses CAD SVG rail", script.includes("els.chart.innerHTML = buildCadPowerRailSvg(metrics, { exportMode: false });"));
check("Export image uses CAD SVG rail", script.includes("getCadPowerRailImage(lastMetrics, { exportMode: true })"));
check("Lock Power preserves core power formula", script.includes("const peak = effectiveSimul * amps;") && script.includes("const required = peak * (1 + headroom / 100);") && script.includes("const watts = required * voltage;"));
check("Lock Power scope hydration remains present", script.includes("applyActiveScopeToInputs") && script.includes("mapScopeLockType") && script.includes("getScopeLockCount"));
check("Lock Power assistant shell remains present", script.includes("renderLocalAssistant") && script.includes("applyShellModules"));


check(
  "Lock Power compact label policy is present",
  script.includes("access-control-lock-power-compact-label-policy-026") &&
    script.includes("LOAD BANK") &&
    script.includes("' active × '")
);

console.log("\nAccess Control Lock Power CAD rail audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
