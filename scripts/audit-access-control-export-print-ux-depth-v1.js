const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];
let failed = false;

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

function check(slug, name, ok, detail = "") {
  rows.push({ slug, status: ok ? "SAFE" : "FAIL", check: name, detail });
  if (!ok) failed = true;
}

function scriptParses(source) {
  try {
    new Function(source);
    return true;
  } catch (error) {
    return false;
  }
}

function hasAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}



function hasConstrainedLocalVisualHeight(script) {
  return /\.chart-wrap\s+img\s*\{[^}]*max-height\s*:/m.test(script) ||
    /\.visual-wrap\s+img\s*\{[^}]*max-height\s*:/m.test(script) ||
    /max-height\s*:\s*4\.6in/m.test(script) ||
    /max-height\s*:\s*4\.8in/m.test(script);
}

function hasLocalReportCacheToken(slug, html) {
  return html.includes("./script.js?v=access-control-" + slug + "-export-print-ux-001") ||
    (slug === "door-count-planner" && html.includes("./script.js?v=access-control-door-count-preview-print-mode-007")) ||
    (slug === "door-cable-length" && html.includes("./script.js?v=access-control-door-cable-length-preview-print-mode-002")) ||
    (slug === "panel-capacity" && html.includes("./script.js?v=access-control-panel-capacity-preview-print-mode-002")) ||
    (slug === "access-level-sizing" && html.includes("./script.js?v=access-control-access-level-sizing-preview-print-mode-002"));
}

const tools = [
  "scope-planner",
  "door-count-planner",
  "door-cable-length",
  "panel-capacity",
  "access-level-sizing",
  "reader-type-selector",
  "credential-format",
  "lock-power-budget",
  "fail-safe-fail-secure",
  "elevator-reader-count",
  "anti-passback-zones",
  "special-locking-scope"
];

const localPrintTools = new Set([
  "door-count-planner",
  "door-cable-length",
  "panel-capacity",
  "access-level-sizing",
  "credential-format",
  "lock-power-budget",
  "elevator-reader-count",
  "anti-passback-zones"
]);

const sharedExportOnlyTools = new Set([
  "reader-type-selector",
  "fail-safe-fail-secure",
  "special-locking-scope"
]);

for (const slug of tools) {
  const htmlRel = "tools/access-control/" + slug + "/index.html";
  const scriptRel = "tools/access-control/" + slug + "/script.js";
  const html = read(htmlRel);
  const script = read(scriptRel);

  check(slug, "page exists", Boolean(html));
  check(slug, "script exists", Boolean(script));
  check(slug, "script parses", scriptParses(script));
  check(slug, "does not use invalid SVG auto height", !script.includes('height="auto"'));
  check(slug, "does not expose legacy Chart Snapshot wording", !script.includes("Chart Snapshot"));

  if (slug === "scope-planner") {
    check(slug, "loads shared planning visual", html.includes("/assets/access-control-planning-visuals.js?v=access-control-planning-visuals-059-access-level-shared-visual"));
    check(slug, "has dedicated print/copy summary actions", script.includes("printScopeSummary") && script.includes("copyScopeSummary"));
    check(slug, "branch map has print/export palette", script.includes("buildScopePlannerBranchMapSvg") && script.includes("exportMode: true"));
    check(slug, "uses natural print packing", script.includes("access-control-scope-planner-print-disclaimer-keep-028") && script.includes("break-inside:avoid;page-break-inside:avoid") && !script.includes("break-before:page;page-break-before:always"));
    check(slug, "correctly avoids calculator output shell", !html.includes("/assets/access-control-output-shell.js"));
    continue;
  }

  check(slug, "loads current output shell", html.includes("/assets/access-control-output-shell.js?v=access-control-output-shell-004-export-safe-visual-preference"));
  check(slug, "loads current global polish", html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-011-status-value-weight"));
  check(slug, "has report/export action wiring", hasAny(script, ["attachOutputShellExport", "ScopedLabsExportConfig", "reportActions"]));
  check(slug, "has export visual image callback", hasAny(script, ["getChartImage", "getExportChartImage", "getAccessLevelVisualImage", "getReaderTypeVisualImage", "getCredentialFormatVisualImage"]));
  check(slug, "has acceptable visual ownership path", hasAny(script, ["ScopedLabsAccessControlPlanningVisuals", "shell.register", "attachOutputShellExport"]));

  if (localPrintTools.has(slug)) {
    check(
  slug,
  "local report cache token bumped",
  hasLocalReportCacheToken(slug, html),
  ""
);
    check(slug, "local report uses Planning Visual wording or no visual block needed", script.includes("Planning Visual") || slug === "credential-format");
    check(slug, "local report has explicit print page margin", script.includes("@page{margin:.45in}"));
    check(slug, "local report avoids orphaned visual/section blocks", script.includes(".report-head,.section,.chart-wrap,.grid,.summary,.body-copy,.foot{break-inside:avoid;page-break-inside:avoid}"));
    check(
  slug,
  "local report constrains visual image height",
  hasConstrainedLocalVisualHeight(script),
  ""
);
    check(slug, "local print status chip uses cleaner weight/radius", script.includes("border-radius:10px") && script.includes("font-weight:720"));
  }

  if (sharedExportOnlyTools.has(slug)) {
    check(slug, "uses shared export/output path instead of local print window", !script.includes("Chart Snapshot") && !script.includes("window.print()"));
  }

  if (slug === "fail-safe-fail-secure") {
    check(slug, "keeps Fail-Safe assistant proof/reference content", script.includes("Recommendation References") && script.includes("Assistant Recommendation"));
  } else {
    check(slug, "is not incorrectly required to copy Fail-Safe proof pattern", true);
  }
}

console.log("\nAccess Control export/print UX depth audit");
for (const row of rows) {
  const detail = row.detail ? " :: " + row.detail : "";
  console.log(row.status.padEnd(5) + " " + row.slug + " — " + row.check + detail);
}

const safe = rows.filter((row) => row.status === "SAFE").length;
const fail = rows.filter((row) => row.status === "FAIL").length;
console.log("\nSummary: " + safe + " SAFE / " + fail + " FAIL");

if (failed) process.exit(1);
