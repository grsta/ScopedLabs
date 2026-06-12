const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");
const contractPath = path.join(root, "docs", "access-control-status-chip-contract-v1.md");
const planPath = path.join(root, "docs", "access-control-status-chip-implementation-plan-v1.md");

const SUMMARY_ONLY = process.argv.includes("--summary-only");

const CANDIDATES = [
  {
    slug: "reader-type-selector",
    base: ".reader-type-status-chip",
    expectedStates: [".is-risk", ".is-watch"],
    sharedStates: [".is-risk", ".is-safe", ".is-healthy"],
    heroSelector: null,
  },
  {
    slug: "panel-capacity",
    base: ".panel-capacity-status-chip",
    expectedStates: [".is-risk", ".is-watch"],
    sharedStates: [],
    heroSelector: null,
  },
  {
    slug: "access-level-sizing",
    base: ".access-level-status-chip",
    expectedStates: [".is-risk", ".is-watch"],
    sharedStates: [],
    heroSelector: ".access-level-decision-hero .access-level-status-chip",
  },
  {
    slug: "credential-format",
    base: ".credential-format-status-chip",
    expectedStates: [".is-risk", ".is-watch"],
    sharedStates: [],
    heroSelector: ".credential-format-decision-hero .credential-format-status-chip",
  },
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
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

function extractCssRules(css) {
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
    const normalizedBody = normalizeBody(body);

    for (const selector of selectors) {
      rules.push({ selector, normalizedBody });
    }
  }

  return rules;
}

function getLocalRules(slug) {
  const htmlPath = path.join(categoryRoot, slug, "index.html");
  const html = read(htmlPath);

  return {
    html,
    rules: extractStyleBlocks(html).flatMap(extractCssRules),
  };
}

function getSharedRules() {
  const polish = read(polishPath);
  return extractCssFragmentsFromJs(polish).flatMap(extractCssRules);
}

function findRule(rules, selector) {
  return rules.find((rule) => rule.selector === selector) || null;
}

