const fs = require("fs");
const path = require("path");

const root = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

function hasAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function check(rows, slug, status, name, detail = "") {
  rows.push({ slug, status, name, detail });
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

const rows = [];
const outputShell = read("assets/access-control-output-shell.js");
const exportEngine = read("assets/export.js");

const outputShellCanAutoBind =
  outputShell.includes("access-control-output-shell-export-popup-visual-autobind-003") &&
  outputShell.includes("ensureExportVisualBinding") &&
  outputShell.includes("__accessControlOutputShellVisualBinding") &&
  outputShell.includes("config.getChartImage = function getAccessControlOutputShellChartImage");

check(rows, "shared", exists("assets/access-control-output-shell.js") ? "SAFE" : "FAIL", "Access Control output shell exists");
check(rows, "shared", outputShellCanAutoBind ? "SAFE" : "FAIL", "output shell auto-binds registered visuals into export config");
check(rows, "shared", exists("assets/export.js") ? "SAFE" : "WATCH", "shared export engine available for inspection");

if (exists("assets/export.js")) {
  check(
    rows,
    "shared",
    hasAny(exportEngine, ["getChartImage", "chartImage", "visualImage", "reportVisual"]) ? "SAFE" : "WATCH",
    "shared export engine appears to consume visual image callback"
  );
}

for (const slug of tools) {
  const htmlRel = `tools/access-control/${slug}/index.html`;
  const scriptRel = `tools/access-control/${slug}/script.js`;
  const html = read(htmlRel);
  const script = read(scriptRel);

  check(rows, slug, html ? "SAFE" : "FAIL", "page exists");
  check(rows, slug, script ? "SAFE" : "FAIL", "script exists");

  if (slug === "scope-planner") {
    check(
      rows,
      slug,
      script.includes("printScopeSummary") && script.includes("buildScopePlannerBranchMapSvg") ? "SAFE" : "WATCH",
      "scope planner uses dedicated print summary path",
      "scope planner is intentionally not calculator output-shell based"
    );

    check(
      rows,
      slug,
      script.includes("exportMode: true") ? "SAFE" : "WATCH",
      "scope planner branch map has print/export palette"
    );

    continue;
  }

  const loadsOutputShell = html.includes("/assets/access-control-output-shell.js?v=access-control-output-shell-003-export-popup-visual-autobind");
  const hasVisualCallback = hasAny(script, [
    "getChartImage",
    "getExportChartImage",
    "getAccessLevelVisualImage",
    "getReaderTypeVisualImage",
    "getCredentialFormatVisualImage"
  ]);

  const registersOutputShell = hasAny(script, [
    ".register(",
    "outputShell().register",
    "shell.register",
    "ScopedLabsAccessControlOutputShell.register"
  ]);

  const usesAttachOutputShellExport = script.includes("attachOutputShellExport");
  const declaresExportConfig = script.includes("ScopedLabsExportConfig");

  check(rows, slug, loadsOutputShell ? "SAFE" : "FAIL", "loads Access Control output shell");
  check(rows, slug, hasVisualCallback ? "SAFE" : "WATCH", "has a visual image callback available to export/report");
  check(rows, slug, registersOutputShell || usesAttachOutputShellExport || declaresExportConfig ? "SAFE" : "WATCH", "has some output/export integration path");
  check(rows, slug, outputShellCanAutoBind ? "SAFE" : "FAIL", "visual callback reaches blob/export popup path");
  check(rows, slug, outputShellCanAutoBind ? "SAFE" : "FAIL", "not relying on register-only visual handoff");
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("\nAccess Control export popup visual binding audit");
for (const row of rows) {
  const detail = row.detail ? " :: " + row.detail : "";
  console.log(`${row.status.padEnd(5)} ${row.slug} — ${row.name}${detail}`);
}

console.log(`\nSummary: ${counts.SAFE || 0} SAFE / ${counts.WATCH || 0} WATCH / ${counts.FAIL || 0} FAIL`);

if (counts.FAIL) process.exit(1);
