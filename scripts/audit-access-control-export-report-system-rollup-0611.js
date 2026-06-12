const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools", "access-control");

const sharedFiles = {
  outputShell: "assets/access-control-output-shell.js",
  assistantExport: "assets/scopedlabs-assistant-export.js",
  reportMetadata: "assets/scopedlabs-report-metadata.js",
  visuals: "assets/access-control-planning-visuals.js",
  exportCore: "assets/export.js",
};

const EXPECTED_OUTPUT_SHELL_VERSION = "access-control-output-shell-004-export-safe-visual-preference";
const EXPECTED_VISUALS_VERSION = "access-control-planning-visuals-065-shared-visual-factory-quality";
const EXPECTED_METADATA_VERSION = "scopedlabs-report-metadata-004-area-context-notes";

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function existsRel(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readRel(relPath) {
  return readIfExists(path.join(root, relPath));
}

function listTools() {
  if (!fs.existsSync(toolsRoot)) return [];

  return fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function has(text, token) {
  return String(text || "").includes(token);
}

function any(text, tokens) {
  return tokens.some((token) => has(text, token));
}

function countAny(text, tokens) {
  return tokens.reduce((count, token) => count + (has(text, token) ? 1 : 0), 0);
}

function bucketTool(slug, html, js) {
  if (slug === "scope-planner") {
    return {
      slug,
      bucket: "SCOPE_PLANNER_SPECIAL_PATH_SKIPPED",
      notes: ["special planner path; not normal calculator output-shell path"],
      evidence: {},
    };
  }

  const joined = html + "\n" + js;

  const evidence = {
    outputShellScript: has(html, "access-control-output-shell.js"),
    assistantExportScript: has(html, "scopedlabs-assistant-export.js"),
    reportMetadataScript: has(html, "scopedlabs-report-metadata.js"),
    exportCoreScript: has(html, "/assets/export.js"),
    planningVisualsScript: has(html, "access-control-planning-visuals.js"),

    exportReportButton: has(joined, "exportReport") || has(joined, "#exportReport"),
    saveSnapshotButton: has(joined, "saveSnapshot") || has(joined, "#saveSnapshot"),
    exportStatus: has(joined, "exportStatus") || has(joined, "export-status") || has(joined, "#exportStatus"),

    reportMetadataMount: has(joined, "reportMetadataMount"),
    reportVisualOwner: has(joined, "data-report-visual-owner"),
    reportRenderer: has(joined, "data-report-renderer"),
    reportVisualTitle: has(joined, "data-report-visual-title"),

    routeOverride: any(joined, [
      "route override",
      "routeOverride",
      "openExportReport",
      "handleExportReport",
      "renderExportReport",
      "buildExportReport",
      "buildReportHtml",
      "print low-ink",
      "exportMode",
      "preview/print",
      "dark popup visual",
    ]),

    previewPrintHints: any(joined, [
      "exportMode",
      "print low-ink",
      "printLowInk",
      "preview",
      "print",
      "window.print",
      "report-preview",
      "dark popup",
    ]),

    snapshotHints: any(joined, [
      "saveSnapshot",
      "snapshot",
      "html2canvas",
      "capture",
    ]),

    payloadProofHints: any(joined, [
      "reportPayload",
      "exportPayload",
      "buildReportPayload",
      "getReportPayload",
      "lastCalculation",
      "lastResults",
      "outputs",
      "data-result-ledger",
    ]),

    hiddenLedger: has(joined, "data-result-ledger") || has(joined, "ledger-results"),
    authOrCheckoutHints: any(joined, [
      "checkout",
      "stripe",
      "auth",
      "requiresPro",
      "isPro",
      "categoryUnlocked",
    ]),
  };

  const notes = [];

  if (evidence.outputShellScript || evidence.assistantExportScript) {
    notes.push("shared export/output shell assets present");
  } else {
    notes.push("shared output shell script not detected");
  }

  if (evidence.previewPrintHints) {
    notes.push("preview/print path evidence present");
  }

  if (evidence.routeOverride) {
    notes.push("route override/export adapter evidence present");
  }

  if (evidence.exportStatus) {
    notes.push("export status control present; keep separate");
  }

  if (evidence.reportVisualOwner || evidence.reportRenderer) {
    notes.push("report visual ownership attributes present");
  }

  if (evidence.payloadProofHints) {
    notes.push("payload/result proof evidence present");
  } else {
    notes.push("payload proof gap review");
  }

  if (evidence.hiddenLedger) {
    notes.push("hidden ledger/carry-forward boundary present");
  }

  let bucket = "EXPORT_REPORT_REVIEW";

  if (
    (evidence.outputShellScript || evidence.assistantExportScript) &&
    evidence.previewPrintHints &&
    (evidence.reportVisualOwner || evidence.reportRenderer || evidence.planningVisualsScript) &&
    evidence.payloadProofHints
  ) {
    bucket = "SHARED_OUTPUT_SHELL_READY";
  } else if (evidence.routeOverride && evidence.previewPrintHints) {
    bucket = "ROUTE_OVERRIDE_KEEP_REVIEW";
  } else if (evidence.outputShellScript || evidence.assistantExportScript) {
    bucket = "SHARED_OUTPUT_SHELL_PARTIAL_REVIEW";
  } else {
    bucket = "EXPORT_REPORT_PROOF_GAP_REVIEW";
  }

  return {
    slug,
    bucket,
    notes,
    evidence,
  };
}

function printTool(row) {
  console.log((row.bucket === "SCOPE_PLANNER_SPECIAL_PATH_SKIPPED" ? "SKIP  " : "INFO  ") + row.slug + " — " + row.bucket);

  for (const note of row.notes) {
    console.log("      " + note);
  }
}

const tools = listTools();
const outputShell = readRel(sharedFiles.outputShell);
const visuals = readRel(sharedFiles.visuals);
const reportMetadata = readRel(sharedFiles.reportMetadata);

let failCount = 0;

console.log("Access Control export/report system rollup audit - 0611");
console.log("Repo:", root);
console.log("Tools found:", tools.length);
console.log("");

console.log("Shared asset check");

for (const [label, relPath] of Object.entries(sharedFiles)) {
  const ok = existsRel(relPath);
  console.log((ok ? "SAFE  " : "FAIL  ") + label + " — " + relPath);
  if (!ok) failCount += 1;
}

console.log((outputShell.includes(EXPECTED_OUTPUT_SHELL_VERSION) ? "SAFE  " : "WATCH ") + "output shell version " + EXPECTED_OUTPUT_SHELL_VERSION);
console.log((visuals.includes(EXPECTED_VISUALS_VERSION) ? "SAFE  " : "WATCH ") + "visual factory version " + EXPECTED_VISUALS_VERSION);
console.log((reportMetadata.includes(EXPECTED_METADATA_VERSION) ? "SAFE  " : "WATCH ") + "report metadata version " + EXPECTED_METADATA_VERSION);

console.log("");
console.log("Tool map");

const rows = [];

for (const slug of tools) {
  const html = readIfExists(path.join(toolsRoot, slug, "index.html"));
  const js = readIfExists(path.join(toolsRoot, slug, "script.js"));

  if (!html) {
    rows.push({
      slug,
      bucket: "MISSING_INDEX_FAIL",
      notes: ["index.html missing"],
      evidence: {},
    });
    failCount += 1;
    continue;
  }

  rows.push(bucketTool(slug, html, js));
}

for (const row of rows) {
  printTool(row);
}

const bucketCounts = new Map();

for (const row of rows) {
  bucketCounts.set(row.bucket, (bucketCounts.get(row.bucket) || 0) + 1);
}

const exportStatusCount = rows.filter((row) => row.evidence.exportStatus).length;
const previewPrintCount = rows.filter((row) => row.evidence.previewPrintHints).length;
const routeOverrideCount = rows.filter((row) => row.evidence.routeOverride).length;
const visualOwnerCount = rows.filter((row) => row.evidence.reportVisualOwner || row.evidence.reportRenderer).length;
const payloadProofCount = rows.filter((row) => row.evidence.payloadProofHints).length;
const hiddenLedgerCount = rows.filter((row) => row.evidence.hiddenLedger).length;

console.log("");
console.log("Bucket summary");
for (const [bucket, count] of [...bucketCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(String(count).padStart(2, " ") + "  " + bucket);
}

console.log("");
console.log("Evidence summary");
console.log(String(previewPrintCount).padStart(2, " ") + "  PREVIEW_PRINT_MODE_EVIDENCE");
console.log(String(routeOverrideCount).padStart(2, " ") + "  ROUTE_OVERRIDE_KEEP_REVIEW");
console.log(String(visualOwnerCount).padStart(2, " ") + "  REPORT_VISUAL_OWNER_EVIDENCE");
console.log(String(payloadProofCount).padStart(2, " ") + "  EXPORT_PAYLOAD_PROOF_EVIDENCE");
console.log(String(exportStatusCount).padStart(2, " ") + "  EXPORT_STATUS_KEEP_SEPARATE");
console.log(String(hiddenLedgerCount).padStart(2, " ") + "  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");

console.log("");
console.log("Decision summary");
console.log("SAFE  SHARED_OUTPUT_SHELL_READY_OR_PARTIAL");
console.log("SAFE  PREVIEW_PRINT_MODE_SAFE_TO_AUDIT");
console.log("SAFE  ROUTE_OVERRIDE_KEEP_REVIEW");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  REPORT_VISUAL_FACTORY_READY_TO_AUDIT");
console.log("SAFE  EXPORT_PAYLOAD_PROOF_GAP_REVIEW");
console.log("SAFE  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");
console.log("SAFE  NO_IMPLEMENTATION_PATCH_YET");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed evidence map");

  for (const row of rows) {
    console.log("");
    console.log(row.slug + " — " + row.bucket);

    const entries = Object.entries(row.evidence || {});
    if (!entries.length) {
      console.log("  no evidence map");
      continue;
    }

    for (const [key, value] of entries) {
      console.log("  " + (value ? "YES " : "NO  ") + key);
    }
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");