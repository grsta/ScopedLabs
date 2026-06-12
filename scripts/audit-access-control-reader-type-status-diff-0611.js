const fs = require("fs");
const path = require("path");

const root = process.cwd();

const localPath = path.join(root, "tools", "access-control", "reader-type-selector", "index.html");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

const SELECTORS = [
  ".reader-type-status-chip",
  ".reader-type-status-chip.is-risk",
  ".reader-type-status-chip.is-watch",
  ".reader-type-status-chip.is-safe",
  ".reader-type-status-chip.is-healthy",
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function stripCssComments(css) {
  return String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function decodeJsStringLiteralBody(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, "`")
    .replace(/\\\\/g, "\\");
}

function extractCssFragmentsFromJs(jsText) {
  const fragments = [];
  const stringRegex = /(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g;
  let match;

  while ((match = stringRegex.exec(jsText))) {
    const body = decodeJsStringLiteralBody(match[2] || "");

    if (!body.includes("{") || !body.includes("}")) continue;
    if (!body.includes("reader-type-status-chip")) continue;

    fragments.push(body);
  }

  return fragments;
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

function normalizeSelector(selector) {
  return String(selector || "")
    .trim()
    .replace(/^body\[data-category=(?:"access-control"|'access-control')\]\[data-access-control-tool-polish=(?:"true"|'true')\]\s+/i, "")
    .replace(/^body\[data-access-control-tool-polish=(?:"true"|'true')\]\[data-category=(?:"access-control"|'access-control')\]\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBody(body) {
  return stripCssComments(body)
    .replace(/!important/gi, "")
    .replace(/([,(\s:])\.(\d+)/g, function (_match, prefix, digits) {
      return prefix + "0." + digits;
    })
    .replace(/\s+/g, " ")
    .replace(/\s*([:;{},])\s*/g, "$1")
    .trim()
    .toLowerCase()
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(";\n");
}

function extractRules(css) {
  const rules = [];
  const clean = stripCssComments(css);
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(clean))) {
    const selectors = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    const rawBody = match[2] || "";
    const normalizedBody = normalizeBody(rawBody);

    for (const selector of selectors) {
      rules.push({
        selector,
        rawBody: rawBody.trim(),
        normalizedBody,
      });
    }
  }

  return rules;
}

function collectLocalRules() {
  return extractStyleBlocks(read(localPath))
    .flatMap(extractRules)
    .filter((rule) => SELECTORS.includes(rule.selector));
}

function collectSharedRules() {
  return extractCssFragmentsFromJs(read(polishPath))
    .flatMap(extractRules)
    .filter((rule) => SELECTORS.includes(rule.selector));
}

function findRule(rules, selector) {
  return rules.find((rule) => rule.selector === selector) || null;
}

const localRules = collectLocalRules();
const sharedRules = collectSharedRules();

console.log("Access Control Reader Type status diff audit - 0611");
console.log("Local:", path.relative(root, localPath));
console.log("Shared:", path.relative(root, polishPath));
console.log("");

for (const selector of SELECTORS) {
  const local = findRule(localRules, selector);
  const shared = findRule(sharedRules, selector);

  let status = "MISSING_BOTH";
  if (local && shared && local.normalizedBody === shared.normalizedBody) status = "EXACT_MATCH";
  else if (local && shared) status = "BODY_DIFF";
  else if (local && !shared) status = "LOCAL_ONLY";
  else if (!local && shared) status = "SHARED_ONLY";

  console.log("========================================================================");
  console.log(selector + " — " + status);
  console.log("------------------------------------------------------------------------");
  console.log("LOCAL BODY:");
  console.log(local ? local.normalizedBody : "(missing)");
  console.log("------------------------------------------------------------------------");
  console.log("SHARED BODY:");
  console.log(shared ? shared.normalizedBody : "(missing)");
  console.log("");
}

console.log("Summary: audit only / 0 FAIL");