const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const accountJsPath = path.join(root, "assets", "account.js");
const accountHtmlPath = path.join(root, "account", "index.html");

const js = fs.readFileSync(accountJsPath, "utf8");
const html = fs.readFileSync(accountHtmlPath, "utf8");

const checks = [];

function add(status, id, detail) {
  checks.push({ status, id, detail });
}

function mustContain(source, token, id, fileLabel) {
  if (source.includes(token)) {
    add("SAFE", id, fileLabel + " contains " + token);
  } else {
    add("FAIL", id, fileLabel + " missing " + token);
  }
}

function mustNotContain(source, token, id, fileLabel) {
  if (!source.includes(token)) {
    add("SAFE", id, fileLabel + " no longer contains " + token);
  } else {
    add("FAIL", id, fileLabel + " still contains " + token);
  }
}

console.log("");
console.log("Account Snapshot Extra Table Layout Audit");
console.log("Version: account-snapshot-extra-table-layout-audit-003-css-owned-report-columns");

mustContain(js, "function cleanSnapshotTableText(value)", "account-snapshot-table-function-cleanSnapshotTableText-value", "account.js");
mustContain(js, "account-snapshot-object-cell-normalizer-0703", "account-snapshot-table-account-snapshot-object-cell-normalizer-0703", "account.js");
mustContain(js, "account-snapshot-text-spacing-normalizer-0703", "account-snapshot-table-text-spacing-normalizer-0703", "account.js");
mustContain(js, "const directKeys = [", "account-snapshot-table-const-directKeys", "account.js");
mustContain(js, "Object.entries(input)", "account-snapshot-table-Object-entries-input", "account.js");
mustContain(js, 'humanizeKey(key) + ": " + normalized', "account-snapshot-table-humanizeKey-key-normalized", "account.js");
mustContain(js, 'replace(/<[^>]*>/g, " ")', "account-snapshot-table-html-stripped-with-spacing", "account.js");
mustContain(js, "replace(/([a-z0-9])([A-Z])/g", "account-snapshot-table-camelcase-spacing", "account.js");

mustContain(html, "account-snapshot-detail-css-table-layout-0703", "account-snapshot-css-layout-marker", "account/index.html");
mustContain(html, "account-snapshot-detail-report-column-layout-0703", "account-snapshot-report-column-layout-marker", "account/index.html");
mustContain(html, "min-width: 1040px", "account-snapshot-report-table-min-width", "account/index.html");
mustContain(html, "nth-child(5)", "account-snapshot-report-five-column-widths", "account/index.html");
mustContain(html, "width: 36%", "account-snapshot-report-detail-column-width", "account/index.html");
mustContain(html, "/assets/account.js?v=account-snapshot-report-column-layout-0703", "account-index-cache-bust", "account/index.html");

mustNotContain(js, "[object Object]", "account-snapshot-no-crush-object-Object", "account.js");
mustNotContain(js, "overflow-wrap:anywhere", "account-snapshot-no-js-crush-overflow-wrap-anywhere", "account.js");
mustNotContain(js, "word-break:break-word", "account-snapshot-no-js-crush-word-break-break-word", "account.js");
mustNotContain(js, "table-layout:fixed; width:100%", "account-snapshot-no-js-fixed-table-layout", "account.js");

let counts = { SAFE: 0, FAIL: 0, WATCH: 0 };
for (const check of checks) {
  counts[check.status] = (counts[check.status] || 0) + 1;
  console.log(check.status + ": " + check.id + " - " + check.detail);
}

console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL > 0) {
  process.exit(1);
}
