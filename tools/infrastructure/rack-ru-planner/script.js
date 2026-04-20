(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "rack-ru-planner";
  const LANE = "v1";
  const PREVIOUS_STEP = "room-square-footage";

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
    total: $("total"),
    used: $("used"),
    reserve: $("reserve"),
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
    if (typeof upstreamContext.total === "number") rows.push(`Room Size: <strong>${upstreamContext.total.toFixed(0)} sq ft</strong>`);
    if (typeof upstreamContext.density === "string") rows.push(`Planning Density: <strong>${upstreamContext.density}</strong>`);
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
      This step checks whether the rack plan only fits on paper or still leaves usable reserve for growth, service access, and future hardware additions.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["equipment-spacing"]);
      sessionStorage.removeItem(FLOW_KEYS["rack-weight-load"]);
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
    const total = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.total.value, 1));
    const used = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.used.value, 0));
    const reservePct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.reserve.value, 20),
      0,
      80
    );

    const free = total - used;
    const reserved = total * (reservePct / 100);
    const available = free - reserved;
    const usedPct = (used / total) * 100;
    const postReserveUtil = ((used + reserved) / total) * 100;
    const growthHeadroom = Math.max(0, (available / total) * 100);

    const capacityPressure = ScopedLabsAnalyzer.clamp((postReserveUtil / 100) * 100, 0, 180);
    const reserveStress = ScopedLabsAnalyzer.clamp((reservePct / 25) * 100, 0, 180);
    const headroomStress = ScopedLabsAnalyzer.clamp(100 - growthHeadroom * 2.2, 0, 180);

    const metrics = [
      {
        label: "Capacity Pressure",
        value: capacityPressure,
        displayValue: `${Math.round(capacityPressure)}%`
      },
      {
        label: "Reserve Stress",
        value: reserveStress,
        displayValue: `${Math.round(reserveStress)}%`
      },
      {
        label: "Headroom Stress",
        value: headroomStress,
        displayValue: `${Math.round(headroomStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (capacityPressure * 0.50) +
      (reserveStress * 0.25) +
      (headroomStress * 0.25)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let capacityClass = "Comfortable rack reserve";
    if (available < 2 || postReserveUtil > 95) {
      capacityClass = "Effectively full rack";
    } else if (available < 6 || postReserveUtil > 80) {
      capacityClass = "Tight rack reserve";
    } else if (growthHeadroom > 35) {
      capacityClass = "Expansion-friendly rack";
    }

    let dominantConstraint = "Balanced rack utilization";
    if (analyzer.dominant.label === "Capacity Pressure") {
      dominantConstraint = "Installed rack utilization";
    } else if (analyzer.dominant.label === "Reserve Stress") {
      dominantConstraint = "Growth reserve policy";
    } else if (analyzer.dominant.label === "Headroom Stress") {
      dominantConstraint = "Remaining expansion margin";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The rack is effectively full once real growth reserve is respected. Expansion will become difficult before the raw free RU figure suggests, because reserve and service margin have already been consumed.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The rack is workable, but reserve is tightening. The current deployment may fit, although modest adds or late-stage hardware changes will consume usable headroom faster than the visible free RU count suggests.";
    } else {
      interpretation =
        "The rack remains inside a manageable capacity envelope. Current utilization and growth reserve still leave usable room before rack space becomes the first deployment limiter.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current rack plan, but keep realistic reserve policy in place. The next pressure increase will usually appear in growth reserve before it appears in absolute rack fullness.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate near-term equipment additions and cable/service access before locking this rack as complete. Watch what tightens first: usable reserve, service margin, or late-stage device additions.";
    } else {
      guidance =
        `Rework the rack plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just nominal free RU. Reduce density, add another rack, or lower the fill target before hardening the deployment layout.`;
    }

    const summaryRows = [
      { label: "Total Rack RU", value: `${total}` },
      { label: "Used RU", value: `${used}` },
      { label: "Free RU", value: `${free.toFixed(1)}` },
      { label: "Reserved for Growth", value: `${reserved.toFixed(1)} RU` },
      { label: "Available RU After Reserve", value: `${available.toFixed(1)} RU` },
      { label: "Capacity Status", value: analyzer.status }
    ];

    const derivedRows = [
      { label: "Raw Utilization", value: `${usedPct.toFixed(1)} %` },
      { label: "Post-Reserve Utilization", value: `${postReserveUtil.toFixed(1)} %` },
      { label: "Growth Headroom", value: `${growthHeadroom.toFixed(1)} %` },
      { label: "Capacity Class", value: capacityClass }
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
        axisTitle: "Rack Capacity Stress Magnitude",
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
        used,
        free,
        available,
        status: analyzer.status,
        fillClass: capacityClass,
        growthHeadroom
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    els.total.value = 42;
    els.used.value = 18;
    els.reserve.value = 20;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["total", "used", "reserve"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/equipment-spacing/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    refreshFlowNote();
    hideContinue();
  });
})();