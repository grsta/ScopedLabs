const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "channel-overlap";
  const NEXT_URL = "/tools/wireless/noise-floor-margin/";

  const $ = (id) => document.getElementById(id);

  const els = {
    band: $("band"),
    width: $("width"),
    aps: $("aps"),
    ch: $("ch"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  function safeNumber(value, fallback = 0) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }
    return Math.min(max, Math.max(min, value));
  }

  function hideContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.hideContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
      return;
    }
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.showContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function clearStoredResult() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function clearAnalysisBlock() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      return;
    }
    if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function clearChart() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearChart === "function"
    ) {
      window.ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
      return;
    }

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    }

    if (chartWrapRef.current && chartWrapRef.current.parentNode) {
      chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
      chartWrapRef.current = null;
    }
  }

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
    clearChart();
  }

  function invalidate() {
    clearStoredResult();
    hideContinue();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        continueWrapEl: els.continueWrap,
        continueBtnEl: els.continueBtn,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    clearChart();
  }

  function bandLabel(value) {
    if (value === "24") return "2.4 GHz";
    if (value === "5") return "5 GHz";
    if (value === "6") return "6 GHz";
    return value;
  }

  function suggestedChannels(band, width) {
    if (band === "24") {
      if (width === "20") return 3;
      return 1;
    }

    if (band === "5") {
      if (width === "20") return 9;
      if (width === "40") return 4;
      if (width === "80") return 2;
      return 1;
    }

    if (width === "20") return 24;
    if (width === "40") return 12;
    if (width === "80") return 6;
    return 3;
  }

  function classifyReuse(reuse) {
    if (reuse <= 1.5) return "Low reuse pressure";
    if (reuse <= 2.25) return "Moderate reuse pressure";
    if (reuse <= 3.0) return "High reuse pressure";
    return "Severe reuse pressure";
  }

  function classifyChannelPlan(provided, suggested) {
    if (provided >= suggested) return "Channel pool aligned";
    if (provided >= Math.max(1, suggested * 0.7)) return "Channel pool constrained";
    return "Channel pool undersized";
  }

  function buildInterpretation({ band, width, aps, ch, reuse, reuseClass, planClass, priorRadiusFt }) {
    const bandText =
      band === "24"
        ? "2.4 GHz has very limited clean channel reuse, so overlap problems appear quickly as AP count rises."
        : band === "5"
          ? "5 GHz usually offers the most practical enterprise compromise between reuse flexibility and client compatibility."
          : "6 GHz gives the cleanest reuse potential, but that advantage only holds if client support and channel-width choices stay realistic.";

    const widthText =
      width === "20"
        ? "A 20 MHz plan gives you the best chance of preserving channel count and containing co-channel contention."
        : width === "40"
          ? "At 40 MHz, capacity can improve in the right conditions, but channel availability drops enough that reuse pressure climbs sooner."
          : width === "80"
            ? "At 80 MHz, you are trading channel reuse for per-cell throughput, so overlap risk rises fast in denser deployments."
            : "At 160 MHz, channel reuse collapses quickly outside very specialized designs, so broad multi-AP layouts usually struggle.";

    const countText =
      aps <= ch
        ? "Your AP count is still within the available channel pool, which is a healthy starting point for reuse."
        : `With ${aps.toFixed(0)} APs sharing ${ch.toFixed(0)} channels, multiple cells will inevitably contend on the same channel.`;

    const radiusText =
      Number.isFinite(priorRadiusFt)
        ? `The prior coverage step estimated about ${priorRadiusFt.toFixed(1)} ft of cell radius, so larger cells will make this reuse pressure more visible in the field if power and placement are not tightened.`
        : "Without a validated coverage radius, reuse pressure should be treated as a planning estimate only.";

    const classText =
      reuse <= 1.5
        ? "This layout is in a reasonable planning zone for channel reuse."
        : reuse <= 2.25
          ? "This layout is workable, but AP placement and power tuning will matter more."
          : reuse <= 3.0
            ? "This layout is entering a contention-heavy zone where client airtime efficiency can degrade."
            : "This layout is likely to suffer meaningful co-channel contention unless channel width, power, or AP layout is tightened.";

    return `${bandText} ${widthText} ${countText} ${radiusText} ${planClass}. ${reuseClass}. ${classText}`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this channel plan forward into the noise-floor step, but keep AP power and cell size disciplined so the reuse model stays true in the field.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Reuse pressure") {
        return `Reduce AP overlap, tighten cell edges, or increase available channel count where possible. Reuse is already becoming influential enough to affect airtime quality.`;
      }

      if (dominantConstraint === "Channel scarcity") {
        return `Protect channel count before increasing AP density further. Width choice or band choice is compressing the channel pool enough that contention risk will rise quickly.`;
      }

      return `Use more conservative width planning or stronger spatial separation before treating the layout as comfortable. The design is workable, but it is beginning to depend on tighter RF discipline.`;
    }

    if (dominantConstraint === "Reuse pressure") {
      return `Rework AP density or cell overlap before continuing. The present reuse level is too aggressive to assume stable performance without careful tuning.`;
    }

    if (dominantConstraint === "Channel scarcity") {
      return `Increase usable channel count or reduce width before deployment. The channel plan is too constrained to support this density comfortably.`;
    }

    return `Treat this layout as a high-contention design until channel width, reuse, or AP spacing are improved.`;
  }

  function loadPriorContext() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";

    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (err) {
      saved = null;
    }

    if (!saved || saved.category !== CATEGORY || saved.step !== "coverage-radius") return;

    const data = saved.data || {};
    const band = data.bandLabel || data.band || "Unknown";
    const environment = data.environmentLabel || data.environment || "Unknown";
    const radiusFt = Number(data.estimatedRadiusFt);
    const areaSqFt = Number(data.estimatedCellAreaSqFt);

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderFlowNote === "function"
    ) {
      window.ScopedLabsAnalyzer.renderFlowNote({
        flowEl: els.flowNote,
        category: CATEGORY,
        step: STEP,
        title: "System Context",
        intro:
          "Coverage Radius estimated the likely cell footprint. Use this step to check whether that coverage plan is likely to create unhealthy channel reuse.",
        customRows: [
          {
            label: "Band",
            value: band
          },
          {
            label: "Environment",
            value: environment
          },
          {
            label: "Estimated radius",
            value: Number.isFinite(radiusFt) ? `${radiusFt.toFixed(1)} ft` : "—"
          },
          {
            label: "Estimated cell area",
            value: Number.isFinite(areaSqFt) ? `${areaSqFt.toFixed(0)} sq ft` : "—"
          }
        ]
      });
      return;
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Coverage Radius estimated <strong>${Number.isFinite(radiusFt) ? radiusFt.toFixed(1) : "—"} ft</strong> radius
      and <strong>${Number.isFinite(areaSqFt) ? areaSqFt.toFixed(0) : "—"} sq ft</strong> cell area
      for <strong>${band}</strong> in <strong>${environment}</strong>.
      Use this step to check whether that coverage plan is likely to create unhealthy channel reuse.
    `;
    els.flowNote.style.display = "";
  }

  function autoDefaults() {
    const suggested = suggestedChannels(els.band.value, els.width.value);
    els.ch.value = String(suggested);
  }

  function calculate() {
    const band = els.band.value;
    const width = els.width.value;
    const aps = clamp(safeNumber(els.aps.value, NaN), 1, 100000);
    const ch = clamp(safeNumber(els.ch.value, NaN), 1, 100000);

    if (!Number.isFinite(aps) || !Number.isFinite(ch)) {
      els.results.innerHTML = `<div class="muted">Enter valid numeric values and press Calculate.</div>`;
      clearAnalysisBlock();
      hideContinue();
      clearStoredResult();
      clearChart();
      return;
    }

    let priorRadiusFt = NaN;
    let priorAreaSqFt = NaN;

    try {
      const prior = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (prior && prior.category === CATEGORY && prior.step === "coverage-radius" && prior.data) {
        priorRadiusFt = Number(prior.data.estimatedRadiusFt);
        priorAreaSqFt = Number(prior.data.estimatedCellAreaSqFt);
      }
    } catch (err) {
      priorRadiusFt = NaN;
      priorAreaSqFt = NaN;
    }

    const suggested = suggestedChannels(band, width);
    const reuse = aps / ch;
    const reuseClass = classifyReuse(reuse);
    const planClass = classifyChannelPlan(ch, suggested);
    const overlapRiskPct = Math.min(100, Math.max(0, ((reuse - 1) / 3) * 100));

    const reusePressure = reuse / 1.5;
    const channelScarcityPressure = suggested / ch;
    const widthPressure =
      width === "20" ? 0.8 :
      width === "40" ? 1.1 :
      width === "80" ? 1.6 :
      2.2;

    const metrics = [
      {
        label: "Reuse pressure",
        value: reusePressure,
        displayValue: `${reuse.toFixed(2)}`
      },
      {
        label: "Channel scarcity",
        value: channelScarcityPressure,
        displayValue: `${ch.toFixed(0)} / ${suggested}`
      },
      {
        label: "Width pressure",
        value: widthPressure,
        displayValue: `${width} MHz`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Reuse pressure";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });
      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Reuse pressure";
    }

    const dominantConstraintMap = {
      "Reuse pressure": "Reuse pressure",
      "Channel scarcity": "Channel scarcity",
      "Width pressure": "Width pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Reuse pressure";

    const interpretation = buildInterpretation({
      band,
      width,
      aps,
      ch,
      reuse,
      reuseClass,
      planClass,
      priorRadiusFt
    });

    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Band / Width", value: `${bandLabel(band)} / ${width} MHz` },
      { label: "AP Count", value: `${aps.toFixed(0)}` },
      { label: "Channels Provided", value: `${ch.toFixed(0)}` },
      { label: "Suggested Channels (Typical)", value: `${suggested}` }
    ];

    const derivedRows = [
      { label: "Average Reuse (APs per Channel)", value: `${reuse.toFixed(2)}` },
      { label: "Status", value: reuseClass },
      { label: "Channel Plan", value: planClass },
      { label: "Overlap Risk", value: `${overlapRiskPct.toFixed(0)}%` }
    ];

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderOutput === "function"
    ) {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance
      });
    } else {
      const fallbackRows = summaryRows.concat(derivedRows, [
        { label: "Engineering Interpretation", value: interpretation },
        { label: "Actionable Guidance", value: guidance }
      ]);

      els.results.innerHTML = fallbackRows.map((row) => `
        <div class="result-row">
          <div class="result-label">${row.label}</div>
          <div class="result-value">${row.value}</div>
        </div>
      `).join("");
    }

    clearChart();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderAnalyzerChart === "function"
    ) {
      window.ScopedLabsAnalyzer.renderAnalyzerChart({
        mountEl: els.results,
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        labels: ["Reuse Pressure", "Channel Scarcity", "Width Pressure"],
        values: [reusePressure, channelScarcityPressure, widthPressure],
        displayValues: [
          `${reuse.toFixed(2)}`,
          `${ch.toFixed(0)} / ${suggested}`,
          `${width} MHz`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Overlap Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(reusePressure, channelScarcityPressure, widthPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    const payload = {
      category: CATEGORY,
      step: STEP,
      data: {
        band,
        bandLabel: bandLabel(band),
        channelWidthMhz: Number(width),
        apCount: Number(aps.toFixed(0)),
        availableChannels: Number(ch.toFixed(0)),
        suggestedChannels: suggested,
        averageReuse: Number(reuse.toFixed(2)),
        reuseClass,
        channelPlanClass: planClass,
        overlapRiskPct: Number(overlapRiskPct.toFixed(0)),
        priorRadiusFt: Number.isFinite(priorRadiusFt) ? Number(priorRadiusFt.toFixed(1)) : null,
        priorCellAreaSqFt: Number.isFinite(priorAreaSqFt) ? Number(priorAreaSqFt.toFixed(0)) : null,
        status,
        dominantConstraint
      }
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showContinue();
  }

  function resetForm() {
    els.band.value = "5";
    els.width.value = "20";
    els.aps.value = "8";
    els.ch.value = "4";
    clearStoredResult();
    hideContinue();
    renderEmpty();
    loadPriorContext();
  }

  function bindInvalidation() {
    [els.band, els.width, els.aps, els.ch].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.band.addEventListener("change", autoDefaults);
    els.width.addEventListener("change", autoDefaults);
  }

  function bindActions() {
    els.calc.addEventListener("click", calculate);
    els.reset.addEventListener("click", resetForm);
    els.continueBtn.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    hideContinue();
    renderEmpty();
    loadPriorContext();
    bindInvalidation();
    bindActions();
  }

  init();
})();

function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


function calc() {
  // TODO: implement calculate handler
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


function writeFlow(data) {
  ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
    category: CATEGORY,
    step: STEP,
    data
  });
}
