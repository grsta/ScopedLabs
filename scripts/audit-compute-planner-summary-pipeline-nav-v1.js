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
  pipelines.includes('id: "workload-planner"') &&
    pipelines.includes('label: "Workload Planner"') &&
    pipelines.includes('categoryEndpoint: "planner"') &&
    pipelines.includes('id: "summary"') &&
    pipelines.includes('categoryEndpoint: "summary"'),
  "assets/pipelines.js",
  "Compute pipeline must expose Workload Planner and Summary as clickable category endpoints."
);

check(
  "COMPUTE_PIPELINE_ENDPOINT_ORDER_IS_VALID",
  plannerIndex < cpuIndex && cpuIndex < summaryIndex && summaryIndex < backupIndex,
  "assets/pipelines.js",
  "Compute pipeline order must be Planner, core tool steps, Summary, then optional specialty tools."
);


check(
  "COMPUTE_PIPELINE_USES_ACCESS_STYLE_GROUPS",
  pipelines.includes('flowGroup: "foundation"') &&
    pipelines.includes('flowGroupLabel: "FOUNDATION"') &&
    pipelines.includes('flowGroupLabel: "CORE COMPUTE PIPELINE"') &&
    pipelines.includes('flowGroupLabel: "OPTIONAL SPECIALTY ZONES"') &&
    pipelines.includes('flowGroupDescription: "Create or select the compute workload being planned."') &&
    pipelines.includes('flowGroupDescription: "Run this path for normal compute sizing and carry each result into the next planning step."'),
  "assets/pipelines.js",
  "Compute pipeline must use the same grouped foundation/core/optional structure as Access, with Compute-specific labels."
);

check(
  "COMPUTE_PLANNER_NOT_IN_FLAT_CORE_ROW",
  pipelines.indexOf('id: "workload-planner"') < pipelines.indexOf('id: "cpu-sizing"') &&
    pipelines.includes('id: "workload-planner"') &&
    pipelines.includes('flowGroup: "foundation"') &&
    pipelines.includes('id: "cpu-sizing"') &&
    pipelines.includes('flowGroup: "core"') &&
    pipelines.includes('id: "gpu-vram"') &&
    pipelines.includes('flowGroup: "optional-specialty-zone"'),
  "assets/pipelines.js",
  "Planner must be isolated in the Foundation group, core tools must be core, and GPU/RAID/Backup tools must be optional specialty."
);

check(
  "PIPELINE_RENDERER_SUPPORTS_GROUP_SPECIFIC_LABELS",
  renderer.includes("const representativeStep = groupSteps.find(function") &&
    renderer.includes("const resolvedLabel = representativeStep.flowGroupLabel") &&
    renderer.includes("const resolvedDescription = representativeStep.flowGroupDescription") &&
    renderer.includes("groupTitle.textContent = resolvedLabel") &&
    renderer.includes("groupDescription.textContent = resolvedDescription"),
  "assets/pipeline.js",
  "Shared pipeline renderer must allow category-specific grouped labels/descriptions without hardcoding Access labels for Compute."
);

check(
  "FOUNDATION_PROGRESS_CAN_COMPLETE_ACROSS_GROUPS",
  renderer.includes('stepGroup === "foundation"') &&
    renderer.includes('currentGroup !== "foundation"') &&
    renderer.includes('currentGroup !== "optional-specialty-zone"'),
  "assets/pipeline.js",
  "Foundation Planner should be able to glow as complete when the user is in core Compute steps."
);

check(
  "PIPELINE_RENDERER_USES_STABLE_INDEXED_STEP_PROGRESS",
  renderer.includes("Number.isInteger(step && step.__slIndex) ? step.__slIndex : steps.indexOf(step)") &&
    renderer.includes("const isPast = !isSummaryEndpoint &&") &&
    renderer.includes('if (isPast) a.classList.add("is-complete");') &&
    renderer.includes('if (isCurrent) a.classList.add("is-current");') &&
    renderer.includes('if (isFuture) a.classList.add("is-future");') &&
    !renderer.includes("isCurrentOnlyProgress") &&
    !renderer.includes("progressMode"),
  "assets/pipeline.js",
  "Renderer must preserve progress LEDs using stable indexed step positions, allow Planner to complete as a past endpoint, and keep Summary as a future endpoint until reached."
);


check(
  "COMPUTE_PLANNER_ENDPOINT_PARTICIPATES_IN_PROGRESS",
  renderer.includes('const isSummaryEndpoint = step && step.categoryEndpoint === "summary";') &&
    renderer.includes("const isPast = !isSummaryEndpoint &&") &&
    renderer.includes('a.setAttribute("data-category-endpoint", String(step.categoryEndpoint));'),
  "assets/pipeline.js",
  "Planner must remain a category endpoint link while still participating in normal past/completed pipeline progress; Summary is the endpoint excluded from auto-complete."
);
check(
  "PIPELINE_RENDERER_TREATS_CATEGORY_ENDPOINTS_SEMANTICALLY",
  renderer.includes("const isCategoryEndpoint = !!(step && step.categoryEndpoint);") &&
    renderer.includes('a.classList.add("is-category-endpoint");') &&
    renderer.includes('a.setAttribute("data-category-endpoint", String(step.categoryEndpoint));'),
  "assets/pipeline.js",
  "Shared pipeline renderer must mark Planner/Summary as category endpoints."
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
  "COMPUTE_PIPELINE_PAGES_CACHE_BUST_INDEX_FIX",
  toolPages.every((file) => {
    const html = read(file);
    return html.includes("/assets/pipelines.js?v=compute-grouped-pipeline-nav-0620") &&
      html.includes("/assets/pipeline.js?v=compute-grouped-pipeline-nav-0620");
  }),
  "tools/compute/*/index.html",
  "Compute pipeline-consuming pages must cache-bust the Planner endpoint progress fix."
);

check(
  "NO_PAGE_LOCAL_PLANNER_SUMMARY_FAKE_NAV",
  toolPages.every((file) => {
    const html = read(file);
    return !html.includes("data-page-local-planner-summary-nav") &&
      !html.includes("compute-fake-planner-summary-nav");
  }),
  "tools/compute/*/index.html",
  "Planner/Summary links must come from shared pipeline nav, not page-local fake navigation."
);

check(
  "MODULE_MAP_RECORDS_COMPUTE_PIPELINE_INDEX_FIX",
  moduleMap.includes("### Compute pipeline indexed progress fix") &&
    moduleMap.includes("audit-compute-planner-summary-pipeline-nav-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document the Compute Planner/Summary pipeline index fix."
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
