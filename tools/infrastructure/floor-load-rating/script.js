const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "floor-load-rating";
const CATEGORY = "infrastructure";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "floor-load-rating";

  let cachedFlow = null;
  let upstream = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };
  let hasResult = false;

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
    reset: $("reset")
  };

  function refreshFlowNote() {
    cachedFlow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      cachedFlow,
      title: "Infrastructure Context",
      intro:
        "This step checks whether the rack footprint is only passing on paper or still retaining real structural margin once concentrated floor loading is considered.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        upstream = source ? (source.data || {}) : null;

        if (!source || !source.data) return null;

        const d = source.data;
        const rows = [];

        if (typeof d.total === "number") {
          rows.push({ label: "Rack Weight", value: `${d.total.toFixed(0)} lbs` });
        }
        if (typeof d.status === "string") {
          rows.push({ label: "Previous Status", value: d.status });
        }

        return rows.length ? rows : null;
      })()
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const weight = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.weight.value, 0));
    const w = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.w.value, 0.1));
    const d = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.d.value, 0.1));
    const rating = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.rating.value, 1));

    const areaSqFt = (w / 12) * (d / 12);
    const psf = weight / areaSqFt;
    const marginPsf = Math.max(0, rating - psf);
    const marginPct = Math.max(0, ((rating - psf) / rating) * 100);

    const loadPressure = ScopedLabsAnalyzer.clamp((psf / rating) * 100, 0, 180);
    const concentrationStress = ScopedLabsAnalyzer.clamp((weight / Math.max(areaSqFt * 25, 1)) * 100, 0, 180);
    const safetyMarginStress = ScopedLabsAnalyzer.clamp(100 - marginPct, 0, 180);

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
    } else if (marginPct < 15) {
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
      { label: "Remaining Margin", value: `${marginPct.toFixed(1)} %` },
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "infrastructure",
      step: "floor-load-rating",
      data: {
        psf,
        status: analyzer.status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
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

  refreshFlowNote();
  invalidate();
})();


function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


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
