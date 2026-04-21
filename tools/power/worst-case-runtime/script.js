(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    loadW: $("loadW"),
    upsMaxW: $("upsMaxW"),
    usableWh: $("usableWh"),
    effPct: $("effPct"),
    healthLossPct: $("healthLossPct"),
    tempLossPct: $("tempLossPct"),
    spikeX: $("spikeX"),
    floorMin: $("floorMin"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  const DEFAULTS = {
    loadW: 200,
    upsMaxW: 450,
    usableWh: 360,
    effPct: 90,
    healthLossPct: 15,
    tempLossPct: 10,
    spikeX: 1.20,
    floorMin: 20
  };

  function num(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function fmt(num, digits = 1) {
    return Number.isFinite(num) ? num.toFixed(digits) : "—";
  }

  function fmtMin(v, digits = 1) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} min` : "—";
  }

  function fmtPct(v, digits = 1) {
    return Number.isFinite(v) ? `${v.toFixed(digits)}%` : "—";
  }

  function fmtWatts(v, digits = 0) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} W` : "—";
  }

  function fmtWh(v, digits = 0) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} Wh` : "—";
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

  function applyDefaults() {
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      if (els[key]) els[key].value = String(value);
    });
  }

  function minutesFromWh(usableWh, effPct, healthLossPct, tempLossPct, loadW, spikeX) {
    const eff = clamp(effPct, 50, 99) / 100;
    const healthMult = 1 - clamp(healthLossPct, 0, 70) / 100;
    const tempMult = 1 - clamp(tempLossPct, 0, 60) / 100;
    const derateMult = healthMult * tempMult;

    const effectiveWh = Math.max(0, usableWh) * eff * derateMult;
    const denomW = Math.max(1, loadW) * Math.max(1, spikeX);

    const hours = effectiveWh / denomW;
    return hours * 60;
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      emptyMessage: "Run the simulator to see baseline vs worst-case runtime and pass/fail against the floor target."
    });
  }

  function getInputs() {
    const loadW = Math.max(0, num(els.loadW));
    const upsMaxW = Math.max(1, num(els.upsMaxW));
    const usableWh = Math.max(1, num(els.usableWh));
    const effPct = clamp(num(els.effPct), 50, 99);
    const healthLossPct = clamp(num(els.healthLossPct), 0, 70);
    const tempLossPct = clamp(num(els.tempLossPct), 0, 60);
    const spikeX = clamp(num(els.spikeX), 1, 3);
    const floorMin = Math.max(0, num(els.floorMin));

    if (!Number.isFinite(loadW) || loadW <= 0) {
      return { ok: false, message: "Enter a valid baseline load in watts." };
    }
    if (!Number.isFinite(upsMaxW) || upsMaxW <= 0) {
      return { ok: false, message: "Enter a valid UPS rated output in watts." };
    }
    if (!Number.isFinite(usableWh) || usableWh <= 0) {
      return { ok: false, message: "Enter a valid usable battery energy in watt-hours." };
    }

    return {
      ok: true,
      loadW,
      upsMaxW,
      usableWh,
      effPct,
      healthLossPct,
      tempLossPct,
      spikeX,
      floorMin
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const overloadWorst = (input.loadW * input.spikeX) > input.upsMaxW;

    const baselineMin = minutesFromWh(input.usableWh, input.effPct, 0, 0, input.loadW, 1);
    const worstMin = minutesFromWh(
      input.usableWh,
      input.effPct,
      input.healthLossPct,
      input.tempLossPct,
      input.loadW,
      input.spikeX
    );

    const passWorst = worstMin >= input.floorMin && !overloadWorst;
    const runtimeLossMin = baselineMin - worstMin;
    const runtimeLossPct = baselineMin > 0 ? (runtimeLossMin / baselineMin) * 100 : 0;

    const worstLoad = input.loadW * input.spikeX;
    const loadPressurePct = (worstLoad / input.upsMaxW) * 100;

    const overloadMetric = Math.min(loadPressurePct, 100);
    const runtimeLossMetric = Math.min(Math.max(runtimeLossPct, 0), 100);
    const floorGapMetric = worstMin >= input.floorMin
      ? Math.max(0, 100 - worstMin)
      : Math.min(100, 70 + (input.floorMin - worstMin) * 2);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(overloadMetric, runtimeLossMetric, floorGapMetric),
      metrics: [
        {
          label: "Load Pressure",
          value: Number(overloadMetric.toFixed(1)),
          displayValue: fmtPct(loadPressurePct, 1)
        },
        {
          label: "Runtime Loss",
          value: Number(runtimeLossMetric.toFixed(1)),
          displayValue: fmtMin(runtimeLossMin, 1)
        },
        {
          label: "Floor Tightness",
          value: Number(floorGapMetric.toFixed(1)),
          displayValue: `${fmtMin(worstMin, 1)} vs ${fmtMin(input.floorMin, 0)}`
        }
      ],
      healthyMax: 60,
      watchMax: 85
    });

    let resultClass = "Worst-Case Acceptable";
    if (overloadWorst) resultClass = "Worst-Case Overload";
    else if (!passWorst) resultClass = "Worst-Case Runtime Fail";
    else if (runtimeLossPct >= 40) resultClass = "Heavy Worst-Case Penalty";

    let interpretation = `Baseline runtime is about ${fmtMin(baselineMin, 1)}, while worst-case runtime drops to about ${fmtMin(worstMin, 1)} after applying ${fmtPct(input.healthLossPct, 0)} battery health loss, ${fmtPct(input.tempLossPct, 0)} temperature derate, ${fmtPct(100 - input.effPct, 0)} inverter loss, and a ${fmt(input.spikeX, 2)}x load spike. Worst-case instantaneous load becomes ${fmtWatts(worstLoad)}, compared with UPS capacity of ${fmtWatts(input.upsMaxW)}.`;

    if (overloadWorst) {
      interpretation += ` The spike condition exceeds UPS output capability, so overload risk becomes the first failure mode before runtime math even matters.`;
    } else if (!passWorst) {
      interpretation += ` The design stays online, but worst-case runtime falls below the required floor target, so outage resilience is weaker than the planning goal.`;
    } else if (runtimeLossPct >= 40) {
      interpretation += ` The design still passes, but the bad-day penalty is large enough that aging, environment, and surge behavior are doing meaningful damage to resilience.`;
    } else {
      interpretation += ` Worst-case penalties are present but still reasonably controlled, so the runtime floor survives with usable planning margin.`;
    }

    let dominantConstraint = "";
    if (overloadWorst || loadPressurePct > 100) {
      dominantConstraint = "Load pressure is the dominant limiter. The spike-adjusted demand is outrunning UPS output capability.";
    } else if (!passWorst || worstMin < input.floorMin) {
      dominantConstraint = "Runtime floor is the dominant limiter. The bad-day scenario erodes runtime below the minimum acceptable resilience target.";
    } else if (runtimeLossPct >= 25) {
      dominantConstraint = "Worst-case runtime loss is the dominant limiter. Derates and spike behavior are consuming too much of the original runtime margin.";
    } else {
      dominantConstraint = "The stress assumptions are reasonably balanced. Worst-case penalties remain within a practical planning range.";
    }

    let guidance = "";
    if (overloadWorst) {
      guidance = "Reduce spike demand, increase UPS size, or separate startup surges before treating this system as resilient under worst-case conditions.";
    } else if (!passWorst) {
      guidance = "Increase usable battery energy, lower the floor target only if justified, or reduce worst-case load assumptions before depending on this design.";
    } else if (runtimeLossPct >= 40) {
      guidance = "The design passes, but with a heavy penalty. Recheck aging assumptions, room temperature, and startup surge behavior before finalizing it.";
    } else {
      guidance = "Worst-case margin is workable. Use this as the stress-tested planning baseline for final runtime and battery decisions.";
    }

    return {
      ok: true,
      ...input,
      overloadWorst,
      baselineMin,
      worstMin,
      passWorst,
      runtimeLossMin,
      runtimeLossPct,
      worstLoad,
      loadPressurePct,
      resultClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      overloadMetric,
      runtimeLossMetric,
      floorGapMetric
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Baseline Runtime", value: fmtMin(data.baselineMin, 1) },
        { label: "Worst-Case Runtime", value: fmtMin(data.worstMin, 1) },
        { label: "Floor Target", value: fmtMin(data.floorMin, 0) },
        { label: "Worst-Case Result", value: data.resultClass }
      ],
      derivedRows: [
        { label: "Baseline Load", value: fmtWatts(data.loadW) },
        { label: "Worst-Case Spike Load", value: fmtWatts(data.worstLoad) },
        { label: "UPS Rated Output", value: fmtWatts(data.upsMaxW) },
        { label: "Usable Battery Energy", value: fmtWh(data.usableWh) },
        { label: "Battery Health Loss", value: fmtPct(data.healthLossPct, 0) },
        { label: "Temperature Loss", value: fmtPct(data.tempLossPct, 0) },
        { label: "Inverter Efficiency", value: fmtPct(data.effPct, 0) },
        { label: "Runtime Loss", value: fmtMin(data.runtimeLossMin, 1) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Load Pressure",
          "Runtime Loss",
          "Floor Tightness"
        ],
        values: [
          Number(data.overloadMetric.toFixed(1)),
          Number(data.runtimeLossMetric.toFixed(1)),
          Number(data.floorGapMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.loadPressurePct, 1),
          fmtMin(data.runtimeLossMin, 1),
          `${fmtMin(data.worstMin, 1)} vs ${fmtMin(data.floorMin, 0)}`
        ],
        referenceValue: 60,
        healthyMax: 60,
        watchMax: 85,
        axisTitle: "Worst-Case Runtime Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
  }

  function run() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function resetForm() {
    applyDefaults();
    invalidate();
  }

  function bind() {
    Object.keys(DEFAULTS).forEach((key) => {
      const el = els[key];
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    if (els.calc) els.calc.addEventListener("click", run);
    if (els.reset) els.reset.addEventListener("click", resetForm);
  }

  function boot() {
    applyDefaults();
    bind();
    invalidate();

    const y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
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
