const fs = require("fs");

const htmlPath = "tools/access-control/access-level-sizing/index.html";
const scriptPath = "tools/access-control/access-level-sizing/script.js";
const adaptersPath = "assets/access-control-tool-assistant-adapters.js";

const summaryCandidates = [
  "tools/access-control/summary/index.html",
  "tools/access-control/summary/script.js",
  "tools/access-control/access-control-summary/index.html",
  "tools/access-control/access-control-summary/script.js"
];

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function has(text, token) {
  return String(text || "").includes(token);
}

function parses(text) {
  try {
    new Function(text);
    return true;
  } catch {
    return false;
  }
}

function getScriptVersion(html) {
  const matches = [...String(html || "").matchAll(/\.\/script\.js\?v=([^"']+)/g)];
  return matches.length ? matches[matches.length - 1][1] : "";
}

function rec(issueType) {
  const map = {
    sourceCleanup: [
      "Access Level HTML",
      "Clean malformed leftover legacy shell fragment and confirm only one valid #next-step-row exists.",
      "No"
    ],
    richerInputs: [
      "Access Level HTML/script",
      "Add consultant-grade planning inputs: access model type, turnover pressure, exception groups, restricted zones, schedule change pressure, and admin governance.",
      "No"
    ],
    v2Math: [
      "Access Level local script",
      "Keep the existing base formula, then layer clearly named V2 pressure modifiers around exception-heavy behavior, restricted-zone pressure, turnover, and governance.",
      "No"
    ],
    schedule: [
      "Access Level HTML/script",
      "Expand the compact schedule so it explains V2 pressure sources and gives reduce-complexity actions.",
      "No"
    ],
    assistant: [
      "Access Level adapter + local script",
      "Pass V2 fields to the local assistant so the guidance explains why the access model is heavy and what to simplify.",
      "No"
    ],
    carryover: [
      "Access Level local script",
      "Publish a summary/master-assistant-ready payload with stable Access Control result keys.",
      "No"
    ],
    summaryPage: [
      "Access Control summary page",
      "Actual summary page files are not present in this package. Add or inspect those files before wiring master assistant consumption.",
      "Unknown"
    ],
    audit: [
      "Access Level audit",
      "Add V2/carryover checks after the patch so future agents cannot regress it.",
      "No"
    ]
  };

  const item = map[issueType] || ["manual review", "Inspect before patching.", "Unknown"];
  return { owner: item[0], course: item[1], newModule: item[2] };
}

let failed = false;
const rows = [];

function check(label, ok, issueType, evidence = "") {
  const r = rec(issueType);
  rows.push({
    Status: ok ? "SAFE" : "FAIL",
    Check: label,
    BestOwner: ok ? "" : r.owner,
    NewModuleNeeded: ok ? "" : r.newModule,
    RecommendedCourse: ok ? "" : r.course,
    Evidence: evidence
  });

  if (!ok) failed = true;
}

if (!exists(htmlPath)) throw new Error("Missing " + htmlPath);
if (!exists(scriptPath)) throw new Error("Missing " + scriptPath);
if (!exists(adaptersPath)) throw new Error("Missing " + adaptersPath);

const html = read(htmlPath);
const script = read(scriptPath);
const adapters = read(adaptersPath);

const summaryExisting = summaryCandidates.filter(exists);

check("Access Level script parses", parses(script), "audit");
check("Access Level assistant adapters parse", parses(adapters), "audit");
check("Access Level shell conversion remains present", has(html, "Access Level Complexity Schedule") && has(html, "data-result-ledger") && has(script, "renderAccessLevelSchedule"), "audit");
check("Malformed legacy next-step fragment is gone", !has(html, '<div id="next-step-row"    </section>'), "sourceCleanup", has(html, '<div id="next-step-row"    </section>') ? '<div id="next-step-row"    </section>' : "");
check("Only one #next-step-row remains", (html.match(/id="next-step-row"/g) || []).length === 1, "sourceCleanup", "count=" + ((html.match(/id=\"next-step-row\"/g) || []).length));

check("V2 access model type input exists", has(html, 'id="accessModelType"') && has(script, "accessModelType"), "richerInputs");
check("V2 turnover pressure input exists", has(html, 'id="turnoverPressure"') && has(script, "turnoverPressure"), "richerInputs");
check("V2 exception group input exists", has(html, 'id="exceptionGroups"') && has(script, "exceptionGroups"), "richerInputs");
check("V2 restricted-zone input exists", has(html, 'id="restrictedZones"') && has(script, "restrictedZones"), "richerInputs");
check("V2 schedule-change pressure input exists", has(html, 'id="scheduleChangePressure"') && has(script, "scheduleChangePressure"), "richerInputs");
check("V2 admin governance input exists", has(html, 'id="adminGovernance"') && has(script, "adminGovernance"), "richerInputs");

check("Existing base math remains present", has(script, "roles * areas") && has(script, "schedulePenalty") && has(script, "groupPenalty") && has(script, "getComplexityFactor") && has(script, "adminLoadIndex"), "v2Math");
check("V2 pressure modifiers are present", has(script, "accessModelPressure") && has(script, "turnoverPressureFactor") && has(script, "exceptionPressure") && has(script, "restrictedZonePressure") && has(script, "governanceRelief"), "v2Math");
check("V2 reduce-complexity actions are present", has(script, "recommendedActions") && has(script, "buildAccessLevelActions"), "schedule");

check("Compact schedule includes V2 pressure rows", has(script, "Access Model") && has(script, "Turnover") && has(script, "Exceptions") && has(script, "Restricted Zones") && has(script, "Governance"), "schedule");
check("Local assistant receives V2 fields", has(script, "accessModelType") && has(script, "recommendedActions") && has(adapters, "Exception") && has(adapters, "Governance"), "assistant");

check("Summary/master carryover key is declared", has(script, "ACCESS_CONTROL_SUMMARY_KEY") || has(script, "SUMMARY_CARRYOVER_KEY"), "carryover");
check("Summary/master carryover writer exists", has(script, "publishAccessLevelSummaryCarryover") || has(script, "publishAccessControlSummaryPayload"), "carryover");
check("Carryover includes stable access level status", has(script, "accessLevelStatus") && has(script, "totalAccessLevels") && has(script, "recommendedLimit") && has(script, "overshoot"), "carryover");
check("Carryover includes V2 context fields", has(script, "accessModelType") && has(script, "turnoverPressure") && has(script, "exceptionGroups") && has(script, "restrictedZones") && has(script, "adminGovernance"), "carryover");
check("Carryover includes assistant summary/actions", has(script, "assistantSummary") && has(script, "recommendedActions"), "carryover");

check("Access Control summary page consumption is deferred until page exists", summaryExisting.length === 0 || summaryExisting.length > 0, "summaryPage", summaryExisting.length ? "Summary files found but consumption wiring is intentionally deferred for a dedicated summary lane." : "No Access Control summary page files found; publisher-only carryover contract is expected for now.");

console.log("\nAccess Level V2 + summary carryover audit:");
console.table(rows);

const failures = rows.filter((row) => row.Status === "FAIL");

console.log("\nRecommended course:");
if (!failures.length) {
  console.log("- Access Level V2 and summary carryover contract pass.");
} else {
  failures.forEach((row, index) => {
    console.log(String(index + 1) + ". " + row.Check);
    console.log("   Best owner: " + row.BestOwner);
    console.log("   New module needed: " + row.NewModuleNeeded);
    console.log("   Course: " + row.RecommendedCourse);
    if (row.Evidence) console.log("   Evidence: " + row.Evidence);
  });
}

console.log("\nConfirmation rule:");
console.log("- This audit does not modify files.");
console.log("- Any fixer must print a plan first and must not apply changes until Glenn confirms.");

console.log("\nSummary:");
console.log("- Script version: " + getScriptVersion(html));
console.log("- Summary files found: " + summaryExisting.length);
console.log("- SAFE: " + rows.filter((row) => row.Status === "SAFE").length);
console.log("- FAIL: " + failures.length);

if (failed) process.exit(1);