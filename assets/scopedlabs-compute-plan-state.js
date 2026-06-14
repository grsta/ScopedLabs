(function () {
  "use strict";

  var CATEGORY = "compute";
  var CONTRACT = "scopedlabs.compute.workload-plan.v1";
  var PLAN_KEY = "scopedlabs:pipeline:compute:workload-plan";
  var ACTIVE_KEY = "scopedlabs:pipeline:compute:active-workload";
  var CONTEXT_KEY = "scopedlabs:pipeline:compute:workload-context";

  function now() {
    return new Date().toISOString();
  }

  function safeParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function createId() {
    return "cw-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function defaultPlan() {
    return {
      contract: CONTRACT,
      category: CATEGORY,
      activeWorkloadId: null,
      workloads: [],
      results: {},
      updatedAt: now()
    };
  }

  function normalizePlan(plan) {
    var next = plan && typeof plan === "object" ? plan : defaultPlan();
    next.contract = CONTRACT;
    next.category = CATEGORY;
    next.workloads = Array.isArray(next.workloads) ? next.workloads : [];
    next.results = next.results && typeof next.results === "object" ? next.results : {};
    next.updatedAt = next.updatedAt || now();
    return next;
  }

  function load() {
    return normalizePlan(safeParse(localStorage.getItem(PLAN_KEY), null));
  }

  function save(plan) {
    var next = normalizePlan(plan);
    next.updatedAt = now();
    localStorage.setItem(PLAN_KEY, JSON.stringify(next));
    sessionStorage.setItem(PLAN_KEY, JSON.stringify(next));
    return next;
  }

  function activeWorkload(plan) {
    var source = normalizePlan(plan || load());
    return source.workloads.find(function (item) {
      return item.id === source.activeWorkloadId;
    }) || source.workloads[0] || null;
  }

  function writeContext(workload, plan) {
    if (!workload) return null;

    var payload = {
      contract: "scopedlabs.compute.active-workload.v1",
      category: CATEGORY,
      sourceTool: "workload-planner",
      activeWorkloadId: workload.id,
      workload: workload,
      planUpdatedAt: plan && plan.updatedAt ? plan.updatedAt : now(),
      updatedAt: now()
    };

    sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(payload));
    return payload;
  }

  function branchSeeds(workload) {
    var branches = workload && workload.branches ? workload.branches : {};

    return {
      "vm-density": Boolean(branches.vmDensity),
      "gpu-vram": Boolean(branches.gpu),
      "nic-bonding": Boolean(branches.nicBonding),
      "backup-window": Boolean(branches.backup),
      "raid-rebuild-time": Boolean(branches.raid),
      "power-thermal": Boolean(branches.powerThermal),
      "storage-iops": Boolean(branches.storageHeavy),
      "storage-throughput": Boolean(branches.storageHeavy)
    };
  }

  function writeBranchSeeds(workload) {
    if (!workload) return [];

    var seeds = branchSeeds(workload);
    var written = [];

    Object.keys(seeds).forEach(function (toolSlug) {
      if (!seeds[toolSlug]) return;

      var payload = {
        contract: "scopedlabs.compute.branch-seed." + toolSlug + ".v1",
        category: CATEGORY,
        sourceTool: "workload-planner",
        branchTool: toolSlug,
        workloadId: workload.id,
        workloadName: workload.name,
        planningPath: workload.planningPath,
        workloadType: workload.workloadType,
        criticality: workload.criticality,
        primaryConstraint: workload.primaryConstraint,
        updatedAt: now()
      };

      var key = "scopedlabs:pipeline:compute:branch-seed:" + toolSlug;
      sessionStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem(key, JSON.stringify(payload));
      written.push(toolSlug);
    });

    return written;
  }

  function upsertWorkload(workload) {
    var plan = load();
    var next = Object.assign({}, workload || {});
    next.id = next.id || createId();
    next.name = next.name || "Compute Workload";
    next.updatedAt = now();
    next.createdAt = next.createdAt || now();

    var index = plan.workloads.findIndex(function (item) {
      return item.id === next.id;
    });

    if (index >= 0) plan.workloads[index] = next;
    else plan.workloads.push(next);

    plan.activeWorkloadId = next.id;
    plan = save(plan);
    writeContext(next, plan);
    writeBranchSeeds(next);

    return { plan: plan, workload: next };
  }

  function setActiveWorkload(id) {
    var plan = load();
    var match = plan.workloads.find(function (item) {
      return item.id === id;
    });

    if (!match) return null;

    plan.activeWorkloadId = id;
    plan = save(plan);
    writeContext(match, plan);
    writeBranchSeeds(match);
    return match;
  }

  function recordToolResult(toolSlug, result) {
    var plan = load();
    var active = activeWorkload(plan);
    var workloadId = active ? active.id : "unscoped";

    plan.results[workloadId] = plan.results[workloadId] || {};
    plan.results[workloadId][toolSlug] = {
      contract: "scopedlabs.compute.tool-result." + toolSlug + ".v1",
      category: CATEGORY,
      tool: toolSlug,
      workloadId: workloadId,
      result: result || {},
      updatedAt: now()
    };

    return save(plan);
  }

  function reset() {
    localStorage.removeItem(PLAN_KEY);
    sessionStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(CONTEXT_KEY);
    sessionStorage.removeItem(CONTEXT_KEY);
    return defaultPlan();
  }

  window.ScopedLabsComputePlanState = Object.freeze({
    version: "scopedlabs-compute-plan-state-001",
    contract: CONTRACT,
    keys: Object.freeze({
      plan: PLAN_KEY,
      active: ACTIVE_KEY,
      context: CONTEXT_KEY
    }),
    load: load,
    save: save,
    activeWorkload: activeWorkload,
    upsertWorkload: upsertWorkload,
    setActiveWorkload: setActiveWorkload,
    writeContext: writeContext,
    writeBranchSeeds: writeBranchSeeds,
    recordToolResult: recordToolResult,
    reset: reset
  });
})();