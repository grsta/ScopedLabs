(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "btu-converter";
  const PRIOR_STEP = "psu-efficiency-heat";
  const NEXT_URL = "/tools/thermal/rack-thermal-density/";

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

  const W_TO_BTU = 3.412141633;
  const TON_TO_BTU = 12000;

  const $ = (id) => document.getElementById(id);

  const els = {
    w: $("w"),
    btu: $("btu"),
    tons: $("tons"),
    mode: $("mode"),
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
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Convert.</div>`;
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
    const heatLossW = Number(data.heatLossW);
    const heatLossBtu = Number(data.heatLossBtuHr);

    if (Number.isFinite(heatLossW) && (!els.w.value || Number(els.w.value) === 3500)) {
      els.w.value = String(Math.round(heatLossW));
    }

    if (Number.isFinite(heatLossBtu) && (!els.btu.value || Number(els.btu.value) === 11942)) {
      els.btu.value = String(Math.round(heatLossBtu));
    }

    const parts = [];
    if (Number.isFinite(heatLossW)) parts.push(`PSU Heat Loss: ${Math.round(heatLossW)} W`);
    if (Number.isFinite(heatLossBtu)) parts.push(`Thermal Output: ${Math.round(heatLossBtu)} BTU/hr`);

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Step 3 — Using PSU Heat results:</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This step converts electrical or thermal load into HVAC planning units so downstream density and cooling calculations use consistent heat terms.
    `;
  }

  function buildInterpretation(status, dominantConstraint, btu, tons, mode) {
    if (status === "HEALTHY") {
      return `The converted heat load is still in a manageable cooling range. This gives you a clean planning baseline for downstream airflow and density steps without indicating an unusual thermal burden yet.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Cooling tonnage requirement") {
        return `The converted load is large enough that cooling tonnage starts to become a design consideration instead of a background assumption. This is where planning accuracy begins to matter for containment and airflow sizing.`;
      }

      return `Thermal load is moving into a mid-range condition where unit translation matters operationally. Small mistakes in conversion or load accounting can now propagate into undersized downstream airflow and cooling decisions.`;
    }

    if (dominantConstraint === "Cooling tonnage requirement") {
      return `The converted load is high enough that HVAC sizing becomes a primary design constraint. At this point, downstream airflow and rack-density calculations are only as good as the accuracy of the heat-load translation performed here.`;
    }

    return `The converted load represents a high thermal burden. That raises operational risk because any underestimation here will cascade into fan, airflow, and cooling capacity assumptions that are too optimistic.`;
  }

  function buildGuidance(status, dominantConstraint, btu, tons) {
    if (status === "HEALTHY") {
      return `Carry this converted value forward as the working thermal baseline, then validate whether rack-level density and airflow assumptions remain aligned with the same load.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Cooling tonnage requirement") {
        return `Start validating the load against actual cooling-system capability rather than using generic assumptions. This is the point where rough estimates begin to lose planning value.`;
      }

      return `Make sure all downstream steps are based on the same source unit. Mixed-unit planning errors become more likely once the load reaches this range.`;
    }

    if (tons >= 2) {
      return `Treat this as a meaningful cooling design requirement. Confirm the translated load against real HVAC support, airflow path assumptions, and containment strategy before finalizing later pipeline steps.`;
    }

    return `Recheck the upstream load source and conversion basis before proceeding. A high translated heat value can amplify every downstream design decision if the input assumptions are inconsistent.`;
  }

  function invalidate() {
    clearStored();

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.invalidate === "function") {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Convert."
      });
    } else {
      renderEmpty();
    }

    hideContinue();
    renderFlowNote();
  }

  function calculate() {
    const mode = els.mode.value;

    let watts = safeNumber(els.w.value, NaN);
    let btu = safeNumber(els.btu.value, NaN);
    let tons = safeNumber(els.tons.value, NaN);

    if (mode === "watts") {
      if (!Number.isFinite(watts) || watts <= 0) {
        renderEmpty();
        hideContinue();
        clearStored();
        return;
      }
      watts = clamp(watts, 0.1, 100000000);
      btu = watts * W_TO_BTU;
      tons = btu / TON_TO_BTU;
    } else if (mode === "btu") {
      if (!Number.isFinite(btu) || btu <= 0) {
        renderEmpty();
        hideContinue();
        clearStored();
        return;
      }
      btu = clamp(btu, 0.1, 100000000);
      watts = btu / W_TO_BTU;
      tons = btu / TON_TO_BTU;
    } else {
      if (!Number.isFinite(tons) || tons <= 0) {
        renderEmpty();
        hideContinue();
        clearStored();
        return;
      }
      tons = clamp(tons, 0.01, 1000000);
      btu = tons * TON_TO_BTU;
      watts = btu / W_TO_BTU;
    }

    els.w.value = Number.isFinite(watts) ? watts.toFixed(0) : "";
    els.btu.value = Number.isFinite(btu) ? btu.toFixed(0) : "";
    els.tons.value = Number.isFinite(tons) ? tons.toFixed(2) : "";

    const metrics = [
      {
        label: "Cooling Tonnage Requirement",
        value: tons,
        displayValue: `${tons.toFixed(2)} tons`
      },
      {
        label: "Thermal Load Magnitude",
        value: btu / 12000,
        displayValue: `${(btu / 12000).toFixed(2)}`
      },
      {
        label: "Conversion Planning Pressure",
        value: btu / 20000,
        displayValue: `${(btu / 20000).toFixed(2)}`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Cooling Tonnage Requirement";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1,
        watchMax: 2
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Cooling Tonnage Requirement";
    } else {
      const scores = metrics.map((m) => Number(m.value) || 0);
      const maxScore = Math.max(...scores);
      const dominantIndex = scores.indexOf(maxScore);
      dominantLabel = metrics[dominantIndex]?.label || "Cooling Tonnage Requirement";

      if (maxScore > 2) status = "RISK";
      else if (maxScore > 1) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Cooling Tonnage Requirement": "Cooling tonnage requirement",
      "Thermal Load Magnitude": "Thermal load magnitude",
      "Conversion Planning Pressure": "Conversion planning pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Cooling tonnage requirement";

    const interpretation = buildInterpretation(status, dominantConstraint, btu, tons, mode);
    const guidance = buildGuidance(status, dominantConstraint, btu, tons);

    const summaryRows = [
      {
        label: "Edit Mode",
        value:
          mode === "watts"
            ? "Watts → BTU/hr → Tons"
            : mode === "btu"
              ? "BTU/hr → Watts → Tons"
              : "Tons → BTU/hr → Watts"
      },
      { label: "Watts", value: `${watts.toFixed(0)} W` },
      { label: "BTU/hr", value: `${btu.toFixed(0)} BTU/hr` }
    ];

    const derivedRows = [
      { label: "Cooling Tons", value: `${tons.toFixed(2)} tons` },
      { label: "Planning Basis", value: "Thermal load translation" }
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
            "Cooling Tonnage",
            "Thermal Magnitude",
            "Planning Pressure"
          ],
          values: [
            Number(tons.toFixed(2)),
            Number((btu / 12000).toFixed(2)),
            Number((btu / 20000).toFixed(2))
          ],
          displayValues: [
            `${tons.toFixed(2)} tons`,
            `${btu.toFixed(0)} BTU/hr`,
            `${watts.toFixed(0)} W`
          ],
          referenceValue: 1,
          healthyMax: 1,
          watchMax: 2,
          axisTitle: "Cooling Planning Pressure",
          referenceLabel: "Comfort Band",
          healthyLabel: "Healthy",
          watchLabel: "Watch",
          riskLabel: "Risk",
          chartMax: Math.max(3, Number(tons.toFixed(2)) + 0.5)
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
            watts,
            btu,
            tons,
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
    els.btu.value = 11942;
    els.tons.value = 1.00;
    els.mode.value = "watts";
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.w, els.btu, els.tons, els.mode].forEach((el) => {
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
    renderEmpty();
    renderFlowNote();
    bind();
  }

  init();

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
})();
