const fs = require("fs");

const htmlPath = "tools/access-control/fail-safe-fail-secure/index.html";
const scriptPath = "tools/access-control/fail-safe-fail-secure/script.js";

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function has(text, token) {
  return String(text || "").includes(token);
}

function lowerHas(text, token) {
  return String(text || "").toLowerCase().includes(String(token || "").toLowerCase());
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
    outputShell: [
      "Fail-Safe HTML/script + assets/access-control-output-shell.js",
      "Load the existing output shell and route visible proof/export visual ownership through it.",
      "No"
    ],
    hiddenLedger: [
      "Fail-Safe HTML/script + assets/access-control-output-shell.js",
      "Convert #results to hidden data-result-ledger and add CSS guard so .results-grid cannot leak visibly.",
      "No"
    ],
    compactOutput: [
      "Fail-Safe HTML/script",
      "Keep the existing visible status card, then add a compact Fail-State Decision schedule/table for the output contract.",
      "No"
    ],
    export: [
      "assets/export.js + assets/scopedlabs-assistant-export.js + Fail-Safe export payload",
      "Preserve existing export/snapshot IDs and custom Fail-Safe export payload.",
      "No"
    ],
    assistant: [
      "assets/access-control-tool-assistant-adapters.js + scopedlabs-local-assistant.js",
      "Keep existing assistant model and local assistant mount.",
      "No"
    ],
    flow: [
      "assets/scopedlabs-tool-shell.js + Fail-Safe page IDs",
      "Preserve Back/Continue shell before Export Report and Continue target to Reader Type.",
      "No"
    ],
    scope: [
      "Fail-Safe script + Access Scope ledger behavior",
      "Preserve active scope hydration and scope ledger publishing.",
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
const legacyCardTag = openingTagForId(html, "accessControlLegacyResultsCard");
const flowIndex = html.indexOf('id="accessControlFlowActions"');
const exportIndex = html.indexOf('id="reportMetadataMount"');

console.log("\nFail-Safe output contract module fit inventory:");
console.table([
  { Module: "polish", Exists: exists(polishPath), Parses: moduleParses(polish), Fit: has(polish, "ScopedLabsAccessControlToolPolish"), Owns: "chrome/pills/export polish" },
  { Module: "outputShell", Exists: exists(outputShellPath), Parses: moduleParses(outputShell), Fit: has(outputShell, "ScopedLabsAccessControlOutputShell"), Owns: "visual lifecycle / hidden ledger / export handoff" },
  { Module: "adapters", Exists: exists(adaptersPath), Parses: moduleParses(adapters), Fit: has(adapters, "fail-safe-fail-secure"), Owns: "assistant model" },
  { Module: "localAssistant", Exists: exists(localAssistantPath), Parses: moduleParses(localAssistant), Fit: true, Owns: "assistant rendering" },
  { Module: "metadata", Exists: exists(metadataPath), Parses: moduleParses(metadata), Fit: true, Owns: "report metadata" },
  { Module: "toolShell", Exists: exists(toolShellPath), Parses: moduleParses(toolShell), Fit: true, Owns: "Back/Continue shell" },
  { Module: "assistantExport", Exists: exists(assistantExportPath), Parses: moduleParses(assistantExport), Fit: true, Owns: "assistant export bridge" },
  { Module: "export", Exists: exists(exportPath), Parses: moduleParses(exportJs), Fit: true, Owns: "export mechanics" }
]);

check("Fail-Safe script parses", moduleParses(script), "export");
check("Shared Access Control modules parse", moduleParses(polish) && moduleParses(outputShell) && moduleParses(adapters), "export");
check("Fail-Safe has no breadcrumbs", !has(html, 'class="crumbs"'), "flow");
check("Fail-Safe loads shared polish and opts in", has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'), "flow");
check("Fail-Safe has visible status card", has(html, 'id="failSafeStatusCard"') && has(script, "renderVisibleDecisionStatus"), "compactOutput");
check("Local assistant decision layer is wired", has(html, 'id="accessControlLocalAssistantMount"') && has(script, "function renderLocalAssistant") && has(adapters, "fail-safe-fail-secure"), "assistant");
check("Report metadata dropdown is present", has(html, 'id="reportMetadataMount"') && has(html, "data-report-metadata"), "export");
check("Back/Continue shell is present", has(html, 'id="accessControlFlowActions"') && has(html, 'id="next-step-row"') && has(html, 'id="continue"'), "flow");
check("Back/Continue shell sits before Export Report", flowIndex >= 0 && exportIndex >= 0 && flowIndex < exportIndex, "flow");
check("Fail-Safe loads Access Control output shell", has(html, "access-control-output-shell.js"), "outputShell");
check("Fail-Safe uses output-shell visual lifecycle", has(script, "showVisual") || has(script, "ScopedLabsAccessControlOutputShell"), "outputShell");
check("Legacy results card remains hidden", tagIsHidden(legacyCardTag), "hiddenLedger", legacyCardTag || "missing legacy card");
check("Legacy result rows are hidden ledger only", has(html, 'id="results"') && has(html, "data-result-ledger") && tagIsHidden(resultsTag), "hiddenLedger", resultsTag || "missing #results");
check("Hidden result ledger has CSS leak guard", has(html, "#results[data-result-ledger][hidden]") || has(html, "[data-result-ledger][hidden]"), "hiddenLedger");
check("Compact Fail-State Decision schedule/table is present", has(html, "failSafeDecisionSchedule") || has(html, "data-fail-safe-summary") || has(script, "renderFailSafeDecisionSchedule"), "compactOutput");
check("Fail-Safe hero status chip is content-width", html.includes("access-control-fail-safe-state-visual-017") && html.includes(".fail-safe-decision-hero .fail-safe-status-chip") && html.includes("width: fit-content") && html.includes("align-items: flex-start"), "compactOutput");
check("Fail-Safe has no Chart.js dependency", !has(html, "chart.js") && !has(script, "new Chart("), "outputShell");
check("Export and snapshot IDs remain preserved", has(html, 'id="exportReport"') && has(html, 'id="saveSnapshot"') && has(html, 'id="exportStatus"'), "export");
check("Custom Fail-Safe export payload remains preserved", has(script, "ScopedLabsAccessControlFailSafeExport") && has(script, "getSharedExportPayload"), "export");
check("Core Fail-Safe decision logic remains preserved", has(script, "function calculate") && has(script, "buildFailSafeDecisionModel") && has(script, "getStatusForRecommendation") && has(script, "FAIL-SAFE") && has(script, "FAIL-SECURE"), "export");
check("Access Scope hydration remains preserved", has(script, "getActiveAccessScope") && has(script, "applyActiveScopeToInputs") && has(script, "publishFailSafeResultToScopeLedger"), "scope");
check("Continue target remains Reader Type Selector", has(script, 'window.location.href = "/tools/access-control/reader-type-selector/"'), "flow");

console.log("\nFail-Safe output contract audit:");
console.table(rows);

const failures = rows.filter((row) => row.Status === "FAIL");

console.log("\nRecommended course:");
if (!failures.length) {
  console.log("- Fail-Safe passes the output contract. No fix plan needed.");
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
check("Fail-Safe state visual mount exists", require("fs").readFileSync(require("path").join(process.cwd(), "tools/access-control/fail-safe-fail-secure/index.html"), "utf8").includes('id="failSafeStateVisual"') && require("fs").readFileSync(require("path").join(process.cwd(), "tools/access-control/fail-safe-fail-secure/script.js"), "utf8").includes("renderFailSafeStateVisual"));
check("Fail-Safe state visual export image uses shared renderer", require("fs").readFileSync(require("path").join(process.cwd(), "tools/access-control/fail-safe-fail-secure/script.js"), "utf8").includes("buildFailSafeStateDiagramSvg") && require("fs").readFileSync(require("path").join(process.cwd(), "tools/access-control/fail-safe-fail-secure/script.js"), "utf8").includes("exportMode: true"));
