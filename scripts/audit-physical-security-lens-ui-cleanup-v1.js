const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-ui-cleanup-audit-001";

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
  add(
    group + "-" + idFor(signal),
    source.includes(signal) ? "SAFE" : "FAIL",
    source.includes(signal) ? group + " contains " + signal : group + " missing " + signal
  );
}

function rejectSignal(group, source, signal) {
  add(
    group + "-no-" + idFor(signal),
    !source.includes(signal) ? "SAFE" : "FAIL",
    !source.includes(signal) ? group + " does not contain " + signal : group + " still contains " + signal
  );
}

const lensIndexRel = "tools/physical-security/lens-selection/index.html";
const lensScriptRel = "tools/physical-security/lens-selection/script.js";

const lensIndex = read(lensIndexRel);
const lensScript = read(lensScriptRel);

add("lens-index-exists", exists(lensIndexRel) ? "SAFE" : "FAIL", lensIndexRel + " exists");
add("lens-script-exists", exists(lensScriptRel) ? "SAFE" : "FAIL", lensScriptRel + " exists");

[
  "<title>Lens Selection | ScopedLabs</title>",
  "<h1 style=\"margin-top: 10px;\">Lens Selection</h1>",
  "This tool completes the core Physical Security design flow",
  "Face Recognition and License Plate checks are optional specialty zones launched from Area Planner",
  "data-lens-selection-ui-cleanup-001",
  "class=\"flow-note lens-flow-note\" hidden aria-hidden=\"true\"",
  "Planning Inputs",
  "Choose the target distance, scene width, available lens, and camera format before validating the final core optical selection.",
  "class=\"card lens-technical-results-card\" aria-hidden=\"true\"",
  "class=\"results-grid lens-technical-results\" aria-live=\"polite\" aria-hidden=\"true\"",
  "id=\"lensDesignAssistant\"",
  "id=\"lensFlowActions\"",
  "Continue → Physical Security Summary",
  "id=\"exportReport\"",
  "id=\"saveSnapshot\"",
  "/assets/physical-security-guidance-memory.js?v=physical-security-guidance-memory-001-session-foundation",
  "/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation",
  "/assets/physical-security-local-assistant.js?v=physical-security-dormant-assistant-modules-001"
].forEach((signal) => requireSignal("lens-index", lensIndex, signal));

[
  "Lens Selection Helper",
  "Part of a Design Flow",
  "Documentation & Export",
  "Calculation Summary",
  "Continue → Face Recognition",
  "final recognition-range validation"
].forEach((signal) => rejectSignal("lens-index", lensIndex, signal));

[
  "const NEXT_URL = \"/tools/physical-security/summary/\";",
  "function buildLensSelectionGuidance(data)",
  "function publishLensSelectionGuidanceEvent(source, guidanceOverride)",
  "window.ScopedLabsLensSelectionGuidance"
].forEach((signal) => requireSignal("lens-script", lensScript, signal));

rejectSignal("lens-script", lensScript, "const NEXT_URL = \"/tools/physical-security/face-recognition-range/\";");
rejectSignal("lens-script", lensScript, "Lens Selection Helper");

console.log("");
console.log("Physical Security Lens UI Cleanup Audit");
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
