(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "ram-sizing";
  const LANE = "v1";
  const PREVIOUS_STEP = "cpu-sizing";

  const FLOW_KEYS = {
    "cpu-sizing": "scopedlabs:pipeline:compute:cpu-sizing",
    "ram-sizing": "scopedlabs:pipeline:compute:ram-sizing",
    "storage-iops": "scopedlabs:pipeline:compute:storage-iops",
    "storage-throughput": "scopedlabs:pipeline:compute:storage-throughput",
    "vm-density": "scopedlabs:pipeline:compute:vm-density",
    "gpu-vram": "scopedlabs:pipeline:compute:gpu-vram",
    "power-thermal": "scopedlabs:pipeline:compute:power-thermal",
    "raid-rebuild-time": "scopedlabs:pipeline:compute:raid-rebuild-time",
    "backup-window": "scopedlabs:pipeline:compute:backup-window"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;
  let cpuContext = null;
  let carriedWorkloadHydrated = false;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    workload: $("workload"),
    concurrency: $("concurrency"),
    perProc: $("perProc"),
    osGb: $("osGb"),
    headroom: $("headroom"),
    results: $("results"),
    flowNote: $("flow-note"),
    workloadContextCard: $("computeWorkloadContextCard"),
    workloadContextTitle: $("computeWorkloadContextTitle"),
    workloadContextCopy: $("computeWorkloadContextCopy"),
    workloadContextMeta: $("computeWorkloadContextMeta"),
    analysisCopy: $("analysis-copy"),
    ramVisualCard: $("computeRamVisualCard"),
    ramVisual: $("computeRamVisual"),
    ramReferencesCard: $("computeRamReferencesCard"),
    ramReferences: $("computeRamReferences"),
    ramRecommendedActionsCard: $("computeRamRecommendedActionsCard"),
    ramRecommendedActions: $("computeRamRecommendedActions"),
    ramDecisionScheduleCard: $("computeRamDecisionScheduleCard"),
    ramDecisionSchedule: $("computeRamDecisionSchedule"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function workloadFactor(workload) {
    if (workload === "db") return 1.3;
    if (workload === "virtualization") return 1.25;
    if (workload === "analytics") return 1.4;
    if (workload === "video") return 1.2;
    if (workload === "compute") return 1.1;
    if (workload === "web") return 1.1;
    return 1.0;
  }

  function normalizeRamWorkloadValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const key = raw.toLowerCase().replace(/[_\s/]+/g, "-");
    const map = {
      general: "general",
      mixed: "general",
      web: "web",
      "web-api": "web",
      api: "web",
      db: "db",
      database: "db",
      virtualization: "virtualization",
      virtualized: "virtualization",
      analytics: "analytics",
      "analytics-ml": "analytics",
      ml: "analytics",
      video: "video",
      "video-transcode": "video",
      transcode: "video",
      compute: "compute",
      "compute-heavy": "compute",
      "compute-heavy-batch": "compute",
      batch: "compute"
    };

    const normalized = map[key] || raw;
    if (!els.workload || !els.workload.querySelector('option[value="' + normalized + '"]')) return "";
    return normalized;
  }

  function hydrateRamWorkloadFromCpu(data) {
    if (carriedWorkloadHydrated || !data || !els.workload) return;

    const next = normalizeRamWorkloadValue(
      data.workload ||
      data.workloadType ||
      (data.inputs && data.inputs.workloadType)
    );

    if (!next) return;

    els.workload.value = next;
    carriedWorkloadHydrated = true;
  }

  function ramPlannerContextFromCpu(data) {
    return data && data.plannerContext && typeof data.plannerContext === "object" ? data.plannerContext : null;
  }

  function ramUpstreamCpuContext(data) {
    if (!data || typeof data !== "object") return null;

    return {
      cores: data.cores,
      physicalCores: data.physicalCores,
      eff: data.eff,
      workload: data.workload,
      status: data.status,
      utilizationTarget: data.utilizationTarget,
      growthReservePercent: data.growthReservePercent,
      workloadPattern: data.workloadPattern,
      plannerContext: ramPlannerContextFromCpu(data)
    };
  }

  function refreshFlowNote() {
    function hideWorkloadContext() {
      if (els.flowNote) {
        els.flowNote.hidden = true;
        els.flowNote.innerHTML = "";
      }
      if (els.workloadContextCard) els.workloadContextCard.hidden = true;
      if (els.workloadContextTitle) els.workloadContextTitle.textContent = "No active Compute workload selected";
      if (els.workloadContextCopy) els.workloadContextCopy.textContent = "Continue from CPU sizing or open a Compute workload before using this tool so the RAM result can be tied to the right workload plan.";
      if (els.workloadContextMeta) els.workloadContextMeta.innerHTML = "";
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function firstValue() {
      for (let i = 0; i < arguments.length; i += 1) {
        const value = arguments[i];
        if (value !== undefined && value !== null && value !== "") return value;
      }
      return "Not specified";
    }

    function pct(value) {
      if (value === undefined || value === null || value === "") return "Not specified";
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return Math.round(n) + "%";
    }

    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      hideWorkloadContext();
      cpuContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      hideWorkloadContext();
      cpuContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      hideWorkloadContext();
      cpuContext = null;
      return;
    }

    const data = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
    cpuContext = data;
    hydrateWorkloadFromCpu(data);

    if (els.flowNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
    }

    const planner = ramPlannerContextFromCpu(data) || {};
    const title = firstValue(
      planner.title,
      planner.name,
      planner.workloadName,
      planner.projectName,
      planner.label,
      "Active Compute workload"
    );

    const workloadType = firstValue(planner.workloadType, planner.workload, data.workloadPattern, data.workload);
    const branches = Array.isArray(planner.branches) ? planner.branches.join(", ") : firstValue(planner.branches, planner.branch, "None selected");
    const meta = [
      ["Environment", firstValue(planner.environment, planner.environmentType, planner.location)],
      ["Workload Type", workloadType],
      ["Demand", firstValue(planner.demand, planner.demandProfile, planner.loadProfile, data.demand)],
      ["Status", firstValue(data.status, planner.status)],
      ["Path", firstValue(planner.path, planner.workflowPath, planner.pipelinePath)],
      ["Target Utilization", pct(firstValue(planner.targetUtilization, data.utilizationTarget))],
      ["Growth Margin", pct(firstValue(planner.growthMargin, data.growthReservePercent))],
      ["Branches", branches]
    ];

    if (els.workloadContextTitle) els.workloadContextTitle.textContent = String(title);
    if (els.workloadContextCopy) els.workloadContextCopy.textContent = String(title) + " is the active workload context for this RAM sizing result.";
    if (els.workloadContextMeta) {
      els.workloadContextMeta.innerHTML = meta.map(function (item) {
        return '<div><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>';
      }).join("");
    }
    if (els.workloadContextCard) els.workloadContextCard.hidden = false;
  }

  function clearRamCapacityVisual() {
    if (els.ramVisual) {
      els.ramVisual.innerHTML = "";
    }
    if (els.ramVisualCard) {
      els.ramVisualCard.hidden = true;
    }
  }

  function renderRamCapacityVisual(result) {
    if (window.ScopedLabsComputeCapacityVisuals && typeof window.ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope === "function") {
      window.ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope({
        card: els.ramVisualCard,
        mount: els.ramVisual,
        result
      });
    }
  }

  function clearRamReferences() {
    if (els.ramReferences) els.ramReferences.innerHTML = "";
    if (els.ramReferencesCard) els.ramReferencesCard.hidden = true;
  }

  function renderRamReferences(result) {
    if (!els.ramReferences || !els.ramReferencesCard) return false;
    if (!window.ScopedLabsComputeAssistant || typeof window.ScopedLabsComputeAssistant.renderRamRecommendationReferences !== "function") return false;

    els.ramReferences.innerHTML = window.ScopedLabsComputeAssistant.renderRamRecommendationReferences(result);
    els.ramReferencesCard.hidden = false;
    return true;
  }

  function clearRamRecommendedActions() {
    if (els.ramRecommendedActions) els.ramRecommendedActions.innerHTML = "";
    if (els.ramRecommendedActionsCard) els.ramRecommendedActionsCard.hidden = true;
  }

  function renderRamRecommendedActions(result) {
    if (!els.ramRecommendedActions || !els.ramRecommendedActionsCard) return false;
    if (!window.ScopedLabsComputeAssistant || typeof window.ScopedLabsComputeAssistant.renderRamRecommendedActions !== "function") return false;

    els.ramRecommendedActions.innerHTML = window.ScopedLabsComputeAssistant.renderRamRecommendedActions(result);
    els.ramRecommendedActionsCard.hidden = false;
    return true;
  }

  function clearRamDecisionSchedule() {
    if (els.ramDecisionSchedule) els.ramDecisionSchedule.innerHTML = "";
    if (els.ramDecisionScheduleCard) els.ramDecisionScheduleCard.hidden = true;
  }

  function renderRamDecisionSchedule(result) {
    if (!els.ramDecisionSchedule || !els.ramDecisionScheduleCard) return false;
    if (!window.ScopedLabsComputeAssistant || typeof window.ScopedLabsComputeAssistant.renderRamDecisionSchedule !== "function") return false;

    els.ramDecisionSchedule.innerHTML = window.ScopedLabsComputeAssistant.renderRamDecisionSchedule(result);
    els.ramDecisionScheduleCard.hidden = false;
    return true;
  }

  function clearRamAssistant() {
    if (window.ScopedLabsComputeAssistant && typeof window.ScopedLabsComputeAssistant.clear === "function") {
      window.ScopedLabsComputeAssistant.clear();
      return;
    }

    const mount = document.querySelector("[data-compute-assistant-mount]");
    const card = document.querySelector("[data-compute-assistant-card]");
    if (mount) mount.innerHTML = "";
    if (card) card.hidden = true;
  }

  function renderRamAssistant(result) {
    if (!window.ScopedLabsComputeAssistant || typeof window.ScopedLabsComputeAssistant.renderToolAssistant !== "function") return false;

    return window.ScopedLabsComputeAssistant.renderToolAssistant({
      toolSlug: "ram-sizing",
      toolLabel: "RAM Sizing",
      result
    });
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["storage-iops"]);
      sessionStorage.removeItem(FLOW_KEYS["storage-throughput"]);
      sessionStorage.removeItem(FLOW_KEYS["vm-density"]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}
    clearRamCapacityVisual();
    clearRamDecisionSchedule();
    clearRamRecommendedActions();
    clearRamReferences();
    clearRamAssistant();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE
    });

    hasResult = false;
    hideContinue();
    refreshFlowNote();
  }


  function calc() {
    const workload = els.workload.value;
    const concurrency = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.concurrency.value, 0));
    const perProc = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.perProc.value, 0));
    const osGb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.osGb.value, 0));
    const headroomPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.headroom.value, 0));

    const processMemory = concurrency * perProc;
    const adjustedWorkloadMemory = processMemory * workloadFactor(workload);
    const subtotalMemory = adjustedWorkloadMemory + osGb;
    const reservedMemory = subtotalMemory * (headroomPct / 100);
    const totalRequired = subtotalMemory + reservedMemory;
    const recommended = Math.ceil(totalRequired / 8) * 8;
    const memoryHeadroom = Math.max(0, recommended - totalRequired);
    const reserveRatio = recommended > 0 ? (memoryHeadroom / recommended) * 100 : 0;

    const capacityPressure = Math.min(
      160,
      (totalRequired / Math.max(recommended, 1)) * 100
    );

    const densityPressure = Math.min(
      160,
      (concurrency * perProc / Math.max(recommended, 1)) * 100 * workloadFactor(workload)
    );

    const reserveStress = Math.min(
      160,
      ((reservedMemory / Math.max(totalRequired, 1)) * 100) * 2.2
    );

    const compositeScore = Math.round(
      (capacityPressure * 0.45) +
      (densityPressure * 0.35) +
      (reserveStress * 0.20)
    );

    const metrics = [
      {
        label: "Capacity Pressure",
        value: capacityPressure,
        displayValue: `${Math.round(capacityPressure)}%`
      },
      {
        label: "Density Pressure",
        value: densityPressure,
        displayValue: `${Math.round(densityPressure)}%`
      },
      {
        label: "Reserve Stress",
        value: reserveStress,
        displayValue: `${Math.round(reserveStress)}%`
      }
    ];

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The design is crowding usable memory too tightly. Cache reserve, growth allowance, or virtualization flexibility will shrink first, which increases the chance of swap behavior, instability during burst activity, or forced early platform expansion.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The design is workable, but memory margin is tightening. The system should run, although future growth, transient spikes, or denser workloads will erode available reserve more quickly than the raw capacity number suggests.";
    } else {
      interpretation =
        "The memory plan stays inside a sound operating envelope. Base overhead, workload demand, and reserve headroom remain balanced enough that RAM is unlikely to become the first design limiter under normal expansion.";
    }

    let dominantConstraint = "Balanced memory plan";
    if (analyzer.dominant.label === "Capacity Pressure") {
      dominantConstraint = "Installed memory ceiling";
    } else if (analyzer.dominant.label === "Density Pressure") {
      dominantConstraint = "Per-process / VM density";
    } else if (analyzer.dominant.label === "Reserve Stress") {
      dominantConstraint = "Cache and operating reserve";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "The design still has usable operating room. The next limitation is more likely to show up in storage latency, IOPS behavior, or workload imbalance before RAM becomes the first hard scaling wall.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate workload spikes and future density before locking hardware. This is where cache erosion, virtualization growth, or memory-heavy bursts can force an early jump to the next DIMM or platform tier.";
    } else {
      guidance =
        `Rework the memory plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so the design will lose flexibility there first. Reduce workload density, lower per-process footprint, or step up installed RAM and reserve margin.`;
    }

    let cpuCoupling = "CPU and RAM appear reasonably aligned";
    if (cpuContext && typeof cpuContext.cores === "number" && cpuContext.cores < 8 && totalRequired > 64) {
      cpuCoupling = "CPU tier may constrain scaling before the memory plan is fully utilized";
    } else if (cpuContext && typeof cpuContext.cores === "number" && cpuContext.cores >= 16 && totalRequired < 48) {
      cpuCoupling = "Memory footprint is comparatively light against the current CPU recommendation";
    }

    const summaryRows = [
      { label: "Process Memory", value: `${processMemory.toFixed(1)} GB` },
      { label: "Adjusted Workload Memory", value: `${adjustedWorkloadMemory.toFixed(1)} GB` },
      { label: "OS / Base Overhead", value: `${osGb.toFixed(1)} GB` },
      { label: "Reserve / Cache Allocation", value: `${reservedMemory.toFixed(1)} GB` },
      { label: "Total Required", value: `${totalRequired.toFixed(1)} GB` },
      { label: "Recommended Installed RAM", value: `${recommended} GB` }
    ];

    const derivedRows = [
      { label: "Usable Installed Headroom", value: `${memoryHeadroom.toFixed(1)} GB` },
      { label: "Reserve Ratio", value: `${reserveRatio.toFixed(1)}%` },
      { label: "CPU Coupling", value: cpuCoupling }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status: analyzer.status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: metrics.map((m) => m.label),
        values: metrics.map((m) => m.value),
        displayValues: metrics.map((m) => m.displayValue),
        referenceValue: 65,
        healthyMax: 65,
        watchMax: 85,
        axisTitle: "Memory Stress Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 85) * 1.08)
        )
      }
    });

    const plannerContext = cpuContext ? ramPlannerContextFromCpu(cpuContext) : null;
    const upstreamCpuContext = cpuContext ? ramUpstreamCpuContext(cpuContext) : null;

    const ramCapacityEnvelope = {
      workload,
      workloadLabel: els.workload.options[els.workload.selectedIndex] ? els.workload.options[els.workload.selectedIndex].text : workload,
      concurrency,
      perProc,
      osGb,
      headroomPct,
      demandRamGb: subtotalMemory,
      reserveRamGb: reservedMemory,
      requiredRamGb: totalRequired,
      recommendedRamGb: recommended,
      headroomRamGb: memoryHeadroom,
      reserveRatio,
      status: analyzer.status,
      dominantConstraint,
      cpuCoupling,
      plannerContext,
      upstreamCpuContext
    };

    renderRamCapacityVisual(ramCapacityEnvelope);
    renderRamAssistant(ramCapacityEnvelope);
    renderRamReferences(ramCapacityEnvelope);
    renderRamRecommendedActions(ramCapacityEnvelope);
    renderRamDecisionSchedule(ramCapacityEnvelope);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        ram: recommended,
        totalRequired,
        reserveRatio,
        dominantConstraint,
        workload,
        plannerContext,
        upstreamCpuContext,
        status: analyzer.status,
        capacityEnvelope: ramCapacityEnvelope}
    });

    hasResult = true;
    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.workload.value = "general";
    els.concurrency.value = 10;
    els.perProc.value = 2;
    els.osGb.value = 8;
    els.headroom.value = 25;
    invalidate();
  });

  ["workload", "concurrency", "perProc", "osGb", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/storage-iops/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    refreshFlowNote();
    hideContinue();
  });
})();