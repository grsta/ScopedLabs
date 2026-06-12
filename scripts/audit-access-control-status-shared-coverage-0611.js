const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");

const SPECIAL_PATH_TOOLS = new Set(["scope-planner"]);

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function listToolDirs() {
  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html")))
    .sort((a, b) => a.localeCompare(b));
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

function normalizeSelector(selector) {
  return String(selector || "")
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/^body\[data-category=(?:"access-control"|'access-control')\]\[data-access-control-tool-polish=(?:"true"|'true')\]\s+/i, "")
    .replace(/^body\[data-access-control-tool-polish=(?:"true"|'true')\]\[data-category=(?:"access-control"|'access-control')\]\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
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

function extractCssRules(css) {
  const rules = [];
  const clean = stripCssComments(css);
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(clean))) {
    const selectors = String(match[1] || "")
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);

    const body = match[2] || "";
    const normalizedBody = normalizeBody(body);

    for (const selector of selectors) {
      const normalizedSelector = normalizeSelector(selector);

      rules.push({
        selector,
        normalizedSelector,
        body,
        normalizedBody,
      });
    }
  }

  return rules;
}

function uniq(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function sample(values, limit = 20) {
  const unique = uniq(values);
  if (unique.length <= limit) return unique;
  return unique.slice(0, limit).concat("... +" + (unique.length - limit) + " more");
}

function isExportStatusSignal(value) {
  return /(?:\.export-status\b|#exportStatus\b|id="exportStatus"|class="export-status")/i.test(value);
}

function isStatusSelector(selector) {
  return /(?:status|chip|badge)/i.test(selector) && !isExportStatusSignal(selector);
}

function slugWords(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean);
}

function hasSlugSpecificSelector(slug, selector) {
  const text = String(selector || "").toLowerCase();
  const slugText = String(slug || "").toLowerCase();

  if (text.includes(slugText)) return true;

  const words = slugWords(slug);
  if (words.length >= 2 && words.every((word) => text.includes(word))) return true;

  const knownPrefixes = [
    "access-level",
    "credential-format",
    "access-fail-safe",
    "lock-power",
    "access-lock-power",
    "panel-capacity",
    "reader-type",
  ];

  return knownPrefixes.some((prefix) => text.includes(prefix));
}

function extractSharedStatusRules() {
  const polish = read(polishPath);
  const fragments = extractCssFragmentsFromJs(polish);

  const rules = fragments
    .flatMap(extractCssRules)
    .filter((rule) => isStatusSelector(rule.normalizedSelector));

  const selectorBodyMap = new Map();
  const bodySet = new Set();

  for (const rule of rules) {
    if (!selectorBodyMap.has(rule.normalizedSelector)) {
      selectorBodyMap.set(rule.normalizedSelector, new Set());
    }

    selectorBodyMap.get(rule.normalizedSelector).add(rule.normalizedBody);

    if (rule.normalizedBody) {
      bodySet.add(rule.normalizedBody);
    }
  }

  return {
    fragments,
    rules,
    selectorBodyMap,
    bodySet,
  };
}

function classifyRule(slug, rule, shared) {
  const sharedBodies = shared.selectorBodyMap.get(rule.normalizedSelector);

  if (sharedBodies && sharedBodies.has(rule.normalizedBody)) {
    return "EXACT_SHARED_SELECTOR_AND_BODY_MATCH";
  }

  if (sharedBodies) {
    return "SHARED_SELECTOR_BODY_DIFF_REVIEW";
  }

  if (shared.bodySet.has(rule.normalizedBody)) {
    return "BODY_MATCHES_SHARED_STATUS_STYLE";
  }

  if (hasSlugSpecificSelector(slug, rule.normalizedSelector)) {
    return "PAGE_NAMED_STATUS_KEEP_REVIEW";
  }

  return "GENERIC_STATUS_LOCAL_REVIEW";
}

function countBy(items, keyName) {
  const counts = new Map();

  for (const item of items) {
    const key = item[keyName];
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function main() {
  const shared = extractSharedStatusRules();
  const rows = [];
  const statusFindings = [];

  for (const slug of listToolDirs()) {
    const htmlPath = path.join(categoryRoot, slug, "index.html");
    const html = read(htmlPath);

    const hasSharedPolish =
      html.includes("/assets/access-control-tool-polish.js") &&
      html.includes('data-access-control-tool-polish="true"');

    if (SPECIAL_PATH_TOOLS.has(slug)) {
      rows.push({
        slug,
        bucket: "SPECIAL_PATH_SKIP",
        hasSharedPolish,
        findings: [],
      });
      continue;
    }

    const localRules = extractStyleBlocks(html)
      .flatMap(extractCssRules)
      .filter((rule) => isStatusSelector(rule.normalizedSelector));

    const findings = localRules.map((rule) => {
      const status = classifyRule(slug, rule, shared);

      return {
        slug,
        selector: rule.normalizedSelector,
        status,
      };
    });

    const statuses = uniq(findings.map((finding) => finding.status));

    let bucket = "NO_VISIBLE_STATUS_SELECTOR";

    if (
      statuses.includes("EXACT_SHARED_SELECTOR_AND_BODY_MATCH") ||
      statuses.includes("BODY_MATCHES_SHARED_STATUS_STYLE")
    ) {
      bucket = "SHARED_STATUS_REMOVAL_CANDIDATE_REVIEW";
    } else if (statuses.includes("SHARED_SELECTOR_BODY_DIFF_REVIEW")) {
      bucket = "SHARED_STATUS_SELECTOR_DIFF_REVIEW";
    } else if (statuses.includes("GENERIC_STATUS_LOCAL_REVIEW")) {
      bucket = "GENERIC_STATUS_LOCAL_REVIEW";
    } else if (statuses.includes("PAGE_NAMED_STATUS_KEEP_REVIEW")) {
      bucket = "PAGE_NAMED_STATUS_KEEP_REVIEW";
    }

    rows.push({
      slug,
      bucket,
      hasSharedPolish,
      findings,
    });

    statusFindings.push(...findings);
  }

  const bucketCounts = countBy(rows, "bucket");
  const statusCounts = countBy(statusFindings, "status");

  console.log("Access Control status shared coverage audit - 0611");
  console.log("Repo:", root);
  console.log("Shared polish CSS fragments:", shared.fragments.length);
  console.log("Shared polish status rules:", shared.rules.length);
  console.log("Tools found:", rows.length);
  console.log("");

  console.log("Tool bucket summary");
  for (const [bucket, count] of Array.from(bucketCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(String(count).padStart(2, " ") + "  " + bucket);
  }

  console.log("");
  console.log("Selector status summary");
  for (const [status, count] of Array.from(statusCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(String(count).padStart(2, " ") + "  " + status);
  }

  console.log("");
  console.log("Shared polish normalized status selector sample");
  for (const selector of sample(shared.rules.map((rule) => rule.normalizedSelector), 24)) {
    console.log("  - " + selector);
  }

  console.log("");
  console.log("Tool map");

  for (const row of rows) {
    const state = row.bucket === "SPECIAL_PATH_SKIP" ? "SKIP" : "INFO";

    console.log("");
    console.log(state + "  " + row.slug + " — " + row.bucket);
    console.log("     shared polish: " + (row.hasSharedPolish ? "yes" : "no"));

    if (!row.findings.length) {
      console.log("     visible decision/status selectors: 0");
      continue;
    }

    const grouped = new Map();

    for (const finding of row.findings) {
      if (!grouped.has(finding.status)) grouped.set(finding.status, []);
      grouped.get(finding.status).push(finding.selector);
    }

    for (const [status, selectors] of Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log("     " + status + ": " + selectors.length);
      for (const selector of sample(selectors)) {
        console.log("       - " + selector);
      }
    }
  }

  console.log("");
  console.log("Recommendation");
  console.log("  - Do not remove PAGE_NAMED_STATUS_KEEP_REVIEW selectors without visual inspection.");
  console.log("  - Do not remove SHARED_STATUS_SELECTOR_DIFF_REVIEW selectors without comparing screenshots/state.");
  console.log("  - Only consider removal after exact shared selector/body coverage is proven.");
  console.log("  - Keep export status controls out of this lane.");
  console.log("");
  console.log("Summary: audit only / 0 FAIL");
}

main();