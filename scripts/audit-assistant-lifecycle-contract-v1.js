const fs = require("fs");
const path = require("path");

const root = process.cwd();

const CATEGORY_CONFIG = {
  compute: {
    dir: path.join(root, "tools", "compute"),
    assistantContract: path.join(root, "assets", "scopedlabs-compute-assistant-contract.js"),
    expectedContractTokens: [
      "renderToolAssistant",
      "buildToolAssistantModel",
      "ScopedLabsLocalAssistant"
    ],
    toolScripts: ["script.js"]
  },
  "access-control": {
    dir: path.join(root, "tools", "access-control"),
    assistantContract: null,
    expectedContractTokens: [],
    toolScripts: ["script.js"]
  },
  "physical-security": {
    dir: path.join(root, "tools", "physical-security"),
    assistantContract: null,
    expectedContractTokens: [],
    toolScripts: ["script.js"]
  }
};

const MODERNIZED_ASSISTANT_LIFECYCLE_TOOLS = new Set([
  "compute/cpu-sizing"
]);

let pass = 0;
let fail = 0;
let watch = 0;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function result(kind, label, detail) {
  if (typeof kind === "boolean") kind = kind ? "PASS" : "FAIL";
  kind = String(kind || "WATCH").toUpperCase();

  if (kind === "PASS") pass++;
  if (kind === "FAIL") fail++;
  if (kind === "WATCH") watch++;

  console.log(kind.padEnd(6), label);
  if (detail) console.log("       " + detail);
}

function listToolIndexes(dir) {
  if (!fs.existsSync(dir)) return [];

  const found = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "index.html") {
        found.push(full);
      }
    }
  }

  walk(dir);
  return found.sort();
}

