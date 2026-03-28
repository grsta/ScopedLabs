(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEYS = {
    scene: "scopedlabs:pipeline:physical-security:scene-illumination",
    mount: "scopedlabs:pipeline:physical-security:mounting-height",
    fov: "scopedlabs:pipeline:physical-security:field-of-view",
    area: "scopedlabs:pipeline:physical-security:camera-coverage-area"
  };

  const CATEGORY = "physical-security";
  const LANE = "v1";
  const STEP = "mounting-height";
  const PREVIOUS_STEP = "scene-illumination";
  const NEXT_URL = "/tools/physical-security/field-of-view/";

  const els = {
    h: $("h"),
    dist: $("dist"),
    th: $("th"),
    vfov: $("vfov"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    h: 12,
    dist: 40,
    th: 5.5,
    vfov: 55
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function rad2deg(x) {
    return x * 180 / Math.PI;
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

  function fmtDeg(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}°` : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function applyDefaults() {
    els.h.value = String(DEFAULTS.h);
    els.dist.value = String(DEFAULTS.dist);
    els.th.value = String(DEFAULTS.th);
    els.vfov.value = String(DEFAULTS.vfov);
  }

  function classifyTilt(tilt) {
    if (tilt < 10) return "Too Shallow";
    if (tilt < 25) return "Balanced";
    if (tilt < 45) return "Strong";
    return "Too Steep";
  }

  function angleInterpretation(tilt) {
    if (tilt < 10) {
      return "Angle is very shallow. This tends to overemphasize the horizon, weakens face detail, and reduces practical identification quality.";
    }
    if (tilt < 25) {
      return "Angle is balanced for general surveillance. It supports broad situational awareness, but may still be light on subject detail for stronger identification tasks.";
    }
    if (tilt < 45) {
      return "Angle is strong for practical surveillance design. It usually provides a better compromise between coverage and usable subject geometry.";
    }
    return "Angle is steep. Coverage may still work, but top-down compression can reduce face detail and make subjects look visually flattened.";
    }

  function heightGuidance(h) {
    if (h < 9) {
      return "Mount height is relatively low. This can improve subject angle and detail, but raises tamper and vandalism risk.";
    }
    if (h <= 15) {
      return "Mount height is in a practical working range for many building exteriors and perimeter applications.";
    }
    return "Mount height is relatively high. This helps with tamper resistance and broad coverage, but can hurt identification geometry if tilt becomes too steep.";
  }

  function clearDownstream() {
    sessionStorage.removeItem(FLOW_KEYS.fov);
    sessionStorage.removeItem(FLOW_KEYS.area);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.mount,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow context",
      intro: "This step uses the prior illumination plan to choose a workable install height before locking field of view."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const data = flow.data || {};
    const area = num(data.area || 0);
    const fc = num(data.fc || 0);
    const lumens = num(data.lumens || 0);

    const parts = [];
    if (area > 0) parts.push(`area <strong>${fmt(area, 0)} sq ft</strong>`);
    if (fc > 0) parts.push(`target illumination <strong>${fmt(fc, 2)} fc</strong>`);
    if (lumens > 0) parts.push(`estimated lumen requirement <strong>${fmt(lumens, 0)} lm</strong>`);

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Flow context</strong><br>
        Prior scene-illumination results detected — ${parts.join(", ")}.
        Use mounting height to balance subject angle and scene coverage before locking field of view.
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstream();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEYS.mount,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });
    ScopedLabsAnalyzer.hideContinue(null, els.continueBtn);
    renderFlowNote();
  }

  function getInputs() {
    const h = num(els.h.value);
    const dist = num(els.dist.value);
    const th = num(els.th.value);
    const vfov = num(els.vfov.value);

    if (
      !Number.isFinite(h) || h < 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(th) || th < 0 ||
      !Number.isFinite(vfov) || vfov <= 0 || vfov >= 180
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, h, dist, th, vfov };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const drop = input.h - input.th;
    const tilt = rad2deg(Math.atan2(drop, input.dist));
    const span = 2 * Math.tan(deg2rad(input.vfov / 2)) * input.dist;
    const topEdgeHeight = input.h - Math.tan(deg2rad(Math.max(0, tilt - (input.vfov / 2)))) * input.dist;
    const bottomEdgeHeight = input.h - Math.tan(deg2rad(tilt + (input.vfov / 2))) * input.dist;

    const tiltClass = classifyTilt(tilt);
    const angleText = angleInterpretation(tilt);
    const heightText = heightGuidance(input.h);

    const subjectAngleMetric =
      tilt < 10 ? 85 :
      tilt < 25 ? 35 :
      tilt < 45 ? 18 :
      78;

    const mountPressureMetric =
      input.h < 9 ? 42 :
      input.h <= 15 ? 18 :
      55;

    const framingPressureMetric =
      bottomEdgeHeight > 0 ? Math.min(bottomEdgeHeight * 12, 100) :
      topEdgeHeight < input.th ? Math.min((input.th - topEdgeHeight) * 10, 100) :
      12;

    const metrics = [
      {
        label: "Subject Angle",
        value: subjectAngleMetric,
        displayValue: fmtDeg(tilt)
      },
      {
        label: "Mount Height Pressure",
        value: mountPressureMetric,
        displayValue: fmtFt(input.h)
      },
      {
        label: "Vertical Framing Risk",
        value: framingPressureMetric,
        displayValue: `${fmtFt(topEdgeHeight)} to ${fmtFt(bottomEdgeHeight)}`
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(subjectAngleMetric, mountPressureMetric, framingPressureMetric),
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let dominantConstraint = "";
    if (tilt < 10) {
      dominantConstraint = "Subject angle is the dominant limiter. The camera is looking too shallow across the scene, which weakens practical face detail and identification geometry.";
    } else if (tilt >= 45) {
      dominantConstraint = "Subject angle is the dominant limiter. The camera is looking too steeply downward, which compresses subjects and reduces usable face detail.";
    } else if (input.h > 15) {
      dominantConstraint = "Mount height pressure is the dominant limiter. The install point is high enough that tamper resistance improves, but usable subject geometry starts to suffer.";
    } else if (bottomEdgeHeight > 0) {
      dominantConstraint = "Vertical framing risk is the dominant limiter. The lower edge of view is still floating above grade at the target distance, so ground-level coverage is not fully closing.";
    } else {
      dominantConstraint = "The geometry is balanced. Mount height, target distance, and vertical framing remain in a practical range for the next field-of-view step.";
    }

    const interpretation = `With a mount height of ${fmtFt(input.h)} and a target point ${fmtFt(input.dist)} away at ${fmtFt(input.th)}, the suggested down-tilt is about ${fmtDeg(tilt)}. At that distance, a ${fmtDeg(input.vfov)} vertical field of view spans about ${fmtFt(span)} vertically, with the view landing from roughly ${fmtFt(topEdgeHeight)} down to ${fmtFt(bottomEdgeHeight)}. ${angleText}`;

    let guidance = "";
    if (tilt < 10) {
      guidance = "Lower the mount, move the target zone farther out, or tighten vertical framing before locking the design. Then continue to Field of View once subject angle is healthier.";
    } else if (tilt >= 45) {
      guidance = "Reduce mount height or increase standoff distance before finalizing the view. Excessive top-down angle can make downstream detail goals harder to reach.";
    } else if (bottomEdgeHeight > 0) {
      guidance = "Check whether the lower edge of view needs to reach grade at the target distance. If so, revise height or angle assumptions before moving forward.";
    } else {
      guidance = "Mounting geometry is workable. Continue to Field of View next to translate this setup into actual scene width coverage.";
    }

    return {
      ok: true,
      ...input,
      drop,
      tilt,
      span,
      topEdgeHeight,
      bottomEdgeHeight,
      tiltClass,
      angleText,
      heightText,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.mount, {
      category: CATEGORY,
      step: STEP,
      data: {
        h: data.h,
        dist: data.dist,
        th: data.th,
        vfov: data.vfov,
        drop: data.drop,
        tilt: data.tilt,
        span: data.span,
        topEdgeHeight: data.topEdgeHeight,
        bottomEdgeHeight: data.bottomEdgeHeight,
        tiltClass: data.tiltClass,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(null, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Vertical Drop", value: fmtFt(data.drop) },
        { label: "Suggested Down-Tilt", value: fmtDeg(data.tilt) },
        { label: "Vertical Coverage Span", value: fmtFt(data.span) },
        { label: "Angle Quality", value: data.tiltClass }
      ],
      derivedRows: [
        { label: "Approx. Top of View @ Distance", value: fmtFt(data.topEdgeHeight) },
        { label: "Approx. Bottom of View @ Distance", value: fmtFt(data.bottomEdgeHeight) },
        { label: "Mount Height", value: fmtFt(data.h) },
        { label: "Target Distance", value: fmtFt(data.dist) },
        { label: "Target Height", value: fmtFt(data.th) },
        { label: "Height Guidance", value: data.heightText }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(null, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["h", "dist", "th", "vfov"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    if (els.calc) els.calc.addEventListener("click", calc);
    if (els.reset) els.reset.addEventListener("click", reset);
    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = NEXT_URL;
      });
    }
  }

  function init() {
    ScopedLabsAnalyzer.hideContinue(null, els.continueBtn);
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", init);
})();