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
  "iface"
].forEach((id) => {
  check("Input exists: " + id, html.includes('id="' + id + '"'));
});

check("Reader Type reads previous Fail-Safe context", script.includes("getPreviousStepData") && script.includes("PREVIOUS_STEP"));
check("Reader Type reports carry-forward context", script.includes('"Carry-Forward Context"') && script.includes("Fail-Safe / Fail-Secure"));
check("Reader Type names downstream Lock Power Budget", script.includes("Lock Power Budget") && script.includes('/tools/access-control/lock-power-budget/'));

check("Reader Type decision logic considers security level", script.includes('sec === "high"') && script.includes("higher-assurance checkpoint"));
check("Reader Type decision logic considers credential preference", script.includes('cred === "mobile"') && script.includes('cred === "multi"'));
check("Reader Type decision logic considers environment", script.includes('env === "harsh"') && script.includes("industrial/IP-rated"));
check("Reader Type decision logic considers throughput", script.includes('throughput === "handsfree"') && script.includes("Long-range / BLE"));
check("Reader Type decision logic considers interface security", script.includes('iface === "osdp"') && script.includes("Wiegand"));

check("Reader Type assistant adapter exists", adapters.includes("buildReaderTypeSelectorModel"));
check("Reader Type adapter builds actions", adapters.includes("Reader Type Assistant") && adapters.includes("requiredActions"));
check("Reader Type local assistant receives guidance/actions", script.includes("renderLocalAssistant(assistantCore)") && script.includes("requiredActions"));
check("Reader Type guidance tells user what to check next", script.includes("Confirm the selected reader interface") && script.includes("Carry this reader strategy into Lock Power Budget"));

check("Reader Type saves pipeline result", script.includes("ScopedLabsAnalyzer.writeFlow") && script.includes("readerType"));
check("Reader Type carry-forward includes reader type", script.includes("readerType: reader"));
check("Reader Type carry-forward includes interface", script.includes("interface: iface") && script.includes("interfaceRec"));
check("Reader Type carry-forward includes credential", script.includes("credential: cred"));
check("Reader Type carry-forward includes environment", script.includes("environment: env"));

check("Reader Type report uses Planner-style sections", script.includes('"Reader Recommendation"') && script.includes('"Carry-Forward Context"') && script.includes('"Inputs"'));
check("Reader Type report separates long guidance", script.includes('textSection("Engineering Interpretation"') && script.includes('textSection("Actionable Guidance"'));
check("Reader Type report suppresses calculator dump", html.includes('"suppressStandardReportSections": true') && script.includes("inputs: []") && script.includes("outputs: []"));
check("Reader Type report uses semantic tones", script.includes("toneForStatus") && script.includes("toneForInterface") && script.includes("toneForSecurity") && script.includes("cell(readerType"));

console.log("\nAccess Control Reader Type assistant capability audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
