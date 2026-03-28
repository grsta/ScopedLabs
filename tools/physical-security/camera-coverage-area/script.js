(() => {
  const FLOW_KEYS = {
    scene: "scopedlabs:pipeline:physical-security:scene-illumination",
    mount: "scopedlabs:pipeline:physical-security:mounting-height",
    fov: "scopedlabs:pipeline:physical-security:field-of-view",
    area: "scopedlabs:pipeline:physical-security:camera-coverage-area"
  };

  const CATEGORY = "physical-security";
  const LANE = "v1";
  const STEP = "camera-coverage-area";
  const PREVIOUS_STEP = "field-of-view";
  const NEXT_URL = "/tools/physical-security/camera-spacing/";

  const $ = (id) => document.getElementById(id);

  const els = {
    hfov: $("hfov"),
    vfov: $("vfov"),
    dist: $("dist"),
    ov: $("ov"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueBtn: $("continue")
  };

  const DEFAULTS = { hfov: 90, vfov: 55, dist: 60, ov: 15 };

  function num(value, fallback = NaN) { return ScopedLabsAnalyzer.safeNumber(value, fallback); }
  function deg2rad(deg) { return (deg * Math.PI) / 180; }
  function fmt(value, digits = 1) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }
  function fmtFt(value, digits = 1) { return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—"; }
  function fmtSqFt(value, digits = 0) { return Number.isFinite(value) ? `${value.toFixed(digits)} sq ft` : "—"; }
  function fmtPct(value, digits = 0) { return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—"; }

  function hideContinue() { if (els.continueBtn) els.continueBtn.style.display = "none"; }
  function showContinue() { if (els.continueBtn) els.continueBtn.style.display = "inline-flex"; }

  function classifyOverlap(ovPct) {
    if (ovPct < 10) return "Low Overlap";
    if (ovPct <= 25) return "Balanced Overlap";
    return "High Overlap";
  }

  function classifyCoverageEfficiency(effAreaRatioPct) {
    if (effAreaRatioPct < 65) return "Heavy Reserve";
    if (effAreaRatioPct < 85) return "Practical Reserve";
    return "Minimal Reserve";
  }

  function overlapInterpretation(overlapClass) {
    if (overlapClass === "Low Overlap") return "Low overlap maximizes individual camera footprint, but increases the chance of soft gaps between adjacent views.";
    if (overlapClass === "Balanced Overlap") return "Balanced overlap is usually the best planning range for continuous scene coverage without wasting too much usable width.";
    return "High overlap improves continuity and handoff between cameras, but reduces usable coverage efficiency and can increase camera count.";
  }

  function reserveGuidance(effWidthRatioPct) {
    if (effWidthRatioPct < 70) return "Usable width drops quickly once overlap reserve gets aggressive. This is appropriate when continuity matters more than raw coverage efficiency.";
    if (effWidthRatioPct < 90) return "This is a healthy reserve range for many practical layouts. You preserve usable width while still protecting against blind edges.";
    return "Very little width is being reserved for overlap. Coverage efficiency is high, but spacing tolerance between cameras will be tighter.";
  }

  function applyDefaults() {
    els.hfov.value = String(DEFAULTS.hfov);
    els.vfov.value = String(DEFAULTS.vfov);
    els.dist.value = String(DEFAULTS.dist);
    els.ov.value = String(DEFAULTS.ov);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow context",
      intro: "This step converts field-of-view results into real usable scene coverage after overlap reserve is applied."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const data = flow.data || {};
    const sceneWidth = num(data.sceneWidth, 0);
    const dist = num(data.dist, 0);
    const hfov = num(data.hfov, 0);
    const fitClass = data.fitClass || "";

    if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));
    if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Math.round(hfov));

    const parts = [];
    if (sceneWidth > 0) parts.push(`scene width <strong>${fmtFt(sceneWidth)}</strong>`);
    if (dist > 0) parts.push(`distance <strong>${fmtFt(dist)}</strong>`);
    if (hfov > 0) parts.push(`HFOV <strong>${fmt(hfov, 1)}°</strong>`);
    if (fitClass) parts.push(`classified as <strong>${fitClass}</strong>`);

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `<strong>Flow context</strong><br>Prior field-of-view results detected — ${parts.join(", ")}. This step converts that lens width into real usable coverage after overlap reserve is applied.`;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.area);
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });

    hideContinue();
    renderFlowNote();
  }

  function getInputs() {
    const hfov = num(els.hfov.value);
    const vfov = num(els.vfov.value);
    const dist = num(els.dist.value);
    const ovPct = num(els.ov.value);

    if (
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(vfov) || vfov <= 0 || vfov >= 180 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) return { ok: false, message: "Enter valid values and press Calculate." };

    return { ok: true, hfov, vfov, dist, ovPct };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const ov = input.ovPct / 100;

    const halfW = Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const halfH = Math.tan(deg2rad(input.vfov / 2)) * input.dist;

    const width = halfW * 2;
    const height = halfH * 2;

    const effWidth = width * (1 - ov);
    const effHeight = height * (1 - ov);

    const area = width * height;
    const effArea = effWidth * effHeight;

    const widthRetentionPct = width > 0 ? (effWidth / width) * 100 : 0;
    const areaRetentionPct = area > 0 ? (effArea / area) * 100 : 0;
    const reserveLossPct = 100 - areaRetentionPct;

    const overlapClass = classifyOverlap(input.ovPct);
    const efficiencyClass = classifyCoverageEfficiency(areaRetentionPct);

    const metrics = [
      { label: "Reserve Pressure", value: reserveLossPct, displayValue: fmtPct(reserveLossPct, 1) },
      { label: "Width Retention", value: 100 - widthRetentionPct, displayValue: fmtPct(widthRetentionPct, 1) },
      { label: "Area Retention", value: 100 - areaRetentionPct, displayValue: fmtPct(areaRetentionPct, 1) }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(reserveLossPct, 100 - widthRetentionPct, 100 - areaRetentionPct),
      metrics,
      healthyMax: 20,
      watchMax: 35
    });

    const interpretationCore = overlapInterpretation(overlapClass);
    const guidanceCore = reserveGuidance(widthRetentionPct);

    let dominantConstraint = "";
    if (reserveLossPct >= 35) dominantConstraint = "Reserve pressure is the dominant limiter. Too much usable scene area is being sacrificed to overlap, which can drive camera count and reduce layout efficiency.";
    else if (reserveLossPct >= 20) dominantConstraint = "Coverage efficiency is the dominant limiter. The reserve strategy is still workable, but it is beginning to compress usable scene width enough to affect downstream spacing.";
    else dominantConstraint = "Field geometry is balanced. Most of the lens footprint remains usable after reserve is applied, which gives the next spacing step a healthier starting point.";

    const interpretation = `At ${fmtFt(input.dist)}, the modeled lens footprint is about ${fmtFt(width)} wide by ${fmtFt(height)} high, producing ${fmtSqFt(area)} of raw area. After reserving ${fmtPct(input.ovPct)} for overlap, effective coverage drops to ${fmtFt(effWidth)} by ${fmtFt(effHeight)}, or about ${fmtSqFt(effArea)} of usable scene coverage. ${interpretationCore}`;

    const guidance = `${guidanceCore} Continue to Camera Spacing next so you can translate this usable width into actual camera-to-camera placement.`;

    return {
      ok: true,
      ...input,
      ov,
      width,
      height,
      area,
      effWidth,
      effHeight,
      effArea,
      widthRetentionPct,
      areaRetentionPct,
      reserveLossPct,
      overlapClass,
      efficiencyClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.area, {
      category: CATEGORY,
      step: STEP,
      data: {
        hfov: data.hfov,
        vfov: data.vfov,
        dist: data.dist,
        ov: data.ov,
        ovPct: data.ovPct,
        width: data.width,
        height: data.height,
        area: data.area,
        effWidth: data.effWidth,
        effHeight: data.effHeight,
        effArea: data.effArea,
        widthRetentionPct: data.widthRetentionPct,
        areaRetentionPct: data.areaRetentionPct,
        reserveLossPct: data.reserveLossPct,
        overlapClass: data.overlapClass,
        efficiencyClass: data.efficiencyClass,
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
        { label: "Coverage Width", value: fmtFt(data.width) },
        { label: "Coverage Height", value: fmtFt(data.height) },
        { label: "Coverage Area", value: fmtSqFt(data.area) },
        { label: "Effective Area", value: fmtSqFt(data.effArea) }
      ],
      derivedRows: [
        { label: "Overlap Reserve", value: fmtPct(data.ovPct) },
        { label: "Effective Width", value: fmtFt(data.effWidth) },
        { label: "Effective Height", value: fmtFt(data.effHeight) },
        { label: "Width Retention", value: fmtPct(data.widthRetentionPct, 1) },
        { label: "Area Retention", value: fmtPct(data.areaRetentionPct, 1) },
        { label: "Overlap Classification", value: data.overlapClass },
        { label: "Coverage Efficiency", value: data.efficiencyClass }
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
    const result = calculateModel();
    if (!result.ok) return renderError(result.message);
    renderSuccess(result);
  }

  function reset() {
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    ["hfov", "vfov", "dist", "ov"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

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