const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "account-snapshot-extra-table-layout-audit-001";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const accountJs = read("assets/account.js");
const accountIndex = exists("account/index.html") ? read("account/index.html") : "";

const rows = [];

function add(name, status, detail) {
  rows.push({ name, status, detail });
}

[
  "function cleanSnapshotTableText(value)",
  "function normalizeSnapshotExtraTable(table, sectionTitle)",
  "function snapshotExtraCellStyle(isHeader)",
  "function renderSnapshotExtraTable(table, sectionTitle)",
  "sl-snapshot-extra-table",
  "sl-snapshot-tool-notes-table",
  "table-layout:fixed; width:100%",
  "<colgroup><col style=\"width:34%;\"><col style=\"width:22%;\"><col style=\"width:44%;\"></colgroup>",
  "headers = [headers[0] || \"Area / Zone\", \"Tool\", headers[1] || \"Tool-Specific Notes\"];",
  "return renderSnapshotExtraTable(table, section.title || \"\");",
  "overflow-wrap:anywhere",
  "data-label=\""
].forEach((signal) => {
  add(
    "account-snapshot-table-" + signal.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
    accountJs.includes(signal) ? "SAFE" : "FAIL",
    accountJs.includes(signal) ? "account.js contains " + signal : "account.js missing " + signal
  );
});

if (accountIndex) {
  add(
    "account-index-cache-bust",
    accountIndex.includes("/assets/account.js?v=account-snapshot-extra-table-layout-001") ? "SAFE" : "WATCH",
    accountIndex.includes("/assets/account.js?v=account-snapshot-extra-table-layout-001")
      ? "account/index.html references the snapshot table layout account.js cache"
      : "account/index.html did not expose an account.js cache token to update"
  );
} else {
  add("account-index-present", "WATCH", "account/index.html was not available to audit");
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Account Snapshot Extra Table Layout Audit");
console.log("Version:", VERSION);
rows.forEach((row) => console.log(row.status + ": " + row.name + " - " + row.detail));
console.log("");
console.log("Summary:", JSON.stringify(counts));

if (counts.FAIL) process.exit(1);
