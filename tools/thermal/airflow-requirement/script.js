(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "airflow-requirement";
  const PRIOR_STEP = "rack-thermal-density";
  const NEXT_URL = "/tools/thermal/fan-cfm-sizing/";

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

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

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
      window.ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function showContinue() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.showContinue === "function") {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continueBtn) els.continueBtn.disabled = false;
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
    const saved = readSaved();

    if (!els.flowNote) return;

    if (!saved || saved.category !== CATEGORY || saved.step !== PRIOR_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const data = saved.data || {};
    const rows = [];

    if (Number.isFinite(Number(data.totalBTU))) {
      rows.push(`Total heat load <strong>${Number(data.totalBTU).toFixed(0)} BTU/hr</strong>`);
    } else if (Number.isFinite(Number(data.heatBTU))) {
      rows.push(`Heat load <strong>${Number(data.heatBTU).toFixed(0)} BTU/hr</strong>`);
    }

    if (Number.isFinite(Number(data.perRU))) {
      rows.push(`Rack density <strong>${Number(data.perRU).toFixed(1)} BTU/hr/RU</strong>`);
    }

    if (Number.isFinite(Number(data.watts))) {
      rows.push(`Power draw <strong>${Number(data.watts).toFixed(0)} W</strong>`);
    }

    if (Number.isFinite(Number(data.watts)) && (!els.w.value || Number(els.w.value) === 3500)) {
      els.w.value = String(Math.round(Number(data.watts)));
    }

    if (!rows.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      Imported from Rack Thermal Density.<br>
      ${rows.join("<br>")}
      <br><br>
      Use this step to translate the current heat load into required airflow before sizing fans.
    `;
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
      renderFlowNote();
      return;
    }

    renderEmpty();
    hideContinue();
    renderFlowNote();
  }

  function calculate() {
    const watts = safeNumber(els.w.value, NaN);
    const dtRaw = safeNumber(els.dt.value, NaN);
    const kFactor = safeNumber(els.k.value, 1.08);

    if (!Number.isFinite(watts) || watts <= 0 || !Number.isFinite(dtRaw) || dtRaw <= 0) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }

      if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
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

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
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
            "Airflow Demand",
            "Temperature Rise Target",
            "Heat Load Concentration"
          ],
          values: [
            Number((cfm / 1000).toFixed(2)),
            Number((18 / dt).toFixed(2)),
            Number((watts / 4000).toFixed(2))
          ],
          displayValues: [
            `${cfm.toFixed(0)} CFM`,
            `${dt.toFixed(1)} °F`,
            `${watts.toFixed(0)} W`
          ],
          referenceValue: 1.35,
          healthyMax: 1.35,
          watchMax: 2.2,
          axisTitle: "Airflow Planning Pressure",
          referenceLabel: "Comfort Band",
          healthyLabel: "Healthy",
          watchLabel: "Watch",
          riskLabel: "Risk",
          chartMax: Math.max(3, Number((cfm / 1000).toFixed(2)) + 0.5)
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
    } catch {}

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

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  init();
})();
