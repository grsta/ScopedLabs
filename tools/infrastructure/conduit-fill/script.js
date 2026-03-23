(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "conduit-fill";

  let cachedFlow = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    condDia: $("condDia"),
    cableDia: $("cableDia"),
    count: $("count"),
    limit: $("limit"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
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
        "This step checks whether the conduit is simply passing code-style fill or still retaining enough physical margin for pulling, serviceability, and future additions."
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Enter values and press Calculate."
    });

    refreshFlowNote();
  }

  function calc() {
    const condDia = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.condDia.value, 0));
    const cableDia = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.cableDia.value, 0));
    const count = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.count.value, 0)));
    const limit = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.limit.value, 40), 1, 100);

    if (condDia <= 0 || cableDia <= 0) {
      invalidate();
      return;
    }

    const conduitArea = Math.PI * Math.pow(condDia / 2, 2);
    const oneCableArea = Math.PI * Math.pow(cableDia / 2, 2);
    const cableArea = oneCableArea * count;
    const fillPct = conduitArea > 0 ? (cableArea / conduitArea) * 100 : 0;

    const allowedArea = conduitArea * (limit / 100);
    const remainingArea = Math.max(0, allowedArea - cableArea);
    const spareCableCapacity = oneCableArea > 0 ? Math.floor(remainingArea / oneCableArea) : 0;
    const marginPct = Math.max(0, limit - fillPct);

    const fillPressure = ScopedLabsAnalyzer.clamp((fillPct / limit) * 100, 0, 180);
    const growthPressure = ScopedLabsAnalyzer.clamp((((count + Math.max(1, Math.ceil(count * 0.25))) * oneCableArea) / Math.max(allowedArea, 0.0001)) * 100, 0, 180);
    const pullStress = ScopedLabsAnalyzer.clamp(100 - ((marginPct / limit) * 100), 0, 180);

    const metrics = [
      {
        label: "Fill Pressure",
        value: fillPressure,
        displayValue: `${Math.round(fillPressure)}%`
      },
      {
        label: "Growth Pressure",
        value: growthPressure,
        displayValue: `${Math.round(growthPressure)}%`
      },
      {
        label: "Pull Stress",
        value: pullStress,
        displayValue: `${Math.round(pullStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (fillPressure * 0.50) +
      (growthPressure * 0.30) +
      (pullStress * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let dominantConstraint = "Balanced conduit capacity";
    if (analyzer.dominant.label === "Fill Pressure") {
      dominantConstraint = "Immediate conduit fill limit";
    } else if (analyzer.dominant.label === "Growth Pressure") {
      dominantConstraint = "Expansion headroom";
    } else if (analyzer.dominant.label === "Pull Stress") {
      dominantConstraint = "Pulling and service margin";
    }

    let statusText = "PASS";
    if (fillPct > limit) statusText = "EXCEEDS LIMIT";
    else if (marginPct < 10) statusText = "PASS / TIGHT";
    else if (marginPct < 20) statusText = "PASS / WATCH";

    let fillClass = "Comfortable fill";
    if (fillPct > limit) fillClass = "Overfilled";
    else if (fillPct > limit * 0.85) fillClass = "Tight conduit";
    else if (fillPct > limit * 0.65) fillClass = "Moderate conduit fill";

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The conduit is too close to its usable envelope. Future adds, pulling effort, or rework access will become difficult before the installation even appears completely full by simple dimensional check.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The conduit is workable, but margin is tightening. The current count may still pass today, although modest growth or less orderly cable behavior will consume usable headroom faster than the raw fill percentage suggests.";
    } else {
      interpretation =
        "The conduit remains inside a manageable fill envelope. Current cable area, allowed fill, and remaining margin still leave usable room for normal adds and service access.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current conduit size, but keep future cable additions in view. The next pressure increase will usually appear in pull difficulty and growth headroom before it appears in a formal pass/fail fill check.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate expected growth, pulling conditions, and field routing discipline before locking the conduit size. Watch what fails first: spare area, pullability, or future add capacity.";
    } else {
      guidance =
        `Rework the conduit plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just current cable count. Increase conduit size, reduce cable occupancy, or split routes before the design hardens around an overfilled path.`;
    }

    const summaryRows = [
      { label: "Conduit Area", value: `${conduitArea.toFixed(2)} in²` },
      { label: "Cable Area", value: `${cableArea.toFixed(2)} in²` },
      { label: "Fill Percentage", value: `${fillPct.toFixed(1)} %` },
      { label: "Allowed Fill", value: `${limit.toFixed(0)} %` },
      { label: "Status", value: statusText }
    ];

    const derivedRows = [
      { label: "Remaining Usable Area", value: `${remainingArea.toFixed(2)} in²` },
      { label: "Additional Cable Capacity", value: `${spareCableCapacity}` },
      { label: "Margin to Limit", value: `${marginPct.toFixed(1)} %` },
      { label: "Fill Class", value: fillClass }
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
        axisTitle: "Conduit Fill Risk Magnitude",
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
        fillPct,
        remainingArea,
        spareCableCapacity,
        status: analyzer.status
      }
    });
  }

  function reset() {
    els.condDia.value = 1.0;
    els.cableDia.value = 0.30;
    els.count.value = 3;
    els.limit.value = 40;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["condDia", "cableDia", "count", "limit"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  refreshFlowNote();
  invalidate();
})();