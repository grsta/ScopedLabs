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
  const STEP = "lens-selection";
  const PREVIOUS_STEP = "pixel-density";
  const NEXT_URL = "/tools/physical-security/face-recognition-range/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    dist: $("dist"),
    tw: $("tw"),
    sw: $("sw"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    dist: 80,
    tw: 20,
    sw: 6.4
  };

  let prev = null;

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—";
  }

  function fmtMm(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} mm` : "—";
  }

  function fmtPpf(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} PPF` : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function applyDefaults() {
    els.dist.value = String(DEFAULTS.dist);
    els.tw.value = String(DEFAULTS.tw);
    els.sw.value = String(DEFAULTS.sw);
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

    const lockedCard = document.getElementById("lockedCard");
    const toolCard = document.getElementById("toolCard");

    if (signedIn && unlocked) {
      if (lockedCard) lockedCard.style.display = "none";
      if (toolCard) toolCard.style.display = "";
      return true;
    }

    if (lockedCard) lockedCard.style.display = "";
    if (toolCard) toolCard.style.display = "none";
    return false;
  }

  function clearDownstream() {
    try {
      sessionStorage.removeItem(FLOW_KEYS.face);
      sessionStorage.removeItem(FLOW_KEYS.plate);
    } catch {}
  }

  function classifyLens(focal) {
    if (focal < 3) return "Ultra-Wide (2.8mm)";
    if (focal < 5) return "Wide (4mm)";
    if (focal < 8) return "Mid (6mm)";
    if (focal < 12) return "Telephoto (8–12mm)";
    return "Long Range (12mm+)";
  }

  function classifyRequirement(ppf) {
    if (ppf >= 250) return "High Detail";
    if (ppf >= 150) return "Recognition";
    if (ppf >= 80) return "Observation";
    return "Low Detail";
  }

  function lensInterpretation(focal) {
    if (focal < 4) {
      return "Wide coverage, but reduced detail concentration at distance.";
    }
    if (focal < 8) {
      return "Balanced field of view and usable subject detail.";
    }
    if (focal < 12) {
      return "Narrower view with stronger subject concentration and better target detail.";
    }
    return "Highly focused view intended for long-range identification or constrained corridors.";
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.pixel);
    prev = null;

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

    prev = parsed.data || {};

    const dist = num(prev.dist);
    const ppf = num(prev.ppf);
    const level = prev.level || prev.classification || "";

    if (Number.isFinite(dist) && dist > 0) {
      els.dist.value = String(Math.round(dist));
    }

    const parts = [];
    if (level) {
      parts.push(`Pixel Density: <strong>${level}</strong>`);
    } else if (Number.isFinite(ppf) && ppf > 0) {
      parts.push(`Pixel Density: <strong>${fmtPpf(ppf)}</strong>`);
    }
    if (Number.isFinite(dist) && dist > 0) {
      parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
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
      This step converts the validated detail requirement from Pixel Density into a practical focal-length recommendation.
    `;
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstream();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.lens,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Suggest Lens."
    });

    prev = null;
    renderFlowNote();
  }

  function getInputs() {
    const dist = num(els.dist.value);
    const tw = num(els.tw.value);
    const sw = num(els.sw.value);

    if (
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(tw) || tw <= 0 ||
      !Number.isFinite(sw) || sw <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Suggest Lens." };
    }

    return { ok: true, dist, tw, sw };
  }

  function adjustForPPF(focal) {
    if (!prev) return focal;

    const ppf = num(prev.ppf, 0);

    if (ppf < 40) return focal * 1.4;
    if (ppf < 80) return focal * 1.2;
    if (ppf > 120) return focal * 0.9;

    return focal;
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const baseFocal = (input.sw * input.dist) / input.tw;
    const adjustedFocal = adjustForPPF(baseFocal);
    const lensClass = classifyLens(adjustedFocal);
    const interp = lensInterpretation(adjustedFocal);

    const ppf = prev ? num(prev.ppf, 0) : 0;
    const requirementClass = classifyRequirement(ppf);

    const adjustmentPct = baseFocal > 0
      ? ((adjustedFocal - baseFocal) / baseFocal) * 100
      : 0;

    const widthPerMm = adjustedFocal > 0 ? input.tw / adjustedFocal : 0;

    const detailPressureMetric =
      ppf > 0
        ? ppf < 40 ? 85
        : ppf < 80 ? 60
        : ppf > 120 ? 20
        : 35
        : 25;

    const focalPressureMetric =
      adjustedFocal >= 12 ? 75
      : adjustedFocal >= 8 ? 45
      : adjustedFocal >= 4 ? 20
      : 10;

    const adjustmentMetric = Math.min(Math.abs(adjustmentPct) * 1.5, 100);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(detailPressureMetric, focalPressureMetric, adjustmentMetric),
      metrics: [
        {
          label: "Detail Pressure",
          value: detailPressureMetric,
          displayValue: ppf > 0 ? fmtPpf(ppf) : "No prior PPF"
        },
        {
          label: "Focal Demand",
          value: focalPressureMetric,
          displayValue: fmtMm(adjustedFocal)
        },
        {
          label: "Adjustment Shift",
          value: adjustmentMetric,
          displayValue: `${fmt(adjustmentPct, 1)}%`
        }
      ],
      healthyMax: 25,
      watchMax: 60
    });

    let dominantConstraint = "";
    if (ppf > 0 && ppf < 40) {
      dominantConstraint = "Detail pressure is the dominant limiter. The upstream pixel-density requirement is weak, so this tool is tightening focal length to recover usable subject detail.";
    } else if (adjustedFocal >= 12) {
      dominantConstraint = "Focal demand is the dominant limiter. The scene geometry is pushing the design toward a long-range lens class, which narrows field of view and reduces layout flexibility.";
    } else if (Math.abs(adjustmentPct) > 15) {
      dominantConstraint = "Adjustment shift is the dominant limiter. The lens choice has to move meaningfully away from the raw geometry solution to satisfy the prior detail requirement.";
    } else {
      dominantConstraint = "The lens requirement is balanced. Scene width, distance, and detail expectation are staying in a practical range for a standard lens choice.";
    }

    let guidance = "Verify the final option against the manufacturer’s real FOV chart before locking the bill of materials.";
    if (ppf > 0 && ppf < 40) {
      guidance = "Pixel density is low, so a tighter lens is recommended to recover detail. Re-check subject framing and verify that the scene width still matches the operational requirement.";
    } else if (ppf > 120) {
      guidance = "Pixel density is already strong, so a slightly wider lens may still be acceptable. Validate whether broader coverage is worth the detail tradeoff.";
    } else if (adjustedFocal >= 12) {
      guidance = "This is a long-range optic recommendation. Check depth-of-field, mounting precision, and scene alignment before treating it as final.";
    }

    const interpretation = `At ${fmtFt(input.dist)} with a target width of ${fmtFt(input.tw)} and a ${fmtMm(input.sw, 2)} sensor, the raw geometry calls for about ${fmtMm(baseFocal)}. After applying the upstream detail requirement, the adjusted recommendation becomes ${fmtMm(adjustedFocal)}, which falls into the ${lensClass} class. ${interp}`;

    return {
      ok: true,
      ...input,
      baseFocal,
      adjustedFocal,
      lensClass,
      ppf,
      requirementClass,
      adjustmentPct,
      widthPerMm,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      detailPressureMetric,
      focalPressureMetric,
      adjustmentMetric
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.lens, {
      category: CATEGORY,
      step: STEP,
      data: {
        focal: data.adjustedFocal,
        baseFocal: data.baseFocal,
        lensClass: data.lensClass,
        dist: data.dist,
        tw: data.tw,
        ppf: data.ppf,
        requirementClass: data.requirementClass,
        adjustmentPct: data.adjustmentPct,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Raw Focal Length", value: fmtMm(data.baseFocal) },
        { label: "Adjusted Focal Length", value: fmtMm(data.adjustedFocal) },
        { label: "Suggested Lens Class", value: data.lensClass },
        { label: "Upstream Detail Requirement", value: data.ppf > 0 ? data.requirementClass : "No prior PPF" }
      ],
      derivedRows: [
        { label: "Distance to Target", value: fmtFt(data.dist) },
        { label: "Target Width", value: fmtFt(data.tw) },
        { label: "Sensor Width", value: fmtMm(data.sw, 2) },
        { label: "Pixel Density Input", value: data.ppf > 0 ? fmtPpf(data.ppf) : "N/A" },
        { label: "Adjustment Shift", value: `${fmt(data.adjustmentPct, 1)}%` },
        { label: "Width per mm of Focal Length", value: data.widthPerMm > 0 ? `${fmt(data.widthPerMm, 2)} ft/mm` : "N/A" }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Detail Pressure", "Focal Demand", "Adjustment Shift"],
        values: [
          Number(data.detailPressureMetric.toFixed(1)),
          Number(data.focalPressureMetric.toFixed(1)),
          Number(data.adjustmentMetric.toFixed(1))
        ],
        displayValues: [
          data.ppf > 0 ? fmtPpf(data.ppf) : "No prior PPF",
          fmtMm(data.adjustedFocal),
          `${fmt(data.adjustmentPct, 1)}%`
        ],
        referenceValue: 25,
        healthyMax: 25,
        watchMax: 60,
        axisTitle: "Lens Selection Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
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
    ["dist", "tw", "sw"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);
    els.continueBtn?.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked) init();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        init();
      }
    }, 400);
  });
})();