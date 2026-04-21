(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    loadW: $("loadW"),
    eff: $("eff"),
    dcV: $("dcV"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  const DEFAULTS = {
    loadW: 120,
    eff: 90,
    dcV: 12
  };

  function num(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt(x, d = 2) {
    return Number.isFinite(x) ? x.toFixed(d) : "—";
  }

  function fmtWatts(x, d = 0) {
    return Number.isFinite(x) ? `${x.toFixed(d)} W` : "—";
  }

  function fmtVolts(x, d = 1) {
    return Number.isFinite(x) ? `${x.toFixed(d)} V` : "—";
  }

  function fmtAmps(x, d = 2) {
    return Number.isFinite(x) ? `${x.toFixed(d)} A` : "—";
  }

  function fmtPct(x, d = 0) {
    return Number.isFinite(x) ? `${x.toFixed(d)}%` : "—";
  }

  function fmtRatio(x, d = 2) {
    return Number.isFinite(x) ? `${x.toFixed(d)}x` : "—";
  }

  function applyDefaults() {
    els.loadW.value = String(DEFAULTS.loadW);
    els.eff.value = String(DEFAULTS.eff);
    els.dcV.value = String(DEFAULTS.dcV);
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

  function getInputs() {
    const loadW = num(els.loadW);
    let effPct = num(els.eff);
    const dcV = num(els.dcV);

    if (!Number.isFinite(loadW) || loadW <= 0) {
      return { ok: false, message: "Enter a valid AC Load (W) greater than 0." };
    }

    if (!Number.isFinite(dcV) || dcV <= 0) {
      return { ok: false, message: "Enter a valid DC Voltage (V) greater than 0." };
    }

    if (!Number.isFinite(effPct)) effPct = DEFAULTS.eff;
    effPct = ScopedLabsAnalyzer.clamp(effPct, 1, 100);

    return {
      ok: true,
      loadW,
      effPct,
      dcV,
      eff: effPct / 100
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const dcInW = input.loadW / input.eff;
    const lossW = dcInW - input.loadW;
    const dcA = dcInW / input.dcV;
    const lossPct = dcInW > 0 ? (lossW / dcInW) * 100 : 0;
    const inputMultiplier = dcInW / input.loadW;

    const efficiencyLossMetric = 100 - input.effPct;
    const currentPressureMetric = ScopedLabsAnalyzer.clamp((dcA / 50) * 100, 0, 100);
    const multiplierMetric = ScopedLabsAnalyzer.clamp((inputMultiplier - 1) * 100, 0, 100);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(efficiencyLossMetric, currentPressureMetric, multiplierMetric),
      metrics: [
        {
          label: "Efficiency Loss",
          value: efficiencyLossMetric,
          displayValue: fmtPct(efficiencyLossMetric)
        },
        {
          label: "DC Current Pressure",
          value: currentPressureMetric,
          displayValue: fmtAmps(dcA)
        },
        {
          label: "Input Multiplier",
          value: multiplierMetric,
          displayValue: fmtRatio(inputMultiplier)
        }
      ],
      healthyMax: 15,
      watchMax: 35
    });

    let operatingClass = "Efficient Conversion";
    if (input.effPct < 80) operatingClass = "Loss-Heavy Conversion";
    else if (dcA > 40) operatingClass = "High DC Current Demand";
    else if (input.effPct < 90) operatingClass = "Moderate Conversion Loss";

    let interpretation = `A ${fmtWatts(input.loadW)} AC load at ${fmtPct(input.effPct)} inverter efficiency requires about ${fmtWatts(dcInW)} from the DC side. That means roughly ${fmtWatts(lossW)} is being burned as conversion loss, and the source must supply about ${fmtAmps(dcA)} at ${fmtVolts(input.dcV)}.`;

    if (input.effPct < 80) {
      interpretation += ` Efficiency is low enough that inverter losses are no longer a small rounding factor. They become a meaningful battery and thermal design burden.`;
    } else if (dcA > 40) {
      interpretation += ` DC current is climbing into a range where conductor sizing, voltage drop, fuse coordination, and terminal heating deserve closer attention.`;
    } else {
      interpretation += ` Conversion losses remain manageable, and DC-side demand is still in a practical range for many small to moderate systems.`;
    }

    let dominantConstraint = "";
    if (efficiencyLossMetric >= currentPressureMetric && efficiencyLossMetric >= multiplierMetric && input.effPct < 90) {
      dominantConstraint = "Efficiency loss is the dominant limiter. The inverter is increasing upstream battery and thermal burden more than the AC load alone suggests.";
    } else if (currentPressureMetric >= multiplierMetric && dcA > 25) {
      dominantConstraint = "DC current pressure is the dominant limiter. Cable sizing and battery-side current handling become the first practical concern.";
    } else if (multiplierMetric > 10) {
      dominantConstraint = "Input multiplier is the dominant limiter. The DC source must deliver materially more power than the AC nameplate load implies.";
    } else {
      dominantConstraint = "The inverter operating point is balanced. Conversion loss, DC current, and power overhead remain in a practical range.";
    }

    let guidance = "";
    if (input.effPct < 80) {
      guidance = "Review inverter selection first. Improving efficiency can materially reduce battery draw, heat loss, and conductor burden without changing the AC load.";
    } else if (dcA > 40) {
      guidance = "Validate conductor sizing, voltage-drop limits, overcurrent protection, and connector ratings before treating this DC load path as finalized.";
    } else {
      guidance = "This is a workable conversion point. Use the DC input power and current values as upstream sizing inputs for battery and wiring decisions.";
    }

    return {
      ok: true,
      ...input,
      dcInW,
      lossW,
      dcA,
      lossPct,
      inputMultiplier,
      operatingClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      efficiencyLossMetric,
      currentPressureMetric,
      multiplierMetric
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
        { label: "AC Load", value: fmtWatts(data.loadW) },
        { label: "DC Input Power", value: fmtWatts(data.dcInW) },
        { label: "Estimated Loss", value: fmtWatts(data.lossW) },
        { label: "Operating Result", value: data.operatingClass }
      ],
      derivedRows: [
        { label: "Efficiency Used", value: fmtPct(data.effPct) },
        { label: "DC Voltage", value: fmtVolts(data.dcV) },
        { label: "DC Current", value: fmtAmps(data.dcA) },
        { label: "Loss Share", value: fmtPct(data.lossPct, 1) },
        { label: "Input Multiplier", value: fmtRatio(data.inputMultiplier) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Efficiency Loss", "DC Current Pressure", "Input Multiplier"],
        values: [
          Number(data.efficiencyLossMetric.toFixed(1)),
          Number(data.currentPressureMetric.toFixed(1)),
          Number(data.multiplierMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(100 - data.effPct),
          fmtAmps(data.dcA),
          fmtRatio(data.inputMultiplier)
        ],
        referenceValue: 15,
        healthyMax: 15,
        watchMax: 35,
        axisTitle: "Conversion Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    invalidate();
  }

  function bind() {
    ["loadW", "eff", "dcV"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.target?.tagName === "INPUT" || e.target?.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    });
  }

  function boot() {
    applyDefaults();
    bind();
    invalidate();

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();