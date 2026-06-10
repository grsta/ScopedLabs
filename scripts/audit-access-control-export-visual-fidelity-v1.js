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
function push(rows, slug, status, check, detail = "") {
  rows.push({ slug, status, check, detail });
}

const rows = [];
const exportJs = read("assets/export.js");
const outputShell = read("assets/access-control-output-shell.js");
const visuals = read("assets/access-control-planning-visuals.js");
const doorCountScript = read("tools/access-control/door-count-planner/script.js");

push(rows, "shared", exists("assets/export.js") ? "SAFE" : "WATCH", "shared export engine available for inspection");
if (exists("assets/export.js")) {
  push(rows, "shared", /chart snapshot/i.test(exportJs) ? "FAIL" : "SAFE", "shared export popup avoids legacy Chart Snapshot label");
}

push(rows, "shared", exists("assets/access-control-output-shell.js") ? "SAFE" : "FAIL", "Access Control output shell exists");
push(
  rows,
  "shared",
  outputShell.includes("access-control-output-shell-export-safe-visual-preference-004") &&
  outputShell.includes("function getExportChartImage") &&
  outputShell.includes("const shellImage = getExportChartImage(slug)") ? "SAFE" : "FAIL",
  "output shell supports dedicated export-safe visual callback"
);

push(rows, "shared", exists("assets/access-control-planning-visuals.js") ? "SAFE" : "FAIL", "shared planning visual module exists");

push(rows, "door-count-shared-visual", visuals.includes("function buildDoorCountSvg") ? "SAFE" : "FAIL", "Door Count shared visual renderer exists");
push(rows, "door-count-shared-visual", /buildDoorCountSvg[\s\S]*exportMode/.test(visuals) ? "SAFE" : "FAIL", "Door Count renderer has export-mode support");
push(rows, "door-count-shared-visual", /buildDoorCountSvg[\s\S]*(cadControlledDoorOpeningIcon|cadDoorReaderOpeningIcon)/.test(visuals) ? "SAFE" : "FAIL", "Door Count renderer uses shared CAD door icon primitive");
push(rows, "door-count-shared-visual", /buildDoorCountSvg,\s*\n\s*renderDoorCount,/.test(visuals) ? "SAFE" : "FAIL", "Door Count SVG builder is exported by shared visual module");

push(rows, "door-count-tool", exists("tools/access-control/door-count-planner/script.js") ? "SAFE" : "FAIL", "Door Count tool script exists");
push(rows, "door-count-tool", doorCountScript.includes("getDoorCountPlanningVisualExportImage") ? "SAFE" : "FAIL", "Door Count has export-safe visual image helper");
push(rows, "door-count-tool", /getDoorCountPlanningVisualExportImage[\s\S]*exportMode:\s*true/.test(doorCountScript) ? "SAFE" : "FAIL", "Door Count export helper requests print-safe visual palette");
push(rows, "door-count-tool", /function getChartImage\(\)[\s\S]*getDoorCountPlanningVisualImage\(\)/.test(doorCountScript) ? "SAFE" : "FAIL", "Door Count chart callback uses dark preview visual");
push(rows, "door-count-tool", /function getExportChartImage\(\)[\s\S]*getDoorCountPlanningVisualImage\(\)/.test(doorCountScript) ? "SAFE" : "FAIL", "Door Count popup callback uses dark preview visual");
push(rows, "door-count-tool", /shell\.register\(TOOL,\s*\{[\s\S]*getExportChartImage\(\)\s*\{[\s\S]*getDoorCountPlanningVisualImage\(\)/.test(doorCountScript) ? "SAFE" : "FAIL", "Door Count output shell registration exposes dark preview visual callback");
push(rows, "door-count-tool", doorCountScript.includes("chartImage: getDoorCountPlanningVisualImage()") ? "SAFE" : "FAIL", "Door Count local report uses dark preview visual");
push(rows, "door-count-tool", doorCountScript.includes("Planning Visual") ? "SAFE" : "FAIL", "Door Count local report wording is modernized");
push(rows, "door-count-tool", exportJs.includes("chart-wrap--print-low-ink") ? "SAFE" : "FAIL", "shared export supports print-low-ink chart mode");
push(rows, "door-count-tool", read("tools/access-control/door-count-planner/index.html").includes('"printLowInkChart": true') ? "SAFE" : "FAIL", "Door Count enables print-low-ink mode for Print / Save PDF");
push(rows, "door-count-tool", doorCountScript.includes("filter:invert(1) hue-rotate(180deg) saturate(.75) contrast(1.15)") ? "SAFE" : "FAIL", "Door Count local print page tones dark preview visual");

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("\nAccess Control export visual fidelity audit");
for (const row of rows) {
  const detail = row.detail ? " :: " + row.detail : "";
  console.log(`${row.status.padEnd(5)} ${row.slug} — ${row.check}${detail}`);
}

console.log(`\nSummary: ${counts.SAFE || 0} SAFE / ${counts.WATCH || 0} WATCH / ${counts.FAIL || 0} FAIL`);

if (counts.FAIL) process.exit(1);
