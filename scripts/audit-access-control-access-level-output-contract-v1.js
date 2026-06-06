const fs = require("fs");

const htmlPath = "tools/access-control/access-level-sizing/index.html";
const scriptPath = "tools/access-control/access-level-sizing/script.js";

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

function snippetAround(text, token, radius = 160) {
  const source = String(text || "");
  const index = source.toLowerCase().indexOf(String(token || "").toLowerCase());
  if (index < 0) return "";
  return source
    .slice(Math.max(0, index - radius), Math.min(source.length, index + token.length + radius))
    .replace(/\s+/g, " ")
    .trim();
}

function openingTagForId(html, id) {
  const tags = String(html || "").match(/<[^>]+>/g) || [];
  return tags.find((tag) => tag.includes('id="' + id + '"') || tag.includes("id='" + id + "'")) || "";
}

function tagIsHidden(tag) {
  return Boolean(tag) && (
    /\shidden(\s|>|$)/i.test(tag) ||
    /display\s*:\s*none/i.test(tag) ||
    /aria-hidden=["']true["']/i.test(tag)
  );
}

function getScriptVersion(html) {
  const matches = [...String(html || "").matchAll(/\.\/script\.js\?v=([^"']+)/g)];
  return matches.length ? matches[matches.length - 1][1] : "";
}

function rec(issueType) {
  const map = {
    breadcrumbs: [
      "Access Level HTML + shared polish audit",
      "Remove breadcrumb chrome from the tool page, matching accepted Access Control pages.",
      "No"
    ],
    helperClutter: [
      "Access Level HTML + existing shared polish",
      "Remove or hide legacy helper clutter: top Pro Tier row, design-flow helper card, and Best For sentence.",
      "No"
    ],
    assistant: [
      "Access Level HTML/script + access-control-tool-assistant-adapters.js + scopedlabs-local-assistant.js",
      "Add the existing local assistant mount and build an Access Level adapter/model without changing math.",
      "No"
    ],
    metadata: [
      "Access Level HTML + scopedlabs-report-metadata.js",
      "Replace manual expanded export metadata grid with the shared collapsed report metadata mount.",
      "No"
    ],
    flow: [
      "Access Level HTML/script + scopedlabs-tool-shell.js",
      "Convert Back/Complete controls to the standard Access Control flow action shell before Export Report.",
      "No"
    ],
    outputShell: [
      "Access Level HTML/script + assets/access-control-output-shell.js",
      "Load the existing output shell and route visible proof/export visual ownership through it.",
      "No"
    ],
    hiddenLedger: [
      "Access Level HTML/script + output shell contract",
      "Convert #results to hidden data-result-ledger and add CSS guard so .results-grid cannot leak visibly.",
      "No"
    ],
    oldChart: [
      "Access Level HTML/script",
      "Remove Chart.js dependency and old canvas chart. Replace with compact output-contract schedule/visual.",
      "No"
    ],
    compactOutput: [
      "Access Level HTML/script",
      "Add compact Access Level Complexity Schedule for visible output: access levels, combinations, pressure, admin load, limit, overshoot, status, and next action.",
      "No"
    ],
    export: [
      "Access Level HTML/script + export assets",
      "Preserve export/snapshot IDs and current report payload while moving display/export handoff to the shared shell pattern.",
      "No"
    ],
    math: [
      "Access Level local script",
      "Preserve roles × areas, schedule penalty, group penalty, complexity factor, recommended limit, risk thresholds, and admin load index.",
      "No"
    ],
    auth: [
      "Access Level HTML/script auth/pro gate",
      "Preserve Pro lock/unlock behavior and category entitlement checks.",
      "No"
    ]
  };

  const item = map[issueType] || ["manual review", "Inspect before patching.", "Unknown"];
  return { owner: item[0], course: item[1], newModule: item[2] };
}

let failed = false;
const rows = [];

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

if (!exists(htmlPath)) throw new Error("Missing " + htmlPath);
if (!exists(scriptPath)) throw new Error("Missing " + scriptPath);

const html = read(htmlPath);
const script = read(scriptPath);

const polishPath = "assets/access-control-tool-polish.js";
const outputShellPath = "assets/access-control-output-shell.js";
const adaptersPath = "assets/access-control-tool-assistant-adapters.js";
const localAssistantPath = "assets/scopedlabs-local-assistant.js";
const metadataPath = "assets/scopedlabs-report-metadata.js";
const toolShellPath = "assets/scopedlabs-tool-shell.js";
const assistantExportPath = "assets/scopedlabs-assistant-export.js";
const exportPath = "assets/export.js";

const polish = exists(polishPath) ? read(polishPath) : "";
const outputShell = exists(outputShellPath) ? read(outputShellPath) : "";
const adapters = exists(adaptersPath) ? read(adaptersPath) : "";
const localAssistant = exists(localAssistantPath) ? read(localAssistantPath) : "";
const metadata = exists(metadataPath) ? read(metadataPath) : "";
const toolShell = exists(toolShellPath) ? read(toolShellPath) : "";
const assistantExport = exists(assistantExportPath) ? read(assistantExportPath) : "";
const exportJs = exists(exportPath) ? read(exportPath) : "";

const resultsTag = openingTagForId(html, "results");
const flowIndex = html.indexOf('id="accessControlFlowActions"');
const exportIndex = html.indexOf('id="reportMetadataMount"') >= 0
  ? html.indexOf('id="reportMetadataMount"')
  : html.indexOf('id="exportReport"');

console.log("\nAccess Level Sizing module fit inventory:");
console.table([
  { Module: "polish", Exists: exists(polishPath), Parses: moduleParses(polish), Fit: has(polish, "ScopedLabsAccessControlToolPolish"), Owns: "chrome/pills/export polish" },
  { Module: "outputShell", Exists: exists(outputShellPath), Parses: moduleParses(outputShell), Fit: has(outputShell, "ScopedLabsAccessControlOutputShell"), Owns: "visual lifecycle / hidden ledger / export handoff" },
  { Module: "adapters", Exists: exists(adaptersPath), Parses: moduleParses(adapters), Fit: true, Owns: "assistant model adapter target" },
  { Module: "localAssistant", Exists: exists(localAssistantPath), Parses: moduleParses(localAssistant), Fit: true, Owns: "assistant rendering" },
  { Module: "metadata", Exists: exists(metadataPath), Parses: moduleParses(metadata), Fit: true, Owns: "report metadata" },
  { Module: "toolShell", Exists: exists(toolShellPath), Parses: moduleParses(toolShell), Fit: true, Owns: "Back/Complete shell" },
  { Module: "assistantExport", Exists: exists(assistantExportPath), Parses: moduleParses(assistantExport), Fit: true, Owns: "assistant export bridge" },
  { Module: "export", Exists: exists(exportPath), Parses: moduleParses(exportJs), Fit: true, Owns: "export mechanics" }
]);

check("Access Level script parses", moduleParses(script), "export");
check("Shared Access Control modules parse", moduleParses(polish) && moduleParses(outputShell) && moduleParses(adapters), "export");
check("Access Level Pro lock/auth gate remains present", has(html, 'data-protected="true"') && has(html, 'id="lockedCard"') && has(script, "unlockCategoryPage") && has(script, "hasExportAccess"), "auth");
check("Core Access Level math remains present", has(script, "roles * areas") && has(script, "schedulePenalty") && has(script, "groupPenalty") && has(script, "getComplexityFactor") && has(script, "getRecommendedLimit") && has(script, "adminLoadIndex"), "math");
check("Risk thresholds remain present", has(script, "total > 150") && has(script, "total > 80") && has(script, "RISK") && has(script, "WATCH") && has(script, "HEALTHY"), "math");
check("Export and snapshot IDs remain preserved", has(html, 'id="exportReport"') && has(html, 'id="saveSnapshot"') && has(html, 'id="exportStatus"'), "export");
check("Current local report payload exists", has(script, "buildReportPayload") && has(script, "currentReport") && has(script, "openReportWindow"), "export");

check("Access Level has no breadcrumbs", !has(html, 'class="crumbs"'), "breadcrumbs", snippetAround(html, 'class="crumbs"'));
check("Top Pro/design-flow helper clutter is gone", !has(html, "Part of a Design Flow") && !has(html, "tool-best-for") && !has(html, "This tool completes the Access Control design flow"), "helperClutter");
check("Access Level loads shared polish and opts in", has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'), "helperClutter");

check("Local assistant decision layer is wired", has(html, 'id="accessControlLocalAssistantMount"') && has(script, "renderLocalAssistant") && has(adapters, "access-level-sizing"), "assistant");
check("Report metadata dropdown is present", has(html, 'id="reportMetadataMount"') && has(html, "data-report-metadata") && has(html, "scopedlabs-report-metadata.js"), "metadata");
check("Manual expanded export metadata grid removed", !has(html, 'class="export-grid"') && !has(html, 'id="projectName"') && has(html, "reportMetadataMount"), "metadata");

check("Standard flow action shell is present", has(html, 'id="accessControlFlowActions"') && has(html, 'id="next-step-row"') && has(html, 'id="continue"'), "flow");
check("Flow action shell sits before Export Report", flowIndex >= 0 && exportIndex >= 0 && flowIndex < exportIndex, "flow");
check("Pipeline completion behavior remains available", has(script, "completeWrap") || has(html, 'id="complete-wrap"'), "flow");

check("Access Level loads Access Control output shell", has(html, "access-control-output-shell.js"), "outputShell");
check("Access Level uses output-shell visual lifecycle", has(script, "ScopedLabsAccessControlOutputShell") || has(script, "showVisual"), "outputShell");
check("Legacy result rows are hidden ledger only", has(html, 'id="results"') && has(html, "data-result-ledger") && tagIsHidden(resultsTag), "hiddenLedger", resultsTag || "missing #results");
check("Hidden result ledger has CSS leak guard", has(html, "#results[data-result-ledger][hidden]") || has(html, "[data-result-ledger][hidden]"), "hiddenLedger");

check("Access Level has no Chart.js dependency", !has(html, "chart.js") && !has(script, "new Chart("), "oldChart");
check("Old canvas chart is removed", !has(html, "<canvas") && !has(script, "renderChart(") && !has(script, "getExportChartImage"), "oldChart");
check("Compact Access Level schedule/table is present", has(html, "Access Level Complexity Schedule") || has(html, "data-access-level-summary") || has(script, "renderAccessLevelSchedule"), "compactOutput");

console.log("\nAccess Level Sizing output contract audit:");
console.table(rows);

const failures = rows.filter((row) => row.Status === "FAIL");

console.log("\nRecommended course:");
if (!failures.length) {
  console.log("- Access Level Sizing passes the legacy output contract. No fix plan needed.");
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
console.log("- SAFE: " + rows.filter((row) => row.Status === "SAFE").length);
console.log("- FAIL: " + failures.length);

if (failed) process.exit(1);