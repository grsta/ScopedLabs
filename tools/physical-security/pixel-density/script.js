(() => {
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
  const STEP = "pixel-density";
  const PREVIOUS_STEP = "blind-spot-check";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  // data-pixel-density-user-guidance-adapter-001
  let latestPixelDensityGuidance = null;

  function clonePixelDensityGuidance(value) {
    if (!value || typeof value !== "object") return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  const els = {
    res: $("res"),
    resPreset: $("resPreset"),
    hfov: $("hfov"),
    dist: $("dist"),
    tppf: $("tppf"),
    tppfPreset: $("tppfPreset"),
    tw: $("tw"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    planningFlowContext: $("planning-flow-context"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    pixelVisual: $("pixelDensityVisual")
  };
function visibleFlowContextEl() {
  const el = els.planningFlowContext || els.flowNote;
  if (els.flowNote && el !== els.flowNote) {
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
    els.flowNote.setAttribute("aria-hidden", "true");
  }
  return el;
}

function hideVisibleFlowContext() {
  const el = visibleFlowContextEl();
  if (el) {
    el.hidden = true;
    el.innerHTML = "";
  }

  if (els.flowNote && el !== els.flowNote) {
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
    els.flowNote.setAttribute("aria-hidden", "true");
  }
}


  const DEFAULTS = {
    res: 3840,
    hfov: 90,
    dist: 60,
    tppf: 80,
    tw: 10
  };

  const RESOLUTION_PRESETS = [
    1280,
    1920,
    2560,
    2688,
    3072,
    3840,
    4096
  ];

  const DETAIL_PPF_PRESETS = [
    20,
    40,
    60,
    80,
    120,
    150
  ];

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

  let flowInputsImported = false;
  const importedFlowValues = {};
  const manualFlowOverrides = {};

  function cleanOverrideNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatOverrideValue(field, value) {
    const number = cleanOverrideNumber(value);
    if (number === null) return "n/a";

    if (field === "dist") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return number.toFixed(1).replace(/\.0$/, "") + " deg";
    if (field === "tppf") return number.toFixed(1).replace(/\.0$/, "") + " PPF";
    if (field === "tw") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "res") return Math.round(number) + " px";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Distance to target plane";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "tppf") return "Target pixel density";
    if (field === "tw") return "Target width";
    if (field === "res") return "Horizontal resolution";
    return field;
  }

  function captureImportedFlowValue(field, value) {
    const number = cleanOverrideNumber(value);
    if (number === null) return;
    if (!(field in importedFlowValues)) importedFlowValues[field] = number;
  }

  function canApplyFlowInputs() {
    if (flowInputsImported) return false;
    flowInputsImported = true;
    return true;
  }

  function markFlowInputOverride(field) {
    if (!(field in importedFlowValues)) return;

    const el = els[field];
    if (!el) return;

    const current = cleanOverrideNumber(el.value);
    const imported = cleanOverrideNumber(importedFlowValues[field]);

    if (current === null || imported === null) return;

    if (Math.abs(current - imported) > 0.01) {
      manualFlowOverrides[field] = {
        field,
        label: overrideLabel(field),
        imported,
        current
      };
    } else {
      delete manualFlowOverrides[field];
    }
  }

  function resetFlowOverrideState() {
    flowInputsImported = false;
    Object.keys(importedFlowValues).forEach((key) => delete importedFlowValues[key]);
    Object.keys(manualFlowOverrides).forEach((key) => delete manualFlowOverrides[key]);
  }

  function getManualOverrideMetadata(data) {
    return Object.keys(manualFlowOverrides).map((field) => {
      const imported = importedFlowValues[field];
      const current = data && field in data ? data[field] : cleanOverrideNumber(els[field]?.value);

      return {
        field,
        label: overrideLabel(field),
        imported,
        current,
        importedDisplay: formatOverrideValue(field, imported),
        currentDisplay: formatOverrideValue(field, current)
      };
    });
  }

  function renderManualOverrideNote() {
    const overrides = Object.keys(manualFlowOverrides);

    if (!overrides.length) return "";

    const text = overrides
      .map((field) => {
        const item = manualFlowOverrides[field];
        return item.label + " changed from " + formatOverrideValue(field, item.imported) + " to " + formatOverrideValue(field, item.current);
      })
      .join(" | ");

    return '<div class="flow-override-note" role="note" aria-label="Manual override warning"><strong>Manual override active:</strong> ' + text + '. Results are valid for this local what-if branch.</div>';
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getActivePixelArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    try {
      return api.getActiveArea();
    } catch {
      return null;
    }
  }

  function targetPpfForDetailGoal(goal) {
    const value = String(goal || "").toLowerCase();

    if (value.includes("license")) return 150;
    if (value.includes("identification")) return 120;
    if (value.includes("recognition")) return 80;
    if (value.includes("observation")) return 40;
    if (value.includes("detection")) return 20;

    return null;
  }

  function applyAreaPlanInputs() {
    const area = getActivePixelArea();
    if (!area) return false;

    const dist = num(area.distanceToTargetPlaneFt);
    const hfov = num(area.assumedHfovDeg);
    const tppf = num(area.pixelDensityTargetPpf ?? targetPpfForDetailGoal(area.detailGoal));

    if (Number.isFinite(dist) && dist > 0) {
      captureImportedFlowValue("dist", dist);
      els.dist.value = String(Number(dist.toFixed(1)));
    }

    if (Number.isFinite(hfov) && hfov > 0) {
      captureImportedFlowValue("hfov", hfov);
      els.hfov.value = String(Number(hfov.toFixed(1)));
    }

    if (Number.isFinite(tppf) && tppf > 0) {
      captureImportedFlowValue("tppf", tppf);
      els.tppf.value = String(Number(tppf.toFixed(1)));
    }

    return true;
  }

  function activeAreaFlowContextHtml() {
    const area = getActivePixelArea();
    if (!area) return "";

    const tppf = num(area.pixelDensityTargetPpf ?? targetPpfForDetailGoal(area.detailGoal));

    const parts = [];
    if (area.name) parts.push("Current Area: <strong>" + escapeHtml(area.name) + "</strong>");
    if (Number.isFinite(num(area.distanceToTargetPlaneFt))) parts.push("Distance: <strong>" + fmtFt(num(area.distanceToTargetPlaneFt)) + "</strong>");
    if (Number.isFinite(num(area.assumedHfovDeg))) parts.push("Assumed HFOV: <strong>" + fmt(num(area.assumedHfovDeg), 1) + " deg</strong>");
    if (area.detailGoal) parts.push("Detail goal: <strong>" + escapeHtml(area.detailGoal) + "</strong>");
    if (Number.isFinite(tppf)) parts.push("Target PPF: <strong>" + fmtPpf(tppf) + "</strong>");

    if (!parts.length) return "";

    return '<strong>Area Context</strong><br>' +
      parts.join(" | ") +
      '<br><span class="muted">Pixel Density validates whether the active area geometry supports the selected detail goal. Editing imported values here creates a local what-if branch for this area.</span>';
  }

  function renderAreaOnlyFlowContext() {
    hideVisibleFlowContext();
    return false;
  }

  


  function findResolutionPresetValue(value) {
    const rounded = Math.round(Number(value));
    if (!Number.isFinite(rounded)) return "custom";
    return RESOLUTION_PRESETS.includes(rounded) ? String(rounded) : "custom";
  }

  function updateResolutionPresetUi() {
    if (!els.resPreset || !els.res) return;
    const stack = els.res.closest(".resolution-preset-stack");
    if (!stack) return;
    stack.classList.toggle("is-custom", els.resPreset.value === "custom");
  }

  function syncResolutionPresetFromInput() {
    if (!els.resPreset || !els.res) return;
    els.resPreset.value = findResolutionPresetValue(els.res.value);
    updateResolutionPresetUi();
  }

  function applyResolutionPreset() {
    if (!els.resPreset || !els.res) return;
    const preset = els.resPreset.value;
    updateResolutionPresetUi();
    if (!preset || preset === "custom") {
      els.res.focus();
      return;
    }

    const value = Number(preset);
    if (!Number.isFinite(value) || value <= 0) return;

    els.res.value = String(value);
  }


  function findTargetPpfPresetValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "custom";

    const match = DETAIL_PPF_PRESETS.find((preset) => Math.abs(Number(preset) - number) <= 0.05);
    return match ? String(match) : "custom";
  }

  function updateTargetPpfPresetUi() {
    if (!els.tppfPreset || !els.tppf) return;

    const stack = els.tppf.closest(".target-ppf-preset-stack");
    if (!stack) return;

    stack.classList.toggle("is-custom", els.tppfPreset.value === "custom");
  }

  function syncTargetPpfPresetFromInput() {
    if (!els.tppfPreset || !els.tppf) return;

    els.tppfPreset.value = findTargetPpfPresetValue(els.tppf.value);
    updateTargetPpfPresetUi();
  }

  function applyTargetPpfPreset() {
    if (!els.tppfPreset || !els.tppf) return;

    const preset = els.tppfPreset.value;
    updateTargetPpfPresetUi();

    if (!preset || preset === "custom") {
      els.tppf.focus();
      return;
    }

    const value = Number(preset);
    if (!Number.isFinite(value) || value <= 0) return;

    els.tppf.value = String(value);
  }

  function applyDefaults() {
    els.res.value = String(DEFAULTS.res);
    els.hfov.value = String(DEFAULTS.hfov);
    els.dist.value = String(DEFAULTS.dist);
    els.tppf.value = String(DEFAULTS.tppf);
    els.tw.value = String(DEFAULTS.tw);

    applyAreaPlanInputs();
    syncTargetPpfPresetFromInput();
    syncResolutionPresetFromInput();
  }

  function clearDownstream() {
    [
      FLOW_KEYS.lens,
      FLOW_KEYS.face,
      FLOW_KEYS.plate,
      "scopedlabs:pipeline:last-result"
    ].forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
    });
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.blind);

    if (!raw) {
      renderAreaOnlyFlowContext();
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      renderAreaOnlyFlowContext();
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      renderAreaOnlyFlowContext();
      return;
    }

    const prev = parsed.data || {};
    const dist = num(prev.dist);
    const hfov = num(prev.hfov);
    const status = prev.status || "";
    const gap = num(prev.gapFt ?? prev.gap);
    const area = getActivePixelArea();
    const tppf = area ? num(area.pixelDensityTargetPpf ?? targetPpfForDetailGoal(area.detailGoal)) : NaN;

    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("hfov", hfov);
    if (Number.isFinite(tppf) && tppf > 0) captureImportedFlowValue("tppf", tppf);

    if (canApplyFlowInputs()) {
      if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Number(dist.toFixed(1)));
      if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Number(hfov.toFixed(1)));
      if (Number.isFinite(tppf) && tppf > 0) els.tppf.value = String(Number(tppf.toFixed(1)));
    }

    const areaContext = "";
    const parts = [];
    if (status) parts.push("Blind-spot result: <strong>" + escapeHtml(status) + "</strong>");
    if (Number.isFinite(dist) && dist > 0) parts.push("Distance: <strong>" + fmtFt(dist) + "</strong>");
    if (Number.isFinite(hfov) && hfov > 0) parts.push("HFOV: <strong>" + fmt(hfov, 1) + " deg</strong>");
    if (Number.isFinite(gap)) parts.push("Gap: <strong>" + fmtFt(gap) + "</strong>");

    if (!parts.length) {
      hideVisibleFlowContext();
      return;
    }

    visibleFlowContextEl().hidden = false;
    visibleFlowContextEl().innerHTML =
      (areaContext ? areaContext + "<br><br>" : "") +
      "<strong>Imported Assumptions</strong><br>" +
      parts.join(" | ") +
      renderManualOverrideNote();
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.pixel);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.pixel,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    clearPixelDensityVisual();
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

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const sceneW = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const ppf = input.res / sceneW;
    const distForTppf = input.res / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.tppf);
    const pixelsOnTarget = ppf * input.tw;
    const level = classify(ppf);

    const targetGapPct =
      input.tppf > 0 ? ((input.tppf - ppf) / input.tppf) * 100 : 0;

    const shortfallMetric =
      ppf < input.tppf ? ScopedLabsAnalyzer.clamp(targetGapPct, 0, 100) : 0;

    const utilizationPct =
      distForTppf > 0 ? (input.dist / distForTppf) * 100 : 100;

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
      guidance,
      utilizationMetric,
      shortfallMetric,
      requirementMetric,
      utilizationPct
    };
  }

  function updateActiveAreaFromPixelDensity(data, manualOverrideMeta = []) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      distanceToTargetPlaneFt: data.dist,
      assumedHfovDeg: data.hfov,
      horizontalResolutionPx: data.res,
      pixelDensityTargetPpf: data.tppf,
      pixelDensityTargetWidthFt: data.tw,
      pixelDensitySceneWidthFt: data.sceneW,
      pixelDensityPpf: data.ppf,
      pixelDensityDistanceForTargetFt: data.distForTppf,
      pixelDensityPixelsOnTarget: data.pixelsOnTarget,
      pixelDensityLevel: data.level,
      pixelDensityStatus: data.status,
      pixelDensityUtilizationPct: data.utilizationPct,
      pixelDensityShortfallMetric: data.shortfallMetric,
      pixelDensityRequirementMetric: data.requirementMetric,
      pixelDensitySourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
      pixelDensityManualOverrides: manualOverrideMeta,
      pixelDensityInterpretation: data.interpretation,
      pixelDensityDominantConstraint: data.dominantConstraint,
      pixelDensityGuidance: data.guidance,
      pixelDensityUpdatedAt: new Date().toISOString()
    });
  }

  


  // data-pixel-density-user-guidance-adapter-001
  function pixelDensityGuidanceStatus(data) {
    if (!data) return "unknown";

    const status = String(data.status || "").toLowerCase();
    const delivered = Number(data.ppf);
    const target = Number(data.tppf);
    const utilization = Number(data.utilizationPct);

    if (delivered < target) {
      return "risk";
    }

    if (status.includes("risk") || status.includes("watch") || utilization >= 75) {
      return "watch";
    }

    if (status.includes("healthy")) {
      return "healthy";
    }

    return "unknown";
  }

  function pixelDensitySourceMode(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    return manualOverrideMeta.length ? "manual-override" : "pipeline";
  }

  function pixelDensityExpectedResult(data) {
    const delivered = Number(data.ppf);
    const target = Number(data.tppf);
    const dist = Number(data.dist);
    const distForTarget = Number(data.distForTppf);
    const pixelsOnTarget = Number(data.pixelsOnTarget);

    const parts = [];

    if (Number.isFinite(delivered) && Number.isFinite(target)) {
      parts.push(fmtPpf(delivered) + " delivered vs " + fmtPpf(target) + " target");
    }

    if (Number.isFinite(dist) && Number.isFinite(distForTarget)) {
      parts.push(fmtFt(dist) + " working distance vs " + fmtFt(distForTarget) + " target-distance envelope");
    }

    if (Number.isFinite(pixelsOnTarget)) {
      parts.push(fmtPx(pixelsOnTarget, 0) + " pixels on target");
    }

    return parts.filter(Boolean).join(" | ") || "Review delivered pixel density against the target detail requirement.";
  }

  function pixelDensityPrimaryRecommendation(data) {
    const status = pixelDensityGuidanceStatus(data);
    const delivered = Number(data.ppf);
    const target = Number(data.tppf);
    const utilization = Number(data.utilizationPct);
    const expectedResult = pixelDensityExpectedResult(data);

    if (status === "healthy") {
      return {
        action: "Keep Current Pixel Density Baseline",
        reason: "Delivered pixel density is above the selected target detail requirement with usable working-distance margin.",
        expectedResult,
        confidence: "No correction required",
        nextStep: "Carry this detail requirement into Lens Selection."
      };
    }

    if (Number.isFinite(delivered) && Number.isFinite(target) && delivered < target) {
      return {
        action: "Increase delivered pixel density",
        reason: "The current geometry is not delivering enough pixels per foot for the selected target detail requirement.",
        expectedResult,
        confidence: "PPF shortfall",
        nextStep: "Reduce HFOV, increase horizontal resolution, move the camera closer, or lower the target PPF only if the design intent changes."
      };
    }

    if (Number.isFinite(utilization) && utilization >= 95) {
      return {
        action: "Treat Pixel Density as At Limit",
        reason: "The design is operating at the edge of the modeled detail envelope, so lighting, compression, motion, or angle can push usable detail below target.",
        expectedResult,
        confidence: "At limit",
        nextStep: "Validate the field distance and lens selection before treating this as final."
      };
    }

    if (status === "watch") {
      return {
        action: "Preserve the baseline, but keep detail margin visible",
        reason: "Delivered detail is workable, but the design does not have much headroom against the target density requirement.",
        expectedResult,
        confidence: "Watch margin",
        nextStep: "Carry the result into Lens Selection and verify the selected focal length does not erode the intended detail target."
      };
    }

    return {
      action: "Review Pixel Density Assumptions",
      reason: "The current result needs review before being treated as the final detail-quality branch.",
      expectedResult,
      confidence: "Review required",
      nextStep: "Confirm working distance, HFOV, horizontal resolution, target PPF, and target width assumptions."
    };
  }

  function pixelDensitySecondaryOptions(data) {
    const delivered = Number(data.ppf);
    const target = Number(data.tppf);

    const options = [
      {
        label: "Reduce HFOV",
        intent: "Concentrate more horizontal pixels across less scene width.",
        expectedResult: "Delivered PPF should increase at the same working distance.",
        tradeoff: "Narrower view may reduce surrounding coverage context.",
        canApply: true
      },
      {
        label: "Increase horizontal resolution",
        intent: "Raise the pixel budget available across the same scene width.",
        expectedResult: "Delivered PPF and pixels on target should increase.",
        tradeoff: "May increase camera cost, bandwidth, and storage requirements.",
        canApply: true
      },
      {
        label: "Move camera closer",
        intent: "Reduce scene width at the target distance.",
        expectedResult: "Delivered PPF should increase and detail utilization should improve.",
        tradeoff: "Mounting location and coverage geometry may become more constrained.",
        canApply: true
      },
      {
        label: "Review target PPF",
        intent: "Use only when the required detail goal changes.",
        expectedResult: "A lower target can improve margin, but may reduce recognition or identification confidence.",
        tradeoff: "Do not lower the target simply to make a weak design pass.",
        canApply: true
      }
    ];

    if (Number.isFinite(delivered) && Number.isFinite(target) && delivered >= target) {
      return options.slice(0, 2);
    }

    return options;
  }

  function buildPixelDensityUserGuidance(data) {
    const helper = window.ScopedLabsUserAssistantGuidance;
    const mode = pixelDensitySourceMode(data);
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const primary = pixelDensityPrimaryRecommendation(data);
    const sourceLabel = helper && typeof helper.sourceLabelForMode === "function"
      ? helper.sourceLabelForMode(mode)
      : (mode === "manual-override" ? "Manual override" : "Clean pipeline");
    const sourceMessage = helper && typeof helper.sourceMessageForMode === "function"
      ? helper.sourceMessageForMode(mode)
      : "Use this result only when the assumptions match the intended design path.";

    const input = {
      status: pixelDensityGuidanceStatus(data),
      mode,
      primaryRecommendation: primary,
      secondaryOptions: pixelDensitySecondaryOptions(data),
      sourceIntegrity: {
        label: sourceLabel,
        mode,
        affectedFields: manualOverrideMeta.map((item) => item.field || item.label || "field"),
        message: sourceMessage
      },
      reportSummary: [
        primary.action,
        primary.reason,
        "Expected result: " + primary.expectedResult
      ].filter(Boolean).join(" "),
      carryForward: {
        allowed: true,
        nextTool: "lens-selection",
        message: "Carry this pixel-density result into Lens Selection only when the working distance, HFOV, horizontal resolution, target PPF, and target width assumptions match the intended area."
      }
    };

    if (helper && typeof helper.createGuidance === "function") {
      return helper.createGuidance(input);
    }

    return Object.assign({
      version: "pixel-density-user-guidance-adapter-001-fallback"
    }, input);
  }

  function updatePixelDensityUserGuidance(data) {
    try {
      latestPixelDensityGuidance = buildPixelDensityUserGuidance(data);
      return latestPixelDensityGuidance;
    } catch (error) {
      latestPixelDensityGuidance = {
        version: "pixel-density-user-guidance-adapter-001-error",
        status: "unknown",
        mode: "unknown",
        error: error && error.message ? error.message : String(error || "Unknown guidance adapter error")
      };

      return latestPixelDensityGuidance;
    }
  }

  function getLastPixelDensityGuidance() {
    return clonePixelDensityGuidance(latestPixelDensityGuidance);
  }

  function explainLastPixelDensityGuidance() {
    if (!latestPixelDensityGuidance) {
      return {
        ok: false,
        summary: "No Pixel Density guidance has been generated yet.",
        nextStep: "Run a Pixel Density calculation first."
      };
    }

    const helper = window.ScopedLabsUserAssistantGuidance;

    if (helper && typeof helper.explainGuidance === "function") {
      return helper.explainGuidance(latestPixelDensityGuidance);
    }

    return clonePixelDensityGuidance(latestPixelDensityGuidance);
  }


  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.pixel, {
      category: CATEGORY,
      step: STEP,
      data: {
        ppf: data.ppf,
        level: data.level,
        status: data.status,
        res: data.res,
        dist: data.dist,
        hfov: data.hfov,
        tppf: data.tppf,
        tw: data.tw,
        sceneW: data.sceneW,
        distForTppf: data.distForTppf,
        pixelsOnTarget: data.pixelsOnTarget,
        interpretation: data.interpretation,
        dominantConstraint: data.dominantConstraint,
        guidance: data.guidance,
        sourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromPixelDensity(data, manualOverrideMeta);
  }


  function pixelDensityGraphicsModel(data) {
    return {
      tool: "pixel-density",
      ppf: data.ppf,
      targetPpf: data.tppf,
      sceneWidthFt: data.sceneW,
      targetWidthFt: data.tw,
      resolutionPx: data.res,
      pixelsOnTarget: data.pixelsOnTarget,
      targetDistanceFt: data.dist,
      hfovDeg: data.hfov,
      distanceForTargetFt: data.distForTppf,
      utilizationPct: data.utilizationPct,
      level: data.level,
      status: data.status
    };
  }

  function pixelDensityVisualSvg(data) {
    const model = pixelDensityGraphicsModel(data);
    const gfx = window.ScopedLabsGraphics;

    if (gfx && typeof gfx.render === "function") {
      return gfx.render("pixel-density-detail-plan", model);
    }

    const psGraphics = window.ScopedLabsPhysicalSecurityGraphics;
    if (psGraphics && typeof psGraphics.renderPixelDensityDetailPlanSvg === "function") {
      return psGraphics.renderPixelDensityDetailPlanSvg(model);
    }

    return "" +
      '<svg data-export-svg data-sl-renderer="pixel-density-detail-plan" data-sl-diagnostic-code="SL-PS-GFX-PIXEL-RENDERER-MISSING" viewBox="0 0 800 220" role="img" aria-label="Pixel Density visual fallback">' +
        '<rect x="24" y="24" width="752" height="172" rx="18" fill="rgba(0,0,0,.16)" stroke="rgba(255,211,79,.32)" />' +
        '<text x="52" y="86" fill="rgba(255,226,128,.96)" font-size="17" font-weight="950">Pixel Density visual unavailable</text>' +
        '<text x="52" y="118" fill="rgba(226,232,240,.72)" font-size="12">Physical Security graphics library was not available.</text>' +
      '</svg>';
  }

  function clearPixelDensityVisual() {
    if (!els.pixelVisual) return;
    els.pixelVisual.hidden = true;
    els.pixelVisual.innerHTML = "";
    els.pixelVisual.removeAttribute("data-export-section");
    els.pixelVisual.removeAttribute("data-export-title");
    els.pixelVisual.removeAttribute("data-export-compact-svg");
  }

  function renderPixelDensityVisual(data) {
    if (!els.pixelVisual || !data || !data.ok) return;

    const liveSvg = pixelDensityVisualSvg(data);

    els.pixelVisual.hidden = false;
    els.pixelVisual.setAttribute("data-export-section", "true");
    els.pixelVisual.setAttribute("data-export-title", "Pixel Density Detail Geometry");
    els.pixelVisual.setAttribute("data-export-compact-svg", "true");

    // data-scopedlabs-pixel-export-notes-001
    const pixelExportHandoff =
      "Carry the delivered pixel density of " + fmtPpf(data.ppf) +
      " against the target of " + fmtPpf(data.tppf) +
      " into Lens Selection. Lens Selection should preserve this detail requirement while validating focal length, HFOV, target width, and working distance.";

    const pixelExportNotes = [
      ["Engineering interpretation", data.interpretation],
      ["Dominant constraint", data.dominantConstraint],
      ["Recommended action", data.guidance],
      ["Lens Selection handoff", pixelExportHandoff]
    ];

    const pixelDensityExportNotesTable =
      '<table style="width:100%;border-collapse:collapse;margin:12px 0 0 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Section</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Detail</th>' +
        '</tr></thead>' +
        '<tbody>' +
          pixelExportNotes
            .filter((row) => row && row[0] && row[1])
            .map((row) =>
              '<tr>' +
                '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeHtml(row[0]) + '</td>' +
                '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapeHtml(row[1]) + '</td>' +
              '</tr>'
            ).join("") +
        '</tbody>' +
      '</table>';
    els.pixelVisual.innerHTML =
      '<div class="pixel-density-visual-head">' +
        '<div>' +
          '<p class="pixel-density-visual-title">Pixel Density Detail Geometry</p>' +
          '<div class="pixel-density-visual-subtitle">CAD-style plan view showing delivered PPF against the target detail requirement.</div>' +
        '</div>' +
        '<div class="pixel-density-visual-pill">' + escapeHtml(data.status || data.level) + '</div>' +
      '</div>' +
      '<div class="pixel-density-visual-svg-wrap">' + liveSvg + '</div>' +
      '<div class="pixel-density-visual-note" data-export-text>Detail note: pixel density is calculated by dividing horizontal resolution across the full scene width at the target distance, then comparing delivered PPF against the requested detail target.</div>' +
      '<div class="pixel-density-visual-export-only">' +
        '<table><thead><tr><th>Detail Metric</th><th>Value</th></tr></thead><tbody>' +
          '<tr><td>Delivered pixel density</td><td>' + escapeHtml(fmtPpf(data.ppf)) + '</td></tr>' +
          '<tr><td>Target pixel density</td><td>' + escapeHtml(fmtPpf(data.tppf)) + '</td></tr>' +
          '<tr><td>Pixels on target</td><td>' + escapeHtml(fmtPx(data.pixelsOnTarget, 0)) + '</td></tr>' +
          '<tr><td>Scene width</td><td>' + escapeHtml(fmtFt(data.sceneW)) + '</td></tr>' +
          '<tr><td>Target width</td><td>' + escapeHtml(fmtFt(data.tw)) + '</td></tr>' +
        '</tbody></table>' +
        pixelDensityExportNotesTable +
      '</div>';
  }

  function renderError(message) {
    clearPixelDensityVisual();
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
        { label: "Working Distance Utilization", value: fmtPct(data.utilizationPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Detail Utilization", "PPF Shortfall", "Target Detail Demand"],
        values: [
          Number(data.utilizationMetric.toFixed(1)),
          Number(data.shortfallMetric.toFixed(1)),
          Number(data.requirementMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.utilizationPct),
          data.ppf < data.tppf ? fmtPpf(data.tppf - data.ppf) : "0.0 PPF",
          fmtPpf(data.tppf)
        ],
        referenceValue: 75,
        healthyMax: 75,
        watchMax: 95,
        axisTitle: "Detail Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });

    renderPixelDensityVisual(data);
    writeFlow(data);
    updatePixelDensityUserGuidance(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    resetFlowOverrideState();
    applyDefaults();
    renderFlowNote();
    syncTargetPpfPresetFromInput();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["res", "hfov", "dist", "tppf", "tw"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        if (id === "res") syncResolutionPresetFromInput();
        if (id === "tppf") syncTargetPpfPresetFromInput();
        markFlowInputOverride(id);
        invalidate({ clearFlow: true });
      });
      el.addEventListener("change", () => {
        if (id === "res") syncResolutionPresetFromInput();
        if (id === "tppf") syncTargetPpfPresetFromInput();
        markFlowInputOverride(id);
        invalidate({ clearFlow: true });
      });
    });

    els.resPreset?.addEventListener("change", () => {
      applyResolutionPreset();
      updateResolutionPresetUi();
      markFlowInputOverride("res");
      invalidate({ clearFlow: true });
    });

    els.tppfPreset?.addEventListener("change", () => {
      applyTargetPpfPreset();
      updateTargetPpfPresetUi();
      markFlowInputOverride("tppf");
      invalidate({ clearFlow: true });
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

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    applyDefaults();
    bind();
    renderFlowNote();
    syncTargetPpfPresetFromInput();
    invalidate({ clearFlow: false });
  }

  window.ScopedLabsPixelDensityGuidance = Object.freeze({
    version: "pixel-density-user-guidance-adapter-001",
    getLastGuidance: getLastPixelDensityGuidance,
    explainLastGuidance: explainLastPixelDensityGuidance
  });

  window.addEventListener("DOMContentLoaded", init);
})();