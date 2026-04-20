(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "generator-runtime";
  const LANE = "v1";
  const PREVIOUS_STEP = "ups-room-sizing";

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

  let upstream = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };
  let hasResult = false;

  const els = {
    fuel: $("fuel"),
    rate: $("rate"),
    load: $("load"),
    reserve: $("reserve"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    completeWrap: $("complete-wrap"),
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

  function fmtHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0h";
    const days = Math.floor(hours / 24);
    const remHours = Math.floor(hours % 24);
    const mins = Math.round((hours % 1) * 60);

    if (days > 0) return `${days}d ${remHours}h`;
    if (remHours > 0) return `${remHours}h ${mins}m`;
    return `${mins}m`;
  }

  function showComplete() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.completeWrap) els.completeWrap.style.display = "block";
  }

  function hideComplete() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.completeWrap) els.completeWrap.style.display = "none";
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

    if (typeof upstream.finalArea === "number") {
      rows.push(`UPS Area: <strong>${upstream.finalArea.toFixed(0)} sq ft</strong>`);
    }
    if (typeof upstream.density === "string") {
      rows.push(`Layout Density: <strong>${upstream.density}</strong>`);
    }
    if (typeof upstream.status === "string") {
      rows.push(`Previous Status: <strong>${upstream.status}</strong>`);
    }

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
      This final step checks whether backup power endurance is actually aligned with the physical infrastructure already modeled, or whether outage duration becomes the last hidden failure point.
    `;
  }

  function invalidate() {
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

    hideComplete();
    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const fuel = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.fuel.value, 0));
    const rate = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.rate.value, 0.1));
    const load = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.load.value, 0.1));
    const reserve = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.reserve.value, 10), 0, 80);

    const usable = fuel * (1 - reserve / 100);
    const effRate = rate * load;
    const hours = usable / effRate;
    const runtimeDays = hours / 24;

    const runtimePressure = ScopedLabsAnalyzer.clamp((12 / Math.max(hours, 0.01)) * 100, 0, 180);
    const reserveStress = ScopedLabsAnalyzer.clamp((reserve / 25) * 100, 0, 180);
    const burnPressure = ScopedLabsAnalyzer.clamp((effRate / Math.max(rate, 0.001)) * 100, 0, 180);

    const metrics = [
      {
        label: "Runtime Pressure",
        value: runtimePressure,
        displayValue: `${Math.round(runtimePressure)}%`
      },
      {
        label: "Reserve Stress",
        value: reserveStress,
        displayValue: `${Math.round(reserveStress)}%`
      },
      {
        label: "Burn Pressure",
        value: burnPressure,
        displayValue: `${Math.round(burnPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (runtimePressure * 0.55) +
      (reserveStress * 0.20) +
      (burnPressure * 0.25)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let tier = "Standard Backup";
    if (hours < 8) tier = "Short Duration";
    if (hours > 24) tier = "Extended Runtime";
    if (hours > 72) tier = "Long-Haul Runtime";

    let dominantConstraint = "Balanced runtime profile";
    if (analyzer.dominant.label === "Runtime Pressure") {
      dominantConstraint = "Available outage endurance";
    } else if (analyzer.dominant.label === "Reserve Stress") {
      dominantConstraint = "Fuel reserve policy";
    } else if (analyzer.dominant.label === "Burn Pressure") {
      dominantConstraint = "Load-driven fuel burn";
    }

    let crossCheck = "Runtime appears aligned with a manageable outage profile";
    if (upstream && typeof upstream.status === "string" && upstream.status === "RISK") {
      crossCheck = "Earlier infrastructure steps were already under pressure, so runtime resilience may not be the only operational limiter";
    } else if (hours < 8) {
      crossCheck = "This runtime is likely too short for sustained outage resilience without rapid refueling";
    } else if (hours > 24) {
      crossCheck = "Extended runtime materially improves survivability, but refueling logistics and maintenance cycles still matter";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "Generator endurance is too tight for a resilient backup profile. Outage duration, fuel reserve policy, or burn rate under load will become the first failure point before the site can ride through a meaningful disruption.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The runtime profile is workable, but reserve is tightening. The generator may still support a moderate outage, although sustained loading or delayed refueling will consume resilience margin faster than the raw runtime suggests.";
    } else {
      interpretation =
        "Generator runtime remains inside a manageable outage envelope. Fuel capacity, burn rate, and reserve policy still leave useful endurance before backup power becomes the first resilience constraint.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current fuel and reserve plan, but validate real consumption under actual site load. The next pressure increase will usually appear in outage duration coverage before it appears in nominal fuel capacity alone.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate refueling assumptions, outage duration expectations, and actual loaded burn rate before locking the resilience plan. Watch what tightens first: reserve policy, loaded burn, or runtime-to-refuel gap.";
    } else {
      guidance =
        `Rework the backup power plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just total fuel volume. Increase storage, reduce supported load, or improve refueling and endurance strategy before relying on this runtime profile.`;
    }

    const summaryRows = [
      { label: "Usable Fuel", value: `${usable.toFixed(1)} gal` },
      { label: "Effective Burn Rate", value: `${effRate.toFixed(2)} gal/hr` },
      { label: "Runtime", value: fmtHours(hours) },
      { label: "Runtime Days", value: `${runtimeDays.toFixed(2)} d` },
      { label: "Resilience Tier", value: tier }
    ];

    const derivedRows = [
      { label: "Fuel Reserve", value: `${reserve.toFixed(1)} %` },
      { label: "Load Factor", value: `${load.toFixed(2)}` },
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
        axisTitle: "Generator Runtime Risk Magnitude",
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
        hours,
        tier,
        status: analyzer.status,
        usable,
        effRate
      }
    });

    showComplete();
    hasResult = true;
  }

  function reset() {
    els.fuel.value = 100;
    els.rate.value = 4.0;
    els.load.value = "0.75";
    els.reserve.value = 10;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["fuel", "rate", "load", "reserve"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    refreshFlowNote();
    hideComplete();
    invalidate();
  });
})();