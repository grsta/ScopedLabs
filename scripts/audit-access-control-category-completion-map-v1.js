const fs = require("fs");
const path = require("path");

const base = path.join("tools", "access-control");

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function has(text, token) {
  return String(text || "").includes(token);
}

function moduleParses(text) {
  try {
    new Function(text);
    return true;
  } catch {
    return false;
  }
}

function getH1(html) {
  const match = String(html || "").match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function getScriptVersion(html) {
  const matches = [...String(html || "").matchAll(/\.\/script\.js\?v=([^"']+)/g)];
  return matches.length ? matches[matches.length - 1][1] : "";
}

function checkToken(value) {
  return value ? "SAFE" : "FAIL";
}

const TOOL_CONTRACTS = {
  "scope-planner": { navMode: "pipeline", contributionType: "core-pipeline", summaryGroup: "Core Access Pipeline" },
  "fail-safe-fail-secure": { navMode: "pipeline", contributionType: "core-pipeline", summaryGroup: "Core Access Pipeline" },
  "reader-type-selector": { navMode: "pipeline", contributionType: "core-pipeline", summaryGroup: "Core Access Pipeline" },
  "lock-power-budget": { navMode: "pipeline", contributionType: "core-pipeline", summaryGroup: "Core Access Pipeline" },
  "panel-capacity": { navMode: "pipeline", contributionType: "core-pipeline", summaryGroup: "Core Access Pipeline" },
  "access-level-sizing": { navMode: "pipeline", contributionType: "core-pipeline", summaryGroup: "Core Access Pipeline" },

  "credential-format": { navMode: "category", contributionType: "supplemental", summaryGroup: "Supplemental Planning Tools" },
  "door-cable-length": { navMode: "category", contributionType: "supplemental", summaryGroup: "Supplemental Planning Tools" },
  "door-count-planner": { navMode: "category", contributionType: "supplemental", summaryGroup: "Supplemental Planning Tools" },

  "anti-passback-zones": { navMode: "category", contributionType: "specialty-branch", summaryGroup: "Specialty / What-if Branches" },
  "elevator-reader-count": { navMode: "category", contributionType: "specialty-branch", summaryGroup: "Specialty / What-if Branches" }
};

function contractFor(slug) {
  return TOOL_CONTRACTS[slug] || {
    navMode: "category",
    contributionType: "supplemental",
    summaryGroup: "Supplemental Planning Tools"
  };
}

function laneFor(slug, html, script) {
  if (slug === "panel-capacity") return "accepted-output-shell-reference";
  if (slug === "lock-power-budget") return "accepted-output-shell-reference";
  if (slug === "scope-planner") return "special-scope-entry";
  if (has(html, "accessControlLocalAssistantMount") || has(html, "reportMetadataMount")) return "advanced-shell-needs-output-contract";
  return "legacy-category-standard-needed";
}

function recommendedNext(row) {
  if (row.slug === "panel-capacity" || row.slug === "lock-power-budget") return "keep as accepted reference";
  if (row.slug === "scope-planner") return "audit as special entry/planner, not calculator output-shell";
  if (row.lane === "advanced-shell-needs-output-contract") return "compare to Panel Capacity shell/output pattern";
  return "legacy standard pass: remove breadcrumbs/helper clutter, add shell modules, convert output";
}

const polishPath = path.join("assets", "access-control-tool-polish.js");
const outputShellPath = path.join("assets", "access-control-output-shell.js");
const adapterPath = path.join("assets", "access-control-tool-assistant-adapters.js");
const categoryNavPath = path.join("assets", "access-control-category-nav.js");
const decisionSchedulePath = path.join("assets", "access-control-decision-schedule.js");
const toolShellPath = path.join("assets", "scopedlabs-tool-shell.js");
const localAssistantPath = path.join("assets", "scopedlabs-local-assistant.js");
const reportMetadataPath = path.join("assets", "scopedlabs-report-metadata.js");
const assistantExportPath = path.join("assets", "scopedlabs-assistant-export.js");

const polish = exists(polishPath) ? read(polishPath) : "";
const outputShell = exists(outputShellPath) ? read(outputShellPath) : "";
const adapters = exists(adapterPath) ? read(adapterPath) : "";
const categoryNav = exists(categoryNavPath) ? read(categoryNavPath) : "";
const decisionSchedule = exists(decisionSchedulePath) ? read(decisionSchedulePath) : "";
const toolShell = exists(toolShellPath) ? read(toolShellPath) : "";
const localAssistant = exists(localAssistantPath) ? read(localAssistantPath) : "";
const reportMetadata = exists(reportMetadataPath) ? read(reportMetadataPath) : "";
const assistantExport = exists(assistantExportPath) ? read(assistantExportPath) : "";

const rows = [];

const dirs = fs.readdirSync(base)
  .filter((name) => fs.statSync(path.join(base, name)).isDirectory())
  .sort();

for (const slug of dirs) {
  const htmlPath = path.join(base, slug, "index.html");
  const scriptPath = path.join(base, slug, "script.js");

  if (!exists(htmlPath)) continue;

  const html = read(htmlPath);
  const script = exists(scriptPath) ? read(scriptPath) : "";
  const lane = laneFor(slug, html, script);
  const contract = contractFor(slug);
  const isAcceptedReference = lane === "accepted-output-shell-reference";
  const isScopeEntry = lane === "special-scope-entry";

  const hasDecorativeLabels =
    has(html, "Pro Tier") ||
    has(html, "Part of a Design Flow") ||
    has(html, "Documentation & Export");

  const hasOldVisibleHelper =
    has(html, "Best for:") ||
    has(html, "tool-best-for") ||
    has(html, "Documentation & Export") ||
    has(html, 'pill--pro">Pro Tier') ||
    has(html, "This tool continues the Access Control design flow");

  const hasPipelineMount =
    has(html, 'id="pipeline"') ||
    has(html, "id='pipeline'");

  const hasPipelineRenderer =
    has(html, "/assets/tool-flow.js") &&
    has(html, "/assets/catalog.js") &&
    has(html, "/assets/pipelines.js") &&
    has(html, "/assets/pipeline-state.js") &&
    has(html, "/assets/pipeline.js");

  const hasPipelineMetadata =
    has(html, 'data-category="access-control"') &&
    has(html, "data-step=") &&
    has(html, "data-lane=");

  const hasRealPipelineNav =
    hasPipelineMount &&
    hasPipelineRenderer &&
    hasPipelineMetadata;

  const hasCategoryNav =
    hasPipelineMount &&
    has(html, "data-access-control-category-nav") &&
    has(html, "/assets/access-control-category-nav.js");

  const hasFlowNav =
    contract.navMode === "pipeline" ? hasRealPipelineNav : hasCategoryNav;

  const hasChartJs =
    has(html, "chart.js") ||
    has(html, "<canvas") ||
    has(script, "new Chart(") ||
    has(script, "function renderChart(");

  const hasToolShellContract =
    has(html, "scopedlabs-tool-shell.js");

  const hasAssistantShellContract =
    has(html, "accessControlLocalAssistantMount") &&
    has(html, "scopedlabs-local-assistant.js") &&
    has(html, "access-control-tool-assistant-adapters.js");

  const hasReportMetadataContract =
    has(html, "reportMetadataMount") &&
    has(html, "scopedlabs-report-metadata.js");

  const hasReportActionsInsideMetadata =
    contract.navMode === "pipeline" ||
    has(html, "data-report-actions") ||
    has(script, "placeCredentialFormatReportActions");

  const hasKbTopAnchor =
    has(html, 'id="flow-note"') ||
    has(html, "id='flow-note'");

  const hasSharedDecisionSchedule =
    has(html, "access-control-decision-schedule.js") &&
    has(script, "ScopedLabsAccessControlDecisionSchedule");

  const hasOutputShell =
    has(html, "access-control-output-shell.js") &&
    (has(script, "showVisual") || has(script, "ScopedLabsAccessControlDecisionSchedule"));

  const hasHiddenLedger =
    has(html, "data-result-ledger") &&
    (has(html, "#results[data-result-ledger][hidden]") || has(html, "[data-result-ledger][hidden]") || has(html, 'id="results"'));

  const hasCompactSchedule =
    has(html, "Capacity Schedule") ||
    has(html, "data-panel-capacity-summary") ||
    has(script, "renderCapacitySchedule") ||
    has(html, "Reader Decision Schedule") ||
    has(html, "data-reader-type-summary") ||
    has(html, "readerTypeSchedule") ||
    has(script, "renderReaderTypeSchedule") ||
    has(html, "Fail-State Decision Schedule") ||
    has(html, "data-fail-safe-summary") ||
    has(html, "failSafeDecisionSchedule") ||
    has(script, "renderFailSafeDecisionSchedule") ||
    has(html, "Access Level Complexity Schedule") ||
    has(html, "data-access-level-summary") ||
    has(html, "accessLevelSchedule") ||
    has(script, "renderAccessLevelSchedule") ||
    has(html, "Anti-Passback Decision Schedule") ||
    has(html, "data-apb-summary") ||
    has(html, "antiPassbackSchedule") ||
    has(script, "renderAntiPassbackSchedule") ||
    has(html, "Door Count Planning Schedule") ||
    has(html, "data-door-count-summary") ||
    has(script, "renderDoorCountPlanningSchedule") ||
    has(html, "Door Cable Routing Schedule") ||
    has(html, "data-access-control-decision-schedule") ||
    has(html, "data-door-cable-summary") ||
    has(html, "door-cable-summary-wrap") ||
    has(script, "renderDoorCableLengthSchedule") ||
    has(html, "Credential Format Decision Schedule") ||
    has(html, "data-credential-format-summary") ||
    has(html, "credential-format-summary-wrap") ||
    has(script, "renderCredentialFormatSchedule");

  const hasCredentialFormatSummaryContribution =
    slug === "credential-format" &&
    has(script, "publishCredentialFormatSummaryContribution") &&
    has(script, "contributionType: \"supplemental\"") &&
    has(script, "Supplemental Planning Tools");

  const hasDoorCableLengthSummaryContribution =
    slug === "door-cable-length" &&
    has(script, "publishDoorCableLengthSummaryContribution") &&
    has(script, "contributionType: \"supplemental\"") &&
    has(script, "Supplemental Planning Tools");

  const hasDoorCountPlannerSummaryContribution =
    slug === "door-count-planner" &&
    has(script, "publishDoorCountSummaryContribution") &&
    has(script, "contributionType: \"supplemental\"") &&
    has(script, "Supplemental Planning Tools");

  const hasSummaryReadyContribution =
    hasCredentialFormatSummaryContribution ||
    hasDoorCableLengthSummaryContribution ||
    hasDoorCountPlannerSummaryContribution ||
    (slug === "scope-planner" && (has(script, "ScopedLabsAccessControlScopeState") || has(script, "accessScopeLedger") || has(script, "final Access Control summary"))) ||
    has(script, "publishAccessLevelSummaryCarryover") ||
    has(script, "publishFailSafeResultToScopeLedger") ||
    (hasHiddenLedger &&
      (has(script, "currentReport") || has(script, "lastMetrics") || has(script, "register(")) &&
      (has(script, "summary") || has(script, "interpretation") || has(script, "currentReport") || has(script, "lastMetrics") || has(script, "register(")) &&
      (has(script, "summary") || has(script, "interpretation") || has(script, "recommendedActions") || has(html, "data-export-table-title")));

  const flowActionIndexes = [
    html.indexOf('id="accessControlFlowActions"'),
    html.indexOf('id="next-step-row"'),
    html.indexOf('data-sl-shell-back-continue="true"')
  ].filter((index) => index >= 0);

  const flowActionIndex = flowActionIndexes.length ? Math.min(...flowActionIndexes) : -1;
  const metadataIndex = html.indexOf('id="reportMetadataMount"');

  const hasFlowBeforeExport =
    flowActionIndex >= 0 &&
    metadataIndex >= 0 &&
    flowActionIndex < metadataIndex;

  rows.push({
    slug,
    title: getH1(html),
    lane,
    navMode: contract.navMode,
    contributionType: contract.contributionType,
    summaryGroup: contract.summaryGroup,
    scriptVersion: getScriptVersion(html),
    breadcrumbs: checkToken(!has(html, 'class="crumbs"')),
    flowNav: checkToken(hasFlowNav),
    toolShell: checkToken(isScopeEntry || hasToolShellContract),
    sharedPolish: checkToken(isScopeEntry || (has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'))),
    decorativeCovered: checkToken(isScopeEntry || !hasDecorativeLabels || (has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'))),
    helperClutter: checkToken(!hasOldVisibleHelper || isAcceptedReference),
    assistantShell: checkToken(isScopeEntry || hasAssistantShellContract),
    metadata: checkToken(isScopeEntry || (hasReportMetadataContract && hasReportActionsInsideMetadata)),
    kbTopAnchor: checkToken(isScopeEntry || hasKbTopAnchor),
    flowActions: checkToken(isScopeEntry || has(html, "accessControlFlowActions") || has(html, 'id="next-step-row"') || has(html, 'data-sl-shell-back-continue="true"')),
    flowBeforeExport: checkToken(isScopeEntry || !has(html, "reportMetadataMount") || hasFlowBeforeExport),
    outputShell: checkToken(isScopeEntry || isAcceptedReference || hasOutputShell),
    hiddenLedger: checkToken(isScopeEntry || isAcceptedReference || hasHiddenLedger),
    summaryReady: checkToken(hasSummaryReadyContribution),
    oldChart: checkToken(isScopeEntry || isAcceptedReference || !hasChartJs),
    compactOutput: checkToken(isScopeEntry || isAcceptedReference || hasCompactSchedule),
    next: recommendedNext({ slug, lane })
  });
}

const moduleRows = [
  { module: "access-control-tool-polish.js", exists: exists(polishPath), parses: moduleParses(polish), owns: "page chrome / decorative pills / export card polish" },
  { module: "access-control-output-shell.js", exists: exists(outputShellPath), parses: moduleParses(outputShell), owns: "visible visual lifecycle / hidden ledger / export image handoff" },
  { module: "access-control-tool-assistant-adapters.js", exists: exists(adapterPath), parses: moduleParses(adapters), owns: "assistant decision model adapters" },
  { module: "access-control-category-nav.js", exists: exists(categoryNavPath), parses: moduleParses(categoryNav), owns: "non-pipeline tool path nav / breadcrumb replacement" },
  { module: "access-control-decision-schedule.js", exists: exists(decisionSchedulePath), parses: moduleParses(decisionSchedule), owns: "shared access-control decision schedule renderer" },
  { module: "scopedlabs-tool-shell.js", exists: exists(toolShellPath), parses: moduleParses(toolShell), owns: "tool shell diagnostics / standard page helpers" },
  { module: "scopedlabs-local-assistant.js", exists: exists(localAssistantPath), parses: moduleParses(localAssistant), owns: "local assistant card renderer" },
  { module: "scopedlabs-report-metadata.js", exists: exists(reportMetadataPath), parses: moduleParses(reportMetadata), owns: "report metadata context mount" },
  { module: "scopedlabs-assistant-export.js", exists: exists(assistantExportPath), parses: moduleParses(assistantExport), owns: "assistant/export table helpers" }
];

console.log("\nAccess Control shared module inventory:");
console.table(moduleRows);

console.log("\nAccess Control category completion map:");
console.table(rows);

const failures = [];

for (const row of rows) {
  const failingKeys = Object.keys(row).filter((key) => row[key] === "FAIL");
  if (failingKeys.length) {
    failures.push({
      slug: row.slug,
      lane: row.lane,
      failing: failingKeys.join(", "),
      next: row.next
    });
  }
}

console.log("\nCategory completion failures / roadmap:");
if (!failures.length) {
  console.log("- Full Access Control category passes the current completion map.");
} else {
  console.table(failures);
}

console.log("\nRecommended rollout:");
console.log("1. Keep Lock Power and Panel Capacity as accepted output-shell references.");
console.log("2. Keep core pipeline tools on real pipeline nav/state; keep non-pipeline tools on TOOL PATH category nav.");
console.log("3. Bring every tool through the same modern shell: assistant, metadata, output shell, hidden ledger, and summary-ready contribution.");
console.log("4. Use contributionType to separate core-pipeline, supplemental, and specialty-branch summary sections.");
console.log("5. Extract shared Access Control CAD/table primitives only after another tool proves the repeated pattern.");

console.log("\nSafety rule:");
console.log("- This audit does not modify files.");
console.log("- Category-wide/global fixers must be plan-only first and require Glenn confirmation before apply; single-tool scoped patches may apply directly with clear scope and seatbelt checks.");

const failCount = failures.length;
console.log("\nSummary:");
console.log("- Tools scanned: " + rows.length);
console.log("- Tools with failures: " + failCount);

if (failCount) process.exit(1);