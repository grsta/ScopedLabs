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

const html = read("tools/access-control/elevator-reader-count/index.html");
const script = read("tools/access-control/elevator-reader-count/script.js");
const visuals = read("assets/access-control-planning-visuals.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");

check("Elevator Reader page exists", exists("tools/access-control/elevator-reader-count/index.html"));
check("Elevator Reader script parses", parses("tools/access-control/elevator-reader-count/script.js"));
check("Planning visual module parses", parses("assets/access-control-planning-visuals.js"));
check("Assistant adapter module parses", parses("assets/access-control-tool-assistant-adapters.js"));

check("Elevator Reader body declares v1 category lane", html.includes('data-tool="elevator-reader-count"') && html.includes('data-lane="v1"') && html.includes('data-nav-mode="category"'));
check("Elevator Reader loads tool shell", html.includes("/assets/scopedlabs-tool-shell.js"));
check("Elevator Reader loads local assistant and adapter modules", html.includes("/assets/scopedlabs-local-assistant.js") && html.includes("/assets/access-control-tool-assistant-adapters.js"));
check("Elevator Reader loads report metadata module", html.includes("/assets/scopedlabs-report-metadata.js") && html.includes('id="reportMetadataMount"'));
check("Elevator Reader keeps KB top anchor", html.includes('id="flow-note"'));
check("Elevator Reader keeps category nav", html.includes('data-access-control-category-nav="true"') && html.includes("/assets/access-control-category-nav.js"));
check("Elevator Reader imports Scope Planner seed", html.includes("/assets/access-control-scope-state.js") && html.includes('id="scopeSeedContextCard"') && script.includes("applyElevatorReaderScopeSeed") && script.includes("ELEVATOR_READER_SEED_KEY"));
check("Elevator Reader has topology-driven reader count inputs", html.includes('id="topology"') && html.includes("Bank / Location Count") && html.includes("Cars / Cabs per Bank or Location"));
check("Elevator Reader calculates total cars from topology model", script.includes("carsPerGroup") && script.includes("scopeCountInput") && script.includes("const cars = carsPerGroup * banks"));
check("Elevator Reader treats DCS as count driver", html.includes('id="dcsMode"') && html.includes('id="dcsCredentialPoints"') && script.includes("defaultElevatorDcsCredentialPoints") && script.includes("const dcsAdd = dcsCredentialPoints"));

check("Elevator Reader has flow actions before metadata", html.indexOf('id="accessControlFlowActions"') > -1 && html.indexOf('id="reportMetadataMount"') > html.indexOf('id="accessControlFlowActions"'));
check("Elevator Reader report actions are metadata/dropdown owned", html.includes('data-report-actions') && script.includes("placeElevatorReaderReportActions"));

check("Elevator Reader has output visual shell", html.includes("access-control-output-shell.js") && html.includes('data-output-visual-owner="access-control-output-shell"'));
check("Elevator Reader has modern planning visual module", html.includes("access-control-planning-visuals.js") && visuals.includes("renderElevatorReader") && visuals.includes("buildElevatorReaderSvg"));
check("Elevator Reader CAD primitives exist", visuals.includes("function cadElevatorBankIcon") && visuals.includes("function cadAccessReaderIcon"));
check("Elevator Reader uses shared CAD elevator and reader icons", visuals.includes("cadElevatorBankIcon({") && visuals.includes("cadAccessReaderIcon({"));
check("Elevator Reader CAD primitives are exported", visuals.includes("cadElevatorBankIcon,") && visuals.includes("cadAccessReaderIcon,"));
check("Elevator Reader CAD primitives are SVG-only", !visuals.includes("<image ") && !visuals.includes("href=\"data:image"));

check("Elevator Reader script renders through shared visual module", script.includes("ScopedLabsAccessControlPlanningVisuals") && script.includes("renderElevatorReader"));
check("Elevator Reader exports modern SVG visual image", script.includes("getElevatorReaderVisualImage") && script.includes("getExportChartImage"));
check("Elevator Reader has compact decision schedule", html.includes("Elevator Reader Decision Schedule") && html.includes("data-elevator-reader-summary") && script.includes("renderElevatorReaderSchedule"));
check("Elevator Reader has hidden result ledger", html.includes("data-result-ledger") && html.includes("#results[data-result-ledger][hidden]"));
check("Elevator Reader publishes specialty summary contribution", script.includes("publishElevatorReaderSummaryContribution") && script.includes('contributionType: "specialty-branch"') && script.includes("Specialty / What-if Branches"));
check("Elevator Reader assistant adapter exists", adapters.includes("buildElevatorReaderCountModel") && adapters.includes('"elevator-reader-count"'));

check("Elevator Reader removed Chart.js CDN", !html.includes("chart.js"));
check("Elevator Reader removed canvas chart", !html.includes("<canvas") && html.includes('class="access-control-output-visual"'));
check("Elevator Reader removed legacy Chart.js renderer", !script.includes("new Chart(") && !script.includes("function renderChart("));
check("Elevator Reader keeps canonical export engine", html.includes("/assets/export.js?v=shared-export-030-semantic-report-tones"));
check("Elevator Reader local script cache is modernized", html.includes("./script.js?v=access-control-elevator-reader-output-contract-025-dcs-driver"));

console.log("\nAccess Control Elevator Reader module audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
