(function () {
  "use strict";

  var NEXT_URL = "/tools/compute/cpu-sizing/";
  var State = window.ScopedLabsComputePlanState;

  function $(id) {
    return document.getElementById(id);
  }

  var els = {
    workloadName: $("workloadName"),
    environmentType: $("environmentType"),
    planningPath: $("planningPath"),
    workloadType: $("workloadType"),
    demandPattern: $("demandPattern"),
    criticality: $("criticality"),
    concurrencyBaseline: $("concurrencyBaseline"),
    operatingWindow: $("operatingWindow"),
    targetUtilization: $("targetUtilization"),
    growthMargin: $("growthMargin"),
    redundancyGoal: $("redundancyGoal"),
    primaryConstraint: $("primaryConstraint"),
    workloadNotes: $("workloadNotes"),
    needsVmDensity: $("needsVmDensity"),
    storageHeavy: $("storageHeavy"),
    needsGpu: $("needsGpu"),
    needsPowerThermal: $("needsPowerThermal"),
    needsRaid: $("needsRaid"),
    needsBackup: $("needsBackup"),
    needsNic: $("needsNic"),
    vmBranchCard: $("vmBranchCard"),
    gpuBranchCard: $("gpuBranchCard"),
    protectionBranchCard: $("protectionBranchCard"),
    infrastructureBranchCard: $("infrastructureBranchCard"),
    projectName: $("projectName"),
    clientName: $("clientName"),
    preparedBy: $("preparedBy"),
    reportNotes: $("reportNotes"),
    saveWorkload: $("saveWorkload"),
    newWorkload: $("newWorkload"),
    resetPlan: $("resetPlan"),
    workloadList: $("workloadList"),
    workloadCountLabel: $("workloadCountLabel"),
    workloadSummary: $("workloadSummary"),
    plannerStatus: $("plannerStatus"),
    printWorkloadSummary: $("printWorkloadSummary"),
    copyWorkloadSummary: $("copyWorkloadSummary"),
    continueTop: $("continue"),
    continueBottom: $("continueBottom")
  };

  var editingWorkloadId = null;

  function status(message) {
    if (els.plannerStatus) els.plannerStatus.textContent = message || "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function label(value) {
    return String(value || "n/a").replace(/-/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
  }

  function numberValue(el, fallback) {
    var value = Number(el && el.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function setChecked(el, value) {
    if (el) el.checked = Boolean(value);
  }

  function checked(el) {
    return Boolean(el && el.checked);
  }

  function branchDefaultsFromPath(path) {
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

  function syncBranchesFromPath() {
    var path = els.planningPath ? els.planningPath.value : "standard-server";
    var defaults = branchDefaultsFromPath(path);

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
    if (els.vmBranchCard) els.vmBranchCard.hidden = !checked(els.needsVmDensity);
    if (els.gpuBranchCard) els.gpuBranchCard.hidden = !checked(els.needsGpu);
    if (els.protectionBranchCard) els.protectionBranchCard.hidden = !(checked(els.needsRaid) || checked(els.needsBackup));
    if (els.infrastructureBranchCard) els.infrastructureBranchCard.hidden = !(checked(els.needsPowerThermal) || checked(els.needsNic));
  }

  function collectWorkload() {
    return {
      id: editingWorkloadId,
      name: (els.workloadName && els.workloadName.value.trim()) || "Compute Workload",
      environmentType: els.environmentType ? els.environmentType.value : "production",
      planningPath: els.planningPath ? els.planningPath.value : "standard-server",
      workloadType: els.workloadType ? els.workloadType.value : "general",
      demandPattern: els.demandPattern ? els.demandPattern.value : "steady",
      criticality: els.criticality ? els.criticality.value : "standard",
      concurrencyBaseline: numberValue(els.concurrencyBaseline, 0),
      operatingWindow: els.operatingWindow ? els.operatingWindow.value : "business-hours",
      targetUtilization: numberValue(els.targetUtilization, 70),
      growthMargin: numberValue(els.growthMargin, 25),
      redundancyGoal: els.redundancyGoal ? els.redundancyGoal.value : "single-host",
      primaryConstraint: els.primaryConstraint ? els.primaryConstraint.value : "balanced",
      notes: els.workloadNotes ? els.workloadNotes.value : "",
      metadata: {
        projectName: els.projectName ? els.projectName.value : "",
        clientName: els.clientName ? els.clientName.value : "",
        preparedBy: els.preparedBy ? els.preparedBy.value : "",
        reportNotes: els.reportNotes ? els.reportNotes.value : ""
      },
      branches: {
        vmDensity: checked(els.needsVmDensity),
        storageHeavy: checked(els.storageHeavy),
        gpu: checked(els.needsGpu),
        powerThermal: checked(els.needsPowerThermal),
        raid: checked(els.needsRaid),
        backup: checked(els.needsBackup),
        nicBonding: checked(els.needsNic)
      }
    };
  }

  function hydrateWorkload(workload) {
    if (!workload) return;

    editingWorkloadId = workload.id || null;

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

  function summaryText(workload) {
    if (!workload) return "No active workload saved yet.";

    var branches = branchList(workload);
    return [
      "Active Compute workload: " + workload.name,
      "Environment: " + label(workload.environmentType),
      "Planning path: " + label(workload.planningPath),
      "Workload type: " + label(workload.workloadType),
      "Demand pattern: " + label(workload.demandPattern),
      "Criticality: " + label(workload.criticality),
      "Baseline concurrency: " + workload.concurrencyBaseline,
      "Target utilization ceiling: " + workload.targetUtilization + "%",
      "Growth margin: " + workload.growthMargin + "%",
      "Primary constraint: " + label(workload.primaryConstraint),
      "Branch checks: " + (branches.length ? branches.join(", ") : "None flagged"),
      "Next action: Continue to CPU Sizing, then validate RAM, storage, density, acceleration, infrastructure, and recovery as required."
    ].join("\n");
  }

  function renderSummary() {
    var plan = State.load();
    var active = State.activeWorkload(plan);
    if (els.workloadSummary) els.workloadSummary.textContent = summaryText(active);
  }

  function renderLedger() {
    var plan = State.load();
    var workloads = plan.workloads || [];

    if (els.workloadCountLabel) {
      els.workloadCountLabel.textContent = workloads.length + (workloads.length === 1 ? " workload" : " workloads");
    }

    if (!els.workloadList) return;

    if (!workloads.length) {
      els.workloadList.innerHTML = '<p class="muted">No Compute workloads saved yet.</p>';
      renderSummary();
      return;
    }

    els.workloadList.innerHTML = workloads.map(function (workload) {
      var active = workload.id === plan.activeWorkloadId;
      var branches = branchList(workload);
      return (
        '<article class="scope-item" data-active="' + String(active) + '">' +
          '<strong>' + escapeHtml(workload.name || "Compute Workload") + '</strong>' +
          '<p class="muted" style="margin:.35rem 0 0;">' +
            escapeHtml(label(workload.environmentType)) + " • " +
            escapeHtml(label(workload.workloadType)) + " • " +
            escapeHtml(label(workload.planningPath)) +
          '</p>' +
          '<p class="muted" style="margin:.35rem 0 0;">Branches: ' + escapeHtml(branches.length ? branches.join(", ") : "None flagged") + '</p>' +
          '<div class="btn-row" style="margin-top:10px;">' +
            '<button class="btn" type="button" data-edit-workload="' + escapeHtml(workload.id) + '">Edit</button>' +
            '<button class="btn" type="button" data-set-active="' + escapeHtml(workload.id) + '">Set Active</button>' +
          '</div>' +
        '</article>'
      );
    }).join("");

    Array.from(els.workloadList.querySelectorAll("[data-edit-workload]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-edit-workload");
        var plan = State.load();
        var workload = plan.workloads.find(function (item) { return item.id === id; });
        hydrateWorkload(workload);
        State.setActiveWorkload(id);
        renderLedger();
        renderSummary();
        status("Loaded workload for editing.");
      });
    });

    Array.from(els.workloadList.querySelectorAll("[data-set-active]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-set-active");
        var workload = State.setActiveWorkload(id);
        if (workload) {
          hydrateWorkload(workload);
          renderLedger();
          renderSummary();
          status("Active Compute workload set.");
        }
      });
    });

    renderSummary();
  }

  function saveCurrentWorkload() {
    if (!State) {
      status("Compute plan state module is not available.");
      return null;
    }

    var result = State.upsertWorkload(collectWorkload());
    editingWorkloadId = result.workload.id;
    renderLedger();
    renderSummary();
    status("Compute workload saved. Continue to CPU Sizing when ready.");
    return result.workload;
  }

  function clearForm() {
    editingWorkloadId = null;
    if (els.workloadName) els.workloadName.value = "";
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
    if (els.workloadNotes) els.workloadNotes.value = "";
    if (els.projectName) els.projectName.value = "";
    if (els.clientName) els.clientName.value = "";
    if (els.preparedBy) els.preparedBy.value = "";
    if (els.reportNotes) els.reportNotes.value = "";

    [els.needsVmDensity, els.storageHeavy, els.needsGpu, els.needsPowerThermal, els.needsRaid, els.needsBackup, els.needsNic].forEach(function (el) {
      setChecked(el, false);
    });

    updateBranchCards();
    status("Ready for a new Compute workload.");
  }

  function copySummary() {
    var text = els.workloadSummary ? els.workloadSummary.textContent : "";
    if (!text) return;

    navigator.clipboard.writeText(text).then(function () {
      status("Compute workload summary copied.");
    }).catch(function () {
      status("Copy failed. Select the summary text manually.");
    });
  }

  function printSummary() {
    saveCurrentWorkload();
    window.print();
  }

  function wire() {
    if (!State) {
      status("Compute plan state module did not load.");
      return;
    }

    var plan = State.load();
    var active = State.activeWorkload(plan);
    if (active) hydrateWorkload(active);

    renderLedger();
    renderSummary();
    updateBranchCards();

    if (els.saveWorkload) els.saveWorkload.addEventListener("click", saveCurrentWorkload);
    if (els.newWorkload) els.newWorkload.addEventListener("click", clearForm);
    if (els.resetPlan) {
      els.resetPlan.addEventListener("click", function () {
        if (!confirm("Reset the saved Compute workload plan for this browser?")) return;
        State.reset();
        clearForm();
        renderLedger();
        renderSummary();
        status("Compute workload plan reset.");
      });
    }

    if (els.planningPath) els.planningPath.addEventListener("change", syncBranchesFromPath);

    [els.needsVmDensity, els.storageHeavy, els.needsGpu, els.needsPowerThermal, els.needsRaid, els.needsBackup, els.needsNic].forEach(function (el) {
      if (el) el.addEventListener("change", updateBranchCards);
    });

    [els.continueTop, els.continueBottom].forEach(function (link) {
      if (!link) return;
      link.href = NEXT_URL;
      link.addEventListener("click", function () {
        saveCurrentWorkload();
      });
    });

    if (els.copyWorkloadSummary) els.copyWorkloadSummary.addEventListener("click", copySummary);
    if (els.printWorkloadSummary) els.printWorkloadSummary.addEventListener("click", printSummary);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();