const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
}

const html = read("tools/access-control/reader-type-selector/index.html");
const script = read("tools/access-control/reader-type-selector/script.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");

[
  "sec",
  "cred",
  "env",
  "throughput",
  "iface",
  "cardFormat",
  "existingCred",
].forEach((id) => {
  check("Input exists: " + id, html.includes('id="' + id + '"'));
});

check("Reader Type reads previous Fail-Safe context", script.includes("getPreviousStepData") && script.includes("PREVIOUS_STEP"));
check("Reader Type does not duplicate Scope Planner carry-forward context on page", script.includes("function loadFlowContext()") && !script.includes("access-reader-carry-row"));
check("Reader Type names downstream Lock Power Budget", script.includes("Lock Power Budget") && script.includes('/tools/access-control/lock-power-budget/'));

check("Reader Type decision logic considers security level", script.includes('sec === "high"') && script.includes("higher-assurance checkpoint"));
check("Reader Type decision logic considers credential preference", script.includes('cred === "mobile"') && script.includes('cred === "multi"'));
check("Reader Type decision logic considers environment", script.includes('env === "harsh"') && script.includes("industrial/IP-rated"));
check("Reader Type decision logic considers throughput", script.includes('throughput === "handsfree"') && script.includes("Hands-free / BLE / long-range user flow"));
check("Reader Type decision logic considers interface security", script.includes('iface === "wg"') && script.includes("Wiegand"));
check("Reader Type includes credential format / facility-code intelligence", script.includes("cardFormat") && script.includes("facility code") && script.includes("bit format"));
check("Reader Type includes existing credential compatibility intelligence", script.includes("existingCred") && script.includes("Must support existing cards"));
check("Reader Type flags unknown facility-code compatibility risk", script.includes("Existing credentials must remain") && script.includes("facility code / bit format is unknown"));
check("Reader Type flags CSN / UID-only credential risk", script.includes("CSN / UID-only") && script.includes("UID-only"));

check("Reader Type assistant adapter exists", adapters.includes("buildReaderTypeSelectorModel"));
check("Reader Type adapter builds actions", adapters.includes("Reader Type Assistant") && adapters.includes("requiredActions"));
check(
  "Reader Type assistant model includes guidance sections",
  adapters.includes("Decision Basis") &&
    adapters.includes("Fix Path") &&
    adapters.includes("Next Step") &&
    !adapters.includes('title: "Carry Forward"')
);
check("Shared local assistant supports optional sections", read("assets/scopedlabs-local-assistant.js").includes("renderSections") && read("assets/scopedlabs-local-assistant.js").includes("assistant-section-grid"));
check("Shared local assistant can hide duplicate standard lists", read("assets/scopedlabs-local-assistant.js").includes("hideStandardLists"));
check("Shared local assistant avoids empty rich-section filler", !read("assets/scopedlabs-local-assistant.js").includes("No additional items recorded"));
check("Shared local assistant injects rich-section card styles", read("assets/scopedlabs-local-assistant.js").includes("ensureRichAssistantStyles") && read("assets/scopedlabs-local-assistant.js").includes("scopedlabs-local-assistant-card--rich"));
check("Reader Type hides duplicate standard assistant lists", adapters.includes("hideStandardLists: true"));
check("Reader Type rich assistant hides header pills", adapters.includes("hideHeaderPills: true") && read("assets/scopedlabs-local-assistant.js").includes("hideHeaderPills"));
check(
  "Shared local assistant renderer suppresses pill row when requested",
  read("assets/scopedlabs-local-assistant.js").includes("const pillRow = model.hideHeaderPills") &&
    read("assets/scopedlabs-local-assistant.js").includes("pillRow +") &&
    read("assets/scopedlabs-local-assistant.js").includes("standardLists")
);
check("Reader Type assistant uses Next Step instead of duplicate Carry Forward", adapters.includes('title: "Next Step"') && !adapters.includes('title: "Carry Forward"'));
check("Reader Type local assistant receives guidance/actions", script.includes("renderLocalAssistant(assistantCore)") && script.includes("requiredActions"));
check("Reader Type assistant displays credential verification trail", adapters.includes("Credential format basis") && adapters.includes("Existing credential compatibility") && adapters.includes("Compatibility risk"));
check("Reader Type displays visible verification hold", script.includes("reader-verification-hold") && script.includes(": Confirm before continuing") && script.includes("Verification Status"));
check("Reader Type result cells use CAD scope-card rhythm", script.includes("ensureReaderResultCadStyles") && script.includes("rgba(148,163,184,.12)") && script.includes("font-weight: 720"));
check("Reader Type semantic status token includes healthy", script.includes("reader-status-token--healthy") && script.includes('status === "HEALTHY"'));
check("Reader Type warning card uses text-tone treatment", script.includes("renderSemanticStatusText") && script.includes("reader-status-token--watch") && script.includes("labeledSemanticValue"));
check("Reader Type warning card avoids amber filled panel", !script.includes("background: rgba(255, 191, 87, 0.09)") && !script.includes("border: 1px solid rgba(255, 191, 87, 0.38)"));
check("Reader Type assistant includes verification required gate", adapters.includes("Verification Required") && adapters.includes("Do not treat this reader decision as final"));
check("Reader Type guidance tells user what to check next", script.includes("Verify credential format, facility-code/bit-format, and existing-card compatibility before final reader selection.") && script.includes("Carry reader type, interface, credential technology, and credential-format assumptions into Lock Power Budget and Summary."));

