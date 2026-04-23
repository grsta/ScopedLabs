(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const FLOW_KEYS = {
    scene: "scopedlabs:pipeline:physical-security:scene-illumination",
    mount: "scopedlabs:pipeline:physical-security:mounting-height",
    fov: "scopedlabs:pipeline:physical-security:field-of-view",
    area: "scopedlabs:pipeline:physical-security:camera-coverage-area",
    spacing: "scopedlabs:pipeline:physical-security:camera-spacing",
    blind: "scopedlabs:pipeline:physical-security:blind-spot-check",
    pixel: "scopedlabs:pipeline:physical-security:pixel-density",
    lens: "scopedlabs:pipeline:physical-security:lens-selection",
    face: "scopedlabs:pipeline:physical-security:face-recognition-range",
    plate: "scopedlabs:pipeline:physical-security:license-plate-range"
  };

  const CATEGORY = "physical-security";
  const LANE = "v1";
  const STEP = "license-plate-range";
  const PREVIOUS_STEP = "face-recognition-range";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    res: $("res"),
    hfov: $("hfov"),
    ppp: $("ppp"),
    pw: $("pw"),
    dist: $("dist"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    completeWrap: $("complete-wrap"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    res: 3840,
    hfov: 50,
    ppp: 130,
    pw: 1.0,
    dist: 60
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function deg2rad(x) {
    return x * Math.PI / 180;
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—";
  }

  function fmtPx(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} px` : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function applyDefaults() {
    els.res.value = String(DEFAULTS.res);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ppp.value = String(DEFAULTS.ppp);
    els.pw.value = String(DEFAULTS.pw);
    els.dist.value = String(DEFAULTS.dist);
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

  function showComplete() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.completeWrap) els.completeWrap.style.display = "block";
  }

  function hideComplete() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.completeWrap) els.completeWrap.style.display = "none";
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.face);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const prev = parsed.data || {};
    const dist = num(prev.actualDist ?? prev.dist);
    const classification = prev.classification || "";
    const focal = num(prev.focal);
    const lensClass = prev.lensClass || "";

    if (Number.isFinite(dist) && dist > 0) {
      els.dist.value = String(Math.round(dist));
    }

    const parts = [];
    if (classification) {
      parts.push(`Face Requirement: <strong>${classification}</strong>`);
    }
    if (Number.isFinite(dist) && dist > 0) {
      parts.push(`Working Distance: <strong>${fmtFt(dist)}</strong>`);
    }
    if (lensClass) {
      let lensText = `Lens: <strong>${lensClass}</strong>`;
      if (Number.isFinite(focal) && focal > 0) {
        lensText += ` (~${fmt(focal, 1)} mm)`;
      }
      parts.push(lensText);
    }

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This final step checks whether the same optical setup can also support readable license-plate capture.
    `;
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      try {
        sessionStorage.removeItem(FLOW_KEYS.plate);
      } catch {}
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.plate,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hideComplete();
    renderFlowNote();
  }

  function getInputs() {
    const res = num(els.res.value);
    const hfov = num(els.hfov.value);
    const ppp = num(els.ppp.value);
    const pw = num(els.pw.value);
    const dist = num(els.dist.value);

    if (
      !Number.isFinite(res) || res <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ppp) || ppp <= 0 ||
      !Number.isFinite(pw) || pw <= 0 ||
      !Number.isFinite(dist) || dist <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, res, hfov, ppp, pw, dist };
  }

  function classifyPlateTarget(ppp) {
    if (ppp >= 160) return "High Certainty";
    if (ppp >= 130) return "Readable";
    if (ppp >= 100) return "Marginal";
    return "Weak Capture";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const maxDist =
      (input.res * input.pw) /
      (2 * Math.tan(deg2rad(input.hfov / 2)) * input.ppp);

    const marginFt = maxDist - input.dist;
    const utilizationPct = maxDist > 0 ? (input.dist / maxDist) * 100 : 100;
    const deliveredPpp =
      (input.res * input.pw) /
      (2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist);

    const classification = classifyPlateTarget(input.ppp);

    const shortfallMetric =
      marginFt < 0 && maxDist > 0
        ? ScopedLabsAnalyzer.clamp((Math.abs(marginFt) / maxDist) * 100, 0, 100)
        : 0;

    const utilizationMetric = ScopedLabsAnalyzer.clamp(utilizationPct, 0, 100);

    const requirementMetric =
      input.ppp >= 160 ? 30 :
      input.ppp >= 130 ? 20 :
      input.ppp >= 100 ? 12 : 5;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(utilizationMetric, shortfallMetric, requirementMetric),
      metrics: [
        {
          label: "Range Utilization",
          value: utilizationMetric,
          displayValue: fmtPct(utilizationPct)
        },
        {
          label: "Distance Shortfall",
          value: shortfallMetric,
          displayValue: marginFt < 0 ? fmtFt(Math.abs(marginFt)) : "0.0 ft"
        },
        {
          label: "Plate Readability Demand",
          value: requirementMetric,
          displayValue: fmtPx(input.ppp)
        }
      ],
      healthyMax: 75,
      watchMax: 95
    });

    let interpretation = `With ${fmtPx(input.res)} horizontal resolution, ${fmt(input.hfov, 1)}° HFOV, and a plate width assumption of ${fmtFt(input.pw, 2)}, the modeled maximum readable plate distance for ${fmtPx(input.ppp)} is about ${fmtFt(maxDist)}. At the entered working distance of ${fmtFt(input.dist)}, the scene would deliver roughly ${fmtPx(deliveredPpp, 1)} across the plate.`;

    if (marginFt < 0) {
      interpretation += ` The requested working distance is beyond the modeled plate-capture envelope, so reliable readability falls off before the target position is reached.`;
    } else if (utilizationPct > 95) {
      interpretation += ` The design is operating right at the edge of readable plate capture. Mounting angle, shutter speed, glare, and vehicle speed will strongly affect real results.`;
    } else if (utilizationPct > 75) {
      interpretation += ` The optics can support the requirement, but most of the available plate-capture range is already being consumed. Field conditions matter.`;
    } else {
      interpretation += ` The design retains usable range margin, so the plate-capture requirement is not yet running at the edge of the optical envelope.`;
    }

    let dominantConstraint = "";
    if (marginFt < 0) {
      dominantConstraint = "Distance shortfall is the dominant limiter. The target range exceeds what the current optical setup can support for readable plate capture.";
    } else if (utilizationPct > 95) {
      dominantConstraint = "Range utilization is the dominant limiter. The design is operating at the boundary where real-world degradation becomes operationally significant.";
    } else if (input.ppp >= 160) {
      dominantConstraint = "Plate readability demand is the dominant limiter. The design is being held to a stricter capture standard, which compresses usable distance more aggressively.";
    } else {
      dominantConstraint = "The optical setup and plate requirement are reasonably balanced. The layout still has measurable distance headroom.";
    }

    let guidance = "";
    if (marginFt < 0) {
      guidance = "Tighten the field of view, increase resolution, reduce working distance, or lower the pixels-per-plate requirement before relying on this setup for plate capture.";
    } else if (utilizationPct > 95) {
      guidance = "Treat this as edge-of-range performance. Validate shutter speed, glare control, IR behavior, and capture angle before finalizing the design.";
    } else if (utilizationPct > 75) {
      guidance = "The design is workable, but verify real vehicle speed, plate angle, and scene lighting because plate-capture margin is not generous.";
    } else {
      guidance = "Plate-capture range has practical headroom. Return to the category and continue building the rest of the design around the same optical assumptions.";
    }

    return {
      ok: true,
      ...input,
      maxDist,
      marginFt,
      utilizationPct,
      deliveredPpp,
      classification,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      utilizationMetric,
      shortfallMetric,
      requirementMetric
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.plate, {
      category: CATEGORY,
      step: STEP,
      data: {
        dist: data.maxDist,
        actualDist: data.dist,
        classification: data.classification,
        ppp: data.ppp,
        pw: data.pw,
        hfov: data.hfov,
        res: data.res,
        deliveredPpp: data.deliveredPpp,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideComplete();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Plate Readability Target", value: data.classification },
        { label: "Max Capture Distance", value: fmtFt(data.maxDist) },
        { label: "Actual Working Distance", value: fmtFt(data.dist) },
        { label: "Range Margin", value: data.marginFt >= 0 ? fmtFt(data.marginFt) : `-${fmtFt(Math.abs(data.marginFt))}` }
      ],
      derivedRows: [
        { label: "Horizontal Resolution", value: fmtPx(data.res) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Target Pixels per Plate", value: fmtPx(data.ppp) },
        { label: "Delivered Pixels per Plate", value: fmtPx(data.deliveredPpp, 1) },
        { label: "Plate Width Assumption", value: fmtFt(data.pw, 2) },
        { label: "Range Utilization", value: fmtPct(data.utilizationPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Range Utilization", "Distance Shortfall", "Plate Readability Demand"],
        values: [
          Number(data.utilizationMetric.toFixed(1)),
          Number(data.shortfallMetric.toFixed(1)),
          Number(data.requirementMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.utilizationPct),
          data.marginFt < 0 ? fmtFt(Math.abs(data.marginFt)) : "0.0 ft",
          fmtPx(data.ppp)
        ],
        referenceValue: 75,
        healthyMax: 75,
        watchMax: 95,
        axisTitle: "Plate Capture Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });

    writeFlow(data);
    showComplete();
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["res", "hfov", "ppp", "pw", "dist"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);
  }

  function init() {
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    init();
  });
})();