(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "ups-room-sizing";
  const LANE = "v1";
  const PREVIOUS_STEP = "floor-load-rating";

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
    ups: $("ups"),
    batt: $("batt"),
    areaEach: $("areaEach"),
    factor: $("factor"),
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
    if (typeof upstreamContext.psf === "number") rows.push(`Floor Load: <strong>${upstreamContext.psf.toFixed(1)} psf</strong>`);
    if (typeof upstreamContext.status === "string") rows.push(`Load Status: <strong>${upstreamContext.status}</strong>`);
    if (typeof upstreamContext.classification === "string") rows.push(`Load Class: <strong>${upstreamContext.classification}</strong>`);

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
      This step checks whether the UPS room is only fitting nominal equipment footprint or still preserving enough access, service, and expansion margin for real deployment.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
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
    const ups = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.ups.value, 0)));
    const batt = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.batt.value, 0)));
    const areaEach = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.areaEach.value, 0));
    const factor = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.factor.value, 1));

    const totalCab = ups + batt;
    const baseArea = totalCab * areaEach;
    const finalArea = baseArea * factor;

    const clearanceArea = Math.max(0, finalArea - baseArea);
    const densityPct = finalArea > 0 ? (baseArea / finalArea) * 100 : 0;
    const reservePct = Math.max(0, 100 - densityPct);

    const clearancePressure = ScopedLabsAnalyzer.clamp((1.6 / factor) * 55, 0, 180);
    const reserveStress = ScopedLabsAnalyzer.clamp((25 - reservePct) * 4, 0, 180);
    const densityPressure = ScopedLabsAnalyzer.clamp((densityPct / 75) * 100, 0, 180);

    const metrics = [
      {
        label: "Clearance Pressure",
        value: clearancePressure,
        displayValue: `${Math.round(clearancePressure)}%`
      },
      {
        label: "Reserve Stress",
        value: reserveStress,
        displayValue: `${Math.round(reserveStress)}%`
      },
      {
        label: "Density Pressure",
        value: densityPressure,
        displayValue: `${Math.round(densityPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (clearancePressure * 0.40) +
      (reserveStress * 0.30) +
      (densityPressure * 0.30)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let density = "Balanced";
    if (factor < 1.35 || densityPct > 70) density = "Tight";
    else if (factor > 2.0 && reservePct > 35) density = "Spacious";

    let dominantConstraint = "Balanced UPS room sizing";
    if (analyzer.dominant.label === "Clearance Pressure") {
      dominantConstraint = "Clearance / service allowance";
    } else if (analyzer.dominant.label === "Reserve Stress") {
      dominantConstraint = "Future expansion reserve";
    } else if (analyzer.dominant.label === "Density Pressure") {
      dominantConstraint = "Cabinet density concentration";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The UPS room plan is crowding usable deployment margin too tightly. Even if the cabinet count fits numerically, service clearances and future battery or UPS changes will become the first practical limitation.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The UPS room sizing is workable, but reserve is tightening. The current cabinet plan may fit, although service access and growth margin are being consumed faster than the raw room total suggests.";
    } else {
      interpretation =
        "The UPS room sizing remains inside a manageable planning envelope. Cabinet footprint, clearance allowance, and reserve still leave useful room before space becomes the first infrastructure limiter.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain this room baseline, but keep battery growth, service clearances, and replacement access explicit in the final layout. The next pressure increase will usually appear in reserve consumption before total room size looks obviously undersized.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate maintenance access, battery replacement path, and future cabinet growth before locking the room size. Watch what tightens first: clearances, reserve area, or cabinet density.";
    } else {
      guidance =
        `Rework the UPS room plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just total cabinet count. Increase room area, raise clearance allowance, or preserve more reserve before finalizing deployment.`;
    }

    const summaryRows = [
      { label: "Total Cabinets", value: `${totalCab}` },
      { label: "Base Equipment Area", value: `${baseArea.toFixed(0)} sq ft` },
      { label: "Clearance Factor", value: `${factor.toFixed(1)}×` },
      { label: "Estimated Room Size", value: `${finalArea.toFixed(0)} sq ft` },
      { label: "Layout Density", value: density }
    ];

    const derivedRows = [
      { label: "Clearance / Service Area", value: `${clearanceArea.toFixed(0)} sq ft` },
      { label: "Cabinet Density", value: `${densityPct.toFixed(1)} %` },
      { label: "Reserve Area", value: `${reservePct.toFixed(1)} %` },
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
        axisTitle: "UPS Room Stress Magnitude",
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
        totalCab,
        baseArea,
        finalArea,
        density,
        status: analyzer.status
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    els.ups.value = 2;
    els.batt.value = 4;
    els.areaEach.value = 20;
    els.factor.value = 1.5;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["ups", "batt", "areaEach", "factor"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/generator-runtime/";
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