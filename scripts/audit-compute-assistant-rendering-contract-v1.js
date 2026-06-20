const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

function exists(file) {
  return fs.existsSync(file);
}

function linkedCss(html) {
  const out = [];
  const re = /<link\b[^>]*href=["']([^"']+\.css[^"']*)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) out.push(match[1]);
  return out;
}

function stripQuery(src) {
  return String(src || "").split("?")[0].replace(/^\//, "");
}

const REQUIRED_CLASSES = [
  ".scopedlabs-result-summary-card",
  ".scopedlabs-result-summary-top",
  ".scopedlabs-result-summary-title",
  ".scopedlabs-result-summary-subtitle",
  ".scopedlabs-result-summary-status",
  ".scopedlabs-result-summary-grid",
  ".scopedlabs-result-summary-item",
  ".scopedlabs-result-summary-note"
];

let pass = 0;
let fail = 0;

function check(id, ok, file, detail) {
  if (ok) pass += 1;
  else fail += 1;

  console.log("[" + (ok ? "PASS" : "FAIL") + "] " + id);
  console.log("  " + file);
  console.log("  " + detail);
}

console.log("SCOPEDLABS COMPUTE ASSISTANT RENDERING CONTRACT AUDIT V1\n");

const ramHtml = read("tools/compute/ram-sizing/index.html");
const assistant = read("assets/scopedlabs-compute-assistant-contract.js");
const sharedCss = read("assets/scopedlabs-compute-result-visuals.css");

const ramCssFiles = linkedCss(ramHtml).map(stripQuery);
const ramLoadsSharedCss = ramCssFiles.includes("assets/scopedlabs-compute-result-visuals.css");
const sharedCssHasClasses = REQUIRED_CLASSES.every((cls) => sharedCss.includes(cls));

const ramRoute = assistant.indexOf('toolSlug === "ram-sizing"');
const ramRenderer = assistant.indexOf("renderComputeRamTopSummaryCard(data)");
const fallback = assistant.indexOf("ScopedLabsLocalAssistant.mount");

check(
  "RAM_LOADS_SHARED_COMPUTE_RESULT_VISUAL_CSS",
  ramLoadsSharedCss,
  "tools/compute/ram-sizing/index.html",
  "RAM must load the shared Compute result visual CSS owner used for assistant summary-card classes."
);

check(
  "SHARED_COMPUTE_CSS_OWNS_ASSISTANT_SUMMARY_CARD_CLASSES",
  exists("assets/scopedlabs-compute-result-visuals.css") && sharedCssHasClasses,
  "assets/scopedlabs-compute-result-visuals.css",
  "Shared Compute CSS must define the result-summary card, grid, item, status, and note classes so tools do not rely on CPU page-local CSS."
);

check(
  "RAM_ASSISTANT_USES_CUSTOM_RENDERER_BEFORE_GENERIC_FALLBACK",
  ramRoute !== -1 && ramRenderer !== -1 && fallback !== -1 && ramRoute < fallback && ramRenderer < fallback,
  "assets/scopedlabs-compute-assistant-contract.js",
  "RAM must route to renderComputeRamTopSummaryCard(data) before falling through to the generic Local Assistant bullet/list renderer."
);

check(
  "CPU_ASSISTANT_CUSTOM_RENDERER_REMAINS_PRESENT",
  assistant.includes("function renderComputeCpuTopSummaryCard") &&
    assistant.includes("renderComputeCpuTopSummaryCard(data)"),
  "assets/scopedlabs-compute-assistant-contract.js",
  "CPU custom summary-card renderer must remain intact while RAM adopts the shared summary-card contract."
);

check(
  "RAM_ASSISTANT_CSS_CACHE_BUST_UPDATED",
  ramHtml.includes("scopedlabs-compute-result-visuals.css?v=scopedlabs-compute-result-visuals-0620-"),
  "tools/compute/ram-sizing/index.html",
  "RAM must cache-bust the shared Compute result visual CSS using the active 0620 Compute proof-stack CSS version family."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
