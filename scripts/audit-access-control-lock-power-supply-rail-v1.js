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

check("Lock Power local script cache is supply rail lane", html.includes("./script.js?v=access-control-lock-power-supply-rail-024"));
check("Lock Power replaces old canvas chart with SVG rail mount", html.includes('class="access-lock-power-rail"') && !html.includes('<canvas id="chart"></canvas>'));
check("Lock Power includes supply rail styles", html.includes("access-lock-power-supply-rail-024"));
check("Lock Power script builds supply rail SVG", script.includes("function buildSupplyRailSvg") && script.includes("Lock Power Supply Rail"));
check("Lock Power exports supply rail as SVG data image", script.includes("function getSupplyRailImage") && script.includes("data:image/svg+xml;charset=utf-8"));
check("Lock Power renderChart now renders SVG rail", script.includes("els.chart.innerHTML = buildSupplyRailSvg(metrics, { exportMode: false });"));
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
