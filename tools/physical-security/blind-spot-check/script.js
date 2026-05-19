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
    assistant: $("blindSpotAssistant"),
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
    if (!els.flowNote) return false;

    const overrideNote = renderManualOverrideNote();

    if (!overrideNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return false;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = overrideNote;
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

    const overrideNote = renderManualOverrideNote();

    if (!overrideNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = overrideNote;
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
      emptyMessage: "Run the blind-spot check to generate technical output."
    });

    renderBlindSpotAssistantPrompt("Review the carried spacing, camera count, HFOV, and overlap assumptions, then run the blind-spot check. Edit imported values only when testing a local what-if branch.");
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

  function updateActiveAreaFromBlindSpot(data, manualOverrideMeta = []) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      protectedLengthFt: data.w,
      blindSpotDepthFt: data.d,
      distanceToTargetPlaneFt: data.dist,
      assumedHfovDeg: data.hfov,
      cameraCount: data.cams,
      overlapTargetPct: data.overlapPct,
      blindSpotCoveragePerCameraFt: data.coveragePerCameraFt,
      blindSpotOverlapFt: data.overlapFt,
      blindSpotEffectiveCoverageFt: data.effectiveCoverageFt,
      blindSpotTotalCoverageFt: data.totalCoverageFt,
      blindSpotGapFt: data.gapFt,
      blindSpotGapPct: data.gapPct,
      blindSpotOverCoverageFt: data.overCoverageFt,
      blindSpotCoverageMarginPct: data.coverageMarginPct,
      blindSpotCoverageClass: data.coverageClass,
      blindSpotStatus: data.status,
      blindSpotSourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
      blindSpotManualOverrides: manualOverrideMeta,
      blindSpotInterpretation: data.interpretation,
      blindSpotDominantConstraint: data.dominantConstraint,
      blindSpotGuidance: data.guidance,
      blindSpotUpdatedAt: new Date().toISOString()
    });
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

  function statusClassName(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "risk") return "risk";
    if (value === "watch") return "watch";
    return "healthy";
  }

  function formatAssistantStatusLabel(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function blindSpotAssistantTitle(data) {
    if (data.coverageClass === "BLIND SPOTS") return "Blind spots are likely under the current spacing assumptions.";
    if (data.coverageClass === "MINOR GAPS") return "Coverage is close, but field tolerance is tight.";
    if (data.overlapPct >= 25) return "Coverage is continuous, but overlap is compressing usable width.";
    return "Coverage continuity is ready for detail validation.";
  }

  function blindSpotAssistantSummary(data) {
    if (data.coverageClass === "BLIND SPOTS") return "The modeled camera run does not cover the full protected span once overlap is honored. Correct spacing, camera count, or HFOV before carrying the layout forward.";
    if (data.coverageClass === "MINOR GAPS") return "The layout is almost continuous, but the remaining gap leaves little room for mounting tolerance, edge softness, or field conditions.";
    if (data.overlapPct >= 25) return "The protected span is covered, but the overlap setting is using extra footprint. Review whether the reserve is intentional before moving on.";
    return "The spacing plan covers the protected span with usable margin. Continue to Pixel Density to confirm the layout also delivers enough subject detail.";
  }

  function coverageStyleBlindSpotFootprintSvg(data) {
    const reservePct = Math.max(0, Math.min(Number(data?.ovPct) || 0, 95));
    const retainedPct = Math.max(0, Math.min(Number(data?.widthRetentionPct) || 0, 100));
    const areaRetainedPct = Math.max(0, Math.min(Number(data?.areaRetentionPct) || 0, 100));

    const rawWidth = Math.max(0, Number(data?.width) || 0);
    const usableWidth = Math.max(0, Number(data?.effWidth) || 0);
    const rawHeight = Math.max(0, Number(data?.height) || 0);
    const targetDistance = Math.max(0, Number(data?.dist) || 0);
    const reserveEachSideFt = Math.max(0, (rawWidth - usableWidth) / 2);
    const reserveEachSidePct = reservePct / 2;

    const labelX = 52;
    const barX = 292;
    const barW = 280;
    const valueX = 740;
    const barH = 10;
    const row1Y = 70;
    const rowGap = 32;

    const stageX = 34;
    const stageY = 150;
    const stageW = 732;
    const stageH = 228;

    const cameraX = 122;
    const centerY = 264;
    const targetX = 560;
    const rawHalf = 72;
    const usableHalf = Math.max(8, rawHalf * (retainedPct / 100));

    const rawTopY = centerY - rawHalf;
    const rawBotY = centerY + rawHalf;
    const usableTopY = centerY - usableHalf;
    const usableBotY = centerY + usableHalf;

    const usableBarW = Math.max(8, barW * (retainedPct / 100));
    const reserveBarW = Math.max(8, barW * (reservePct / 100));
    const reserveTone = reservePct >= 35 ? "risk" : reservePct >= 20 ? "watch" : "normal";
    const reserveBarFill = reserveTone === "risk" ? "url(#coverageRiskBar)" : "url(#coverageReserveBar)";
    const reserveValueFill = reserveTone === "risk" ? "rgba(255,188,166,.96)" : "rgba(255,239,176,.96)";

    return '<svg data-export-svg viewBox="0 0 800 398" role="img" aria-label="Blind spot continuity plan view visualization">' +
      '<defs>' +
        '<linearGradient id="coverageRawBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(84,212,116,.70)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.86)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageUsableBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(104,240,138,.78)" />' +
          '<stop offset="100%" stop-color="rgba(151,255,176,.92)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageReserveBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(255,211,79,.76)" />' +
          '<stop offset="100%" stop-color="rgba(255,226,128,.90)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageRiskBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(255,138,102,.82)" />' +
          '<stop offset="100%" stop-color="rgba(255,94,94,.92)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageFovFill" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.035)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.105)" />' +
        '</linearGradient>' +
        '<linearGradient id="coverageUsableFill" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.07)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.18)" />' +
        '</linearGradient>' +
      '</defs>' +

      '<text x="52" y="26" fill="rgba(248,250,252,.92)" font-size="18" font-weight="900">Plan view: required span to modeled coverage</text>' +
      '<text x="52" y="48" fill="rgba(226,232,240,.62)" font-size="12">Top-down continuity view. Green shows modeled coverage; yellow/red marks the remaining uncovered span.</text>' +

      '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Required protected span</text>' +
      '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="url(#coverageRawBar)" />' +
      '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(rawWidth)) + '</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Modeled coverage available</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + usableBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#coverageUsableBar)" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(usableWidth)) + ' | ' + escapeHtml(fmtPct(retainedPct, 1)) + ' retained</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Remaining uncovered span</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + reserveBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + reserveBarFill + '" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + reserveValueFill + '" font-size="11" font-weight="900">' + escapeHtml(fmtPct(reservePct, 1)) + ' gap | ' + escapeHtml(fmtPct(areaRetainedPct, 1)) + ' span covered</text>' +

      '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="rgba(125,255,152,.16)" />' +
      '<text x="' + (stageX + 18) + '" y="' + (stageY + 24) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">PLAN VIEW / PROTECTED SPAN</text>' +

      '<text x="' + (cameraX - 76) + '" y="' + (centerY - 4) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">Cam 1</text>' +
      '<text x="' + (cameraX - 76) + '" y="' + (centerY + 14) + '" text-anchor="start" fill="rgba(226,232,240,.58)" font-size="10">HFOV ' + escapeHtml(fmt(data.hfov, 0)) + ' deg</text>' +
      '<circle cx="' + cameraX + '" cy="' + centerY + '" r="8" fill="rgba(8,18,12,.96)" stroke="rgba(125,255,152,.90)" stroke-width="1.8" />' +

      '<path d="M ' + cameraX + ' ' + centerY + ' L ' + targetX + ' ' + rawTopY.toFixed(1) + ' L ' + targetX + ' ' + rawBotY.toFixed(1) + ' Z" fill="url(#coverageFovFill)" stroke="rgba(226,232,240,.24)" stroke-width="1" stroke-dasharray="5 6" />' +
      '<path d="M ' + cameraX + ' ' + centerY + ' L ' + targetX + ' ' + usableTopY.toFixed(1) + ' L ' + targetX + ' ' + usableBotY.toFixed(1) + ' Z" fill="url(#coverageUsableFill)" stroke="rgba(125,255,152,.62)" stroke-width="1.25" />' +

      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + centerY + '" stroke="rgba(226,232,240,.26)" stroke-width="1" stroke-dasharray="4 6" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + rawTopY.toFixed(1) + '" stroke="rgba(255,226,128,.66)" stroke-width="1" stroke-dasharray="5 6" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(255,226,128,.66)" stroke-width="1" stroke-dasharray="5 6" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + usableTopY.toFixed(1) + '" stroke="rgba(125,255,152,.78)" stroke-width="1.4" />' +
      '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + usableBotY.toFixed(1) + '" stroke="rgba(125,255,152,.78)" stroke-width="1.4" />' +

      '<line x1="' + targetX + '" y1="' + rawTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.42)" stroke-width="1" />' +
      '<line x1="' + targetX + '" y1="' + rawTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + usableTopY.toFixed(1) + '" stroke="rgba(255,226,128,.90)" stroke-width="2" />' +
      '<line x1="' + targetX + '" y1="' + usableTopY.toFixed(1) + '" x2="' + targetX + '" y2="' + usableBotY.toFixed(1) + '" stroke="rgba(125,255,152,.92)" stroke-width="2.2" />' +
      '<line x1="' + targetX + '" y1="' + usableBotY.toFixed(1) + '" x2="' + targetX + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(255,226,128,.90)" stroke-width="2" />' +

      '<text x="' + (targetX + 18) + '" y="' + (centerY - 12) + '" fill="rgba(125,255,152,.94)" font-size="12" font-weight="950">Usable width</text>' +
      '<text x="' + (targetX + 18) + '" y="' + (centerY + 9) + '" fill="rgba(125,255,152,.94)" font-size="14" font-weight="950">' + escapeHtml(fmtFt(usableWidth)) + '</text>' +
      '<text x="' + (targetX + 18) + '" y="' + (centerY + 27) + '" fill="rgba(226,232,240,.58)" font-size="10.5">modeled</text>' +

      '<text x="' + (targetX + 18) + '" y="' + (rawTopY + 10).toFixed(1) + '" fill="rgba(255,226,128,.92)" font-size="10.5" font-weight="900">Gap edge ' + escapeHtml(fmtFt(reserveEachSideFt)) + '</text>' +
      '<text x="' + (targetX + 18) + '" y="' + (rawBotY - 5).toFixed(1) + '" fill="rgba(255,226,128,.92)" font-size="10.5" font-weight="900">Gap edge ' + escapeHtml(fmtFt(reserveEachSideFt)) + '</text>' +

      '<line x1="' + (targetX + 128) + '" y1="' + rawTopY.toFixed(1) + '" x2="' + (targetX + 128) + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
      '<line x1="' + (targetX + 121) + '" y1="' + rawTopY.toFixed(1) + '" x2="' + (targetX + 135) + '" y2="' + rawTopY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
      '<line x1="' + (targetX + 121) + '" y1="' + rawBotY.toFixed(1) + '" x2="' + (targetX + 135) + '" y2="' + rawBotY.toFixed(1) + '" stroke="rgba(226,232,240,.44)" stroke-width="1" />' +
      '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY - 18) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">Required</text>' +
      '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY - 3) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="11" font-weight="900">span</text>' +
      '<text x="' + (stageX + stageW - 76) + '" y="' + (centerY + 16) + '" text-anchor="start" fill="rgba(226,232,240,.82)" font-size="13" font-weight="950">' + escapeHtml(fmtFt(rawWidth)) + '</text>' +

      '<line x1="' + cameraX + '" y1="354" x2="' + targetX + '" y2="354" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
      '<line x1="' + cameraX + '" y1="348" x2="' + cameraX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
      '<line x1="' + targetX + '" y1="348" x2="' + targetX + '" y2="360" stroke="rgba(226,232,240,.46)" stroke-width="1" />' +
      '<text x="' + ((cameraX + targetX) / 2).toFixed(1) + '" y="376" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="11" font-weight="900">Validation distance: ' + escapeHtml(fmtFt(targetDistance, 0)) + '</text>' +
    '</svg>';
  }

  function blindSpotPlanViewSvg(data) {
    const requiredSpan = Math.max(0, Number(data?.w) || 0);
    const modeledCoverage = Math.max(0, Number(data?.totalCoverageFt) || 0);
    const gap = Math.max(0, Number(data?.gapFt) || 0);
    const cameraCount = Math.max(1, Math.round(Number(data?.cams) || 1));

    const deliveredCoverage = Math.max(0, Math.min(requiredSpan, modeledCoverage));
    const spanCoveredPct = requiredSpan > 0
      ? Math.max(0, Math.min(100, (deliveredCoverage / requiredSpan) * 100))
      : 0;

    const gapPct = requiredSpan > 0
      ? Math.max(0, Math.min(95, (gap / requiredSpan) * 100))
      : 0;

    const validationDepth = Math.max(0, Number(data?.d) || Number(data?.dist) || 0);

    const adapted = {
      ovPct: gapPct,
      widthRetentionPct: spanCoveredPct,
      areaRetentionPct: spanCoveredPct,
      width: requiredSpan,
      effWidth: deliveredCoverage,
      height: validationDepth,
      dist: Math.max(0, Number(data?.dist) || 0),
      hfov: Math.max(0, Number(data?.hfov) || 0)
    };

    let svg = coverageStyleBlindSpotFootprintSvg(adapted);

    const cameraLabel = cameraCount + (cameraCount === 1 ? " camera" : " cameras");
    svg = svg.replaceAll(">Cam 1<", ">" + escapeHtml(cameraLabel) + "<");

    const statusCallout = gap > 0
      ? '<text x="688" y="250" text-anchor="middle" fill="rgba(255,188,166,.98)" font-size="11" font-weight="950">Blind</text>' +
        '<text x="688" y="266" text-anchor="middle" fill="rgba(255,188,166,.98)" font-size="11" font-weight="950">gap</text>' +
        '<text x="688" y="286" text-anchor="middle" fill="rgba(255,188,166,.98)" font-size="13" font-weight="950">' + escapeHtml(fmtFt(gap)) + '</text>'
      : '<text x="688" y="250" text-anchor="middle" fill="rgba(125,255,152,.98)" font-size="11" font-weight="950">Coverage</text>' +
        '<text x="688" y="266" text-anchor="middle" fill="rgba(125,255,152,.98)" font-size="11" font-weight="950">continuous</text>' +
        '<text x="688" y="286" text-anchor="middle" fill="rgba(125,255,152,.98)" font-size="13" font-weight="950">0.0 ft gap</text>';

    svg = svg.replace("</svg>", statusCallout + "</svg>");
    return svg;
  }
  function renderBlindSpotAssistantPrompt(message = "Review the carried spacing assumptions, then run the blind-spot check.") {
    if (!els.assistant) return;
    els.assistant.innerHTML = '<div class="blindspot-assistant-head"><div><p class="blindspot-assistant-kicker">Blind Spot Assistant</p><h3 class="blindspot-assistant-title">Ready to validate coverage continuity.</h3><p class="blindspot-assistant-copy">' + escapeHtml(message) + '</p></div></div>';
  }

  function renderBlindSpotAssistant(data) {
    if (!els.assistant || !data || !data.ok) return;

    const statusClass = statusClassName(data.status);
    const handoff = 'Carry this continuity result into <strong>Pixel Density</strong>. The next step should validate whether the same camera layout delivers enough subject detail, not just continuous coverage.';

    els.assistant.innerHTML =
      '<div class="blindspot-assistant-head"><div><p class="blindspot-assistant-kicker">Blind Spot Assistant</p><h3 class="blindspot-assistant-title">' + escapeHtml(blindSpotAssistantTitle(data)) + '</h3><p class="blindspot-assistant-copy">' + escapeHtml(blindSpotAssistantSummary(data)) + '</p></div><span class="blindspot-status-pill ' + statusClass + '">Assistant Status: ' + escapeHtml(formatAssistantStatusLabel(data.status)) + '</span></div>' +
      '<div class="blindspot-visual-stage" data-export-section data-export-title="Blind Spot Assistant Plan View"><div class="blindspot-export-summary" data-export-text>Plan-view blind spot visual showing protected span, modeled coverage continuity, camera positions, overlap pressure, and remaining gap if present.</div>' + blindSpotPlanViewSvg(data) + '</div>' +
      '<div class="blindspot-mini-grid"><div class="blindspot-mini-card"><div class="blindspot-mini-label">Required span</div><div class="blindspot-mini-value">' + escapeHtml(fmtFt(data.w)) + '</div></div><div class="blindspot-mini-card"><div class="blindspot-mini-label">Modeled coverage</div><div class="blindspot-mini-value">' + escapeHtml(fmtFt(data.totalCoverageFt)) + '</div></div><div class="blindspot-mini-card"><div class="blindspot-mini-label">Gap / margin</div><div class="blindspot-mini-value">' + escapeHtml(data.gapFt <= 0 ? "0.0 ft" : fmtFt(data.gapFt)) + '</div></div><div class="blindspot-mini-card"><div class="blindspot-mini-label">Result</div><div class="blindspot-mini-value">' + escapeHtml(data.coverageClass) + '</div></div></div>' +
      '<div class="blindspot-handoff-card"><strong>Pixel Density handoff:</strong> ' + handoff + '</div>' +
      '<div class="blindspot-handoff-card"><strong>Assistant guidance:</strong> ' + escapeHtml(data.guidance) + '</div>';
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
    renderBlindSpotAssistantPrompt(message);
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
      guidance: data.guidance
    });

    // Blind Spot now uses the assistant plan-view SVG as the report/snapshot visual.
    // Remove the legacy analyzer canvas so export.js does not create a blank Chart Snapshot.
    if (window.ScopedLabsAnalyzer && typeof ScopedLabsAnalyzer.clearChart === "function") {
      ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    }

    if (els.results) {
      els.results.querySelectorAll("canvas").forEach((node) => node.remove());
    }
    renderBlindSpotAssistant(data);
    writeFlow(data);

    updateActiveAreaFromBlindSpot(data, getManualOverrideMetadata(data));
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