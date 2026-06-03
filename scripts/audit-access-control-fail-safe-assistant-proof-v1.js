const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
}

function count(text, needle) {
  return String(text || "").split(needle).length - 1;
}

const index = read("tools/access-control/fail-safe-fail-secure/index.html");
const script = read("tools/access-control/fail-safe-fail-secure/script.js");
const style = read("assets/style.css");
const engine = read("assets/scopedlabs-local-assistant.js");
const adapters = read("assets/access-control-tool-assistant-adapters.js");
const readerIndex = read("tools/access-control/reader-type-selector/index.html");

check("Fail-Safe proof index exists", index.length > 0);
check("Fail-Safe proof script exists", script.length > 0);
check("Generic local assistant engine added", exists("assets/scopedlabs-local-assistant.js"));
check("Access Control adapter map added", exists("assets/access-control-tool-assistant-adapters.js"));
check("Generic engine exposes ScopedLabsLocalAssistant", engine.includes("window.ScopedLabsLocalAssistant") && engine.includes("mount") && engine.includes("clear"));
check("Access Control adapter exposes global", adapters.includes("window.ScopedLabsAccessControlToolAssistantAdapters"));
check("Only Fail-Safe adapter is registered", adapters.includes('"fail-safe-fail-secure"') && !adapters.includes('"reader-type-selector"'));
check("Explicit local assistant mount present", index.includes('id="accessControlLocalAssistantMount"'));
check("Assistant mount is hidden before calculation", index.includes('id="accessControlLocalAssistantMount" hidden'));
check("Generic assistant asset loaded once", count(index, "scopedlabs-local-assistant.js") === 1);
check("Access Control adapter asset loaded once", count(index, "access-control-tool-assistant-adapters.js") === 1);
check("Local script cache bumped", index.includes("./script.js?v=access-control-fail-safe-assistant-proof-001"));
check("Style cache bumped", index.includes("/assets/style.css?v=access-control-fail-safe-assistant-proof-001"));
check("Assistant scripts load before local script", index.indexOf("scopedlabs-local-assistant.js") < index.indexOf("./script.js?v=access-control-fail-safe-assistant-proof-001") && index.indexOf("access-control-tool-assistant-adapters.js") < index.indexOf("./script.js?v=access-control-fail-safe-assistant-proof-001"));
check("Result region preserved", index.includes('id="results"'));
check("Export controls preserved", ["exportReport", "saveSnapshot", "exportStatus"].every((id) => index.includes('id="' + id + '"')));
check("Knowledge Base runtime preserved", index.includes('/assets/help.js'));
check("Pipeline/analyzer scripts preserved", ["/assets/tool-flow.js", "/assets/pipeline.js", "/assets/analyzer.js"].every((token) => index.includes(token)));
check("Continue target preserved", script.includes('/tools/access-control/reader-type-selector/'));
check("Calculation logic still contains original scoring", [
  'if (doorType === "stairwell") score += 3;',
  'if (doorType === "it") score -= 3;',
  'if (life === "high") score += 3;',
  'if (threat === "high") score -= 3;'
].every((token) => script.includes(token)));
check("Assistant render function added", script.includes("function renderLocalAssistant(core)") && script.includes("ScopedLabsAccessControlToolAssistantAdapters"));
check("Assistant clear function added", script.includes("function clearLocalAssistant()"));
check("Assistant clears through clearResults", script.includes("clearLocalAssistant();") && script.indexOf("clearLocalAssistant();") < script.indexOf("clearAnalysis();"));
check("Assistant renders after calculation", script.includes("renderLocalAssistant(assistantPayload);") && script.indexOf("renderLocalAssistant(assistantPayload);") > script.indexOf("currentReport = buildReportPayload"));
check("Assistant payload includes validated outputs", ["recommendation", "confidence", "score", "risk", "guidance", "scoreMeaning"].every((token) => script.includes(token)));
check("Scoped assistant CSS added", style.includes("scopedlabs-local-assistant-001-proof") && style.includes(".scopedlabs-local-assistant-card"));
check("Physical Security assets not copied into Access Control page", !index.includes("physical-security-local-assistant.js") && !index.includes("physical-security-tool-assistant-adapters.js"));
check("No category-wide Access Control assistant rollout", !readerIndex.includes("access-control-tool-assistant-adapters.js") && !readerIndex.includes("accessControlLocalAssistantMount"));

console.log("\nAccess Control Fail-Safe local assistant proof audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
