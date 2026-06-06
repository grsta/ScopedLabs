const fs = require("fs");

const htmlPath = "tools/access-control/reader-type-selector/index.html";
const scriptPath = "tools/access-control/reader-type-selector/script.js";

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

function openingTagForClass(html, className) {
  const tags = String(html || "").match(/<[^>]+>/g) || [];
  return tags.find((tag) => tag.includes("class=") && tag.includes(className)) || "";
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
    helper: [
      "Reader Type Selector HTML + assets/access-control-tool-polish.js",
      "Remove visible intro/helper clutter or let shared polish own reusable page chrome. Do not create a new module.",
      "No"
    ],
    outputShell: [
      "Reader Type Selector HTML/script + assets/access-control-output-shell.js",
      "Load the existing output shell and route visible proof/export visual ownership through it.",
      "No"
    ],
    hiddenLedger: [
      "Reader Type Selector HTML/script + assets/access-control-output-shell.js",
      "Convert #results to a hidden data-result-ledger and render visible output through compact schedule/assistant/output shell.",
      "No"
    ],
    compactOutput: [
      "Reader Type Selector HTML/script",
      "Replace tall recommendation rows with a compact reader decision schedule/table while preserving result rows as hidden export data.",
      "No"
    ],
    flow: [
      "assets/scopedlabs-tool-shell.js + Reader Type Selector page IDs",
      "Keep Back/Continue shell above Export Report and preserve #next-step-row/#continue.",
      "No"
    ],
    export: [
      "assets/export.js + assets/scopedlabs-assistant-export.js + Reader Type export payload",
      "Preserve export/snapshot IDs and existing custom export payload.",
      "No"
    ],
    assistant: [
      "assets/access-control-tool-assistant-adapters.js + assets/scopedlabs-local-assistant.js",
      "Keep existing assistant adapter pattern and do not add inline helper cards.",
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

const introTag = openingTagForClass(html, "access-control-tool-intro-card");
const resultsTag = openingTagForId(html, "results");
const flowIndex = html.indexOf('id="accessControlFlowActions"');
const exportIndex = html.indexOf('id="reportMetadataMount"');

console.log("\nReader Type Selector module fit inventory:");
console.table([
  { Module: "polish", Exists: exists(polishPath), Parses: moduleParses(polish), Fit: has(polish, "ScopedLabsAccessControlToolPolish"), Owns: "chrome/pills/export polish" },
  { Module: "outputShell", Exists: exists(outputShellPath), Parses: moduleParses(outputShell), Fit: has(outputShell, "ScopedLabsAccessControlOutputShell"), Owns: "visual lifecycle / hidden ledger / export handoff" },
  { Module: "adapters", Exists: exists(adaptersPath), Parses: moduleParses(adapters), Fit: has(adapters, "reader-type-selector"), Owns: "assistant model" },
  { Module: "localAssistant", Exists: exists(localAssistantPath), Parses: moduleParses(localAssistant), Fit: true, Owns: "assistant rendering" },
  { Module: "metadata", Exists: exists(metadataPath), Parses: moduleParses(metadata), Fit: true, Owns: "report metadata" },
  { Module: "toolShell", Exists: exists(toolShellPath), Parses: moduleParses(toolShell), Fit: true, Owns: "Back/Continue shell" }
]);

check("Reader Type Selector script parses", moduleParses(script), "export");
check("Shared Access Control modules parse", moduleParses(polish) && moduleParses(outputShell) && moduleParses(adapters), "export");
check("Reader Type Selector has no breadcrumbs", !has(html, 'class="crumbs"'), "helper");
check("Reader Type Selector loads shared polish and opts in", has(html, "access-control-tool-polish.js") && has(html, 'data-access-control-tool-polish="true"'), "helper");
check("Intro / flow helper card is gone or hidden", !introTag || tagIsHidden(introTag), "helper", introTag || "no intro card");
check("Flow helper copy is gone from visible source", !lowerHas(html, "This tool continues the Access Control design flow"), "helper", snippetAround(html, "This tool continues the Access Control design flow"));
check("Local assistant decision layer is wired", has(html, 'id="accessControlLocalAssistantMount"') && has(script, "function renderLocalAssistant") && has(adapters, "reader-type-selector"), "assistant");
check("Report metadata dropdown is present", has(html, 'id="reportMetadataMount"') && has(html, "data-report-metadata"), "export");
check("Back/Continue shell is present", has(html, 'id="accessControlFlowActions"') && has(html, 'id="next-step-row"') && has(html, 'id="continue"'), "flow");
check("Back/Continue shell sits before Export Report", flowIndex >= 0 && exportIndex >= 0 && flowIndex < exportIndex, "flow");
check("Reader Type loads Access Control output shell", has(html, "access-control-output-shell.js"), "outputShell");
check("Reader Type uses output-shell visual lifecycle", has(script, "showVisual") || has(script, "ScopedLabsAccessControlOutputShell"), "outputShell");
check("Legacy recommendation rows are hidden ledger only", has(html, 'id="results"') && has(html, "data-result-ledger") && tagIsHidden(resultsTag), "hiddenLedger", resultsTag || "missing #results");
check("Hidden result ledger has CSS leak guard", has(html, "#results[data-result-ledger][hidden]") || has(html, "[data-result-ledger][hidden]"), "hiddenLedger");
check("Old visible Recommendation title/card is gone", !lowerHas(html, ">Recommendation</h3>"), "hiddenLedger", snippetAround(html, ">Recommendation</h3>"));
check("Compact Reader Decision schedule/table is present", has(html, "readerTypeSchedule") || has(html, "data-reader-type-summary") || has(script, "renderReaderTypeSchedule"), "compactOutput");
check("Reader Type has no Chart.js dependency", !has(html, "chart.js") && !has(script, "new Chart("), "outputShell");
check("Export and snapshot IDs remain preserved", has(html, 'id="exportReport"') && has(html, 'id="saveSnapshot"') && has(html, 'id="exportStatus"'), "export");
check("Custom export payload remains preserved", has(script, "ScopedLabsAccessControlReaderTypeExport") && has(script, "getSharedExportPayload"), "export");
check("Core reader decision logic remains preserved", has(script, "function getStatus") && has(script, "function buildSummary") && has(script, "Mobile credential reader") && has(script, "OSDP Secure Channel"), "export");
check("Continue target remains Lock Power Budget", has(script, 'window.location.href = "/tools/access-control/lock-power-budget/"'), "flow");

console.log("\nReader Type Selector output contract audit:");
console.table(rows);

const failures = rows.filter((row) => row.Status === "FAIL");

console.log("\nRecommended course:");
if (!failures.length) {
  console.log("- Reader Type Selector passes the output contract. No fix plan needed.");
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