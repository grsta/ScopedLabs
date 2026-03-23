(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "backup-window";

  let hasResult = false;
  let cachedFlow = null;
  let upstreamContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    dataTb: $("dataTb"),
    changePct: $("changePct"),
    type: $("type"),
    mbps: $("mbps"),
    savingsPct: $("savingsPct"),
    overheadPct: $("overheadPct"),
    results: $("results"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continueBtn"),
    analysisCopy: $("analysis-copy"),
    calc: $("calc"),
    reset: $("reset")
  };

  function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0m";
    if (hours >= 1) {
      const whole = Math.floor(hours);
      const mins = Math.round((hours % 1) * 60);
      return `${whole}h ${mins}m`;
    }
    return `${Math.round(hours * 60)}m`;
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
        "This final step evaluates whether the backup plan fits inside the platform's recovery and failure envelope without turning protection jobs into an operational bottleneck.",
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

        if (typeof data.vms === "number") {
          rows.push({ label: "VM Capacity", value: `${data.vms}` });
        }

        if (typeof data.densityClass === "string") {
          rows.push({ label: "Density Class", value: data.densityClass });
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
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    els.completeWrap.style.display = "none";
    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const dataTb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.dataTb.value, 0));
    const changePct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.changePct.value, 0),
      0,
      100
    );
    const type = els.type.value;
    const mbps = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.mbps.value, 1));
    const savingsPct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.savingsPct.value, 0),
      0,
      95
    );
    const overheadPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overheadPct.value, 0));

    if (dataTb <= 0) {
      invalidate();
      return;
    }

    let sourceTb = dataTb;
    if (type === "inc") sourceTb = dataTb * (changePct / 100);
    if (type === "diff") sourceTb = dataTb * Math.min(1, (changePct / 100) * 2);

    const protectedTb = sourceTb * (1 - savingsPct / 100);
    const effectiveTb = protectedTb * (1 + overheadPct / 100);

    const totalMB = effectiveTb * 1000000;
    const seconds = totalMB / mbps;
    const hours = seconds / 3600;

    const referenceWindowHours = 8;
    const schedulePressure = ScopedLabsAnalyzer.clamp((hours / referenceWindowHours) * 100, 0, 160);

    let recoveryWindowHours = null;
    if (upstreamContext && typeof upstreamContext.vms === "number") {
      recoveryWindowHours = Math.max(4, upstreamContext.vms * 0.35);
    }

    const recoveryCollision = recoveryWindowHours
      ? ScopedLabsAnalyzer.clamp((hours / recoveryWindowHours) * 100, 0, 160)
      : ScopedLabsAnalyzer.clamp((hours / 12) * 100, 0, 160);

    const throughputDemand = ScopedLabsAnalyzer.clamp((effectiveTb / Math.max(hours, 0.01)) * 6, 0, 160);

    const metrics = [
      {
        label: "Schedule Pressure",
        value: schedulePressure,
        displayValue: `${Math.round(schedulePressure)}%`
      },
      {
        label: "Recovery Collision",
        value: recoveryCollision,
        displayValue: `${Math.round(recoveryCollision)}%`
      },
      {
        label: "Throughput Demand",
        value: throughputDemand,
        displayValue: `${Math.round(throughputDemand)}%`
      }
    ];

    const compositeScore = Math.round(
      (schedulePressure * 0.35) +
      (recoveryCollision * 0.45) +
      (throughputDemand * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 35,
      watchMax: 65
    });

    let dominantConstraint = "Balanced protection profile";
    if (analyzer.dominant.label === "Schedule Pressure") {
      dominantConstraint = "Backup schedule envelope";
    } else if (analyzer.dominant.label === "Recovery Collision") {
      dominantConstraint = "Recovery overlap risk";
    } else if (analyzer.dominant.label === "Throughput Demand") {
      dominantConstraint = "Protection path throughput";
    }

    const backupCoveragePct = recoveryWindowHours && recoveryWindowHours > 0
      ? ScopedLabsAnalyzer.clamp((hours / recoveryWindowHours) * 100, 0, 250)
      : null;

    let protectionClass = "Balanced backup plan";
    if (hours > 8) protectionClass = "Extended backup window";
    if (hours > 16) protectionClass = "Critical backup window";

    let crossCheck = "Protection timing appears reasonably aligned with the modeled platform profile";
    if (upstreamContext && typeof upstreamContext.status === "string" && upstreamContext.status === "RISK" && analyzer.status !== "RISK") {
      crossCheck = "The upstream compute profile may still tighten before backup duration becomes the first operational limiter";
    } else if (backupCoveragePct !== null && backupCoveragePct > 100) {
      crossCheck = "Backup duration is overrunning the modeled recovery envelope";
    } else if (hours > referenceWindowHours) {
      crossCheck = "The backup window is extending beyond a typical operational protection schedule";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "Backup duration is now materially crowding the available recovery envelope. Recovery operations, backup completion, and restore confidence are no longer aligned under failure pressure.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "Backup duration is beginning to compete with recovery timing. The platform is still workable, but backup windows are consuming schedule margin that would otherwise absorb recovery events.";
    } else {
      interpretation =
        "Backup execution remains inside a workable operating envelope. The current data-change pattern and transport rate should allow protection jobs to complete without materially constraining recovery timing.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current throughput target, keep incremental cadence tight, and monitor change-rate growth. Expansion pressure will first appear in backup duration and recovery overlap before it appears in raw storage consumption.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Reduce protected data per cycle, improve effective throughput, or split jobs by tier. Watch what fails first: overnight schedule margin, recovery overlap, or ingest contention on production storage.";
    } else {
      guidance =
        `Re-architect the backup plan. The primary limit is ${dominantConstraint.toLowerCase()}, not raw capacity. Increase throughput, segment datasets, shorten change scope, or move to a more aggressive tiered backup strategy before scaling further.`;
    }

    const summaryRows = [
      { label: "Backup Type", value: type.toUpperCase() },
      { label: "Source Data This Job", value: `${sourceTb.toFixed(2)} TB` },
      { label: "Protected Data After Savings", value: `${protectedTb.toFixed(2)} TB` },
      { label: "Effective Data with Overhead", value: `${effectiveTb.toFixed(2)} TB` },
      { label: "Effective Throughput", value: `${mbps.toFixed(0)} MB/s` },
      { label: "Backup Window", value: formatHours(hours) }
    ];

    const derivedRows = [
      { label: "Protection Class", value: protectionClass },
      { label: "Cross-Check", value: crossCheck },
      {
        label: "Backup vs Recovery Window",
        value: backupCoveragePct !== null
          ? `${backupCoveragePct.toFixed(0)}% of modeled recovery window`
          : "No modeled recovery window available"
      }
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
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 65,
        axisTitle: "Backup Risk Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 65) * 1.08)
        )
      }
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        hours,
        backupHours: hours,
        protectionClass,
        crossCheck,
        status: analyzer.status,
        effectiveTb,
        throughputMbps: mbps
      }
    });

    els.completeWrap.style.display = "block";
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.dataTb.value = 10;
    els.changePct.value = 5;
    els.type.value = "inc";
    els.mbps.value = 250;
    els.savingsPct.value = 20;
    els.overheadPct.value = 15;
    invalidate();
  });

  els.continueBtn.addEventListener("click", () => {
    window.location.href = "/tools/compute/";
  });

  ["dataTb", "changePct", "type", "mbps", "savingsPct", "overheadPct"].forEach((id) => {
    const el = $(id);
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, invalidate);
    el.addEventListener("change", invalidate);
  });

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
})();
