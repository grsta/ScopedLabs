const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-selected-rollup-detail-labels-audit-001";
const SUMMARY_SCRIPT_VERSION = "physical-security-summary-selected-rollup-detail-labels-010";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function functionBlock(text, name) {
  const needle = "function " + name + "(";
  const at = text.indexOf(needle);
  if (at < 0) return "";

  const braceStart = text.indexOf("{", at);
  if (braceStart < 0) return "";

  let depth = 0;
  for (let i = braceStart; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(at, i + 1);
    }
  }

  return "";
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const areaToolDetail = functionBlock(script, "areaToolDetail");
const areaToolRows = functionBlock(script, "areaToolRows");
const areaToolDefinitions = functionBlock(script, "areaToolDefinitions");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("summary-script-cache-bumped", index.includes("./script.js?v=" + SUMMARY_SCRIPT_VERSION), "Summary script cache bumped");
safe("summary-script-version-bumped", script.includes('const VERSION = "' + SUMMARY_SCRIPT_VERSION + '";'), "Summary script version bumped");
safe("rollup-detail-label-marker", script.includes("physical-security-summary-selected-rollup-detail-labels-010"), "selected rollup detail marker exists");
safe("definitions-expanded", areaToolDefinitions.includes("lightingInterpretation") && areaToolDefinitions.includes("estimatedLumensRequired") && areaToolDefinitions.includes("assumedHfovDeg") && areaToolDefinitions.includes("selectedLensMm"), "selected rollup reads expanded saved detail keys");
safe("detail-helper-used", areaToolDetail.includes("formatSelectedAreaToolDetail(definition, key, value)") && areaToolDetail.includes("generatedSelectedAreaDetailFallback(definition, status)"), "selected rollup uses label formatter and honest generated fallback");
safe("rows-pass-status", areaToolRows.includes("areaToolDetail(area, definition, status)") && areaToolRows.includes('normalizeStatus(hasStatus ? statusValue : "pending")'), "area tool rows pass status into detail formatter");
safe("hfov-labeled", script.includes("Horizontal field of view (HFOV):") && script.includes("formatAreaDegrees"), "HFOV values are labeled");
safe("coverage-distance-labeled", script.includes("Distance to target plane:") && script.includes("formatAreaFeet"), "coverage distance values are labeled");
safe("camera-count-labeled", script.includes("Camera count:") && script.includes("formatAreaCameraCount"), "camera count values are labeled");
safe("lens-labeled", script.includes("Selected lens:") && script.includes("invalid / not selected"), "lens values are labeled with invalid zero state");
safe("scene-lighting-labeled", script.includes("Target illumination:") && script.includes("Estimated required light:") && script.includes("Lighting class:"), "Scene Illumination values are labeled");
safe("raw-string-return-removed", !areaToolDetail.includes("return String(value);"), "selected rollup no longer returns raw numeric detail values");
safe("table-remains", script.includes("Core Pipeline Guidance for Selected Area") && script.includes("summary-area-tool-table") && script.includes("Area / Zone Detail"), "selected area rollup table remains");

console.log("");
console.log("Physical Security Summary Selected Rollup Detail Labels Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
