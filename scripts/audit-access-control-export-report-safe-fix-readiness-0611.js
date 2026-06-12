const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools", "access-control");

const contractPath = path.join(root, "docs", "access-control-export-report-system-contract-v1.md");
const rollupAuditPath = path.join(root, "scripts", "audit-access-control-export-report-system-rollup-0611.js");
const evidenceSuitePath = path.join(root, "scripts", "audit-access-control-evidence-suite-0611.js");

const REQUIRED_CONTRACT_MARKERS = [
  "ACCESS_CONTROL_EXPORT_REPORT_SYSTEM_CONTRACT_NEEDED",
  "SHARED_OUTPUT_SHELL_READY_OR_PARTIAL",
  "PREVIEW_PRINT_MODE_SAFE_TO_AUDIT",
  "ROUTE_OVERRIDE_KEEP_REVIEW",
  "EXPORT_STATUS_KEEP_SEPARATE",
  "REPORT_VISUAL_FACTORY_READY_TO_AUDIT",
  "EXPORT_PAYLOAD_PROOF_GAP_REVIEW",
  "SCOPE_PLANNER_SPECIAL_PATH_SKIPPED",
  "NO_IMPLEMENTATION_PATCH_YET",
  "SAFE_FIX",
];

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function has(text, token) {
  return String(text || "").includes(token);
}

function any(text, tokens) {
  return tokens.some((token) => has(text, token));
}

