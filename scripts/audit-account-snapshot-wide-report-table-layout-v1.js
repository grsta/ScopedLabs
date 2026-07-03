const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "account.js"), "utf8");
const html = fs.readFileSync(path.join(root, "account", "index.html"), "utf8");

const checks = [];

function check(name, ok) {
  checks.push({ name, ok });
}

check("ACCOUNT_SNAPSHOT_CSS_LAYOUT_MARKER", html.includes("account-snapshot-detail-css-table-layout-0703"));
check("ACCOUNT_SNAPSHOT_REPORT_COLUMN_LAYOUT_MARKER", html.includes("account-snapshot-detail-report-column-layout-0703"));
check("ACCOUNT_SNAPSHOT_CACHE_BUST_STABLE_LAYOUT", html.includes("/assets/account.js?v=account-snapshot-report-column-layout-stable-0703"));
check("ACCOUNT_SNAPSHOT_OLD_WIDE_JS_REMOVED", !js.includes("account-snapshot-wide-report-table-layout-0703"));
check("ACCOUNT_SNAPSHOT_SAFE_WIDE_JS_REMOVED", !js.includes("account-snapshot-wide-report-table-layout-safe-0703"));
check("ACCOUNT_SNAPSHOT_NO_DETAIL_MUTATION_OBSERVER", !js.includes("observer.observe(detail"));
check("ACCOUNT_SNAPSHOT_OBJECT_NORMALIZER_PRESERVED", js.includes("account-snapshot-object-cell-normalizer-0703"));
check("ACCOUNT_SNAPSHOT_CSS_TABLE_MIN_WIDTH", html.includes("min-width: 1040px"));
check("ACCOUNT_SNAPSHOT_CSS_COLUMN_PRESETS", html.includes("nth-child(5)"));
check("ACCOUNT_SNAPSHOT_DETAIL_COLUMN_WIDTH", html.includes("width: 36%"));

let passCount = 0;
let failCount = 0;

for (const item of checks) {
  if (item.ok) {
    passCount += 1;
    console.log("[PASS] " + item.name);
  } else {
    failCount += 1;
    console.log("[FAIL] " + item.name);
  }
}

console.log("");
console.log("SCOPEDLABS ACCOUNT SNAPSHOT WIDE REPORT TABLE LAYOUT AUDIT V1");
console.log("PASS " + passCount + " / FAIL " + failCount);
if (failCount > 0) process.exit(1);
