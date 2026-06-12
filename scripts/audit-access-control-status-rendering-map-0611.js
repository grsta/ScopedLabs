const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");

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

function extractStyleBlocks(html) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;

  while ((match = regex.exec(html))) {
    blocks.push(match[1] || "");
  }

  return blocks;
}

function stripCssComments(css) {
  return String(css || "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractSelectors(css) {
  const selectors = [];
  const clean = stripCssComments(css);
  const regex = /([^{}@]+)\{[^{}]*\}/g;
  let match;

  while ((match = regex.exec(clean))) {
    String(match[1] || "")
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean)
      .forEach((selector) => selectors.push(selector));
  }

  return selectors;
}

function uniq(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function sample(values, limit = 14) {
  const unique = uniq(values);
  if (unique.length <= limit) return unique;
  return unique.slice(0, limit).concat("... +" + (unique.length - limit) + " more");
}

function countMatches(text, regex) {
  const matches = String(text || "").match(regex);
  return matches ? matches.length : 0;
}

function findStatusAttributes(html) {
  const matches = [];
  const attrRegex = /\b(id|class|data-[a-z0-9-]+)=["']([^"']*(?:status|chip|badge)[^"']*)["']/gi;
  let match;

  while ((match = attrRegex.exec(html))) {
    matches.push(match[1] + "=" + JSON.stringify(match[2]));
  }

  return uniq(matches);
}

function findJsStatusSignals(html) {
  const scriptText = String(html || "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  const signals = [];

  const checks = [
    ["getElementById(status-like)", /getElementById\s*\(\s*["'][^"']*(?:status|chip|badge)[^"']*["']\s*\)/gi],
    ["querySelector(status-like)", /querySelector(?:All)?\s*\(\s*["'][^"']*(?:status|chip|badge)[^"']*["']\s*\)/gi],
    ["status text assignment", /(?:status|chip|badge)[A-Za-z0-9_$.\[\]'"]{0,80}\s*\.\s*(?:textContent|innerText|innerHTML)\s*=/gi],
    ["classList status mutation", /classList\s*\.\s*(?:add|remove|toggle)\s*\([^)]*(?:status|chip|badge)/gi],
    ["status render/update function", /function\s+[A-Za-z0-9_$]*(?:Status|Chip|Badge)[A-Za-z0-9_$]*\s*\(/g],
    ["status arrow/function const", /(?:const|let|var)\s+[A-Za-z0-9_$]*(?:Status|Chip|Badge)[A-Za-z0-9_$]*\s*=/g],
  ];

  for (const [label, regex] of checks) {
    const count = countMatches(scriptText, regex);
    if (count > 0) signals.push(label + ": " + count);
  }

  return signals;
}

function isExportStatusSignal(value) {
  return /(?:\.export-status\b|#exportStatus\b|id="exportStatus"|class="export-status")/i.test(value);
}

function isVisibleDecisionStatusSelector(selector) {
  if (!/(?:status|chip|badge)/i.test(selector)) return false;
  if (isExportStatusSignal(selector)) return false;

  return true;
}

function isVisibleDecisionStatusAttribute(attr) {
  if (!/(?:status|chip|badge)/i.test(attr)) return false;
  if (isExportStatusSignal(attr)) return false;

  return true;
}

function bucketTool(slug, decisionSelectors, decisionAttrs, jsSignals, exportSelectors, exportAttrs) {
  if (SPECIAL_PATH_TOOLS.has(slug)) return "SPECIAL_PATH_SKIP";

  const hasDecisionEvidence = decisionSelectors.length || decisionAttrs.length || jsSignals.length;
  const hasExportEvidence = exportSelectors.length || exportAttrs.length;

  if (hasDecisionEvidence) return "VISIBLE_DECISION_STATUS_REVIEW";
  if (hasExportEvidence) return "STATUS_EXPORT_CONTROL_KEEP_ONLY";

  return "NO_VISIBLE_STATUS_EVIDENCE";
}

function main() {
  const rows = [];
  const bucketCounts = new Map();

  for (const slug of listToolDirs()) {
    const htmlPath = path.join(categoryRoot, slug, "index.html");
    const html = read(htmlPath);

    const hasSharedPolish =
      html.includes("/assets/access-control-tool-polish.js") &&
      html.includes('data-access-control-tool-polish="true"');

    const selectors = extractStyleBlocks(html).flatMap(extractSelectors);
    const attrs = findStatusAttributes(html);
    const jsSignals = findJsStatusSignals(html);

    const exportSelectors = uniq(selectors.filter(isExportStatusSignal));
    const exportAttrs = uniq(attrs.filter(isExportStatusSignal));

    const decisionSelectors = uniq(selectors.filter(isVisibleDecisionStatusSelector));
    const decisionAttrs = uniq(attrs.filter(isVisibleDecisionStatusAttribute));

    const bucket = bucketTool(slug, decisionSelectors, decisionAttrs, jsSignals, exportSelectors, exportAttrs);
    bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);

    rows.push({
      slug,
      bucket,
      hasSharedPolish,
      decisionSelectors,
      decisionAttrs,
      jsSignals,
      exportSelectors,
      exportAttrs,
    });
  }

  console.log("Access Control status rendering map - 0611");
  console.log("Repo:", root);
  console.log("Tools found:", rows.length);
  console.log("");

  console.log("Bucket summary");
  for (const [bucket, count] of Array.from(bucketCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(String(count).padStart(2, " ") + "  " + bucket);
  }

  console.log("");
  console.log("Recommendation summary");

  const visibleReview = bucketCounts.get("VISIBLE_DECISION_STATUS_REVIEW") || 0;
  const exportOnly = bucketCounts.get("STATUS_EXPORT_CONTROL_KEEP_ONLY") || 0;
  const noVisible = bucketCounts.get("NO_VISIBLE_STATUS_EVIDENCE") || 0;
  const special = bucketCounts.get("SPECIAL_PATH_SKIP") || 0;

  if (visibleReview) console.log(String(visibleReview).padStart(2, " ") + "  INSPECT_VISIBLE_DECISION_STATUS_BEFORE_REMOVAL");
  if (exportOnly) console.log(String(exportOnly).padStart(2, " ") + "  KEEP_EXPORT_STATUS_CONTROL");
  if (noVisible) console.log(String(noVisible).padStart(2, " ") + "  NO_VISIBLE_STATUS_CLEANUP");
  if (special) console.log(String(special).padStart(2, " ") + "  KEEP_SPECIAL_PATH_SEPARATE");

  console.log("");
  console.log("Tool map");

  for (const row of rows) {
    const state = row.bucket === "SPECIAL_PATH_SKIP" ? "SKIP" : "INFO";

    console.log("");
    console.log(state + "  " + row.slug + " — " + row.bucket);
    console.log("     shared polish: " + (row.hasSharedPolish ? "yes" : "no"));

    console.log("     visible decision/status selectors: " + row.decisionSelectors.length);
    for (const selector of sample(row.decisionSelectors)) {
      console.log("       - " + selector);
    }

    console.log("     visible decision/status attributes: " + row.decisionAttrs.length);
    for (const attr of sample(row.decisionAttrs)) {
      console.log("       - " + attr);
    }

    console.log("     JS status signals: " + row.jsSignals.length);
    for (const signal of row.jsSignals) {
      console.log("       - " + signal);
    }

    console.log("     export status/control selectors: " + row.exportSelectors.length);
    for (const selector of sample(row.exportSelectors)) {
      console.log("       - " + selector);
    }

    console.log("     export status/control attributes: " + row.exportAttrs.length);
    for (const attr of sample(row.exportAttrs)) {
      console.log("       - " + attr);
    }
  }

  console.log("");
  console.log("Summary: audit only / 0 FAIL");
}

main();