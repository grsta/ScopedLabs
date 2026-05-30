const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-summary-cta-source-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/lens-selection/index.html");
const script = read("tools/physical-security/lens-selection/script.js");

safe("lens-index-exists", exists("tools/physical-security/lens-selection/index.html"), "Lens index exists");
safe("lens-script-exists", exists("tools/physical-security/lens-selection/script.js"), "Lens script exists");
safe("summary-cta-style", index.includes("data-lens-summary-cta-source-001"), "source-level Summary CTA style exists");
safe("summary-cta-row-visible", index.includes("id=\"next-step-row\" class=\"lens-summary-cta-row\""), "Summary CTA row is source-level visible");
safe("summary-cta-anchor", (index.includes("<a id=\"continue\" class=\"btn btn-secondary\" href=\"/tools/physical-security/summary/\"") || index.includes("<a id=\"continue\" class=\"btn btn-primary\" href=\"/tools/physical-security/summary/\"")), "Summary CTA is an anchor route with neutral initial state");
safe("summary-cta-label", (index.includes("Continue → Physical Security Summary") || index.includes("Open Physical Security Summary") || script.includes("Continue → Physical Security Summary")), "Summary CTA label remains");
safe("old-hidden-wrapper-removed", !index.includes("<div id=\"next-step-row\" style=\"display:none;\">"), "old hidden wrapper removed");
safe("old-button-removed", !index.includes("<button id=\"continue\" class=\"btn btn-primary\" type=\"button\">"), "old JS-only button removed");
safe("summary-helper-flex", script.includes("els.continueWrap.style.display = \"flex\";"), "helper uses flex display");
safe("summary-click-save", script.includes("event.preventDefault") && script.includes("saveAssistantScenarioForPipeline();") && script.includes("window.location.href = NEXT_URL;"), "Summary CTA click saves Lens context and navigates");
safe("summary-url", script.includes("const NEXT_URL = \"/tools/physical-security/summary/\";"), "Summary NEXT_URL remains");
safe("invalidate-restores-summary", script.includes("ScopedLabsAnalyzer.invalidate({") && script.includes("showSummaryContinueButton();\n\n    prev = null;"), "invalidate restores Summary CTA after analyzer invalidation");
safe("render-error-keeps-summary", script.includes("function renderError(message)") && script.includes("showSummaryContinueButton();\n    clearDesignAssistant();"), "renderError keeps final Summary CTA available");
safe("cache-bumped", index.includes("./script.js?v=physical-security-lens-summary-cta-state-015"), "Lens script cache bumped");
safe("assistant-ready-remains", index.includes("Lens Design Assistant ready"), "assistant ready card remains");
safe("export-remains", index.includes("id=\"reportMetadataMount\"") && index.includes("id=\"exportReport\""), "collapsible export remains");

console.log("");
console.log("Physical Security Lens Summary CTA Source Audit");
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
