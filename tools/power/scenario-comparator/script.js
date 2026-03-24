(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    a_load_w: $("a_load_w"),
    a_batt_wh: $("a_batt_wh"),
    a_eff_pct: $("a_eff_pct"),
    a_reserve_pct: $("a_reserve_pct"),
    b_load_w: $("b_load_w"),
    b_batt_wh: $("b_batt_wh"),
    b_eff_pct: $("b_eff_pct"),
    b_reserve_pct: $("b_reserve_pct"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  const DEFAULTS = {
    a_load_w: 800,
    a_batt_wh: 2000,
    a_eff_pct: 90,
    a_reserve_pct: 20,
    b_load_w: 800,
    b_batt_wh: 3000,
    b_eff_pct: 92,
    b_reserve_pct: 20
  };

  function num(id) {
    const v = Number($(id)?.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function fmt(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtHrs(hours) {
    if (!Number.isFinite(hours)) return "—";
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(2)} hrs`;
  }

  function fmtWatts(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} W` : "—";
  }

  function fmtWh(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Wh` : "—";
  }

  function fmtPct(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function runtimeHours(loadW, battWh, effPct, reservePct) {
    const eff = effPct / 100;
    const reserve = reservePct / 100;
    const usableWh = battWh * eff * (1 - reserve);

    if (!(usableWh > 0) || !(loadW > 0)) return NaN;
    return usableWh / loadW;
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      emptyMessage: "Enter values and press Calculate."
    });
  }

  function applyDefaults() {
    Object.entries(DEFAULTS).forEach(([id, value]) => {
      if ($(id)) $(id).value = String(value);
    });
  }

  function readScenario(prefix) {
    const loadW = num(`${prefix}_load_w`);
    const battWh = num(`${prefix}_batt_wh`);
    const effPct = num(`${prefix}_eff_pct`);
    const reservePct = num(`${prefix}_reserve_pct`);

    const bad =
      !Number.isFinite(loadW) || loadW <= 0 ||
      !Number.isFinite(battWh) || battWh <= 0 ||
      !Number.isFinite(effPct) || effPct <= 0 || effPct > 100 ||
      !Number.isFinite(reservePct) || reservePct < 0 || reservePct >= 100;

    if (bad) {
      return { ok: false };
    }

    const usableWh = battWh * (effPct / 100) * (1 - reservePct / 100);
    const runtime = runtimeHours(loadW, battWh, effPct, reservePct);

    return {
      ok: true,
      loadW,
      battWh,
      effPct,
      reservePct,
      usableWh,
      runtime
    };
  }

  function calculateModel() {
    const A = readScenario("a");
    const B = readScenario("b");

    if (!A.ok || !B.ok) {
      return {
        ok: false,
        message: "Enter valid values (Loads & Wh > 0, Efficiency 1–100, Reserve 0–99)."
      };
    }

    const deltaHrs = B.runtime - A.runtime;
    const pctChange = A.runtime === 0 ? NaN : (deltaHrs / A.runtime) * 100;

    const efficiencyDelta = B.effPct - A.effPct;
    const capacityDeltaWh = B.battWh - A.battWh;
    const reserveDeltaPct = B.reservePct - A.reservePct;
    const loadDeltaPct = A.loadW > 0 ? ((B.loadW - A.loadW) / A.loadW) * 100 : 0;

    const runtimeGapMetric = ScopedLabsAnalyzer.clamp(Math.abs(pctChange), 0, 100);
    const efficiencyShiftMetric = ScopedLabsAnalyzer.clamp(Math.abs(efficiencyDelta) * 4, 0, 100);
    const reserveShiftMetric = ScopedLabsAnalyzer.clamp(Math.abs(reserveDeltaPct) * 2, 0, 100);

    const metrics = [
      {
        label: "Runtime Difference",
        value: runtimeGapMetric,
        displayValue: fmtPct(Math.abs(pctChange))
      },
      {
        label: "Efficiency Shift",
        value: efficiencyShiftMetric,
        displayValue: fmtPct(Math.abs(efficiencyDelta))
      },
      {
        label: "Reserve Shift",
        value: reserveShiftMetric,
        displayValue: fmtPct(Math.abs(reserveDeltaPct))
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(runtimeGapMetric, efficiencyShiftMetric, reserveShiftMetric),
      metrics,
      healthyMax: 15,
      watchMax: 35
    });

    let comparisonClass = "Minor Difference";
    if (Math.abs(pctChange) >= 40) comparisonClass = "Large Runtime Difference";
    else if (Math.abs(pctChange) >= 15) comparisonClass = "Moderate Runtime Difference";

    const betterLabel = deltaHrs > 0 ? "Scenario B" : deltaHrs < 0 ? "Scenario A" : "Neither scenario";

    let interpretation = `Scenario A delivers about ${fmtHrs(A.runtime)} of runtime from ${fmtWh(A.usableWh)} usable energy, while Scenario B delivers about ${fmtHrs(B.runtime)} from ${fmtWh(B.usableWh)} usable energy. The runtime difference is ${fmtHrs(Math.abs(deltaHrs))}, which is ${Number.isFinite(pctChange) ? fmtPct(Math.abs(pctChange)) : "—"} relative to Scenario A.`;

    if (Math.abs(pctChange) >= 40) {
      interpretation += ` The scenarios are materially different, so one of the design assumptions — battery size, efficiency, reserve policy, or load — is meaningfully changing resilience.`;
    } else if (Math.abs(pctChange) >= 15) {
      interpretation += ` The runtime spread is large enough to affect planning decisions, especially if outage targets are tight.`;
    } else {
      interpretation += ` The scenarios are relatively close, so the design choice is more about preference, margin philosophy, or small efficiency advantages than a major runtime shift.`;
    }

    let dominantConstraint = "";
    if (reserveShiftMetric >= efficiencyShiftMetric && reserveShiftMetric >= runtimeGapMetric && Math.abs(reserveDeltaPct) >= 10) {
      dominantConstraint = "Reserve policy is the dominant limiter. The runtime spread is being driven mainly by how aggressively each scenario protects usable battery energy.";
    } else if (efficiencyShiftMetric >= reserveShiftMetric && Math.abs(efficiencyDelta) >= 3) {
      dominantConstraint = "Efficiency is the dominant limiter. Conversion quality is materially changing how much of the installed battery capacity becomes usable runtime.";
    } else if (Math.abs(loadDeltaPct) >= 10) {
      dominantConstraint = "Load difference is the dominant limiter. Runtime is moving primarily because one scenario is carrying a meaningfully different demand level.";
    } else {
      dominantConstraint = "Battery capacity difference is the dominant limiter. Installed energy is doing most of the work in separating the two runtime outcomes.";
    }

    let guidance = "";
    if (Math.abs(pctChange) >= 40) {
      guidance = `${betterLabel} is the stronger runtime design on paper, but validate whether that advantage comes from realistic assumptions and not overly optimistic efficiency or reserve settings.`;
    } else if (Math.abs(pctChange) >= 15) {
      guidance = "Use the better-performing scenario as the planning baseline, then review whether the weaker scenario can be improved through modest battery, efficiency, or reserve changes.";
    } else {
      guidance = "Since runtime is close, choose based on cost, space, thermal behavior, or maintenance preference rather than expecting a dramatic runtime advantage.";
    }

    return {
      ok: true,
      A,
      B,
      deltaHrs,
      pctChange,
      efficiencyDelta,
      capacityDeltaWh,
      reserveDeltaPct,
      loadDeltaPct,
      comparisonClass,
      betterLabel,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Scenario A Runtime", value: fmtHrs(data.A.runtime) },
        { label: "Scenario B Runtime", value: fmtHrs(data.B.runtime) },
        { label: "Difference (B − A)", value: `${data.deltaHrs >= 0 ? "+" : "-"}${fmtHrs(Math.abs(data.deltaHrs))}` },
        { label: "Comparison Result", value: data.comparisonClass }
      ],
      derivedRows: [
        { label: "Scenario A Load", value: fmtWatts(data.A.loadW) },
        { label: "Scenario B Load", value: fmtWatts(data.B.loadW) },
        { label: "Scenario A Usable Energy", value: fmtWh(data.A.usableWh) },
        { label: "Scenario B Usable Energy", value: fmtWh(data.B.usableWh) },
        { label: "% Change vs A", value: Number.isFinite(data.pctChange) ? fmtPct(data.pctChange) : "—" },
        { label: "Efficiency Shift", value: fmtPct(data.efficiencyDelta) },
        { label: "Reserve Shift", value: fmtPct(data.reserveDeltaPct) },
        { label: "Capacity Shift", value: fmtWh(data.capacityDeltaWh) }
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
    [
      "a_load_w", "a_batt_wh", "a_eff_pct", "a_reserve_pct",
      "b_load_w", "b_batt_wh", "b_eff_pct", "b_reserve_pct"
    ].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", resetForm);
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
