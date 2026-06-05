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

check("Lock Power local script cache is visual output fix lane", html.includes("./script.js?v=access-control-lock-power-visual-output-fix-028"));
check("Lock Power keeps required DOM hook IDs", html.includes('id="results"') && html.includes('id="chartWrap"') && html.includes('id="chart"') && html.includes('id="accessControlLocalAssistantMount"'));
check("Lock Power visual card is hidden until calculation", html.includes('id="lockPowerVisualCard"') && html.includes('hidden'));
check("Lock Power results are retained as hidden ledger", html.includes('access-lock-power-ledger-results') && html.includes('data-result-ledger') && html.includes('id="results"'));
check("Old visible Results heading removed", !html.includes('<h3 class="h3" style="margin-top: 0;">Results</h3>'));
check("Lock Power visible output uses assistant plus CAD rail", html.includes('Power Distribution Rail') && html.includes('accessControlLocalAssistantMount'));
check("Script toggles visual card with chart lifecycle", script.includes('visualCard: $("lockPowerVisualCard")') && script.includes('if (els.visualCard) els.visualCard.hidden = false;') && script.includes('if (els.visualCard) els.visualCard.hidden = true;'));
check("Hidden ledger policy marker is present", script.includes("access-control-lock-power-hidden-ledger-policy-027"));
check("Export/summary ledger still collects result rows", script.includes('querySelectorAll(".result-row")') && script.includes("collectVisibleResults"));
check("Lock Power preserves core power formula", script.includes("const peak = effectiveSimul * amps;") && script.includes("const required = peak * (1 + headroom / 100);") && script.includes("const watts = required * voltage;"));
check("Lock Power assistant shell remains present", script.includes("renderLocalAssistant") && script.includes("applyShellModules"));
check("Lock Power CAD rail remains present", script.includes("buildCadPowerRailSvg") && script.includes("getCadPowerRailImage"));


check(
  "Lock Power explicitly renders CAD visual output",
  script.includes("function renderVisualOutput(metrics)") &&
    script.includes("renderVisualOutput(metrics);") &&
    script.includes("els.chart.innerHTML = buildCadPowerRailSvg(metrics, { exportMode: false });")
);

console.log("\nAccess Control Lock Power assistant output shell audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
