const fs = require("fs");

const htmlPath = "tools/access-control/anti-passback-zones/index.html";
const scriptPath = "tools/access-control/anti-passback-zones/script.js";
const adaptersPath = "assets/access-control-tool-assistant-adapters.js";
const outputShellPath = "assets/access-control-output-shell.js";
const polishPath = "assets/access-control-tool-polish.js";
const metadataPath = "assets/scopedlabs-report-metadata.js";
const toolShellPath = "assets/scopedlabs-tool-shell.js";
const assistantExportPath = "assets/scopedlabs-assistant-export.js";
const exportPath = "assets/export.js";
const categoryAuditPath = "scripts/audit-access-control-category-completion-map-v1.js";

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function has(text, token) {
  return String(text || "").includes(token);
}

function parses(text) {
  try {
    new Function(String(text || "").replace(/^\uFEFF/, ""));
    return true;
  } catch {
    return false;
  }
}

function getScriptVersion(html) {
  const matches = [...String(html || "").matchAll(/\.\/script\.js\?v=([^"']+)/g)];
  return matches.length ? matches[matches.length - 1][1] : "";
}

function count(text, token) {
  return (String(text || "").match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
}

function rec(issueType) {
  const map = {
    source: [
      "Anti-Passback source",
      "Inspect exact file boundaries before writing a fixer. Preserve APB math, auth, export IDs, and input IDs.",
      "No"
    ],
    shell: [
      "Anti-Passback HTML/script",
      "Remove breadcrumb/helper clutter, add shared metadata, tool shell, local assistant, assistant export bridge, output shell, and proper flow action row.",
      "No"
    ],
    output: [
      "Anti-Passback HTML/script",
      "Convert visible output from legacy result rows/chart into a compact APB decision schedule and hidden result ledger.",
      "No"
    ],
    chart: [
      "Anti-Passback HTML/script",
      "Remove Chart.js/canvas ownership from this tool. Replace with output-shell-safe compact table/CAD-style decision visual.",
      "No"
    ],
    assistant: [
      "Access Control assistant adapter",
      "Add anti-passback-zones adapter entry and pass status, zone count, enforcement mode, risk, lockout pressure, and recommended actions.",
      "No"
    ],
    carryover: [
      "Anti-Passback local script",
      "Publish a summary-ready Access Control payload. Do not wire summary consumption because Access Control summary/master assistant does not exist yet.",
      "No"
    ],
    audit: [
      "Anti-Passback audit",
      "Keep this audit read-only. Fixers must be plan-only first and require Glenn confirmation before apply.",
      "No"
    ]
  };

  const item = map[issueType] || map.source;

  return {
    owner: item[0],
    course: item[1],
    newModule: item[2]
  };
}

const required = [
  htmlPath,
  scriptPath,
  adaptersPath,
  outputShellPath,
  polishPath,
  metadataPath,
  toolShellPath,
  assistantExportPath,
  exportPath,
  categoryAuditPath
];

for (const file of required) {
  if (!exists(file)) {
    console.error("FAIL: Missing " + file);
    process.exit(1);
  }
}

const html = read(htmlPath);
const script = read(scriptPath);
const adapters = read(adaptersPath);
const outputShell = read(outputShellPath);
const polish = read(polishPath);
const metadata = read(metadataPath);
const toolShell = read(toolShellPath);
const assistantExport = read(assistantExportPath);
const exportJs = read(exportPath);
const categoryAudit = read(categoryAuditPath);

const rows = [];
let failed = false;

function check(label, ok, issueType, evidence = "") {
  const r = rec(issueType);

  rows.push({
    Status: ok ? "SAFE" : "FAIL",
    Check: label,
    BestOwner: ok ? "" : r.owner,
    NewModuleNeeded: ok ? "" : r.newModule,
    RecommendedCourse: ok ? "" : r.course,
    Evidence: evidence
  });

  if (!ok) failed = true;
}

const moduleRows = [
  ["polish", polishPath, "page chrome / decorative pills / export card polish"],
  ["outputShell", outputShellPath, "visual lifecycle / hidden ledger / export handoff"],
  ["adapters", adaptersPath, "assistant decision model adapters"],
  ["metadata", metadataPath, "report metadata"],
  ["toolShell", toolShellPath, "Back/Continue shell"],
  ["assistantExport", assistantExportPath, "assistant export bridge"],
  ["export", exportPath, "export mechanics"],
  ["categoryMap", categoryAuditPath, "category completion roadmap"]
].map(([module, file, owns]) => ({
  Module: module,
  Exists: exists(file),
  Parses: parses(read(file)),
  Owns: owns
}));

check("Anti-Passback script parses", parses(script), "audit");
check("Shared Access Control modules parse", moduleRows.every((row) => row.Exists && row.Parses), "audit");
check("Anti-Passback Pro lock/auth gate remains present", has(html, 'data-tier="pro"') && has(script, "hasExportAccess") && has(script, "getUnlockedCategories"), "source");
check("Core APB math remains present", has(script, "getRecommendedZones") && has(script, "getOperationalRisk") && has(script, "complexityIndexRaw") && has(script, "enforcementExposure") && has(script, "pairedEntrances"), "source");
check("Core APB inputs remain present", has(html, 'id="entrances"') && has(html, 'id="interiorAreas"') && has(html, 'id="floors"') && has(html, 'id="strategy"') && has(html, 'id="type"'), "source");
check("Export and snapshot IDs remain preserved", has(html, 'id="exportReport"') && has(html, 'id="saveSnapshot"') && has(html, 'id="exportStatus"'), "source");
check("Current local report payload exists", has(script, "currentReport") && has(script, "buildCurrentReportPayload"), "source");

check("Anti-Passback has no breadcrumbs", !has(html, 'class="crumbs"'), "shell");
check("Top Pro/design-flow helper clutter is gone", !has(html, 'pill--pro">Pro Tier') && !has(html, "Documentation & Export"), "shell");
check("Anti-Passback loads shared polish and opts in", has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'), "shell");
check("Local assistant decision layer is wired", has(html, "scopedlabs-local-assistant.js") && has(html, 'id="accessControlLocalAssistantMount"') && has(script, "renderLocalAssistant"), "assistant");
check("Anti-Passback assistant adapter exists", has(adapters, "anti-passback-zones") && has(adapters, "buildAntiPassbackZonesModel"), "assistant");
check("Report metadata dropdown is present", has(html, 'id="reportMetadataMount"') && has(html, "scopedlabs-report-metadata.js"), "shell");
check("Manual expanded export metadata grid removed", !has(html, 'id="projectName"') && !has(html, 'id="clientName"') && !has(html, 'id="preparedBy"') && !has(html, 'id="customNotes"'), "shell");
check("Standard flow action shell is present", has(html, 'id="next-step-row"') && has(script, "setupBackContinue") || has(script, "ScopedLabsToolShell"), "shell");
check("Flow action shell sits before Export Report", has(html, 'id="next-step-row"') && html.indexOf('id="next-step-row"') < html.indexOf('id="exportReport"'), "shell");
check("Pipeline completion behavior remains available", has(script, "writeFlow") || has(script, "ScopedLabsAnalyzer.writeFlow") || has(script, "localStorage"), "shell");

check("Anti-Passback loads Access Control output shell", has(html, "access-control-output-shell.js"), "output");
check("Anti-Passback uses output-shell visual lifecycle", has(script, "ScopedLabsAccessControlOutputShell") || has(script, "renderOutputShell") || has(script, "attachOutputShellExport"), "output");
check("Legacy result rows are hidden ledger only", has(html, 'id="results"') && has(html, "data-result-ledger") && has(html, "hidden") && has(html, 'aria-hidden="true"'), "output");
check("Hidden result ledger has CSS leak guard", has(html, "[data-result-ledger][hidden]") || has(html, ".results-grid[data-result-ledger][hidden]"), "output");
check("Anti-Passback has no Chart.js dependency", !has(html, "chart.js") && !has(script, "new Chart(") && !has(script, "Chart("), "chart");
check("Old canvas chart is removed", !has(html, "<canvas") && !has(html, 'id="chart"') && !has(script, "renderChart"), "chart");
check("Old custom report builder is removed", !has(script, "buildReportHTML") && !has(script, "openReportWindow") && !has(script, "window.open"), "output");
check("Compact Anti-Passback schedule/table is present", has(html, "Anti-Passback Decision Schedule") && has(script, "renderAntiPassbackSchedule"), "output");

check("Summary/master carryover key is declared", has(script, "SUMMARY_CARRYOVER_KEY") || has(script, "ACCESS_CONTROL_SUMMARY_KEY"), "carryover");
check("Summary/master carryover writer exists", has(script, "publishAntiPassbackSummaryCarryover") || has(script, "publishAccessControlSummaryPayload"), "carryover");
check("Carryover includes stable APB status", has(script, "antiPassbackStatus") && has(script, "recommendedZones") && has(script, "operationalRisk") && has(script, "recommendedEnforcementMode"), "carryover");
check("Carryover includes assistant summary/actions", has(script, "assistantSummary") && has(script, "recommendedActions"), "carryover");

console.log("\nAnti-Passback module fit inventory:");
console.table(moduleRows);

console.log("\nAnti-Passback output contract audit:");
console.table(rows);

const failures = rows.filter((row) => row.Status === "FAIL");

console.log("\nRecommended course:");
if (!failures.length) {
  console.log("- Anti-Passback passes the output contract. No fix plan needed.");
} else {
  failures.forEach((row, index) => {
    console.log(String(index + 1) + ". " + row.Check);
    console.log("   Best owner: " + row.BestOwner);
    console.log("   New module needed: " + row.NewModuleNeeded);
    console.log("   Course: " + row.RecommendedCourse);
    if (row.Evidence) console.log("   Evidence: " + row.Evidence);
  });
}

console.log("\nConfirmation rule:");
console.log("- This audit does not modify files.");
console.log("- Any fixer must print a plan first and must not apply changes until Glenn confirms.");

console.log("\nSummary:");
console.log("- Script version: " + getScriptVersion(html));
console.log("- #next-step-row count: " + count(html, 'id="next-step-row"'));
console.log("- SAFE: " + rows.filter((row) => row.Status === "SAFE").length);
console.log("- FAIL: " + failures.length);

if (failed) process.exit(1);