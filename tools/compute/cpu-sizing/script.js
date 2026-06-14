(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "cpu-sizing";
  const LANE = "v1";
  const State = window.ScopedLabsComputePlanState;

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

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    workload: $("workload"),
    concurrency: $("concurrency"),
    cpuPerWorker: $("cpuPerWorker"),
    peak: $("peak"),
    targetUtil: $("targetUtil"),
    smt: $("smt"),
    results: $("results"),
    flowNote: $("flow-note"),
    workloadContextCard: $("computeWorkloadContextCard"),
    workloadContextTitle: $("computeWorkloadContextTitle"),
    workloadContextCopy: $("computeWorkloadContextCopy"),
    workloadContextMeta: $("computeWorkloadContextMeta"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function workloadFactor(workload) {
    if (workload === "web") return 0.9;
    if (workload === "db") return 1.1;
    if (workload === "video") return 1.35;
    if (workload === "compute") return 1.5;
    return 1.0;
  }

  function refreshFlowNote() {
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["ram-sizing"]);
      sessionStorage.removeItem(FLOW_KEYS["storage-iops"]);
      sessionStorage.removeItem(FLOW_KEYS["storage-throughput"]);
      sessionStorage.removeItem(FLOW_KEYS["vm-density"]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        flowKey: FLOW_KEYS[STEP],
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;

      if (els.analysisCopy) {
        els.analysisCopy.style.display = "none";
        els.analysisCopy.innerHTML = "";
      }

      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {}
        chartRef.current = null;
      }

      if (chartWrapRef.current && chartWrapRef.current.parentNode) {
        chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
        chartWrapRef.current = null;
      }
    }

    hideContinue();
    refreshFlowNote();

    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.invalidate === "function") {
      window.ScopedLabsExport.invalidate("Inputs changed. Run the calculator again to refresh export.");
    }
  }


  function cpuStatusForPlan(status) {
    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    if (status === "HEALTHY") return "PENDING";
    return "PENDING";
  }
  function cpuContextEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cpuContextTitleCase(value) {
    return String(value || "N/A")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); }) || "N/A";
  }

  function activeComputeWorkload() {
    if (!State || typeof State.load !== "function" || typeof State.activeWorkload !== "function") return null;

    try {
      return State.activeWorkload(State.load());
    } catch {
      return null;
    }
  }

  function renderWorkloadContext() {
    if (State && typeof State.renderWorkloadDisplay === "function") {
      return State.renderWorkloadDisplay({
        card: els.workloadContextCard,
        title: els.workloadContextTitle,
        description: els.workloadContextCopy,
        meta: els.workloadContextMeta,
        toolLabel: "CPU Sizing"
      });
    }

    const workload = activeComputeWorkload();

    if (!els.workloadContextCard || !els.workloadContextTitle || !els.workloadContextCopy || !els.workloadContextMeta) return null;

    els.workloadContextCard.hidden = false;

    if (!workload) {
      els.workloadContextTitle.textContent = "No active Compute workload selected";
      els.workloadContextCopy.textContent =
        "Open or create a Compute workload before using this tool so the result can be tied to the right workload plan.";
      els.workloadContextMeta.innerHTML = [
        '<div><strong>Workload Source</strong><span>No Workload Planner context detected</span></div>',
        '<div><strong>Result Save</strong><span>Tool result will not be tied to a workload yet.</span></div>'
      ].join("");
      return null;
    }

    els.workloadContextTitle.textContent = workload.name || "Active Compute Workload";
    els.workloadContextCopy.textContent =
      cpuContextTitleCase(workload.environmentType) + " | " +
      cpuContextTitleCase(workload.workloadType) + " | " +
      cpuContextTitleCase(workload.planningPath);

    els.workloadContextMeta.innerHTML = [
      '<div><strong>Environment</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.environmentType)) + '</span></div>',
      '<div><strong>Workload Type</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.workloadType)) + '</span></div>',
      '<div><strong>Path</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.planningPath)) + '</span></div>',
      '<div><strong>Status</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.status || workload.summaryStatus || "Planning")) + '</span></div>'
    ].join("");

    return workload;
  }

  function saveCpuResultToWorkload(payload) {
    if (!State || typeof State.recordToolResult !== "function") return null;

    try {
      return State.recordToolResult(STEP, payload);
    } catch {
      return null;
    }
  }


  function calculate() {
    const workload = els.workload.value;
    const concurrency = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.concurrency.value, 0));
    const cpuPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.cpuPerWorker.value, 0));
    const peak = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.peak.value, 1));
    const target = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.targetUtil.value, 70),
      10,
      95
    );
    const smt = els.smt.value;

    const avg = concurrency * (cpuPct / 100);
    const eff = avg * peak * workloadFactor(workload);
    const cores = eff / (target / 100);
    const rec = Math.ceil(cores);
    const physicalRec = smt === "on" ? Math.ceil(rec / 2) : rec;

    const loadPressure = ScopedLabsAnalyzer.clamp((eff / Math.max(rec, 1)) * 100, 0, 180);
    const coreDemand = ScopedLabsAnalyzer.clamp((rec / 32) * 100, 0, 180);
    const utilPressure = ScopedLabsAnalyzer.clamp(target, 0, 180);

    const metrics = [
      {
        label: "Load Pressure",
        value: loadPressure,
        displayValue: `${Math.round(loadPressure)}%`
      },
      {
        label: "Core Demand",
        value: coreDemand,
        displayValue: `${Math.round(coreDemand)}%`
      },
      {
        label: "Utilization",
        value: utilPressure,
        displayValue: `${Math.round(utilPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (loadPressure * 0.35) +
      (Math.min(coreDemand, 100) * 0.30) +
      (utilPressure * 0.35)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let dominantConstraint = "Balanced CPU profile";

    if (analyzer.dominant.label === "Load Pressure") {
      dominantConstraint = "Burst / scheduling pressure";
    } else if (analyzer.dominant.label === "Core Demand") {
      dominantConstraint = "Core count density";
    } else if (analyzer.dominant.label === "Utilization") {
      dominantConstraint = "Utilization ceiling";
    }

    let interpretation = "";

    if (analyzer.status === "RISK") {
      interpretation =
        "CPU sizing is being pushed too close to the edge. The workload is likely to hit scheduling pressure, burst contention, or reduced responsiveness before downstream memory and storage layers can be evaluated cleanly.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "CPU sizing is serviceable but tightening. As concurrency rises or burst conditions widen, scheduler pressure and per-core contention will begin reducing the safety margin for later expansion.";
    } else {
      interpretation =
        "CPU sizing is inside a workable operating envelope. Thread demand, burst factor, and utilization target leave room for normal scheduling overhead without making the processor the first scaling limit.";
    }

    let guidance = "";

    if (analyzer.status === "HEALTHY") {
      guidance =
        "You have usable headroom. The next failure point is more likely to appear in memory density, storage latency, or workload imbalance before raw CPU exhaustion becomes the dominant issue.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Watch what fails first: burst handling, sustained queue depth, or poor thread placement across logical cores. This is the point where future growth can force a jump to the next CPU class sooner than expected.";
    } else {
      guidance =
        `Rework the compute baseline before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so expansion will become difficult here first. Reduce concurrency, lower per-worker CPU demand, or step up core count and processor tier.`;
    }

    const summaryRows = [
      { label: "Effective Demand", value: `${eff.toFixed(2)} cores` },
      { label: "Required Cores", value: `${cores.toFixed(2)}` },
      { label: "Recommended Logical Cores", value: `${rec} cores` },
      { label: "Recommended Physical Cores", value: `${physicalRec} cores` }
    ];

    const derivedRows = [
      { label: "Primary Constraint", value: dominantConstraint },
      { label: "Workload Type", value: workload },
      { label: "SMT Mode", value: smt === "on" ? "Logical cores counted" : "Physical cores only" }
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
        axisTitle: "CPU Stress Magnitude",
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        cores: rec,
        physicalCores: physicalRec,
        eff,
        workload,
        status: analyzer.status
      }
    });


    const cpuWorkloadResult = {
      label: "CPU Sizing",
      title: "CPU Sizing",
      status: cpuStatusForPlan(analyzer.status),
      analyzerStatus: analyzer.status,
      summary: rec + " logical cores / " + physicalRec + " physical cores recommended",
      keySavedResult: "Recommended CPU: " + rec + " logical cores; " + physicalRec + " physical cores; effective demand " + eff.toFixed(2) + " cores",
      inputs: {
        workloadType: workload,
        concurrency: concurrency,
        cpuPerWorkerPercent: cpuPct,
        peakFactor: peak,
        targetUtilizationPercent: target,
        smt: smt
      },
      outputs: {
        effectiveDemandCores: Number(eff.toFixed(2)),
        requiredCores: Number(cores.toFixed(2)),
        recommendedLogicalCores: rec,
        recommendedPhysicalCores: physicalRec,
        loadPressure: Number(loadPressure.toFixed(1)),
        coreDemand: Number(coreDemand.toFixed(1)),
        utilizationTarget: Number(target.toFixed(1)),
        primaryConstraint: dominantConstraint
      },
      updatedAt: new Date().toISOString()
    };

    saveCpuResultToWorkload(cpuWorkloadResult);
    renderWorkloadContext();

    showContinue();

    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.refresh === "function") {
      window.ScopedLabsExport.refresh();
    }
  }

  els.calc.addEventListener("click", calculate);

  els.reset.addEventListener("click", () => {
    els.workload.value = "general";
    els.concurrency.value = 16;
    els.cpuPerWorker.value = 30;
    els.peak.value = "1.25";
    els.targetUtil.value = 70;
    els.smt.value = "on";
    invalidate();
  });

  ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    renderWorkloadContext();
    refreshFlowNote();
    hideContinue();
  });
})();