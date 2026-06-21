(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-planner-adapter-021-start-cta-workload-aware";
  var State = window.ScopedLabsComputePlanState;
  var Shell = window.ScopedLabsCategoryPlannerShell;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return Shell && Shell.escapeHtml ? Shell.escapeHtml(value) : String(value == null ? "" : value);
  }

  function titleCase(value) {
    return String(value || "n/a").replace(/-/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function bool(el) {
    return !!(el && el.checked);
  }

  function setChecked(el, value) {
    if (el) el.checked = !!value;
  }

  function num(el, fallback) {
    var value = Number(el && el.value);
    return Number.isFinite(value) ? value : fallback;
  }

  var editingId = null;
  var els = {};

  var config = {
    title: "Compute Workload Planner",
    introId: "computeWorkloadIntroCard",
    introTitle: "Define the workloads before running the Compute flow",
    introCopy: "Real compute environments rarely use one CPU, one RAM value, one storage behavior, and one recovery target everywhere. Use this step to define one or more compute workloads so downstream CPU, RAM, storage, density, acceleration, infrastructure, and recovery results can be tied to the correct environment.",
    setupTitle: "Active Compute Workload Setup",
    setupCopy: "Start with one workload or environment, then add more if the project has different resource behavior, availability expectations, storage pressure, GPU needs, backup windows, or infrastructure limits.",
    seedCardId: "computeBranchStarterCard",
    seedTitle: "Compute branch starter questions",
    seedCopy: "These flags seed optional or supporting Compute tools. The mainline still starts at CPU Sizing.",
    saveId: "saveWorkload",
    saveLabel: "Save / Update Workload",
    newId: "newWorkload",
    newLabel: "Add Another Workload",
    resetId: "resetPlan",
    resetLabel: "Reset Workload Plan",
    statusId: "plannerStatus",
    ledgerEyebrow: "Workload Ledger",
    ledgerTitle: "Planning Workloads",
    ledgerCopy: "Downstream Compute results should be treated as workload-specific. The final Compute Summary can later roll these up across CPU, memory, storage, density, acceleration, infrastructure, recovery, and network checks.",
    countId: "scopeCountLabel",
    metadataSectionId: "computeWorkloadReportMetadataSection",
    metadataTitle: "Workload Report Metadata",
    metadataCopy: "These report details save to the active Compute workload. Switching workloads loads that workload's own metadata.",
    activeLabelId: "activeWorkloadLabel",
    activeLabelDefault: "Active workload: No active workload selected",
    reportTitlePlaceholder: "Compute Workload Assessment",
    reportNotesPlaceholder: "Optional Compute workload report notes.",
    summaryExportTitle: "Compute Workload Summary",
    summaryTitle: "Compute workload and branch summary",
    summaryCopy: "This rollup separates core Compute workloads from optional specialty branches, then summarizes active status, saved assumptions, and next actions for the future Compute Summary master assistant.",
    emptySummary: "Save at least one Compute workload to build the summary.",
    printId: "printWorkloadSummary",
    printLabel: "Print / Save Workload Summary",
    copyId: "copyWorkloadSummary",
    copyLabel: "Copy Client Summary",
    backHref: "/tools/compute/",
    backLabel: "Back to Compute",
    continueHref: "/tools/compute/cpu-sizing/",
    continueLabel: "Start Guided Flow",
    flow: {
      id: "computeWorkloadDesignFlowCard",
      eyebrow: "Design Flow",
      sections: [
        {
          label: "Compute Workload Planner",
          copy: "Create or select the compute workload being planned.",
          dynamicWorkloadPlanner: true,
          steps: []
        },
        {
          label: "CORE COMPUTE PIPELINE",
          copy: "Run this path for normal server, virtualization, or infrastructure sizing.",
          steps: [
            { label: "CPU", href: "/tools/compute/cpu-sizing/" }, { label: "RAM", href: "/tools/compute/ram-sizing/" }, { label: "Storage IOPS", href: "/tools/compute/storage-iops/" }, { label: "Throughput", href: "/tools/compute/storage-throughput/" },
            { label: "VM Density", href: "/tools/compute/vm-density/" }, { label: "Power / Thermal", href: "/tools/compute/power-thermal/" }, { label: "RAID", href: "/tools/compute/raid-rebuild-time/" }, { label: "Backup", href: "/tools/compute/backup-window/" }, { label: "Summary" }
          ]
        },
        {
          label: "OPTIONAL SPECIALTY BRANCHES",
          copy: "Use these when the compute design needs GPU, network path, recovery, or infrastructure validation.",
          steps: [
            { label: "GPU", href: "/tools/compute/gpu-vram/" }, { label: "NIC Bonding", href: "/tools/compute/nic-bonding/" }, { label: "Recovery", href: "/tools/compute/backup-window/" }, { label: "Power / Thermal", href: "/tools/compute/power-thermal/" }
          ]
        }
      ]
    },
    fields: [
      { id: "workloadName", label: "Workload / Environment Name", type: "text", placeholder: "Example: Production VM Host Cluster" },
      { id: "environmentType", label: "Environment Type", type: "select", options: [
        { value: "production", label: "Production" }, { value: "staging", label: "Staging / QA" }, { value: "development", label: "Development" },
        { value: "lab", label: "Lab / Test" }, { value: "edge", label: "Edge / Remote Site" }, { value: "unknown", label: "Unknown / needs review" }
      ] },
      { id: "planningPath", label: "Planning Path", type: "select", options: [
        { value: "standard-server", label: "Standard Server - start at CPU Sizing" },
        { value: "vm-host", label: "VM Host / Consolidation - flag VM Density" },
        { value: "database", label: "Database / Transactional - flag storage IOPS" },
        { value: "storage-heavy", label: "Storage-heavy workload - flag IOPS and throughput" },
        { value: "gpu-ai", label: "GPU / AI / acceleration - open GPU branch" },
        { value: "backup-recovery", label: "Backup / Recovery validation - flag backup and RAID" },
        { value: "power-constrained", label: "Power / thermal constrained - flag infrastructure review" },
        { value: "network-constrained", label: "Network constrained - flag NIC bonding review" }
      ] },
      { id: "workloadType", label: "Workload Type", type: "select", options: [
        { value: "general", label: "General / Mixed" }, { value: "web-api", label: "Web / API" }, { value: "database", label: "Database" },
        { value: "file-services", label: "File Services" }, { value: "virtualization", label: "Virtualization Host" }, { value: "video-transcode", label: "Video / Transcode" },
        { value: "ai-gpu", label: "AI / GPU" }, { value: "backup", label: "Backup / Recovery" }, { value: "unknown", label: "Unknown / needs review" }
      ] },
      { id: "demandPattern", label: "Demand Pattern", type: "select", options: [
        { value: "steady", label: "Steady" }, { value: "bursty", label: "Bursty" }, { value: "seasonal", label: "Seasonal / scheduled peaks" },
        { value: "batch", label: "Batch / job-driven" }, { value: "unknown", label: "Unknown / needs review" }
      ] },
      { id: "criticality", label: "Business Criticality", type: "select", options: [
        { value: "standard", label: "Standard" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }, { value: "low", label: "Low / non-production" }
      ] },
      { id: "concurrencyBaseline", label: "Baseline Concurrent Users / Workers", type: "number", min: "0", step: "1", value: "50" },
      { id: "operatingWindow", label: "Operating Window", type: "select", options: [
        { value: "business-hours", label: "Business hours" }, { value: "extended-hours", label: "Extended hours" }, { value: "twenty-four-seven", label: "24/7" },
        { value: "scheduled-batch", label: "Scheduled batch window" }, { value: "unknown", label: "Unknown / needs review" }
      ] },
      { id: "targetUtilization", label: "Target Utilization Ceiling (%)", type: "number", min: "30", max: "95", step: "1", value: "70" },
      { id: "growthMargin", label: "Growth Margin (%)", type: "number", min: "0", max: "300", step: "5", value: "25" },
      { id: "redundancyGoal", label: "Redundancy Goal", type: "select", options: [
        { value: "single-host", label: "Single host / no HA" }, { value: "n-plus-one", label: "N+1 capacity target" },
        { value: "cluster-ha", label: "Cluster HA" }, { value: "site-resilient", label: "Site resilient / DR-aware" }, { value: "unknown", label: "Unknown / needs review" }
      ] },
      { id: "primaryConstraint", label: "Primary Constraint", type: "select", options: [
        { value: "balanced", label: "Balanced" }, { value: "performance", label: "Performance-first" }, { value: "cost", label: "Cost-balanced" },
        { value: "density", label: "Density-first" }, { value: "resilience", label: "Resilience-first" }, { value: "power-cooling", label: "Power / cooling limited" },
        { value: "recovery-window", label: "Recovery-time driven" }
      ] },
      { id: "workloadNotes", label: "Known Restrictions / Notes", type: "textarea", full: true, placeholder: "Document vendor limits, site restrictions, service-level expectations, hardware standards, or assumptions that should follow this workload through the Compute pipeline." }
    ],
    seedChecks: [],
    branchCards: []
  };

  function cacheEls() {
    [
      "workloadName", "environmentType", "planningPath", "workloadType", "demandPattern", "criticality", "concurrencyBaseline",
      "operatingWindow", "targetUtilization", "growthMargin", "redundancyGoal", "primaryConstraint", "workloadNotes",
      "needsVmDensity", "storageHeavy", "needsGpu", "needsPowerThermal", "needsRaid", "needsBackup", "needsNic",
      "vmBranchCard", "gpuBranchCard", "protectionBranchCard", "infrastructureBranchCard",
      "reportTitle", "projectName", "clientName", "preparedBy", "reportNotes",
      "saveWorkload", "newWorkload", "resetPlan", "scopeList", "scopeCountLabel", "scopeSummary", "activeWorkloadLabel",
      "plannerStatus", "printWorkloadSummary", "copyWorkloadSummary", "continue"
    ].forEach(function (id) {
      els[id] = $(id);
    });
  }

  function hideStarterPlaceholders() {
    [
      "computeBranchStarterCard",
      "vmBranchCard",
      "gpuBranchCard",
      "protectionBranchCard",
      "infrastructureBranchCard"
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
    });
  }

  function status(message) {
    if (els.plannerStatus) els.plannerStatus.textContent = message || "";
  }

  function branchDefaults(path) {
    return {
      vmDensity: path === "vm-host",
      storageHeavy: path === "database" || path === "storage-heavy",
      gpu: path === "gpu-ai",
      powerThermal: path === "power-constrained",
      raid: path === "backup-recovery",
      backup: path === "backup-recovery",
      nicBonding: path === "network-constrained"
    };
  }

  function syncBranches() {
    var defaults = branchDefaults(els.planningPath ? els.planningPath.value : "standard-server");
    if (defaults.vmDensity) setChecked(els.needsVmDensity, true);
    if (defaults.storageHeavy) setChecked(els.storageHeavy, true);
    if (defaults.gpu) setChecked(els.needsGpu, true);
    if (defaults.powerThermal) setChecked(els.needsPowerThermal, true);
    if (defaults.raid) setChecked(els.needsRaid, true);
    if (defaults.backup) setChecked(els.needsBackup, true);
    if (defaults.nicBonding) setChecked(els.needsNic, true);
    updateBranchCards();
  }

  function updateBranchCards() {
    if (els.vmBranchCard) els.vmBranchCard.hidden = !bool(els.needsVmDensity);
    if (els.gpuBranchCard) els.gpuBranchCard.hidden = !bool(els.needsGpu);
    if (els.protectionBranchCard) els.protectionBranchCard.hidden = !(bool(els.needsRaid) || bool(els.needsBackup));
    if (els.infrastructureBranchCard) els.infrastructureBranchCard.hidden = !(bool(els.needsPowerThermal) || bool(els.needsNic));
  }

  function collect() {
    var pathValue = els.planningPath ? els.planningPath.value : "standard-server";
    var defaults = branchDefaults(pathValue);

    return {
      id: editingId,
      name: (els.workloadName && els.workloadName.value.trim()) || "Compute Workload",
      environmentType: els.environmentType ? els.environmentType.value : "production",
      planningPath: pathValue,
      workloadType: els.workloadType ? els.workloadType.value : "general",
      demandPattern: els.demandPattern ? els.demandPattern.value : "steady",
      criticality: els.criticality ? els.criticality.value : "standard",
      concurrencyBaseline: num(els.concurrencyBaseline, 0),
      operatingWindow: els.operatingWindow ? els.operatingWindow.value : "business-hours",
      targetUtilization: num(els.targetUtilization, 70),
      growthMargin: num(els.growthMargin, 25),
      redundancyGoal: els.redundancyGoal ? els.redundancyGoal.value : "single-host",
      primaryConstraint: els.primaryConstraint ? els.primaryConstraint.value : "balanced",
      notes: els.workloadNotes ? els.workloadNotes.value : "",
      metadata: {
        reportTitle: els.reportTitle ? els.reportTitle.value : "",
        projectName: els.projectName ? els.projectName.value : "",
        clientName: els.clientName ? els.clientName.value : "",
        preparedBy: els.preparedBy ? els.preparedBy.value : "",
        reportNotes: els.reportNotes ? els.reportNotes.value : ""
      },
      branches: {
        vmDensity: bool(els.needsVmDensity) || defaults.vmDensity,
        storageHeavy: bool(els.storageHeavy) || defaults.storageHeavy,
        gpu: bool(els.needsGpu) || defaults.gpu,
        powerThermal: bool(els.needsPowerThermal) || defaults.powerThermal,
        raid: bool(els.needsRaid) || defaults.raid,
        backup: bool(els.needsBackup) || defaults.backup,
        nicBonding: bool(els.needsNic) || defaults.nicBonding
      }
    };
  }

  function hydrate(workload) {
    if (!workload) return;
    editingId = workload.id || null;

    if (els.workloadName) els.workloadName.value = workload.name || "";
    if (els.environmentType) els.environmentType.value = workload.environmentType || "production";
    if (els.planningPath) els.planningPath.value = workload.planningPath || "standard-server";
    if (els.workloadType) els.workloadType.value = workload.workloadType || "general";
    if (els.demandPattern) els.demandPattern.value = workload.demandPattern || "steady";
    if (els.criticality) els.criticality.value = workload.criticality || "standard";
    if (els.concurrencyBaseline) els.concurrencyBaseline.value = String(workload.concurrencyBaseline || 0);
    if (els.operatingWindow) els.operatingWindow.value = workload.operatingWindow || "business-hours";
    if (els.targetUtilization) els.targetUtilization.value = String(workload.targetUtilization || 70);
    if (els.growthMargin) els.growthMargin.value = String(workload.growthMargin || 25);
    if (els.redundancyGoal) els.redundancyGoal.value = workload.redundancyGoal || "single-host";
    if (els.primaryConstraint) els.primaryConstraint.value = workload.primaryConstraint || "balanced";
    if (els.workloadNotes) els.workloadNotes.value = workload.notes || "";

    var branches = workload.branches || {};
    setChecked(els.needsVmDensity, branches.vmDensity);
    setChecked(els.storageHeavy, branches.storageHeavy);
    setChecked(els.needsGpu, branches.gpu);
    setChecked(els.needsPowerThermal, branches.powerThermal);
    setChecked(els.needsRaid, branches.raid);
    setChecked(els.needsBackup, branches.backup);
    setChecked(els.needsNic, branches.nicBonding);

    var metadata = workload.metadata || {};
    if (els.reportTitle) els.reportTitle.value = metadata.reportTitle || "";
    if (els.projectName) els.projectName.value = metadata.projectName || "";
    if (els.clientName) els.clientName.value = metadata.clientName || "";
    if (els.preparedBy) els.preparedBy.value = metadata.preparedBy || "";
    if (els.reportNotes) els.reportNotes.value = metadata.reportNotes || "";

    updateBranchCards();
  }

  function branchList(workload) {
    var branches = workload && workload.branches ? workload.branches : {};
    var items = [];
    if (branches.vmDensity) items.push("VM Density");
    if (branches.storageHeavy) items.push("Storage IOPS / Throughput");
    if (branches.gpu) items.push("GPU VRAM");
    if (branches.powerThermal) items.push("Power / Thermal");
    if (branches.raid) items.push("RAID Rebuild");
    if (branches.backup) items.push("Backup Window");
    if (branches.nicBonding) items.push("NIC Bonding");
    return items;
  }

  function save() {
    if (!State) {
      status("Compute plan state module is not available.");
      return null;
    }

    var result = State.upsertWorkload(collect());
    editingId = result.workload.id;
    render();
    updateGuidedRouteCta();
    status("Compute workload saved. Start Guided Flow when ready.");
    return result.workload;
  }
  function computeGuidedRouteCtaDefault() {
    return {
      nextHref: "/tools/compute/cpu-sizing/",
      nextLabel: "Start Guided Flow",
      action: "start"
    };
  }

  function getComputeRouteEngine() {
    return window.ScopedLabsComputeGuidedRouteEngine || null;
  }

  function readComputePlannerPlanSnapshot() {
    if (State) {
      var methodNames = ["getPlan", "readPlan", "loadPlan", "getWorkloadPlan"];
      for (var i = 0; i < methodNames.length; i += 1) {
        var name = methodNames[i];
        if (typeof State[name] === "function") {
          try {
            var plan = State[name]();
            if (plan) return plan;
          } catch (error) {
            /* Fall back to localStorage. */
          }
        }
      }
    }

    try {
      return JSON.parse(localStorage.getItem("scopedlabs:pipeline:compute:workload-plan") || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function readComputeGuidedRouteContext() {
    if (!State || typeof State.getGuidedFlowContext !== "function") return null;
    try {
      var context = State.getGuidedFlowContext();
      if (!context || context.guidedFlow !== true || context.routeMode !== "compute-guided") return null;
      return context;
    } catch (error) {
      return null;
    }
  }

  function findComputePlannerWorkload(plan, workloadId) {
    if (!plan || !workloadId) return null;
    var lists = [plan.workloads, plan.items, plan.scopes, plan.entries];
    for (var i = 0; i < lists.length; i += 1) {
      var list = Array.isArray(lists[i]) ? lists[i] : [];
      for (var j = 0; j < list.length; j += 1) {
        if (list[j] && String(list[j].id) === String(workloadId)) return list[j];
      }
    }
    return null;
  }

  function allComputePlannerWorkloads(plan) {
    if (!plan) return [];
    var lists = [plan.workloads, plan.items, plan.scopes, plan.entries];
    var seen = {};
    var results = [];

    lists.forEach(function (list) {
      if (!Array.isArray(list)) return;
      list.forEach(function (item) {
        if (!item) return;
        var id = String(item.id || item.workloadId || "");
        if (!id || seen[id]) return;
        seen[id] = true;
        results.push(item);
      });
    });

    return results;
  }

  function createPlannerGuidedContextForWorkload(baseContext, workload) {
    if (!workload || !workload.id) return null;
    var nowValue = new Date().toISOString();
    var context = Object.assign({}, baseContext || {});

    context.contract = context.contract || "scopedlabs.compute.guided-flow.v1";
    context.category = "compute";
    context.guidedFlow = true;
    context.routeMode = "compute-guided";
    context.sourceTool = context.sourceTool || "workload-planner";
    context.startedFrom = context.startedFrom || "workload-planner";
    context.currentTool = "workload-planner";
    context.activeWorkloadId = workload.id;
    context.workloadId = workload.id;
    context.workloadName = workload.name || "Compute Workload";
    context.updatedAt = nowValue;
    context.startedAt = context.startedAt || nowValue;

    return context;
  }

  function computePlannerDecisionNeedsWork(decision) {
    if (!decision || decision.mode !== "guided" || !decision.nextHref) return false;
    if (decision.action === "review-summary" || decision.nextTool === "summary") return false;
    if (Array.isArray(decision.remainingTools) && decision.remainingTools.length > 0) return true;
    return !!decision.nextTool;
  }

  function computePlannerRunLabel(decision) {
    if (!decision) return "Continue guided flow";
    if (decision.nextTool === "summary" || decision.action === "review-summary") return "Review Compute Summary";
    return "Run " + (COMPUTE_LEDGER_LABELS[decision.nextTool] || titleCase(decision.nextTool || "next check"));
  }

  function decoratePlannerMultiWorkloadDecision(decision, workload, isAlternateWorkload) {
    if (!decision || !workload) return decision;
    var next = Object.assign({}, decision);
    next.workloadId = workload.id;
    next.workloadName = workload.name || next.workloadName || "Compute Workload";
    next.plannerWorkloadId = workload.id;
    next.plannerAlternateWorkload = !!isAlternateWorkload;

    if (isAlternateWorkload && computePlannerDecisionNeedsWork(next)) {
      next.nextLabel = "Use workload - " + computePlannerRunLabel(next);
      next.action = "resume-other-workload";
    }

    return next;
  }

  function resolvePendingWorkloadRouteFromPlanner(routeEngine, plan, activeContext, activeWorkload) {
    if (!routeEngine || typeof routeEngine.resolve !== "function") return null;

    var workloads = allComputePlannerWorkloads(plan);
    var activeId = activeWorkload && activeWorkload.id || activeContext && activeContext.workloadId || "";
    var activeDecision = null;

    if (activeWorkload) {
      activeDecision = routeEngine.resolve({
        plan: plan,
        workload: activeWorkload,
        guidedContext: createPlannerGuidedContextForWorkload(activeContext, activeWorkload),
        currentTool: "workload-planner"
      });

      if (computePlannerDecisionNeedsWork(activeDecision)) {
        return decoratePlannerMultiWorkloadDecision(activeDecision, activeWorkload, false);
      }
    }

    for (var i = 0; i < workloads.length; i += 1) {
      var workload = workloads[i];
      if (!workload || !workload.id || String(workload.id) === String(activeId)) continue;

      var decision = routeEngine.resolve({
        plan: plan,
        workload: workload,
        guidedContext: createPlannerGuidedContextForWorkload(activeContext, workload),
        currentTool: "workload-planner"
      });

      if (computePlannerDecisionNeedsWork(decision)) {
        return decoratePlannerMultiWorkloadDecision(decision, workload, true);
      }
    }

    if (activeDecision && activeDecision.nextHref) {
      return decoratePlannerMultiWorkloadDecision(activeDecision, activeWorkload, false);
    }

    return null;
  }

  function resolveGuidedRouteFromPlanner(context, workload) {
    var routeEngine = getComputeRouteEngine();
    if (!routeEngine || typeof routeEngine.resolve !== "function") return computeGuidedRouteCtaDefault();

    var plan = readComputePlannerPlanSnapshot();
    var activeContext = context || readComputeGuidedRouteContext();
    var activeWorkload =
      workload ||
      findComputePlannerWorkload(plan, activeContext && activeContext.workloadId) ||
      findComputePlannerWorkload(plan, editingId);

    var decision = resolvePendingWorkloadRouteFromPlanner(routeEngine, plan, activeContext, activeWorkload);
    if (!decision || !decision.nextHref) return computeGuidedRouteCtaDefault();
    return decision;
  }

  function computePlannerSavedWorkloads(plan) {
    if (!plan) return [];

    var arrays = [plan.workloads, plan.items, plan.records, plan.savedWorkloads];
    for (var i = 0; i < arrays.length; i += 1) {
      if (Array.isArray(arrays[i])) return arrays[i].filter(Boolean);
    }

    var maps = [plan.workloadMap, plan.workloadsById, plan.byId];
    for (var j = 0; j < maps.length; j += 1) {
      if (maps[j] && typeof maps[j] === "object") {
        return Object.keys(maps[j]).map(function (key) { return maps[j][key]; }).filter(Boolean);
      }
    }

    if (plan.activeWorkload && (plan.activeWorkload.id || plan.activeWorkload.workloadId || plan.activeWorkload.name)) return [plan.activeWorkload];
    return [];
  }

  function computePlannerSetupTarget() {
    var headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, label, .h3, .eyebrow"));
    var node = headings.find(function (item) {
      var text = String(item.textContent || "");
      return /Active\s+Compute\s+Workload\s+Setup|Workload\s*\/\s*Environment\s+Name/i.test(text);
    });

    var target = node && node.closest ? node.closest("section, .card, .panel, form") || node : null;
    if (!target) target = document.querySelector("form") || document.querySelector("main") || document.body;
    if (target && !target.id) target.id = "compute-workload-setup";
    return target;
  }

  function promptForComputeWorkloadSetup() {
    var target = computePlannerSetupTarget();
    if (!target) return;

    target.setAttribute("data-compute-start-guided-focus", "true");
    if (typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    var field = target.querySelector ? target.querySelector("input, select, textarea, button") : null;
    if (!field) field = document.querySelector("input, select, textarea");
    if (field && typeof field.focus === "function") {
      window.setTimeout(function () { field.focus({ preventScroll: true }); }, 250);
    }
  }

  function updateGuidedRouteCta(providedDecision) {
    var link = document.getElementById("continue");
    if (!link) link = document.querySelector("[data-planner-continue], .compute-flow-actions a:last-child, .flow-actions a:last-child");
    if (!link) return;

    var plan = readComputePlannerPlanSnapshot();
    var workloads = computePlannerSavedWorkloads(plan);
    var hasWorkloads = workloads.length > 0;
    var decision = hasWorkloads ? (providedDecision || resolveGuidedRouteFromPlanner()) : computeGuidedRouteCtaDefault();
    var nextHref = hasWorkloads && decision && decision.nextHref ? decision.nextHref : "#compute-workload-setup";
    var nextLabel = "Start Guided Flow";

    if (link.getAttribute("href") !== nextHref) link.setAttribute("href", nextHref);
    if ((link.textContent || "").trim() !== nextLabel) link.textContent = nextLabel;

    link.setAttribute("data-compute-guided-route-cta", hasWorkloads && decision ? decision.action || "route" : "setup");
    link.setAttribute("data-compute-guided-route-state", hasWorkloads ? "route" : "setup");

    if (hasWorkloads && decision && (decision.plannerWorkloadId || decision.workloadId)) {
      link.setAttribute("data-compute-guided-route-workload-id", decision.plannerWorkloadId || decision.workloadId);
    } else {
      link.removeAttribute("data-compute-guided-route-workload-id");
    }

    if (hasWorkloads && decision && decision.plannerAlternateWorkload) {
      link.setAttribute("data-compute-guided-route-alt-workload", "true");
    } else {
      link.removeAttribute("data-compute-guided-route-alt-workload");
    }
  }

  function armGuidedRouteCtaRefresh() {
    function refresh() {
      updateGuidedRouteCta();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", refresh);
    } else {
      refresh();
    }

    window.setTimeout(refresh, 0);
    window.setTimeout(refresh, 100);
    window.setTimeout(refresh, 500);

    window.addEventListener("storage", refresh);
    window.addEventListener("scopedlabs:compute:plan-change", refresh);
    window.addEventListener("scopedlabs-compute-plan-change", refresh);

    document.addEventListener("click", function () {
      window.setTimeout(refresh, 80);
    });
  }

  armGuidedRouteCtaRefresh();



  function startGuidedFlowFromPlanner(event) {
    if (event && typeof event.preventDefault === "function") event.preventDefault();

    var link = event && event.currentTarget ? event.currentTarget : document.getElementById("continue");
    var plan = readComputePlannerPlanSnapshot();
    var workloads = computePlannerSavedWorkloads(plan);

    if (!workloads.length) {
      status("Define and save a Compute workload before starting guided flow.");
      updateGuidedRouteCta();
      promptForComputeWorkloadSetup();
      return;
    }

    var routeDecision = resolveGuidedRouteFromPlanner();
    var requestedWorkloadId = link && link.getAttribute ? link.getAttribute("data-compute-guided-route-workload-id") : "";
    if (!requestedWorkloadId && routeDecision) requestedWorkloadId = routeDecision.plannerWorkloadId || routeDecision.workloadId || "";

    var workload = requestedWorkloadId ? findComputePlannerWorkload(plan, requestedWorkloadId) : null;

    if (!workload && plan) {
      var activeId = plan.activeWorkloadId || plan.activeId || plan.currentWorkloadId || "";
      if (activeId) workload = findComputePlannerWorkload(plan, activeId);
    }

    if (!workload) workload = workloads[0];
    if (!workload || !workload.id) {
      status("Select or save a Compute workload before starting guided flow.");
      promptForComputeWorkloadSetup();
      return;
    }

    var context = null;
    if (State && typeof State.startGuidedFlow === "function") {
      context = State.startGuidedFlow(workload.id);
    }

    var decision = resolveGuidedRouteFromPlanner(context, workload) || routeDecision;
    updateGuidedRouteCta(decision);

    if (decision && decision.nextHref) {
      status("Guided flow ready for " + (workload.name || "Compute Workload") + ".");
      window.location.href = decision.nextHref;
      return;
    }

    window.location.href = context && context.nextHref ? context.nextHref : "/tools/compute/cpu-sizing/";
  }

  function clearForm() {
    editingId = null;
    [
      "workloadName", "workloadNotes", "reportTitle", "projectName", "clientName", "preparedBy", "reportNotes"
    ].forEach(function (id) {
      if (els[id]) els[id].value = "";
    });

    if (els.environmentType) els.environmentType.value = "production";
    if (els.planningPath) els.planningPath.value = "standard-server";
    if (els.workloadType) els.workloadType.value = "general";
    if (els.demandPattern) els.demandPattern.value = "steady";
    if (els.criticality) els.criticality.value = "standard";
    if (els.concurrencyBaseline) els.concurrencyBaseline.value = "50";
    if (els.operatingWindow) els.operatingWindow.value = "business-hours";
    if (els.targetUtilization) els.targetUtilization.value = "70";
    if (els.growthMargin) els.growthMargin.value = "25";
    if (els.redundancyGoal) els.redundancyGoal.value = "single-host";
    if (els.primaryConstraint) els.primaryConstraint.value = "balanced";

    [els.needsVmDensity, els.storageHeavy, els.needsGpu, els.needsPowerThermal, els.needsRaid, els.needsBackup, els.needsNic].forEach(function (el) {
      setChecked(el, false);
    });

    updateBranchCards();
    status("Ready for a new Compute workload.");
  }

  function renderLedger(plan) {
    var workloads = plan.workloads || [];
    if (els.scopeCountLabel) els.scopeCountLabel.textContent = workloads.length + (workloads.length === 1 ? " workload" : " workloads");
    if (!els.scopeList) return;

    if (!workloads.length) {
      els.scopeList.innerHTML = '<p class="muted">No Compute workloads saved yet.</p>';
      return;
    }

    els.scopeList.innerHTML = workloads.map(function (workload) {
      var active = workload.id === plan.activeWorkloadId;
      var branches = branchList(workload);
      return [
        '<article class="access-scope-card' + (active ? ' is-active' : '') + '">',
        '<div class="access-scope-mini-flow">' + (active ? 'Active workload' : 'Saved workload') + ' → ' + escapeHtml(titleCase(workload.planningPath)) + ' → Planning</div>',
        '<h3 style="margin:.2rem 0 .4rem;">' + escapeHtml(workload.name || "Compute Workload") + '</h3>',
        '<p class="muted">' + escapeHtml(titleCase(workload.environmentType)) + ' • ' + escapeHtml(titleCase(workload.workloadType)) + ' • ' + escapeHtml(titleCase(workload.demandPattern)) + '</p>',
        '<div class="access-scope-meta">',
        '<div class="access-scope-meta-item"><small>Path</small>' + escapeHtml(titleCase(workload.planningPath)) + '</div>',
        '<div class="access-scope-meta-item"><small>Criticality</small>' + escapeHtml(titleCase(workload.criticality)) + '</div>',
        '<div class="access-scope-meta-item"><small>Branches</small>' + (branches.length ? escapeHtml(branches.join(", ")) : "None") + '</div>',
        '<div class="access-scope-meta-item"><small>Next Step</small>CPU Sizing</div>',
        '</div>',
        '<div class="btn-row" style="margin-top:12px;">',
        '<button class="btn btn-primary" type="button" data-use-workload="' + escapeHtml(workload.id) + '">Use Workload</button>',
        '<button class="btn" type="button" data-edit-workload="' + escapeHtml(workload.id) + '">Edit</button>',
        '<button class="btn" type="button" data-delete-workload="' + escapeHtml(workload.id) + '">Delete</button>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");

    Array.from(els.scopeList.querySelectorAll("[data-use-workload]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var workload = State.setActiveWorkload(button.getAttribute("data-use-workload"));
        if (workload) hydrate(workload);
        render();
        status("Active Compute workload set.");
      });
    });

    Array.from(els.scopeList.querySelectorAll("[data-edit-workload]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var plan = State.load();
        var id = button.getAttribute("data-edit-workload");
        var workload = (plan.workloads || []).find(function (item) { return item.id === id; });
        if (!workload) return;
        State.setActiveWorkload(id);
        hydrate(workload);
        render();
        status("Loaded workload for editing.");
      });
    });

    Array.from(els.scopeList.querySelectorAll("[data-delete-workload]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-delete-workload");
        if (typeof State.removeWorkload === "function") {
          var result = State.removeWorkload(id);
          if (result && result.workload) {
            editingId = result.workload.id;
            hydrate(result.workload);
          } else {
            clearForm();
          }
        } else {
          var plan = State.load();
          plan.workloads = (plan.workloads || []).filter(function (item) { return item.id !== id; });
          if (plan.activeWorkloadId === id) plan.activeWorkloadId = plan.workloads[0] ? plan.workloads[0].id : null;
          State.save(plan);
        }
        render();
        status("Compute workload deleted.");
      });
    });
  }


  function computePlannerStatusLabel(workloads, branchTotal) {
    if (!(workloads || []).length) return "PLANNING";
    return branchTotal > 0 ? "WATCH" : "PLANNING";
  }


  function computeStatusClass(value) {
    var status = String(value || "").toUpperCase();
    if (status === "AUTHORITY REVIEW") return "access-status-authority";
    if (status === "RISK") return "access-status-risk";
    if (status === "WATCH") return "access-status-watch";
    if (status === "COMPLETE") return "access-status-complete";
    if (status === "PENDING") return "access-status-pending";
    return "access-status-planning";
  }

  var COMPUTE_LEDGER_ORDER = [
    "cpu-sizing",
    "ram-sizing",
    "storage-iops",
    "storage-throughput",
    "vm-density",
    "gpu-vram",
    "power-thermal",
    "raid-rebuild-time",
    "backup-window",
    "nic-bonding"
  ];

  var COMPUTE_LEDGER_LABELS = {
    "cpu-sizing": "CPU Sizing",
    "ram-sizing": "RAM Sizing",
    "storage-iops": "Storage IOPS",
    "storage-throughput": "Storage Throughput",
    "vm-density": "VM Density",
    "gpu-vram": "GPU VRAM",
    "power-thermal": "Power & Thermal",
    "raid-rebuild-time": "RAID Rebuild Time",
    "backup-window": "Backup Window",
    "nic-bonding": "NIC Bonding"
  };

  function workloadResultMap(workload, plan) {
    var id = workload && (workload.id || workload.workloadId);
    var results = plan && plan.results && typeof plan.results === "object" ? plan.results : {};
    return id && results[id] && typeof results[id] === "object" ? results[id] : {};
  }

  function workloadResultPayload(entry) {
    if (!entry) return null;
    return entry.result && typeof entry.result === "object" ? entry.result : entry;
  }

  function normalizeLedgerStatus(value) {
    var status = String(value || "").toUpperCase();
    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    if (status === "GOOD" || status === "HEALTHY" || status === "COMPLETE") return "COMPLETE";
    if (status === "AUTHORITY REVIEW") return "AUTHORITY REVIEW";
    if (status === "PENDING") return "PENDING";
    return "";
  }

  function workloadCompletedMap(workload, plan) {
    var map = {};
    var completedTools = workload && workload.completedTools && typeof workload.completedTools === "object" ? workload.completedTools : {};
    var completedChecks = workload && workload.completedChecks && typeof workload.completedChecks === "object" ? workload.completedChecks : {};
    var results = workloadResultMap(workload, plan);

    Object.keys(completedTools).forEach(function (key) { if (completedTools[key]) map[key] = true; });
    Object.keys(completedChecks).forEach(function (key) { if (completedChecks[key]) map[key] = true; });
    Object.keys(results).forEach(function (key) { if (results[key]) map[key] = true; });

    return map;
  }

  function completedComputeCheckCount(workload, plan) {
    var completed = workloadCompletedMap(workload, plan);
    return Object.keys(completed).filter(function (key) { return !!completed[key]; }).length;
  }

  function latestWorkloadToolResult(workload, plan) {
    var results = workloadResultMap(workload, plan);
    var latest = null;

    COMPUTE_LEDGER_ORDER.forEach(function (tool) {
      if (results[tool]) latest = { tool: tool, entry: results[tool], payload: workloadResultPayload(results[tool]) || {} };
    });

    if (latest) return latest;

    Object.keys(results).forEach(function (tool) {
      var entry = results[tool];
      if (!latest || String(entry.updatedAt || "") > String(latest.entry.updatedAt || "")) {
        latest = { tool: tool, entry: entry, payload: workloadResultPayload(entry) || {} };
      }
    });

    return latest;
  }

  function workloadStatusValue(workload, plan) {
    if (!workload) return "PLANNING";

    var explicit = String(workload.status || workload.summaryStatus || "").toUpperCase();
    if (["RISK", "WATCH", "AUTHORITY REVIEW", "COMPLETE"].indexOf(explicit) >= 0) return explicit;

    var results = workloadResultMap(workload, plan);
    var sawComplete = false;
    var sawPending = false;

    Object.keys(results).forEach(function (tool) {
      var payload = workloadResultPayload(results[tool]) || {};
      var resultStatus = normalizeLedgerStatus(payload.status || payload.summaryStatus || results[tool].status);
      if (resultStatus === "RISK") explicit = "RISK";
      else if (resultStatus === "WATCH" && explicit !== "RISK") explicit = "WATCH";
      else if (resultStatus === "COMPLETE") sawComplete = true;
      else if (resultStatus === "PENDING") sawPending = true;
    });

    if (explicit === "RISK" || explicit === "WATCH") return explicit;
    if (workload.riskFlag || workload.hasRisk || workload.designRisk) return "RISK";
    if (workload.requiresReview || workload.needsReview || workload.vendorReview || workload.hardwareReview) return "AUTHORITY REVIEW";

    var checks = completedComputeCheckCount(workload, plan);
    if (checks >= COMPUTE_LEDGER_ORDER.length) return "COMPLETE";
    if (checks > 0 || sawComplete || sawPending || explicit === "PENDING") return "PENDING";

    var branches = branchList(workload);
    if (branches.length) return "WATCH";

    return "PLANNING";
  }

  function selectedWorkloadLabel(workload, active) {
    return active && workload && workload.id === active.id ? "Active Workload" : "Saved Workload";
  }

  function formatLedgerSummary(latest) {
    if (!latest || !latest.payload) return "";
    var payload = latest.payload;
    if (payload.keySavedResult) return String(payload.keySavedResult);
    if (payload.summary) return String(payload.summary);

    var outputs = payload.outputs && typeof payload.outputs === "object" ? payload.outputs : payload;
    if (typeof outputs.cores === "number") return outputs.cores + " cores";
    if (typeof outputs.ram === "number") return outputs.ram + " GB RAM";
    if (typeof outputs.finalIops === "number") return outputs.finalIops.toFixed(0) + " IOPS";
    if (typeof outputs.finalMBps === "number") return outputs.finalMBps.toFixed(1) + " MB/s";
    if (typeof outputs.vms === "number") return outputs.vms + " VMs";
    if (typeof outputs.vram === "number") return outputs.vram.toFixed(1) + " GB VRAM";
    if (typeof outputs.totalW === "number") return outputs.totalW.toFixed(0) + " W";
    if (typeof outputs.hours === "number") return outputs.hours.toFixed(1) + " hrs";
    if (typeof outputs.aggregate === "number") return outputs.aggregate.toFixed(1) + " Gbps";

    return "Result saved";
  }

  function workloadKeySavedResult(workload, plan) {
    var latest = latestWorkloadToolResult(workload, plan);
    if (latest) {
      var label = COMPUTE_LEDGER_LABELS[latest.tool] || titleCase(latest.tool);
      var summary = formatLedgerSummary(latest);
      return "Latest: " + label + (summary ? " - " + summary : "");
    }

    var branches = branchList(workload);
    return [
      "Env: " + titleCase(workload.environmentType),
      "Type: " + titleCase(workload.workloadType),
      "Demand: " + titleCase(workload.demandProfile),
      "Branches: " + (branches.length ? branches.join(", ") : "None")
    ].join("; ");
  }

  function workloadNextAction(workload, plan) {
    if (!workload) return "Save a workload before continuing.";
    var completed = workloadCompletedMap(workload, plan);
    var nextTool = COMPUTE_LEDGER_ORDER.find(function (tool) { return !completed[tool]; });
    if (!nextTool) return "Review Compute Summary.";
    return "Continue to " + (COMPUTE_LEDGER_LABELS[nextTool] || titleCase(nextTool)) + ".";
  }

  var COMPUTE_BRANCH_LEDGER_TOOLS = {
    core: ["cpu-sizing", "ram-sizing"],
    storage: ["storage-iops", "storage-throughput"],
    acceleration: ["gpu-vram"],
    infrastructure: ["power-thermal", "nic-bonding"],
    recovery: ["raid-rebuild-time", "backup-window"],
    infrastructureRecovery: ["power-thermal", "nic-bonding", "raid-rebuild-time", "backup-window"]
  };

  var COMPUTE_BRANCH_COMPLETE_LABELS = {
    core: "Core checks complete.",
    storage: "Storage checks complete.",
    acceleration: "GPU checks complete.",
    infrastructure: "Infrastructure checks complete.",
    recovery: "Recovery checks complete.",
    infrastructureRecovery: "Infrastructure / recovery checks complete."
  };

  function branchLedgerTools(branchScope) {
    return COMPUTE_BRANCH_LEDGER_TOOLS[branchScope] || COMPUTE_LEDGER_ORDER;
  }

  function scopedWorkloadResultMap(workload, plan, branchScope) {
    var tools = branchLedgerTools(branchScope);
    var results = workloadResultMap(workload, plan);
    var scoped = {};

    tools.forEach(function (tool) {
      if (results[tool]) scoped[tool] = results[tool];
    });

    return scoped;
  }

  function scopedCompletedMap(workload, plan, branchScope) {
    var tools = branchLedgerTools(branchScope);
    var global = workloadCompletedMap(workload, plan);
    var scoped = {};

    tools.forEach(function (tool) {
      if (global[tool]) scoped[tool] = true;
    });

    return scoped;
  }

  function completedComputeBranchCheckCount(workload, plan, branchScope) {
    if (!branchScope || branchScope === "all") return completedComputeCheckCount(workload, plan);
    var completed = scopedCompletedMap(workload, plan, branchScope);
    return Object.keys(completed).filter(function (key) { return !!completed[key]; }).length;
  }

  function latestWorkloadBranchResult(workload, plan, branchScope) {
    if (!branchScope || branchScope === "all") return latestWorkloadToolResult(workload, plan);

    var results = scopedWorkloadResultMap(workload, plan, branchScope);
    var latest = null;

    branchLedgerTools(branchScope).forEach(function (tool) {
      if (results[tool]) latest = { tool: tool, entry: results[tool], payload: workloadResultPayload(results[tool]) || {} };
    });

    return latest;
  }

  function branchPendingLabel(branchScope) {
    var first = branchLedgerTools(branchScope)[0];
    return "Pending " + (COMPUTE_LEDGER_LABELS[first] || titleCase(first)) + " check";
  }

  function workloadBranchStatusValue(workload, plan, branchScope) {
    if (!branchScope || branchScope === "all") return workloadStatusValue(workload, plan);

    var results = scopedWorkloadResultMap(workload, plan, branchScope);
    var resultKeys = Object.keys(results);

    if (!resultKeys.length) {
      return branchScope === "core" ? workloadStatusValue(workload, plan) : "PENDING";
    }

    var branchStatus = "";

    resultKeys.forEach(function (tool) {
      var payload = workloadResultPayload(results[tool]) || {};
      var resultStatus = normalizeLedgerStatus(payload.status || payload.summaryStatus || results[tool].status);
      if (resultStatus === "RISK") branchStatus = "RISK";
      else if (resultStatus === "WATCH" && branchStatus !== "RISK") branchStatus = "WATCH";
      else if (resultStatus === "PENDING" && branchStatus !== "RISK" && branchStatus !== "WATCH") branchStatus = "PENDING";
    });

    if (branchStatus) return branchStatus;

    var checks = completedComputeBranchCheckCount(workload, plan, branchScope);
    return checks >= branchLedgerTools(branchScope).length ? "COMPLETE" : "PENDING";
  }

  function workloadBranchKeySavedResult(workload, plan, branchScope) {
    var latest = latestWorkloadBranchResult(workload, plan, branchScope);

    if (latest) {
      var label = COMPUTE_LEDGER_LABELS[latest.tool] || titleCase(latest.tool);
      var summary = formatLedgerSummary(latest);
      return "Latest: " + label + (summary ? " - " + summary : "");
    }

    if (!branchScope || branchScope === "all" || branchScope === "core") {
      return workloadKeySavedResult(workload, plan);
    }

    return branchPendingLabel(branchScope);
  }

  function workloadBranchNextAction(workload, plan, branchScope) {
    if (!workload) return "Save a workload before continuing.";
    if (!branchScope || branchScope === "all" || branchScope === "core") return workloadNextAction(workload, plan);

    var completed = scopedCompletedMap(workload, plan, branchScope);
    var nextTool = branchLedgerTools(branchScope).find(function (tool) { return !completed[tool]; });

    if (!nextTool) return COMPUTE_BRANCH_COMPLETE_LABELS[branchScope] || "Branch checks complete.";
    return "Run " + (COMPUTE_LEDGER_LABELS[nextTool] || titleCase(nextTool)) + ".";
  }

  function renderComputeStatusLegend() {
    return [
      '<section class="access-status-legend" aria-label="Compute workload status legend">',
      '<h3 class="access-status-legend-title">Status Legend</h3>',
      '<div class="access-status-legend-grid">',
      '<div class="access-status-legend-item"><strong class="access-status-planning">PLANNING</strong>Workload is defined but downstream sizing has not been validated yet.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-pending">PENDING</strong>Required Compute checks are not complete.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-watch">WATCH</strong>Assumptions or optional branch checks need review, but the workload can continue.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-risk">RISK</strong>A tool assistant found a likely sizing or design conflict.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-authority">AUTHORITY REVIEW</strong>Vendor, hardware, recovery, or operational constraints may require review.</div>',
      '<div class="access-status-legend-item"><strong class="access-status-complete">COMPLETE</strong>Enough validated data exists for Compute summary rollup.</div>',
      '</div>',
      '</section>'
    ].join("");
  }

  function buildComputePlannerBranchMapHtml(workloads, groups, active, rollup) {
    workloads = workloads || [];
    groups = groups || {};
    rollup = rollup || {};

    var totalWorkloads = typeof rollup.totalWorkloads === "number" ? rollup.totalWorkloads : workloads.length;
    var coreCount = (groups.core || []).length;
    var storageCount = (groups.storage || []).length;
    var gpuCount = (groups.acceleration || []).length;
    var infrastructureCount = (groups.infrastructure || []).length;
    var recoveryCount = (groups.recovery || []).length;
    var infraRecoveryCount = infrastructureCount + recoveryCount;
    var branchTotal = typeof rollup.branchTotal === "number"
      ? rollup.branchTotal
      : storageCount + gpuCount + infrastructureCount + recoveryCount;
    var aggregateBranchTotal = typeof rollup.aggregateBranchTotal === "number"
      ? rollup.aggregateBranchTotal
      : branchTotal;

    var activeLabel = active ? active.name : "No active workload";
    var branchMapCountLabel = active
      ? "active workload / " + branchTotal + (branchTotal === 1 ? " branch" : " branches")
      : totalWorkloads + " workloads / " + aggregateBranchTotal + " branches";
    var statusText = active ? workloadStatusValue(active, rollup.plan) : computePlannerStatusLabel(workloads, branchTotal);
    var statusIsWatch = statusText === "WATCH" || statusText === "PENDING";

    var palette = {
      gridStroke: "rgba(120,255,120,.045)",
      shellFill: "rgba(0,0,0,.10)",
      shellStroke: "rgba(120,255,120,.12)",
      line: "rgba(120,255,120,.10)",
      safeFill: "rgba(30,110,48,.34)",
      safeLine: "rgba(98,255,141,.86)",
      mutedFill: "rgba(0,0,0,.14)",
      mutedLine: "rgba(148,163,184,.26)",
      mutedText: "rgba(203,213,225,.62)",
      text: "rgba(246,255,248,.96)",
      title: "rgba(246,255,248,.98)",
      label: "rgba(180,255,200,.70)",
      timeline: "rgba(203,213,225,.23)",
      timelineFill: "rgba(0,0,0,.18)",
      watchFill: "rgba(251,191,36,.10)",
      watchLine: "rgba(251,191,36,.82)"
    };

    function node(key, title, subtitle, count, x, y, width) {
      var activeNode = count > 0 || key === "core";
      var fill = activeNode ? palette.safeFill : palette.mutedFill;
      var line = activeNode ? palette.safeLine : palette.mutedLine;
      var stateLabel = activeNode ? (key === "core" ? "ACTIVE" : count + " flagged") : "not used";
      var stateFill = activeNode ? palette.safeLine : "rgba(148,163,184,.44)";

      return [
        '<rect x="' + x + '" y="' + y + '" width="' + width + '" height="58" rx="10" fill="' + fill + '" stroke="' + line + '" stroke-width="1.25" />',
        '<text x="' + (x + 12) + '" y="' + (y + 20) + '" font-size="10.5" fill="' + palette.text + '" font-weight="900">' + escapeHtml(title) + '</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 38) + '" font-size="9" fill="' + palette.mutedText + '" font-weight="800">' + escapeHtml(subtitle) + '</text>',
        '<text x="' + (x + width - 14) + '" y="' + (y + 38) + '" font-size="8.5" fill="' + stateFill + '" font-weight="900" text-anchor="end">' + escapeHtml(stateLabel) + '</text>'
      ].join("");
    }

    function link(x1, y1, x2, y2, count) {
      var activeLink = count > 0;
      var stroke = activeLink ? palette.safeLine : "rgba(203,213,225,.20)";
      var dash = activeLink ? "" : ' stroke-dasharray="7 8"';
      return '<path d="M' + x1 + ' ' + y1 + ' C' + ((x1 + x2) / 2) + ' ' + y1 + ' ' + ((x1 + x2) / 2) + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + stroke + '" stroke-width="1.25"' + dash + ' />';
    }

    function statusBadge(label, x, y) {
      var fill = statusIsWatch ? palette.watchFill : "rgba(0,0,0,.16)";
      var line = statusIsWatch ? palette.watchLine : palette.safeLine;
      var text = statusIsWatch ? palette.watchLine : palette.safeLine;

      return [
        '<rect x="' + x + '" y="' + y + '" width="92" height="30" rx="9" fill="' + fill + '" stroke="' + line + '" stroke-width="1.2" />',
        '<text x="' + (x + 46) + '" y="' + (y + 20) + '" font-size="10.5" fill="' + text + '" font-weight="800" text-anchor="middle">' + escapeHtml(label) + '</text>'
      ].join("");
    }

    function chip(label, value, x, y, width) {
      return [
        '<rect x="' + x + '" y="' + y + '" width="' + width + '" height="48" rx="8" fill="rgba(0,0,0,.16)" stroke="rgba(120,255,120,.13)" />',
        '<text x="' + (x + 10) + '" y="' + (y + 17) + '" font-size="8.5" fill="rgba(203,213,225,.66)" font-weight="850" letter-spacing=".9">' + escapeHtml(label.toUpperCase()) + '</text>',
        '<text x="' + (x + 10) + '" y="' + (y + 36) + '" font-size="18" fill="rgba(246,255,248,.96)" font-weight="850">' + escapeHtml(value) + '</text>'
      ].join("");
    }

    return [
      '<div class="access-control-planning-visual-shell access-scope-branch-map-shell" data-compute-planner-visual="workload-branch-map">',
      '<svg viewBox="0 0 760 388" role="img" aria-label="Compute Workload Planner branch map visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="computeGridWorkloadBranchV1" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="' + palette.gridStroke + '" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="340" rx="16" fill="' + palette.shellFill + '" stroke="' + palette.shellStroke + '" />',
      '<rect x="36" y="36" width="688" height="316" rx="12" fill="url(#computeGridWorkloadBranchV1)" stroke="' + palette.line + '" />',
      '<text x="52" y="62" font-size="11" fill="' + palette.label + '" letter-spacing="1.4">COMPUTE WORKLOAD PLANNER</text>',
      '<text x="52" y="84" font-size="19" fill="' + palette.title + '" font-weight="650">Workload ledger, core pipeline, and specialty branch map</text>',
      statusBadge(statusText, 616, 51),

      '<rect x="278" y="112" width="204" height="72" rx="14" fill="' + palette.safeFill + '" stroke="' + palette.safeLine + '" stroke-width="1.35" />',
      '<text x="380" y="139" font-size="12" fill="' + palette.text + '" font-weight="950" text-anchor="middle">WORKLOAD LEDGER</text>',
      '<text x="380" y="158" font-size="9.4" fill="' + palette.mutedText + '" font-weight="800" text-anchor="middle">' + escapeHtml(activeLabel) + '</text>',
      '<text x="380" y="176" font-size="9.4" fill="' + palette.safeLine + '" font-weight="900" text-anchor="middle">' + escapeHtml(branchMapCountLabel) + '</text>',

      link(278, 148, 168, 148, coreCount),
      link(482, 148, 592, 148, storageCount),
      link(278, 176, 168, 246, gpuCount),
      link(482, 176, 592, 246, infraRecoveryCount),

      node("core", "Core Compute Pipeline", "CPU / RAM / storage / summary", coreCount, 52, 119, 192),
      node("storage", "Storage Performance", "IOPS / throughput pressure", storageCount, 516, 119, 192),
      node("gpu", "GPU / Acceleration", "VRAM / AI / rendering lanes", gpuCount, 52, 220, 192),
      node("infra", "Infrastructure / Recovery", "Power / NIC / RAID / backup", infraRecoveryCount, 516, 220, 192),

      '<path d="M172 206 H588" stroke="' + palette.timeline + '" stroke-width="1.25" stroke-dasharray="6 7" />',
      '<circle cx="266" cy="206" r="5" fill="' + palette.timelineFill + '" stroke="' + palette.safeLine + '" />',
      '<circle cx="380" cy="206" r="5" fill="' + palette.timelineFill + '" stroke="' + palette.safeLine + '" />',
      '<circle cx="494" cy="206" r="5" fill="' + palette.timelineFill + '" stroke="' + palette.safeLine + '" />',
      '<text x="266" y="224" font-size="9" fill="' + palette.mutedText + '" text-anchor="middle">define</text>',
      '<text x="380" y="224" font-size="9" fill="' + palette.mutedText + '" text-anchor="middle">branch</text>',
      '<text x="494" y="224" font-size="9" fill="' + palette.mutedText + '" text-anchor="middle">continue</text>',

      chip("workloads", String(totalWorkloads), 74, 304, 106),
      chip("core", String(coreCount), 196, 304, 88),
      chip("storage", String(storageCount), 300, 304, 92),
      chip("gpu", String(gpuCount), 408, 304, 82),
      chip("infra/recovery", String(infraRecoveryCount), 506, 304, 130),

      '</svg>',
      '<p class="sl-vis-note"><strong>Visual note:</strong> Workload Planner is the Compute entry lane. This map follows the current active workload while the rollup metrics below still summarize all saved workloads.</p>',
      '</div>'
    ].join("");
  }

  function summaryBranches(workloads, plan) {
    var groups = {
      core: [],
      storage: [],
      acceleration: [],
      infrastructure: [],
      recovery: []
    };

    (workloads || []).forEach(function (workload) {
      groups.core.push(workload);
      var branches = workload.branches || {};
      var results = workloadResultMap(workload, plan);

      if (branches.storageHeavy || results["storage-iops"] || results["storage-throughput"]) groups.storage.push(workload);
      if (branches.gpu || results["gpu-vram"]) groups.acceleration.push(workload);
      if (branches.powerThermal || branches.nicBonding || results["power-thermal"] || results["nic-bonding"]) groups.infrastructure.push(workload);
      if (branches.raid || branches.backup || results["raid-rebuild-time"] || results["backup-window"]) groups.recovery.push(workload);
    });

    return groups;
  }

  function renderSummary(plan) {
    var workloads = plan.workloads || [];
    var active = State.activeWorkload(plan);
    var groups = summaryBranches(workloads, plan);
    var activeGroups = active ? summaryBranches([active], plan) : groups;

    if (els.activeWorkloadLabel) {
      els.activeWorkloadLabel.textContent = "Active workload: " + (active ? active.name : "No active workload selected");
    }

    if (!els.scopeSummary) return;

    if (!workloads.length) {
      els.scopeSummary.innerHTML = '<p class="muted">Save at least one Compute workload to build the summary.</p>';
      return;
    }

    var branchTotal = groups.storage.length + groups.acceleration.length + groups.infrastructure.length + groups.recovery.length;
    var activeBranchTotal = active
      ? activeGroups.storage.length + activeGroups.acceleration.length + activeGroups.infrastructure.length + activeGroups.recovery.length
      : branchTotal;
    var branchMapHtml = buildComputePlannerBranchMapHtml(
      active ? [active] : workloads,
      activeGroups,
      active,
      {
        branchTotal: activeBranchTotal,
        totalWorkloads: workloads.length,
        aggregateBranchTotal: branchTotal,
        visualMode: active ? "active-workload" : "aggregate",
        plan: plan
      }
    );

    function table(title, description, list, branchScope) {
      var countLabel = list.length + (list.length === 1 ? " WORKLOAD" : " WORKLOADS");
      var emptyLabel = "No " + String(title || "workload").toLowerCase() + " workloads have been defined yet.";

      var rows = list.length ? list.map(function (workload) {
        var selected = selectedWorkloadLabel(workload, active);
        var selectedClass = selected === "Active Workload" ? "access-status-active-text" : "access-status-planning";
        var status = workloadBranchStatusValue(workload, plan, branchScope);
        var checks = completedComputeBranchCheckCount(workload, plan, branchScope);

        return [
          '<tr>',
          '<td><strong>' + escapeHtml(workload.name) + '</strong><br><span class="muted">' + escapeHtml(titleCase(workload.environmentType)) + ' | ' + escapeHtml(titleCase(workload.workloadType)) + ' | ' + escapeHtml(titleCase(workload.demandProfile)) + '</span></td>',
          '<td><strong class="' + selectedClass + '">' + escapeHtml(selected) + '</strong></td>',
          '<td><strong class="' + computeStatusClass(status) + '">' + escapeHtml(status) + '</strong></td>',
          '<td>' + checks + '</td>',
          '<td>' + escapeHtml(workloadBranchKeySavedResult(workload, plan, branchScope)) + '</td>',
          '<td>' + escapeHtml(workloadBranchNextAction(workload, plan, branchScope)) + '</td>',
          '</tr>'
        ].join("");
      }).join("") : '<tr><td colspan="6" class="muted">' + escapeHtml(emptyLabel) + '</td></tr>';

      return [
        '<section class="access-scope-summary-branch">',
        '<div class="access-scope-summary-branch-head"><h3>' + escapeHtml(title) + '</h3><span class="access-scope-summary-branch-count">' + countLabel + '</span></div>',
        '<p class="access-scope-branch-description">' + escapeHtml(description) + '</p>',
        '<table class="access-scope-summary-table"><thead><tr>',
        '<th>Workload</th>',
        '<th>Selected</th>',
        '<th>Status</th>',
        '<th>Checks</th>',
        '<th>Key Saved Result</th>',
        '<th>Next Action</th>',
        '</tr></thead><tbody>',
        rows,
        '</tbody></table></section>'
      ].join("");
    }

    els.scopeSummary.innerHTML = [
      branchMapHtml,
      '<div class="access-scope-summary-rollup">',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Workloads</span><span class="access-scope-summary-value">' + workloads.length + '</span><div class="access-scope-summary-note">Defined Compute environments.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Core Pipeline</span><span class="access-scope-summary-value">' + groups.core.length + '</span><div class="access-scope-summary-note">Workloads entering CPU/RAM/storage flow.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Specialty Branches</span><span class="access-scope-summary-value">' + branchTotal + '</span><div class="access-scope-summary-note">GPU, storage, infrastructure, or recovery lanes.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Storage Flags</span><span class="access-scope-summary-value">' + groups.storage.length + '</span><div class="access-scope-summary-note">IOPS / throughput branch seeds.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">GPU Flags</span><span class="access-scope-summary-value">' + groups.acceleration.length + '</span><div class="access-scope-summary-note">Acceleration review lanes.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Infra / Recovery</span><span class="access-scope-summary-value">' + (groups.infrastructure.length + groups.recovery.length) + '</span><div class="access-scope-summary-note">Power, NIC, RAID, or backup checks.</div></div>',
      '</div>',
      renderComputeStatusLegend(),
      active ? '<div class="access-scope-warn"><strong>Active workload:</strong> ' + escapeHtml(active.name) + ' continues to CPU Sizing.</div>' : '',
      table("Core Compute Pipeline", "Every saved workload starts with CPU Sizing, then moves into RAM and storage checks as required.", groups.core, "core"),
      table("Storage / Performance Branches", "Workloads flagged for IOPS or throughput review should not stop at CPU/RAM sizing.", groups.storage, "storage"),
      table("GPU / Acceleration Branches", "Workloads flagged for GPU review need VRAM and acceleration validation.", groups.acceleration, "acceleration"),
      table("Infrastructure / Recovery Branches", "Workloads flagged for power, network, RAID, or backup review need infrastructure validation before summary closeout.", groups.infrastructure.concat(groups.recovery), "infrastructureRecovery")
    ].join("");
  }

  function render() {
    bindActiveVisualRefresh();
    var plan = State.load();
    var active = State.activeWorkload(plan);
    renderLedger(plan);
    renderSummary(plan);
    if (active && !editingId) hydrate(active);
  }


  function bindActiveVisualRefresh() {
    if (!State || typeof State.onPlanChange !== "function" || bindActiveVisualRefresh.bound) return;

    bindActiveVisualRefresh.bound = true;
    State.onPlanChange(function () {
      render();
    });
  }

  function copySummary() {
    var text = els.scopeSummary ? (els.scopeSummary.innerText || els.scopeSummary.textContent || "") : "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      status("Compute workload summary copied.");
    }).catch(function () {
      status("Copy failed. Select the summary text manually.");
    });
  }

  function printSummary() {
    save();
    window.print();
  }


  function moveReportMetadataToBottom() {
    var metadata = document.getElementById(config.metadataSectionId || "categoryPlannerReportMetadataSection");
    var summary = document.getElementById("scopeSummaryCard");

    if (!metadata || !summary || !summary.parentNode) return false;
    if (metadata.previousElementSibling === summary) return true;

    summary.parentNode.insertBefore(metadata, summary.nextSibling);
    metadata.setAttribute("data-compute-metadata-placement", "after-summary");
    return true;
  }
  function boot() {
    if (!Shell) {
      console.error("ScopedLabsCategoryPlannerShell did not load.");
      return;
    }

    var mount = document.querySelector("[data-category-planner-shell-mount]");
    Shell.render(mount, config);
    moveReportMetadataToBottom();
    cacheEls();
    hideStarterPlaceholders();

    if (!State) {
      status("Compute plan state module did not load.");
      return;
    }

    var plan = State.load();
    var active = State.activeWorkload(plan);
    if (active) hydrate(active);

    render();
    updateBranchCards();

    if (els.saveWorkload) els.saveWorkload.addEventListener("click", save);
    if (els.newWorkload) els.newWorkload.addEventListener("click", clearForm);
    if (els.resetPlan) {
      els.resetPlan.addEventListener("click", function () {
        if (!confirm("Reset the saved Compute workload plan for this browser?")) return;
        State.reset();
        editingId = null;
        clearForm();
        render();
        status("Compute workload plan reset.");
      });
    }

    if (els.planningPath) els.planningPath.addEventListener("change", syncBranches);

    [els.needsVmDensity, els.storageHeavy, els.needsGpu, els.needsPowerThermal, els.needsRaid, els.needsBackup, els.needsNic].forEach(function (el) {
      if (el) el.addEventListener("change", updateBranchCards);
    });

    if (els.continue) {
      els.continue.addEventListener("click", startGuidedFlowFromPlanner);
    }

    if (els.copyWorkloadSummary) els.copyWorkloadSummary.addEventListener("click", copySummary);
    if (els.printWorkloadSummary) els.printWorkloadSummary.addEventListener("click", printSummary);

    window.ScopedLabsToolShell && window.ScopedLabsToolShell.applyBackContinueShell && window.ScopedLabsToolShell.applyBackContinueShell({ rowId: "accessScopePlannerFlowActions" });
  }

  window.ScopedLabsComputePlannerAdapter = Object.freeze({
    version: VERSION,
    boot: boot
  });
})();