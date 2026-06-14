const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  summary: "tools/access-control/summary/index.html",
  metadata: "assets/scopedlabs-report-metadata.js",
  scopeState: "assets/access-control-scope-state.js",
  reportSummary: "assets/access-control-report-summary.js",
  exportJs: "assets/export.js"
};

function read(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function pass(label) {
  console.log("SAFE  " + label);
}

function watch(label) {
  console.log("WATCH " + label);
}

function fail(label) {
  console.log("FAIL  " + label);
  failCount += 1;
}

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Control report metadata scope contract audit - 0613");
console.log("Repo:", root);
console.log("");

const summary = read(files.summary);
const metadata = read(files.metadata);
const scopeState = read(files.scopeState);
const reportSummary = read(files.reportSummary);
const exportJs = read(files.exportJs);

for (const [label, rel] of Object.entries(files)) {
  if (read(rel)) pass("required source exists: " + rel);
  else fail("missing required source: " + rel);
}

console.log("");
console.log("Current metadata storage contract");

if (metadata.includes('const SHARED_STORAGE_KEY = "scopedlabs:report-metadata:shared:v1"')) {
  watch("shared metadata storage key exists and can hydrate old values");
  watchCount += 1;
} else {
  pass("shared metadata storage key not present");
}

if (metadata.includes('const PAGE_STORAGE_PREFIX = "scopedlabs:report-metadata:page:"')) {
  watch("page metadata storage prefix exists and can hydrate old page values");
  watchCount += 1;
} else {
  pass("page metadata storage prefix not present");
}

if (metadata.includes("function currentAreaContext") && metadata.includes("ScopedLabsPhysicalSecurityAreaState")) {
  pass("Physical Security area-scoped metadata support exists");
} else {
  fail("Physical Security area-scoped metadata baseline missing");
}

if (metadata.includes("ScopedLabsAccessControlScopeState") || metadata.includes("currentAccessControlScopeContext")) {
  pass("Access Control scope-aware metadata support exists");
} else {
  watch("Access Control scope-aware metadata support missing");
  watchCount += 1;
}

if (metadata.includes("scopedValue || legacyValue || sharedValue")) {
  watch("metadata hydration falls back from scoped to legacy/shared values");
  watchCount += 1;
} else {
  pass("metadata hydration does not use scoped/legacy/shared fallback chain");
}

if (metadata.includes("saveStored(SHARED_STORAGE_KEY, sharedData)")) {
  watch("metadata saves report fields into shared global metadata");
  watchCount += 1;
} else {
  pass("metadata does not save into shared global metadata");
}

console.log("");
console.log("Summary page metadata wiring");

if (summary.includes('id="reportTitle"') && summary.includes('id="projectName"') && summary.includes('id="clientName"') && summary.includes('id="preparedBy"')) {
  pass("Summary page has manual report metadata fields");
} else {
  fail("Summary page metadata fields missing");
}

if (summary.includes("/assets/scopedlabs-report-metadata.js")) {
  pass("Summary page loads shared report metadata helper");
} else {
  fail("Summary page does not load shared report metadata helper");
}

if (summary.includes("scopedlabs-report-metadata-004-area-context-notes")) {
  watch("Summary page cache-bust still points to area-context metadata helper");
  watchCount += 1;
} else {
  pass("Summary page metadata cache-bust no longer area-context-only");
}

console.log("");
console.log("Access Control scope-state contract");

if (scopeState.includes('const STORAGE_KEY = "scopedlabs:pipeline:access-control:scopes"')) {
  pass("Access Control scope ledger key exists");
} else {
  fail("Access Control scope ledger key missing");
}

if (scopeState.includes("activeScopeId") && scopeState.includes("scopes")) {
  pass("Access Control scope ledger has activeScopeId and scopes");
} else {
  fail("Access Control scope ledger shape missing");
}

if (scopeState.includes("function clearAll()") && scopeState.includes("sessionStorage.removeItem(STORAGE_KEY)") && scopeState.includes("localStorage.removeItem(STORAGE_KEY)")) {
  pass("Access Control scope clearAll removes scope ledger");
} else {
  fail("Access Control scope clearAll does not remove scope ledger");
}

if (scopeState.includes("scopedlabs:report-metadata:page:") || scopeState.includes("scopedlabs:report-metadata:shared:v1")) {
  watch("Access Control scope clear can remove shared report metadata keys");
  watchCount += 1;
} else {
  watch("Access Control scope clear does not remove shared/page report metadata keys");
  watchCount += 1;
}

console.log("");
console.log("Report/export relationship");

if (exportJs.includes("function getMeta()") && exportJs.includes("reportTitleSelector") && exportJs.includes("projectNameSelector")) {
  pass("Export engine reads metadata from visible DOM fields");
} else {
  fail("Export engine metadata read path missing");
}

if (reportSummary.includes("accessControlReportScopeSelect") || reportSummary.includes("Report scope")) {
  pass("Report summary has report scope selector path");
} else {
  watch("Report summary does not expose report scope selector path");
  watchCount += 1;
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  pass("ACCESS_CONTROL_METADATA_AUDIT_NO_HARD_FAILURES");
} else {
  console.log("FAIL  ACCESS_CONTROL_METADATA_AUDIT_HAS_HARD_FAILURES");
}

if (watchCount > 0) {
  console.log("WATCH ACCESS_CONTROL_METADATA_SCOPE_REPAIR_NEEDED: " + watchCount);
} else {
  pass("ACCESS_CONTROL_METADATA_SCOPE_ALREADY_CLEAN");
}

pass("AUDIT_ONLY_NO_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");