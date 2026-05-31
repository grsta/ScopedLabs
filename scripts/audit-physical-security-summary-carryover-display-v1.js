const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-carryover-display-audit-001";
const SUMMARY_VERSION = "physical-security-summary-selected-rollup-carryover-values-011";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
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
function safe(id, ok, detail) { rows.push({ id, status: ok ? "SAFE" : "FAIL", detail }); }

const index = read("tools/physical-security/summary/index.html");
const script = read("tools/physical-security/summary/script.js");
const lensIndex = read("tools/physical-security/lens-selection/index.html");
const lensScript = read("tools/physical-security/lens-selection/script.js");
const candidate = functionBlock(script, "selectedAreaToolDetailCandidate");
const detail = functionBlock(script, "areaToolDetail");
const formatter = functionBlock(script, "formatSelectedAreaToolDetail");
const definitions = functionBlock(script, "areaToolDefinitions");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("summary-script-exists", exists("tools/physical-security/summary/script.js"), "Summary script exists");
safe("summary-cache-bumped", index.includes("./script.js?v=" + SUMMARY_VERSION), "Summary script cache bumped");
safe("summary-version-bumped", script.includes('const VERSION = "' + SUMMARY_VERSION + '";'), "Summary script version bumped");
safe("summary-only", !index.includes("physical-security-lens-carryover-values") && !lensIndex.includes("physical-security-lens-carryover-values") && !lensScript.includes("physical-security-lens-carryover-values"), "Lens files are not patched in this Summary-only lane");
safe("candidate-helper-exists", candidate.includes("selectedAreaToolDetailCandidate") && candidate.includes("selectedRollupValueByKeys"), "carryover candidate helper exists");
safe("camera-positive-before-zero", candidate.indexOf("positiveCamera") > -1 && candidate.indexOf("targetCameraCount") > -1 && candidate.indexOf("return selectedRollupValueByKeys(area, [\"cameraCount\"") > candidate.indexOf("positiveCamera"), "camera count prefers positive planned/target values before stale zero");
safe("lens-positive-class-before-zero", candidate.indexOf("positiveLens") > -1 && candidate.indexOf("lensClass") > candidate.indexOf("positiveLens") && candidate.indexOf("return selectedRollupValueByKeys(area, [\"selectedLensMm\"") > candidate.indexOf("lensClass"), "lens prefers positive lens or lens class before stale zero");
safe("area-detail-uses-candidate", detail.includes("selectedAreaToolDetailCandidate(source, definition)") && detail.includes("formatSelectedAreaToolDetail(definition, candidate.key, candidate.value)") && !detail.includes("for (const key of keys)"), "areaToolDetail uses candidate resolver instead of raw sequential stale-zero loop");
safe("definitions-include-aliases", definitions.includes("targetCameraCount") && definitions.includes("plannedCameraCount") && definitions.includes("lensClass") && definitions.includes("lensInputSelectedMm"), "tool definitions include carryover aliases");
safe("camera-count-labeled", formatter.includes("targetcameracount") && formatter.includes("Planned camera count:") && formatter.includes("formatAreaCameraCount"), "target/planned camera count is labeled");
safe("lens-labeled", formatter.includes("Selected lens input:") && formatter.includes("Lens class:") && formatter.includes("invalid / not selected"), "lens input/class/zero states are labeled");
safe("existing-labels-remain", formatter.includes("Horizontal field of view (HFOV):") && formatter.includes("Distance to target plane:") && formatter.includes("Estimated required light:"), "existing selected rollup labels remain");
safe("table-remains", script.includes("Core Pipeline Guidance for Selected Area") && script.includes("summary-area-tool-table") && script.includes("Area / Zone Detail"), "selected area rollup table remains");

console.log("");
console.log("Physical Security Summary Carryover Display Audit");
console.log("Audit version:", VERSION);
console.table(rows);
const failCount = rows.filter((row) => row.status === "FAIL").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;
console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", 0);
console.log("- FAIL:", failCount);
if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
