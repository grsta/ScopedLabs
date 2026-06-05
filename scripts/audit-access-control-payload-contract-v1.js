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

function extractExportConfigBlock(html) {
  const match = html.match(/<script data-scopedlabs-export-config>([\s\S]*?)<\/script>/);
  return match ? match[1] : "";
}

function exportConfigIsValid(html) {
  const block = extractExportConfigBlock(html);
  if (!block.trim()) return false;

  try {
    new Function("window", block)({});
    return true;
  } catch {
    return false;
  }
}

function section(title) {
  rows.push({ Status: "----", Check: title, Detail: "" });
}

const failSafeHtml = read("tools/access-control/fail-safe-fail-secure/index.html");
const failSafeScript = read("tools/access-control/fail-safe-fail-secure/script.js");
const readerHtml = read("tools/access-control/reader-type-selector/index.html");
const readerScript = read("tools/access-control/reader-type-selector/script.js");
const exportJs = read("assets/export.js");

section("Shared export/payload engine");

check("export.js supports custom payload builders", exportJs.includes("customPayloadBuilder") && exportJs.includes("buildCustomPayload"));
check("export.js supports sectioned payloads", exportJs.includes("extraSections") && exportJs.includes("renderExtraExportSections"));
check("export.js supports semantic report cell tones", exportJs.includes("renderReportCell") && exportJs.includes("report-tone--watch") && exportJs.includes("report-tone--risk"));

section("Fail-Safe payload contract");

check("Fail-Safe export config is valid JavaScript", exportConfigIsValid(failSafeHtml));
check("Fail-Safe custom payload builder is configured", failSafeHtml.includes('"customPayloadBuilder": "ScopedLabsAccessControlFailSafeExport.getPayload"'));
check("Fail-Safe payload suppresses generic calculator dump", failSafeHtml.includes('"suppressStandardReportSections": true') && failSafeScript.includes("inputs: []") && failSafeScript.includes("outputs: []"));
check("Fail-Safe payload includes active scope context", failSafeScript.includes('"Active Scope Context"'));
check("Fail-Safe payload includes required action", failSafeScript.includes('textSection("Required Action"'));
check("Fail-Safe payload includes decision flags", failSafeScript.includes('textSection("Decision Flags"'));
check("Fail-Safe ledger carries required actions", failSafeScript.includes("requiredActions"));
check("Fail-Safe ledger carries fail-state status", failSafeScript.includes("failStateStatus"));
check("Fail-Safe ledger carries power-loss intent", failSafeScript.includes("powerLossIntent"));

section("Reader Type payload contract");

check("Reader Type export config is valid JavaScript", exportConfigIsValid(readerHtml));
check("Reader Type custom payload builder is configured", readerHtml.includes('"customPayloadBuilder": "ScopedLabsAccessControlReaderTypeExport.getPayload"'));
check("Reader Type payload suppresses generic calculator dump", readerHtml.includes('"suppressStandardReportSections": true') && readerScript.includes("inputs: []") && readerScript.includes("outputs: []"));
check("Reader Type payload includes Reader Recommendation section", readerScript.includes('"Reader Recommendation"'));
check("Reader Type payload includes Credential Verification Trail section", readerScript.includes('"Credential Verification Trail"'));
check("Reader Type payload includes credential format field", readerScript.includes("cardFormat") && readerScript.includes("Card Format / Facility Code"));
check("Reader Type payload includes existing credential compatibility field", readerScript.includes("existingCred") && readerScript.includes("Existing Credential Compatibility"));
check("Reader Type payload includes compatibility risk", readerScript.includes("compatibilityRisk"));
check("Reader Type payload carries verification hold status", readerScript.includes("verificationStatus") && readerScript.includes("Verification Status"));
check("Reader Type payload carries cautionary steps", readerScript.includes("cautionarySteps") && readerScript.includes("Cautionary Steps"));
check("Reader Type payload uses semantic tone cells", readerScript.includes("cell(readerType") && readerScript.includes("cell(interfaceChoice") && readerScript.includes("cell(cardFormat"));
check("Reader Type ledger carries reader type", readerScript.includes("readerType: reader"));
check("Reader Type ledger carries panel interface / protocol", readerScript.includes("panelInterface") && readerScript.includes("readerProtocol"));
check("Reader Type ledger carries credential technology", readerScript.includes("credentialTechnology"));
check("Reader Type ledger carries facility-code/card-format status", readerScript.includes("facilityCodeStatus") && readerScript.includes("cardFormatNote"));
check("Reader Type ledger carries existing credential compatibility", readerScript.includes("existingCredentialCompatibility"));
check("Reader Type ledger carries compatibility risk", readerScript.includes("compatibilityRisk"));
check("Reader Type ledger carries next tool", readerScript.includes('nextTool: "Lock Power Budget"'));

const visibleRows = rows.filter((row) => row.Status !== "----");

console.log("\nAccess Control payload contract audit:");
console.table(rows);

const safe = visibleRows.filter((row) => row.Status === "SAFE").length;
const fail = visibleRows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
