(() => {
  const FLOW_KEYS = {
    scene: "scopedlabs:pipeline:physical-security:scene-illumination",
    mount: "scopedlabs:pipeline:physical-security:mounting-height",
    fov: "scopedlabs:pipeline:physical-security:field-of-view",
    area: "scopedlabs:pipeline:physical-security:camera-coverage-area",
    spacing: "scopedlabs:pipeline:physical-security:camera-spacing",
    blind: "scopedlabs:pipeline:physical-security:blind-spot-check",
    pixel: "scopedlabs:pipeline:physical-security:pixel-density"
  };

  const CATEGORY = "physical-security";
  const LANE = "v1";
  const STEP = "camera-spacing";
  const PREVIOUS_STEP = "camera-coverage-area";

  const $ = (id) => document.getElementById(id);

  const els = {
    len: $("len"),
    dist: $("dist"),
    hfov: $("hfov"),
    ov: $("ov"),
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
    len: 300,
    dist: 60,
    hfov: 90,
    ov: 15
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
      return raw
        .split(",")
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
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

  function applyDefaults() {
    els.len.value = String(DEFAULTS.len);
    els.dist.value = String(DEFAULTS.dist);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ov.value = String(DEFAULTS.ov);
  }

  function clearDownstream() {
    sessionStorage.removeItem(FLOW_KEYS.blind);
    sessionStorage.removeItem(FLOW_KEYS.pixel);
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.spacing,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow Context",
      intro: "This step converts effective single-camera coverage into real camera-to-camera spacing along the protected perimeter."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const prev = flow.data || {};
    const dist = num(prev.dist);
    const hfov = num(prev.hfov);
    const ovPct = num(prev.ovPct);
    const effWidth = num(prev.effWidth);
    const width = num(prev.width);

    if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));
    if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Math.round(hfov));
    if (Number.isFinite(ovPct) && ovPct >= 0) els.ov.value = String(Math.round(ovPct));

    const parts = [];
    if (Number.isFinite(effWidth) && effWidth > 0) parts.push(`Effective width: <strong>${fmtFt(effWidth)}</strong>`);
    if (Number.isFinite(width) && width > 0) parts.push(`Raw width: <strong>${fmtFt(width)}</strong>`);
    if (Number.isFinite(dist) && dist > 0) parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
    if (Number.isFinite(hfov) && hfov > 0) parts.push(`HFOV: <strong>${fmt(hfov, 1)}°</strong>`);

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
      sessionStorage.removeItem(FLOW_KEYS.spacing);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.spacing,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });

    renderFlowNote();
  }

  function getInputs() {
    const len = num(els.len.value);
    const dist = num(els.dist.value);
    const hfov = num(els.hfov.value);
    const ovPct = num(els.ov.value);

    if (
      !Number.isFinite(len) || len <= 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, len, dist, hfov, ovPct };
  }

  function classifySpacing(ratio) {
    if (ratio < 0.8) return "Tight Spacing";
    if (ratio <= 1.05) return "Balanced Spacing";
    return "Wide Spacing";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const rawWidth = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const usableWidth = rawWidth * (1 - (input.ovPct / 100));

    const cams = Math.max(1, Math.ceil(input.len / usableWidth));
    const spacing = input.len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;

    const gapExposureMetric = ratio > 1 ? Math.min((ratio - 1) * 250, 100) : 0;
    const compressionMetric = ratio < 1 ? Math.min((1 - ratio) * 100, 100) : 0;
    const reserveMetric = input.ovPct;

    const metrics = [
      {
        label: "Gap Exposure",
        value: gapExposureMetric,
        displayValue: ratio > 1 ? fmtPct((ratio - 1) * 100, 1) : "0.0%"
      },
      {
        label: "Spacing Compression",
        value: compressionMetric,
        displayValue: ratio < 1 ? fmtPct((1 - ratio) * 100, 1) : "0.0%"
      },
      {
        label: "Overlap Reserve",
        value: reserveMetric,
        displayValue: fmtPct(input.ovPct, 1)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(gapExposureMetric, compressionMetric, reserveMetric),
      metrics,
      healthyMax: 20,
      watchMax: 35
    });

    const spacingClass = classifySpacing(ratio);

    let interpretation = `With a usable camera footprint of about ${fmtFt(usableWidth)}, a ${fmtFt(input.len)} perimeter needs ${cams} camera${cams === 1 ? "" : "s"} to maintain the requested overlap. That produces an actual spacing of about ${fmtFt(spacing)} between camera centers.`;

    if (spacingClass === "Wide Spacing") {
      interpretation += ` The layout is running wider than the usable footprint, which raises the chance of soft gaps or outright blind zones once real mounting tolerances and scene geometry are applied.`;
    } else if (spacingClass === "Tight Spacing") {
      interpretation += ` The layout is conservative and overlap-heavy, which reduces blind-spot risk but drives camera count and compresses coverage efficiency.`;
    } else {
      interpretation += ` The spacing is balanced against usable width, which is typically the healthiest tradeoff between continuity and camera efficiency.`;
    }

    let dominantConstraint = "";
    if (spacingClass === "Wide Spacing") {
      dominantConstraint = "Gap exposure is the dominant limiter. Camera spacing is outrunning the usable footprint, so weak zones between views become the first operational risk.";
    } else if (spacingClass === "Tight Spacing") {
      dominantConstraint = "Spacing compression is the dominant limiter. The design is safe from a continuity standpoint, but it is consuming more cameras than the coverage width strictly requires.";
    } else if (input.ovPct >= 25) {
      dominantConstraint = "Overlap reserve is the dominant limiter. The spacing still works, but the reserve target is starting to compress usable width enough to affect layout efficiency.";
    } else {
      dominantConstraint = "The layout is balanced. Spacing, usable width, and reserve target are still working together without a strong limiting factor.";
    }

    let guidance = "";
    if (spacingClass === "Wide Spacing") {
      guidance = "Reduce spacing, widen usable footprint, or increase camera count before treating this as a final layout. Then use Blind Spot Check to confirm the remaining continuity risk.";
    } else if (spacingClass === "Tight Spacing") {
      guidance = "This layout is conservative. Review whether the overlap target or camera count can be relaxed without creating coverage gaps, then confirm in Blind Spot Check.";
    } else {
      guidance = "Spacing is in a practical range. Continue to Blind Spot Check next to verify that the geometry still closes gaps across the protected span.";
    }

    return {
      ok: true,
      ...input,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.spacing, {
      category: CATEGORY,
      step: STEP,
      data: {
        len: data.len,
        dist: data.dist,
        hfov: data.hfov,
        ovPct: data.ovPct,
        rawWidth: data.rawWidth,
        usableWidth: data.usableWidth,
        cams: data.cams,
        spacing: data.spacing,
        ratio: data.ratio,
        spacingClass: data.spacingClass,
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
        { label: "Raw Coverage Width", value: fmtFt(data.rawWidth) },
        { label: "Usable Width", value: fmtFt(data.usableWidth) },
        { label: "Camera Count", value: `${data.cams}` },
        { label: "Actual Spacing", value: fmtFt(data.spacing) }
      ],
      derivedRows: [
        { label: "Perimeter Length", value: fmtFt(data.len, 0) },
        { label: "Distance to Target", value: fmtFt(data.dist) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Overlap Target", value: fmtPct(data.ovPct, 1) },
        { label: "Spacing Ratio", value: fmt(data.ratio, 2) },
        { label: "Spacing Classification", value: data.spacingClass }
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
    ["len", "dist", "hfov", "ov"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    });
  }

  function initTool() {
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked) initTool();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        initTool();
      }
    }, 400);
  });
})();