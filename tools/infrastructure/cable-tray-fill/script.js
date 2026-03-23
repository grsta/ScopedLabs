(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "cable-tray-fill";

  let cachedFlow = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    trayW: $("trayW"),
    trayD: $("trayD"),
    cableDia: $("cableDia"),
    count: $("count"),
    maxFill: $("maxFill"),
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
        "This step checks whether the tray is merely passing the current cable count or still retaining usable growth and service margin."
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
    const trayW = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.trayW.value, 0));
    const trayD = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.trayD.value, 0));
    const cableDia = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.cableDia.value, 0));
    const count = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.count.value, 0)));
    const maxFill = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.maxFill.value, 50), 1, 100);

    if (trayW <= 0 || trayD <= 0 || cableDia <= 0) {
      invalidate();
      return;
    }

    const trayArea = trayW * trayD;
    const cableArea = Math.PI * Math.pow(cableDia / 2, 2);
    const totalCableArea = cableArea * count;

    const fillPct = trayArea > 0 ? (totalCableArea / trayArea) * 100 : 0;
    const maxUsableArea = trayArea * (maxFill / 100);
    const remainingArea = Math.max(0, maxUsableArea - totalCableArea);
    const remainingCableCapacity = cableArea > 0 ? Math.floor(remainingArea / cableArea) : 0;
    const marginPct = Math.max(0, maxFill - fillPct);

    const fillPressure = ScopedLabsAnalyzer.clamp((fillPct / maxFill) * 100, 0, 180);
    const growthPressure = ScopedLabsAnalyzer.clamp(((count + Math.max(1, Math.ceil(count * 0.25))) * cableArea / maxUsableArea) * 100, 0, 180);
    const serviceabilityStress = ScopedLabsAnalyzer.clamp(100 - ((marginPct / maxFill) * 100), 0, 180);

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
        label: "Serviceability Stress",
        value: serviceabilityStress,
        displayValue: `${Math.round(serviceabilityStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (fillPressure * 0.50) +
      (growthPressure * 0.30) +
      (serviceabilityStress * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let dominantConstraint = "Balanced tray capacity";
    if (analyzer.dominant.label === "Fill Pressure") {
      dominantConstraint = "Immediate tray fill limit";
    } else if (analyzer.dominant.label === "Growth Pressure") {
      dominantConstraint = "Expansion headroom";
    } else if (analyzer.dominant.label === "Serviceability Stress") {
      dominantConstraint = "Maintenance / routing margin";
    }

    let statusText = "PASS";
    if (fillPct > maxFill) statusText = "EXCEEDS LIMIT";
    else if (marginPct < 10) statusText = "PASS / TIGHT";
    else if (marginPct < 20) statusText = "PASS / WATCH";

    let fillClass = "Comfortable fill";
    if (fillPct > maxFill) fillClass = "Overfilled";
    else if (fillPct > maxFill * 0.85) fillClass = "Tight tray";
    else if (fillPct > maxFill * 0.65) fillClass = "Moderate tray fill";

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The tray is too close to its usable capacity envelope. Future adds, rework, or cable movement will become difficult before the tray’s physical dimensions appear fully consumed.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The tray is workable, but growth room is tightening. The current count may pass today, although modest expansion or less orderly routing will consume margin faster than the raw fill percentage suggests.";
    } else {
      interpretation =
        "The tray remains inside a manageable fill envelope. Current cable count, allowed fill, and remaining area still leave usable room for normal growth and service access.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current tray size, but keep future adds in view. The next pressure increase will usually appear in growth headroom before it appears in a formal pass/fail fill check.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate expected growth, bundle behavior, and routing discipline before locking the tray size. Watch what fails first: spare area, serviceability, or future add capacity.";
    } else {
      guidance =
        `Rework the tray plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just current cable count. Increase tray size, reduce cable occupancy, or split routes before the design hardens around an overfilled path.`;
    }

    const summaryRows = [
      { label: "Tray Area", value: `${trayArea.toFixed(2)} in²` },
      { label: "Cable Area Each", value: `${cableArea.toFixed(3)} in²` },
      { label: "Total Cable Area", value: `${totalCableArea.toFixed(2)} in²` },
      { label: "Fill Percentage", value: `${fillPct.toFixed(1)} %` },
      { label: "Max Fill Allowed", value: `${maxFill.toFixed(0)} %` },
      { label: "Status", value: statusText }
    ];

    const derivedRows = [
      { label: "Remaining Usable Area", value: `${remainingArea.toFixed(2)} in²` },
      { label: "Additional Cable Capacity", value: `${remainingCableCapacity}` },
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
        axisTitle: "Tray Fill Risk Magnitude",
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
        remainingCableCapacity,
        status: analyzer.status
      }
    });
  }

  function reset() {
    els.trayW.value = 12;
    els.trayD.value = 4;
    els.cableDia.value = 0.30;
    els.count.value = 50;
    els.maxFill.value = 50;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["trayW", "trayD", "cableDia", "count", "maxFill"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  refreshFlowNote();
  invalidate();
})();
