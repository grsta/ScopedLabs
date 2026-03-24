(() => {
  const $ = (id) => document.getElementById(id);

  const KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "physical-security";
  const STEP = "pixel-density";
  const PREVIOUS_STEP = "blind-spot-check";
  const NEXT_URL = "/tools/physical-security/lens-selection/";

  const els = {
    res: $("res"),
    hfov: $("hfov"),
    dist: $("dist"),
    tppf: $("tppf"),
    tw: $("tw"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    res: 3840,
    hfov: 90,
    dist: 60,
    tppf: 80,
    tw: 10
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

  function fmtPpf(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} PPF` : "—";
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
    els.dist.value = String(DEFAULTS.dist);
    els.tppf.value = String(DEFAULTS.tppf);
    els.tw.value = String(DEFAULTS.tw);
  }

  function classify(ppf) {
    if (ppf < 20) return "Below Detection";
    if (ppf < 40) return "Detection";
    if (ppf < 80) return "Observation";
    if (ppf < 120) return "Recognition";
    return "Identification";
  }

  function levelInterpretation(level) {
    if (level === "Below Detection") {
      return "Detail is too weak for reliable subject interpretation. You may see motion or presence, but usable evidence quality is not there.";
    }
    if (level === "Detection") {
      return "Basic subject detection is possible, but scene detail is still limited. This is not a comfortable range for meaningful recognition.";
    }
    if (level === "Observation") {
      return "General activity monitoring is achievable, but facial or object detail is still modest. This supports awareness more than confident recognition.";
    }
    if (level === "Recognition") {
      return "Scene detail is strong enough for practical recognition work. Faces or distinguishing subject features should be meaningfully visible under decent field conditions.";
    }
    return "Pixel density is strong enough for identification-grade detail, assuming lighting, motion, compression, and angle do not erode the image too heavily.";
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: KEY,
      category: CATEGORY,
      step: STEP,
      title: "Flow context",
      intro: "This step verifies whether the blind-spot-safe layout also delivers enough subject detail at the working distance."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const prev = flow.data || {};
    const dist = num(prev.dist);
    const hfov = num(prev.hfov);
    const status = prev.status || "";
    const gap = num(prev.gap);

    if (Number.isFinite(dist) && dist > 0) {
      els.dist.value = String(Math.round(dist));
    }
    if (Number.isFinite(hfov) && hfov > 0) {
      els.hfov.value = String(Math.round(hfov));
    }

    const parts = [];
    if (status) {
      parts.push(`blind-spot result <strong>${status}</strong>`);
    }
    if (Number.isFinite(dist) && dist > 0) {
      parts.push(`distance <strong>${fmtFt(dist)}</strong>`);
    }
    if (Number.isFinite(hfov) && hfov > 0) {
      parts.push(`HFOV <strong>${fmt(hfov, 1)}°</strong>`);
    }
    if (Number.isFinite(gap)) {
      parts.push(`gap <strong>${fmtFt(gap)}</strong>`);
    }

    if (parts.length) {
      els.flowNote.style.display = "";
      els.flowNote.innerHTML = `
        <strong>Flow context</strong><br>
        Prior blind-spot results detected — ${parts.join(", ")}.
        This step checks whether that same geometry also produces enough pixel density for the detail level you need.
      `;
    }
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: KEY,
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Enter values and press Calculate."
    });
    ScopedLabsAnalyzer.hideContinue(els.continueBtn);
    renderFlowNote();
  }

  function getInputs() {
    const res = num(els.res.value);
    const hfov = num(els.hfov.value);
    const dist = num(els.dist.value);
    const tppf = num(els.tppf.value);
    const tw = num(els.tw.value);

    if (
      !Number.isFinite(res) || res <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(tppf) || tppf <= 0 ||
      !Number.isFinite(tw) || tw <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, res, hfov, dist, tppf, tw };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const sceneW = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const ppf = input.res / sceneW;
    const distForTppf = input.res / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.tppf);
    const pixelsOnTarget = ppf * input.tw;
    const level = classify(ppf);

    const targetGapPct = input.tppf > 0 ? ((input.tppf - ppf) / input.tppf) * 100 : 0;
    const shortfallMetric = ppf < input.tppf
      ? ScopedLabsAnalyzer.clamp(targetGapPct, 0, 100)
      : 0;

    const utilizationPct = distForTppf > 0 ? (input.dist / distForTppf) * 100 : 100;
    const utilizationMetric = ScopedLabsAnalyzer.clamp(utilizationPct, 0, 100);

    const requirementMetric =
      input.tppf >= 120 ? 30 :
      input.tppf >= 80 ? 20 :
      input.tppf >= 40 ? 10 : 5;

    const metrics = [
      {
        label: "Detail Utilization",
        value: utilizationMetric,
        displayValue: fmtPct(utilizationPct)
      },
      {
        label: "PPF Shortfall",
        value: shortfallMetric,
        displayValue: ppf < input.tppf ? fmtPpf(input.tppf - ppf) : "0.0 PPF"
      },
      {
        label: "Target Detail Demand",
        value: requirementMetric,
        displayValue: fmtPpf(input.tppf)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(utilizationMetric, shortfallMetric, requirementMetric),
      metrics,
      healthyMax: 75,
      watchMax: 95
    });

    const interp = levelInterpretation(level);

    let dominantConstraint = "";
    if (ppf < input.tppf) {
      dominantConstraint = "PPF shortfall is the dominant limiter. The current geometry is not delivering the target detail level at the entered working distance.";
    } else if (utilizationPct > 95) {
      dominantConstraint = "Detail utilization is the dominant limiter. The design is operating right at the edge of the usable detail envelope, so real-world losses will matter.";
    } else if (input.tppf >= 120) {
      dominantConstraint = "Target detail demand is the dominant limiter. The design is being held to an identification-grade requirement, which compresses working-distance headroom quickly.";
    } else {
      dominantConstraint = "Pixel density is reasonably balanced against the target detail requirement. The layout still has usable headroom.";
    }

    const interpretation = `At ${fmtFt(input.dist)} with ${fmt(input.hfov, 1)}° HFOV and ${fmtPx(input.res)} horizontal resolution, the scene width is about ${fmtFt(sceneW)}, producing roughly ${fmtPpf(ppf)}. That places the current layout in the ${level} range. ${interp}`;

    let guidance = "";
    if (ppf < input.tppf) {
      guidance = "Tighten the field of view, move closer, raise resolution, or narrow the target width before relying on this layout for the requested detail level.";
    } else if (utilizationPct > 95) {
      guidance = "This is edge-of-envelope detail performance. Validate compression, lighting, motion, and subject angle before finalizing the layout.";
    } else if (utilizationPct > 75) {
      guidance = "The layout is workable, but most of the available detail range is already being used. Verify whether you want more headroom before locking optics.";
    } else {
      guidance = "Pixel density has practical headroom. Continue to Lens Selection next so the optical choice stays aligned with the detail requirement you just validated.";
    }

    return {
      ok: true,
      ...input,
      sceneW,
      ppf,
      distForTppf,
      pixelsOnTarget,
      level,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    sessionStorage.setItem(KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        ppf: data.ppf,
        level: data.level,
        dist: data.dist,
        hfov: data.hfov,
        tppf: data.tppf,
        sceneW: data.sceneW,
        pixelsOnTarget: data.pixelsOnTarget,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    }));
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Scene Width", value: fmtFt(data.sceneW) },
        { label: "Pixel Density", value: fmtPpf(data.ppf) },
        { label: "Performance Level", value: data.level },
        { label: "Distance for Target PPF", value: fmtFt(data.distForTppf) }
      ],
      derivedRows: [
        { label: "Horizontal Resolution", value: fmtPx(data.res) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Target Pixel Density", value: fmtPpf(data.tppf) },
        { label: "Target Width", value: fmtFt(data.tw) },
        { label: "Pixels on Target", value: fmtPx(data.pixelsOnTarget, 0) },
        { label: "Working Distance Utilization", value: fmtPct((data.dist / data.distForTppf) * 100) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueBtn);
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
    invalidate();
  }

  function bind() {
    ["res", "hfov", "dist", "tppf", "tw"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
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
    ScopedLabsAnalyzer.hideContinue(els.continueBtn);
    bind();
    renderFlowNote();
    invalidate();
  }

  window.addEventListener("DOMContentLoaded", init);
})();