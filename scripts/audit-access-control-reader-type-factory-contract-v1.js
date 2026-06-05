const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
}

const html = read("tools/access-control/reader-type-selector/index.html");
const script = read("tools/access-control/reader-type-selector/script.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");

function extractExportConfigBlock(source) {
  const match = source.match(/<script data-scopedlabs-export-config>([\s\S]*?)<\/script>/);
  return match ? match[1] : "";
}

function exportConfigIsValid(source) {
  const block = extractExportConfigBlock(source);
  if (!block.trim()) return false;

  try {
    new Function("window", block)({});
    return true;
  } catch {
    return false;
  }
}

check("Reader Type page uses current factory lane", html.includes("access-control-reader-type-factory-021-cad-result-cells") && html.includes("./script.js?v=access-control-reader-type-factory-021-cad-result-cells"));
check("Reader Type declares Access Control tool identity", html.includes('data-category="access-control"') && html.includes('data-step="reader-type-selector"'));
check("Reader Type opts into Access Control tool polish", html.includes('data-access-control-tool-polish="true"'));
check("Reader Type loads canonical export.js", html.includes("/assets/export.js?v=shared-export-030-semantic-report-tones"));
check("Reader Type loads report metadata module", html.includes("/assets/scopedlabs-report-metadata.js"));
check("Reader Type loads tool shell module", html.includes("/assets/scopedlabs-tool-shell.js"));
check("Reader Type loads local assistant renderer", html.includes("/assets/scopedlabs-local-assistant.js"));
check(
  "Reader Type uses rich assistant header proof version",
  html.includes("scopedlabs-local-assistant-007-rich-render-polish") &&
    read("assets/scopedlabs-local-assistant.js").includes("const pillRow = model.hideHeaderPills") &&
    read("assets/scopedlabs-local-assistant.js").includes("model.hideHeaderPills")
);
check("Reader Type loads Access Control assistant adapters", html.includes("/assets/access-control-tool-assistant-adapters.js?v=access-control-assistant-adapters-010-reader-verification-hold"));
check("Reader Type loads Access Control scope state", html.includes("/assets/access-control-scope-state.js"));
check("Reader Type loads Access Control tool polish", html.includes("/assets/access-control-tool-polish.js"));

check("Reader Type keeps metadata dropdown mount", html.includes('id="reportMetadataMount"') && html.includes("data-report-metadata") && html.includes('data-collapsed="true"'));
check("Reader Type export config is valid JavaScript", exportConfigIsValid(html));
check("Reader Type export config closes ScopedLabsExportConfig object", extractExportConfigBlock(html).includes("window.ScopedLabsExportConfig = {") && extractExportConfigBlock(html).includes("};"));
check("Reader Type has card format and compatibility inputs", html.includes('id="cardFormat"') && html.includes('id="existingCred"'));
check("Reader Type uses custom export payload hook", html.includes('"customPayloadBuilder": "ScopedLabsAccessControlReaderTypeExport.getPayload"'));
check("Reader Type requests Planner-style export sections", html.includes('"suppressStandardReportSections": true') && html.includes('"stackReportSections": true'));
check("Reader Type requests square report toolbar buttons", html.includes('"squareToolbarButtons": true'));
check("Reader Type suppresses report header status pill", html.includes('"suppressHeaderStatusPill": true'));

check("Reader Type has shell Back/Continue row contract", html.includes('id="accessControlFlowActions"') && html.includes('id="next-step-row"') && html.includes('id="continue"'));
check("Reader Type uses tool shell Back/Continue helper", script.includes("ScopedLabsToolShell.applyBackContinueShell"));
check("Reader Type routes Continue to Lock Power Budget", script.includes('/tools/access-control/lock-power-budget/'));

check("Reader Type has no local buildReportHTML", !script.includes("function buildReportHTML("));
check("Reader Type has no local openReportWindow", !script.includes("function openReportWindow("));
check("Reader Type does not open report window locally", !script.includes("window.open"));
check("Reader Type has no manual export-grid metadata", !html.includes('<div class="export-grid">'));
check("Reader Type has no stale export-grid CSS", !html.includes(".export-grid"));
check("Reader Type has no retired continue-wrap", !html.includes('id="continue-wrap"') && !script.includes("continueWrap"));
check("Reader Type does not load duplicate report shell", !html.includes("/assets/access-control-report-shell.js"));
check("Reader Type has no loose Best For sentence", !html.includes('class="tool-best-for"') && !html.includes("<strong>Best for:</strong>"));
check("Reader Type has no Documentation & Export pill text", !html.includes("Documentation & Export"));

check("Reader Type local assistant mount exists", html.includes('id="accessControlLocalAssistantMount"'));
check(
  "Reader Type uses improved recommendation output shell",
  html.includes(".reader-result-hero") &&
    html.includes(".reader-result-grid") &&
    script.includes("reader-result-hero") &&
    script.includes("reader-result-grid")
);
check("Reader Type has no old model mini-note", !html.includes('class="mini-note"'));
check("Reader Type does not show redundant carry-forward card", !html.includes('id="carryForwardCard"') && !html.includes('id="carryForwardContent"'));
check("Reader Type closes tool card before footer", /<\/section>\s*<footer class="site-footer">/.test(html));
check("Reader Type closes main before scripts", /<\/main>\s*<script src="\/assets\/tool-flow\.js/.test(html));
check("Reader Type old model mini-note removed", !html.includes('class="mini-note"'));
check("Reader Type adapter registered", adapters.includes('"reader-type-selector"') && adapters.includes("buildReaderTypeSelectorModel"));
check("Reader Type exposes canonical export payload", script.includes("ScopedLabsAccessControlReaderTypeExport") && script.includes("getSharedExportPayload"));

console.log("\nAccess Control Reader Type factory contract audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