check("Reader Type saves pipeline result", script.includes("ScopedLabsAnalyzer.writeFlow") && script.includes("readerType"));
check("Reader Type carry-forward includes reader type", script.includes("readerType: reader"));
check("Reader Type carry-forward includes interface", script.includes("interface: iface") && script.includes("interfaceRec"));
check("Reader Type carry-forward includes credential", script.includes("credential: cred"));
check("Reader Type carry-forward includes environment", script.includes("environment: env"));

check("Reader Type report uses Planner-style sections", script.includes('"Reader Recommendation"') && script.includes('"Inputs"') && !script.includes('"Carry-Forward Context"'));
check("Reader Type report includes credential verification trail", script.includes('"Credential Verification Trail"') && script.includes('"Card Format / Facility Code"') && script.includes('"Existing Compatibility"'));
check("Reader Type report includes active scope context", script.includes('"Active Scope Context"') && script.includes("Area / Scope") && script.includes("Opening / Door Count"));
check("Reader Type renders visible active scope context", html.includes('id="activeAccessScopeCard"') && html.includes("access-scope-context-card") && script.includes("renderActiveScopeContext"));
check("Reader Type active scope uses shared scope-state module", script.includes("ScopedLabsAccessControlScopeState") && script.includes("buildScopeDisplayContext") && script.includes("renderScopeDisplay"));
check("Shared scope-state module owns active scope display", read("assets/access-control-scope-state.js").includes("renderScopeDisplay") && read("assets/access-control-scope-state.js").includes("access-scope-context-card"));
check("Reader Type has no one-off active scope grid", !html.includes('id="activeScopeContextCard"') && !html.includes('id="activeScopeContextRows"'));
check("Reader Type new domain inputs invalidate results", script.includes("els.cardFormat") && script.includes("els.existingCred") && script.includes("addEventListener"));
check("Reader Type page output uses improved recommendation shell", script.includes("reader-result-hero") && script.includes("reader-result-grid"));
check("Reader Type report separates long guidance", script.includes('textSection("Engineering Interpretation"') && script.includes('textSection("Actionable Guidance"'));
check("Reader Type report suppresses calculator dump", html.includes('"suppressStandardReportSections": true') && script.includes("inputs: []") && script.includes("outputs: []"));
check("Reader Type report uses semantic tones", script.includes("toneForInterface") && script.includes("toneForSecurity") && script.includes("cell(readerType") && script.includes("cell(interfaceChoice") && script.includes("cell(security"));

console.log("\nAccess Control Reader Type assistant capability audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
