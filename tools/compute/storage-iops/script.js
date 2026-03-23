(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "storage-iops";

  let hasResult = false;
  let cachedFlow = null;
  let ramContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    tps: $("tps"),
    reads: $("reads"),
    writes: $("writes"),
    penalty: $("penalty"),
    headroom: $("headroom"),
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
        "This step validates whether storage performance becomes the next scaling limiter after CPU and RAM have been established.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        ramContext = source && source.step === "ram-sizing" ? (source.data || {}) : null;

        if (!source || !source.data || source.step !== "ram-sizing") return null;

        const data = source.data;
        const rows = [];

        if (typeof data.ram === "number") {
          rows.push({ label: "Recommended RAM", value: `${data.ram} GB` });
        }

        if (typeof data.totalRequired === "number") {
          rows.push({ label: "Estimated Total", value: `${Number(data.totalRequired).toFixed(1)} GB` });
        }

        if (typeof data.status === "string") {
          rows.push({ label: "Memory Status", value: data.status });
        }

        if (typeof data.dominantConstraint === "string") {
          rows.push({ label: "Primary Constraint", value: data.dominantConstraint });
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
    const tps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.tps.value, 0));
    const reads = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.reads.value, 0));
    const writes = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.writes.value, 0));
    const penalty = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.penalty.value, 1));
    const headroomPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.headroom.value, 0));

    const readIops = tps * reads;
    const baseWriteIops = tps * writes;
    const writeIops = baseWriteIops * penalty;
    const subtotal = readIops + writeIops;
    const reserveIops = subtotal * (headroomPct / 100);
    const finalIops = subtotal + reserveIops;

    const writePenaltyStress = Math.min(160, ((penalty - 1) / 5) * 100);
    const capacityPressure = Math.min(160, finalIops / 600);
    const burstExposure = Math.min(160, (reserveIops / Math.max(finalIops, 1)) * 100 * 2.4);

    const metrics = [
      {
        label: "Capacity Pressure",
        value: capacityPressure,
        displayValue: `${Math.round(capacityPressure)}%`
      },
      {
        label: "Write Penalty Stress",
        value: writePenaltyStress,
        displayValue: `${Math.round(writePenaltyStress)}%`
      },
      {
        label: "Burst Exposure",
        value: burstExposure,
        displayValue: `${Math.round(burstExposure)}%`
      }
    ];

    const compositeScore = Math.round(
      (capacityPressure * 0.50) +
      (writePenaltyStress * 0.30) +
      (burstExposure * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let storagePressure = "Balanced";
    if (finalIops > 10000) storagePressure = "High IOPS Demand";
    if (finalIops > 50000) storagePressure = "Extreme IOPS Demand";

    let dominantConstraint = "Balanced storage profile";
    if (analyzer.dominant.label === "Capacity Pressure") {
      dominantConstraint = "Storage performance ceiling";
    } else if (analyzer.dominant.label === "Write Penalty Stress") {
      dominantConstraint = "RAID write amplification";
    } else if (analyzer.dominant.label === "Burst Exposure") {
      dominantConstraint = "Peak transaction volatility";
    }

    let primaryConstraint = "Balanced";
    if (ramContext && typeof ramContext.status === "string" && ramContext.status === "RISK" && analyzer.status !== "RISK") {
      primaryConstraint = "Memory pressure may still dominate";
    } else if (analyzer.status === "RISK") {
      primaryConstraint = "Storage is likely primary bottleneck";
    } else if (analyzer.status === "WATCH") {
      primaryConstraint = "Storage headroom is tightening";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The workload is crowding the storage layer too tightly. Queue depth, write amplification, or burst behavior will begin degrading responsiveness before the rest of the compute stack has room to scale cleanly.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The storage profile is workable, but reserve is narrowing. The design should run, although higher write activity, RAID penalty, or sustained spikes will reduce margin faster than the raw IOPS number suggests.";
    } else {
      interpretation =
        "The storage requirement remains inside a manageable operating envelope. Current read/write demand and reserve allowance leave room for normal burst behavior without making storage the first likely scaling wall.";
    }

    let guidance = "A balanced storage design should maintain headroom above normal peaks.";
    if (analyzer.status === "WATCH") {
      guidance =
        "Validate controller cache, disk tier, and future write growth before locking hardware. This is where RAID penalty and sustained transaction spikes can force an early move to faster media.";
    }
    if (analyzer.status === "RISK") {
      guidance =
        `Rework the storage plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so performance will tighten there first. Reduce write amplification, raise media performance, or increase available IOPS headroom.`;
    }

    const summaryRows = [
      { label: "Read IOPS", value: `${readIops.toFixed(0)}` },
      { label: "Base Write IOPS", value: `${baseWriteIops.toFixed(0)}` },
      { label: "Write IOPS (penalized)", value: `${writeIops.toFixed(0)}` },
      { label: "Subtotal IOPS", value: `${subtotal.toFixed(0)}` },
      { label: "Reserve / Headroom", value: `${reserveIops.toFixed(0)} IOPS` },
      { label: "Estimated Required IOPS", value: `${finalIops.toFixed(0)}` }
    ];

    const derivedRows = [
      { label: "Storage Pressure", value: storagePressure },
      { label: "Primary Constraint", value: primaryConstraint },
      { label: "RAID Penalty", value: `×${penalty}` }
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
        axisTitle: "Storage Stress Magnitude",
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
        readIops,
        writeIops,
        subtotal,
        finalIops,
        storagePressure,
        primaryConstraint,
        status: analyzer.status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.tps.value = 2000;
    els.reads.value = 2;
    els.writes.value = 1;
    els.penalty.value = "4";
    els.headroom.value = 30;
    invalidate();
  });

  ["tps", "reads", "writes", "penalty", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/storage-throughput/";
  });

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
})();
