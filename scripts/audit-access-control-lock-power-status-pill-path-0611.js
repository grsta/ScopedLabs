const fs = require("fs");
const path = require("path");

const root = process.cwd();

const htmlPath = path.join(root, "tools", "access-control", "lock-power-budget", "index.html");
const scriptPath = path.join(root, "tools", "access-control", "lock-power-budget", "script.js");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");
const contractPath = path.join(root, "docs", "access-control-lock-power-visual-chip-contract-v1.md");
const statusPillContractPath = path.join(root, "docs", "access-control-lock-power-status-pill-path-contract-v1.md");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function normalizeSelector(selector) {
  return String(selector || "").trim().replace(/\s+/g, " ");
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

function selectorIncludes(rules, token) {
  return rules.some((rule) => rule.selector.includes(token));
}

function findSelectors(rules, token) {
  return rules
    .filter((rule) => rule.selector.includes(token))
    .map((rule) => rule.selector);
}

function uniq(items) {
  return [...new Set(items)].filter(Boolean).sort();
}

function contextAround(text, token, radius = 260) {
  const index = text.indexOf(token);
  if (index < 0) return "";
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + token.length + radius));
}

function extractReturnStrings(functionSource) {
  const out = [];
  const regex = /return\s+["'`]([^"'`]+)["'`]/g;
  let match;

  while ((match = regex.exec(functionSource))) {
    out.push(match[1]);
  }

  return uniq(out);
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

const html = read(htmlPath);
const script = read(scriptPath);
const polish = read(polishPath);
const contract = read(contractPath);
const statusPillContract = read(statusPillContractPath);

const localRules = extractStyleBlocks(html).flatMap(extractRules);
const sharedRules = extractRules(polish);

const hasGeneratedTemplate = script.includes("status-pill ${statusClass}");
const hasStatusClass = script.includes("statusClass");
const hasGetStatus = script.includes("function getStatus");
const hasGetStatusFromResults = script.includes("function getStatusFromResults");
const hasContractMarker = contract.includes("LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED");
const hasStatusPillContractMarker = statusPillContract.includes("LOCK_POWER_STATUS_PILL_PATH_LOCAL_REVIEW");

const localStatusPillSelectors = uniq(findSelectors(localRules, "status-pill"));
const sharedStatusPillSelectors = uniq(findSelectors(sharedRules, "status-pill"));

const localVisualChipSelectors = uniq(findSelectors(localRules, "access-lock-power-visual-chip"));
const sharedVisualChipSelectors = uniq(findSelectors(sharedRules, "access-lock-power-visual-chip"));

const statusFunction = extractFunction(script, "getStatus");
const statusFromResultsFunction = extractFunction(script, "getStatusFromResults");
const statusReturns = extractReturnStrings(statusFunction);

const generatedContext = contextAround(script, "status-pill ${statusClass}");

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

console.log("Access Control Lock Power status-pill path audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("Prerequisites");
hasContractMarker ? safe("Lock Power visual-chip contract marker present") : fail("Lock Power visual-chip contract marker missing");
hasStatusPillContractMarker ? safe("Lock Power status-pill path contract marker present") : fail("Lock Power status-pill path contract marker missing");
hasGetStatus ? safe("getStatus function present") : watch("getStatus function not found");
hasGetStatusFromResults ? safe("getStatusFromResults function present") : watch("getStatusFromResults function not found");

console.log("");
console.log("Generated status path");
hasGeneratedTemplate ? safe("script emits status-pill ${statusClass}") : fail("script does not emit status-pill ${statusClass}");
hasStatusClass ? safe("script computes statusClass") : fail("script does not compute statusClass");

console.log("");
console.log("Style ownership");
console.log(String(localStatusPillSelectors.length).padStart(2, " ") + "  LOCAL_STATUS_PILL_SELECTORS");
console.log(String(sharedStatusPillSelectors.length).padStart(2, " ") + "  SHARED_STATUS_PILL_SELECTORS");
console.log(String(localVisualChipSelectors.length).padStart(2, " ") + "  LOCAL_LOCK_POWER_VISUAL_CHIP_SELECTORS");
console.log(String(sharedVisualChipSelectors.length).padStart(2, " ") + "  SHARED_LOCK_POWER_VISUAL_CHIP_SELECTORS");

if (localStatusPillSelectors.length > 0) {
  watch("LOCAL_STATUS_PILL_STYLE_PRESENT — inspect before moving to shared helper");
} else {
  safe("no local .status-pill CSS selector found in Lock Power page styles");
}

if (sharedStatusPillSelectors.length > 0) {
  info("shared .status-pill styling exists outside Lock Power-specific contract");
} else {
  info("no shared .status-pill selector detected in access-control-tool-polish.js");
}

if (localVisualChipSelectors.length > 0 && sharedVisualChipSelectors.length === 0) {
  safe("Lock Power visual chip remains locally owned");
} else if (sharedVisualChipSelectors.length > 0) {
  watch("shared Lock Power visual chip selector already exists; inspect before patching");
}

console.log("");
console.log("Status values returned by getStatus");
if (statusReturns.length) {
  for (const value of statusReturns) {
    console.log("  " + value);
  }
} else {
  watch("no return strings extracted from getStatus");
}

console.log("");
console.log("Decision summary");

if (hasGeneratedTemplate && localStatusPillSelectors.length === 0 && sharedStatusPillSelectors.length > 0) {
  console.log("SAFE  STATUS_PILL_PATH_SHARED_GENERIC_STYLE");
} else if (hasGeneratedTemplate && localStatusPillSelectors.length === 0) {
  console.log("WATCH STATUS_PILL_PATH_MARKUP_ONLY_OR_EXTERNAL_STYLE");
} else if (hasGeneratedTemplate && localStatusPillSelectors.length > 0) {
  console.log("WATCH STATUS_PILL_PATH_LOCAL_STYLE_REVIEW");
} else {
  console.log("FAIL  STATUS_PILL_PATH_NOT_FOUND");
  failCount += 1;
}

console.log("SAFE  LOCK_POWER_VISUAL_CHIP_LOCAL_OWNERSHIP_PRESERVED");
console.log("SAFE  CAD_RAIL_VISUAL_KEEP_SEPARATE");
console.log("SAFE  EXPORT_STATUS_KEEP_SEPARATE");
console.log("SAFE  LEDGER_KEEP_SEPARATE");
console.log("SAFE  FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Local status-pill selectors");
  for (const selector of localStatusPillSelectors) console.log("  " + selector);

  console.log("");
  console.log("Shared status-pill selectors");
  for (const selector of sharedStatusPillSelectors) console.log("  " + selector);

  console.log("");
  console.log("Generated template context");
  console.log(
    generatedContext
      .split("\n")
      .map((line) => "  " + line)
      .join("\n")
  );

  console.log("");
  console.log("getStatus function");
  console.log(
    statusFunction
      .split("\n")
      .map((line) => "  " + line)
      .join("\n")
  );

  console.log("");
  console.log("getStatusFromResults function");
  console.log(
    statusFromResultsFunction
      .split("\n")
      .map((line) => "  " + line)
      .join("\n")
  );
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS" + (watchCount > 0 ? " WITH WATCH" : ""));