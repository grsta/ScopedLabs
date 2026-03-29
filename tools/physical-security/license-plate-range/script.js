(() => {
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
  const NEXT_URL = "/tools/physical-security/";

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
    continueBtn: $("continue")
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

  function hideContinue() {
    if (els.continueBtn) els.continueBtn.style.display = "none";
  }

  function showContinue() {
    if (els.continueBtn) els.continueBtn.style.display = "inline-flex";
  }

  function applyDefaults() {
    els.res.value = "3840";
    els.hfov.value = "50";
    els.ppp.value = "130";
    els.pw.value = "1.0";
    els.dist.value = "60";
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow context",
      intro: "This step checks whether the upstream optical setup can also deliver readable license-plate detail at the intended working distance."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const prev = flow.data || {};
    const dist = num(prev.actualDist ?? prev.dist);
    const classification = prev.classification || "";
    const focal = num(prev.focal);
    const lensClass = prev.lensClass || "";

    if (Number.isFinite(dist) && dist > 0) {
      els.dist.value = String(Math.round(dist));
    }

    const parts = [];
    if (classification) {
      parts.push(`face requirement <strong>${classification}</strong>`);
    }
    if (Number.isFinite(dist) && dist > 0) {
      parts.push(`working distance <strong>${fmtFt(dist)}</strong>`);
    }
    if (lensClass) {
      let lensText = `lens <strong>${lensClass}</strong>`;
      if (Number.isFinite(focal) && focal > 0) {
        lensText += ` (~${fmt(focal, 1)} mm)`;
      }
      parts.push(lensText);
    }

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Flow context</strong><br>
        Prior face-recognition results detected — ${parts.join(", ")}.
        This step checks whether that same optical setup can also support readable license plate capture.
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.plate);
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEYS.plate,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hideContinue();
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

    const maxDist = (input.res * input.pw) / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.ppp);
    const marginFt = maxDist - input.dist;
    const utilizationPct = maxDist > 0 ? (input.dist / maxDist) * 100 : 100;
    const deliveredPpp = (input.res * input.pw) / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist);

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

    const metrics = [
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
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(utilizationMetric, shortfallMetric, requirementMetric),
      metrics,
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
      guidance
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
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideContinue();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
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
      guidance: data.guidance
    });

    writeFlow(data);
    showContinue();
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
    els.continueBtn?.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    hideContinue();
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", init);
})();