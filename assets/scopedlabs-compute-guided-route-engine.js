(function () {
  var VERSION = "scopedlabs-compute-guided-route-engine-001";
  var CATEGORY = "compute";
  var SUMMARY_TOOL = "summary";
  var SUMMARY_HREF = "/tools/compute/summary/";

  var TOOL_LABELS = {
    "cpu-sizing": "CPU Sizing",
    "ram-sizing": "RAM Sizing",
    "storage-iops": "Storage IOPS",
    "storage-throughput": "Storage Throughput",
    "vm-density": "VM Density",
    "gpu-vram": "GPU VRAM",
    "power-thermal": "Power & Thermal",
    "nic-bonding": "NIC Bonding",
    "raid-rebuild-time": "RAID Rebuild",
    "backup-window": "Backup Window",
    summary: "Compute Summary"
  };

  var TOOL_HREFS = {
    "cpu-sizing": "/tools/compute/cpu-sizing/",
    "ram-sizing": "/tools/compute/ram-sizing/",
    "storage-iops": "/tools/compute/storage-iops/",
    "storage-throughput": "/tools/compute/storage-throughput/",
    "vm-density": "/tools/compute/vm-density/",
    "gpu-vram": "/tools/compute/gpu-vram/",
    "power-thermal": "/tools/compute/power-thermal/",
    "nic-bonding": "/tools/compute/nic-bonding/",
    "raid-rebuild-time": "/tools/compute/raid-rebuild-time/",
    "backup-window": "/tools/compute/backup-window/",
    summary: SUMMARY_HREF
  };

  var BASE_TOOLS = ["cpu-sizing", "ram-sizing"];

  var BRANCH_TOOLS = [
    { key: "storageHeavy", tool: "storage-iops", label: "Storage IOPS", reason: "Storage or performance validation was selected in the planner." },
    { key: "storageHeavy", tool: "storage-throughput", label: "Storage Throughput", reason: "Storage or performance validation was selected in the planner." },
    { key: "vmDensity", tool: "vm-density", label: "VM Density", reason: "VM density or consolidation was selected in the planner." },
    { key: "gpu", tool: "gpu-vram", label: "GPU VRAM", reason: "GPU, AI, rendering, acceleration, or graphics memory was selected in the planner." },
    { key: "powerThermal", tool: "power-thermal", label: "Power & Thermal", reason: "Physical power, rack, or cooling validation was selected in the planner." },
    { key: "nicBonding", tool: "nic-bonding", label: "NIC Bonding", reason: "Redundant or high-throughput network path validation was selected in the planner." },
    { key: "raid", tool: "raid-rebuild-time", label: "RAID Rebuild", reason: "Local RAID or rebuild exposure validation was selected in the planner." },
    { key: "backup", tool: "backup-window", label: "Backup Window", reason: "Backup or recovery window validation was selected in the planner." }
  ];

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj || {}, key);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }

  function normalizePlan(plan) {
    plan = plan && typeof plan === "object" ? plan : {};
    plan.workloads = Array.isArray(plan.workloads) ? plan.workloads : [];
    plan.results = plan.results && typeof plan.results === "object" ? plan.results : {};
    return plan;
  }

  function activeWorkload(plan, guidedContext) {
    plan = normalizePlan(plan);
    var id = guidedContext && (guidedContext.activeWorkloadId || guidedContext.workloadId) || plan.activeWorkloadId;
    return plan.workloads.find(function (item) { return item && item.id === id; }) || plan.workloads[0] || null;
  }

  function resultMap(plan, workload) {
    plan = normalizePlan(plan);
    if (!workload || !workload.id) return {};
    return plan.results && plan.results[workload.id] && typeof plan.results[workload.id] === "object" ? plan.results[workload.id] : {};
  }

  function completedMap(plan, workload) {
    var map = {};
    var legacyCompleted = workload && workload.completedTools && typeof workload.completedTools === "object" ? workload.completedTools : {};
    var legacyChecks = workload && workload.completedChecks && typeof workload.completedChecks === "object" ? workload.completedChecks : {};
    var results = resultMap(plan, workload);

    Object.keys(legacyCompleted).forEach(function (key) { if (legacyCompleted[key]) map[key] = true; });
    Object.keys(legacyChecks).forEach(function (key) { if (legacyChecks[key]) map[key] = true; });
    Object.keys(results).forEach(function (key) { if (results[key]) map[key] = true; });

    return map;
  }

  function applicableSteps(workload) {
    var branches = workload && workload.branches && typeof workload.branches === "object" ? workload.branches : {};
    var steps = BASE_TOOLS.map(function (tool) {
      return { tool: tool, label: TOOL_LABELS[tool], href: TOOL_HREFS[tool], kind: "core", reason: tool === "cpu-sizing" ? "The guided Compute flow starts with a CPU baseline." : "The guided Compute flow needs a memory baseline after CPU." };
    });

    BRANCH_TOOLS.forEach(function (branch) {
      if (!branches[branch.key]) return;
      steps.push({
        tool: branch.tool,
        label: TOOL_LABELS[branch.tool] || branch.label,
        href: TOOL_HREFS[branch.tool],
        kind: "branch",
        branchKey: branch.key,
        reason: branch.reason
      });
    });

    return steps;
  }

  function firstIncompleteStep(steps, completed) {
    return (steps || []).find(function (step) { return step && step.tool && !completed[step.tool]; }) || null;
  }

  function summaryDecision(workload, steps, completed) {
    return {
      mode: "guided",
      action: "review-summary",
      category: CATEGORY,
      workloadId: workload && workload.id || "",
      workloadName: workload && workload.name || "Compute Workload",
      currentTool: SUMMARY_TOOL,
      nextTool: SUMMARY_TOOL,
      nextLabel: "Review Compute Summary",
      nextHref: SUMMARY_HREF,
      reason: "All applicable guided checks for this workload are complete. Review the summary instead of forcing unrelated tools.",
      applicableTools: steps.map(function (step) { return step.tool; }),
      completedTools: Object.keys(completed || {}).filter(function (tool) { return !!completed[tool]; }),
      remainingTools: []
    };
  }

  function resolve(input) {
    input = input || {};
    var guidedContext = input.guidedContext || null;

    if (!guidedContext || guidedContext.guidedFlow !== true || guidedContext.routeMode !== "compute-guided") {
      return {
        mode: "standalone",
        action: "standalone",
        category: CATEGORY,
        currentTool: input.currentTool || "",
        nextTool: "",
        nextLabel: "Standalone tool",
        nextHref: "",
        reason: "No guided-flow context is active. Keep this tool in standalone calculator mode.",
        applicableTools: [],
        completedTools: [],
        remainingTools: []
      };
    }

    var plan = normalizePlan(input.plan);
    var workload = input.workload || activeWorkload(plan, guidedContext);

    if (!workload) {
      return {
        mode: "guided",
        action: "return-planner",
        category: CATEGORY,
        currentTool: input.currentTool || "",
        nextTool: "workload-planner",
        nextLabel: "Return to Workload Planner",
        nextHref: "/tools/compute/workload-planner/",
        reason: "Guided flow is active, but no workload is selected. Return to the planner before continuing.",
        applicableTools: [],
        completedTools: [],
        remainingTools: []
      };
    }

    var steps = applicableSteps(workload);
    var completed = completedMap(plan, workload);
    var next = firstIncompleteStep(steps, completed);

    if (!next) return summaryDecision(workload, steps, completed);

    var remaining = steps.filter(function (step) { return !completed[step.tool]; }).map(function (step) { return step.tool; });
    var completedList = steps.filter(function (step) { return completed[step.tool]; }).map(function (step) { return step.tool; });
    var action = completedList.length ? "resume" : "start";

    return {
      mode: "guided",
      action: action,
      category: CATEGORY,
      workloadId: workload.id,
      workloadName: workload.name || "Compute Workload",
      currentTool: input.currentTool || guidedContext.currentTool || "workload-planner",
      nextTool: next.tool,
      nextLabel: (action === "resume" ? "Resume Guided Flow ? " : "Start Guided Flow ? ") + (next.label || TOOL_LABELS[next.tool] || next.tool),
      nextHref: next.href || TOOL_HREFS[next.tool] || "",
      reason: next.reason || "Continue the guided Compute workflow from the next incomplete applicable check.",
      applicableTools: steps.map(function (step) { return step.tool; }),
      completedTools: completedList,
      remainingTools: remaining
    };
  }

  var api = {
    version: VERSION,
    labels: clone(TOOL_LABELS),
    hrefs: clone(TOOL_HREFS),
    baseTools: BASE_TOOLS.slice(),
    branchTools: clone(BRANCH_TOOLS),
    applicableSteps: applicableSteps,
    completedMap: completedMap,
    resolve: resolve
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ScopedLabsComputeGuidedRouteEngine = Object.freeze(api);
})();
