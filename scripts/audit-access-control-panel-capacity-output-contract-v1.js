const fs = require("fs");

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function moduleParses(text) {
  try {
    new Function(text);
    return true;
  } catch {
    return false;
  }
}

function has(text, token) {
  return String(text || "").includes(token);
}

function lowerHas(text, token) {
  return String(text || "").toLowerCase().includes(String(token || "").toLowerCase());
}

function firstOpeningTagContaining(html, token) {
  const source = String(html || "");
  const index = source.indexOf(token);
  if (index < 0) return "";
  const open = source.lastIndexOf("<", index);
  const close = source.indexOf(">", index);
  if (open < 0 || close < 0 || close < open) return "";
  return source.slice(open, close + 1);
}

function openingTagForId(html, id) {
  return firstOpeningTagContaining(html, 'id="' + id + '"') ||
    firstOpeningTagContaining(html, "id='" + id + "'");
}

function openingTagForClass(html, className) {
  const tags = String(html || "").match(/<[^>]+>/g) || [];
  return tags.find((tag) => tag.includes("class=") && tag.includes(className)) || "";
}

function tagIsHidden(tag) {
  return Boolean(tag) && (
    /\shidden(\s|>|$)/i.test(tag) ||
    /display\s*:\s*none/i.test(tag) ||
    /data-[^=]*hidden=["']true["']/i.test(tag) ||
    /aria-hidden=["']true["']/i.test(tag)
  );
}

function snippetAround(text, token, radius = 130) {
  const source = String(text || "");
  const index = source.toLowerCase().indexOf(String(token || "").toLowerCase());
  if (index < 0) return "";
  return source
    .slice(Math.max(0, index - radius), Math.min(source.length, index + token.length + radius))
    .replace(/\s+/g, " ")
    .trim();
}

function hasVisibleResultsHeading(html) {
  return /<h[23][^>]*>\s*Results\s*<\/h[23]>/i.test(html);
}

function labelIsInDecorativeNode(html, label) {
  const source = String(html || "");
  const index = source.toLowerCase().indexOf(String(label || "").toLowerCase());
  if (index < 0) return true;

  const open = source.lastIndexOf("<", index);
  const close = source.indexOf(">", open);
  const tag = open >= 0 && close >= open ? source.slice(open, close + 1).toLowerCase() : "";

  return tag.includes("class=") && (tag.includes("pill") || tag.includes("badge"));
}

function getPolishVersion(polish) {
  const match = polish.match(/const VERSION = "([^"]+)";/);
  return match ? match[1] : "";
}

function moduleInventory(files) {
  return {
    polish: {
      exists: exists("assets/access-control-tool-polish.js"),
      parses: moduleParses(files.polish),
      fit: has(files.polish, "ScopedLabsAccessControlToolPolish"),
      ownsDecorativeChrome: has(files.polish, "removeDecorativePageChromePills") && has(files.polish, "data-access-control-page-chrome-hidden"),
      ownsExportCardPolish: has(files.polish, "applyExportCardPolish"),
      ownsExportTitle: has(files.polish, "applyExportCardTitleRhythm")
    },
    outputShell: {
      exists: exists("assets/access-control-output-shell.js"),
      parses: moduleParses(files.outputShell),
      fit: has(files.outputShell, "ScopedLabsAccessControlOutputShell"),
      ownsVisualLifecycle: has(files.outputShell, "showVisual") && has(files.outputShell, "hideVisual"),
      ownsExportHandoff: has(files.outputShell, "attachExportGetter") && has(files.outputShell, "getChartImage"),
      ownsHiddenPattern: has(files.outputShell, "hiddenDataLayer") || has(files.outputShell, "result-ledger")
    },
    adapters: {
      exists: exists("assets/access-control-tool-assistant-adapters.js"),
      parses: moduleParses(files.adapters),
      fit: has(files.adapters, "ScopedLabsAccessControlToolAssistantAdapters"),
      ownsPanelModel: has(files.adapters, "buildPanelCapacityModel") && has(files.adapters, '"panel-capacity": Object.freeze')
    },
    localAssistant: {
      exists: exists("assets/scopedlabs-local-assistant.js"),
      parses: moduleParses(files.localAssistant),
      fit: has(files.localAssistant, "ScopedLabsLocalAssistant") || exists("assets/scopedlabs-local-assistant.js")
    },
    metadata: {
      exists: exists("assets/scopedlabs-report-metadata.js"),
      parses: moduleParses(files.metadata),
      fit: has(files.metadata, "ScopedLabsReportMetadata") || exists("assets/scopedlabs-report-metadata.js")
    },
    toolShell: {
      exists: exists("assets/scopedlabs-tool-shell.js"),
      parses: moduleParses(files.toolShell),
      fit: has(files.toolShell, "ScopedLabsToolShell") || exists("assets/scopedlabs-tool-shell.js")
    },
    assistantExport: {
      exists: exists("assets/scopedlabs-assistant-export.js"),
      parses: moduleParses(files.assistantExport),
      fit: has(files.assistantExport, "ScopedLabsAssistantExport") || exists("assets/scopedlabs-assistant-export.js")
    },
    exportJs: {
      exists: exists("assets/export.js"),
      parses: moduleParses(files.exportJs),
      fit: exists("assets/export.js")
    }
  };
}

function recommendation(issueType, inv) {
  const map = {
    decorativeChrome: inv.polish.fit
      ? ["assets/access-control-tool-polish.js", "Patch/load/opt into the existing Access Control polish module. Do not create a new module.", "No"]
      : ["new Access Control polish module", "Create a scoped polish module only because no existing polish owner is present.", "Yes"],

    helperClutter: inv.polish.fit
      ? ["Panel Capacity HTML + assets/access-control-tool-polish.js", "Remove or move static helper clutter into assistant or KB; use shared polish only for reusable chrome behavior.", "No"]
      : ["Panel Capacity HTML", "Remove tool-local helper clutter; create shared polish only if repeated across tools.", "Maybe later"],

    hiddenLedger: inv.outputShell.fit
      ? ["Panel Capacity HTML/script + assets/access-control-output-shell.js", "Convert legacy #results to hidden data-result-ledger while visible output is assistant + engineering visual.", "No"]
      : ["Access Control output shell", "Create an output shell because no visual/export ownership module exists.", "Yes"],

    legacyChart: inv.outputShell.fit
      ? ["Panel Capacity script + assets/access-control-output-shell.js", "Stop rendering old Chart.js as primary visual; use output-shell visual/export ownership or explicitly hide/exclude legacy chart.", "No"]
      : ["Panel Capacity script", "Hide/remove old chart locally first; create output shell only if shared owner is missing.", "Maybe"],

    engineeringVisual: inv.outputShell.fit
      ? ["Panel Capacity script + assets/access-control-output-shell.js", "Add a local Panel Capacity SVG builder and register it through the existing output shell. Promote to shared visual library only after reuse is proven.", "No now / Maybe later"]
      : ["new output-shell/visual owner", "Create a shared output visual owner because no existing output shell fits.", "Yes"],

    assistant: inv.adapters.fit
      ? ["assets/access-control-tool-assistant-adapters.js + scopedlabs-local-assistant.js", "Use existing adapter + local assistant; do not add inline helper cards.", "No"]
      : ["assistant adapter module", "Create/restore Access Control assistant adapter owner.", "Yes"],

    metadata: inv.metadata.fit
      ? ["assets/scopedlabs-report-metadata.js", "Use existing report metadata mount/dropdown.", "No"]
      : ["report metadata module", "Create/restore shared report metadata module.", "Yes"],

    flow: inv.toolShell.fit
      ? ["assets/scopedlabs-tool-shell.js + page IDs", "Use existing Back/Continue shell with preserved IDs.", "No"]
      : ["tool shell module", "Create/restore shared tool shell owner.", "Yes"],

    export: inv.outputShell.fit && inv.assistantExport.fit && inv.exportJs.fit
      ? ["access-control-output-shell.js + assistant-export/export.js", "Use existing export handoff; preserve export/snapshot IDs.", "No"]
      : ["export stack", "Inspect export modules before creating anything new.", "Maybe"]
  };

  const rec = map[issueType] || ["manual review", "Inspect before patching.", "Unknown"];
  return { owner: rec[0], course: rec[1], newModule: rec[2] };
}

function add(row) {
  rows.push(row);
  if (row.Status === "FAIL") failed = true;
}

function check(options) {
  const rec = recommendation(options.issueType, inventory);

  add({
    Status: options.ok ? "SAFE" : "FAIL",
    Check: options.label,
    BestOwner: options.ok ? "" : rec.owner,
    NewModuleNeeded: options.ok ? "" : rec.newModule,
    RecommendedCourse: options.ok ? "" : rec.course,
    Evidence: options.evidence || ""
  });
}

let failed = false;
const rows = [];

const files = {
  html: read("tools/access-control/panel-capacity/index.html"),
  script: read("tools/access-control/panel-capacity/script.js"),
  adapters: read("assets/access-control-tool-assistant-adapters.js"),
  polish: read("assets/access-control-tool-polish.js"),
  outputShell: read("assets/access-control-output-shell.js"),
  localAssistant: exists("assets/scopedlabs-local-assistant.js") ? read("assets/scopedlabs-local-assistant.js") : "",
  metadata: exists("assets/scopedlabs-report-metadata.js") ? read("assets/scopedlabs-report-metadata.js") : "",
  toolShell: exists("assets/scopedlabs-tool-shell.js") ? read("assets/scopedlabs-tool-shell.js") : "",
  assistantExport: exists("assets/scopedlabs-assistant-export.js") ? read("assets/scopedlabs-assistant-export.js") : "",
  exportJs: exists("assets/export.js") ? read("assets/export.js") : ""
};

const inventory = moduleInventory(files);
const html = files.html;
const script = files.script;
const polish = files.polish;
const currentPolishVersion = getPolishVersion(polish);
const bodyTag = firstOpeningTagContaining(html, "<body") || "";
const introCardTag = openingTagForClass(html, "access-control-tool-intro-card");
const resultsTag = openingTagForId(html, "results");
const chartWrapTag = openingTagForId(html, "chartWrap");

console.log("\nAccess Control module fit inventory:");
console.table([
  { Module: "polish", Exists: inventory.polish.exists, Parses: inventory.polish.parses, Fit: inventory.polish.fit, Owns: "chrome/pills/export title" },
  { Module: "outputShell", Exists: inventory.outputShell.exists, Parses: inventory.outputShell.parses, Fit: inventory.outputShell.fit, Owns: "visible visual/hidden ledger/export image handoff" },
  { Module: "adapters", Exists: inventory.adapters.exists, Parses: inventory.adapters.parses, Fit: inventory.adapters.fit, Owns: "assistant model" },
  { Module: "localAssistant", Exists: inventory.localAssistant.exists, Parses: inventory.localAssistant.parses, Fit: inventory.localAssistant.fit, Owns: "assistant rendering" },
  { Module: "metadata", Exists: inventory.metadata.exists, Parses: inventory.metadata.parses, Fit: inventory.metadata.fit, Owns: "report details dropdown" },
  { Module: "toolShell", Exists: inventory.toolShell.exists, Parses: inventory.toolShell.parses, Fit: inventory.toolShell.fit, Owns: "Back/Continue shell" }
]);

check({ label: "Golden standard contract is active for Panel Capacity", ok: true, issueType: "export" });
check({ label: "Panel Capacity script parses", ok: moduleParses(script), issueType: "export" });
check({ label: "Shared module inventory parses", ok: moduleParses(files.adapters) && moduleParses(files.polish) && moduleParses(files.outputShell), issueType: "export" });

check({
  label: "Panel Capacity is opted into current shared polish",
  ok: bodyTag.includes('data-access-control-tool-polish="true"') && Boolean(currentPolishVersion) && html.includes("/assets/access-control-tool-polish.js?v=" + currentPolishVersion),
  issueType: "decorativeChrome",
  evidence: currentPolishVersion || "missing polish VERSION"
});

check({
  label: "Decorative page chrome has an existing shared owner",
  ok: inventory.polish.ownsDecorativeChrome,
  issueType: "decorativeChrome",
  evidence: "Looking for removeDecorativePageChromePills + marker attribute"
});

check({
  label: "Panel Capacity decorative labels are in exact pill/badge nodes for shared cleanup",
  ok: labelIsInDecorativeNode(html, "Pro Tier") && labelIsInDecorativeNode(html, "Part of a Design Flow") && labelIsInDecorativeNode(html, "Documentation & Export"),
  issueType: "decorativeChrome",
  evidence: "If this fails, shared polish selector cannot safely target the labels."
});

check({
  label: "Best For helper clutter is gone from visible source",
  ok: !has(html, 'class="tool-best-for"') && !has(html, "<strong>Best for:</strong>"),
  issueType: "helperClutter",
  evidence: snippetAround(html, "Best for:")
});

check({
  label: "Intro / flow context card is gone or hidden",
  ok: !introCardTag || tagIsHidden(introCardTag),
  issueType: "helperClutter",
  evidence: introCardTag || "no intro card"
});

check({
  label: "Flow context helper copy is gone from visible source",
  ok: !lowerHas(html, "This tool continues the Access Control design flow") && !lowerHas(html, "Use this step to translate door counts"),
  issueType: "helperClutter",
  evidence: snippetAround(html, "This tool continues the Access Control design flow") || snippetAround(html, "Use this step to translate door counts")
});


check({
  label: "Panel Capacity breadcrumbs are removed from visible page chrome",
  ok: !has(html, 'class="crumbs"'),
  issueType: "decorativeChrome",
  evidence: has(html, 'class="crumbs"') ? "breadcrumb source still present" : ""
});

check({
  label: "Hidden result ledger cannot leak through results-grid CSS",
  ok: has(html, "#results[data-result-ledger][hidden]") || has(html, "[data-result-ledger][hidden]"),
  issueType: "hiddenLedger",
  evidence: "Requires CSS display:none!important guard for hidden ledger."
});

check({
  label: "Panel Capacity has compact visible capacity schedule",
  ok: has(html, 'id="panelCapacityScheduleCard"') && has(html, 'id="panelCapacitySchedule"') && has(html, "data-panel-capacity-summary") && has(script, "function renderCapacitySchedule") && has(script, "panel-capacity-summary-table"),
  issueType: "hiddenLedger",
  evidence: "Visible results should be a compact schedule, not a tall result-row stack."
});

check({
  label: "Panel Capacity uses shared dynamic CAD panel primitive",
  ok: has(script, "cadAccessPanelCapacityIcon") && has(script, "ScopedLabsAccessControlPlanningVisuals"),
  issueType: "visual",
  evidence: "shared cadAccessPanelCapacityIcon renderer handoff"
});

check({
  label: "Panel Capacity visual is CAD architecture map, not Chart.js bar graph",
  ok: !has(html, "chart.js") && !has(script, "new Chart(") && !has(script, "function renderChart(") && has(script, "PANEL_CAPACITY_CAD_ARCHITECTURE_MAP_024"),
  issueType: "engineeringVisual",
  evidence: "Requires local CAD SVG marker and no Chart.js constructor."
});


check({
  label: "Panel Capacity Back/Continue shell sits before Export Report",
  ok: has(html, 'id="accessControlFlowActions"') && has(html, 'id="reportMetadataMount"') && html.indexOf('id="accessControlFlowActions"') < html.indexOf('id="reportMetadataMount"'),
  issueType: "flow",
  evidence: "Matches accepted Lock Power rhythm: assistant/flow actions before Export Report."
});

check({
  label: "Panel Capacity CAD visual has expanded drawing height",
  ok: has(html, "min-height:460px") && has(script, "const height = 500;") && has(script, "PANEL_CAPACITY_CAD_ARCHITECTURE_MAP_024"),
  issueType: "engineeringVisual",
  evidence: "Prevents cramped CAD labels and expansion-slot bleed."
});

check({
  label: "Panel Capacity expansion slots are fit-guarded inside panel bays",
  ok: has(script, "const slotW = Math.max(7, Math.min(12"),
  issueType: "engineeringVisual",
  evidence: "Expansion slot rectangles must fit inside each controller bay."
});

check({
  label: "Local assistant decision layer is wired",
  ok: has(html, 'id="accessControlLocalAssistantMount"') && has(script, "function renderLocalAssistant") && has(script, "renderLocalAssistant({") && inventory.adapters.ownsPanelModel,
  issueType: "assistant",
  evidence: "assistant mount + adapter + render call"
});

check({
  label: "Report metadata dropdown and Back/Continue shell are present",
  ok: has(html, 'id="reportMetadataMount"') && has(html, "data-report-metadata") && has(html, 'id="accessControlFlowActions"') && has(html, 'id="next-step-row"') && has(html, 'id="continue"'),
  issueType: "metadata",
  evidence: "metadata mount + flow actions"
});

check({
  label: "Legacy result rows are hidden ledger only",
  ok: has(html, 'id="results"') && has(html, "data-result-ledger") && tagIsHidden(resultsTag),
  issueType: "hiddenLedger",
  evidence: resultsTag || "missing #results"
});

check({
  label: "Old visible Results title is gone",
  ok: !hasVisibleResultsHeading(html),
  issueType: "hiddenLedger",
  evidence: hasVisibleResultsHeading(html) ? "visible Results heading still present" : ""
});

check({
  label: "Old analyzer chart is not visible primary output",
  ok: !has(html, '<canvas id="chart"') || (tagIsHidden(chartWrapTag) && (has(html, "data-legacy-chart-hidden") || has(html, "data-output-visual-owner"))),
  issueType: "legacyChart",
  evidence: has(html, '<canvas id="chart"') ? chartWrapTag || "chart canvas present" : ""
});

check({
  label: "Panel Capacity does not render old chart after calculate",
  ok: !has(script, "renderChart(lastMetrics);"),
  issueType: "legacyChart",
  evidence: has(script, "renderChart(lastMetrics);") ? "renderChart(lastMetrics) still called" : ""
});

check({
  label: "Panel Capacity uses output shell export handoff",
  ok: has(script, "function attachOutputShellExport") && has(script, "shell.attachExportGetter") && has(script, "getChartImage"),
  issueType: "export",
  evidence: "output shell export getter"
});

check({
  label: "Engineering visual/output layer is present or explicitly planned in code",
  ok: has(script, "shell.showVisual") || has(html, "data-output-visual-owner") || has(script, "buildPanelCapacityVisual") || (has(script, "buildPanelCapacity") && has(script, "Svg")),
  issueType: "engineeringVisual",
  evidence: "Looking for shell.showVisual / data-output-visual-owner / Panel Capacity SVG builder"
});

check({
  label: "Export and snapshot IDs remain preserved",
  ok: has(html, 'id="exportReport"') && has(html, 'id="saveSnapshot"') && has(html, 'id="exportStatus"'),
  issueType: "export",
  evidence: "required IDs"
});

check({
  label: "Core Panel Capacity formulas remain preserved",
  ok: has(script, "const targetDoors = Math.ceil(doors * (1 + spare / 100));") && has(script, "const perPanelCapacity = base + (maxExp * exp);") && has(script, "const panels = Math.max(1, Math.ceil(targetDoors / perPanelCapacity));") && has(script, "const expansionPct = panels > 0 && maxExp > 0 ? (expansions / (panels * maxExp)) * 100 : 0;"),
  issueType: "export",
  evidence: "formula tokens"
});

check({
  label: "Pipeline handoff remains preserved",
  ok: has(script, 'window.location.href = "/tools/access-control/access-level-sizing/"'),
  issueType: "flow",
  evidence: "Continue destination"
});

console.log("\nAccess Control Panel Capacity output contract audit:");
console.table(rows);

const failures = rows.filter((row) => row.Status === "FAIL");

console.log("\nRecommended course:");
if (!failures.length) {
  console.log("- Panel Capacity passes the completion contract. No fix plan needed.");
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
console.log("- SAFE: " + rows.filter((row) => row.Status === "SAFE").length);
console.log("- FAIL: " + failures.length);

if (failed) process.exit(1);
