const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "room-square-footage";
const CATEGORY = "infrastructure";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "room-square-footage";

  let cachedFlow = null;
  let hasResult = false;

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
        "This first step checks whether the room plan is only barely fitting the equipment footprint or still leaving realistic service, aisle, and growth margin before detailed layout begins."
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Enter values and press Calculate."
    });

    hasResult = false;
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

    let status = "HEALTHY";
    if (factor < 1.5 || growth < 10 || equipmentDensity > 70) {
      status = "RISK";
    } else if (factor < 1.8 || growth < 20 || equipmentDensity > 55) {
      status = "WATCH";
    }

    let density = "Balanced";
    if (factor < 1.6 || equipmentDensity > 65) density = "Tight";
    else if (factor > 2.6 && growth >= 25) density = "Conservative";

    let dominantConstraint = "Balanced room sizing";
    if (factor < 1.6) {
      dominantConstraint = "Clearance / aisle allowance";
    } else if (growth < 15) {
      dominantConstraint = "Future growth reserve";
    } else if (equipmentDensity > 60) {
      dominantConstraint = "Equipment density concentration";
    }

    let interpretation = "";
    if (status === "RISK") {
      interpretation =
        "The room plan is crowding usable deployment margin too tightly. Even if the footprint fits numerically, aisle flexibility, service access, or future growth will become the first practical limitation.";
    } else if (status === "WATCH") {
      interpretation =
        "The room plan is workable, but margin is tightening. The current estimate may support the initial build, although service clearances and growth reserve are being consumed faster than the raw square-foot total suggests.";
    } else {
      interpretation =
        "The room plan remains inside a manageable planning envelope. Equipment footprint, clearance allowance, and reserve still leave useful room before space becomes the first infrastructure limiter.";
    }

    let guidance = "";
    if (status === "HEALTHY") {
      guidance =
        "Maintain this planning baseline, but keep final aisle, service, and growth assumptions explicit as the layout evolves. The next pressure increase will usually appear in reserve consumption before total square footage looks obviously small.";
    } else if (status === "WATCH") {
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
      summaryRows,
      derivedRows,
      status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: null
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "infrastructure",
      step: "room-square-footage",
      data: {
        equip,
        factor,
        growth,
        base,
        total,
        density,
        status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
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
