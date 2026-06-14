const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  scopePlannerHtml: "tools/access-control/scope-planner/index.html",
  scopePlannerJs: "tools/access-control/scope-planner/script.js",
  summaryHtml: "tools/access-control/summary/index.html",
  summaryJs: "tools/access-control/summary/script.js",
  metadata: "assets/scopedlabs-report-metadata.js",
  scopeState: "assets/access-control-scope-state.js",
  guidanceMemory: "assets/access-control-guidance-memory.js",
  reportSummary: "assets/access-control-report-summary.js"
};

const toolDirs = [
  "scope-planner",
  "door-count-planner",
  "reader-type-selector",
  "credential-format",
  "access-level-sizing",
  "panel-capacity",
  "lock-power-budget",
  "door-cable-length",
  "elevator-reader-count",
  "fail-safe-fail-secure",
  "special-locking-scope",
  "anti-passback-zones"
];

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function lineHits(text, patterns) {
  const lines = String(text || "").split(/\r?\n/);
  const hits = [];

  lines.forEach((line, index) => {
    if (patterns.some((pattern) => line.includes(pattern))) {
      hits.push(String(index + 1).padStart(4, " ") + ": " + line.trim());
    }
  });

  return hits;
}

function pass(label) {
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

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Control scope/metadata/notes breakage audit - 0613");
console.log("Repo:", root);
console.log("");

for (const [label, rel] of Object.entries(files)) {
  if (exists(rel)) pass("required source exists: " + rel);
  else fail("missing required source: " + rel);
}

const scopePlannerHtml = read(files.scopePlannerHtml);
const scopePlannerJs = read(files.scopePlannerJs);
const summaryHtml = read(files.summaryHtml);
const metadata = read(files.metadata);
const scopeState = read(files.scopeState);

console.log("");
console.log("Scope Planner delete/reset map");

const deleteHits = lineHits(scopePlannerJs, ["delete", "removeScope", "clearAll", "reset", "ScopeState"]);
if (deleteHits.length) {
  console.log(deleteHits.join("\n"));
} else {
  fail("no delete/remove/reset hits found in Scope Planner script");
}

if (scopeState.includes("function removeScope") && scopeState.includes("removeAccessControlReportMetadataForScope(scopeId);")) {
  pass("scope state removeScope calls scoped metadata cleanup");
} else {
  watch("scope state removeScope does not clearly call scoped metadata cleanup");
}

if (scopeState.includes("function clearAll") && scopeState.includes("removeAllAccessControlReportMetadata();")) {
  pass("scope state clearAll calls all-metadata cleanup");
} else {
  watch("scope state clearAll does not clearly call all-metadata cleanup");
}

if (scopeState.includes("removeStoredKeysMatching") && scopeState.includes("[sessionStorage, localStorage]")) {
  pass("scope metadata cleanup helper exists");
} else {
  watch("scope metadata cleanup helper missing or incomplete");
}

console.log("");
console.log("Report metadata mount map");

if (scopePlannerHtml.includes("reportMetadataMount") || scopePlannerHtml.includes("data-report-metadata")) {
  pass("Scope Planner has report metadata mount/card markup");
} else {
  watch("Scope Planner does not have report metadata mount/card markup");
}

if (summaryHtml.includes("reportMetadataMount") || summaryHtml.includes("data-report-metadata")) {
  pass("Summary has report metadata mount/card markup");
} else {
  watch("Summary does not have report metadata mount/card markup");
}

if (scopePlannerHtml.includes("/assets/scopedlabs-report-metadata.js")) {
  pass("Scope Planner loads scopedlabs-report-metadata.js");
} else {
  watch("Scope Planner does not load scopedlabs-report-metadata.js");
}

if (summaryHtml.includes("/assets/scopedlabs-report-metadata.js")) {
  pass("Summary loads scopedlabs-report-metadata.js");
} else {
  watch("Summary does not load scopedlabs-report-metadata.js");
}

console.log("");
console.log("Metadata helper Access Control scoping map");

if (metadata.includes("currentAccessControlScopeContext")) pass("metadata helper has Access Control scope context");
else watch("metadata helper missing Access Control scope context");

if (metadata.includes("isAccessControlMetadataBlocked")) pass("metadata helper has no-scope metadata block path");
else watch("metadata helper missing no-scope metadata block path");

if (metadata.includes("#access-scope:")) pass("metadata helper keys metadata by access scope");
else watch("metadata helper does not key metadata by access scope");

if (metadata.includes("if (!accessControlPage)") && metadata.includes("saveStored(SHARED_STORAGE_KEY")) {
  pass("metadata helper appears to prevent Access Control shared metadata writes");
} else {
  watch("metadata helper shared metadata save gate unclear");
}

console.log("");
console.log("Tool notes map");

for (const slug of toolDirs) {
  const htmlRel = "tools/access-control/" + slug + "/index.html";
  const jsRel = "tools/access-control/" + slug + "/script.js";
  const html = read(htmlRel);
  const js = read(jsRel);
  const combined = html + "\n" + js;

  const hasNotes =
    /tool notes|report notes|custom notes|notes/i.test(combined) &&
    /textarea|customNotes|reportNotes|toolNotes|note/i.test(combined);

  const hasScopeBinding =
    /scopeId|activeScopeId|ScopedLabsAccessControlScopeState|accessControlScope/i.test(combined);

  if (hasNotes && hasScopeBinding) {
    pass(slug + " has notes signal and scope binding signal");
  } else if (hasNotes) {
    watch(slug + " has notes signal but no clear scope binding");
  } else {
    watch(slug + " does not show a scoped tool-notes section");
  }
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  pass("AUDIT_NO_HARD_FILE_FAILURES");
} else {
  console.log("FAIL  HARD_FILE_FAILURES: " + failCount);
}

if (watchCount > 0) {
  console.log("WATCH ACCESS_CONTROL_SCOPE_METADATA_NOTES_REPAIR_NEEDED: " + watchCount);
} else {
  pass("ACCESS_CONTROL_SCOPE_METADATA_NOTES_ALREADY_CLEAN");
}

pass("AUDIT_ONLY_NO_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");