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

const html = read("tools/access-control/fail-safe-fail-secure/index.html");
const script = read("tools/access-control/fail-safe-fail-secure/script.js");
const polish = read("assets/access-control-tool-polish.js");

const scriptVersionMatch = html.match(/\.\/script\.js\?v=(access-control-fail-safe-[^"]+)"/);
const currentFailSafeVersion = scriptVersionMatch ? scriptVersionMatch[1] : "";

check(
  "Fail-Safe page and script use current cache lane",
  Boolean(currentFailSafeVersion) && html.includes("./script.js?v=" + currentFailSafeVersion),
  currentFailSafeVersion || "missing local script cache"
);
check("Reusable Access Control polish asset exists", polish.includes("ScopedLabsAccessControlToolPolish") && polish.includes("access-control-tool-polish-003-reader-result-chip-layout"));
check("Fail-Safe loads reusable polish asset", html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-003-reader-result-chip-layout"));
check("Page opts into Access Control tool polish", html.includes('data-access-control-tool-polish="true"'));
check("Loose Best For sentence removed", !html.includes('class="tool-best-for"') && !html.includes("<strong>Best for:</strong>"));
check("Intro title uses normalized class", html.includes("access-control-tool-card-title") && html.includes("This tool starts the Access Control design flow"));
check("Polish module hides KB and assistant pill rows", polish.includes(".sl-help-card>.pill-row") && polish.includes(".scopedlabs-local-assistant-card>.pill-row"));
check("Polish module adds assistant flow line", polish.includes("access-assistant-flow-line") && polish.includes("Fail-Safe / Fail-Secure"));
check("Polish module enforces square buttons", polish.includes(".btn{border-radius:10px!important;}"));
check("Collapsed report metadata dropdown remains", html.includes('id="reportMetadataMount"') && html.includes("data-report-metadata") && html.includes('data-collapsed="true"'));
check("Report metadata helper remains loaded", html.includes("/assets/scopedlabs-report-metadata.js"));
check("Manual expanded export grid is not present", !html.includes('<div class="export-grid">'));
check("Flow row shell contract remains", html.includes('id="accessControlFlowActions"') && html.includes('id="next-step-row"') && html.includes('id="continue"'));
check("Old continue-wrap is absent", !html.includes('id="continue-wrap"') && !script.includes("continueWrap"));
check("Visible status card remains", html.includes('id="failSafeStatusCard"') && script.includes("renderVisibleDecisionStatus"));
check("Compact status legend remains", html.includes('id="failSafeStatusLegend"') && html.includes("Authority Review"));
check("Export controls remain wired", html.includes('id="exportReport"') && html.includes('id="saveSnapshot"'));
check("No Documentation & Export pill text remains", !html.includes("Documentation & Export"));

console.log("\nAccess Control Fail-Safe final shell polish audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (fail) process.exit(1);
