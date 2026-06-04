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

const html = read("tools/access-control/fail-safe-fail-secure/index.html");
const script = read("tools/access-control/fail-safe-fail-secure/script.js");
const exportJs = read("assets/export.js");

const searchFiles = [
  ...walk("tools/access-control"),
  ...walk("assets"),
  ...walk("scripts")
].filter((rel) => /\.(html|js)$/.test(rel));

const referencesReportShell = searchFiles
  .filter((rel) => rel !== "assets/access-control-report-shell.js")
  .filter((rel) => rel !== "scripts/audit-access-control-export-ownership-v1.js")
  .filter((rel) => read(rel).includes("access-control-report-shell"));

check("Fail-Safe cache bumped to export ownership lane", html.includes("access-control-fail-safe-export-ownership-012-planner-report") && html.includes("./script.js?v=access-control-fail-safe-export-ownership-012-planner-report"));
check("Fail-Safe uses canonical export.js lane", html.includes("/assets/export.js?v=shared-export-028-planner-sections"));
check("Fail-Safe does not load duplicate report shell", !html.includes("/assets/access-control-report-shell.js"));
check("Duplicate Access Control report shell asset retired", !exists("assets/access-control-report-shell.js"));
check("Old report shell audit retired", !exists("scripts/audit-access-control-report-shell-v1.js"));
check("No Access Control report shell references remain", referencesReportShell.length === 0, referencesReportShell.join(", "));
check("Export.js supports custom payload builders", exportJs.includes("customPayloadBuilder") && exportJs.includes("payloadBuilder") && exportJs.includes("buildCustomPayload"));
check("Export.js supports stacked report sections", exportJs.includes("stackReportSections") && exportJs.includes("grid grid--stacked"));
check("Export.js supports square toolbar buttons", exportJs.includes("squareToolbarButtons") && exportJs.includes("toolbarButtonRadius"));
check("Fail-Safe config points to shared export payload", html.includes("ScopedLabsAccessControlFailSafeExport.getPayload"));
check("Fail-Safe suppresses export header status pill", html.includes('"suppressHeaderStatusPill": true'));
check("Fail-Safe requests stacked export sections", html.includes('"stackReportSections": true'));
check("Fail-Safe requests square export toolbar buttons", html.includes('"squareToolbarButtons": true'));
check("Fail-Safe exposes payload for canonical export", script.includes("ScopedLabsAccessControlFailSafeExport") && script.includes("getSharedExportPayload"));
check("Fail-Safe local buildReportHTML removed", !script.includes("function buildReportHTML("));
check("Fail-Safe local openReportWindow removed", !script.includes("function openReportWindow("));
check("Fail-Safe no longer opens report windows locally", !script.includes("window.open"));
check("Collapsed metadata dropdown remains", html.includes('id="reportMetadataMount"') && html.includes("data-report-metadata") && html.includes('data-collapsed="true"'));
check("Manual metadata export grid absent", !html.includes('<div class="export-grid">'));
check("Access Control tool polish remains loaded", html.includes("/assets/access-control-tool-polish.js"));
check("Export.js supports Planner-style extra section headings", exportJs.includes("section-heading-row") && exportJs.includes("section-count") && exportJs.includes("section-description"));
check("Export.js supports Planner-style table classes", exportJs.includes("extra-export-table--planner") && exportJs.includes("extra-export-table--kv"));
check("Fail-Safe suppresses standard calculator report sections", html.includes('"suppressStandardReportSections": true'));
check("Fail-Safe report uses Planner-style sections", script.includes('"Active Scope Context"') && script.includes('"Decision Summary"') && script.includes('"Required Action"'));
check("Fail-Safe report keeps long narrative outside decision table", script.includes('textSection("Engineering Interpretation"') && script.includes('textSection("Actionable Guidance"') && script.includes('outputs: []'));
check("Export.js supports configurable section titles", exportJs.includes("inputSectionTitle") && exportJs.includes("outputSectionTitle"));
check("Fail-Safe labels output table as Decision Summary", html.includes('"outputSectionTitle": "Decision Summary"'));
check("Fail-Safe report moves narrative rows into sections", script.includes('textSection("Engineering Interpretation"') && script.includes('textSection("Actionable Guidance"') && script.includes('textSection("Required Action"'));
check(
  "Fail-Safe report suppresses standard output table",
  script.includes("outputs: []") && html.includes('"suppressStandardReportSections": true')
);
check(
  "Fail-Safe report moves decision summary into Planner-style section",
  script.includes('"Decision Summary"') && script.includes('"Recommendation", "Status", "Confidence", "Score", "Primary Risk"')
);
check("Fail-Safe suppresses duplicate standard interpretation block", script.includes('interpretation: ""'));

console.log("\nAccess Control export ownership audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
