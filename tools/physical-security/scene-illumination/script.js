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
  const STEP = "scene-illumination";
  const NEXT_URL = "/tools/physical-security/mounting-height/";

  const els = {
    w: $("w"),
    d: $("d"),
    fc: $("fc"),
    uf: $("uf"),
    llf: $("llf"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    w: 60,
    d: 40,
    fc: 2.0,
    uf: 70,
    llf: 80
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtSqFt(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} sq ft` : "—";
  }

  function fmtFc(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} fc` : "—";
  }

  function fmtPct(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtLumens(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} lm` : "—";
  }

  function fmtFactor(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function hideContinue() {
    if (els.continueBtn) els.continueBtn.style.display = "none";
  }

  function showContinue() {
    if (els.continueBtn) els.continueBtn.style.display = "inline-flex";
  }

  function applyDefaults() {
    els.w.value = String(DEFAULTS.w);
    els.d.value = String(DEFAULTS.d);
    els.fc.value = String(DEFAULTS.fc);
    els.uf.value = String(DEFAULTS.uf);
    els.llf.value = String(DEFAULTS.llf);
  }

  function classifyFootcandles(fc) {
    if (fc < 1) return "Very Low";
    if (fc < 3) return "Low Light";
    if (fc < 10) return "Moderate";
    return "High";
  }

  function suitability(fc) {
    if (fc < 1) return "Scene illumination is very weak. The design will depend heavily on IR, aggressive gain, or extreme low-light camera behavior, which raises noise and reduces dependable evidence quality.";
    if (fc < 3) return "Lighting is workable for general awareness, but still light-starved for stronger identification work. Exposure stress, blur, and color loss are more likely in real conditions.";
    if (fc < 10) return "Lighting is in a practical planning range for many exterior and perimeter scenes. Cameras should perform more comfortably, especially for general surveillance and improved image clarity.";
    return "Lighting is strong and gives the optical design a healthier starting point. Better exposure control and lower low-light stress improve downstream detail performance.";
  }

  function nextStepGuidance(fc, lumens, area) {
    if (fc < 2) return "Before moving into mounting height and field-of-view decisions, confirm whether fixture output or lighting strategy should be improved. Weak illumination can undermine otherwise-correct camera geometry.";
    if (lumens > 30000 && area < 5000) return "Required lumen output is aggressive for the scene size. Re-check whether the footcandle target is truly necessary, or whether fixture aiming and zone coverage should be adjusted.";
    return "This lighting baseline is workable for continuing into mounting height and field-of-view design. Next steps should validate angle, coverage, and detail against the surveillance objective.";
  }

  function clearDownstream() {
    sessionStorage.removeItem(FLOW_KEYS.mount);
    sessionStorage.removeItem(FLOW_KEYS.fov);
    sessionStorage.removeItem(FLOW_KEYS.area);
  }

  function renderFlowNote() {
    if (!els.flowNote) return;
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstream();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEYS.scene,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hideContinue();
    renderFlowNote();
  }

  function getInputs() {
    const w = Math.max(0, num(els.w.value, 0));
    const d = Math.max(0, num(els.d.value, 0));
    const fc = Math.max(0, num(els.fc.value, 0));
    const ufPct = num(els.uf.value);
    const llfPct = num(els.llf.value);

    if (
      !Number.isFinite(w) || w <= 0 ||
      !Number.isFinite(d) || d <= 0 ||
      !Number.isFinite(fc) || fc <= 0 ||
      !Number.isFinite(ufPct) || ufPct <= 0 || ufPct > 100 ||
      !Number.isFinite(llfPct) || llfPct <= 0 || llfPct > 100
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, w, d, fc, ufPct, llfPct, uf: ufPct / 100, llf: llfPct / 100 };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const area = input.w * input.d;
    const effectiveFactor = Math.max(0.05, input.uf * input.llf);
    const lumens = (input.fc * area) / effectiveFactor;

    const lightingClass = classifyFootcandles(input.fc);
    const interpretationBase = suitability(input.fc);
    const nextGuidance = nextStepGuidance(input.fc, lumens, area);

    const factorPressureMetric = Math.min(((1 - effectiveFactor) / 0.95) * 100, 100);
    const targetDemandMetric = input.fc >= 10 ? 65 : input.fc >= 3 ? 30 : input.fc >= 1 ? 15 : 5;
    const outputLoadMetric = area > 0 ? Math.min((lumens / area) * 8, 100) : 0;

    const metrics = [
      { label: "Planning Factor Pressure", value: factorPressureMetric, displayValue: fmtFactor(effectiveFactor) },
      { label: "Illumination Demand", value: targetDemandMetric, displayValue: fmtFc(input.fc) },
      { label: "Output Load", value: outputLoadMetric, displayValue: `${fmt(lumens / area, 2)} lm/sq ft` }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(factorPressureMetric, targetDemandMetric, outputLoadMetric),
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let dominantConstraint = "";
    if (effectiveFactor < 0.45) dominantConstraint = "Planning factor pressure is the dominant limiter. Too much fixture output is being lost through utilization and light-loss assumptions, so the scene demands more lumens than it first appears.";
    else if (input.fc >= 10) dominantConstraint = "Illumination demand is the dominant limiter. The target light level is relatively aggressive, which can drive fixture count and power requirements upward quickly.";
    else if ((lumens / area) > 6) dominantConstraint = "Output load is the dominant limiter. Required lumens per square foot are climbing enough that fixture strategy and aiming deserve closer review.";
    else dominantConstraint = "The lighting baseline is balanced. Scene size, target illumination, and planning factors are staying in a practical range for downstream camera design.";

    const interpretation = `For an area of ${fmtSqFt(area)} at a target of ${fmtFc(input.fc)}, with a utilization factor of ${fmtPct(input.ufPct)} and light-loss factor of ${fmtPct(input.llfPct)}, the effective planning factor is ${fmtFactor(effectiveFactor)}. The estimated lumen requirement is about ${fmtLumens(lumens)}. Lighting condition is classified as ${lightingClass}. ${interpretationBase}`;

    return {
      ok: true,
      ...input,
      area,
      effectiveFactor,
      lumens,
      lightingClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance: nextGuidance
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.scene, {
      category: CATEGORY,
      step: STEP,
      data: {
        w: data.w,
        d: data.d,
        fc: data.fc,
        uf: data.uf,
        llf: data.llf,
        area: data.area,
        effectiveFactor: data.effectiveFactor,
        lumens: data.lumens,
        lightingClass: data.lightingClass,
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
        { label: "Area", value: fmtSqFt(data.area) },
        { label: "Target Illumination", value: fmtFc(data.fc) },
        { label: "Effective Planning Factor", value: fmtFactor(data.effectiveFactor) },
        { label: "Estimated Lumens Required", value: fmtLumens(data.lumens) }
      ],
      derivedRows: [
        { label: "Area Width", value: `${fmt(data.w, 0)} ft` },
        { label: "Area Depth", value: `${fmt(data.d, 0)} ft` },
        { label: "Utilization Factor", value: fmtPct(data.ufPct) },
        { label: "Light Loss Factor", value: fmtPct(data.llfPct) },
        { label: "Lighting Condition", value: data.lightingClass },
        { label: "Lumen Density", value: `${fmt(data.lumens / data.area, 2)} lm/sq ft` }
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
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["w", "d", "fc", "uf", "llf"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);
    els.continueBtn?.addEventListener("click", () => { window.location.href = NEXT_URL; });
  }

  function init() {
    hideContinue();
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", init);
})();