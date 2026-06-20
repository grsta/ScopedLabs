const fs = require("fs");

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    : "";
}

let pass = 0;
let fail = 0;

function check(id, ok, file, detail) {
  if (ok) pass += 1;
  else fail += 1;

  console.log("[" + (ok ? "PASS" : "FAIL") + "] " + id);
  console.log("  " + file);
  console.log("  " + detail);
}

function indexOfToken(source, token) {
  const index = source.indexOf(token);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

console.log("SCOPEDLABS COMPUTE PLANNER/SUMMARY PIPELINE NAV AUDIT V1\n");

const pipelines = read("assets/pipelines.js");
const renderer = read("assets/pipeline.js");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

const plannerIndex = indexOfToken(pipelines, 'id: "workload-planner"');
const cpuIndex = indexOfToken(pipelines, 'id: "cpu-sizing"');
const backupIndex = indexOfToken(pipelines, 'id: "backup-window"');
const summaryIndex = indexOfToken(pipelines, 'id: "summary"');

check(
  "COMPUTE_PIPELINE_HAS_PLANNER_AND_SUMMARY_ENDPOINTS",
  pipelines.includes('{ id: "workload-planner", label: "Planner", href: "/tools/compute/", categoryEndpoint: "planner" }') &&
    pipelines.includes('{ id: "summary", label: "Summary", href: "/tools/compute/summary/", categoryEndpoint: "summary" }'),
  "assets/pipelines.js",
  "Compute pipeline must expose Planner and Summary as clickable category endpoints."
);

check(
  "COMPUTE_PIPELINE_ENDPOINT_ORDER_IS_VALID",
  plannerIndex < cpuIndex && cpuIndex < backupIndex && backupIndex < summaryIndex,
  "assets/pipelines.js",
  "Compute pipeline order must be Planner, tool steps, then Summary."
);

check(
  "PIPELINE_RENDERER_TREATS_CATEGORY_ENDPOINTS_SEMANTICALLY",
  renderer.includes("const isCategoryEndpoint = !!(step && step.categoryEndpoint);") &&
    renderer.includes('a.classList.add("is-category-endpoint");') &&
    renderer.includes('a.setAttribute("data-category-endpoint", String(step.categoryEndpoint));') &&
    renderer.includes("const isPast = !isCategoryEndpoint &&"),
  "assets/pipeline.js",
  "Shared pipeline renderer must mark Planner/Summary as category endpoints and avoid treating them as normal completed calculator steps."
);

const toolPages = [
  "tools/compute/cpu-sizing/index.html",
  "tools/compute/ram-sizing/index.html",
  "tools/compute/storage-iops/index.html",
  "tools/compute/storage-throughput/index.html",
  "tools/compute/vm-density/index.html",
  "tools/compute/gpu-vram/index.html",
  "tools/compute/power-thermal/index.html",
  "tools/compute/raid-rebuild-time/index.html",
  "tools/compute/backup-window/index.html",
  "tools/compute/workload-planner/index.html"
].filter((file) => fs.existsSync(file));

check(
  "COMPUTE_TOOL_PAGES_MOUNT_SHARED_PIPELINE",
  toolPages.every((file) => {
    const html = read(file);
    return html.includes("/assets/pipelines.js?v=compute-planner-summary-nav-0620") &&
      html.includes("/assets/pipeline.js?v=compute-planner-summary-nav-0620");
  }),
  "tools/compute/*/index.html",
  "Compute pipeline-consuming pages must cache-bust the Planner/Summary nav update."
);

check(
  "NO_COMPUTE_TOOL_PAGE_HAS_PAGE_LOCAL_PLANNER_SUMMARY_FAKE_NAV",
  toolPages.every((file) => {
    const html = read(file);
    return !html.includes('data-page-local-planner-summary-nav') &&
      !html.includes('compute-fake-planner-summary-nav');
  }),
  "tools/compute/*/index.html",
  "Planner/Summary links must come from shared pipeline nav, not page-local fake navigation."
);

check(
  "MODULE_MAP_RECORDS_COMPUTE_PLANNER_SUMMARY_PIPELINE_NAV",
  moduleMap.includes("### Compute Planner/Summary pipeline nav") &&
    moduleMap.includes("audit-compute-planner-summary-pipeline-nav-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document Compute Planner/Summary pipeline nav contract and audit."
);

check(
  "BATCH_RUNNER_INCLUDES_COMPUTE_PLANNER_SUMMARY_PIPELINE_NAV_AUDIT",
  batch.includes("scripts/audit-compute-planner-summary-pipeline-nav-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "Closeout batch runner must include Compute Planner/Summary pipeline nav audit."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
