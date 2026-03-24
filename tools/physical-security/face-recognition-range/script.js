(() => {
  const KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "physical-security";
  const STEP = "face-recognition-range";
  const PREVIOUS_STEP = "lens-selection";
  const NEXT_URL = "/tools/physical-security/license-plate-range/";

  const $ = (id) => document.getElementById(id);

  const els = {
    res: $("res"),
    hfov: $("hfov"),
    ppf: $("ppf"),
    fw: $("fw"),
    dist: $("dist"),
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
    ppf: 250,
    fw: 0.6,
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

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtPx(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} px` : "—";
  }

  function applyDefaults() {
    els.res.value = String(DEFAULTS.res);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ppf.value = String(DEFAULTS.ppf);
    els.fw.value = String(DEFAULTS.fw);
    els.dist.value = String(DEFAULTS.dist);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: KEY,
      category: CATEGORY,
      step: STEP,
      title: "Flow context",
      intro: "This step checks how far the chosen lens can still hold facial-recognition detail before identification quality starts falling away."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const prev = flow.data || {};
    const focal = num(prev.focal);
    const hfov = num(prev.hfov);
    const dist = num(prev.dist);
    const lensClass = prev.lensClass || "";

    if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Math.round(hfov));
    if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));

    const parts = [];
    if (lensClass) parts.push(`lens <strong>${lensClass}</strong>`);
    if (Number.isFinite(focal) && focal > 0) parts.push(`~<strong>${fmt(focal, 1)} mm</strong>`);
    if (Number.isFinite(hfov) && hfov > 0) parts.push(`HFOV <strong>${fmt(hfov, 1)}°</strong>`);
    if (Number.isFinite(dist) && dist > 0) parts.push(`target distance <strong>${fmtFt(dist)}</strong>`);

    if (parts.length) {
      els.flowNote.style.display = "";
      els.flowNote.innerHTML = `
        <strong>Flow context</strong><br>
        Prior lens-selection results detected — ${parts.join(", ")}.
        This step checks whether that optic can still deliver the face detail needed at the intended working distance.
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
    const ppf = num(els.ppf.value);
    const fw = num(els.fw.value);
    const dist = num(els.dist.value);

    if (
      !Number.isFinite(res) || res <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ppf) || ppf <= 0 ||
      !Number.isFinite(fw) || fw <= 0 ||
      !Number.isFinite(dist) || dist <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, res, hfov, ppf, fw, dist };
  }

  function classifyRequirement(ppf) {
    if (ppf >= 300) return "Identification";
    if (ppf >= 250) return "Strong Recognition";
    if (ppf >= 180) return "Recognition";
    return "Basic Facial Detail";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const maxDist = (input.res * input.fw) / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.ppf);
    const marginFt = maxDist - input.dist;
    const utilizationPct = maxDist > 0 ? (input.dist / maxDist) * 100 : 100;
    const deliveredPpf = (input.res * input.fw) / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist);

    const shortfallMetric = marginFt < 0 ? Math.min(Math.abs(marginFt / maxDist) * 100, 100) : 0;
    const utilizationMetric = ScopedLabsAnalyzer.clamp(utilizationPct, 0, 100);
    const requirementMetric = input.ppf >= 300 ? 30 : input.ppf >= 250 ? 20 : input.ppf >= 180 ? 10 : 5;

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
        label: "Recognition Requirement",
        value: requirementMetric,
        displayValue: fmtPx(input.ppf)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(utilizationMetric, shortfallMetric, requirementMetric),
      metrics,
      healthyMax: 75,
      watchMax: 95
    });

    const classification = classifyRequirement(input.ppf);

    let interpretation = `With ${fmtPx(input.res)} horizontal resolution, ${fmt(input.hfov, 1)}° HFOV, and a face width assumption of ${fmtFt(input.fw, 2)}, the modeled maximum distance to hold ${fmtPx(input.ppf)} is about ${fmtFt(maxDist)}. At the entered working distance of ${fmtFt(input.dist)}, the scene would deliver roughly ${fmtPx(deliveredPpf)} across the face.`;

    if (marginFt < 0) {
      interpretation += ` The target is beyond the modeled recognition envelope, so face detail falls off before the requested distance is reached.`;
    } else if (utilizationPct > 95) {
      interpretation += ` The target distance is right at the edge of the recognition envelope, so mounting error, lighting loss, compression, or motion blur can easily push performance below the requirement.`;
    } else if (utilizationPct > 75) {
      interpretation += ` The optic can support the requirement, but most of the available recognition range is already being consumed. Field conditions will matter.`;
    } else {
      interpretation += ` The optic still has usable range margin, so the design is not yet riding the edge of facial-recognition performance.`;
    }

    let dominantConstraint = "";
    if (marginFt < 0) {
      dominantConstraint = "Distance shortfall is the dominant limiter. The target range exceeds what the current resolution, field of view, and facial-detail requirement can support.";
    } else if (utilizationPct > 95) {
      dominantConstraint = "Range utilization is the dominant limiter. The design is operating at the boundary, where any real-world degradation becomes operationally meaningful.";
    } else if (input.ppf >= 300) {
      dominantConstraint = "Recognition requirement is the dominant limiter. The design is being held to an identification-grade standard, which compresses usable range more aggressively.";
    } else {
      dominantConstraint = "The lens and recognition requirement are reasonably balanced. The design still has measurable working-distance headroom.";
    }

    let guidance = "";
    if (marginFt < 0) {
      guidance = "Tighten the field of view, increase resolution, reduce working distance, or lower the facial-detail target before relying on this lens for recognition at that range.";
    } else if (utilizationPct > 95) {
      guidance = "Treat this as edge-of-range performance. Validate on the real mounting angle and scene lighting before finalizing the design.";
    } else if (utilizationPct > 75) {
      guidance = "The design is workable, but verify lighting, shutter behavior, and subject motion because the recognition margin is not generous.";
    } else {
      guidance = "Recognition range has practical headroom. Continue to License Plate next if the same corridor or approach lane also needs vehicle detail validation.";
    }

    return {
      ok: true,
      ...input,
      maxDist,
      marginFt,
      utilizationPct,
      deliveredPpf,
      classification,
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
        dist: data.maxDist,
        actualDist: data.dist,
        hfov: data.hfov,
        ppf: data.ppf,
        deliveredPpf: data.deliveredPpf,
        classification: data.classification,
        marginFt: data.marginFt,
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
        { label: "Target Requirement", value: data.classification },
        { label: "Max Recognition Distance", value: fmtFt(data.maxDist) },
        { label: "Actual Working Distance", value: fmtFt(data.dist) },
        { label: "Range Margin", value: data.marginFt >= 0 ? fmtFt(data.marginFt) : `-${fmtFt(Math.abs(data.marginFt))}` }
      ],
      derivedRows: [
        { label: "Horizontal Resolution", value: fmtPx(data.res) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Target Pixels per Face", value: fmtPx(data.ppf) },
        { label: "Delivered Pixels per Face", value: fmtPx(data.deliveredPpf, 1) },
        { label: "Face Width Assumption", value: fmtFt(data.fw, 2) },
        { label: "Range Utilization", value: fmtPct(data.utilizationPct) }
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
    ["res", "hfov", "ppf", "fw", "dist"].forEach((id) => {
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