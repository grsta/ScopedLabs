const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-export-graphics-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function idFor(value) {
  let out = "";
  let lastDash = false;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i].toLowerCase();
    const code = ch.charCodeAt(0);
    const alpha = code >= 97 && code <= 122;
    const number = code >= 48 && code <= 57;
    if (alpha || number) {
      out += ch;
      lastDash = false;
    } else if (!lastDash) {
      out += "-";
      lastDash = true;
    }
  }
  while (out.startsWith("-")) out = out.slice(1);
  while (out.endsWith("-")) out = out.slice(0, -1);
  return out || "signal";
}

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function requireSignal(group, source, signal) {
  add(group + "-" + idFor(signal), source.includes(signal) ? "SAFE" : "FAIL", source.includes(signal) ? group + " contains " + signal : group + " missing " + signal);
}

function rejectSignal(group, source, signal) {
  add(group + "-no-" + idFor(signal), !source.includes(signal) ? "SAFE" : "FAIL", !source.includes(signal) ? group + " does not contain " + signal : group + " still contains " + signal);
}

const lensIndexRel = "tools/physical-security/lens-selection/index.html";
const lensAssistantRel = "assets/lens-design-assistant.js";
const exportRel = "assets/export.js";

const lensIndex = read(lensIndexRel);
const assistant = read(lensAssistantRel);
const exportJs = read(exportRel);

add("lens-index-exists", exists(lensIndexRel) ? "SAFE" : "FAIL", lensIndexRel + " exists");
add("lens-assistant-exists", exists(lensAssistantRel) ? "SAFE" : "FAIL", lensAssistantRel + " exists");
add("export-js-exists", exists(exportRel) ? "SAFE" : "FAIL", exportRel + " exists");

["/assets/scopedlabs-graphics.js?v=scopedlabs-graphics-044-axis-label-cache-bust", "/assets/lens-design-assistant.js?v=lens-design-assistant-020-duplicate-export-cleanup", "id=\"lensDesignAssistant\"", "Continue → Physical Security Summary"].forEach((signal) => requireSignal("lens-index", lensIndex, signal));

["function lensCadCameraMarker(x, y, index)", "data-graphics-symbol=\"camera-cad-lens-selection\"", "cams.push(lensCadCameraMarker(camX, camY, idx + 1));", "target.setAttribute(\"data-export-section\", \"true\");", "target.setAttribute(\"data-export-title\", \"Lens Selection Design Assistant Graphics\");", "target.setAttribute(\"data-export-compact-svg\", \"true\");", "data-export-svg data-sl-renderer=\"lens-selection-fov-plan\"", "data-export-svg data-sl-renderer=\"lens-selection-scenario-pressure\""].forEach((signal) => requireSignal("lens-assistant", assistant, signal));

["r=\"10\" fill=\"rgba(125,255,152,.13)\"", "cams.push(`<circle cx="].forEach((signal) => rejectSignal("lens-assistant", assistant, signal));

["svg[data-export-svg], [data-export-svg] svg", "[data-export-section]"].forEach((signal) => requireSignal("export-js", exportJs, signal));

console.log("");
console.log("Physical Security Lens Export Graphics Audit");
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
