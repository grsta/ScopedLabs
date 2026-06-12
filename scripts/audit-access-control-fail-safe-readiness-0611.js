const fs = require("fs");
const path = require("path");

const root = process.cwd();

const toolDir = path.join(root, "tools", "access-control", "fail-safe-fail-secure");
const htmlPath = path.join(toolDir, "index.html");
const scriptPath = path.join(toolDir, "script.js");
const contractPath = path.join(root, "docs", "access-control-fail-safe-complex-status-contract-v1.md");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function normalizeSelector(selector) {
  return String(selector || "").trim().replace(/\s+/g, " ");
}

function uniq(items) {
  return [...new Set(items)].filter(Boolean).sort();
}

function extractStyleBlocks(text) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;

  while ((match = regex.exec(text))) {
    blocks.push(match[1] || "");
  }

  return blocks;
}

function extractRules(css) {
  const rules = [];
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(css))) {
    const selectors = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    for (const selector of selectors) {
      rules.push({
        selector,
        body: String(match[2] || "").trim(),
      });
    }
  }

  return rules;
}

function extractClassTokens(text) {
  const tokens = [];
  const regex = /class\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(text))) {
    tokens.push(
      ...String(match[1] || "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
    );
  }

  return uniq(tokens);
}

function extractStrings(text, pattern) {
  const out = [];
  const regex = /["'`]([^"'`]{1,180})["'`]/g;
  let match;

  while ((match = regex.exec(text))) {
    const value = String(match[1] || "").trim();
    if (pattern.test(value)) out.push(value);
  }

  return uniq(out);
}

function selectorsContaining(rules, pattern) {
  return uniq(rules.map((rule) => rule.selector).filter((selector) => pattern.test(selector)));
}

function rulesContaining(rules, pattern) {
  return rules.filter((rule) => pattern.test(rule.selector));
}

function bodyShape(body) {
  const text = String(body || "");

  if (/border-radius\s*:\s*(999|9999|50%|10rem|99rem)/i.test(text)) {
    return "PILL_SHAPE_REVIEW";
  }

  if (/border-radius\s*:\s*(6px|7px|8px|9px|10px|11px|12px)/i.test(text)) {
    return "RECTANGULAR_ENGINEERING_SHAPE";
  }

  if (/border-radius\s*:\s*(13px|14px|15px|16px|18px|20px|22px|24px|28px|32px)/i.test(text)) {
    return "ROUNDED_CARD_OR_VISUAL_REVIEW";
  }

  if (/border-radius\s*:/i.test(text)) {
    return "CUSTOM_RADIUS_REVIEW";
  }

  return "NO_RADIUS_OR_LAYOUT_RULE";
}

function summarizeShapeRules(rules, pattern) {
  const matches = rulesContaining(rules, pattern);
  const summary = new Map();

  for (const rule of matches) {
    const key = bodyShape(rule.body);
    summary.set(key, (summary.get(key) || 0) + 1);
  }

  return [...summary.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function has(text, token) {
  return String(text || "").includes(token);
}

function contextList(text, patterns, radius = 220) {
  const found = [];

  for (const pattern of patterns) {
    const index = text.search(pattern);
    if (index < 0) continue;

    found.push({
      token: String(pattern),
      context: text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)),
    });
  }

  return found;
}

function extractFunction(text, name) {
  const start = text.indexOf("function " + name);
  if (start < 0) return "";

  let depth = 0;
  let seenOpen = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (char === "{") {
      depth += 1;
      seenOpen = true;
    }

    if (char === "}") {
      depth -= 1;
      if (seenOpen && depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return text.slice(start);
}

const html = readIfExists(htmlPath);
const js = readIfExists(scriptPath);
const contract = readIfExists(contractPath);
const polish = readIfExists(polishPath);

const localRules = extractStyleBlocks(html).flatMap(extractRules);
const localSelectors = uniq(localRules.map((rule) => rule.selector));
const classTokens = extractClassTokens(html + "\n" + js);

const statusSelectors = selectorsContaining(localRules, /(status|chip|pill|badge|decision|recommend|risk|watch|safe|secure)/i);
const diagramSelectors = selectorsContaining(localRules, /(diagram|visual|svg|cad|flow|state|rail|node|edge|lock|power|fire|egress|release)/i);
const legendSelectors = selectorsContaining(localRules, /(legend|key|map|state|step|row|item)/i);
const exportSelectors = selectorsContaining(localRules, /(export|snapshot|print)/i);
const ledgerSelectors = selectorsContaining(localRules, /(ledger|result|hidden)/i);
const genericStatusClassTokens = classTokens.filter((token) => /(status|chip|pill|badge|legend|state)/i.test(token));

const statusStrings = extractStrings(js + "\n" + html, /(fail safe|fail secure|fail-safe|fail-secure|status|secure|safe|egress|fire|power|release|emergency|locked|unlocked)/i);

const hasContractMarker =
  contract.includes("FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED") &&
  contract.includes("KEEP_FAIL_SAFE_LOCAL_UNTIL_CONTRACTED") &&
  contract.includes("DIAGRAM_AND_LEGEND_REVIEW_BEFORE_SHARED_HELPER");

const scriptHasDiagramFactory =
  has(js, "buildFailSafeStateDiagramSvg") ||
  has(js, "FailSafeStateDiagram") ||
  has(js, "stateDiagram") ||
  has(js, "diagram") ||
  has(js, "<svg");

const scriptHasStatusPath =
  has(js, "statusClass") ||
  has(js, "status-pill") ||
  has(js, "statusPill") ||
  has(js, "statusEl") ||
  has(js, "getStatus") ||
  has(js, "recommend");

const scriptHasLegendPath =
  has(js, "legend") ||
  has(js, "Legend") ||
  has(js, "state key") ||
  has(js, "key");

const scriptHasExportPath =
  has(js, "exportStatus") ||
  has(js, "setExportStatus") ||
  has(html, "export-status");

const scriptHasLedgerOrCarry =
  has(js, "data-result-ledger") ||
  has(html, "data-result-ledger") ||
  has(js, "pipeline") ||
  has(js, "carry") ||
  has(js, "scopeState") ||
  has(js, "ScopedLabsAccessControlScopeState");

const sharedSmallChipFamilies = [
  ".reader-type-status-chip",
  ".panel-capacity-status-chip",
  ".access-level-status-chip",
  ".credential-format-status-chip",
].filter((selector) => polish.includes(selector));

const sharedFailSafeHints = [
  ".fail-safe-status-chip",
  ".fail-safe-visual-chip",
  ".fail-safe-state-chip",
  ".fail-safe-diagram",
  ".fail-safe-legend",
].filter((selector) => polish.includes(selector));

const statusShapeSummary = summarizeShapeRules(localRules, /(status|chip|pill|badge)/i);
const diagramShapeSummary = summarizeShapeRules(localRules, /(diagram|visual|svg|cad|state|rail|node|edge)/i);
const legendShapeSummary = summarizeShapeRules(localRules, /(legend|key|state|step|row|item)/i);

const interestingFunctions = [
  "getStatus",
  "getStatusFromResults",
  "buildFailSafeStateDiagramSvg",
  "render",
  "calculate",
  "update",
].map((name) => ({
  name,
  source: extractFunction(js, name),
})).filter((item) => item.source);

let failCount = 0;
let watchCount = 0;

function safe(label) {
  console.log("SAFE  " + label);
}

function info(label) {
  console.log("INFO  " + label);
}

function watch(label) {
  console.log("WATCH " + label);
  watchCount += 1;
}

function fail(label) {
  console.log("FAIL  " + label);
  failCount += 1;
}

function printShapeSummary(title, summary) {
  console.log(title);
  if (!summary.length) {
    console.log("  0  NONE_FOUND");
    return;
  }

  for (const [bucket, count] of summary) {
    console.log(String(count).padStart(3, " ") + "  " + bucket);
  }
}

console.log("Access Control Fail Safe details/readiness audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("Contract / file check");
html ? safe("fail-safe-fail-secure index.html present") : fail("fail-safe-fail-secure index.html missing");
js ? safe("fail-safe-fail-secure script.js present") : fail("fail-safe-fail-secure script.js missing");
hasContractMarker ? safe("Fail Safe complex status contract markers present") : fail("Fail Safe complex status contract markers missing");

console.log("");
console.log("Ownership map");
scriptHasStatusPath ? safe("status/recommendation path detected") : watch("status/recommendation path not clearly detected");
scriptHasDiagramFactory ? safe("diagram/SVG/state visual path detected") : watch("diagram/SVG/state visual path not clearly detected");
scriptHasLegendPath ? safe("legend/key/state explanation path detected") : watch("legend/key/state explanation path not clearly detected");
scriptHasExportPath ? safe("export status path detected and excluded") : watch("export status path not clearly detected");
scriptHasLedgerOrCarry ? safe("ledger/carry-forward/pipeline path detected and protected") : watch("ledger/carry-forward path not clearly detected");

console.log("");
console.log("Local selector inventory");
console.log(String(localSelectors.length).padStart(3, " ") + "  LOCAL_STYLE_SELECTORS");
console.log(String(statusSelectors.length).padStart(3, " ") + "  STATUS_CHIP_BADGE_SELECTORS_REVIEW");
console.log(String(diagramSelectors.length).padStart(3, " ") + "  DIAGRAM_STATE_VISUAL_SELECTORS_REVIEW");
console.log(String(legendSelectors.length).padStart(3, " ") + "  LEGEND_KEY_SELECTORS_REVIEW");
console.log(String(exportSelectors.length).padStart(3, " ") + "  EXPORT_PRINT_SELECTORS_KEEP_SEPARATE");
console.log(String(ledgerSelectors.length).padStart(3, " ") + "  LEDGER_RESULT_SELECTORS_KEEP_SEPARATE");
console.log(String(genericStatusClassTokens.length).padStart(3, " ") + "  STATUS_CLASS_TOKENS_REVIEW");
console.log(String(statusStrings.length).padStart(3, " ") + "  STATUS_LIFE_SAFETY_TEXT_TOKENS_REVIEW");

console.log("");
printShapeSummary("Status/chip shape summary", statusShapeSummary);
console.log("");
printShapeSummary("Diagram/visual shape summary", diagramShapeSummary);
console.log("");
printShapeSummary("Legend/key shape summary", legendShapeSummary);

console.log("");
console.log("Shared relationship");
if (sharedSmallChipFamilies.length) {
  info("completed small-chip shared families present: " + sharedSmallChipFamilies.join(", "));
}
if (sharedFailSafeHints.length) {
  watch("Fail Safe shared selector hint already exists: " + sharedFailSafeHints.join(", "));
} else {
  safe("no Fail Safe shared helper selectors detected in shared polish");
}

console.log("");
console.log("Readiness decision");
console.log("SAFE  FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW");
console.log("SAFE  FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW");
console.log("SAFE  FAIL_SAFE_SHARED_HELPER_NOT_READY");
console.log("SAFE  FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log("SAFE  AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED");

if (statusSelectors.length > 0 || diagramSelectors.length > 0 || legendSelectors.length > 0) {
  watch("FAIL_SAFE_COMPLEX_LOCAL_OWNERSHIP_REVIEW — local selectors exist and need visual inspection before any shared helper");
}

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Status / chip / badge selectors");
  for (const item of statusSelectors) console.log("  " + item);

  console.log("");
  console.log("Diagram / state / visual selectors");
  for (const item of diagramSelectors) console.log("  " + item);

  console.log("");
  console.log("Legend / key selectors");
  for (const item of legendSelectors) console.log("  " + item);

  console.log("");
  console.log("Export / print selectors");
  for (const item of exportSelectors) console.log("  " + item);

  console.log("");
  console.log("Ledger / result selectors");
  for (const item of ledgerSelectors) console.log("  " + item);

  console.log("");
  console.log("Status class tokens");
  for (const item of genericStatusClassTokens) console.log("  " + item);

  console.log("");
  console.log("Status / life-safety text tokens");
  for (const item of statusStrings) console.log("  " + item);

  console.log("");
  console.log("Interesting function snippets");
  for (const item of interestingFunctions) {
    console.log("");
    console.log("function " + item.name);
    console.log(
      item.source
        .split("\n")
        .slice(0, 80)
        .map((line) => "  " + line)
        .join("\n")
    );
  }

  const contexts = contextList(js, [
    /statusClass/,
    /status-pill/,
    /buildFailSafeStateDiagramSvg/,
    /exportStatus/,
    /data-result-ledger/,
  ]);

  console.log("");
  console.log("Context snippets");
  for (const item of contexts) {
    console.log("");
    console.log(item.token);
    console.log(
      item.context
        .split("\n")
        .map((line) => "  " + line)
        .join("\n")
    );
  }
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS" + (watchCount > 0 ? " WITH WATCH" : ""));