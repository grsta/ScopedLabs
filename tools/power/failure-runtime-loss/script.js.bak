(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    baselineLoad: $("baselineLoad"),
    failureLoad: $("failureLoad"),
    batteryWh: $("batteryWh"),
    voltage: $("voltage"),
    efficiency: $("efficiency"),
    dod: $("dod"),
    results: $("results"),
    analysis: $("analysis-copy"),
    calc: $("calc"),
    reset: $("reset")
  };

  const DEFAULTS = {
    baselineLoad: 300,
    failureLoad: 360,
    batteryWh: 1200,
    voltage: 12,
    efficiency: 75,
    dod: 70
  };

  function num(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtWatts(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} W` : "—";
  }

  function fmtWh(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Wh` : "—";
  }

  function fmtHours(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} h` : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtVolts(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} V` : "—";
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      emptyMessage: "Enter values and press Calculate."
    });
  }

  function applyDefaults() {
    els.baselineLoad.value = String(DEFAULTS.baselineLoad);
    els.failureLoad.value = String(DEFAULTS.failureLoad);
    els.batteryWh.value = String(DEFAULTS.batteryWh);
    els.voltage.value = String(DEFAULTS.voltage);
    els.efficiency.value = String(DEFAULTS.efficiency);
    els.dod.value = String(DEFAULTS.dod);
  }

  function getInputs() {
    const baselineLoad = num(els.baselineLoad);
    const failureLoad = num(els.failureLoad);
    const batteryWh = num(els.batteryWh);
    const voltage = num(els.voltage);
    const efficiencyPct = num(els.efficiency);
    const dodPct = num(els.dod);

    if (
      !Number.isFinite(baselineLoad) || baselineLoad <= 0 ||
      !Number.isFinite(failureLoad) || failureLoad <= 0 ||
      !Number.isFinite(batteryWh) || batteryWh <= 0 ||
      !Number.isFinite(voltage) || voltage <= 0 ||
      !Number.isFinite(efficiencyPct) || efficiencyPct <= 0 || efficiencyPct > 100 ||
      !Number.isFinite(dodPct) || dodPct <= 0 || dodPct > 100
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    if (failureLoad < baselineLoad) {
      return { ok: false, message: "Failure load should be equal to or greater than baseline load for this analysis." };
    }

    return {
      ok: true,
      baselineLoad,
      failureLoad,
      batteryWh,
      voltage,
      efficiencyPct,
      dodPct,
      efficiency: efficiencyPct / 100,
      dod: dodPct / 100
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const usableWh = input.batteryWh * input.efficiency * input.dod;

    const baselineRuntime = usableWh / input.baselineLoad;
    const failureRuntime = usableWh / input.failureLoad;

    const runtimeLost = baselineRuntime - failureRuntime;
    const percentLost = baselineRuntime > 0 ? (runtimeLost / baselineRuntime) * 100 : 0;
    const loadIncreasePct = ((input.failureLoad - input.baselineLoad) / input.baselineLoad) * 100;

    const loadShockMetric = ScopedLabsAnalyzer.clamp(loadIncreasePct, 0, 100);
    const runtimeLossMetric = ScopedLabsAnalyzer.clamp(percentLost, 0, 100);
    const energyMarginMetric = baselineRuntime > 0
      ? ScopedLabsAnalyzer.clamp((failureRuntime / baselineRuntime) * 100, 0, 100)
      : 0;

    const metrics = [
      {
        label: "Load Shock",
        value: loadShockMetric,
        displayValue: fmtPct(loadIncreasePct)
      },
      {
        label: "Runtime Loss",
        value: runtimeLossMetric,
        displayValue: fmtPct(percentLost)
      },
      {
        label: "Remaining Runtime Margin",
        value: 100 - energyMarginMetric,
        displayValue: fmtPct(energyMarginMetric)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(loadShockMetric, runtimeLossMetric, 100 - energyMarginMetric),
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let resilienceClass = "Stable Runtime Resilience";
    if (percentLost >= 40) resilienceClass = "Severe Runtime Degradation";
    else if (percentLost >= 20) resilienceClass = "Moderate Runtime Degradation";
    else if (percentLost >= 10) resilienceClass = "Noticeable Runtime Loss";

    let interpretation = `With ${fmtWh(input.batteryWh)} of installed battery capacity, ${fmtPct(input.efficiencyPct)} efficiency, and ${fmtPct(input.dodPct)} usable discharge, the system has about ${fmtWh(usableWh)} of usable energy. Baseline runtime is about ${fmtHours(baselineRuntime)}, while the failure-state load cuts runtime to about ${fmtHours(failureRuntime)}.`;

    if (percentLost >= 40) {
      interpretation += ` The failure state is consuming runtime aggressively, which means resilience collapses quickly once the system leaves normal operating conditions.`;
    } else if (percentLost >= 20) {
      interpretation += ` The degraded load meaningfully compresses runtime, so backup duration under failure is materially weaker than nameplate baseline expectations.`;
    } else {
      interpretation += ` Runtime resilience is still reasonably controlled, so the failed-state load does not erase backup duration as aggressively.`;
    }

    let dominantConstraint = "";
    if (runtimeLossMetric >= loadShockMetric && runtimeLossMetric >= (100 - energyMarginMetric) && percentLost >= 20) {
      dominantConstraint = "Runtime loss is the dominant limiter. Battery backup falls away fast once the system transitions into the higher-load failure condition.";
    } else if (loadShockMetric >= (100 - energyMarginMetric) && loadIncreasePct >= 20) {
      dominantConstraint = "Load shock is the dominant limiter. The jump from baseline to failure-state demand is what drives most of the resilience loss.";
    } else if ((100 - energyMarginMetric) > 25) {
      dominantConstraint = "Remaining runtime margin is the dominant limiter. There is not much battery headroom left once the failed-state load is applied.";
    } else {
      dominantConstraint = "The failure scenario is still reasonably contained. Battery capacity, efficiency, and degraded load remain in a workable range.";
    }

    let guidance = "";
    if (percentLost >= 40) {
      guidance = "Treat this as a weak-failure-resilience design. Increase battery capacity, reduce failure-state load, or shorten required outage duration before relying on it.";
    } else if (percentLost >= 20) {
      guidance = "Review whether the failed-state load can be shed or segmented. Even modest load reduction during failure can materially restore runtime.";
    } else {
      guidance = "Runtime resilience is acceptable for planning purposes. Use this result to compare normal-vs-failure survivability across backup options.";
    }

    return {
      ok: true,
      ...input,
      usableWh,
      baselineRuntime,
      failureRuntime,
      runtimeLost,
      percentLost,
      loadIncreasePct,
      resilienceClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">⚠ ${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Baseline Runtime", value: fmtHours(data.baselineRuntime) },
        { label: "Failure Runtime", value: fmtHours(data.failureRuntime) },
        { label: "Runtime Lost", value: fmtHours(data.runtimeLost) },
        { label: "Resilience Result", value: data.resilienceClass }
      ],
      derivedRows: [
        { label: "Baseline Load", value: fmtWatts(data.baselineLoad) },
        { label: "Failure Load", value: fmtWatts(data.failureLoad) },
        { label: "Load Increase", value: fmtPct(data.loadIncreasePct) },
        { label: "Battery Capacity", value: fmtWh(data.batteryWh) },
        { label: "Usable Battery Energy", value: fmtWh(data.usableWh) },
        { label: "Efficiency Used", value: fmtPct(data.efficiencyPct) },
        { label: "Max DoD Used", value: fmtPct(data.dodPct) },
        { label: "System Voltage", value: fmtVolts(data.voltage) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function resetForm() {
    applyDefaults();
    invalidate();
  }

  function bind() {
    ["baselineLoad", "failureLoad", "batteryWh", "voltage", "efficiency", "dod"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", resetForm);
  }

  function boot() {
    bind();
    invalidate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


