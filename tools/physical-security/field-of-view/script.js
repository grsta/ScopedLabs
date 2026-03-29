(() => {
  const FLOW_KEYS = {
    scene: "scopedlabs:pipeline:physical-security:scene-illumination",
    mount: "scopedlabs:pipeline:physical-security:mounting-height",
    fov: "scopedlabs:pipeline:physical-security:field-of-view",
    area: "scopedlabs:pipeline:physical-security:camera-coverage-area"
  };

  const CATEGORY = "physical-security";
  const LANE = "v1";
  const STEP = "field-of-view";
  const PREVIOUS_STEP = "mounting-height";

  const $ = (id) => document.getElementById(id);

  const els = {
    dist: $("dist"),
    hfov: $("hfov"),
    scene: $("scene"),
    h: $("h"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    dist: 40,
    hfov: 90,
    scene: 60,
    h: 12
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

  function fmtRatio(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}x` : "—";
  }

  function fmtDeg(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}°` : "—";
  }

  function classifyFit(coverageRatio) {
    if (coverageRatio < 0.9) return "Too Narrow";
    if (coverageRatio <= 1.15) return "Good Fit";
    return "Too Wide";
  }

  function interpretationForFit(fitClass) {
    if (fitClass === "Too Narrow") {
      return "Current field of view does not cover the full target scene width. You will likely need a wider lens, shorter standoff distance, or more cameras.";
    }
    if (fitClass === "Good Fit") {
      return "Field of view is in a practical range for the intended scene width. This is a workable baseline for downstream coverage-area and spacing decisions.";
    }
    return "Field of view is wider than necessary for the target scene width. This improves coverage breadth, but may dilute detail and weaken identification performance.";
  }

  function lensGuidance(hfov) {
    if (hfov < 50) {
      return "This is a relatively tight view. Good for concentrating detail, but scene coverage width will be limited.";
    }
    if (hfov <= 90) {
      return "This is a balanced field of view for many general surveillance applications.";
    }
    return "This is a wide view. Useful for broad awareness, but watch for reduced target detail at the far edges of coverage.";
  }

  function clearDownstream() {
    sessionStorage.removeItem(FLOW_KEYS.area);
  }

  function applyDefaults() {
    els.dist.value = String(DEFAULTS.dist);
    els.hfov.value = String(DEFAULTS.hfov);
    els.scene.value = String(DEFAULTS.scene);
    els.h.value = String(DEFAULTS.h);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.fov,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow Context",
      intro: "This step uses the prior mounting-height recommendation to estimate how much scene width the selected field of view can realistically cover at the target distance."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const data = flow.data || {};
    const h = num(data.h || 0);
    const dist = num(data.dist || 0);
    const tilt = num(data.tilt || 0);
    const tiltClass = data.tiltClass || "";

    if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));
    if (Number.isFinite(h) && h > 0) els.h.value = String(Math.round(h));

    const parts = [];
    if (Number.isFinite(h) && h > 0) parts.push(`Mount height: <strong>${fmtFt(h)}</strong>`);
    if (Number.isFinite(dist) && dist > 0) parts.push(`Target distance: <strong>${fmtFt(dist)}</strong>`);
    if (Number.isFinite(tilt) && tilt > 0) parts.push(`Suggested tilt: <strong>${fmtDeg(tilt)}</strong>`);
    if (tiltClass) parts.push(`Angle quality: <strong>${tiltClass}</strong>`);

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Flow Context</strong><br>
        ${parts.join(" | ")}
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.fov);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.fov,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    renderFlowNote();
  }

  function getInputs() {
    const dist = num(els.dist.value);
    const hfov = num(els.hfov.value);
    const scene = num(els.scene.value);
    const h = num(els.h.value);

    if (
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(scene) || scene < 0 ||
      !Number.isFinite(h) || h < 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, dist, hfov, scene, h };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const sceneWidth = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const halfWidth = sceneWidth / 2;
    const coverageRatio = input.scene > 0 ? sceneWidth / input.scene : 0;
    const fitClass = classifyFit(coverageRatio);
    const fitText = interpretationForFit(fitClass);
    const lensText = lensGuidance(input.hfov);
    const diagonalReach = Math.sqrt((sceneWidth * sceneWidth) + (input.dist * input.dist));
    const widthPerFootHeight = input.h > 0 ? sceneWidth / input.h : 0;

    const interpretation = `At ${fmtFt(input.dist)}, a ${fmtDeg(input.hfov)} horizontal field of view covers about ${fmtFt(sceneWidth)} of scene width, or ${fmtFt(halfWidth)} to either side of centerline. Against the requested scene width of ${fmtFt(input.scene)}, the layout is classified as ${fitClass}. ${fitText}`;

    let dominantConstraint = "";
    if (fitClass === "Too Narrow") {
      dominantConstraint = "Fit pressure is the dominant limiter. The lens footprint is not wide enough for the target scene, so coverage gaps or extra cameras become the first downstream issue.";
    } else if (fitClass === "Too Wide") {
      dominantConstraint = "Lens breadth is the dominant limiter. You can cover the width, but the view is spreading scene detail across a broader footprint than necessary.";
    } else if (input.h > 0 && widthPerFootHeight > 8) {
      dominantConstraint = "Geometry spread is the dominant limiter. The scene width is expanding quickly relative to mount height, which can make detail distribution less efficient.";
    } else {
      dominantConstraint = "The field geometry is balanced. Distance, horizontal angle, and target scene width are aligned well enough for the next planning steps.";
    }

    let guidance = "";
    if (fitClass === "Too Narrow") {
      guidance = "Widen the lens, move closer, or plan on additional cameras before trusting this layout. Then continue to Coverage Area once the width fit is acceptable.";
    } else if (fitClass === "Too Wide") {
      guidance = "Coverage is broad enough, but verify whether this much width is actually desirable for the target detail level. Continue to Coverage Area to translate this width into usable scene footprint.";
    } else {
      guidance = "This is a workable starting point. Continue to Coverage Area to convert the lens footprint into usable width, height, and effective coverage after reserve is applied.";
    }

    return {
      ok: true,
      ...input,
      sceneWidth,
      halfWidth,
      coverageRatio,
      fitClass,
      fitText,
      lensText,
      diagonalReach,
      widthPerFootHeight,
      interpretation,
      dominantConstraint,
      guidance,
      status:
        fitClass === "Good Fit"
          ? "Healthy"
          : fitClass === "Too Wide"
            ? "Watch"
            : "Risk"
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.fov, {
      category: CATEGORY,
      step: STEP,
      data: {
        dist: data.dist,
        hfov: data.hfov,
        scene: data.scene,
        h: data.h,
        sceneWidth: data.sceneWidth,
        halfWidth: data.halfWidth,
        coverageRatio: data.coverageRatio,
        fitClass: data.fitClass,
        fitText: data.fitText,
        lensText: data.lensText,
        diagonalReach: data.diagonalReach,
        widthPerFootHeight: data.widthPerFootHeight,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Estimated Scene Width @ Distance", value: fmtFt(data.sceneWidth) },
        { label: "Half-Width from Centerline", value: fmtFt(data.halfWidth) },
        { label: "Target Scene Width", value: fmtFt(data.scene) },
        { label: "Coverage Fit", value: data.fitClass }
      ],
      derivedRows: [
        { label: "Coverage Ratio", value: data.scene > 0 ? fmtRatio(data.coverageRatio) : "N/A" },
        { label: "Approx. Diagonal Reach", value: fmtFt(data.diagonalReach) },
        { label: "Scene Width per Foot of Mount Height", value: data.h > 0 ? `${fmt(data.widthPerFootHeight, 2)} ft/ft` : "N/A" },
        { label: "Mount Height", value: fmtFt(data.h) },
        { label: "Lens Guidance", value: data.lensText }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
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
    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    ["dist", "hfov", "scene", "h"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    });
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
