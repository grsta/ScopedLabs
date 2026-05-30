const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-module-alignment-audit-002-source-aware-help-cache";

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
const adaptersRel = "assets/physical-security-tool-assistant-adapters.js";
const registryRel = "assets/physical-security-tool-registry.js";

const lensIndex = read(lensIndexRel);
const lensScript = read(lensScriptRel);
const adapters = read(adaptersRel);
const registry = read(registryRel);

add("lens-index-exists", exists(lensIndexRel) ? "SAFE" : "FAIL", lensIndexRel + " exists");
add("lens-script-exists", exists(lensScriptRel) ? "SAFE" : "FAIL", lensScriptRel + " exists");
add("assistant-adapters-exists", exists(adaptersRel) ? "SAFE" : "FAIL", adaptersRel + " exists");
add("tool-registry-exists", exists(registryRel) ? "SAFE" : "FAIL", registryRel + " exists");

[
  "<title>Lens Selection | ScopedLabs</title>",
  "<h1 style=\"margin-top: 10px;\">Lens Selection</h1>",
  "This tool completes the core Physical Security design flow",
  "Face Recognition and License Plate checks are optional specialty zones launched from Area Planner",
  "Continue → Physical Security Summary",
  "/assets/physical-security-area-state.js?v=physical-security-area-state-016-summary-banner-optout",
  "/assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics",
  "/assets/user-assistant-guidance.js?v=user-assistant-guidance-001-schema-foundation",
  "/assets/physical-security-source-policy.js?v=physical-security-source-policy-001-web-intake-gate",
  "/assets/physical-security-category-knowledge.js?v=physical-security-category-knowledge-001-web-ready",
  "/assets/physical-security-guidance-registry.js?v=physical-security-guidance-registry-001-foundation",
  "/assets/physical-security-guidance-memory.js?v=physical-security-guidance-memory-001-session-foundation",
  "/assets/physical-security-category-guidance.js?v=physical-security-category-guidance-003-deduped-visible-gate",
  "/assets/physical-security-guidance-event-bridge.js?v=physical-security-guidance-event-bridge-001-foundation",
  "/assets/physical-security-ui-kit.js?v=physical-security-dormant-assistant-modules-001",
  "/assets/physical-security-graphics-library.js?v=physical-security-dormant-assistant-modules-001",
  "/assets/physical-security-local-assistant.js?v=physical-security-dormant-assistant-modules-001",
  "/assets/physical-security-tool-assistant-adapters.js?v=physical-security-dormant-assistant-modules-001",
  "./script.js?v=physical-security-lens-summary-cta-source-013",
  "/assets/help.js?v=help-034-lens-clean-kb-card"
].forEach((signal) => requireSignal("lens-index", lensIndex, signal));

[
  "function buildLensSelectionGuidance(data)",
  "function publishLensSelectionGuidanceEvent(source, guidanceOverride)",
  "function clearLensSelectionGuidanceEventMemory()",
  "window.ScopedLabsLensSelectionGuidance",
  "ScopedLabsPhysicalSecurityGuidanceEventBridge",
  "ScopedLabsPhysicalSecurityGuidanceMemory",
  "publishLensSelectionGuidanceEvent(\"lens-selection-guidance-update\")",
  "publishLensSelectionGuidanceEvent(\"lens-design-assistant-selected-scenario\"",
  "const NEXT_URL = \"/tools/physical-security/summary/\";",
  "toolLabel: \"Lens Selection\"",
  "tool: \"Lens Selection\""
].forEach((signal) => requireSignal("lens-script", lensScript, signal));

[
  "Lens Selection Helper",
  "Continue → Face Recognition",
  "final recognition-range validation"
].forEach((signal) => rejectSignal("lens-index", lensIndex, signal));

[
  "Lens Selection Helper",
  "const NEXT_URL = \"/tools/physical-security/face-recognition-range/\";"
].forEach((signal) => rejectSignal("lens-script", lensScript, signal));

[
  "\"lens-selection\":",
  "Lens Selection Assistant"
].forEach((signal) => requireSignal("assistant-adapters", adapters, signal));

[
  "Lens Selection is now open for controlled Physical Security Summary alignment updates",
  "preserving math, export, snapshot, auth, KB, and assistant behavior"
].forEach((signal) => requireSignal("tool-registry", registry, signal));

rejectSignal("tool-registry", registry, "should not be migrated until a factory can reproduce it 1:1");

console.log("");
console.log("Physical Security Lens Module Alignment Audit");
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
