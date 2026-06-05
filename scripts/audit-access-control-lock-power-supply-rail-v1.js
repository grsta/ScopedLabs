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

check("Lock Power local script cache is CAD power rail lane", html.includes("./script.js?v=access-control-lock-power-cad-power-rail-025"));
check("Lock Power replaces old canvas chart with CAD SVG rail mount", html.includes('class="access-lock-power-cad-rail"') && !html.includes('<canvas id="chart"></canvas>'));
check("Lock Power includes CAD power rail styles", html.includes("access-lock-power-cad-power-rail-025"));
check("Lock Power script builds CAD rail SVG", script.includes("function buildCadPowerRailSvg") && script.includes("Lock Power Single-Line Diagram"));
check("Lock Power exports CAD rail as SVG data image", script.includes("function getCadPowerRailImage") && script.includes("data:image/svg+xml;charset=utf-8"));
check("Lock Power renderChart now renders CAD SVG rail", script.includes("els.chart.innerHTML = buildCadPowerRailSvg(metrics, { exportMode: false });"));
check("Old Power Stress Magnitude chart title removed", !script.includes("Power Stress Magnitude"));
check("Lock Power preserves core power formula", script.includes("const peak = effectiveSimul * amps;") && script.includes("const required = peak * (1 + headroom / 100);") && script.includes("const watts = required * voltage;"));
check("Lock Power scope hydration remains present", script.includes("applyActiveScopeToInputs") && script.includes("mapScopeLockType") && script.includes("getScopeLockCount"));
check("Lock Power assistant shell remains present", script.includes("renderLocalAssistant") && script.includes("applyShellModules"));

console.log("\nAccess Control Lock Power supply rail audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
