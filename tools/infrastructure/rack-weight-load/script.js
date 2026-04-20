(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "rack-weight-load";
  const LANE = "v1";
  const PREVIOUS_STEP = "equipment-spacing";

  const FLOW_KEYS = {
    "room-square-footage": "scopedlabs:pipeline:infrastructure:room-square-footage",
    "rack-ru-planner": "scopedlabs:pipeline:infrastructure:rack-ru-planner",
    "equipment-spacing": "scopedlabs:pipeline:infrastructure:equipment-spacing",
    "rack-weight-load": "scopedlabs:pipeline:infrastructure:rack-weight-load",
    "floor-load-rating": "scopedlabs:pipeline:infrastructure:floor-load-rating",
    "ups-room-sizing": "scopedlabs:pipeline:infrastructure:ups-room-sizing",
    "generator-runtime": "scopedlabs:pipeline:infrastructure:generator-runtime"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;
  let upstreamContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    count: $("count"),
    each: $("each"),
    cap: $("cap"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    upstreamContext = parsed.data || {};

    const rows = [];
    if (typeof upstreamContext.areaSqFt === "number") rows.push(`Room Area: <strong>${upstreamContext.areaSqFt.toFixed(0)} sq ft</strong>`);
    if (typeof upstreamContext.layout === "string") rows.push(`Layout Type: <strong>${upstreamContext.layout}</strong>`);
    if (typeof upstreamContext.status === "string") rows.push(`Previous Status: <strong>${upstreamContext.status}</strong>`);

    if (!rows.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${rows.join(" | ")}
      <br><br>
      This step checks whether the rack weight plan only fits nominally or still leaves real structural margin before placement and population.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["floor-load-rating"]);
      sessionStorage.removeItem(FLOW_KEYS["ups-room-sizing"]);
      sessionStorage.removeItem(FLOW_KEYS["generator-runtime"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    hideContinue();
    refreshFlowNote();
  }

  function calc() {
    const count = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.count.value, 0)));
    const each = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.each.value, 0));
    const cap = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.cap.value, 1));

    const total = count * each;
    const percent = (total / cap) * 100;
    const remaining = cap - total;
    const remainingPct = (remaining / cap) * 100;

    const loadPressure = ScopedLabsAnalyzer.clamp((total / cap) * 100, 0, 180);
    const reserveStress = ScopedLabsAnalyzer.clamp(100 - remainingPct, 0, 180);
    const densityStress = ScopedLabsAnalyzer.clamp((count / 30) * 100, 0, 180);

    const metrics = [
      {
        label: "Load Pressure",
        value: loadPressure,
        displayValue: `${Math.round(loadPressure)}%`
      },
      {
        label: "Reserve Stress",
        value: reserveStress,
        displayValue: `${Math.round(reserveStress)}%`
      },
      {
        label: "Device Density",
        value: densityStress,
        displayValue: `${Math.round(densityStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (loadPressure * 0.55) +
      (reserveStress * 0.30) +
      (densityStress * 0.15)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let statusText = "Within Capacity";
    if (percent > 80) statusText = "High Load";
    if (percent > 100) statusText = "Over Capacity";

    let loadClass = "Comfortable rack load";
    if (percent > 100) loadClass = "Overloaded rack";
    else if (percent > 90) loadClass = "Critical rack load";
    else if (percent > 75) loadClass = "Elevated rack load";

    let dominantConstraint = "Balanced rack loading";
    if (analyzer.dominant.label === "Load Pressure") {
      dominantConstraint = "Rack structural capacity";
    } else if (analyzer.dominant.label === "Reserve Stress") {
      dominantConstraint = "Remaining load margin";
    } else if (analyzer.dominant.label === "Device Density") {
      dominantConstraint = "Equipment concentration";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The rack is too close to its structural envelope. Even if the load is technically supportable on paper, remaining margin is too small to treat the rack as comfortably deployable.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The rack loading is workable, but reserve is tightening. The population plan may still fit, although late-stage device additions or inaccurate equipment weights will consume structural margin faster than the raw percentage suggests.";
    } else {
      interpretation =
        "The rack loading remains inside a manageable structural envelope. Device count, total weight, and remaining margin still leave useful reserve before rack capacity becomes the first deployment limiter.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current population plan, but keep actual installed device weights in view. The next pressure increase will usually appear in reserve margin before it appears in absolute capacity.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate real equipment weights and late-stage additions before locking the rack bill of materials. Watch what tightens first: remaining load margin, device concentration, or final installed accessories.";
    } else {
      guidance =
        `Rework the rack population plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just device count. Reduce equipment concentration, split the load, or move to a stronger rack before deployment.`;
    }

    const summaryRows = [
      { label: "Devices", value: `${count}` },
      { label: "Total Weight", value: `${total.toFixed(0)} lbs` },
      { label: "Rack Capacity", value: `${cap.toFixed(0)} lbs` },
      { label: "Load %", value: `${percent.toFixed(1)} %` },
      { label: "Load Status", value: statusText }
    ];

    const derivedRows = [
      { label: "Remaining Capacity", value: `${remaining.toFixed(0)} lbs` },
      { label: "Remaining Margin", value: `${remainingPct.toFixed(1)} %` },
      { label: "Load Class", value: loadClass }
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
        axisTitle: "Rack Load Risk Magnitude",
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        total,
        percent,
        status: analyzer.status,
        classification: loadClass
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    els.count.value = 20;
    els.each.value = 35;
    els.cap.value = 3000;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["count", "each", "cap"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/floor-load-rating/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    refreshFlowNote();
    hideContinue();
  });
})();