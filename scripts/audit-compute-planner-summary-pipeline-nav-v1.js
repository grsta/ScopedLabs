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
const planState = read("assets/scopedlabs-compute-plan-state.js");
const plannerShell = read("assets/scopedlabs-category-planner-shell.js");
const plannerAdapter = read("assets/scopedlabs-compute-planner-adapter.js");
const moduleMap = read("docs/scopedlabs-module-map.md");
const batch = read("scripts/run-scopedlabs-audit-batch-v1.js");

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

const plannerIndex = indexOfToken(pipelines, 'id: "workload-planner"');
const cpuIndex = indexOfToken(pipelines, 'id: "cpu-sizing"');
const backupIndex = indexOfToken(pipelines, 'id: "backup-window"');
const summaryIndex = indexOfToken(pipelines, 'id: "summary"');

check(
  "COMPUTE_PIPELINE_HAS_PLANNER_AND_SUMMARY_ENDPOINTS",
  pipelines.includes('id: "workload-planner"') &&
    pipelines.includes('label: "Compute Workload Planner"') &&
    pipelines.includes('categoryEndpoint: "planner"') &&
    pipelines.includes('id: "summary"') &&
    pipelines.includes('categoryEndpoint: "summary"'),
  "assets/pipelines.js",
  "Compute pipeline must expose Compute Workload Planner and Summary as clickable category endpoints."
);

check(
  "COMPUTE_PIPELINE_ENDPOINT_ORDER_IS_VALID",
  plannerIndex < cpuIndex && cpuIndex < summaryIndex && summaryIndex < backupIndex,
  "assets/pipelines.js",
  "Compute pipeline order must be Planner, core tool steps, Summary, then optional specialty tools."
);

check(
  "COMPUTE_FOUNDATION_LABEL_IS_DYNAMIC_WORKLOAD_PLANNER",
  pipelines.includes('flowGroupLabel: "Compute Workload Planner"') &&
    !pipelines.includes('flowGroupLabel: "FOUNDATION",\n              flowGroupDescription: "Create or select the compute workload being planned."'),
  "assets/pipelines.js",
  "Compute foundation group must display Compute Workload Planner, not a generic Foundation label."
);

check(
  "COMPUTE_PIPELINE_USES_ACCESS_STYLE_GROUPS",
  pipelines.includes('flowGroup: "foundation"') &&
    pipelines.includes('flowGroupLabel: "Compute Workload Planner"') &&
    pipelines.includes('flowGroupLabel: "CORE COMPUTE PIPELINE"') &&
    pipelines.includes('flowGroupLabel: "OPTIONAL SPECIALTY ZONES"') &&
    pipelines.includes('flowGroupDescription: "Create or select the compute workload being planned."') &&
    pipelines.includes('flowGroupDescription: "Run this path for normal compute sizing and carry each result into the next planning step."'),
  "assets/pipelines.js",
  "Compute pipeline must use grouped planner/core/optional structure with Compute-specific labels."
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
  "Planner must be isolated in the dynamic planner group, core tools must be core, and GPU/RAID/Backup tools must be optional specialty."
);

check(
  "PIPELINE_RENDERER_SUPPORTS_GROUP_SPECIFIC_LABELS",
  renderer.includes("const representativeStep = groupSteps.find(function") &&
    renderer.includes("const resolvedLabel = representativeStep.flowGroupLabel") &&
    renderer.includes("const resolvedDescription = representativeStep.flowGroupDescription") &&
    renderer.includes("groupLabel.textContent = resolvedLabel") &&
    renderer.includes("desc.textContent = resolvedDescription"),
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
  "COMPUTE_PLAN_STATE_DISPATCHES_WORKLOAD_NAV_EVENTS",
  planState.includes('var PLAN_CHANGE_EVENT = "scopedlabs:compute:workload-plan-change"') &&
    planState.includes("function emitPlanChange(") &&
    planState.includes("function onPlanChange(") &&
    planState.includes('emitPlanChange("save"') &&
    planState.includes('emitPlanChange("remove"') &&
    planState.includes('emitPlanChange("reset"'),
  "assets/scopedlabs-compute-plan-state.js",
  "Compute plan state must dispatch shared workload-plan change events when workloads are saved, selected, removed, or reset."
);

check(
  "COMPUTE_PLAN_STATE_OWNS_DYNAMIC_WORKLOAD_PLANNER_NAV",
  planState.includes("function renderWorkloadPlannerNav(") &&
    planState.includes("function bindWorkloadPlannerNav(") &&
    planState.includes("function bindAllWorkloadPlannerNavs(") &&
    planState.includes("data-compute-workload-nav-item") &&
    planState.includes("setActiveWorkload(id)") &&
    planState.includes("workloads.forEach(function (workload"),
  "assets/scopedlabs-compute-plan-state.js",
  "Shared Compute plan-state module must render the saved workload nav list and active workload state."
);

check(
  "COMPUTE_PLAN_STATE_OWNS_REMOVE_WORKLOAD",
  planState.includes("function removeWorkload(") &&
    planState.includes("localStorage.removeItem(ACTIVE_KEY)") &&
    planState.includes("sessionStorage.removeItem(CONTEXT_KEY)") &&
    planState.includes("removeWorkload: removeWorkload"),
  "assets/scopedlabs-compute-plan-state.js",
  "Deleting workloads must go through shared state so the active workload and nav update consistently."
);

