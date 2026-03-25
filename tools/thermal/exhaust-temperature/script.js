(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "exhaust-temperature";
  const PRIOR_STEP = "ambient-rise";
  const NEXT_URL = "/tools/thermal/room-cooling-capacity/";

  const $ = (id) => document.getElementById(id);

  const els = {
    tin: $("tin"),
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

  function readSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
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
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function showContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.showContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "";
    if (els.continueBtn) els.continueBtn.disabled = false;
  }

  function clearAnalysisBlock() {
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
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
    clearChart();
  }

  function renderFlowNote() {
    const saved = readSaved();

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
          "This step estimates final exhaust conditions using inlet temperature, heat load, and delivered airflow.",
        customRows:
          saved &&
          saved.category === CATEGORY &&
          saved.step === PRIOR_STEP
            ? [
                {
                  label: "Prior Step",
                  value: "Ambient Rise"
                },
                {
                  label: "Ambient Rise",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.deltaT))
                      ? `${Number(saved.data.deltaT).toFixed(1)} °F`
                      : "—"
                },
                {
                  label: "Ambient Condition",
                  value:
                    saved.data?.classification ??
                    saved.data?.status ??
                    "—"
                }
              ]
            : null
      });
      return;
    }

    if (!els.flowNote) return;
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function buildInterpretation(status, dominantConstraint, tout, dt, cfm, watts) {
    const kw = watts / 1000;

    if (status === "HEALTHY") {
      return `Projected exhaust temperature remains controlled for a ${kw.toFixed(1)} kW load. Thermal lift through the system is still in a manageable range, which means the current airflow assumption is providing usable headroom before final cooling-capacity validation.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Exhaust temperature outcome") {
        return `Exhaust temperature is rising into a range where thermal margin begins to shrink. The system may still operate acceptably, but downstream cooling stability will depend more heavily on real delivered airflow and clean separation of hot air.`;
      }

      if (dominantConstraint === "Airflow delivery margin") {
        return `Delivered airflow is becoming the main limiter. Small losses from fan curve drop-off, filter loading, or obstruction can push final exhaust conditions above the modeled result.`;
      }

      return `Heat load is large enough that exhaust conditions are starting to reflect a tighter thermal balance. At this stage, temperature control becomes more sensitive to layout quality and real-world airflow losses.`;
    }

    if (dominantConstraint === "Exhaust temperature outcome") {
      return `Projected exhaust temperature is high enough to indicate an under-cooled operating condition. The model is telling you that the system has moved beyond a comfortable thermal range, so inlet stability and downstream cooling headroom are now at risk.`;
    }

    if (dominantConstraint === "Airflow delivery margin") {
      return `Airflow delivery is too tight for the present heat load, so final exhaust conditions are being constrained by cooling movement rather than by load conversion math. In practice, this usually shows up as hot exhaust spikes and unstable inlet conditions under peak load.`;
    }

    return `Thermal load intensity is pushing final exhaust conditions into a high-pressure range. That raises operational risk because any mismatch between assumed and actual CFM will amplify temperature rise at the point where the system is already warmest.`;
  }

  function buildGuidance(status, dominantConstraint, tout, dt) {
    if (status === "HEALTHY") {
      return `Carry this exhaust condition forward into the cooling-capacity step, but keep margin for real airflow losses and warmer ambient conditions. The next check is whether the room-level cooling system can comfortably absorb this final thermal state.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Airflow delivery margin") {
        return `Increase delivered airflow margin or reduce restriction before locking in the design. Exhaust performance is now sensitive enough that paper CFM and real CFM may diverge meaningfully.`;
      }

      if (dominantConstraint === "Exhaust temperature outcome") {
        return `Validate the exhaust condition against actual equipment and room limits. This is the range where even moderate ambient drift can push the system into a noticeably hotter operating state.`;
      }

      return `Review containment quality, bypass control, and airflow path cleanliness before proceeding. Temperature performance in this range depends heavily on execution, not just on nominal capacity.`;
    }

    if (tout >= 130) {
      return `Treat this as a critical thermal condition. Increase airflow, reduce heat concentration, or improve upstream cooling assumptions before relying on the current design.`;
    }

    if (dominantConstraint === "Airflow delivery margin") {
      return `Rework airflow delivery and validate against real static-pressure conditions, not free-air numbers. The design does not currently have enough airflow margin to support stable exhaust temperatures.`;
    }

    return `Reduce final exhaust temperature before moving forward. Improve delivered airflow, reduce heat intensity, or increase upstream cooling support so the next step starts from a safer thermal condition.`;
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
    } else {
      renderEmpty();
      hideContinue();
    }

    clearChart();
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
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
    }

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

  function calculate() {
    const tinRaw = safeNumber(els.tin.value, NaN);
    const wattsRaw = safeNumber(els.w.value, NaN);
    const cfmRaw = safeNumber(els.cfm.value, NaN);
    const k = safeNumber(els.k.value, 1.08);

    if (
      !Number.isFinite(tinRaw) ||
      !Number.isFinite(wattsRaw) || wattsRaw <= 0 ||
      !Number.isFinite(cfmRaw) || cfmRaw <= 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const tin = clamp(tinRaw, -100, 300);
    const watts = clamp(wattsRaw, 0.1, 100000000);
    const cfm = clamp(cfmRaw, 1, 1000000);

    const btu = watts * 3.412;
    const dt = btu / (k * cfm);
    const tout = tin + dt;
    const airflowPerKw = cfm / Math.max(0.1, watts / 1000);

    const airflowMargin = btu / Math.max(1, cfm * 1.08 * 10);
    const heatIntensity = watts / 4000;

    const metrics = [
      {
        label: "Exhaust Temperature Outcome",
        value: tout,
        displayValue: `${tout.toFixed(1)} °F`
      },
      {
        label: "Airflow Delivery Margin",
        value: airflowMargin,
        displayValue: `${airflowMargin.toFixed(2)}`
      },
      {
        label: "Heat Load Intensity",
        value: heatIntensity,
        displayValue: `${heatIntensity.toFixed(2)}`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Exhaust Temperature Outcome";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 95,
        watchMax: 110
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Exhaust Temperature Outcome";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (tout > 110) status = "RISK";
      else if (tout > 95) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Exhaust Temperature Outcome": "Exhaust temperature outcome",
      "Airflow Delivery Margin": "Airflow delivery margin",
      "Heat Load Intensity": "Heat load intensity"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Exhaust temperature outcome";

    const interpretation = buildInterpretation(status, dominantConstraint, tout, dt, cfm, watts);
    const guidance = buildGuidance(status, dominantConstraint, tout, dt);

    const summaryRows = [
      { label: "Inlet Temperature", value: `${tin.toFixed(1)} °F` },
      { label: "Heat Load", value: `${watts.toFixed(0)} W` },
      { label: "Heat Load", value: `${btu.toFixed(0)} BTU/hr` },
      { label: "Airflow", value: `${cfm.toFixed(0)} CFM` }
    ];

    const derivedRows = [
      { label: "Temperature Rise", value: `${dt.toFixed(1)} °F` },
      { label: "Exhaust Temperature", value: `${tout.toFixed(1)} °F` },
      { label: "Airflow Intensity", value: `${airflowPerKw.toFixed(0)} CFM/kW` }
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
      renderFallback(
        summaryRows,
        derivedRows,
        status,
        dominantConstraint,
        interpretation,
        guidance
      );
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
        labels: [
          "Exhaust Temp",
          "Airflow Margin",
          "Heat Intensity"
        ],
        values: [
          tout,
          airflowMargin,
          heatIntensity
        ],
        displayValues: [
          `${tout.toFixed(1)} °F`,
          `${airflowMargin.toFixed(2)}`,
          `${heatIntensity.toFixed(2)}`
        ],
        referenceValue: 95,
        healthyMax: 95,
        watchMax: 110,
        axisTitle: "Thermal Pressure",
        referenceLabel: "Healthy Exhaust Threshold (95 °F)",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          130,
          Math.ceil(Math.max(tout, airflowMargin, heatIntensity, 95) * 1.1)
        )
      });
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        category: CATEGORY,
        step: STEP,
        data: {
          inletTemp: tin,
          exhaustTemp: tout,
          deltaT: dt,
          airflowCFM: cfm,
          heatBTU: btu,
          classification: status,
          dominantConstraint
        }
      })
    );

    showContinue();
  }

  function reset() {
    els.tin.value = 72;
    els.w.value = 3500;
    els.cfm.value = 900;
    els.k.value = "1.08";
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.tin, els.w, els.cfm, els.k].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    renderEmpty();
    renderFlowNote();
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = NEXT_URL;
      });
    }
  }

  init();
})();