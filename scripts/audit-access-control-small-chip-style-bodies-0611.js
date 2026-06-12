const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

const CANDIDATES = [
  {
    slug: "reader-type-selector",
    selectors: [
      ".reader-type-status-chip",
      ".reader-type-status-chip.is-risk",
      ".reader-type-status-chip.is-watch",
      ".reader-type-status-chip.is-safe",
      ".reader-type-status-chip.is-healthy",
    ],
  },
  {
    slug: "panel-capacity",
    selectors: [
      ".panel-capacity-status-chip",
      ".panel-capacity-status-chip.is-risk",
      ".panel-capacity-status-chip.is-watch",
      ".panel-capacity-status-chip.is-safe",
      ".panel-capacity-status-chip.is-healthy",
    ],
  },
  {
    slug: "access-level-sizing",
    selectors: [
      ".access-level-decision-hero .access-level-status-chip",
      ".access-level-status-chip",
      ".access-level-status-chip.is-risk",
      ".access-level-status-chip.is-watch",
      ".access-level-status-chip.is-safe",
      ".access-level-status-chip.is-healthy",
    ],
  },
  {
    slug: "credential-format",
    selectors: [
      ".credential-format-decision-hero .credential-format-status-chip",
      ".credential-format-status-chip",
      ".credential-format-status-chip.is-risk",
      ".credential-format-status-chip.is-watch",
      ".credential-format-status-chip.is-safe",
      ".credential-format-status-chip.is-healthy",
    ],
  },
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
    if (!/(?:status|chip|badge)/i.test(body)) continue;

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
    .join(";");
}

function prettyBody(body) {
  return String(body || "")
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => "       " + line + ";")
    .join("\n");
}

function extractCssRules(css, source) {
  const rules = [];
  const clean = stripCssComments(css);
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(clean))) {
    const selectors = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    const body = match[2] || "";

    for (const selector of selectors) {
      rules.push({
        source,
        selector,
        body,
        normalizedBody: normalizeBody(body),
      });
    }
  }

  return rules;
}

function getLocalRules(slug) {
  const htmlPath = path.join(categoryRoot, slug, "index.html");
  const html = read(htmlPath);

  return extractStyleBlocks(html).flatMap((block, index) => {
    return extractCssRules(block, slug + " style block " + (index + 1));
  });
}

function getSharedRules() {
  const polish = read(polishPath);

  return extractCssFragmentsFromJs(polish).flatMap((fragment, index) => {
    return extractCssRules(fragment, "shared polish CSS fragment " + (index + 1));
  });
}

function findRule(rules, selector) {
  return rules.find((rule) => rule.selector === selector) || null;
}

function compareRules(localRule, sharedRule) {
  if (localRule && sharedRule) {
    return localRule.normalizedBody === sharedRule.normalizedBody ? "MATCH" : "DIFF";
  }

  if (localRule && !sharedRule) return "LOCAL_ONLY";
  if (!localRule && sharedRule) return "SHARED_ONLY";

  return "MISSING_BOTH";
}

function main() {
  const sharedRules = getSharedRules();
  const totals = new Map();

  console.log("Access Control small status chip style body audit - 0611");
  console.log("Repo:", root);
  console.log("Candidates:", CANDIDATES.length);
  console.log("");

  for (const candidate of CANDIDATES) {
    const localRules = getLocalRules(candidate.slug);

    console.log("========================================================================");
    console.log(candidate.slug);
    console.log("========================================================================");

    for (const selector of candidate.selectors) {
      const localRule = findRule(localRules, selector);
      const sharedRule = findRule(sharedRules, selector);
      const bucket = compareRules(localRule, sharedRule);

      totals.set(bucket, (totals.get(bucket) || 0) + 1);

      console.log("");
      console.log(bucket + "  " + selector);

      if (localRule) {
        console.log("  LOCAL  " + localRule.source);
        console.log(prettyBody(localRule.body));
      } else {
        console.log("  LOCAL  missing");
      }

      if (sharedRule) {
        console.log("  SHARED " + sharedRule.source);
        console.log(prettyBody(sharedRule.body));
      } else {
        console.log("  SHARED missing");
      }
    }

    console.log("");
  }

  console.log("========================================================================");
  console.log("Summary");
  console.log("========================================================================");

  for (const [bucket, count] of Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(String(count).padStart(2, " ") + "  " + bucket);
  }

  console.log("");
  console.log("Interpretation:");
  console.log("- LOCAL_ONLY selectors are candidates for shared alias coverage.");
  console.log("- DIFF selectors need a design decision before shared polish overrides them.");
  console.log("- SHARED_ONLY is expected for cleaned small status-chip selectors after local pill CSS removal.");
  console.log("- This audit does not change UI, auth, checkout, export, snapshot, pipeline, KB, or ledgers.");
  console.log("");
  console.log("Summary: audit only / 0 FAIL");
}

main();