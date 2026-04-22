(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "heat-load-estimator";
  const NEXT_URL = "/tools/thermal/psu-efficiency-heat/";
  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const W_TO_BTU = 3.412141633;

  const FLOW_KEYS = {
    "heat-load-estimator": "scopedlabs:pipeline:thermal:heat-load-estimator",
    "psu-efficiency-heat": "scopedlabs:pipeline:thermal:psu-efficiency-heat",
    "btu-converter": "scopedlabs:pipeline:thermal:btu-converter",
    "rack-thermal-density": "scopedlabs:pipeline:thermal:rack-thermal-density",
    "airflow-requirement": "scopedlabs:pipeline:thermal:airflow-requirement",
    "fan-cfm-sizing": "scopedlabs:pipeline:thermal:fan-cfm-sizing",
    "hot-cold-aisle": "scopedlabs:pipeline:thermal:hot-cold-aisle",
    "ambient-rise": "scopedlabs:pipeline:thermal:ambient-rise",
    "exhaust-temperature": "scopedlabs:pipeline:thermal:exhaust-temperature",
    "room-cooling-capacity": "scopedlabs:pipeline:thermal:room-cooling-capacity"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    w: $("w"),
    qty: $("qty"),
    util: $("util"),
    m: $("m"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function safeNumber(value, fallback = 0) {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.safeNumber === "function") {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clamp === "function") {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }
    return Math.min(max, Math.max(min, value));
  }

  function clearStored() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
    } catch {}
    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === STEP) {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function renderFlowNote() {
    if (!els.flowNote) return;
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function buildInterpretation(status, dominantConstraint, withMargin, qty, utilPct) {
    if (status === "HEALTHY") {
      return `The projected working heat load is still in a manageable range. This gives you a solid starting point for downstream airflow and cooling checks without indicating a heavy thermal burden yet.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Aggregate equipment load") {
        return `Total equipment load is starting to become a real thermal design input rather than a background assumption. At this level, airflow planning and rack concentration begin to matter more.`;
      }

      if (dominantConstraint === "Utilization-driven heat") {
        return `The effective heat load is being driven more by sustained utilization than by raw nameplate alone. That means real operating behavior now matters almost as much as hardware count.`;
      }

      return `Safety margin is pushing the working thermal estimate higher, which is appropriate for planning, but it also means downstream cooling assumptions need to be checked against the same conservative basis.`;
    }

    if (dominantConstraint === "Aggregate equipment load") {
      return `The total projected heat load is high enough that thermal design becomes a primary concern from the very first step. Any downstream airflow or cooling assumption that undershoots this load will quickly become unrealistic.`;
    }

    if (dominantConstraint === "Utilization-driven heat") {
      return `Sustained operating load is driving a high thermal output. That raises risk because the system is likely to run warm under normal conditions instead of only during rare peaks.`;
    }

    return `The planning margin itself is contributing to a high working heat estimate. That is not wrong, but it means every downstream thermal choice must be able to absorb a deliberately conservative load basis without losing stability.`;
  }

  function buildGuidance(status, dominantConstraint, withMargin, btu) {
    if (status === "HEALTHY") {
      return `Carry this value forward as the thermal baseline, then validate how that load behaves through PSU loss, airflow, and cooling steps instead of relying on nameplate estimates alone.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Aggregate equipment load") {
        return `Start treating rack layout, airflow delivery, and cooling capacity as linked design constraints. The thermal load is large enough that rough assumptions become less safe from this point onward.`;
      }

      if (dominantConstraint === "Utilization-driven heat") {
        return `Verify that your utilization assumption reflects real duty cycle. A realistic operating-load estimate is more valuable here than a perfectly conservative nameplate-only estimate.`;
      }

      return `Keep the safety margin, but make sure every downstream step uses the same basis. Mixed assumptions between planning steps will create false confidence later in the pipeline.`;
    }

    if (withMargin >= 10000) {
      return `Treat this as a high-load thermal design from the outset. Validate airflow path, density, and cooling support carefully before accepting later results at face value.`;
    }

    return `Recheck the equipment, utilization, and safety assumptions before proceeding. A high starting heat-load estimate will amplify every downstream thermal decision, so the basis needs to be intentional and consistent.`;
  }

  function invalidate() {
    clearStored();

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.invalidate === "function") {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    hideContinue();
    renderFlowNote();
  }

  function calculate() {
    const wRaw = safeNumber(els.w.value, NaN);
    const qtyRaw = safeNumber(els.qty.value, NaN);
    const utilPctRaw = safeNumber(els.util.value, NaN);
    const marginPctRaw = safeNumber(els.m.value, NaN);

    if (
      !Number.isFinite(wRaw) ||
      !Number.isFinite(qtyRaw) ||
      !Number.isFinite(utilPctRaw) ||
      !Number.isFinite(marginPctRaw) ||
      wRaw <= 0 ||
      qtyRaw <= 0 ||
      utilPctRaw < 0 ||
      marginPctRaw < 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      hideContinue();
      clearStored();

      if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
        window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      }
      return;
    }

    const w = clamp(wRaw, 0.1, 1000000);
    const qty = clamp(qtyRaw, 1, 1000000);
    const utilPct = clamp(utilPctRaw, 0, 100);
    const marginPct = clamp(marginPctRaw, 0, 500);

    const util = utilPct / 100;
    const margin = marginPct / 100;

    const raw = w * qty;
    const avg = raw * util;
    const withMargin = avg * (1 + margin);
    const btu = withMargin * W_TO_BTU;

    const metrics = [
      {
        label: "Aggregate Equipment Load",
        value: withMargin / 5000,
        displayValue: `${(withMargin / 5000).toFixed(2)}`
      },
      {
        label: "Utilization-Driven Heat",
        value: utilPct / 70,
        displayValue: `${utilPct.toFixed(0)}%`
      },
      {
        label: "Planning Margin Pressure",
        value: marginPct / 25,
        displayValue: `${marginPct.toFixed(0)}%`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Aggregate Equipment Load";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.8
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Aggregate Equipment Load";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 1.8) status = "RISK";
      else if (Number(dominant.value) > 1.0) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Aggregate Equipment Load": "Aggregate equipment load",
      "Utilization-Driven Heat": "Utilization-driven heat",
      "Planning Margin Pressure": "Planning margin pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Aggregate equipment load";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      withMargin,
      qty,
      utilPct
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      withMargin,
      btu
    );

    const summaryRows = [
      { label: "Device Power", value: `${w.toFixed(0)} W each` },
      { label: "Quantity", value: `${qty.toFixed(0)}` },
      { label: "Utilization", value: `${utilPct.toFixed(0)}%` },
      { label: "Safety Margin", value: `${marginPct.toFixed(0)}%` }
    ];

    const derivedRows = [
      { label: "Nameplate Total", value: `${raw.toFixed(0)} W` },
      { label: "Avg @ Utilization", value: `${avg.toFixed(0)} W` },
      { label: "With Safety Margin", value: `${withMargin.toFixed(0)} W` },
      { label: "Heat Load", value: `${btu.toFixed(0)} BTU/hr` }
    ];

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.renderOutput === "function") {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance,
        existingChartRef: null,
        existingWrapRef: null,
        chart: {
          labels: [
            "Aggregate Load",
            "Utilization Heat",
            "Planning Margin"
          ],
          values: [
            Number((withMargin / 5000).toFixed(2)),
            Number((utilPct / 70).toFixed(2)),
            Number((marginPct / 25).toFixed(2))
          ],
          displayValues: [
            `${withMargin.toFixed(0)} W`,
            `${utilPct.toFixed(0)}%`,
            `${marginPct.toFixed(0)}%`
          ],
          referenceValue: 1.0,
          healthyMax: 1.0,
          watchMax: 1.8,
          axisTitle: "Thermal Load Pressure",
          referenceLabel: "Comfort Band",
          healthyLabel: "Healthy",
          watchLabel: "Watch",
          riskLabel: "Risk",
          chartMax: Math.max(3, Number((withMargin / 5000).toFixed(2)) + 0.5)
        }
      });
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          devicePowerW: Number(w.toFixed(0)),
          quantity: Number(qty.toFixed(0)),
          utilizationPct: Number(utilPct.toFixed(0)),
          safetyMarginPct: Number(marginPct.toFixed(0)),
          nameplateTotalW: Number(raw.toFixed(0)),
          averageLoadW: Number(avg.toFixed(0)),
          heatLoadW: Number(withMargin.toFixed(0)),
          heatLoadBtuHr: Number(btu.toFixed(0)),
          status,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS[STEP], JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showContinue();
  }

  function reset() {
    els.w.value = 350;
    els.qty.value = 10;
    els.util.value = 70;
    els.m.value = 15;
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.w, els.qty, els.util, els.m].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function bind() {
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = NEXT_URL;
      });
    }
  }

  function init() {
    hideContinue();
    renderFlowNote();
    renderEmpty();
    bind();
  }

  init();

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