function nearestScript(indexFile, scriptNames) {
  const dir = path.dirname(indexFile);
  for (const name of scriptNames) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function toolKey(category, indexFile) {
  return category + "/" + path.basename(path.dirname(indexFile));
}

function isModernizedTool(category, indexFile) {
  return MODERNIZED_ASSISTANT_LIFECYCLE_TOOLS.has(toolKey(category, indexFile));
}

function lifecycleKind(category, indexFile, preferredKind) {
  if (preferredKind === "PASS") return "PASS";
  if (isModernizedTool(category, indexFile)) return preferredKind;
  return "WATCH";
}

function indexOf(text, token) {
  const i = text.indexOf(token);
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}

function auditContract(category, config) {
  console.log("");
  console.log("========================================================================");
  console.log("CATEGORY CONTRACT:", category);
  console.log("========================================================================");

  if (!config.assistantContract) {
    result("WATCH", category + " has no configured category assistant contract", "Expected until category lifecycle factory is created.");
    return;
  }

  const text = read(config.assistantContract);

  if (!text) {
    result("FAIL", category + " assistant contract file missing", rel(config.assistantContract));
    return;
  }

  result("PASS", category + " assistant contract exists", rel(config.assistantContract));

  for (const token of config.expectedContractTokens) {
    result(text.includes(token) ? "PASS" : "FAIL", category + " contract token: " + token);
  }

  result(
    text.includes("window.setTimeout(mountCpuSizing, 120)") ? "FAIL" : "PASS",
    category + " contract does not stale auto-mount assistant on page load"
  );

  result(
    text.includes("ScopedLabsLocalAssistant") ? "PASS" : "WATCH",
    category + " contract uses shared local assistant renderer"
  );
}

function auditTool(category, indexFile, config) {
  const html = read(indexFile);
  const scriptFile = nearestScript(indexFile, config.toolScripts);
  const js = scriptFile ? read(scriptFile) : "";
  const slug = path.basename(path.dirname(indexFile));

  console.log("");
  console.log("---- " + category + "/" + slug + " ----");
  console.log(rel(indexFile));

  const hasResults = html.includes('id="results"');
  const hasAnalysis = html.includes('id="analysis-copy"');
  const hasInternalLedger = html.includes("data-internal-results-ledger");
  const ledgerHidden = html.includes("data-internal-results-ledger") && html.includes("aria-hidden=\"true\"");
  const hasAssistantCard = /data-[a-z0-9-]*assistant-card/.test(html) || html.includes("AssistantCard");
  const hasAssistantMount = /data-[a-z0-9-]*assistant-mount/.test(html) || html.includes("AssistantMount");

  result(hasResults ? "PASS" : "WATCH", slug + " keeps #results for internal/export data");
  result(hasInternalLedger && ledgerHidden ? "PASS" : lifecycleKind(category, indexFile, hasResults ? "FAIL" : "WATCH"), slug + " legacy results are hidden internal ledger");
  result(hasAssistantCard && hasAssistantMount ? "PASS" : "WATCH", slug + " has assistant card + mount");

  if (hasResults && hasAssistantCard) {
    const resultsIndex = indexOf(html, 'id="results"');
    const ledgerIndex = indexOf(html, "data-internal-results-ledger");
    const assistantIndex = Math.min(indexOf(html, "AssistantCard"), indexOf(html, "data-compute-assistant-card"), indexOf(html, "data-assistant-card"));
    const exportIndex = indexOf(html, "exportReport");

    result(
      ledgerIndex < resultsIndex && resultsIndex < assistantIndex,
      slug + " assistant is after hidden ledger, not nested as old visible Results owner",
      "Order check is approximate and should be inspected if this fails."
    );

    if (exportIndex !== Number.MAX_SAFE_INTEGER) {
      result(assistantIndex < exportIndex ? "PASS" : "WATCH", slug + " assistant appears before export card");
    }
  }

  if (!scriptFile) {
    result("WATCH", slug + " has no script.js to inspect");
    return;
  }

  result("PASS", slug + " script found", rel(scriptFile));

  const hasCalc = js.includes("addEventListener(\"click\"") || js.includes("addEventListener('click'");
  const hasClear = /clear[A-Za-z]*Assistant/.test(js);
  const hasRender = /render[A-Za-z]*Assistant/.test(js);
  const hasExplicitHandoff = /render[A-Za-z]*Assistant\([^)]*Result|render[A-Za-z]*Assistant\([^)]*result/.test(js);
  const hasSave = /recordToolResult|save[A-Za-z]*Result|write[A-Za-z]*Result/.test(js);
  const hasContinue = /showContinue|continue/i.test(js);

  result(hasCalc ? "PASS" : "WATCH", slug + " has calculate/evaluate click handler");
  result(hasClear ? "PASS" : lifecycleKind(category, indexFile, "FAIL"), slug + " has assistant clear helper");
  result(hasRender ? "PASS" : lifecycleKind(category, indexFile, "FAIL"), slug + " has assistant render helper");
  result(hasExplicitHandoff ? "PASS" : lifecycleKind(category, indexFile, "FAIL"), slug + " explicitly hands calculation result to assistant");
  result(hasSave ? "PASS" : "WATCH", slug + " appears to write/save result payload");
  result(hasContinue ? "PASS" : "WATCH", slug + " has continue/export lifecycle marker");

  const saveIndex = Math.min(
    indexOf(js, "saveCpuResultToWorkload"),
    indexOf(js, "recordToolResult"),
    indexOf(js, "saveResult"),
    indexOf(js, "writeResult")
  );
  const renderIndex = Math.min(
    indexOf(js, "renderComputeAssistant"),
    indexOf(js, "renderAssistant"),
    indexOf(js, "renderToolAssistant")
  );

  if (saveIndex !== Number.MAX_SAFE_INTEGER && renderIndex !== Number.MAX_SAFE_INTEGER) {
    result(saveIndex < renderIndex ? "PASS" : lifecycleKind(category, indexFile, "FAIL"), slug + " saves result before assistant render");
  }
}

console.log("ScopedLabs Assistant Lifecycle Contract Audit V1");
console.log("Modernized assistant lifecycle tools:", Array.from(MODERNIZED_ASSISTANT_LIFECYCLE_TOOLS).join(", "));
console.log("Repo:", root);

for (const [category, config] of Object.entries(CATEGORY_CONFIG)) {
  auditContract(category, config);

  const tools = listToolIndexes(config.dir);
  if (!tools.length) {
    result("WATCH", category + " has no tool index files found");
    continue;
  }

  for (const indexFile of tools) {
    auditTool(category, indexFile, config);
  }
}

console.log("");
console.log("========================================================================");
console.log("SUMMARY");
console.log("========================================================================");
console.log("PASS :", pass);
console.log("WATCH:", watch);
console.log("FAIL :", fail);

if (fail) {
  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("");
console.log(watch ? "OVERALL: PASS WITH WATCH" : "OVERALL: PASS");
