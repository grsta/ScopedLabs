#!/usr/bin/env node

/*
  ScopedLabs Access Control Shared Result Style Parity Audit - 0610

  Audit only. No writes.

  Purpose:
  - Compare repeated generic result selectors in page-local style blocks
    against scoped shared polish rules.
  - Normalize declaration order, !important, and rgba shorthand decimals.
  - Decide which selectors can later be removed safely from page-local styles.
*/

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

const CANDIDATE_SELECTORS = [
  ".mini-note",
  ".result-label",
  ".result-row",
  ".result-row .k",
  ".result-row .v",
  ".result-value",
  ".results-grid",
  "#results[data-result-ledger][hidden]",
  "[data-result-ledger][hidden]",
];

const SPECIAL_PATH_TOOLS = new Set(["scope-planner"]);

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function listToolDirs() {
  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort((a, b) => a.localeCompare(b));
}

function stripCssComments(css) {
  const commentRegex = new RegExp("/\\*[\\s\\S]*?\\*/", "g");
  return String(css || "").replace(commentRegex, "");
}

function extractStyleBlocks(html) {
  const blocks = [];
  const regex = new RegExp("<style\\b[^>]*>([\\s\\S]*?)<\\/style>", "gi");
  let match;

  while ((match = regex.exec(String(html || "")))) {
    blocks.push(match[1] || "");
  }

  return blocks;
}

function normalizeBody(body) {
  const commentRegex = new RegExp("/\\*[\\s\\S]*?\\*/", "g");
  const importantRegex = new RegExp("!important", "gi");
  const decimalRegex = new RegExp("([,(\\s:])\\.(\\d+)", "g");

  const text = String(body || "")
    .replace(commentRegex, "")
    .replace(importantRegex, "")
    .replace(decimalRegex, function (_match, prefix, digits) {
      return prefix + "0." + digits;
    })
    .replace(/\s+/g, " ")
    .replace(/\s*([:;{},])\s*/g, "$1")
    .trim();

  const declarations = text
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf(":");
      if (index < 0) return item.toLowerCase();

      const prop = item.slice(0, index).trim().toLowerCase();
      const value = item.slice(index + 1).trim().toLowerCase();

      return prop + ":" + value;
    })
    .sort((a, b) => a.localeCompare(b));

  return declarations.join(";");
}

function selectorMatchesCandidate(selectorItem, candidate) {
  const item = String(selectorItem || "").trim();
  const wanted = String(candidate || "").trim();

  if (!item || !wanted) return false;
  if (item === wanted) return true;

  return [
    " " + wanted,
    ">" + wanted,
    "+" + wanted,
    "~" + wanted,
  ].some((ending) => item.endsWith(ending));
}

function selectorExistsInCombinedRule(css, selector) {
  const stripped = stripCssComments(css);
  const ruleRegex = new RegExp("([^{}@]+)\\{([^}]*)\\}", "g");
  let match;

  while ((match = ruleRegex.exec(stripped))) {
    const selectorList = String(match[1] || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (selectorList.some((item) => selectorMatchesCandidate(item, selector))) {
      return normalizeBody(match[2]);
    }
  }

  return "";
}

function extractSharedBody(polish, selector) {
  return selectorExistsInCombinedRule(polish, selector);
}

function extractPageBodies(html, selector) {
  const bodies = new Set();

  for (const block of extractStyleBlocks(html)) {
    const body = selectorExistsInCombinedRule(block, selector);
    if (body) bodies.add(body);
  }

  return Array.from(bodies);
}

function compareBodies(pageBodies, sharedBody) {
  if (!pageBodies.length) return "MISSING_PAGE_RULE";
  if (!sharedBody) return "MISSING_SHARED_RULE";
  if (pageBodies.every((body) => body === sharedBody)) return "EXACT_SHARED_MATCH";
  if (pageBodies.some((body) => body === sharedBody)) return "MIXED_SHARED_AND_LOCAL";
  return "DIFFERS_KEEP_REVIEW";
}

function countBy(rows, status) {
  return rows.filter((row) => row.status === status).length;
}

function main() {
  const polish = read(polishPath);
  const tools = listToolDirs();

  const rows = [];
  const statusCounts = new Map();

  for (const selector of CANDIDATE_SELECTORS) {
    const sharedBody = extractSharedBody(polish, selector);

    for (const slug of tools) {
      if (SPECIAL_PATH_TOOLS.has(slug)) continue;

      const htmlPath = path.join(categoryRoot, slug, "index.html");
      const html = read(htmlPath);
      const pageBodies = extractPageBodies(html, selector);

      if (!pageBodies.length) continue;

      const status = compareBodies(pageBodies, sharedBody);
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

      rows.push({
        slug,
        selector,
        status,
        sharedBody,
        pageBodies,
      });
    }
  }

  console.log("Access Control shared result style parity audit - 0610");
  console.log("Repo:", root);
  console.log("Selectors checked:", CANDIDATE_SELECTORS.length);
  console.log("");

  console.log("Status summary");
  Array.from(statusCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([status, count]) => {
      console.log(String(count).padStart(2, " ") + "  " + status);
    });

  console.log("");
  console.log("Selector summary");
  for (const selector of CANDIDATE_SELECTORS) {
    const selectorRows = rows.filter((row) => row.selector === selector);

    console.log(
      selector +
      " — tools: " + selectorRows.length +
      ", exact: " + countBy(selectorRows, "EXACT_SHARED_MATCH") +
      ", differs: " + countBy(selectorRows, "DIFFERS_KEEP_REVIEW") +
      ", mixed: " + countBy(selectorRows, "MIXED_SHARED_AND_LOCAL") +
      ", missingShared: " + countBy(selectorRows, "MISSING_SHARED_RULE")
    );
  }

  console.log("");
  console.log("Tool detail");
  for (const row of rows.sort((a, b) => (a.slug + a.selector).localeCompare(b.slug + b.selector))) {
    console.log(row.status.padEnd(24) + row.slug + " — " + row.selector);

    if (row.status !== "EXACT_SHARED_MATCH") {
      console.log("      shared: " + (row.sharedBody || "[missing]"));
      row.pageBodies.forEach((body, index) => {
        console.log("      page " + (index + 1) + ": " + body);
      });
    }
  }

  console.log("");
  console.log("Summary: audit only / 0 FAIL");
}

main();