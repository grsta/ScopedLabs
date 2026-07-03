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

check("ACCOUNT_SNAPSHOT_WIDE_LAYOUT_MARKER", accountJs.includes("account-snapshot-wide-report-table-layout-0703"));
check("ACCOUNT_SNAPSHOT_WIDE_STYLE_MARKER", accountHtml.includes("account-snapshot-wide-report-table-layout-style-0703"));
check("ACCOUNT_SNAPSHOT_CACHE_BUST", accountHtml.includes("/assets/account.js?v=account-snapshot-wide-report-tables-0703"));
check("ACCOUNT_SNAPSHOT_WIDE_TABLE_CLASS", accountJs.includes("sl-snapshot-wide-report-table"));
check("ACCOUNT_SNAPSHOT_WIDE_COLGROUP", accountJs.includes("data-account-snapshot-wide-widths"));
check("ACCOUNT_SNAPSHOT_COLUMN_PRESETS", accountJs.includes("widthsForSnapshotHeaders"));
check("ACCOUNT_SNAPSHOT_POLISH_BINDING", accountJs.includes("polishSnapshotDetailLayout"));
check("ACCOUNT_SNAPSHOT_MUTATION_OBSERVER", accountJs.includes("MutationObserver"));

console.log("");
console.log("SCOPEDLABS ACCOUNT SNAPSHOT WIDE REPORT TABLE LAYOUT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail) process.exit(1);
