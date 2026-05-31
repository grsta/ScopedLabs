const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-summary-pipeline-width-audit-002";
const CACHE = "physical-security-summary-pipeline-width-002";

function read(rel) {
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(target)) throw new Error("Missing " + rel);
  return fs.readFileSync(target, "utf8");
}

const pipeline = read("assets/pipeline.js");
const summaryIndex = read("tools/physical-security/summary/index.html");

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function has(id, sourceName, source, signal) {
  const ok = source.includes(signal);
  add(id, ok ? "SAFE" : "FAIL", ok ? sourceName + " contains " + signal : sourceName + " missing " + signal);
}

has("pipeline-summary-heading-wrapper", "pipeline.js", pipeline, 'h1.closest(".summary-page-heading")');
has("pipeline-wrapper-after-heading", "pipeline.js", pipeline, 'headingWrapper.insertAdjacentElement("afterend", wrap);');
has("pipeline-fallback-original", "pipeline.js", pipeline, 'h1.insertAdjacentElement("afterend", wrap);');
has("summary-heading-wrapper-exists", "Summary index", summaryIndex, "summary-page-heading");
has("summary-pipeline-cache", "Summary index", summaryIndex, "/assets/pipeline.js?v=" + CACHE);

const physicalSecurityRoot = path.join(ROOT, "tools/physical-security");
const htmlFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }

    if (entry.isFile() && entry.name === "index.html") {
      htmlFiles.push(abs);
    }
  }
}

walk(physicalSecurityRoot);

for (const abs of htmlFiles) {
  const rel = path.relative(ROOT, abs).replaceAll(path.sep, "/");
  const html = fs.readFileSync(abs, "utf8");

  if (!html.includes("/assets/pipeline.js")) {
    add("page-no-pipeline-" + rel.replace(/[^a-z0-9]+/gi, "-"), "WATCH", rel + " does not load pipeline.js");
    continue;
  }

  has(
    "page-cache-" + rel.replace(/[^a-z0-9]+/gi, "-"),
    rel,
    html,
    "/assets/pipeline.js?v=" + CACHE
  );
}

const counts = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Physical Security Summary Pipeline Width Audit");
console.log("Version:", VERSION);
console.table(rows);
console.log("");
console.log("Summary:");
console.log("- SAFE:", counts.SAFE || 0);
console.log("- WATCH:", counts.WATCH || 0);
console.log("- FAIL:", counts.FAIL || 0);

if (counts.FAIL) process.exit(1);
