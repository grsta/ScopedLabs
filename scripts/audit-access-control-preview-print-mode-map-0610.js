const fs = require("fs");
const path = require("path");

const root = process.cwd();
const utf8 = "utf8";

const tools = [
  "scope-planner",
  "door-count-planner",
  "door-cable-length",
  "panel-capacity",
  "access-level-sizing",
  "reader-type-selector",
  "credential-format",
  "lock-power-budget",
  "fail-safe-fail-secure",
  "elevator-reader-count",
  "anti-passback-zones",
  "special-locking-scope"
];

function rel(...parts) {
  return path.join(...parts).replace(/\\/g, "/");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  const abs = path.join(root, file);
  return fs.existsSync(abs) ? fs.readFileSync(abs, utf8) : "";
}

function statusLine(status, slug, check, detail = "") {
  const note = detail ? " :: " + detail : "";
  console.log(`${status.padEnd(5)} ${slug} — ${check}${note}`);
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function usesDarkPreviewCallback(script) {
  return (
    /getChartImage\(\)\s*\{[\s\S]*get[A-Za-z0-9]*PlanningVisualImage\(\)/.test(script) ||
    /getExportChartImage\(\)\s*\{[\s\S]*get[A-Za-z0-9]*PlanningVisualImage\(\)/.test(script) ||
    /chartImage:\s*get[A-Za-z0-9]*PlanningVisualImage\(\)/.test(script)
  );
}

function usesPrintSafeCallbackForPopup(script) {
  return (
    /getChartImage\(\)\s*\{[\s\S]*ExportImage\(\)/.test(script) ||
    /getExportChartImage\(\)\s*\{[\s\S]*ExportImage\(\)/.test(script) ||
    /chartImage:\s*get[A-Za-z0-9]*ExportImage\(\)/.test(script) ||
    /exportMode:\s*true/.test(script)
  );
}

function hasVisualCallback(script) {
  return (
    /function\s+getChartImage\s*\(/.test(script) ||
    /function\s+getExportChartImage\s*\(/.test(script) ||
    /getChartImage\(\)/.test(script) ||
    /getExportChartImage\(\)/.test(script) ||
    /chartImage:/.test(script)
  );
}

function hasOutputShell(html, script) {
  return html.includes("access-control-output-shell") || script.includes("AccessControlOutputShell");
}

function hasPrintLowInk(html, script) {
  return (
    html.includes('"printLowInkChart": true') ||
    script.includes("chart-wrap--print-low-ink") ||
    script.includes("filter:invert(1) hue-rotate(180deg)")
  );
}

function hasDarkWrapper(html, script, exportJs) {
  return (
    script.includes("background:#07110b") ||
    script.includes("background: #07110b") ||
    html.includes("background:#07110b") ||
    exportJs.includes(".chart-wrap--print-low-ink") && exportJs.includes("background:#07110b")
  );
}

function hasRouteOverridePattern(script) {
  return (
    script.includes("routeConflictExportBound") ||
    script.includes("_bindRouteExportOverride") ||
    script.includes("access-control-route-conflict-export-override") ||
    script.includes("LocalReportBound") ||
    script.includes("local export override") ||
    script.includes("openReportWindow(payload)") ||
    script.includes("openReportWindow(payload);")
  );
}

function hasSharedVisualBridge(html, script) {
  return (
    html.includes("access-control-planning-visuals") ||
    script.includes("AccessControlPlanningVisuals") ||
    script.includes("buildDoorCountSvg") ||
    script.includes("buildDoorCable") ||
    script.includes("buildLockPower") ||
    script.includes("buildReaderTypeExportSvg") ||
    script.includes("buildReaderTypeDecisionSvg") ||
    script.includes("buildFailSafe") ||
    script.includes("buildCredential") ||
    script.includes("buildAntiPassback") ||
    script.includes("buildSpecialLocking")
  );
}

const exportJs = read("assets/export.js");
const outputShell = read("assets/access-control-output-shell.js");
const visualJs = read("assets/access-control-planning-visuals.js");

console.log("\nAccess Control preview / print mode map audit\n");

statusLine(exists("assets/export.js") ? "SAFE" : "FAIL", "shared", "shared export engine exists");
statusLine(outputShell ? "SAFE" : "FAIL", "shared", "Access Control output shell exists");
statusLine(visualJs ? "SAFE" : "FAIL", "shared", "Access Control planning visual factory exists");
statusLine(
  exportJs.includes("chart-wrap--print-low-ink") && exportJs.includes("background:#07110b") ? "SAFE" : "WATCH",
  "shared",
  "shared export supports dark preview wrapper with print low-ink mode"
);

const rows = [];
let safe = 0;
let watch = 0;
let skip = 0;
let fail = 0;

for (const slug of tools) {
  const page = rel("tools", "access-control", slug, "index.html");
  const scriptFile = rel("tools", "access-control", slug, "script.js");
  const html = read(page);
  const script = read(scriptFile);

  if (!html || !script) {
    rows.push({ slug, status: "FAIL", reason: "missing page or script" });
    fail += 1;
    continue;
  }

  if (slug === "scope-planner") {
    rows.push({ slug, status: "SKIP", reason: "dedicated print/copy summary path; not calculator output-shell based" });
    skip += 1;
    continue;
  }

  const outputShellLoaded = hasOutputShell(html, script);
  const visualCallback = hasVisualCallback(script);
  const sharedBridge = hasSharedVisualBridge(html, script);
  const darkPreview = usesDarkPreviewCallback(script);
  const printSafePopup = usesPrintSafeCallbackForPopup(script);
  const lowInk = hasPrintLowInk(html, script);
  const darkWrap = hasDarkWrapper(html, script, exportJs);
  const routeOverride = hasRouteOverridePattern(script);
  const provenPreviewPrintPath = routeOverride || (lowInk && darkWrap && sharedBridge && visualCallback);

  let status = "SAFE";
  const issues = [];

  if (!outputShellLoaded) issues.push("missing output shell");
  if (!visualCallback) issues.push("missing export visual callback");
  if (!sharedBridge) issues.push("no obvious shared visual bridge");
  if (printSafePopup && !darkPreview && !provenPreviewPrintPath) issues.push("popup may be using print-safe/toned visual too early");
  if (darkPreview && !lowInk) issues.push("dark preview found but print low-ink mode not enabled");
  if (lowInk && !darkWrap) issues.push("low-ink mode found but dark preview wrapper not obvious");

  if (issues.length) status = "WATCH";

  rows.push({
    slug,
    status,
    reason: issues.length
      ? issues.join("; ")
      : routeOverride
        ? "route override uses dark popup visual with print low-ink mode"
        : "matches or appears compatible with Door Count preview/print pattern"
  });

  if (status === "SAFE") safe += 1;
  else watch += 1;
}

console.log("\nTool map\n");

for (const row of rows) {
  statusLine(row.status, row.slug, "preview/print mode", row.reason);
}

console.log(`\nSummary: ${safe} SAFE / ${watch} WATCH / ${skip} SKIP / ${fail} FAIL`);

const next = rows.filter((row) => row.status === "WATCH").map((row) => row.slug);

if (next.length) {
  console.log("\nRecommended next inspection order:");
  next.forEach((slug, index) => console.log(`${index + 1}. ${slug}`));
} else {
  console.log("\nNo WATCH tools found by this mapper.");
}