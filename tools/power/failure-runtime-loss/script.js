(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

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
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
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

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
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
    const remainingRuntimePct =
      baselineRuntime > 0 ? (failureRuntime / baselineRuntime) * 100 : 0;
    const remainingMarginMetric = 100 - ScopedLabsAnalyzer.clamp(remainingRuntimePct, 0, 100);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(loadShockMetric, runtimeLossMetric, remainingMarginMetric),
      metrics: [
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
          value: remainingMarginMetric,
          displayValue: fmtPct(remainingRuntimePct)
        }
      ],
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
      interpretation += ` The degraded load meaningfully compresses runtime, so backup duration under failure is materially weaker than baseline expectations.`;
    } else {
      interpretation += ` Runtime resilience is still reasonably controlled, so the failed-state load does not erase backup duration as aggressively.`;
    }

    let dominantConstraint = "";
    if (runtimeLossMetric >= loadShockMetric && runtimeLossMetric >= remainingMarginMetric && percentLost >= 20) {
      dominantConstraint = "Runtime loss is the dominant limiter. Backup duration falls away quickly once the system transitions into the higher-load failure condition.";
    } else if (loadShockMetric >= remainingMarginMetric && loadIncreasePct >= 20) {
      dominantConstraint = "Load shock is the dominant limiter. The jump from baseline to failure-state demand is what drives most of the resilience loss.";
    } else if (remainingMarginMetric > 25) {
      dominantConstraint = "Remaining runtime margin is the dominant limiter. There is not much battery headroom left once the failed-state load is applied.";
    } else {
      dominantConstraint = "The failure scenario is still reasonably contained. Battery capacity, efficiency, and degraded load remain in a workable range.";
    }

    let guidance = "";
    if (percentLost >= 40) {
      guidance = "Treat this as weak failure resilience. Increase battery capacity, reduce failed-state load, or shorten required outage duration before relying on it operationally.";
    } else if (percentLost >= 20) {
      guidance = "Review whether failed-state load can be shed or segmented. Even modest reduction during failure can materially restore runtime.";
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
      remainingRuntimePct,
      resilienceClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      loadShockMetric,
      runtimeLossMetric,
      remainingMarginMetric
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">⚠ ${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
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
      guidance: data.guidance,
      chart: {
        labels: ["Load Shock", "Runtime Loss", "Remaining Runtime Margin"],
        values: [
          Number(data.loadShockMetric.toFixed(1)),
          Number(data.runtimeLossMetric.toFixed(1)),
          Number(data.remainingMarginMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.loadIncreasePct),
          fmtPct(data.percentLost),
          fmtPct(data.remainingRuntimePct)
        ],
        referenceValue: 20,
        healthyMax: 20,
        watchMax: 45,
        axisTitle: "Runtime Resilience Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
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

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  window.addEventListener("DOMContentLoaded", () => {
    let unlocked = unlockCategoryPage();
    if (unlocked) boot();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        boot();
      }
    }, 400);
  });
})();