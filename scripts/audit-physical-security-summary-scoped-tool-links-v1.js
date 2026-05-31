const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-scoped-tool-links-audit-004-action-next-steps";
const REPORT_VERSION = "physical-security-report-summary-021-action-next-steps";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const index = read("tools/physical-security/summary/index.html");
const report = read("assets/physical-security-report-summary.js");
const areaState = read("assets/physical-security-area-state.js");

safe("summary-index-exists", exists("tools/physical-security/summary/index.html"), "Summary index exists");
safe("report-summary-exists", exists("assets/physical-security-report-summary.js"), "report summary asset exists");
safe("area-state-exists", exists("assets/physical-security-area-state.js"), "area state asset exists");
safe("report-cache-bumped", index.includes("/assets/physical-security-report-summary.js?v=" + REPORT_VERSION), "report summary cache bumped");
safe("report-version-bumped", report.includes('const VERSION = "' + REPORT_VERSION + '";'), "report summary version bumped");
safe("link-style", index.includes("physical-security-summary-scoped-tool-links-014") && index.includes(".physical-security-scoped-tool-link"), "scoped tool link styles exist");
safe("tool-urls", report.includes('url: "/tools/physical-security/scene-illumination/"') && report.includes('url: "/tools/physical-security/lens-selection/"') && report.includes('url: "/tools/physical-security/face-recognition-range/"') && report.includes('url: "/tools/physical-security/license-plate-range/"'), "tool definitions include target URLs");
safe("scoped-row-data", report.includes("toolUrl: row.url ||") && report.includes("areaId: area && area.id ? String(area.id)"), "scoped rows carry area ID and tool URL");
safe("link-renderer", report.includes("function renderScopedToolLink(row)") && report.includes("data-sl-physical-security-scoped-tool-link") && report.includes("data-area-id") && report.includes("data-tool-url"), "Watch/Risk tool cell link renderer exists");
safe("action-rows-linked", report.includes("function buildScopedActionRows()") && report.includes("renderScopedToolLink(row)") && report.includes("scopedRequiredAction(row)") && report.includes("scopedActionNextStep(row)"), "Watch/Risk action rows use linked tool name and action next-step helpers");
safe("detail-table-allows-tool-link", report.includes("index === 1") && report.includes("data-sl-physical-security-scoped-tool-link") && report.includes("index === 2"), "detail table allows tool link HTML and status HTML only");
safe("click-handler", report.includes("function bindScopedToolLinks()") && report.includes("event.target.closest(\"[data-sl-physical-security-scoped-tool-link]\")") && report.includes("window.location.href = href;"), "click handler routes to scoped tool");
safe("active-area-setter", report.includes("function setActiveAreaFromScopedToolLink(areaId)") && report.includes("api.setActiveArea(id)") && report.includes("api.writeLedger(ledger)"), "click handler sets active area before routing");
safe("init-binds-links", report.includes("bindScopedToolLinks();") && report.includes("refreshExportSection();") && report.includes("attachExportRefresh();"), "link binding runs during report init");
safe("area-state-supports-active", areaState.includes("setActiveArea") && areaState.includes("writeLedger"), "area-state API supports active area updates");
safe("scoped-counts-remain", report.includes("function buildScopedReportCounts()") && report.includes("Healthy / Watch / Risk / Pending"), "scoped counts remain");
safe("priority-interpretation-remains", report.includes("Top priority interpretation") && report.includes("Category master note"), "priority interpretation remains");

console.log("");
console.log("Physical Security Summary Scoped Tool Links Audit");
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
