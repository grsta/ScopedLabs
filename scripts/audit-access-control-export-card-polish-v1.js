const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

let failed = false;
const rows = [];

const polish = read("assets/access-control-tool-polish.js");
const html = read("tools/access-control/lock-power-budget/index.html");

check(
  "Access Control polish owns export decoration hiding",
  polish.includes("function applyExportCardPolish") &&
    polish.includes("access-control-export-card-polish-008")
);

check(
  "Export decoration hiding is marker-based",
  polish.includes("data-access-control-export-decoration-hidden")
);

check(
  "Export decoration hiding targets decorative export card pills only",
  polish.includes("#exportReport, #saveSnapshot") &&
    polish.includes('text === "documentation & export"')
);

check(
  "Lock Power loads current Access Control polish module",
  html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-008-hide-export-decoration-pill")
);

check(
  "Lock Power still keeps export/snapshot IDs",
  html.includes('id="exportReport"') &&
    html.includes('id="saveSnapshot"')
);

check(
  "Lock Power still keeps report metadata mount",
  html.includes('id="reportMetadataMount"')
);

console.log("\nAccess Control export card polish audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
