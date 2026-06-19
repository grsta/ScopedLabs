const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function exists(file) {
  return fs.existsSync(file);
}

function listComputeTools() {
  if (!exists("tools/compute")) return [];

  return fs.readdirSync("tools/compute")
    .filter((name) => exists(path.join("tools/compute", name, "index.html")))
    .filter((name) => name !== "summary")
    .sort();
}

const MODULES = [
  ["scopedlabs-tool-shell.js", "Shared tool shell"],
  ["scopedlabs-compute-plan-state.js", "Compute plan state"],
  ["scopedlabs-assistant-export.js", "Assistant export bridge"],
  ["scopedlabs-compute-capacity-visuals.js", "Compute capacity visual"],
  ["scopedlabs-compute-shell-contract.js", "Compute shell contract"],
  ["scopedlabs-local-assistant.js", "Local assistant renderer"],
  ["scopedlabs-compute-assistant-contract.js", "Compute assistant contract"],
  ["scopedlabs-user-tool-notes.js", "User tool notes"]
];

const READY_REQUIRED = new Set(["cpu-sizing"]);
const PARTIAL_NEXT = new Set(["ram-sizing"]);
const SPECIAL_PLANNER = new Set(["workload-planner"]);

function hasAssistantMount(html) {
  return html.includes("data-compute-assistant-card") &&
    html.includes("data-compute-assistant-mount");
}

function hasInternalLedger(html) {
  return html.includes("computeInternalResultsLedger") &&
    html.includes("data-internal-results-ledger");
}

function hasAnalyzerSource(html) {
  return html.includes('id="results"') &&
    html.includes('id="analysis-copy"');
}

function modulePresence(html) {
  const present = [];
  const missing = [];

  for (const item of MODULES) {
    const script = item[0];
    const label = item[1];

    if (html.includes(script)) present.push(label);
    else missing.push(label);
  }

  return { present, missing };
}

function hasModule(html, scriptName) {
  return html.includes(scriptName);
}

let pass = 0;
let watch = 0;
let fail = 0;

function log(kind, id, file, detail) {
  if (kind === "PASS") pass += 1;
  if (kind === "WATCH") watch += 1;
  if (kind === "FAIL") fail += 1;

  console.log("[" + kind + "] " + id);
  console.log("  " + file);
  console.log("  " + detail);
}

console.log("SCOPEDLABS COMPUTE TOOL SHELL CONSUMPTION AUDIT V1\n");

const moduleMap = read("docs/scopedlabs-module-map.md");

log(
  moduleMap.includes("audit-compute-tool-shell-consumption-v1.js") ? "PASS" : "FAIL",
  "MODULE_MAP_RECORDS_COMPUTE_SHELL_CONSUMPTION_MATRIX",
  "docs/scopedlabs-module-map.md",
  "Module map should record this Compute shell consumption matrix and its current READY/PARTIAL/LEGACY classifications."
);

for (const tool of listComputeTools()) {
  const file = "tools/compute/" + tool + "/index.html";
  const html = read(file);
  const presence = modulePresence(html);
  const mount = hasAssistantMount(html);
  const ledger = hasInternalLedger(html);
  const analyzerSource = hasAnalyzerSource(html);

  if (READY_REQUIRED.has(tool)) {
    const ok = presence.missing.length === 0 && mount && ledger && analyzerSource;

    log(
      ok ? "PASS" : "FAIL",
      "COMPUTE_TOOL_READY_BASELINE_" + tool.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
      file,
      ok
        ? "CPU gold baseline has the full Compute tool shell/module stack."
        : "READY baseline regressed. Missing modules: " + presence.missing.join(", ") + "; assistant mount: " + (mount ? "yes" : "no") + "; internal ledger: " + (ledger ? "yes" : "no") + "; analyzer source: " + (analyzerSource ? "yes" : "no")
    );

    continue;
  }

  if (PARTIAL_NEXT.has(tool)) {
    const currentProtected =
      hasModule(html, "scopedlabs-compute-capacity-visuals.js") &&
      hasModule(html, "scopedlabs-compute-shell-contract.js") &&
      analyzerSource;

    log(
      currentProtected ? "WATCH" : "FAIL",
      "COMPUTE_TOOL_PARTIAL_NEXT_" + tool.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
      file,
      currentProtected
        ? "RAM is the next upgrade target. It currently has shared capacity visual + Compute shell contract + analyzer source, but still needs CPU-grade shell, plan state, assistant export, local assistant, Compute assistant contract, user notes, assistant mount, and internal results ledger."
        : "RAM lost required partial-upgrade protections before its full shell upgrade."
    );

    continue;
  }

  if (SPECIAL_PLANNER.has(tool)) {
    const plannerOk =
      hasModule(html, "scopedlabs-tool-shell.js") &&
      hasModule(html, "scopedlabs-compute-plan-state.js") &&
      hasModule(html, "scopedlabs-compute-shell-contract.js");

    log(
      plannerOk ? "WATCH" : "FAIL",
      "COMPUTE_TOOL_SPECIAL_PLANNER_" + tool.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
      file,
      plannerOk
        ? "Workload Planner is a category planner/special page. It should not be judged as a normal calculator, but its planner-shell modules are present."
        : "Workload Planner special-page shell protections are missing."
    );

    continue;
  }

  log(
    "WATCH",
    "COMPUTE_TOOL_LEGACY_PENDING_" + tool.replace(/[^a-z0-9]+/gi, "_").toUpperCase(),
    file,
    "Legacy pending Compute tool. Missing CPU-grade module stack: " + presence.missing.join(", ") + ". Do not one-off patch; upgrade through shared Compute shell/profile lane."
  );
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("WATCH: " + watch);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS_WITH_WATCH"));

process.exit(fail ? 1 : 0);
