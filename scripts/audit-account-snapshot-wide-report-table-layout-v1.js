const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const accountJsPath = path.join(root, "assets", "account.js");
const accountHtmlPath = path.join(root, "account", "index.html");

const js = fs.readFileSync(accountJsPath, "utf8");
const html = fs.readFileSync(accountHtmlPath, "utf8");

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
}

function fail(name) {
  checks.push({ name, ok: false });
}

function requireToken(name, source, token) {
  if (source.includes(token)) pass(name);
  else fail(name);
}

function forbidToken(name, source, token) {
  if (!source.includes(token)) pass(name);
  else fail(name);
}

requireToken("ACCOUNT_SNAPSHOT_CSS_LAYOUT_MARKER", html, "account-snapshot-detail-css-table-layout-0703");
requireToken("ACCOUNT_SNAPSHOT_REPORT_COLUMN_LAYOUT_MARKER", html, "account-snapshot-detail-report-column-layout-0703");
requireToken("ACCOUNT_SNAPSHOT_CACHE_BUST_REPORT_COLUMN_LAYOUT", html, "/assets/account.js?v=account-snapshot-report-column-layout-0703");
forbidToken("ACCOUNT_SNAPSHOT_OLD_WIDE_JS_REMOVED", js, "account-snapshot-wide-report-table-layout-0703");
forbidToken("ACCOUNT_SNAPSHOT_SAFE_WIDE_JS_REMOVED", js, "account-snapshot-wide-report-table-layout-safe-0703");
forbidToken("ACCOUNT_SNAPSHOT_NO_DETAIL_MUTATION_OBSERVER", js, "observer.observe(detail");
requireToken("ACCOUNT_SNAPSHOT_OBJECT_NORMALIZER_PRESERVED", js, "account-snapshot-object-cell-normalizer-0703");
requireToken("ACCOUNT_SNAPSHOT_TEXT_SPACING_NORMALIZER", js, "account-snapshot-text-spacing-normalizer-0703");
requireToken("ACCOUNT_SNAPSHOT_CSS_TABLE_MIN_WIDTH", html, "min-width: 1040px");
requireToken("ACCOUNT_SNAPSHOT_CSS_COLUMN_PRESETS", html, "nth-child(5)");
requireToken("ACCOUNT_SNAPSHOT_DETAIL_COLUMN_WIDTH", html, "width: 36%");

let passCount = 0;
let failCount = 0;

for (const check of checks) {
  if (check.ok) {
    passCount += 1;
    console.log("[PASS] " + check.name);
  } else {
    failCount += 1;
    console.log("[FAIL] " + check.name);
  }
}

console.log("\\nSCOPEDLABS ACCOUNT SNAPSHOT WIDE REPORT TABLE LAYOUT AUDIT V1");
console.log("PASS " + passCount + " / FAIL " + failCount);

if (failCount > 0) {
  process.exit(1);
}
