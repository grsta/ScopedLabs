const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-icon-inventory-audit-002-ascii-safe";

const tools = [
  "scene-illumination",
  "mounting-height",
  "field-of-view",
  "camera-coverage-area",
  "camera-spacing",
  "blind-spot-check",
  "pixel-density",
  "face-recognition-range",
  "license-plate-range"
];

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function countAny(text, needles) {
  return needles.filter(function (needle) { return text.includes(needle); }).length;
}

const updatedIconSignals = [
  "ScopedLabsPhysicalSecurityGraphicsLibrary",
  "physical-security-graphics-library.js",
  "ScopedLabs Graphics Engine",
  "Rendered by ScopedLabs Graphics Engine",
  "iconKey",
  "cameraCadIcon",
  "licensePlate",
  "coverageArea",
  "blindSpot",
  "person"
];

const likelyOutdatedSignals = [
  "placeholder icon",
  "old-icon",
  "legacy-icon",
  "inline-icon",
  "tool-icon",
  "icon-placeholder",
  "fallbackIcon",
  "defaultIcon"
];

const customSvgSignals = [
  "<svg",
  "createElementNS",
  "viewBox=",
  "drawSvg"
];

const rows = tools.map(function (slug) {
  const indexRel = "tools/physical-security/" + slug + "/index.html";
  const scriptRel = "tools/physical-security/" + slug + "/script.js";
  const index = read(indexRel);
  const script = read(scriptRel);
  const combined = index + "\n" + script;

  const updatedScore = countAny(combined, updatedIconSignals);
  const outdatedScore = countAny(combined, likelyOutdatedSignals);
  const customSvgScore = countAny(combined, customSvgSignals);

  let status = "SAFE";
  let note = "Updated/shared icon or graphics signal detected";

  if (!index || !script) {
    status = "FAIL";
    note = "Missing page or script";
  } else if (!updatedScore && outdatedScore) {
    status = "WATCH";
    note = "Likely outdated icon signal without strong updated icon/graphics signal";
  } else if (!updatedScore && customSvgScore) {
    status = "WATCH";
    note = "Custom SVG present but no strong updated icon/graphics signal";
  } else if (outdatedScore) {
    status = "WATCH";
    note = "Updated signal exists, but possible legacy icon signal still present";
  }

  return {
    tool: slug,
    page: index ? "yes" : "missing",
    script: script ? "yes" : "missing",
    updatedIconSignal: updatedScore ? "yes" : "no",
    likelyOutdatedSignal: outdatedScore ? "yes" : "no",
    customSvgSignal: customSvgScore ? "yes" : "no",
    status: status,
    note: note
  };
});

console.log("");
console.log("Physical Security Icon Inventory Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failRows = rows.filter(function (row) { return row.status === "FAIL"; });
const watchRows = rows.filter(function (row) { return row.status === "WATCH"; });
const safeRows = rows.filter(function (row) { return row.status === "SAFE"; });

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeRows.length);
console.log("- WATCH:", watchRows.length);
console.log("- FAIL:", failRows.length);

if (watchRows.length) {
  console.log("");
  console.log("WATCH tools:");
  watchRows.forEach(function (row) { console.log("- " + row.tool + ": " + row.note); });
}

if (failRows.length) {
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
