const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "shared-export-tool-notes-column-widths-audit-001";
const EXPORT_CACHE = "shared-export-025-tool-notes-column-widths";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const exportJs = read("assets/export.js");
const htmlFiles = walk(ROOT).filter((full) => /\.html$/i.test(full));
const exportRefFiles = htmlFiles
  .map((full) => path.relative(ROOT, full).replace(/\\/g, "/"))
  .filter((rel) => read(rel).includes("/assets/export.js?v="));

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("export-cache-marker", "export.js", exportJs, "shared-export-025-tool-notes-column-widths");
has("extra-table-class", "export.js", exportJs, "extra-export-table");
has("tool-notes-table-class", "export.js", exportJs, "extra-export-table--physical-security-tool-notes");
has("tool-notes-title-detection", "export.js", exportJs, "/physical security tool notes/i");
has("first-column-width", "export.js", exportJs, "width:18%;");
has("third-column-width", "export.js", exportJs, "width:64%;");
has("third-column-max-width", "export.js", exportJs, "max-width:0;");
has("third-column-wrap", "export.js", exportJs, "overflow-wrap:anywhere;");
has("third-column-word-break", "export.js", exportJs, "word-break:break-word;");

add(
  "export-ref-files-found",
  exportRefFiles.length > 0 ? "SAFE" : "FAIL",
  exportRefFiles.length + " HTML file(s) reference /assets/export.js"
);

const staleExportRefs = exportRefFiles.filter((rel) => !read(rel).includes("/assets/export.js?v=" + EXPORT_CACHE));
add(
  "export-ref-cache-updated",
  staleExportRefs.length === 0 ? "SAFE" : "FAIL",
  staleExportRefs.length === 0
    ? "All HTML export.js references use " + EXPORT_CACHE
    : "Stale export refs: " + staleExportRefs.join(", ")
);

const proofPath = path.join(ROOT, "scripts/audit-physical-security-summary-proof-v1.js");
if (fs.existsSync(proofPath)) {
  const proof = fs.readFileSync(proofPath, "utf8");
  has("summary-proof-export-cache", "Summary proof audit", proof, "/assets/export.js?v=" + EXPORT_CACHE);
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Shared Export Tool Notes Column Widths Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Export ref files:", exportRefFiles.length);
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
