const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];
let failed = false;

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function parses(rel) {
  const text = read(rel);
  if (!text) return false;
  try {
    new Function(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text);
    return true;
  } catch {
    return false;
  }
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
  if (!ok) failed = true;
}

const html = read("tools/access-control/anti-passback-zones/index.html");
const script = read("tools/access-control/anti-passback-zones/script.js");
const visuals = read("assets/access-control-planning-visuals.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");

check("Anti-Passback page exists", exists("tools/access-control/anti-passback-zones/index.html"));
check("Anti-Passback script parses", parses("tools/access-control/anti-passback-zones/script.js"));
check("Planning visual module parses", parses("assets/access-control-planning-visuals.js"));
check("Assistant adapter module parses", parses("assets/access-control-tool-assistant-adapters.js"));

check("Anti-Passback body declares v1 category lane", html.includes('data-tool="anti-passback-zones"') && html.includes('data-lane="v1"') && html.includes('data-nav-mode="category"'));
check("Anti-Passback loads tool shell", html.includes("/assets/scopedlabs-tool-shell.js"));
check("Anti-Passback loads local assistant and adapter modules", html.includes("/assets/scopedlabs-local-assistant.js") && html.includes("/assets/access-control-tool-assistant-adapters.js"));
check("Anti-Passback loads report metadata module", html.includes("/assets/scopedlabs-report-metadata.js") && html.includes('id="reportMetadataMount"'));
check("Anti-Passback keeps KB top anchor", html.includes('id="flow-note"'));
check("Anti-Passback keeps category nav", html.includes('data-access-control-category-nav="true"') && html.includes("/assets/access-control-category-nav.js"));
check("Anti-Passback has flow actions before metadata", html.indexOf('id="accessControlFlowActions"') > -1 && html.indexOf('id="reportMetadataMount"') > html.indexOf('id="accessControlFlowActions"'));
check("Anti-Passback report actions are metadata/dropdown owned", html.includes('data-report-actions') && script.includes("placeAntiPassbackReportActions"));

check("Anti-Passback has output visual shell", html.includes("access-control-output-shell.js") && html.includes('data-output-visual-owner="access-control-output-shell"'));
check("Anti-Passback has modern planning visual module", html.includes("access-control-planning-visuals.js") && visuals.includes("renderAntiPassback") && visuals.includes("buildAntiPassbackSvg"));
check("Anti-Passback script renders through shared visual module", script.includes("ScopedLabsAccessControlPlanningVisuals") && script.includes("renderAntiPassback"));
check("Anti-Passback exports modern SVG visual image", script.includes("getAntiPassbackVisualImage") && script.includes("getExportChartImage"));
check("Anti-Passback has compact decision schedule", html.includes("Anti-Passback Decision Schedule") && html.includes("data-apb-summary") && script.includes("renderAntiPassbackSchedule"));
check("Anti-Passback has hidden result ledger", html.includes("data-result-ledger") && html.includes("#results[data-result-ledger][hidden]"));
check("Anti-Passback publishes specialty summary contribution", script.includes("publishAntiPassbackSummaryContribution") && script.includes('contributionType: "specialty-branch"') && script.includes("Specialty / What-if Branches"));
check("Anti-Passback assistant adapter exists", adapters.includes("buildAntiPassbackZonesModel") && adapters.includes('"anti-passback-zones"'));

check("Anti-Passback removed Chart.js CDN", !html.includes("chart.js"));
check("Anti-Passback removed canvas chart", !html.includes("<canvas") && html.includes('class="access-control-output-visual"'));
check("Anti-Passback removed legacy Chart.js renderer", !script.includes("new Chart(") && !script.includes("function renderChart("));
check("Anti-Passback keeps canonical export engine", html.includes("/assets/export.js?v=shared-export-030-semantic-report-tones"));
check("Anti-Passback local script cache is modernized", html.includes("./script.js?v=access-control-anti-passback-output-contract-021"));

console.log("\\nAccess Control Anti-Passback module audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
