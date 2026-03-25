(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "airflow-requirement";
  const PRIOR_STEP = "rack-thermal-density";
  const NEXT_URL = "/tools/thermal/fan-cfm-sizing/";

  const $ = (id) => document.getElementById(id);

  const els = {
    w: $("w"),
    dt: $("dt"),
    k: $("k"),
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

    if (els.continueWrap) els.continueWrap.style.display = "block";
    if (els.continueBtn) els.continueBtn.disabled = false;
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }

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

  function renderFlowNote() {
    const saved = readSaved();

    if (!els.flowNote) return;

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
          "Use this step to translate rack heat concentration into the airflow required to keep rack exhaust conditions manageable.",
        customRows:
          saved &&
          saved.category === CATEGORY &&
          saved.step === PRIOR_STEP
            ? [
                {
                  label: "Prior Step",
                  value: "Rack Thermal Density"
                },
                {
                  label: "Rack Heat Density",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.perRU))
                      ? `${Number(saved.data.perRU).toFixed(1)} BTU/hr/RU`
                      : "—"
                },
                {
                  label: "Total Heat Load",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.totalBTU))
                      ? `${Number(saved.data.totalBTU).toFixed(0)} BTU/hr`
                      : saved.data && Number.isFinite(Number(saved.data.heatBTU))
                        ? `${Number(saved.data.heatBTU).toFixed(0)} BTU/hr`
                        : "—"
                }
              ]
            : null
      });
      return;
    }

    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function buildInterpretation(status, dominantConstraint, cfm, dt, watts) {
    const kw = watts / 1000;

    if (status === "HEALTHY") {
      return `Required airflow is moderate for a ${kw.toFixed(1)} kW heat load. The current temperature-rise target leaves workable fan sizing room, so the design is still in a manageable range as long as airflow paths stay clean and short.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Temperature rise target") {
        return `The airflow demand is being driven mainly by a tight allowed ΔT. That can be valid for sensitive hardware, but it pushes fan requirement upward quickly and makes ducting, containment, and recirculation control more important.`;
      }

      if (dominantConstraint === "Heat load concentration") {
        return `The total heat load is large enough that airflow requirement is becoming a design constraint. At this point, fan selection alone may not be the whole answer—rack layout, intake clearance, and hot-air separation start to matter.`;
      }

      return `Airflow demand is climbing into a range where fan capability, static pressure losses, and cabinet path restrictions need to be treated as part of the design instead of an afterthought.`;
    }

    if (dominantConstraint === "Temperature rise target") {
      return `This design is being constrained most by the very small temperature rise allowance. Even though the math is valid, the resulting airflow requirement can become difficult to achieve consistently once filters load, fan curves flatten, or aisle conditions drift.`;
    }

    if (dominantConstraint === "Heat load concentration") {
      return `Heat density is high enough that airflow becomes a major limiting factor. The first thing that usually fails in the field is not the formula—it is the ability of the enclosure, rack, or room path to actually move this much air without bypass, recirculation, or hot spots.`;
    }

    return `Airflow requirement is in a high-pressure design range. That raises operational risk because fan sizing margin shrinks, distribution becomes uneven more easily, and real-world losses start to matter more than nameplate assumptions.`;
  }

  function buildGuidance(status, dominantConstraint, cfm) {
    if (status === "HEALTHY") {
      return `Use the calculated airflow as your minimum target, then leave margin for filters, cable obstruction, and future heat growth. The next step is confirming that the selected fan or fan bank can actually deliver this CFM at the expected static pressure.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Temperature rise target") {
        return `Review whether the allowed ΔT is operationally necessary. Relaxing it even slightly can materially reduce required airflow and widen your fan-selection options.`;
      }

      if (dominantConstraint === "Heat load concentration") {
        return `Check whether heat can be distributed more evenly across the rack or enclosure. Lowering concentration often reduces cooling difficulty more effectively than simply adding more fan capacity.`;
      }

      return `Validate fan curves against real impedance, not free-air ratings. This is the point where airflow path losses begin to decide whether the design performs as expected.`;
    }

    if (cfm > 3000) {
      return `At this level, treat the problem as a containment and airflow-path design issue, not just a fan-selection issue. Confirm intake path, exhaust separation, and room-level cooling support before finalizing hardware.`;
    }

    if (dominantConstraint === "Temperature rise target") {
      return `Either loosen the temperature-rise target or increase cooling-system capability. A tight ΔT target with insufficient airflow margin will be difficult to hold under real operating drift.`;
    }

    return `Increase airflow margin and reduce recirculation risk before proceeding. Validate enclosure geometry, fan placement, and downstream cooling support because these are now likely to become the operational limiters.`;
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

    renderEmpty();
    hideContinue();
  }

  function calculate() {
    const watts = safeNumber(els.w.value, NaN);
    const dtRaw = safeNumber(els.dt.value, NaN);
    const kFactor = safeNumber(els.k.value, 1.08);

    if (!Number.isFinite(watts) || watts <= 0 || !Number.isFinite(dtRaw) || dtRaw <= 0) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }

      if (
        window.ScopedLabsAnalyzer &&
        typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
      ) {
        window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      }

      hideContinue();
      clearStored();
      return;
    }

    const dt = clamp(dtRaw, 0.1, 1000);
    const btu = watts * 3.412;
    const cfm = btu / (kFactor * dt);
    const cfmPerKw = cfm / Math.max(0.1, watts / 1000);

    const metrics = [
      {
        label: "Airflow Demand",
        value: cfm / 1000,
        displayValue: `${(cfm / 1000).toFixed(2)}`
      },
      {
        label: "Temperature Rise Target",
        value: 18 / dt,
        displayValue: `${(18 / dt).toFixed(2)}`
      },
      {
        label: "Heat Load Concentration",
        value: watts / 4000,
        displayValue: `${(watts / 4000).toFixed(2)}`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Airflow Demand";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.35,
        watchMax: 2.2
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Airflow Demand";
    } else {
      const scores = metrics.map((m) => Number(m.value) || 0);
      const maxScore = Math.max(...scores);
      const dominantIndex = scores.indexOf(maxScore);
      dominantLabel = metrics[dominantIndex]?.label || "Airflow Demand";

      if (maxScore > 2.2) status = "RISK";
      else if (maxScore > 1.35) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Airflow Demand": "Airflow path pressure",
      "Temperature Rise Target": "Temperature rise target",
      "Heat Load Concentration": "Heat load concentration"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Airflow path pressure";

    const interpretation = buildInterpretation(status, dominantConstraint, cfm, dt, watts);
    const guidance = buildGuidance(status, dominantConstraint, cfm);

    const summaryRows = [
      { label: "Heat Load", value: `${watts.toFixed(0)} W` },
      { label: "Heat Load", value: `${btu.toFixed(0)} BTU/hr` },
      { label: "Allowed ΔT", value: `${dt.toFixed(1)} °F` },
      { label: "Air Density Factor", value: `${kFactor.toFixed(2)}` }
    ];

    const derivedRows = [
      { label: "Required Airflow", value: `${cfm.toFixed(0)} CFM` },
      { label: "Airflow Intensity", value: `${cfmPerKw.toFixed(0)} CFM/kW` }
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
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
      `;

      if (els.analysisCopy) {
        els.analysisCopy.style.display = "grid";
        els.analysisCopy.innerHTML = `
          <div class="result-row">
            <span class="result-label">Status</span>
            <span class="result-value">${status}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Dominant Constraint</span>
            <span class="result-value">${dominantConstraint}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Engineering Interpretation</span>
            <span class="result-value">${interpretation}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Actionable Guidance</span>
            <span class="result-value">${guidance}</span>
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
          airflowCFM: cfm,
          heatBTU: btu,
          deltaT: dt,
          densityFactor: kFactor,
          airflowPerKW: cfmPerKw,
          status,
          dominantConstraint
        }
      })
    );

    showContinue();
  }

  function reset() {
    els.w.value = 3500;
    els.dt.value = 15;
    els.k.value = "1.08";
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.w, els.dt, els.k].forEach((el) => {
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