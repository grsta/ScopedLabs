const fs = require("fs");
const path = require("path");

const root = process.cwd();

const scopePlannerHtmlPath = path.join(root, "tools", "access-control", "scope-planner", "index.html");
const metadataPath = path.join(root, "assets", "scopedlabs-report-metadata.js");
const scopeStatePath = path.join(root, "assets", "access-control-scope-state.js");

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

let failCount = 0;
let watchCount = 0;

function safe(label) {
  console.log("SAFE  " + label);
}

function watch(label) {
  console.log("WATCH " + label);
  watchCount += 1;
}

function fail(label) {
  console.log("FAIL  " + label);
  failCount += 1;
}

console.log("ScopedLabs Access Control Scope Planner metadata card audit - 0613");
console.log("Repo:", root);
console.log("");

const html = read(scopePlannerHtmlPath);
const metadata = read(metadataPath);
const scopeState = read(scopeStatePath);

if (html) safe("Scope Planner HTML exists");
else fail("Scope Planner HTML missing");

if (metadata) safe("shared report metadata helper exists");
else fail("shared report metadata helper missing");

if (scopeState) safe("Access Control scope state exists");
else fail("Access Control scope state missing");

console.log("");
console.log("Scope Planner metadata card");

if (html.includes('data-access-control-scope-report-metadata="true"')) {
  safe("Scope Planner has Access Control scoped metadata section");
} else {
  watch("Scope Planner is missing Access Control scoped metadata section");
}

if (html.includes('id="reportMetadataMount"') && html.includes("data-report-metadata")) {
  safe("Scope Planner has reportMetadataMount with data-report-metadata");
} else {
  watch("Scope Planner metadata mount missing");
}

if (html.includes("reportTitle,projectName,clientName,preparedBy,customNotes")) {
  safe("Scope Planner metadata fields include title/project/client/prepared/notes");
} else {
  watch("Scope Planner metadata field list missing or incomplete");
}

if (html.includes("/assets/scopedlabs-report-metadata.js")) {
  safe("Scope Planner loads scopedlabs-report-metadata.js");
} else {
  watch("Scope Planner does not load scopedlabs-report-metadata.js");
}

if (html.includes("scopedlabs-report-metadata-005-access-control-scope-context")) {
  safe("Scope Planner loads Access Control scope-aware metadata helper version");
} else {
  watch("Scope Planner metadata helper cache-bust is not Access Control scoped version");
}

console.log("");
console.log("Metadata scope ownership");

if (metadata.includes("currentAccessControlScopeContext")) {
  safe("metadata helper has Access Control scope context");
} else {
  fail("metadata helper missing Access Control scope context");
}

if (metadata.includes("#access-scope:")) {
  safe("metadata helper keys Access Control metadata by scope ID");
} else {
  fail("metadata helper does not key metadata by Access Control scope ID");
}

if (metadata.includes("isAccessControlMetadataBlocked")) {
  safe("metadata helper blocks stale metadata when no Access Control scope exists");
} else {
  fail("metadata helper missing no-scope metadata block");
}

if (metadata.includes("scopedlabs:access-control-scope-view-changed") || metadata.includes("scopedlabs:access-control-report-scope-changed")) {
  safe("metadata helper listens for Access Control scope changes");
} else {
  watch("metadata helper may not rehydrate when Access Control scope changes");
}

console.log("");
console.log("Scope delete/reset cleanup");

if (scopeState.includes("access-control-scope-state-005-nonblocking-delete")) {
  safe("scope state is on nonblocking delete version");
} else {
  watch("scope state cache/version is not nonblocking delete version");
}

if (scopeState.includes("removeAccessControlReportMetadataForScope") && scopeState.includes("removeAllAccessControlReportMetadata")) {
  safe("scope state has metadata cleanup helpers");
} else {
  fail("scope state missing scoped metadata cleanup helpers");
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  safe("ACCESS_CONTROL_SCOPE_METADATA_BASELINE_NO_HARD_FAILURES");
} else {
  console.log("FAIL  ACCESS_CONTROL_SCOPE_METADATA_BASELINE_HAS_HARD_FAILURES");
}

if (watchCount > 0) {
  console.log("WATCH ACCESS_CONTROL_SCOPE_PLANNER_METADATA_CARD_REPAIR_NEEDED: " + watchCount);
} else {
  safe("ACCESS_CONTROL_SCOPE_PLANNER_METADATA_CARD_READY");
}

safe("AUDIT_ONLY_NO_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");