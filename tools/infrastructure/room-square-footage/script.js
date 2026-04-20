(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "room-square-footage";
  const LANE = "v1";

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
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    equip: $("equip"),
    factor: $("factor"),
    growth: $("growth"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

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
    const body = document.body;
    const category = String(body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    const lockedCard = document.getElementById("lockedCard");
    const toolCard = document.getElementById("toolCard");

    if (signedIn && unlocked) {
      if (lockedCard) lockedCard.style.display = "none";
      if (toolCard) toolCard.style.display = "";
      return true;
    }

    if (lockedCard) lockedCard.style.display = "";
    if (toolCard) toolCard.style.display = "none";
    return false;
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function refreshFlowNote() {
    if (!els.flowNote) return;
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["rack-ru-planner"]);
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
      emptyMessage: "Enter values and press Calculate."
    });

    hasResult = false;
    hideContinue();
    refreshFlowNote();
  }

  function calc() {
    const equip = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.equip.value, 0));
    const factor = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.factor.value, 0));
    const growth = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.growth.value, 0));

    const base = equip * factor;
    const total = base * (1 + growth / 100);
    const clearanceArea = Math.max(0, base - equip);
    const growthArea = Math.max(0, total - base);
    const equipmentDensity = total > 0 ? (equip / total) * 100 : 0;

    const clearancePressure = ScopedLabsAnalyzer.clamp((1.8 / factor) * 50, 0, 180);
    const growthPressure = ScopedLabsAnalyzer.clamp((20 - growth) * 4, 0, 180);
    const densityPressure = ScopedLabsAnalyzer.clamp((equipmentDensity / 70) * 100, 0, 180);

    const metrics = [
      {
        label: "Clearance Pressure",
        value: clearancePressure,
        displayValue: `${Math.round(clearancePressure)}%`
      },
      {
        label: "Growth Pressure",
        value: growthPressure,
        displayValue: `${Math.round(growthPressure)}%`
      },
      {
        label: "Density Pressure",
        value: densityPressure,
        displayValue: `${Math.round(densityPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (clearancePressure * 0.40) +
      (growthPressure * 0.30) +
      (densityPressure * 0.30)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let density = "Balanced";
    if (factor < 1.6 || equipmentDensity > 65) density = "Tight";
    else if (factor > 2.6 && growth >= 25) density = "Conservative";

    let dominantConstraint = "Balanced room sizing";
    if (analyzer.dominant.label === "Clearance Pressure") {
      dominantConstraint = "Clearance / aisle allowance";
    } else if (analyzer.dominant.label === "Growth Pressure") {
      dominantConstraint = "Future growth reserve";
    } else if (analyzer.dominant.label === "Density Pressure") {
      dominantConstraint = "Equipment density concentration";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The room plan is crowding usable deployment margin too tightly. Even if the footprint fits numerically, aisle flexibility, service access, or future growth will become the first practical limitation.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The room plan is workable, but margin is tightening. The current estimate may support the initial build, although service clearances and growth reserve are being consumed faster than the raw square-foot total suggests.";
    } else {
      interpretation =
        "The room plan remains inside a manageable planning envelope. Equipment footprint, clearance allowance, and reserve still leave useful room before space becomes the first infrastructure limiter.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain this planning baseline, but keep final aisle, service, and growth assumptions explicit as the layout evolves. The next pressure increase will usually appear in reserve consumption before total square footage looks obviously small.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate aisle width, service clearances, and realistic expansion assumptions before locking the room size. Watch what tightens first: clearance margin, growth reserve, or usable deployment density.";
    } else {
      guidance =
        `Rework the room baseline. The primary limiter is ${dominantConstraint.toLowerCase()}, not just total square footage. Increase floor area, raise the clearance factor, or preserve more future reserve before continuing into rack layout.`;
    }

    const summaryRows = [
      { label: "Equipment Footprint", value: `${equip.toFixed(0)} sq ft` },
      { label: "Clearance Factor", value: `${factor.toFixed(1)}×` },
      { label: "Base Room Size", value: `${base.toFixed(0)} sq ft` },
      { label: "Growth Reserve", value: `${growth.toFixed(0)}%` },
      { label: "Estimated Room Size", value: `${total.toFixed(0)} sq ft` },
      { label: "Planning Density", value: density }
    ];

    const derivedRows = [
      { label: "Clearance / Aisle Area", value: `${clearanceArea.toFixed(0)} sq ft` },
      { label: "Growth Reserve Area", value: `${growthArea.toFixed(0)} sq ft` },
      { label: "Equipment Density", value: `${equipmentDensity.toFixed(1)}%` },
      { label: "Primary Constraint", value: dominantConstraint }
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
        axisTitle: "Room Planning Stress Magnitude",
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
        equip,
        factor,
        growth,
        base,
        total,
        density,
        status: analyzer.status
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    els.equip.value = 250;
    els.factor.value = 2.0;
    els.growth.value = 20;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["equip", "factor", "growth"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/rack-ru-planner/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    refreshFlowNote();
    hideContinue();
  });
})();