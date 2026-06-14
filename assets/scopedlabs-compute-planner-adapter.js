(function () {
  "use strict";

  var VERSION = "scopedlabs-compute-planner-adapter-003-path-branches";
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
    ledgerInline: "active Compute workload context",
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
    continueLabel: "Continue → CPU Sizing",
    flow: {
      id: "computeWorkloadDesignFlowCard",
      eyebrow: "Design Flow",
      sections: [
        {
          label: "FOUNDATION",
          copy: "Create or select the compute workload being planned.",
          steps: [{ label: "Compute Workload Planner", href: "/tools/compute/workload-planner/", active: true }]
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
    status("Compute workload saved. Continue to CPU Sizing when ready.");
    return result.workload;
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
        var plan = State.load();
        plan.workloads = (plan.workloads || []).filter(function (item) { return item.id !== id; });
        if (plan.activeWorkloadId === id) plan.activeWorkloadId = plan.workloads[0] ? plan.workloads[0].id : null;
        State.save(plan);
        render();
        status("Compute workload deleted.");
      });
    });
  }

  function summaryBranches(workloads) {
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
      if (branches.storageHeavy) groups.storage.push(workload);
      if (branches.gpu) groups.acceleration.push(workload);
      if (branches.powerThermal || branches.nicBonding) groups.infrastructure.push(workload);
      if (branches.raid || branches.backup) groups.recovery.push(workload);
    });

    return groups;
  }

  function renderSummary(plan) {
    var workloads = plan.workloads || [];
    var active = State.activeWorkload(plan);
    var groups = summaryBranches(workloads);

    if (els.activeWorkloadLabel) {
      els.activeWorkloadLabel.textContent = "Active workload: " + (active ? active.name : "No active workload selected");
    }

    if (!els.scopeSummary) return;

    if (!workloads.length) {
      els.scopeSummary.innerHTML = '<p class="muted">Save at least one Compute workload to build the summary.</p>';
      return;
    }

    var branchTotal = groups.storage.length + groups.acceleration.length + groups.infrastructure.length + groups.recovery.length;

    function table(title, description, list) {
      return [
        '<section class="access-scope-summary-branch">',
        '<div class="access-scope-summary-branch-head"><h3>' + escapeHtml(title) + '</h3><span class="access-scope-summary-branch-count">' + list.length + ' workloads</span></div>',
        '<p class="access-scope-branch-description">' + escapeHtml(description) + '</p>',
        '<table class="access-scope-summary-table"><thead><tr><th>Workload</th><th>Path</th><th>Criticality</th><th>Branch Seeds</th><th>Next Action</th></tr></thead><tbody>',
        list.map(function (workload) {
          var branches = branchList(workload);
          return '<tr><td><strong>' + escapeHtml(workload.name) + '</strong><br><span class="muted">' + escapeHtml(titleCase(workload.environmentType)) + '</span></td><td>' + escapeHtml(titleCase(workload.planningPath)) + '</td><td>' + escapeHtml(titleCase(workload.criticality)) + '</td><td>' + (branches.length ? escapeHtml(branches.join(", ")) : "None") + '</td><td>Continue to CPU Sizing.</td></tr>';
        }).join(""),
        '</tbody></table></section>'
      ].join("");
    }

    els.scopeSummary.innerHTML = [
      '<div class="access-scope-summary-rollup">',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Workloads</span><span class="access-scope-summary-value">' + workloads.length + '</span><div class="access-scope-summary-note">Defined Compute environments.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Core Pipeline</span><span class="access-scope-summary-value">' + groups.core.length + '</span><div class="access-scope-summary-note">Workloads entering CPU/RAM/storage flow.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Specialty Branches</span><span class="access-scope-summary-value">' + branchTotal + '</span><div class="access-scope-summary-note">GPU, storage, infrastructure, or recovery lanes.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Storage Flags</span><span class="access-scope-summary-value">' + groups.storage.length + '</span><div class="access-scope-summary-note">IOPS / throughput branch seeds.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">GPU Flags</span><span class="access-scope-summary-value">' + groups.acceleration.length + '</span><div class="access-scope-summary-note">Acceleration review lanes.</div></div>',
      '<div class="access-scope-summary-metric"><span class="access-scope-summary-label">Infra / Recovery</span><span class="access-scope-summary-value">' + (groups.infrastructure.length + groups.recovery.length) + '</span><div class="access-scope-summary-note">Power, NIC, RAID, or backup checks.</div></div>',
      '</div>',
      active ? '<div class="access-scope-warn"><strong>Active workload:</strong> ' + escapeHtml(active.name) + ' continues to CPU Sizing.</div>' : '',
      table("Core Compute Pipeline", "Every saved workload starts with CPU Sizing, then moves into RAM and storage checks as required.", groups.core),
      table("Storage / Performance Branches", "Workloads flagged for IOPS or throughput review should not stop at CPU/RAM sizing.", groups.storage),
      table("GPU / Acceleration Branches", "Workloads flagged for GPU review need VRAM and acceleration validation.", groups.acceleration),
      table("Infrastructure / Recovery Branches", "Workloads flagged for power, network, RAID, or backup review need infrastructure validation before summary closeout.", groups.infrastructure.concat(groups.recovery))
    ].join("");
  }

  function render() {
    var plan = State.load();
    var active = State.activeWorkload(plan);
    renderLedger(plan);
    renderSummary(plan);
    if (active && !editingId) hydrate(active);
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

  function boot() {
    if (!Shell) {
      console.error("ScopedLabsCategoryPlannerShell did not load.");
      return;
    }

    var mount = document.querySelector("[data-category-planner-shell-mount]");
    Shell.render(mount, config);
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
      els.continue.addEventListener("click", function () {
        save();
      });
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