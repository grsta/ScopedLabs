(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "ram-sizing";

  let hasResult = false;
  let cachedFlow = null;
  let cpuContext = null;
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
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function workloadFactor(workload) {
    if (workload === "db") return 1.3;
    if (workload === "virtualization") return 1.25;
    if (workload === "analytics") return 1.4;
    if (workload === "web") return 1.1;
    return 1.0;
  }

  function refreshFlowNote() {
    cachedFlow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      cachedFlow,
      title: "System Context",
      intro:
        "This step validates whether memory becomes the next scaling limiter after CPU sizing, or whether the design still has usable reserve for caching, virtualization density, and workload growth.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        cpuContext = source && source.step === "cpu-sizing" ? (source.data || {}) : null;

        if (!source || !source.data) return null;

        const data = source.data;
        const rows = [];

        if (typeof data.cores === "number") {
          rows.push({ label: "Recommended Cores", value: `${data.cores}` });
        }

        if (typeof data.eff === "number") {
          rows.push({ label: "Effective Load", value: `${Number(data.eff).toFixed(2)} core-eq` });
        }

        if (typeof data.workload === "string") {
          rows.push({ label: "Workload", value: data.workload });
        }

        if (typeof data.status === "string" && source.step === "cpu-sizing") {
          rows.push({ label: "CPU Status", value: data.status });
        }

        return rows.length ? rows : null;
      })()
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP
    });

    hasResult = false;
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        ram: recommended,
        totalRequired,
        reserveRatio,
        dominantConstraint,
        workload,
        status: analyzer.status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
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

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
})();