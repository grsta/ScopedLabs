const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const contractPath = path.join(root, "docs", "access-control-status-chip-contract-v1.md");

const SUMMARY_ONLY = process.argv.includes("--summary-only");

const SPECIAL_PATH_TOOLS = new Set(["scope-planner"]);
const COMPLEX_STATUS_TOOLS = new Set(["fail-safe-fail-secure"]);
const VISUAL_CHIP_TOOLS = new Set(["lock-power-budget"]);
const SMALL_DECISION_CHIP_TOOLS = new Set([
  "access-level-sizing",
  "credential-format",
  "panel-capacity",
  "reader-type-selector",
]);

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

function extractStyleBlocks(html) {
  const blocks = [];
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;

  while ((match = regex.exec(html))) {
    blocks.push(match[1] || "");
  }

  return blocks;
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

  return Array.from(new Set(selectors)).sort((a, b) => a.localeCompare(b));
}

function findAttributes(html) {
  const attrs = [];
  const attrRegex = /\b(id|class|data-[a-z0-9-]+)=["']([^"']*(?:status|chip|badge|tier|gold|pro)[^"']*)["']/gi;
  let match;

  while ((match = attrRegex.exec(html))) {
    attrs.push(match[1] + "=" + JSON.stringify(match[2]));
  }

  return Array.from(new Set(attrs)).sort((a, b) => a.localeCompare(b));
}

