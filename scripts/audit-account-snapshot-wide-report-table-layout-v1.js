const fs = require("fs");
const path = require("path");

const root = process.cwd();
const accountJs = fs.readFileSync(path.join(root, "assets", "account.js"), "utf8");
const accountHtml = fs.readFileSync(path.join(root, "account", "index.html"), "utf8");

let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + name);
  } else {
    fail += 1;
    console.log("[FAIL] " + name);
    if (detail) console.log("  " + detail);
  }
}

check("ACCOUNT_SNAPSHOT_CSS_LAYOUT_MARKER", accountHtml.includes("account-snapshot-detail-css-table-layout-0703"));
check("ACCOUNT_SNAPSHOT_CACHE_BUST_CSS_LAYOUT", accountHtml.includes("/assets/account.js?v=account-snapshot-detail-css-layout-0703"));
check("ACCOUNT_SNAPSHOT_OLD_WIDE_JS_REMOVED", !accountJs.includes("account-snapshot-wide-report-table-layout-0703"));
check("ACCOUNT_SNAPSHOT_SAFE_WIDE_JS_REMOVED", !accountJs.includes("account-snapshot-wide-report-table-layout-safe-0703"));
check("ACCOUNT_SNAPSHOT_NO_DETAIL_MUTATION_OBSERVER", !accountJs.includes("observer.observe(detail"));
check("ACCOUNT_SNAPSHOT_OBJECT_NORMALIZER_PRESERVED", accountJs.includes("account-snapshot-object-cell-normalizer-0703"));
check("ACCOUNT_SNAPSHOT_CSS_TABLE_WIDTH", accountHtml.includes("#sl-snapshot-detail table"));
check("ACCOUNT_SNAPSHOT_CSS_COLUMN_PRESETS", accountHtml.includes("nth-child(5)"));

console.log("");
console.log("SCOPEDLABS ACCOUNT SNAPSHOT WIDE REPORT TABLE LAYOUT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail) process.exit(1);
