const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

function moduleParses(text) {
  try {
    new Function(text);
    return true;
  } catch (error) {
    return false;
  }
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
  html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-009-export-title-card-reference")
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


check(
  "Access Control polish module parses as JavaScript",
  moduleParses(polish)
);


check(
  "Access Control polish owns export title card reference",
  polish.includes("function applyExportCardTitleRhythm") &&
    polish.includes("access-control-export-title-card-reference-009") &&
    polish.includes("data-access-control-export-title-polished") &&
    polish.includes("access-control-tool-card-title")
);

check(
  "Export title rhythm uses existing shared card-title class",
  polish.includes('heading.classList.add("access-control-tool-card-title")') &&
    polish.includes('data-access-control-title-reference", "access-control-tool-card-title"')
);

check(
  "Lock Power loads export title card-reference polish module",
  html.includes("/assets/access-control-tool-polish.js?v=access-control-tool-polish-009-export-title-card-reference")
);

console.log("\nAccess Control export card polish audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log(`- SAFE: ${safe}`);
console.log(`- FAIL: ${fail}`);

if (failed) process.exit(1);
