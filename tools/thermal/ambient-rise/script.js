(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "ambient-rise";
  const PRIOR_STEP = "hot-cold-aisle";
  const NEXT_URL = "/tools/thermal/exhaust-temperature/";

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
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    w: $("w"),
    cfm: $("cfm"),
    k: $("k"),
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

  function readSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(FLOW_KEYS[PRIOR_STEP]) || "null");
    } catch {
      return null;
    }
  }

  function clearStored() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
    } catch {}
  }

  function hideContinue() {
  if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.hideContinue === "function") {
    window.ScopedLabsAnalyzer.hideContinue(els.continueWrap, null);
    return;
  }
  if (els.continueWrap) els.continueWrap.style.display = "none";
}

  function showContinue() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.showContinue === "function") {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, null);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function clearAnalysisBlock() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function clearChart() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearChart === "function") {
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
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
    clearChart();
  }

  function renderFlowNote() {
    const saved = readSaved();

    if (!els.flowNote) return;

    if (!saved || saved.category !== CATEGORY || saved.step !== PRIOR_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const data = saved.data || {};
    const rows = [];

    if (data.layout) {
      rows.push(`Layout strategy <strong>${data.layout}</strong>`);
    }
    if (data.classification || data.status) {
      rows.push(`Containment quality <strong>${data.classification || data.status}</strong>`);
    }
    if (Number.isFinite(Number(data.recirculationPct))) {
      rows.push(`Recirculation estimate <strong>${Number(data.recirculationPct).toFixed(1)}%</strong>`);
    }

    if (!rows.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      Imported from Hot / Cold Aisle.<br>
      ${rows.join("<br>")}
      <br><br>
      Use this step to estimate how much the local ambient temperature rises once the current airflow absorbs the present thermal load.
    `;
  }

  function buildInterpretation(status, dominantConstraint, dt, cfm, watts) {
    const kw = watts / 1000;

    if (status === "HEALTHY") {
      return `Estimated temperature rise remains controlled for a ${kw.toFixed(1)} kW load at the current airflow level. Ambient uplift is still in a range where downstream exhaust conditions should remain manageable if the airflow path is clean and evenly distributed.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Available airflow margin") {
        return `Airflow is starting to become the limiting factor. The system can still function, but small losses from filters, cable blockage, or poor fan performance can push ambient rise higher than planned.`;
      }

      if (dominantConstraint === "Heat load intensity") {
        return `The heat load is large enough that room or cabinet temperature rise begins to accumulate noticeably. At this point, cooling effectiveness depends more on real airflow delivery than on nameplate assumptions.`;
      }

      return `Ambient rise is entering a range where distribution quality matters more. Even if total airflow looks adequate on paper, uneven intake paths or recirculation can create localized hot zones.`;
    }

    if (dominantConstraint === "Available airflow margin") {
      return `The available airflow is too tight for the current heat load, so ambient temperature rise becomes a direct operational risk. In practice, the first issue is usually not the formula—it is fan performance sag, obstructions, or recirculation reducing real delivered CFM.`;
    }

    if (dominantConstraint === "Temperature rise outcome") {
      return `The projected temperature rise is already high enough to indicate an under-cooled condition. That means downstream exhaust and inlet stability will become hard to control, especially as environmental conditions drift away from ideal.`;
    }

    return `Heat intensity is high relative to available cooling movement. That raises the chance of unstable ambient conditions, uneven rack temperatures, and loss of thermal margin during peak operating periods.`;
  }

  function buildGuidance(status, dominantConstraint, dt) {
    if (status === "HEALTHY") {
      return `Keep some airflow margin in reserve for real-world losses, then validate the next step by checking exhaust temperature behavior. This is a good point to confirm that predicted airflow is actually achievable through the full path.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Available airflow margin") {
        return `Increase airflow margin before locking in the design. Even modest airflow gains can materially reduce ambient rise and improve thermal stability.`;
      }

      if (dominantConstraint === "Heat load intensity") {
        return `Review whether the load can be spread more evenly or staged differently. Reducing concentration often improves temperature behavior faster than simply adding more fan rating.`;
      }

      return `Audit the airflow path for bypass and recirculation. In this range, containment quality often decides whether the real temperature rise matches the model.`;
    }

    if (dt > 35) {
      return `Treat this as an under-cooled scenario. Increase delivered airflow, reduce thermal concentration, or improve containment before moving forward with the current assumptions.`;
    }

    if (dominantConstraint === "Available airflow margin") {
      return `Increase delivered CFM and validate against real static-pressure conditions, not free-air fan ratings. The cooling path is now too tight to rely on nominal airflow assumptions.`;
    }

    return `Lower the effective temperature rise by improving airflow delivery and hot-air separation before proceeding. This design currently has too little thermal margin for stable operation.`;
  }

  function invalidate() {
    clearStored();

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.invalidate === "function") {
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
      hideContinue();
    }

    clearChart();
    renderFlowNote();
  }

  function calculate() {
    const watts = safeNumber(els.w.value, NaN);
    const cfmRaw = safeNumber(els.cfm.value, NaN);
    const k = safeNumber(els.k.value, 1.08);

    if (!Number.isFinite(watts) || watts <= 0 || !Number.isFinite(cfmRaw) || cfmRaw <= 0) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const cfm = clamp(cfmRaw, 1, 1000000);
    const btu = watts * 3.412;
    const dt = btu / (k * cfm);
    const airflowPerKw = cfm / Math.max(0.1, watts / 1000);

    const metrics = [
      {
        label: "Temperature Rise Outcome",
        value: dt,
        displayValue: `${dt.toFixed(1)} °F`
      },
      {
        label: "Available Airflow Margin",
        value: btu / Math.max(1, cfm * 1.08 * 10),
        displayValue: `${(btu / Math.max(1, cfm * 1.08 * 10)).toFixed(2)}`
      },
      {
        label: "Heat Load Intensity",
        value: watts / 4000,
        displayValue: `${(watts / 4000).toFixed(2)}`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Temperature Rise Outcome";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 10,
        watchMax: 20
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Temperature Rise Outcome";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (dt > 20) status = "RISK";
      else if (dt > 10) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Temperature Rise Outcome": "Temperature rise outcome",
      "Available Airflow Margin": "Available airflow margin",
      "Heat Load Intensity": "Heat load intensity"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Temperature rise outcome";

    const interpretation = buildInterpretation(status, dominantConstraint, dt, cfm, watts);
    const guidance = buildGuidance(status, dominantConstraint, dt);

    const summaryRows = [
      { label: "Heat Load", value: `${watts.toFixed(0)} W` },
      { label: "Heat Load", value: `${btu.toFixed(0)} BTU/hr` },
      { label: "Available Airflow", value: `${cfm.toFixed(0)} CFM` },
      { label: "Air Density Factor", value: `${k.toFixed(2)}` }
    ];

    const derivedRows = [
      { label: "Estimated ΔT", value: `${dt.toFixed(1)} °F` },
      { label: "Airflow Intensity", value: `${airflowPerKw.toFixed(0)} CFM/kW` }
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
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        chart: {
          labels: [
            "Temperature Rise",
            "Airflow Margin",
            "Heat Intensity"
          ],
          values: [
            dt,
            btu / Math.max(1, cfm * 1.08 * 10),
            watts / 4000
          ],
          displayValues: [
            `${dt.toFixed(1)} °F`,
            `${(btu / Math.max(1, cfm * 1.08 * 10)).toFixed(2)}`,
            `${(watts / 4000).toFixed(2)}`
          ],
          referenceValue: 10,
          healthyMax: 10,
          watchMax: 20,
          axisTitle: "Ambient Rise Pressure",
          referenceLabel: "Healthy Rise Threshold (10 °F)",
          healthyLabel: "Healthy",
          watchLabel: "Watch",
          riskLabel: "Risk",
          chartMax: Math.max(24, Math.ceil(Math.max(dt, btu / Math.max(1, cfm * 1.08 * 10), watts / 4000, 10) * 1.15))
        }
      });
    }

    try {
      sessionStorage.setItem(
        FLOW_KEYS[STEP],
        JSON.stringify({
          category: CATEGORY,
          step: STEP,
          data: {
            deltaT: dt,
            classification: status,
            airflowCFM: cfm,
            heatBTU: btu,
            dominantConstraint
          }
        })
      );
    } catch {}

    showContinue();
  }

  function reset() {
    els.w.value = 3500;
    els.cfm.value = 800;
    els.k.value = "1.08";
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.w, els.cfm, els.k].forEach((el) => {
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

  function boot() {
    bind();
    hideContinue();
    renderEmpty();
    renderFlowNote();
    invalidate();

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  window.addEventListener("DOMContentLoaded", () => {
    let unlocked = unlockCategoryPage();
    if (unlocked) boot();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        boot();
      }
    }, 400);
  });
})();
