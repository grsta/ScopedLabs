const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
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

check("Fail-Safe index exists", index.length > 0);
check("Fail-Safe script exists", script.length > 0);
check("Browser title uses ASCII hyphen", index.includes("<title>Fail-Safe vs Fail-Secure - ScopedLabs</title>"));
check("No bullet title separator", !index.includes("\u2022"));
check("Style cache bumped", index.includes("/assets/style.css?v=access-control-fail-safe-two-visuals-polish-019"));
check("Local script cache bumped", index.includes("./script.js?v=access-control-fail-safe-two-visuals-polish-019"));
check("Tool shell diagnostic module loaded", index.includes("/assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics"));
check("Generic assistant engine loaded once", count(index, "scopedlabs-local-assistant.js") === 1);
check("Access Control adapter loaded once", count(index, "access-control-tool-assistant-adapters.js") === 1);
check("Assistant engine uses Physical Security-style card rhythm", engine.includes("pill-row") && engine.includes("assistant-grid") && engine.includes("Local Design Assistant"));
check("Assistant card is Access Control scoped", engine.includes("access-control-local-assistant-card") && adapters.includes("access-control-assistant-adapters-023-fail-safe-marker-polish"));
check("Only Fail-Safe adapter registered", adapters.includes('"fail-safe-fail-secure"') && !adapters.includes('"reader-type-selector"'));
check("Old visible breadcrumbs removed", !index.includes('class="crumbs"'));
check("Top free-tier pill removed", !index.includes("Free Tier"));
check("Part of design flow pill removed", !index.includes("Part of a Design Flow"));
check("Documentation/export pill removed", !index.includes("Documentation &amp; Export"));
check("Planning Inputs title present", index.includes("Planning Inputs"));
check("Legacy results card hidden", index.includes('id="accessControlLegacyResultsCard"') && index.includes('class="card access-control-hidden-results-card" hidden aria-hidden="true"'));
check("Legacy result values still render in hidden results node", script.includes("function render(rows)") && script.includes("els.results.innerHTML") && script.includes("getRenderedRows()"));
check("Assistant remains explicit mount only", index.includes('id="accessControlLocalAssistantMount"') && script.includes("renderLocalAssistant(assistantPayload);"));
check("Assistant clears on input/reset path", script.includes("function clearLocalAssistant()") && script.includes("clearLocalAssistant();"));
check("Original score math preserved", [
  'if (doorType === "stairwell") score += 3;',
  'if (doorType === "it") score -= 3;',
  'if (life === "high") score += 3;',
  'if (threat === "high") score -= 3;'
].every((token) => script.includes(token)));
check("Export/report controls preserved", ["exportReport", "saveSnapshot", "exportStatus"].every((id) => index.includes('id="' + id + '"')));
check("Export payload still uses hidden calculated outputs", script.includes("outputs: getRenderedRows()"));
check("Pipeline/continue preserved", index.includes('id="pipeline"') && script.includes('/tools/access-control/reader-type-selector/') && index.includes('id="continue"'));
check("Knowledge Base preserved", index.includes('/assets/help.js'));
check("Footer copyright entity", index.includes("&copy; <span data-year></span> ScopedLabs"));
check("Closeout CSS present", style.includes("access-control-fail-safe-two-visuals-polish-019"));
check("Physical-style assistant grid CSS present", style.includes(".scopedlabs-local-assistant-card .assistant-grid") && style.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
check("No category-wide Access Control rollout", !readerIndex.includes("access-control-tool-assistant-adapters.js") && !readerIndex.includes("accessControlLocalAssistantMount"));

console.log("\nAccess Control Fail-Safe factory closeout audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
