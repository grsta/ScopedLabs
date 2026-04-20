(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "floor-load-rating";
  const LANE = "v1";
  const PREVIOUS_STEP = "rack-weight-load";

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
  let upstream = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    weight: $("weight"),
    w: $("w"),
    d: $("d"),
    rating: $("rating"),
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

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
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
      upstream = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstream = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstream = null;
      return;
    }

    upstream = parsed.data || {};

    const rows = [];
    if (typeof upstream.total === "number") rows.push(`Rack Weight: <strong>${upstream.total.toFixed(0)} lbs</strong>`);
    if (typeof upstream.status === "string") rows.push(`Load Status: <strong>${upstream.status}</strong>`);
    if (typeof upstream.classification === "string") rows.push(`Load Class: <strong>${upstream.classification}</strong>`);

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
      This step checks whether the rack footprint still preserves real structural margin once concentrated floor loading is considered.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
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
    const weight = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.weight.value, 0));
    const w = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.w.value, 0.1));
    const d = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.d.value, 0.1));
    const rating = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.rating.value, 1));

    const areaSqFt = (w / 12) * (d / 12);
    const psf = weight / areaSqFt;
    const marginPsf = rating - psf;
    const remainingMarginPct = (marginPsf / rating) * 100;

    const loadPressure = ScopedLabsAnalyzer.clamp((psf / rating) * 100, 0, 180);
    const concentrationStress = ScopedLabsAnalyzer.clamp((weight / Math.max(areaSqFt * 25, 1)) * 100, 0, 180);
    const safetyMarginStress = ScopedLabsAnalyzer.clamp(100 - remainingMarginPct, 0, 180);

    const metrics = [
      {
        label: "Load Pressure",
        value: loadPressure,
        displayValue: `${Math.round(loadPressure)}%`
      },
      {
        label: "Concentration Stress",
        value: concentrationStress,
        displayValue: `${Math.round(concentrationStress)}%`
      },
      {
        label: "Safety Margin Stress",
        value: safetyMarginStress,
        displayValue: `${Math.round(safetyMarginStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (loadPressure * 0.55) +
      (concentrationStress * 0.25) +
      (safetyMarginStress * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let statusText = "Within Limit";
    if (psf > rating * 0.8) statusText = "High Load";
    if (psf > rating) statusText = "Exceeds Rating";

    let dominantConstraint = "Balanced structural profile";
    if (analyzer.dominant.label === "Load Pressure") {
      dominantConstraint = "Floor rating envelope";
    } else if (analyzer.dominant.label === "Concentration Stress") {
      dominantConstraint = "Point-load concentration";
    } else if (analyzer.dominant.label === "Safety Margin Stress") {
      dominantConstraint = "Remaining structural margin";
    }

    let loadClass = "Comfortable structural load";
    if (psf > rating) loadClass = "Overloaded footprint";
    else if (psf > rating * 0.9) loadClass = "Critical structural load";
    else if (psf > rating * 0.75) loadClass = "Elevated structural load";

    let crossCheck = "Load appears structurally manageable across the modeled footprint";
    if (upstream && typeof upstream.status === "string" && upstream.status.includes("High")) {
      crossCheck = "The upstream rack loading is already elevated, so concentrated floor loading deserves closer structural review";
    } else if (areaSqFt < 6) {
      crossCheck = "A compact footprint can amplify floor pressure faster than total rack weight suggests";
    } else if (remainingMarginPct < 15) {
      crossCheck = "Structural reserve is now tight enough that installation tolerances and real load distribution begin to matter materially";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The rack footprint is crowding its usable structural envelope. Floor rating, concentrated loading, or low remaining margin will become the first deployment limiter before the room is considered safely usable.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The structural profile is workable, but reserve is tightening. The installation may still pass, although concentrated loading and low remaining margin will consume safety headroom faster than the raw psf number suggests.";
    } else {
      interpretation =
        "The floor loading remains inside a manageable structural envelope. Rack weight, footprint area, and remaining margin still leave usable reserve before floor rating becomes the first deployment risk.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current footprint plan, but verify final installed weight once equipment is fully populated. The next pressure increase will usually appear in margin-to-rating before it appears in the nominal rack weight alone.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate actual rack population, equipment distribution, and any raised-floor or slab assumptions before locking the placement. Watch what tightens first: margin-to-rating, point-load concentration, or local structural constraints.";
    } else {
      guidance =
        `Rework the placement plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just total rack weight. Increase footprint area, reduce rack loading, or move to a structurally stronger location before deployment.`;
    }

    const summaryRows = [
      { label: "Footprint Area", value: `${areaSqFt.toFixed(2)} sq ft` },
      { label: "Calculated Load", value: `${psf.toFixed(1)} psf` },
      { label: "Floor Rating", value: `${rating.toFixed(1)} psf` },
      { label: "Margin to Rating", value: `${marginPsf.toFixed(1)} psf` },
      { label: "Load Status", value: statusText }
    ];

    const derivedRows = [
      { label: "Remaining Margin", value: `${remainingMarginPct.toFixed(1)} %` },
      { label: "Load Class", value: loadClass },
      { label: "Cross-Check", value: crossCheck }
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
        axisTitle: "Floor Load Risk Magnitude",
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
        psf,
        status: analyzer.status,
        classification: loadClass
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    els.weight.value = 2500;
    els.w.value = 24;
    els.d.value = 42;
    els.rating.value = 150;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["weight", "w", "d", "rating"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/ups-room-sizing/";
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