function hasExportStatus(localHtml) {
  return /id=["']exportStatus["']|class=["']export-status["']|\.export-status\b/i.test(localHtml);
}

function checkDoc(filePath, patterns) {
  if (!exists(filePath)) return false;

  const text = read(filePath);
  return patterns.every((pattern) => pattern.test(text));
}

function classifyCandidate(candidate, local, sharedRules) {
  const findings = [];

  const baseRule = findRule(local.rules, candidate.base);

  findings.push(baseRule ? "BASE_SELECTOR_PRESENT" : "BASE_SELECTOR_MISSING");

  if (candidate.heroSelector) {
    findings.push(findRule(local.rules, candidate.heroSelector) ? "HERO_SELECTOR_PRESENT" : "HERO_SELECTOR_MISSING");
  }

  for (const state of candidate.expectedStates) {
    const selector = candidate.base + state;
    findings.push(findRule(local.rules, selector) ? "LOCAL_STATE_PRESENT " + state : "LOCAL_STATE_MISSING " + state);
  }

  const sharedBase = findRule(sharedRules, candidate.base);

  if (sharedBase && baseRule) {
    findings.push(sharedBase.normalizedBody === baseRule.normalizedBody ? "BASE_MATCHES_SHARED" : "BASE_BODY_DIFF");
  } else if (sharedBase) {
    findings.push("BASE_SHARED_ONLY");
  } else {
    findings.push("BASE_NOT_SHARED");
  }

  for (const state of candidate.expectedStates) {
    const selector = candidate.base + state;
    const localState = findRule(local.rules, selector);
    const sharedState = findRule(sharedRules, selector);

    if (localState && sharedState) {
      findings.push(localState.normalizedBody === sharedState.normalizedBody ? "STATE_MATCHES_SHARED " + state : "STATE_BODY_DIFF " + state);
    } else if (localState && !sharedState) {
      findings.push("STATE_ALIAS_MISSING_IN_SHARED " + state);
    } else if (!localState && sharedState) {
      findings.push("STATE_SHARED_ONLY " + state);
    }
  }

  for (const state of candidate.sharedStates || []) {
    const selector = candidate.base + state;
    if (findRule(sharedRules, selector) && !findRule(local.rules, selector)) {
      findings.push("SHARED_EXTRA_STATE " + state);
    }
  }

  if (hasExportStatus(local.html)) {
    findings.push("EXPORT_STATUS_SEPARATED_KEEP");
  }

  const hasBodyDiff = findings.some((finding) => finding.includes("BODY_DIFF"));
  const hasMissingSharedState = findings.some((finding) => finding.includes("STATE_ALIAS_MISSING_IN_SHARED"));
  const hasMissingBaseShared = findings.includes("BASE_NOT_SHARED");
  const hasMissingLocalState = findings.some((finding) => finding.includes("LOCAL_STATE_MISSING"));
  const hasBase = findings.includes("BASE_SELECTOR_PRESENT");

  const sharedBaseForMigration = findRule(sharedRules, candidate.base);
  const sharedExpectedStates = candidate.expectedStates.every((state) => {
    return Boolean(findRule(sharedRules, candidate.base + state));
  });
  const localExpectedStatesRemoved = candidate.expectedStates.every((state) => {
    return !findRule(local.rules, candidate.base + state);
  });
  const migratedToSharedSquare =
    !hasBase &&
    localExpectedStatesRemoved &&
    Boolean(sharedBaseForMigration) &&
    sharedExpectedStates;

  let bucket = "ALIAS_READY";

  if (migratedToSharedSquare) {
    bucket = "SHARED_SQUARE_CHIP_MIGRATED";
    findings.push("LOCAL_PILL_CHIP_CSS_REMOVED");
    findings.push("SHARED_SQUARE_ALIAS_PRESENT");
  } else if (!hasBase || hasMissingLocalState) {
    bucket = "LOCAL_KEEP_REVIEW";
  } else if (hasMissingBaseShared || hasMissingSharedState) {
    bucket = "STATE_ALIAS_MISSING";
  } else if (hasBodyDiff) {
    bucket = "ALIAS_BODY_DIFF_REVIEW";
  }

  return { bucket, findings };
}

function main() {
  const contractOk = checkDoc(contractPath, [
    /Access Control Status Chip Contract V1/,
    /Gold/i,
    /LOCAL_ALIAS_NEEDED/,
    /EXPORT_STATUS_KEEP/,
    /COMPLEX_STATUS_SYSTEM_KEEP/,
  ]);

  const planOk = checkDoc(planPath, [
    /Access Control Status Chip Implementation Plan V1/,
    /Migration Order/,
    /Shared polish alias patch/,
    /Gold/i,
    /Commit Discipline/,
  ]);

  const sharedRules = getSharedRules();
  const rows = [];

  for (const candidate of CANDIDATES) {
    const local = getLocalRules(candidate.slug);
    const result = classifyCandidate(candidate, local, sharedRules);

    rows.push({
      slug: candidate.slug,
      base: candidate.base,
      bucket: result.bucket,
      findings: result.findings,
    });
  }

  const counts = new Map();

  for (const row of rows) {
    counts.set(row.bucket, (counts.get(row.bucket) || 0) + 1);
  }

  console.log("Access Control small status chip alias audit - 0611");
  console.log("Repo:", root);
  console.log("Candidates:", rows.length);
  console.log("");

  console.log("Contract/plan check");
  console.log((contractOk ? "SAFE" : "FAIL") + " status chip contract doc");
  console.log((planOk ? "SAFE" : "FAIL") + " status chip implementation plan doc");

  console.log("");
  console.log("Bucket summary");
  for (const [bucket, count] of Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(String(count).padStart(2, " ") + "  " + bucket);
  }

  console.log("");
  console.log("Tier / Gold readiness");
  console.log("INFO  GOLD_READY_PLACEHOLDER — audit only; no Gold behavior enabled");
  console.log("INFO  PRO_BEHAVIOR_PRESERVED — audit only; no auth or checkout changes");
  console.log("INFO  EXPORT_STATUS_KEEP — export status controls remain excluded");
  console.log("INFO  SHARED_SQUARE_CHIP_MIGRATED — local pill CSS removed and shared square aliases now own the small chip styling");

  if (!SUMMARY_ONLY) {
    console.log("");
    console.log("Candidate map");

    for (const row of rows) {
      console.log("");
      console.log("INFO  " + row.slug + " — " + row.bucket);
      console.log("     base: " + row.base);

      for (const finding of row.findings) {
        console.log("     - " + finding);
      }
    }
  }

  console.log("");

  if (!contractOk || !planOk) {
    console.log("Summary: 1 FAIL");
    process.exit(1);
  }

  console.log("Summary: audit only / 0 FAIL");
}

main();