(() => {
  "use strict";

  const CATEGORY = "infrastructure";
  const STEP = "equipment-spacing";
  const LANE = "v1";
  const PREVIOUS_STEP = "rack-ru-planner";

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
    rows: $("rows"),
    racksPer: $("racksPer"),
    rackW: $("rackW"),
    rackD: $("rackD"),
    cold: $("cold"),
    hot: $("hot"),
    end: $("end"),
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
    if (typeof upstreamContext.status === "string") rows.push(`RU Status: <strong>${upstreamContext.status}</strong>`);
    if (typeof upstreamContext.fillClass === "string") rows.push(`Rack Fill: <strong>${upstreamContext.fillClass}</strong>`);
    if (typeof upstreamContext.growthHeadroom === "number") rows.push(`Growth Headroom: <strong>${Number(upstreamContext.growthHeadroom).toFixed(1)}%</strong>`);
    if (typeof upstreamContext.recommendedRu === "number") rows.push(`Recommended RU: <strong>${upstreamContext.recommendedRu}</strong>`);

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
      This step checks whether the room still preserves workable aisle widths, service access, and future flexibility after rack capacity has already been defined.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
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
    const rows = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.rows.value, 1)));
    const racksPer = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.racksPer.value, 1)));
    const rackW = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.rackW.value, 1));
    const rackD = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.rackD.value, 1));
    const cold = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.cold.value, 0));
    const hot = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.hot.value, 0));
    const end = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.end.value, 0));

    const lengthIn = racksPer * rackW + 2 * end;

    let widthIn = 0;
    for (let i = 0; i < rows; i++) {
      widthIn += rackD;
      if (i < rows - 1) {
        widthIn += (i % 2 === 0) ? cold : hot;
      }
    }

    const lengthFt = lengthIn / 12;
    const widthFt = widthIn / 12;
    const areaSqFt = lengthFt * widthFt;

    const coldAisleFt = cold / 12;
    const hotAisleFt = hot / 12;
    const endClearFt = end / 12;
    const rackFootprintSqFt = (rows * racksPer * rackW * rackD) / 144;
    const layoutEfficiency = areaSqFt > 0 ? (rackFootprintSqFt / areaSqFt) * 100 : 0;

    const serviceMargin = Math.min(coldAisleFt, hotAisleFt, endClearFt);
    const growthPadding = Math.max(0, (areaSqFt - rackFootprintSqFt) / Math.max(areaSqFt, 1) * 100);

    const servicePressure = ScopedLabsAnalyzer.clamp((4 / Math.max(serviceMargin, 0.1)) * 45, 0, 180);
    const densityPressure = ScopedLabsAnalyzer.clamp(layoutEfficiency * 1.4, 0, 180);
    const growthPressure = ScopedLabsAnalyzer.clamp((35 - growthPadding) * 4, 0, 180);

    const metrics = [
      {
        label: "Service Pressure",
        value: servicePressure,
        displayValue: `${Math.round(servicePressure)}%`
      },
      {
        label: "Density Pressure",
        value: densityPressure,
        displayValue: `${Math.round(densityPressure)}%`
      },
      {
        label: "Growth Pressure",
        value: growthPressure,
        displayValue: `${Math.round(growthPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (servicePressure * 0.45) +
      (densityPressure * 0.30) +
      (growthPressure * 0.25)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let layout = "Balanced";
    if (serviceMargin < 3 || widthFt < 10) layout = "Tight";
    else if (growthPadding > 35 && widthFt > 20) layout = "Spacious";

    let dominantConstraint = "Balanced equipment layout";
    if (analyzer.dominant.label === "Service Pressure") {
      dominantConstraint = "Aisle and service clearance";
    } else if (analyzer.dominant.label === "Density Pressure") {
      dominantConstraint = "Layout density";
    } else if (analyzer.dominant.label === "Growth Pressure") {
      dominantConstraint = "Future expansion padding";
    }

    let crossCheck = "The room layout appears reasonably aligned with the upstream rack plan";
    if (upstreamContext && typeof upstreamContext.status === "string" && upstreamContext.status === "RISK" && analyzer.status !== "RISK") {
      crossCheck = "Rack density may already be tight enough that RU planning still constrains the overall layout";
    } else if (serviceMargin < 3) {
      crossCheck = "The layout fits dimensionally, but service margin is already being squeezed";
    } else if (growthPadding < 20) {
      crossCheck = "The room layout may work today, but future adds will consume flexibility quickly";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The layout is crowding usable deployment margin. Even if racks fit dimensionally, serviceability and future adjustment space are becoming the real constraint.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The layout fits, but aisle margin or expansion room is tightening. Service access and airflow flexibility will become harder as density increases.";
    } else {
      interpretation =
        "The layout is within a workable deployment standard. Aisles, service margin, and layout growth still appear balanced enough for normal operation and maintenance.";
    }

    let guidance = "Maintain this layout, but preserve future rack growth and access planning in the room design.";
    if (analyzer.status === "WATCH") {
      guidance =
        "Validate technician access, door swing, and cable/service approach before locking this room plan. Watch what tightens first: aisle usability, end clearance, or growth room.";
    }
    if (analyzer.status === "RISK") {
      guidance =
        `Rework the room plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not raw floor area. Increase aisle or end clearance, reduce row density, or enlarge the room before finalizing deployment.`;
    }

    const summaryRows = [
      { label: "Room Length", value: `${lengthFt.toFixed(1)} ft` },
      { label: "Room Width", value: `${widthFt.toFixed(1)} ft` },
      { label: "Floor Area", value: `${areaSqFt.toFixed(0)} sq ft` },
      { label: "Layout Density", value: layout },
      { label: "Status", value: analyzer.status }
    ];

    const derivedRows = [
      { label: "Rack Footprint", value: `${rackFootprintSqFt.toFixed(0)} sq ft` },
      { label: "Layout Efficiency", value: `${layoutEfficiency.toFixed(1)} %` },
      { label: "Service Margin", value: `${serviceMargin.toFixed(1)} ft` },
      { label: "Growth Padding", value: `${growthPadding.toFixed(1)} %` },
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
        axisTitle: "Layout Stress Magnitude",
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
        lengthFt,
        widthFt,
        areaSqFt,
        layout,
        status: analyzer.status,
        clearanceClass: layout,
        crossCheck
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    els.rows.value = 2;
    els.racksPer.value = 6;
    els.rackW.value = 24;
    els.rackD.value = 42;
    els.cold.value = 48;
    els.hot.value = 48;
    els.end.value = 36;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["rows", "racksPer", "rackW", "rackD", "cold", "hot", "end"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/rack-weight-load/";
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
