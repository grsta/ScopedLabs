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
    if (workload === "web") return 1.1;
    return 1.0;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      cpuContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      cpuContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      cpuContext = null;
      return;
    }

    const data = parsed.data || {};
    cpuContext = data;

    const lines = [];
    if (typeof data.cores === "number") lines.push(`Recommended Cores: <strong>${data.cores}</strong>`);
    if (typeof data.eff === "number") lines.push(`Effective Load: <strong>${Number(data.eff).toFixed(2)} core-eq</strong>`);
    if (typeof data.workload === "string") lines.push(`Workload: <strong>${data.workload}</strong>`);
    if (typeof data.status === "string") lines.push(`CPU Status: <strong>${data.status}</strong>`);

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      This step checks whether memory becomes the next scaling wall after the CPU envelope already defined upstream.
    `;
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        ram: recommended,
        totalRequired,
        reserveRatio,
        dominantConstraint,
        workload,
        status: analyzer.status
      }
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