function isExportStatusSignal(value) {
  return /(?:\.export-status\b|#exportStatus\b|id="exportStatus"|class="export-status")/i.test(value);
}

function isVisibleStatusSelector(selector) {
  return /(?:status|chip|badge)/i.test(selector) && !isExportStatusSignal(selector);
}

function isVisibleStatusAttribute(attr) {
  return /(?:status|chip|badge)/i.test(attr) && !isExportStatusSignal(attr);
}

function sample(values, limit = 12) {
  const unique = Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

  if (unique.length <= limit) return unique;
  return unique.slice(0, limit).concat("... +" + (unique.length - limit) + " more");
}

function classifyTool(slug, html, visibleSelectors, visibleAttrs, exportSignals) {
  if (SPECIAL_PATH_TOOLS.has(slug)) {
    return {
      bucket: "SPECIAL_PATH_SKIP",
      reason: "Scope Planner is a special path and is excluded from V1 status chip migration.",
    };
  }

  if (COMPLEX_STATUS_TOOLS.has(slug) && (visibleSelectors.length || visibleAttrs.length)) {
    return {
      bucket: "COMPLEX_STATUS_SYSTEM_KEEP",
      reason: "Tool has a larger local status/legend system and needs a separate contract.",
    };
  }

  if (VISUAL_CHIP_TOOLS.has(slug) && (visibleSelectors.length || visibleAttrs.length)) {
    return {
      bucket: "VISUAL_CHIP_REVIEW",
      reason: "Tool has a visual chip variant that should be inspected before sharing or removal.",
    };
  }

  if (SMALL_DECISION_CHIP_TOOLS.has(slug) && (visibleSelectors.length || visibleAttrs.length)) {
    return {
      bucket: "LOCAL_ALIAS_NEEDED",
      reason: "Small decision chip should migrate through shared aliases after contract standard is chosen.",
    };
  }

  if (!visibleSelectors.length && !visibleAttrs.length && exportSignals.length) {
    return {
      bucket: "EXPORT_STATUS_KEEP",
      reason: "Only export status/control evidence found; export controls are excluded from V1.",
    };
  }

  if (!visibleSelectors.length && !visibleAttrs.length) {
    return {
      bucket: "CONTRACT_READY",
      reason: "No visible local decision/status chip evidence found for V1.",
    };
  }

  return {
    bucket: "PAGE_NAMED_KEEP",
    reason: "Visible page-named status evidence found; inspect before any migration.",
  };
}

function countBy(rows, keyName) {
  const counts = new Map();

  for (const row of rows) {
    const key = row[keyName];
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function checkContractDoc() {
  if (!exists(contractPath)) {
    return {
      ok: false,
      findings: ["FAIL contract doc missing: docs/access-control-status-chip-contract-v1.md"],
    };
  }

  const doc = read(contractPath);

  const requiredPatterns = [
    ["Contract first", /Contract first/i],
    ["Gold future-proofing", /Gold/i],
    ["CONTRACT_READY bucket", /CONTRACT_READY/],
    ["LOCAL_ALIAS_NEEDED bucket", /LOCAL_ALIAS_NEEDED/],
    ["EXPORT_STATUS_KEEP bucket", /EXPORT_STATUS_KEEP/],
    ["COMPLEX_STATUS_SYSTEM_KEEP bucket", /COMPLEX_STATUS_SYSTEM_KEEP/],
    ["SPECIAL_PATH_SKIP bucket", /SPECIAL_PATH_SKIP/],
    ["TIER_HOOK_REVIEW bucket", /TIER_HOOK_REVIEW/],
    ["Main Gate Promotion Rule", /Main Gate Promotion Rule/i],
  ];

  const findings = [];
  let ok = true;

  for (const [label, regex] of requiredPatterns) {
    if (regex.test(doc)) {
      findings.push("SAFE " + label);
    } else {
      findings.push("FAIL missing " + label);
      ok = false;
    }
  }

  return { ok, findings };
}

function main() {
  const contract = checkContractDoc();
  const rows = [];

  for (const slug of listToolDirs()) {
    const htmlPath = path.join(categoryRoot, slug, "index.html");
    const html = read(htmlPath);

    const selectors = extractStyleBlocks(html).flatMap(extractSelectors);
    const attrs = findAttributes(html);

    const visibleSelectors = selectors.filter(isVisibleStatusSelector);
    const visibleAttrs = attrs.filter(isVisibleStatusAttribute);
    const exportSignals = selectors.concat(attrs).filter(isExportStatusSignal);

    const classification = classifyTool(slug, html, visibleSelectors, visibleAttrs, exportSignals);

    rows.push({
      slug,
      bucket: classification.bucket,
      reason: classification.reason,
      visibleSelectors,
      visibleAttrs,
      exportSignals,
    });
  }

  const bucketCounts = countBy(rows, "bucket");

  console.log("Access Control status chip contract audit - 0611");
  console.log("Repo:", root);
  console.log("Tools found:", rows.length);
  console.log("");

  console.log("Contract document check");
  for (const finding of contract.findings) {
    console.log(finding);
  }

  console.log("");
  console.log("Bucket summary");
  for (const [bucket, count] of Array.from(bucketCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(String(count).padStart(2, " ") + "  " + bucket);
  }

  console.log("");
  console.log("Tier / Gold readiness");
  console.log("INFO  GOLD_READY_PLACEHOLDER — contract reserves Gold without enabling Gold behavior");
  console.log("INFO  TIER_HOOK_REVIEW — future audits should keep auth/checkout tier logic centralized");
  console.log("INFO  PRO_BEHAVIOR_PRESERVED — audit only; no live UI or auth changes");

  if (!SUMMARY_ONLY) {
    console.log("");
    console.log("Tool map");

    for (const row of rows) {
      const state = row.bucket === "SPECIAL_PATH_SKIP" ? "SKIP" : "INFO";

      console.log("");
      console.log(state + "  " + row.slug + " — " + row.bucket);
      console.log("     reason: " + row.reason);

      console.log("     visible selectors: " + row.visibleSelectors.length);
      for (const selector of sample(row.visibleSelectors)) {
        console.log("       - " + selector);
      }

      console.log("     visible attributes: " + row.visibleAttrs.length);
      for (const attr of sample(row.visibleAttrs)) {
        console.log("       - " + attr);
      }

      console.log("     export status/control signals: " + row.exportSignals.length);
      for (const signal of sample(row.exportSignals, 8)) {
        console.log("       - " + signal);
      }
    }
  }

  console.log("");

  if (!contract.ok) {
    console.log("Summary: 1 FAIL");
    process.exit(1);
  }

  console.log("Summary: audit only / 0 FAIL");
}

main();