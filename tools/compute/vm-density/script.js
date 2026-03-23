(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "vm-density";

  let hasResult = false;
  let cachedFlow = null;
  let upstreamContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    hostCores: $("hostCores"),
    hostRam: $("hostRam"),
    reserve: $("reserve"),
    vmCpu: $("vmCpu"),
    vmRam: $("vmRam"),
    cpuOver: $("cpuOver"),
    ramOver: $("ramOver"),
    spare: $("spare"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function refreshFlowNote() {
    cachedFlow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      cachedFlow,
      title: "System Context",
      intro:
        "This step checks whether the host can actually consolidate workloads at the expected density once CPU, memory, and storage pressure are considered together.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        upstreamContext = source ? (source.data || {}) : null;

        if (!source || !source.data) return null;

        const data = source.data;
        const rows = [];

        if (typeof data.finalMBps === "number") {
          rows.push({ label: "Required Throughput", value: `${Number(data.finalMBps).toFixed(1)} MB/s` });
        }

        if (typeof data.throughputClass === "string") {
          rows.push({ label: "Throughput Class", value: data.throughputClass });
        }

        if (typeof data.workloadPattern === "string") {
          rows.push({ label: "Workload Pattern", value: data.workloadPattern });
        }

        if (typeof data.crossCheck === "string") {
          rows.push({ label: "Cross-Check", value: data.crossCheck });
        }

        if (typeof data.status === "string") {
          rows.push({ label: "Upstream Status", value: data.status });
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
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const hostCores = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.hostCores.value, 1));
    const hostRam = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.hostRam.value, 1));
    const reserve = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.reserve.value, 0));

    const vmCpu = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.vmCpu.value, 1));
    const vmRam = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.vmRam.value, 1));

    const cpuOver = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.cpuOver.value, 1));
    const ramOver = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.ramOver.value, 1));
    const spare = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.spare.value, 0), 0, 80);

    const cpuPool = hostCores * (1 - spare / 100) * cpuOver;
    const ramPool = Math.max(0, (hostRam - reserve)) * (1 - spare / 100) * ramOver;

    const cpuVMs = Math.floor(cpuPool / vmCpu);
    const ramVMs = Math.floor(ramPool / vmRam);

    const vms = Math.max(0, Math.min(cpuVMs, ramVMs));

    const cpuConsumption = vms * vmCpu;
    const ramConsumption = vms * vmRam;

    const effectiveCpuHeadroom = Math.max(0, cpuPool - cpuConsumption);
    const effectiveRamHeadroom = Math.max(0, ramPool - ramConsumption);

    const cpuPressure = Math.min(160, (cpuConsumption / Math.max(cpuPool, 1)) * 100);
    const ramPressure = Math.min(160, (ramConsumption / Math.max(ramPool, 1)) * 100);

    let storageDensityPressure = 22;
    if (upstreamContext && typeof upstreamContext.finalMBps === "number") {
      storageDensityPressure = Math.min(160, upstreamContext.finalMBps / Math.max(vms, 1));
    }

    const metrics = [
      {
        label: "CPU Density Pressure",
        value: cpuPressure,
        displayValue: `${Math.round(cpuPressure)}%`
      },
      {
        label: "Memory Density Pressure",
        value: ramPressure,
        displayValue: `${Math.round(ramPressure)}%`
      },
      {
        label: "Storage Density Pressure",
        value: storageDensityPressure,
        displayValue: `${Math.round(storageDensityPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (cpuPressure * 0.40) +
      (ramPressure * 0.40) +
      (storageDensityPressure * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let limiting = "Balanced";
    if (cpuVMs < ramVMs) limiting = "CPU";
    if (ramVMs < cpuVMs) limiting = "RAM";

    let densityClass = "Balanced consolidation";
    if (vms >= 40) densityClass = "High consolidation";
    if (vms >= 80) densityClass = "Aggressive consolidation";

    let dominantConstraint = "Balanced host profile";
    if (analyzer.dominant.label === "CPU Density Pressure") {
      dominantConstraint = "CPU oversubscription envelope";
    } else if (analyzer.dominant.label === "Memory Density Pressure") {
      dominantConstraint = "Memory allocation ceiling";
    } else if (analyzer.dominant.label === "Storage Density Pressure") {
      dominantConstraint = "Per-VM storage pressure";
    }

    let crossCheck = "CPU, RAM, and storage appear reasonably aligned";
    if (upstreamContext && typeof upstreamContext.status === "string" && upstreamContext.status === "RISK" && analyzer.status !== "RISK") {
      crossCheck = "Upstream storage throughput may still tighten before the host reaches this modeled density";
    } else if (limiting === "CPU") {
      crossCheck = "CPU is likely to cap consolidation before memory is fully utilized";
    } else if (limiting === "RAM") {
      crossCheck = "Memory is likely to cap consolidation before CPU oversubscription is exhausted";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The host is crowding its usable consolidation envelope too tightly. CPU oversubscription, memory allocation, or storage pressure will begin collapsing margin before the platform can absorb meaningful workload growth.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The density target is workable, but reserve is tightening. The host should operate, although higher contention, burstier workloads, or storage-driven queue pressure will reduce stability margin faster than the VM count alone suggests.";
    } else {
      interpretation =
        "The density target remains inside a manageable operating envelope. Current CPU, memory, and storage assumptions leave room for normal consolidation without making the host the first likely scaling wall.";
    }

    let guidance = "A balanced virtualization host should maintain enough spare capacity to absorb burst behavior and maintenance events.";
    if (analyzer.status === "WATCH") {
      guidance =
        "Validate cluster spare policy, noisy-neighbor behavior, and future resource growth before locking the host count. This is where modest oversubscription can become operationally tight sooner than expected.";
    }
    if (analyzer.status === "RISK") {
      guidance =
        `Rework the density target before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so consolidation headroom will collapse there first. Lower per-VM allocation, add host capacity, or reduce oversubscription pressure.`;
    }

    const summaryRows = [
      { label: "VM Capacity", value: `${vms}` },
      { label: "CPU Limit", value: `${cpuVMs}` },
      { label: "RAM Limit", value: `${ramVMs}` },
      { label: "CPU Pool", value: `${cpuPool.toFixed(1)} vCPU-eq` },
      { label: "RAM Pool", value: `${ramPool.toFixed(1)} GB` },
      { label: "Spare Policy", value: `${spare.toFixed(0)}%` }
    ];

    const derivedRows = [
      { label: "Density Class", value: densityClass },
      { label: "Primary Constraint", value: limiting },
      { label: "Cross-Check", value: crossCheck },
      { label: "CPU Headroom", value: `${effectiveCpuHeadroom.toFixed(1)} vCPU-eq` },
      { label: "RAM Headroom", value: `${effectiveRamHeadroom.toFixed(1)} GB` }
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
        axisTitle: "VM Density Stress Magnitude",
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
        vms,
        limiting,
        densityClass,
        crossCheck,
        status: analyzer.status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.hostCores.value = 32;
    els.hostRam.value = 256;
    els.reserve.value = 16;
    els.vmCpu.value = 2;
    els.vmRam.value = 4;
    els.cpuOver.value = 3;
    els.ramOver.value = 1.1;
    els.spare.value = 15;
    invalidate();
  });

  ["hostCores","hostRam","reserve","vmCpu","vmRam","cpuOver","ramOver","spare"]
    .forEach((id) => {
      $(id).addEventListener("input", invalidate);
      $(id).addEventListener("change", invalidate);
    });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/gpu-vram/";
  });

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
})();