check(
  "PIPELINE_RENDERER_DELEGATES_COMPUTE_FOUNDATION_TO_DYNAMIC_NAV",
  renderer.includes('category === "compute"') &&
    renderer.includes('data-compute-workload-planner-nav-pipeline') &&
    renderer.includes("ScopedLabsComputePlanState.bindWorkloadPlannerNav") &&
    renderer.includes('group.setAttribute("data-pipeline-group", "Compute Workload Planner")'),
  "assets/pipeline.js",
  "Shared pipeline renderer must delegate the Compute foundation group to the dynamic workload planner nav."
);

check(
  "PLANNER_SHELL_SUPPORTS_DYNAMIC_WORKLOAD_NAV_MOUNT",
  plannerShell.includes("section.dynamicWorkloadPlanner") &&
    plannerShell.includes("data-compute-workload-planner-nav") &&
    plannerShell.includes("data-compute-workload-planner-title"),
  "assets/scopedlabs-category-planner-shell.js",
  "Category planner shell must support a dynamic workload planner nav mount instead of only static flow steps."
);

check(
  "COMPUTE_PLANNER_ADAPTER_USES_DYNAMIC_WORKLOAD_NAV",
  plannerAdapter.includes('label: "Compute Workload Planner"') &&
    plannerAdapter.includes("dynamicWorkloadPlanner: true") &&
    !plannerAdapter.includes('label: "FOUNDATION"'),
  "assets/scopedlabs-compute-planner-adapter.js",
  "Compute workload planner page must use the dynamic workload nav section instead of a static Foundation label."
);

check(
  "COMPUTE_PLANNER_DELETE_USES_SHARED_REMOVE_WORKLOAD",
  plannerAdapter.includes("State.removeWorkload(id)") &&
    plannerAdapter.includes("clearForm();") &&
    plannerAdapter.includes('status("Compute workload deleted.")'),
  "assets/scopedlabs-compute-planner-adapter.js",
  "Planner delete must use shared removeWorkload so deleted workloads disappear from all dynamic navs."
);

check(
  "COMPUTE_WORKLOAD_NAV_LINKS_TO_PLANNER_WITH_ACTIVE_ONLY_GLOW",
  planState.includes("function renderWorkloadPlannerNav(") &&
    planState.includes("data-compute-workload-nav-item") &&
    planState.includes("setActiveWorkload(id)") &&
    planState.includes("isActive ? ' is-current' : ' is-future'") &&
    !planState.includes("isActive ? ' is-current' : ' is-complete'") &&
    !planState.includes("event.preventDefault();"),
  "assets/scopedlabs-compute-plan-state.js",
  "Saved workload nav items must link back to the planner, set active workload on click, and only glow the actual active workload."
);

check(
  "COMPUTE_WORKLOAD_NAV_REMOVES_ACTIVE_SENTENCE_AND_SEPARATORS",
  planState.includes('rows.push(\'<div class="sl-pipeline-group-label"') &&
    !planState.includes('Active: " + workloadDisplayTitle(active)') &&
    !planState.includes('rows.push(\'<div class="sl-pipeline-group-description"') &&
    !planState.includes('rows.push(\'<span class="sl-pipeline-sep"'),
  "assets/scopedlabs-compute-plan-state.js",
  "Compute workload planner nav should not show the extra Active sentence or separator arrows between saved workloads."
);

check(
  "COMPUTE_PLAN_STATE_CACHE_BUSTS_WORKLOAD_NAV_LINKS",
  toolPages.every((file) => {
    const html = read(file);
    return html.includes("/assets/scopedlabs-compute-plan-state.js?v=scopedlabs-compute-plan-state-007-workload-nav-links");
  }),
  "tools/compute/*/index.html",
  "Compute pages must load the workload nav link cleanup version of the plan-state module."
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

check(
  "COMPUTE_PIPELINE_PAGES_CACHE_BUST_INDEX_FIX",
  toolPages.every((file) => {
    const html = read(file);
    return html.includes("/assets/pipelines.js?v=compute-dynamic-workload-planner-nav-0620") &&
      html.includes("/assets/pipeline.js?v=compute-dynamic-workload-planner-nav-0620");
  }),
  "tools/compute/*/index.html",
  "Compute pipeline-consuming pages must cache-bust the dynamic workload planner nav pipeline assets."
);

check(
  "NO_PAGE_LOCAL_PLANNER_SUMMARY_FAKE_NAV",
  toolPages.every((file) => {
    const html = read(file);
    return !html.includes("data-page-local-planner-summary-nav") &&
      !html.includes("compute-planner-summary-fake-nav");
  }),
  "tools/compute/*/index.html",
  "Planner/Summary nav must be rendered by shared pipeline assets, not page-local fake nav."
);

check(
  "MODULE_MAP_RECORDS_COMPUTE_DYNAMIC_PIPELINE_NAV",
  moduleMap.includes("### Compute dynamic workload planner nav") &&
    moduleMap.includes("assets/scopedlabs-compute-plan-state.js") &&
    moduleMap.includes("audit-compute-planner-summary-pipeline-nav-v1.js"),
  "docs/scopedlabs-module-map.md",
  "Module map must document the dynamic Compute workload planner nav shared owner."
);

check(
  "AUDIT_BATCH_INCLUDES_COMPUTE_PIPELINE_NAV",
  batch.includes("audit-compute-planner-summary-pipeline-nav-v1.js"),
  "scripts/run-scopedlabs-audit-batch-v1.js",
  "Audit batch should include Compute planner/summary pipeline nav gate."
);

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
