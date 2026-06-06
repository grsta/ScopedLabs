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

const polish = exists(polishPath) ? read(polishPath) : "";
const outputShell = exists(outputShellPath) ? read(outputShellPath) : "";
const adapters = exists(adapterPath) ? read(adapterPath) : "";

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

  const hasPipelineNav =
    has(html, 'id="pipeline"') ||
    has(html, "id='pipeline'");

  const hasChartJs =
    has(html, "chart.js") ||
    has(html, "<canvas") ||
    has(script, "new Chart(") ||
    has(script, "function renderChart(");

  const hasOutputShell =
    has(html, "access-control-output-shell.js") &&
    has(script, "showVisual");

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
    has(script, "renderAntiPassbackSchedule");

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
    scriptVersion: getScriptVersion(html),
    breadcrumbs: checkToken(!has(html, 'class="crumbs"')),
    pipelineNav: checkToken(hasPipelineNav),
    sharedPolish: checkToken(isScopeEntry || (has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'))),
    decorativeCovered: checkToken(isScopeEntry || !hasDecorativeLabels || (has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'))),
    helperClutter: checkToken(!hasOldVisibleHelper || isAcceptedReference),
    assistantShell: checkToken(isScopeEntry || has(html, "accessControlLocalAssistantMount")),
    metadata: checkToken(isScopeEntry || has(html, "reportMetadataMount")),
    flowActions: checkToken(isScopeEntry || has(html, "accessControlFlowActions") || has(html, 'id="next-step-row"') || has(html, 'data-sl-shell-back-continue="true"')),
    flowBeforeExport: checkToken(isScopeEntry || !has(html, "reportMetadataMount") || hasFlowBeforeExport),
    outputShell: checkToken(isScopeEntry || isAcceptedReference || hasOutputShell),
    hiddenLedger: checkToken(isScopeEntry || isAcceptedReference || hasHiddenLedger),
    oldChart: checkToken(isScopeEntry || isAcceptedReference || !hasChartJs),
    compactOutput: checkToken(isScopeEntry || isAcceptedReference || hasCompactSchedule),
    next: recommendedNext({ slug, lane })
  });
}

const moduleRows = [
  { module: "access-control-tool-polish.js", exists: exists(polishPath), parses: moduleParses(polish), owns: "page chrome / decorative pills / export card polish" },
  { module: "access-control-output-shell.js", exists: exists(outputShellPath), parses: moduleParses(outputShell), owns: "visible visual lifecycle / hidden ledger / export image handoff" },
  { module: "access-control-tool-assistant-adapters.js", exists: exists(adapterPath), parses: moduleParses(adapters), owns: "assistant decision model adapters" }
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
console.log("2. Bring legacy calculator tools through page chrome + shell + output contract.");
console.log("3. Bring advanced shell tools through output contract where appropriate.");
console.log("4. Treat Scope Planner as a special entry/planner, not a standard calculator output page.");
console.log("5. Extract shared Access Control CAD/table primitives only after another tool proves the repeated pattern.");

console.log("\nSafety rule:");
console.log("- This audit does not modify files.");
console.log("- Category-wide/global fixers must be plan-only first and require Glenn confirmation before apply; single-tool scoped patches may apply directly with clear scope and seatbelt checks.");

const failCount = failures.length;
console.log("\nSummary:");
console.log("- Tools scanned: " + rows.length);
console.log("- Tools with failures: " + failCount);

if (failCount) process.exit(1);