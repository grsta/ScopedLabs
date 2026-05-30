const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-final-ui-polish-audit-001";

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
safe("no-breadcrumbs", !index.includes("class=\"crumbs\"") && !index.includes("<span class=\"sep\">/</span>"), "Lens breadcrumbs removed");
safe("page-title-remains", index.includes("<h1 style=\"margin-top: 10px;\">Lens Selection</h1>"), "Lens page title remains");
safe("intro-title-style", index.includes("font-size: 1.24rem; line-height: 1.2; font-weight: 700;") && index.includes("This tool completes the core Physical Security design flow"), "Intro card title matches modern tool card style");
safe("intro-copy-muted-style", index.includes("color: rgba(226,232,240,.74); line-height: 1.55;"), "Intro copy uses modern muted card style");
safe("assistant-visible-in-html", index.includes("<section id=\"lensDesignAssistant\" class=\"lens-design-assistant\">") && !index.includes("<section id=\"lensDesignAssistant\" class=\"lens-design-assistant\" hidden>"), "Lens assistant section is visible before calculation");
safe("assistant-ready-state-html", index.includes("data-lens-assistant-ready-state") && index.includes("Lens Design Assistant ready") && index.includes("Waiting for calculation"), "Lens assistant ready state HTML exists");
safe("assistant-ready-style", index.includes("data-lens-final-ui-polish-001") && index.includes(".lens-assistant-waiting-grid"), "Lens assistant ready state styles exist");
safe("assistant-waiting-script", script.includes("function renderLensDesignAssistantWaitingState()") && script.includes("lensDesignAssistantWaitingHtml()"), "Lens script can render waiting assistant state");
safe("clear-design-assistant-waits", script.includes("function clearDesignAssistant()") && script.includes("renderLensDesignAssistantWaitingState();"), "clearDesignAssistant restores waiting card instead of hiding assistant");
safe("no-old-clear-hide", !script.includes("assistant.hidden = true;\n    assistant.innerHTML = \"\";"), "old hide-empty assistant clear behavior removed");
safe("real-assistant-render-remains", script.includes("ScopedLabsLensDesignAssistant.render(assistant, data);"), "real post-calculation assistant render remains");
safe("summary-route-remains", script.includes("const NEXT_URL = \"/tools/physical-security/summary/\";") && (index.includes("Continue → Physical Security Summary") || index.includes("Open Physical Security Summary") || script.includes("Continue → Physical Security Summary")), "Summary route remains");
safe("export-remains", index.includes("id=\"reportMetadataMount\"") && index.includes("button id=\"exportReport\"") && index.includes("button id=\"saveSnapshot\""), "collapsible export controls remain");
safe("lens-cache", index.includes("./script.js?v=physical-security-lens-summary-cta-state-015"), "Lens cache bumped for final UI polish");

console.log("");
console.log("Physical Security Lens Final UI Polish Audit");
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
