(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "heat-load-estimator";
  const NEXT_URL = "/tools/thermal/psu-efficiency-heat/";
  const W_TO_BTU = 3.412141633;

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

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
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

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function loadPrior() {
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
          "This is the starting thermal step. Estimate the total working heat load first so every downstream airflow and cooling calculation is based on the same load basis.",
        customRows: null
      });
      return;
    }

    els.flowNote.style.display = "none";
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
      return;
    }

    hideContinue();
    renderEmpty();
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
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      hideContinue();
      clearStored();

      if (
        window.ScopedLabsAnalyzer &&
        typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
      ) {
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

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
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
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
      `;

      if (els.analysisCopy) {
        els.analysisCopy.style.display = "";
        els.analysisCopy.innerHTML = `
          <div class="results">
            <div class="result-row">
              <div class="result-label">Status</div>
              <div class="result-value">${status}</div>
            </div>
            <div class="result-row">
              <div class="result-label">Dominant Constraint</div>
              <div class="result-value">${dominantConstraint}</div>
            </div>
            <div class="result-row">
              <div class="result-label">Engineering Interpretation</div>
              <div class="result-value">${interpretation}</div>
            </div>
            <div class="result-row">
              <div class="result-label">Actionable Guidance</div>
              <div class="result-value">${guidance}</div>
            </div>
          </div>
        `;
      }
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
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
      })
    );

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
    loadPrior();
  }

  function bindInvalidation() {
    [els.w, els.qty, els.util, els.m].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    loadPrior();
    renderEmpty();
    bindInvalidation();

    els.calc.onclick = calculate;
    els.reset.onclick = reset;
    els.continueBtn.onclick = () => {
      window.location.href = NEXT_URL;
    };
  }

  init();
})();