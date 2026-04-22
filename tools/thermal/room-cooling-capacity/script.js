(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "room-cooling-capacity";
  const PRIOR_STEP = "exhaust-temperature";
  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";

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
  const TON_BTU = 12000;

  const $ = (id) => document.getElementById(id);

  const els = {
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    w: $("w"),
    m: $("m"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    completionWrap: $("completion-wrap")
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
      const primary = JSON.parse(sessionStorage.getItem(FLOW_KEYS[PRIOR_STEP]) || "null");
      if (primary && primary.category === CATEGORY && primary.step === PRIOR_STEP) {
        return primary;
      }
    } catch {}

    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === PRIOR_STEP) {
        return legacy;
      }
    } catch {}

    return null;
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

  function hideCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "none";
  }

  function showCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "";
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
    clearChart();
    hideCompletion();
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
    const exhaustTemp = Number(data.exhaustTemp);
    const deltaT = Number(data.deltaT);
    const condition = data.classification || data.status;

    const parts = [];
    if (Number.isFinite(exhaustTemp)) parts.push(`Exhaust Temperature: ${exhaustTemp.toFixed(1)} °F`);
    if (Number.isFinite(deltaT)) parts.push(`Ambient Rise: ${deltaT.toFixed(1)} °F`);
    if (condition) parts.push(`Thermal Condition: ${condition}`);

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Final Step — Using Exhaust Temperature results:</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This final step validates whether total thermal load can be absorbed by the room cooling system with enough planning margin to support stable operation.
    `;
  }

  function buildInterpretation(status, dominantConstraint, tons, marginPct, coolingBtu) {
    if (status === "HEALTHY") {
      return `Required cooling capacity is still in a manageable range for the modeled heat load. With the current margin applied, the room-level cooling requirement remains reasonable and leaves a workable basis for stable thermal control.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Cooling tonnage burden") {
        return `Cooling demand has grown large enough that HVAC capacity is becoming a real design constraint. The thermal model can still close, but the room now depends more heavily on dedicated cooling support rather than casual comfort cooling assumptions.`;
      }

      if (dominantConstraint === "Planning margin pressure") {
        return `The applied safety margin is pushing the required cooling capacity upward. That is often the right planning move, but it also means the room system must be validated against a deliberately conservative load basis.`;
      }

      return `The absolute cooling burden is moving into a range where capacity planning matters more. Small underestimates in room cooling support can now show up as hotter ambient conditions and reduced operating margin.`;
    }

    if (dominantConstraint === "Cooling tonnage burden") {
      return `Required cooling tonnage is high enough that room-level HVAC becomes a primary constraint. At this level, thermal stability depends on purpose-built cooling capacity rather than generalized building HVAC assumptions.`;
    }

    if (dominantConstraint === "Planning margin pressure") {
      return `The design is being stressed by the combination of heat load and planning margin. That is not inherently wrong, but it means the final capacity target now demands deliberate infrastructure support instead of ordinary environmental cooling.`;
    }

    return `Total cooling burden is now high enough to create meaningful operational risk. If room cooling is undersized, the entire thermal chain upstream will begin to lose validity because the environment itself cannot absorb the modeled load safely.`;
  }

  function buildGuidance(status, dominantConstraint, tons, classification) {
    if (status === "HEALTHY") {
      return `Use this as the final room-cooling target and compare it directly to real HVAC nameplate and delivered performance. The thermal pipeline closes cleanly here, but real installed capacity should still be verified against the same load basis.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Cooling tonnage burden") {
        return `Validate the room against dedicated cooling capability instead of assuming standard HVAC will be sufficient. This is the range where cooling infrastructure should be confirmed explicitly before deployment.`;
      }

      if (dominantConstraint === "Planning margin pressure") {
        return `Keep the planning margin, but make sure the final capacity target is intentional and backed by real infrastructure. The design now depends on conservative cooling support being available in practice.`;
      }

      return `Review actual room delivery conditions, return-air handling, and cooling-system duty cycle. Capacity in this range should be treated as an engineered requirement, not a rough estimate.`;
    }

    if (classification === "Extreme Cooling Requirement") {
      return `Treat this as an advanced cooling problem. Dedicated precision cooling, stronger containment, or alternative cooling strategies may be required before the room can support this load safely.`;
    }

    if (dominantConstraint === "Cooling tonnage burden") {
      return `Increase real room cooling support before trusting the current design. The modeled load now exceeds what should be left to generic building cooling assumptions.`;
    }

    return `Reassess the final load basis and room-cooling plan before deployment. The pipeline has identified a room-level thermal constraint that must be solved at the infrastructure layer, not just with better rack airflow.`;
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

    clearChart();
    hideCompletion();
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
        <div class="results-grid">
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
    const wRaw = safeNumber(els.w.value, NaN);
    const marginPctRaw = safeNumber(els.m.value, NaN);

    if (
      !Number.isFinite(wRaw) ||
      !Number.isFinite(marginPctRaw) ||
      wRaw <= 0 ||
      marginPctRaw < 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      clearStored();
      hideCompletion();
      clearChart();
      return;
    }

    const w = clamp(wRaw, 0.1, 100000000);
    const marginPct = clamp(marginPctRaw, 0, 500);
    const margin = marginPct / 100;

    const withMargin = w * (1 + margin);
    const btu = withMargin * W_TO_BTU;
    const tons = btu / TON_BTU;

    let classification = "Adequate";
    if (tons > 10) classification = "High Capacity Required";
    if (tons > 25) classification = "Very High Capacity";
    if (tons > 50) classification = "Extreme Cooling Requirement";

    const coolingTonnageBurden = tons;
    const planningMarginPressure = marginPct / 20;
    const totalCoolingBurden = btu / 60000;

    const metrics = [
      {
        label: "Cooling Tonnage Burden",
        value: coolingTonnageBurden,
        displayValue: `${tons.toFixed(2)} tons`
      },
      {
        label: "Planning Margin Pressure",
        value: planningMarginPressure,
        displayValue: `${marginPct.toFixed(0)}%`
      },
      {
        label: "Total Cooling Burden",
        value: totalCoolingBurden,
        displayValue: `${btu.toFixed(0)} BTU/hr`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Cooling Tonnage Burden";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 5,
        watchMax: 15
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Cooling Tonnage Burden";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 15) status = "RISK";
      else if (Number(dominant.value) > 5) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Cooling Tonnage Burden": "Cooling tonnage burden",
      "Planning Margin Pressure": "Planning margin pressure",
      "Total Cooling Burden": "Total cooling burden"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Cooling tonnage burden";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      tons,
      marginPct,
      btu
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      tons,
      classification
    );

    const summaryRows = [
      { label: "Base Heat Load", value: `${w.toFixed(0)} W` },
      { label: "Safety Margin", value: `${marginPct.toFixed(0)}%` },
      { label: "With Margin", value: `${withMargin.toFixed(0)} W` }
    ];

    const derivedRows = [
      { label: "Cooling Required", value: `${btu.toFixed(0)} BTU/hr` },
      { label: "Cooling Required", value: `${tons.toFixed(2)} tons` },
      { label: "Capacity Class", value: classification }
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
        existingWrapRef: null
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

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.renderAnalyzerChart === "function") {
      window.ScopedLabsAnalyzer.renderAnalyzerChart({
        mountEl: els.results,
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        labels: [
          "Cooling Tonnage",
          "Margin Pressure",
          "Cooling Burden"
        ],
        values: [
          coolingTonnageBurden,
          planningMarginPressure,
          totalCoolingBurden
        ],
        displayValues: [
          `${tons.toFixed(2)} tons`,
          `${marginPct.toFixed(0)}%`,
          `${btu.toFixed(0)} BTU/hr`
        ],
        referenceValue: 5,
        healthyMax: 5,
        watchMax: 15,
        axisTitle: "Cooling Pressure",
        referenceLabel: "Healthy Cooling Threshold (5 tons)",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          20,
          Math.ceil(Math.max(coolingTonnageBurden, planningMarginPressure, totalCoolingBurden, 15) * 1.1)
        )
      });
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          baseHeatLoadW: Number(w.toFixed(0)),
          safetyMarginPct: Number(marginPct.toFixed(0)),
          coolingLoadW: Number(withMargin.toFixed(0)),
          coolingLoadBtuHr: Number(btu.toFixed(0)),
          coolingTons: Number(tons.toFixed(2)),
          classification,
          status,
          dominantConstraint,
          pipelineComplete: true
        }
      };

      sessionStorage.setItem(FLOW_KEYS[STEP], JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showCompletion();
  }

  function reset() {
    els.w.value = 12000;
    els.m.value = 20;
    clearStored();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.w, els.m].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function bind() {
    bindInvalidation();

    if (els.calc) els.calc.onclick = calculate;
    if (els.reset) els.reset.onclick = reset;
  }

  function boot() {
    hideCompletion();
    renderFlowNote();
    renderEmpty();
    bind();

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