(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    voltage: $("voltage"),
    watts: $("watts"),
    amps: $("amps"),
    hours: $("hours"),
    eff: $("eff"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  function num(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtWatts(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} W` : "—";
  }

  function fmtAmps(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} A` : "—";
  }

  function fmtHours(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} hours` : "—";
  }

  function fmtVolts(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} V` : "—";
  }

  function fmtPct(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtWh(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Wh` : "—";
  }

  function fmtAh(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Ah` : "—";
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      emptyMessage: "Enter values and press Calculate."
    });
  }

  function deriveInputs() {
    const voltage = num(els.voltage);
    const wattsInput = num(els.watts);
    const ampsInput = num(els.amps);
    const hours = num(els.hours);
    const effPct = num(els.eff);

    if (!Number.isFinite(voltage) || voltage <= 0) {
      return { ok: false, message: "Enter system voltage." };
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      return { ok: false, message: "Enter runtime hours." };
    }

    if (!Number.isFinite(effPct) || effPct <= 0 || effPct > 100) {
      return { ok: false, message: "Enter efficiency percent." };
    }

    let loadWatts = wattsInput;
    let loadAmps = ampsInput;

    if (!Number.isFinite(loadWatts) && Number.isFinite(loadAmps) && loadAmps > 0) {
      loadWatts = voltage * loadAmps;
    }

    if (!Number.isFinite(loadAmps) && Number.isFinite(loadWatts) && loadWatts > 0) {
      loadAmps = loadWatts / voltage;
    }

    if (!Number.isFinite(loadWatts) || loadWatts <= 0) {
      return { ok: false, message: "Enter either Load Watts or Load Amps." };
    }

    if (!Number.isFinite(loadAmps) || loadAmps <= 0) {
      return { ok: false, message: "Calculated current is invalid." };
    }

    return {
      ok: true,
      voltage,
      loadWatts,
      loadAmps,
      hours,
      effPct,
      eff: effPct / 100
    };
  }

  function calculateModel() {
    const input = deriveInputs();
    if (!input.ok) return input;

    const requiredWh = (input.loadWatts * input.hours) / input.eff;
    const requiredAh = requiredWh / input.voltage;
    const rawAhWithoutLoss = (input.loadWatts * input.hours) / input.voltage;
    const reserveMultiplier = requiredAh / rawAhWithoutLoss;

    const efficiencyLossPct = 100 - input.effPct;
    const runtimeDemandMetric = Math.min((input.hours / 24) * 100, 100);
    const efficiencyLossMetric = efficiencyLossPct;
    const reservePressureMetric = Math.min((reserveMultiplier - 1) * 100, 100);

    const metrics = [
      {
        label: "Runtime Demand",
        value: runtimeDemandMetric,
        displayValue: fmtHours(input.hours)
      },
      {
        label: "Efficiency Loss",
        value: efficiencyLossMetric,
        displayValue: fmtPct(efficiencyLossPct)
      },
      {
        label: "Reserve Pressure",
        value: reservePressureMetric,
        displayValue: `${fmt(reserveMultiplier, 2)}x`
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(runtimeDemandMetric, efficiencyLossMetric, reservePressureMetric),
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let sizingClass = "Balanced Battery Size";
    if (requiredAh >= 400) sizingClass = "Very Large Battery Bank";
    else if (requiredAh >= 200) sizingClass = "Large Battery Bank";
    else if (requiredAh >= 100) sizingClass = "Moderate Battery Bank";
    else sizingClass = "Compact Battery Bank";

    let interpretation = `A ${fmtWatts(input.loadWatts)} load for ${fmtHours(input.hours)} at ${fmtVolts(input.voltage)} requires about ${fmtWh(requiredWh)} of stored energy after applying ${fmtPct(input.effPct)} efficiency. That translates to roughly ${fmtAh(requiredAh)} of battery capacity.`;

    if (requiredAh >= 400) {
      interpretation += ` This is a substantial battery requirement, so enclosure space, conductor sizing, charging rate, and installation practicality become major constraints.`;
    } else if (input.hours >= 12) {
      interpretation += ` Runtime duration is doing most of the sizing work here, so even modest load increases will push battery capacity upward quickly.`;
    } else if (efficiencyLossPct >= 15) {
      interpretation += ` Conversion losses are materially inflating final capacity, which means system efficiency is no longer a minor detail in the design.`;
    } else {
      interpretation += ` Capacity remains in a practical range, and losses are still proportionate to the runtime target.`;
    }

    let dominantConstraint = "";
    if (runtimeDemandMetric >= efficiencyLossMetric && runtimeDemandMetric >= reservePressureMetric && input.hours >= 8) {
      dominantConstraint = "Runtime demand is the dominant limiter. The storage requirement is being driven mainly by how long the system must stay online.";
    } else if (efficiencyLossMetric >= reservePressureMetric && efficiencyLossMetric > 15) {
      dominantConstraint = "Efficiency loss is the dominant limiter. Energy conversion losses are increasing required battery capacity more than the raw load suggests.";
    } else if (reservePressureMetric > 20) {
      dominantConstraint = "Reserve pressure is the dominant limiter. Final battery size is being pushed up by usable-capacity overhead rather than raw runtime energy alone.";
    } else {
      dominantConstraint = "The battery sizing inputs are balanced. Load, runtime, and efficiency are staying in a practical range.";
    }

    let guidance = "";
    if (requiredAh >= 400) {
      guidance = "Validate physical battery count, charger sizing, enclosure space, and conductor sizing before treating this as deployable. Large battery banks become installation-limited quickly.";
    } else if (input.hours >= 12) {
      guidance = "If this battery size feels excessive, review whether the runtime target is truly required or whether staged load shedding would be acceptable.";
    } else if (efficiencyLossPct >= 15) {
      guidance = "Review inverter, converter, or driver efficiency assumptions. Small efficiency gains can materially reduce required battery size.";
    } else {
      guidance = "Battery capacity is in a workable range. Use this result as a planning baseline for battery count and charger selection.";
    }

    return {
      ok: true,
      ...input,
      requiredWh,
      requiredAh,
      rawAhWithoutLoss,
      reserveMultiplier,
      sizingClass,
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
        { label: "Load Power", value: fmtWatts(data.loadWatts) },
        { label: "Runtime", value: fmtHours(data.hours) },
        { label: "Required Capacity", value: fmtWh(data.requiredWh) },
        { label: "Estimated Battery Size", value: fmtAh(data.requiredAh) }
      ],
      derivedRows: [
        { label: "System Voltage", value: fmtVolts(data.voltage) },
        { label: "Derived Load Current", value: fmtAmps(data.loadAmps) },
        { label: "Efficiency Used", value: fmtPct(data.effPct) },
        { label: "Raw Capacity Before Losses", value: fmtAh(data.rawAhWithoutLoss) },
        { label: "Reserve Multiplier", value: `${fmt(data.reserveMultiplier, 2)}x` },
        { label: "Sizing Result", value: data.sizingClass }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    if (els.voltage) els.voltage.value = "";
    ["watts", "amps", "hours", "eff"].forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });
    invalidate();
  }

  function bind() {
    ["voltage", "watts", "amps", "hours", "eff"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    if (els.calc) els.calc.addEventListener("click", calc);
    if (els.reset) els.reset.addEventListener("click", reset);
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



window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
