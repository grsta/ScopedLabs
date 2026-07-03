const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "assets", "account.js"), "utf8");
const html = fs.readFileSync(path.join(root, "account", "index.html"), "utf8");

const checks = [];

function add(status, id, detail) {
  checks.push({ status, id, detail });
}

function mustContain(source, token, id, fileLabel) {
  if (source.includes(token)) add("SAFE", id, fileLabel + " contains " + token);
  else add("FAIL", id, fileLabel + " missing " + token);
}

function mustNotContain(source, token, id, fileLabel) {
  if (!source.includes(token)) add("SAFE", id, fileLabel + " no longer contains " + token);
  else add("FAIL", id, fileLabel + " still contains " + token);
}

console.log("");
console.log("Account Snapshot Extra Table Layout Audit");
console.log("Version: account-snapshot-extra-table-layout-audit-004-stable-controller-css-columns");

mustContain(js, "function cleanSnapshotTableText(value)", "account-snapshot-table-cleanSnapshotTableText", "account.js");
mustContain(js, "account-snapshot-object-cell-normalizer-0703", "account-snapshot-object-normalizer", "account.js");
mustContain(js, "Object.entries(", "account-snapshot-object-entry-flattening", "account.js");
mustContain(js, "humanizeKey", "account-snapshot-humanized-object-keys", "account.js");

mustContain(html, "account-snapshot-detail-css-table-layout-0703", "account-snapshot-css-layout-marker", "account/index.html");
mustContain(html, "account-snapshot-detail-report-column-layout-0703", "account-snapshot-report-column-layout-marker", "account/index.html");
mustContain(html, "min-width: 1040px", "account-snapshot-report-table-min-width", "account/index.html");
mustContain(html, "nth-child(5)", "account-snapshot-report-five-column-widths", "account/index.html");
mustContain(html, "width: 36%", "account-snapshot-report-detail-column-width", "account/index.html");
mustContain(html, "/assets/account.js?v=account-snapshot-report-column-layout-stable-0703", "account-index-cache-bust", "account/index.html");

mustNotContain(js, "[object Object]", "account-snapshot-no-object-object-literal", "account.js");
mustNotContain(js, "account-snapshot-wide-report-table-layout-0703", "account-snapshot-old-wide-js-removed", "account.js");
mustNotContain(js, "account-snapshot-wide-report-table-layout-safe-0703", "account-snapshot-safe-wide-js-removed", "account.js");
mustNotContain(js, "observer.observe(detail", "account-snapshot-no-detail-observer-loop", "account.js");

let counts = { SAFE: 0, FAIL: 0, WATCH: 0 };
for (const check of checks) {
  counts[check.status] = (counts[check.status] || 0) + 1;
  console.log(check.status + ": " + check.id + " - " + check.detail);
}

console.log("");
console.log("Summary:", JSON.stringify(counts));
if (counts.FAIL > 0) process.exit(1);
