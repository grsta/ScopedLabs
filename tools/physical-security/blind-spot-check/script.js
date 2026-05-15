(() => {
  "use strict";

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
  const STEP = "blind-spot-check";
  const PREVIOUS_STEP = "camera-spacing";
  const NEXT_URL = "/tools/physical-security/pixel-density/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    w: $("w"),
    d: $("d"),
    hfov: $("hfov"),
    dist: $("dist"),
    cams: $("cams"),
    overlap: $("overlap"),
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
    w: 120,
    d: 80,
    hfov: 90,
    dist: 60,
    cams: 2,
    overlap: 15
  };

  function num(v) {
    return ScopedLabsAnalyzer.safeNumber(v, NaN);
  }

  function fmt(v, digits = 1) {
    return Number.isFinite(v) ? v.toFixed(digits) : "—";
  }

  function fmtFt(v, digits = 1) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} ft` : "—";
  }

  function fmtPct(v, digits = 1) {
    return Number.isFinite(v) ? `${v.toFixed(digits)}%` : "—";
  }

  function deg2rad(x) {
    return (x * Math.PI) / 180;
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

  function clearDownstream() {
    [
      FLOW_KEYS.pixel,
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

    if (field === "w") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "d") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "dist") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return number.toFixed(1).replace(/\.0$/, "") + " deg";
    if (field === "cams") return Math.round(number) + " cameras";
    if (field === "overlap") return number.toFixed(1).replace(/\.0$/, "") + "%";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "w") return "Protected width / length";
    if (field === "d") return "Validation zone depth";
    if (field === "dist") return "Distance to target plane";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "cams") return "Camera count";
    if (field === "overlap") return "Overlap target";
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

  return `
    <div class="flow-override-note" role="note" aria-label="Manual override warning">
      <strong>Manual override active:</strong>
      ${text}. Results are valid for this local what-if branch.
    </div>
  `;
}

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getActiveBlindSpotArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    try {
      return api.getActiveArea();
    } catch {
      return null;
    }
  }

  function applyAreaPlanInputs() {
    const area = getActiveBlindSpotArea();
    if (!area) return false;

    const w = num(area.protectedLengthFt);
    const depth = num(
      area.blindSpotDepthFt ??
      area.effectiveCoverageHeightFt ??
      area.rawCoverageHeightFt ??
      area.distanceToTargetPlaneFt
    );
    const dist = num(area.distanceToTargetPlaneFt);
    const hfov = num(area.assumedHfovDeg);
    const cams = num(area.cameraCount || area.targetCameraCount);
    const overlap = num(area.overlapTargetPct);

    if (Number.isFinite(w) && w > 0) {
      captureImportedFlowValue("w", w);
      els.w.value = String(Number(w.toFixed(1)));
    }

    if (Number.isFinite(depth) && depth > 0) {
      captureImportedFlowValue("d", depth);
      els.d.value = String(Number(depth.toFixed(1)));
    }

    if (Number.isFinite(dist) && dist > 0) {
      captureImportedFlowValue("dist", dist);
      els.dist.value = String(Number(dist.toFixed(1)));
    }

    if (Number.isFinite(hfov) && hfov > 0) {
      captureImportedFlowValue("hfov", hfov);
      els.hfov.value = String(Number(hfov.toFixed(1)));
    }

    if (Number.isFinite(cams) && cams > 0) {
      captureImportedFlowValue("cams", cams);
      els.cams.value = String(Math.round(cams));
    }

    if (Number.isFinite(overlap) && overlap >= 0 && overlap <= 95) {
      captureImportedFlowValue("overlap", overlap);
      els.overlap.value = String(Number(overlap.toFixed(1)));
    }

    return true;
  }

  function activeAreaFlowContextHtml() {
    const area = getActiveBlindSpotArea();
    if (!area) return "";

    const validationDepth = num(
      area.blindSpotDepthFt ??
      area.effectiveCoverageHeightFt ??
      area.rawCoverageHeightFt ??
      area.distanceToTargetPlaneFt
    );

    const parts = [];
    if (area.name) parts.push("Current Area: <strong>" + escapeHtml(area.name) + "</strong>");
    if (Number.isFinite(num(area.protectedLengthFt))) parts.push("Protected length: <strong>" + fmtFt(num(area.protectedLengthFt)) + "</strong>");
    if (Number.isFinite(validationDepth)) parts.push("Validation depth: <strong>" + fmtFt(validationDepth) + "</strong>");
    if (Number.isFinite(num(area.distanceToTargetPlaneFt))) parts.push("Distance: <strong>" + fmtFt(num(area.distanceToTargetPlaneFt)) + "</strong>");
    if (Number.isFinite(num(area.assumedHfovDeg))) parts.push("Assumed HFOV: <strong>" + fmt(num(area.assumedHfovDeg), 1) + " deg</strong>");
    if (Number.isFinite(num(area.cameraCount))) parts.push("Planned cameras: <strong>" + fmt(num(area.cameraCount), 0) + "</strong>");

    if (!parts.length) return "";

    return '<strong>Area Context</strong><br>' +
      parts.join(" | ") +
      '<br><span class="muted">Blind Spot Check validates the active area spacing plan. Validation depth is separate from camera-to-target distance. Editing imported values here creates a local what-if branch for this area.</span>';
  }

  function renderAreaOnlyFlowContext() {
    const html = activeAreaFlowContextHtml();
    if (!html || !els.flowNote) return false;

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = html + renderManualOverrideNote();
    return true;
  }

  function applyDefaults() {
    els.w.value = String(DEFAULTS.w);
    els.d.value = String(DEFAULTS.d);
    els.hfov.value = String(DEFAULTS.hfov);
    els.dist.value = String(DEFAULTS.dist);
    els.cams.value = String(DEFAULTS.cams);
    els.overlap.value = String(DEFAULTS.overlap);

    applyAreaPlanInputs();
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.spacing);
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
    const w = num(prev.len ?? prev.protectedLengthFt ?? prev.w);
    const cams = num(prev.cams);
    const dist = num(prev.dist);
    const hfov = num(prev.hfov);
    const spacing = num(prev.spacing ?? prev.actualSpacing);
    const overlap = num(prev.ovPct ?? prev.overlapTargetPct ?? prev.overlapPct);

    captureImportedFlowValue("w", w);
    captureImportedFlowValue("cams", cams);
    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("hfov", hfov);
    captureImportedFlowValue("overlap", overlap);

    if (canApplyFlowInputs()) {
      if (Number.isFinite(w) && w > 0) els.w.value = String(Number(w.toFixed(1)));
      if (Number.isFinite(cams) && cams > 0) els.cams.value = String(Math.round(cams));
      if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Number(dist.toFixed(1)));
      if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Number(hfov.toFixed(1)));
      if (Number.isFinite(overlap) && overlap >= 0 && overlap <= 95) els.overlap.value = String(Number(overlap.toFixed(1)));
    }

    const areaContext = activeAreaFlowContextHtml();
    const parts = [];
    if (Number.isFinite(w)) parts.push("Protected width: <strong>" + fmtFt(w) + "</strong>");
    if (Number.isFinite(cams)) parts.push("Cameras: <strong>" + fmt(cams, 0) + "</strong>");
    if (Number.isFinite(spacing)) parts.push("Spacing: <strong>" + fmtFt(spacing) + "</strong>");
    if (Number.isFinite(dist)) parts.push("Distance: <strong>" + fmtFt(dist) + "</strong>");
    if (Number.isFinite(hfov)) parts.push("HFOV: <strong>" + fmt(hfov, 1) + " deg</strong>");
    if (Number.isFinite(overlap)) parts.push("Overlap: <strong>" + fmtPct(overlap) + "</strong>");

    if (!parts.length && !areaContext) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML =
      (areaContext ? areaContext + "<br><br>" : "") +
      "<strong>Flow Context</strong><br>" +
      parts.join(" | ") +
      "<br><br>" +
      "This step validates whether the spacing plan from the previous step still produces continuous coverage once overlap is applied." +
      renderManualOverrideNote();
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
      flowKey: FLOW_KEYS.blind,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Check Coverage."
    });

    renderFlowNote();
  }

  function getInputs() {
    const w = num(els.w.value);
    const d = num(els.d.value);
    const hfov = num(els.hfov.value);
    const dist = num(els.dist.value);
    const cams = Math.max(1, Math.floor(num(els.cams.value)));
    const overlapPct = num(els.overlap.value);

    if (
      !Number.isFinite(w) || w <= 0 ||
      !Number.isFinite(d) || d <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(cams) || cams < 1 ||
      !Number.isFinite(overlapPct) || overlapPct < 0 || overlapPct > 95
    ) {
      return { ok: false, message: "Enter valid values and press Check Coverage." };
    }

    return { ok: true, w, d, hfov, dist, cams, overlapPct };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const overlap = input.overlapPct / 100;
    const coveragePerCameraFt = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const overlapFt = coveragePerCameraFt * overlap;
    const effectiveCoverageFt = coveragePerCameraFt - overlapFt;
    const totalCoverageFt = input.cams <= 1
      ? coveragePerCameraFt
      : coveragePerCameraFt + ((input.cams - 1) * effectiveCoverageFt);
    const gapFt = Math.max(0, input.w - totalCoverageFt);
    const gapPct = input.w > 0 ? (gapFt / input.w) * 100 : 0;
    const overCoverageFt = Math.max(0, totalCoverageFt - input.w);
    const coverageMarginPct = input.w > 0 ? (overCoverageFt / input.w) * 100 : 0;

    const gapPressureMetric = gapFt <= 0 ? 0 : Math.min(gapPct * 4, 100);
    const shortfallMetric = gapFt <= 0 ? 0 : Math.min(gapPct * 3, 100);
    const overlapMetric = Math.min(input.overlapPct, 100);

    const metrics = [
      {
        label: "Gap Pressure",
        value: gapPressureMetric,
        displayValue: gapFt <= 0 ? "0.0 ft" : fmtFt(gapFt)
      },
      {
        label: "Coverage Shortfall",
        value: shortfallMetric,
        displayValue: fmtPct(gapPct)
      },
      {
        label: "Overlap Compression",
        value: overlapMetric,
        displayValue: fmtPct(input.overlapPct)
      }
    ];

    const dominantMetric = Math.max(gapPressureMetric, shortfallMetric, overlapMetric);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: dominantMetric,
      metrics,
      healthyMax: 25,
      watchMax: 60
    });

    let coverageClass = "FULL COVERAGE";
    if (gapFt > 0 && gapPct <= 10) coverageClass = "MINOR GAPS";
    if (gapFt > 0 && gapPct > 10) coverageClass = "BLIND SPOTS";

    let interpretation = `Each camera covers about ${fmtFt(coveragePerCameraFt)} horizontally at the target zone. After applying ${fmtPct(input.overlapPct)} overlap between adjacent camera footprints, each additional camera contributes about ${fmtFt(effectiveCoverageFt)} of usable added width, giving total usable width of ${fmtFt(totalCoverageFt)} across ${fmt(input.cams, 0)} cameras.`;

    if (coverageClass === "BLIND SPOTS") {
      interpretation += ` The modeled layout leaves a meaningful gap of ${fmtFt(gapFt)}, so blind spots are likely unless spacing, count, or field of view changes.`;
    } else if (coverageClass === "MINOR GAPS") {
      interpretation += ` Coverage is close, but a remaining gap of ${fmtFt(gapFt)} means real-world alignment tolerances, edge performance, and installation drift can still expose weak spots.`;
    } else if (input.overlapPct >= 25) {
      interpretation += ` Coverage is continuous, but overlap is consuming more usable width than necessary. The layout works geometrically, yet you are giving up footprint efficiency to maintain comfort margin.`;
    } else {
      interpretation += ` Coverage is continuous with remaining margin of about ${fmtFt(overCoverageFt)} across the protected width, so blind spots are not indicated by the geometric model.`;
    }

    let dominantConstraint = "";
    if (coverageClass === "BLIND SPOTS") {
      dominantConstraint = "Coverage shortfall is the dominant limiter. The total effective footprint is too narrow for the required width once overlap is honored.";
    } else if (coverageClass === "MINOR GAPS") {
      dominantConstraint = "Gap pressure is the dominant limiter. The layout is almost workable, but the remaining uncovered width is still large enough to matter in field conditions.";
    } else if (input.overlapPct >= 25) {
      dominantConstraint = "Overlap compression is the dominant limiter. Coverage is complete, but heavy overlap is consuming usable width faster than necessary.";
    } else {
      dominantConstraint = "Field geometry is balanced. The camera count, spacing, and effective width remain aligned with the protected span.";
    }

    let guidance = "";
    if (coverageClass === "BLIND SPOTS") {
      guidance = "Do not lock this layout yet. Reduce spacing, add cameras, widen the effective footprint, or revise upstream spacing assumptions before moving forward.";
    } else if (coverageClass === "MINOR GAPS") {
      guidance = "Coverage is close, but verify corners and overlap assumptions on the real mounting geometry before finalizing the design.";
    } else if (input.overlapPct >= 25) {
      guidance = "Coverage is acceptable, but review whether overlap is intentionally this high. You may be able to recover usable width or reduce camera count without creating blind spots.";
    } else {
      guidance = "Coverage is acceptable from a blind-spot standpoint. Continue to Pixel Density next to confirm that this same layout also delivers enough subject detail.";
    }

    return {
      ok: true,
      ...input,
      coveragePerCameraFt,
      overlapFt,
      effectiveCoverageFt,
      totalCoverageFt,
      gapFt,
      gapPct,
      overCoverageFt,
      coverageMarginPct,
      coverageClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      gapPressureMetric,
      shortfallMetric,
      overlapMetric
    };
  }

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const sourceMode = manualOverrideMeta.length ? "manual-override" : "pipeline";

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.blind, {
      category: CATEGORY,
      step: STEP,
      data: {
        w: data.w,
        d: data.d,
        hfov: data.hfov,
        dist: data.dist,
        cams: data.cams,
        overlapPct: data.overlapPct,
        coveragePerCameraFt: data.coveragePerCameraFt,
        overlapFt: data.overlapFt,
        effectiveCoverageFt: data.effectiveCoverageFt,
        totalCoverageFt: data.totalCoverageFt,
        gapFt: data.gapFt,
        gapPct: data.gapPct,
        overCoverageFt: data.overCoverageFt,
        coverageMarginPct: data.coverageMarginPct,
        coverageClass: data.coverageClass,
        status: data.status,
        interpretation: data.interpretation,
        dominantConstraint: data.dominantConstraint,
        guidance: data.guidance,
        sourceMode,
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromBlindSpot(data, manualOverrideMeta);
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
        { label: "Coverage per Camera", value: fmtFt(data.coveragePerCameraFt) },
        { label: "Effective Coverage", value: fmtFt(data.effectiveCoverageFt) },
        { label: "Total Coverage", value: fmtFt(data.totalCoverageFt) },
        { label: "Result", value: data.coverageClass }
      ],
      derivedRows: [
        { label: "Area Width", value: fmtFt(data.w) },
        { label: "Validation Zone Depth", value: fmtFt(data.d) },
        { label: "Gap", value: data.gapFt <= 0 ? "0.0 ft" : fmtFt(data.gapFt) },
        { label: "Overlap Target", value: fmtPct(data.overlapPct) },
        { label: "Coverage Margin", value: fmtPct(data.coverageMarginPct) },
        { label: "Camera Count", value: fmt(data.cams, 0) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Gap Pressure", "Coverage Shortfall", "Overlap Compression"],
        values: [
          Number(data.gapPressureMetric.toFixed(1)),
          Number(data.shortfallMetric.toFixed(1)),
          Number(data.overlapMetric.toFixed(1))
        ],
        displayValues: [
          data.gapFt <= 0 ? "0.0 ft" : fmtFt(data.gapFt),
          fmtPct(data.gapPct),
          fmtPct(data.overlapPct)
        ],
        referenceValue: 25,
        healthyMax: 25,
        watchMax: 60,
        axisTitle: "Coverage Risk Pressure",
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
    resetFlowOverrideState();
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["w", "d", "hfov", "dist", "cams", "overlap"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
      el.addEventListener("change", () => {
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
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
    applyDefaults();
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked && !els.toolCard.dataset.initialized) {
      els.toolCard.dataset.initialized = "true";
      initTool();
    }

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        initTool();
      }
    }, 400);
  });
})();