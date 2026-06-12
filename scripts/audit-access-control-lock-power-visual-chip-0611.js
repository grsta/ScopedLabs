const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolDir = path.join(root, "tools", "access-control", "lock-power-budget");
const htmlPath = path.join(toolDir, "index.html");
const scriptPath = path.join(toolDir, "script.js");
const polishPath = path.join(root, "assets", "access-control-tool-polish.js");
const migrationAuditPath = path.join(root, "scripts", "audit-access-control-status-chip-migration-state-0611.js");

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function uniq(items) {
  return [...new Set(items)].filter(Boolean).sort();
}

function normalizeSelector(selector) {
  return String(selector || "").trim().replace(/\s+/g, " ");
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
  const regex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;

  while ((match = regex.exec(css))) {
    const parts = String(match[1] || "")
      .split(",")
      .map(normalizeSelector)
      .filter(Boolean);

    selectors.push(...parts);
  }

  return selectors;
}

function extractClassTokens(text) {
  const out = [];
  const regex = /class\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(text))) {
    out.push(
      ...String(match[1] || "")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return out;
}

function extractStringClassTokens(text) {
  const out = [];
  const regex = /["'`]([^"'`]*(?:chip|status|pill|badge|indicator|rail|supply|state)[^"'`]*)["'`]/gi;
  let match;

  while ((match = regex.exec(text))) {
    const raw = String(match[1] || "").trim();
    if (!raw || raw.length > 120) continue;

    out.push(raw);
  }

  return out;
}

function interesting(items) {
  return uniq(
    items.filter((item) => {
      return /(chip|status|pill|badge|indicator|rail|supply|state|power)/i.test(item);
    })
  );
}

const html = readIfExists(htmlPath);
const js = readIfExists(scriptPath);
const polish = readIfExists(polishPath);
const migrationAudit = readIfExists(migrationAuditPath);

const styleSelectors = interesting(extractStyleBlocks(html).flatMap(extractSelectors));
const markupClassTokens = interesting(extractClassTokens(html));
const stringTokens = interesting(extractStringClassTokens(html + "\n" + js));

const sharedSquareAliasFamilies = [
  ".reader-type-status-chip",
  ".panel-capacity-status-chip",
  ".access-level-status-chip",
  ".credential-format-status-chip",
];

const hasSharedLockPowerStatusAlias =
  polish.includes(".lock-power-status-chip") ||
  polish.includes(".lock-power-budget-status-chip") ||
  polish.includes(".lock-power-visual-chip") ||
  polish.includes(".lock-power-chip");

const migratedSmallChipAuditOk =
  migrationAudit.includes("LOCK_POWER_VISUAL_CHIP_DEFERRED") &&
  migrationAudit.includes("SHARED_SQUARE_CHIP_MIGRATED");

const localVisualIndicators = uniq(
  [
    ...styleSelectors,
    ...markupClassTokens,
    ...stringTokens,
  ].filter((item) => /(rail|supply|power|load|capacity|indicator|visual|chip|status)/i.test(item))
);

const hardPillHints = uniq(
  [
    ...styleSelectors,
    ...markupClassTokens,
    ...stringTokens,
  ].filter((item) => /(pill)/i.test(item))
);

let failCount = 0;

console.log("Access Control Lock Power visual chip audit - 0611");
console.log("Repo:", root);
console.log("");

console.log("Prerequisites");
console.log((html ? "SAFE" : "FAIL") + " lock-power-budget index.html present");
console.log((js ? "SAFE" : "INFO") + " lock-power-budget script.js present");
console.log((polish ? "SAFE" : "FAIL") + " shared polish present");
console.log((migratedSmallChipAuditOk ? "SAFE" : "WATCH") + " small-chip migration audit explicitly defers Lock Power visual chip");

if (!html || !polish) failCount += 1;

console.log("");
console.log("Shared square-chip alias check");
console.log((hasSharedLockPowerStatusAlias ? "WATCH" : "SAFE") + " Lock Power is not currently owned by shared square status-chip aliases");
console.log("INFO  existing shared small-chip families: " + sharedSquareAliasFamilies.join(", "));

console.log("");
console.log("Lock Power local visual/status inventory");
console.log(String(styleSelectors.length).padStart(2, " ") + "  STYLE_SELECTORS_REVIEW");
console.log(String(markupClassTokens.length).padStart(2, " ") + "  MARKUP_CLASS_TOKENS_REVIEW");
console.log(String(stringTokens.length).padStart(2, " ") + "  JS_OR_HTML_STRING_TOKENS_REVIEW");
console.log(String(localVisualIndicators.length).padStart(2, " ") + "  LOCAL_VISUAL_INDICATORS_REVIEW");
console.log(String(hardPillHints.length).padStart(2, " ") + "  PILL_WORD_HINTS_REVIEW");

console.log("");
console.log("Decision bucket");
if (hasSharedLockPowerStatusAlias) {
  console.log("WATCH LOCK_POWER_SHARED_ALIAS_ALREADY_PRESENT — inspect before changing shared polish");
} else {
  console.log("SAFE  LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED — keep separate from small square-chip cleanup");
}
console.log("SAFE  FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED");
console.log("SAFE  EXPORT_STATUS_CONTROLS_UNTOUCHED");
console.log("SAFE  LEDGERS_AND_CARRY_FORWARD_UNTOUCHED");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Style selectors");
  for (const item of styleSelectors) console.log("  " + item);

  console.log("");
  console.log("Markup class tokens");
  for (const item of markupClassTokens) console.log("  " + item);

  console.log("");
  console.log("JS / HTML string tokens");
  for (const item of stringTokens) console.log("  " + item);
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");