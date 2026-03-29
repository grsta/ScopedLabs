const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "power";
  const STEP = "va-watts-amps";
  const NEXT_URL = "/tools/power/load-growth/";

  const els = {
    volts: $("volts"),
    pf: $("pf"),
    watts: $("watts"),
    va: $("va"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continueWrap"),
    continueBtn: $("continueBtn"),
    calc: $("calc"),
    reset: $("reset")
  };

  function n(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : NaN;
  }

  function fmtNum(v, decimals = 0) {
    if (!Number.isFinite(v)) return "—";
    return v.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function fmtWatts(v, decimals = 0) {
    return Number.isFinite(v) ? `${fmtNum(v, decimals)} W` : "—";
  }

  function fmtVA(v, decimals = 0) {
    return Number.isFinite(v) ? `${fmtNum(v, decimals)} VA` : "—";
  }

  function fmtAmps(v, decimals = 2) {
    return Number.isFinite(v) ? `${fmtNum(v, decimals)} A` : "—";
  }

  function fmtVolts(v, decimals = 0) {
    return Number.isFinite(v) ? `${fmtNum(v, decimals)} V` : "—";
  }

  function fmtPct(v, decimals = 1) {
    return Number.isFinite(v) ? `${fmtNum(v, decimals)}%` : "—";
  }

  function fmtRatio(v, decimals = 2) {
    return Number.isFinite(v) ? v.toFixed(decimals) : "—";
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function savePipelineResult(payload) {
    try {
      sessionStorage.setItem(FLOW_KEY, JSON.stringify({
        category: CATEGORY,
        step: STEP,
        ts: Date.now(),
        data: payload
      }));
    } catch (err) {
      console.warn("Could not save pipeline payload:", err);
    }
  }

  function invalidatePipelineResult() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.category === CATEGORY && parsed.step === STEP) {
        sessionStorage.removeItem(FLOW_KEY);
      }
    } catch (err) {
      console.warn("Could not invalidate pipeline payload:", err);
    }
  }

  function renderFlowNote() {
    if (!els.flowNote) return;
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEY,
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Enter Watts or VA, then press Calculate."
    });
    invalidatePipelineResult();
    hideContinue();
    renderFlowNote();
  }

  function getInputs() {
    const V = n(els.volts?.value);
    const PF = n(els.pf?.value);
    const W = n(els.watts?.value);
    const VAin = n(els.va?.value);

    if (!Number.isFinite(V) || V <= 0) {
      return { ok: false, message: "Voltage must be greater than 0." };
    }

    if (!Number.isFinite(PF) || PF < 0.5 || PF > 1.0) {
      return { ok: false, message: "Power Factor must be between 0.5 and 1.0." };
    }

    const hasWatts = Number.isFinite(W) && W > 0;
    const hasVA = Number.isFinite(VAin) && VAin > 0;

    if (hasWatts && hasVA) {
      return { ok: false, message: "Enter Watts or VA, not both." };
    }

    if (!hasWatts && !hasVA) {
      return { ok: false, message: "Enter Watts or VA." };
    }

    return {
      ok: true,
      volts: V,
      powerFactor: PF,
      wattsIn: hasWatts ? W : null,
      vaIn: hasVA ? VAin : null
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    let finalWatts = 0;
    let finalVA = 0;

    if (Number.isFinite(input.wattsIn)) {
      finalWatts = input.wattsIn;
      finalVA = finalWatts / input.powerFactor;
    } else {
      finalVA = input.vaIn;
      finalWatts = finalVA * input.powerFactor;
    }

    const amps = finalVA / input.volts;
    const kw = finalWatts / 1000;
    const designWatts20 = finalWatts * 1.2;
    const continuousWatts125 = finalWatts * 1.25;
    const designVA20 = finalVA * 1.2;
    const branch80Watts = input.volts * amps * 0.8 * input.powerFactor;
    const utilizationPct80 = branch80Watts > 0 ? (finalWatts / branch80Watts) * 100 : 0;

    const pfPenaltyMetric = ScopedLabsAnalyzer.clamp((1 - input.powerFactor) * 100, 0, 100);
    const branchUtilMetric = ScopedLabsAnalyzer.clamp(utilizationPct80, 0, 100);
    const currentPressureMetric = ScopedLabsAnalyzer.clamp((amps / 20) * 100, 0, 100);

    const metrics = [
      {
        label: "Branch Utilization",
        value: branchUtilMetric,
        displayValue: fmtPct(utilizationPct80)
      },
      {
        label: "Current Pressure",
        value: currentPressureMetric,
        displayValue: fmtAmps(amps)
      },
      {
        label: "Power Factor Penalty",
        value: pfPenaltyMetric,
        displayValue: fmtRatio(input.powerFactor, 2)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(branchUtilMetric, currentPressureMetric, pfPenaltyMetric),
      metrics,
      healthyMax: 60,
      watchMax: 85
    });

    let planningClass = "Balanced Electrical Planning";
    if (utilizationPct80 > 100) {
      planningClass = "Over Continuous Planning Limit";
    } else if (utilizationPct80 > 80) {
      planningClass = "Approaching Continuous Limit";
    } else if (input.powerFactor < 0.8) {
      planningClass = "Low Power Factor Load";
    }

    let interpretation = `At ${fmtVolts(input.volts)} and power factor ${fmtRatio(input.powerFactor, 2)}, the load converts to ${fmtWatts(finalWatts)} and ${fmtVA(finalVA)} with current draw of about ${fmtAmps(amps)}. A simple +20% growth headroom projects to about ${fmtWatts(designWatts20)}, while a 125% continuous-design reference is about ${fmtWatts(continuousWatts125)}.`;

    if (utilizationPct80 > 100) {
      interpretation += ` This load exceeds a simple 80% continuous-planning threshold, so today's value is already too high for comfortable branch or UPS planning without resizing.`;
    } else if (utilizationPct80 > 80) {
      interpretation += ` The load is approaching a typical continuous-use planning threshold, so future growth and startup behavior matter more than the raw conversion alone suggests.`;
    } else if (input.powerFactor < 0.8) {
      interpretation += ` Power factor is low enough that apparent power rises materially above real power, which can make UPS and circuit sizing feel larger than watts alone would imply.`;
    } else {
      interpretation += ` The converted load is in a practical planning range, and the relationships between watts, VA, and amps are behaving normally.`;
    }

    let dominantConstraint = "";
    if (utilizationPct80 > 85) {
      dominantConstraint = "Branch utilization is the dominant limiter. The converted load is consuming a large share of a simple continuous-planning allowance.";
    } else if (amps > 16) {
      dominantConstraint = "Current draw is the dominant limiter. Conductor, circuit, and upstream UPS sizing will feel the effect of this load level first.";
    } else if (input.powerFactor < 0.8) {
      dominantConstraint = "Power factor is the dominant limiter. Apparent power inflation is pushing VA and amperage upward relative to real watts.";
    } else {
      dominantConstraint = "The conversion is balanced. Voltage, power factor, and load remain in a practical range for upstream planning.";
    }

    let guidance = "";
    if (utilizationPct80 > 100) {
      guidance = "Treat this as an overloaded planning point. Revisit branch size, UPS size, or expected connected load before moving forward.";
    } else if (utilizationPct80 > 80) {
      guidance = "Carry the projected design watts, not just the raw input value, into Load Growth so future power planning does not start from an already-tight baseline.";
    } else {
      guidance = "Use the converted watts and planning references as the baseline for Load Growth so the rest of the power pipeline starts from a realistic design input.";
    }

    return {
      ok: true,
      volts: input.volts,
      powerFactor: input.powerFactor,
      watts: finalWatts,
      va: finalVA,
      amps,
      kw,
      designWatts20,
      continuousWatts125,
      designVA20,
      branch80Watts,
      utilizationPct80,
      planningClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideContinue();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Watts", value: fmtWatts(data.watts) },
        { label: "VA", value: fmtVA(data.va) },
        { label: "Amps", value: fmtAmps(data.amps) },
        { label: "Planning Result", value: data.planningClass }
      ],
      derivedRows: [
        { label: "Voltage", value: fmtVolts(data.volts) },
        { label: "Power Factor", value: fmtRatio(data.powerFactor, 2) },
        { label: "+20% Growth Headroom", value: fmtWatts(data.designWatts20) },
        { label: "125% Continuous Design", value: fmtWatts(data.continuousWatts125) },
        { label: "+20% Design VA", value: fmtVA(data.designVA20) },
        { label: "80% Branch Planning Watts", value: fmtWatts(data.branch80Watts) },
        { label: "Utilization vs 80% Planning", value: fmtPct(data.utilizationPct80) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    savePipelineResult({
      volts: data.volts,
      powerFactor: data.powerFactor,
      watts: data.watts,
      va: data.va,
      amps: data.amps,
      kw: data.kw,
      designWatts20: data.designWatts20,
      continuousWatts125: data.continuousWatts125,
      designVA20: data.designVA20,
      branch80Watts: data.branch80Watts,
      utilizationPct80: data.utilizationPct80,
      baseLoadKw: data.kw,
      loadWatts: data.watts,
      designLoadWatts: data.designWatts20,
      planningClass: data.planningClass,
      interpretation: data.interpretation,
      guidance: data.guidance
    });

    showContinue();
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    if (els.volts) els.volts.value = "120";
    if (els.pf) els.pf.value = "0.90";
    if (els.watts) els.watts.value = "";
    if (els.va) els.va.value = "";
    invalidate();
  }

  function bind() {
    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", reset);

    ["volts", "pf", "watts", "va"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calculate();
        }
      });
    });

    els.continueBtn?.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    bind();
    renderFlowNote();
    hideContinue();
    invalidate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

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