function listTools() {
  if (!fs.existsSync(toolsRoot)) return [];

  return fs.readdirSync(toolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function classifyTool(slug, html, js) {
  if (slug === "scope-planner") {
    return {
      slug,
      bucket: "SKIP_SCOPE_PLANNER_SPECIAL_PATH",
      safeFix: false,
      reasons: ["special path skipped by contract"],
    };
  }

  const joined = html + "\n" + js;

  const evidence = {
    outputShell: has(joined, "access-control-output-shell.js") || has(joined, "ScopedLabsAccessControlOutputShell"),
    assistantExport: has(joined, "scopedlabs-assistant-export.js") || has(joined, "ScopedLabsAssistantExport"),
    exportCore: has(joined, "/assets/export.js"),
    reportMetadata: has(joined, "scopedlabs-report-metadata.js") || has(joined, "reportMetadataMount"),
    planningVisuals: has(joined, "access-control-planning-visuals.js"),

    previewPrint: any(joined, [
      "exportMode",
      "print low-ink",
      "printLowInk",
      "window.print",
      "report-preview",
      "dark popup",
      "preview/print",
    ]),

    routeOverride: any(joined, [
      "route override",
      "routeOverride",
      "openExportReport",
      "handleExportReport",
      "renderExportReport",
      "buildExportReport",
      "buildReportHtml",
    ]),

    visualOwner: any(joined, [
      "data-report-visual-owner",
      "data-report-renderer",
      "data-report-visual-title",
    ]),

    exportStatus: any(joined, [
      "exportStatus",
      "export-status",
      "#exportStatus",
    ]),

    payloadProof: any(joined, [
      "reportPayload",
      "exportPayload",
      "buildReportPayload",
      "getReportPayload",
      "lastCalculation",
      "lastResults",
      "outputs",
      "data-result-ledger",
    ]),

    hiddenLedger: any(joined, [
      "data-result-ledger",
      "ledger-results",
      "carry-forward",
      "ScopedLabsAccessControlScopeState",
      "access-control-scope-state",
    ]),
  };

  const reasons = [];

  if (evidence.routeOverride) reasons.push("route override adapter requires review");
  if (evidence.previewPrint) reasons.push("preview/print path requires visual verification");
  if (evidence.exportStatus) reasons.push("export status control must stay separate");
  if (evidence.hiddenLedger) reasons.push("ledger/carry-forward boundary must stay separate");
  if (!evidence.payloadProof) reasons.push("payload proof gap requires review");
  if (!evidence.visualOwner && !evidence.planningVisuals) reasons.push("report visual ownership needs review");

  const sharedShellPresent = evidence.outputShell || evidence.assistantExport;
  const hasHardReview =
    evidence.routeOverride ||
    evidence.previewPrint ||
    evidence.exportStatus ||
    evidence.hiddenLedger ||
    !evidence.payloadProof ||
    (!evidence.visualOwner && !evidence.planningVisuals);

  if (!sharedShellPresent) {
    return {
      slug,
      bucket: "KEEP_REVIEW_SHARED_SHELL_PROOF_GAP",
      safeFix: false,
      reasons: ["shared output/export shell proof gap", ...reasons],
      evidence,
    };
  }

  if (hasHardReview) {
    return {
      slug,
      bucket: "KEEP_REVIEW_EXPORT_REPORT_OWNERSHIP",
      safeFix: false,
      reasons,
      evidence,
    };
  }

  return {
    slug,
    bucket: "SAFE_FIX_READY_NONE_FOUND",
    safeFix: false,
    reasons: ["tool appears owned, but no specific safe patch target detected"],
    evidence,
  };
}

const contract = readIfExists(contractPath);
const rollupAudit = readIfExists(rollupAuditPath);
const evidenceSuite = readIfExists(evidenceSuitePath);
const tools = listTools();

let failCount = 0;
let safeFixReady = 0;
let keepReview = 0;
let skipCount = 0;
let noFixCount = 0;

console.log("Access Control export/report SAFE_FIX readiness audit - 0611");
console.log("Repo:", root);
console.log("Tools found:", tools.length);
console.log("");

console.log("Contract / audit check");

if (!contract) {
  console.log("FAIL  export/report contract missing");
  failCount += 1;
} else {
  console.log("SAFE  export/report contract present");
}

if (!rollupAudit) {
  console.log("FAIL  export/report rollup audit missing");
  failCount += 1;
} else {
  console.log("SAFE  export/report rollup audit present");
}

if (!evidenceSuite) {
  console.log("FAIL  evidence suite missing");
  failCount += 1;
} else {
  console.log("SAFE  evidence suite present");
}

for (const marker of REQUIRED_CONTRACT_MARKERS) {
  const ok = contract.includes(marker);
  console.log((ok ? "SAFE  " : "FAIL  ") + "contract marker — " + marker);
  if (!ok) failCount += 1;
}

const suiteHasRollup = evidenceSuite.includes("audit-access-control-export-report-system-rollup-0611.js");
console.log((suiteHasRollup ? "SAFE  " : "FAIL  ") + "evidence suite includes export/report rollup audit");
if (!suiteHasRollup) failCount += 1;

console.log("");
console.log("Tool readiness map");

const rows = [];

for (const slug of tools) {
  const html = readIfExists(path.join(toolsRoot, slug, "index.html"));
  const js = readIfExists(path.join(toolsRoot, slug, "script.js"));

  if (!html) {
    rows.push({
      slug,
      bucket: "FAIL_MISSING_INDEX",
      safeFix: false,
      reasons: ["index.html missing"],
      evidence: {},
    });
    failCount += 1;
    continue;
  }

  const row = classifyTool(slug, html, js);
  rows.push(row);
}

for (const row of rows) {
  if (row.bucket.startsWith("SKIP")) skipCount += 1;
  else if (row.bucket.startsWith("KEEP_REVIEW")) keepReview += 1;
  else if (row.bucket.startsWith("SAFE_FIX_READY")) noFixCount += 1;

  if (row.safeFix) safeFixReady += 1;

  const prefix = row.bucket.startsWith("SKIP") ? "SKIP  " : "INFO  ";
  console.log(prefix + row.slug + " — " + row.bucket);

  for (const reason of row.reasons || []) {
    console.log("      " + reason);
  }
}

console.log("");
console.log("SAFE_FIX readiness summary");
console.log(String(safeFixReady).padStart(2, " ") + "  SAFE_FIX_READY");
console.log(String(noFixCount).padStart(2, " ") + "  OWNED_BUT_NO_SAFE_FIX_TARGET");
console.log(String(keepReview).padStart(2, " ") + "  KEEP_REVIEW");
console.log(String(skipCount).padStart(2, " ") + "  SKIP_SPECIAL_PATH");

console.log("");
console.log("Decision summary");

if (safeFixReady > 0) {
  console.log("WATCH EXPORT_REPORT_SAFE_FIX_TARGETS_FOUND — build dry-run fixer before applying changes");
} else {
  console.log("SAFE  EXPORT_REPORT_NO_SAFE_FIX_TARGETS_YET");
}

console.log("SAFE  DRY_RUN_FIXER_NOT_READY_UNTIL_SAFE_FIX_BUCKET_EXISTS");
console.log("SAFE  ROUTE_OVERRIDE_KEEP_REVIEW");
console.log("SAFE  PREVIEW_PRINT_KEEP_REVIEW");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  REPORT_VISUAL_OWNER_KEEP_REVIEW");
console.log("SAFE  EXPORT_PAYLOAD_PROOF_GAP_KEEP_REVIEW");
console.log("SAFE  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log("SAFE  SCOPE_PLANNER_SPECIAL_PATH_SKIPPED");
console.log("SAFE  NO_IMPLEMENTATION_PATCH_YET");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed evidence map");

  for (const row of rows) {
    console.log("");
    console.log(row.slug + " — " + row.bucket);

    for (const [key, value] of Object.entries(row.evidence || {})) {
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