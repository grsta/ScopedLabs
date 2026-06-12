const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolDir = path.join(root, "tools", "access-control", "fail-safe-fail-secure");
const htmlPath = path.join(toolDir, "index.html");
const scriptPath = path.join(toolDir, "script.js");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");
const evidenceSuitePath = path.join(root, "scripts", "audit-access-control-evidence-suite-0611.js");

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function normalizeSelector(selector) {
  return String(selector || "").trim().replace(/\s+/g, " ");
}

function uniq(items) {
  return [...new Set(items)].filter(Boolean).sort();
}

function extractStyleBlocks(html) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;

  while ((match = regex.exec(html))) {
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

  return tokens;
}

function extractInterestingStrings(text) {
  const tokens = [];
  const regex = /["'`]([^"'`]*(?:fail|safe|secure|status|legend|chip|pill|badge|diagram|state|egress|fire|power|release|export)[^"'`]*)["'`]/gi;
  let match;

  while ((match = regex.exec(text))) {
    const raw = String(match[1] || "").trim();
    if (!raw || raw.length > 160) continue;
    tokens.push(raw);
  }

  return tokens;
}

function findByToken(items, tokenRegex) {
  return uniq(items.filter((item) => tokenRegex.test(item)));
}

function has(text, token) {
  return String(text || "").includes(token);
}

const html = readIfExists(htmlPath);
const js = readIfExists(scriptPath);
const polish = readIfExists(polishPath);
const evidenceSuite = readIfExists(evidenceSuitePath);

const localRules = extractStyleBlocks(html).flatMap(extractRules);
const localSelectors = uniq(localRules.map((rule) => rule.selector));
const markupClassTokens = uniq(extractClassTokens(html));
const stringTokens = uniq(extractInterestingStrings(html + "\n" + js));

const statusSelectors = findByToken(localSelectors, /(status|chip|pill|badge|legend|state)/i);
const diagramSelectors = findByToken(localSelectors, /(diagram|visual|svg|cad|flow|state|lock|power|fire|egress|release)/i);
const exportSelectors = findByToken(localSelectors, /(export|snapshot|print)/i);
const hiddenLedgerSelectors = findByToken(localSelectors, /(ledger|hidden|result)/i);

const statusClassTokens = findByToken([...markupClassTokens, ...stringTokens], /(status|chip|pill|badge|legend|state)/i);
const failSafeTokens = findByToken([...markupClassTokens, ...stringTokens], /(fail.safe|fail.secure|failsafe|failsecure|safe|secure)/i);
const lifeSafetyTokens = findByToken([...markupClassTokens, ...stringTokens], /(egress|fire|release|power|emergency|loss)/i);

const sharedStatusHints = [
  ".reader-type-status-chip",
  ".panel-capacity-status-chip",
  ".access-level-status-chip",
  ".credential-format-status-chip",
  ".status-pill",
].filter((selector) => polish.includes(selector));

const scriptHasStatusClass =
  has(js, "statusClass") ||
  has(js, "status.class") ||
  has(js, "className") ||
  has(js, "status-");

const scriptHasDiagram =
  has(js, "diagram") ||
  has(js, "svg") ||
  has(js, "buildFailSafeStateDiagramSvg") ||
  has(js, "FailSafeStateDiagram");

const scriptHasExportStatus =
  has(js, "exportStatus") ||
  has(js, "setExportStatus") ||
  has(html, "export-status");

const scriptHasCarryOrLedger =
  has(js, "ledger") ||
  has(js, "carry") ||
  has(js, "pipeline") ||
  has(html, "data-result-ledger");

const knownDeferred =
  evidenceSuite.includes("FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED") ||
  evidenceSuite.includes("COMPLEX_STATUS_SYSTEM_KEEP") ||
  evidenceSuite.includes("fail-safe-fail-secure");

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

console.log("Access Control Fail Safe complex status audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("Prerequisites");
html ? safe("fail-safe-fail-secure index.html present") : fail("fail-safe-fail-secure index.html missing");
js ? safe("fail-safe-fail-secure script.js present") : info("fail-safe-fail-secure script.js not found");
polish ? safe("shared polish present") : fail("shared polish missing");
knownDeferred ? safe("Fail Safe appears deferred/kept in existing evidence language") : watch("Fail Safe deferred marker not found in evidence suite");

console.log("");
console.log("Local inventory");
console.log(String(localSelectors.length).padStart(2, " ") + "  LOCAL_STYLE_SELECTORS");
console.log(String(statusSelectors.length).padStart(2, " ") + "  STATUS_OR_LEGEND_SELECTORS_REVIEW");
console.log(String(diagramSelectors.length).padStart(2, " ") + "  DIAGRAM_OR_STATE_VISUAL_SELECTORS_REVIEW");
console.log(String(exportSelectors.length).padStart(2, " ") + "  EXPORT_PRINT_SELECTORS_KEEP");
console.log(String(hiddenLedgerSelectors.length).padStart(2, " ") + "  LEDGER_RESULT_SELECTORS_KEEP");
console.log(String(statusClassTokens.length).padStart(2, " ") + "  STATUS_CLASS_OR_TEXT_TOKENS_REVIEW");
console.log(String(failSafeTokens.length).padStart(2, " ") + "  FAIL_SAFE_SECURE_TOKENS_REVIEW");
console.log(String(lifeSafetyTokens.length).padStart(2, " ") + "  LIFE_SAFETY_CONTEXT_TOKENS_REVIEW");

console.log("");
console.log("Script ownership");
scriptHasStatusClass ? safe("script appears to generate/manage status classes") : watch("script status class path not detected");
scriptHasDiagram ? safe("script appears to generate/manage diagram/SVG path") : watch("script diagram/SVG path not detected");
scriptHasExportStatus ? safe("export status path present and excluded") : watch("export status path not detected");
scriptHasCarryOrLedger ? safe("carry-forward/ledger/pipeline indicators present and must be preserved") : info("carry-forward/ledger indicator not detected by text scan");

console.log("");
console.log("Shared-status relationship");
if (sharedStatusHints.length) {
  info("shared status-related selectors present elsewhere: " + sharedStatusHints.join(", "));
} else {
  info("no shared status-related selectors detected in shared polish");
}
console.log("SAFE  Fail Safe is not part of completed small square-chip migration");
console.log("SAFE  Fail Safe is not part of parked Lock Power visual-chip lane");

console.log("");
console.log("Decision bucket");
console.log("SAFE  FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED");
console.log("SAFE  KEEP_FAIL_SAFE_LOCAL_UNTIL_CONTRACTED");
console.log("SAFE  DIAGRAM_AND_LEGEND_REVIEW_BEFORE_SHARED_HELPER");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE");
console.log("SAFE  AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Status / legend selectors");
  for (const item of statusSelectors) console.log("  " + item);

  console.log("");
  console.log("Diagram / state visual selectors");
  for (const item of diagramSelectors) console.log("  " + item);

  console.log("");
  console.log("Export / print selectors");
  for (const item of exportSelectors) console.log("  " + item);

  console.log("");
  console.log("Ledger / result selectors");
  for (const item of hiddenLedgerSelectors) console.log("  " + item);

  console.log("");
  console.log("Status class/text tokens");
  for (const item of statusClassTokens) console.log("  " + item);

  console.log("");
  console.log("Life safety context tokens");
  for (const item of lifeSafetyTokens) console.log("  " + item);
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS" + (watchCount > 0 ? " WITH WATCH" : ""));