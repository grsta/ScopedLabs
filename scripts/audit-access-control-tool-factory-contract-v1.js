const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(dir) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];

  const out = [];

  for (const item of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, item.name);
    const rel = path.relative(root, full).split(path.sep).join("/");

    if (item.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }

  return out;
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
}

function section(title) {
  rows.push({ Status: "----", Check: title, Detail: "" });
}

const failSafeHtml = read("tools/access-control/fail-safe-fail-secure/index.html");
const failSafeScript = read("tools/access-control/fail-safe-fail-secure/script.js");
const polish = read("assets/access-control-tool-polish.js");
const exportJs = read("assets/export.js");

const accessControlFiles = [
  ...walk("tools/access-control"),
  ...walk("assets"),
  ...walk("scripts")
].filter((rel) => /\.(html|js)$/.test(rel));

const retiredReportShellReferences = accessControlFiles
  .filter((rel) => rel !== "scripts/audit-access-control-tool-factory-contract-v1.js")
  .filter((rel) => rel !== "scripts/audit-access-control-export-ownership-v1.js")
  .filter((rel) => rel !== "scripts/audit-access-control-reader-type-factory-contract-v1.js")
  .filter((rel) => read(rel).includes("access-control-report-shell"));

section("Canonical shared/category modules");

[
  "assets/export.js",
  "assets/scopedlabs-report-metadata.js",
  "assets/scopedlabs-assistant-export.js",
  "assets/scopedlabs-tool-shell.js",
  "assets/scopedlabs-local-assistant.js",
  "assets/access-control-tool-assistant-adapters.js",
  "assets/access-control-scope-state.js",
  "assets/access-control-tool-polish.js",
  "assets/tool-flow.js",
  "assets/pipeline.js",
  "assets/pipelines.js",
  "assets/help.js"
].forEach((rel) => {
  check("Canonical module exists: " + rel, exists(rel));
});

check("Retired Access Control report shell asset is absent", !exists("assets/access-control-report-shell.js"));
check("Retired Access Control report shell audit is absent", !exists("scripts/audit-access-control-report-shell-v1.js"));
check("No active Access Control files reference retired report shell", retiredReportShellReferences.length === 0, retiredReportShellReferences.join(", "));

section("Fail-Safe factory contract");

check("Fail-Safe page exists", Boolean(failSafeHtml));
check("Fail-Safe script exists", Boolean(failSafeScript));
check("Fail-Safe declares Access Control tool identity", failSafeHtml.includes('data-category="access-control"') && failSafeHtml.includes('data-step="fail-safe-fail-secure"'));
check("Fail-Safe opts into Access Control tool polish", failSafeHtml.includes('data-access-control-tool-polish="true"'));
check("Fail-Safe loads canonical export.js", failSafeHtml.includes("/assets/export.js?v="));
check("Fail-Safe loads report metadata module", failSafeHtml.includes("/assets/scopedlabs-report-metadata.js"));
check("Fail-Safe loads tool shell module", failSafeHtml.includes("/assets/scopedlabs-tool-shell.js"));
check("Fail-Safe loads local assistant renderer", failSafeHtml.includes("/assets/scopedlabs-local-assistant.js"));
check("Fail-Safe loads Access Control assistant adapters", failSafeHtml.includes("/assets/access-control-tool-assistant-adapters.js"));
check("Fail-Safe loads Access Control scope state", failSafeHtml.includes("/assets/access-control-scope-state.js"));
check("Fail-Safe loads Access Control tool polish", failSafeHtml.includes("/assets/access-control-tool-polish.js"));
check("Fail-Safe keeps metadata dropdown mount", failSafeHtml.includes('id="reportMetadataMount"') && failSafeHtml.includes("data-report-metadata") && failSafeHtml.includes('data-collapsed="true"'));
check("Fail-Safe uses custom export payload hook", failSafeHtml.includes('"customPayloadBuilder": "ScopedLabsAccessControlFailSafeExport.getPayload"'));
check("Fail-Safe requests Planner-style export sections", failSafeHtml.includes('"suppressStandardReportSections": true') && failSafeHtml.includes('"stackReportSections": true'));
check("Fail-Safe requests square report toolbar buttons", failSafeHtml.includes('"squareToolbarButtons": true'));
check("Fail-Safe suppresses report header status pill", failSafeHtml.includes('"suppressHeaderStatusPill": true'));

check("Fail-Safe has shell Back/Continue row contract", failSafeHtml.includes('id="accessControlFlowActions"') && failSafeHtml.includes('id="next-step-row"') && failSafeHtml.includes('id="continue"'));
check("Fail-Safe uses tool shell Back/Continue helper", failSafeScript.includes("ScopedLabsToolShell.applyBackContinueShell"));
check("Fail-Safe routes Continue to Reader Type", failSafeScript.includes('/tools/access-control/reader-type-selector/'));

check("Fail-Safe has no local buildReportHTML", !failSafeScript.includes("function buildReportHTML("));
check("Fail-Safe has no local openReportWindow", !failSafeScript.includes("function openReportWindow("));
check("Fail-Safe does not open report window locally", !failSafeScript.includes("window.open"));
check("Fail-Safe has no manual export-grid metadata", !failSafeHtml.includes('<div class="export-grid">'));
check("Fail-Safe has no retired continue-wrap", !failSafeHtml.includes('id="continue-wrap"') && !failSafeScript.includes("continueWrap"));
check("Fail-Safe does not load duplicate report shell", !failSafeHtml.includes("/assets/access-control-report-shell.js"));

check("Fail-Safe visible decision card remains", failSafeHtml.includes('id="failSafeStatusCard"') && failSafeScript.includes("renderVisibleDecisionStatus"));
check("Fail-Safe compact status legend remains", failSafeHtml.includes('id="failSafeStatusLegend"') && failSafeHtml.includes("Authority Review"));
check("Fail-Safe export controls remain wired", failSafeHtml.includes('id="exportReport"') && failSafeHtml.includes('id="saveSnapshot"'));

section("Page-polish junk blockers");

check("No loose Best For sentence", !failSafeHtml.includes('class="tool-best-for"') && !failSafeHtml.includes("<strong>Best for:</strong>"));
check("No Documentation & Export pill text", !failSafeHtml.includes("Documentation & Export"));
check("Polish module hides KB and assistant pill rows", polish.includes(".sl-help-card>.pill-row") && polish.includes(".scopedlabs-local-assistant-card>.pill-row"));
check("Polish module normalizes square buttons", polish.includes(".btn{border-radius:10px!important;}"));
check("Polish module adds quiet assistant flow line", polish.includes("access-assistant-flow-line") && polish.includes("Fail-Safe / Fail-Secure"));

section("Canonical export engine capabilities");

check("export.js supports custom payload builders", exportJs.includes("customPayloadBuilder") && exportJs.includes("buildCustomPayload"));
check("export.js supports stacked sections", exportJs.includes("stackReportSections") && exportJs.includes("grid grid--stacked"));
check("export.js supports Planner-style section headings", exportJs.includes("section-heading-row") && exportJs.includes("section-description"));
check("export.js supports semantic report tones", exportJs.includes("renderReportCell") && exportJs.includes("report-tone--authority") && exportJs.includes("report-tone--risk"));
check("export.js supports muted section counts", exportJs.includes("section-count--muted"));

const visibleRows = rows.filter((row) => row.Status !== "----");

console.log("\nAccess Control tool factory contract audit:");
console.table(rows);

const safe = visibleRows.filter((row) => row.Status === "SAFE").length;
const fail = visibleRows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
