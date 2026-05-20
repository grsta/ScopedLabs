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

  function readSpacingFlowPayload() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEYS.spacing);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) return null;

      return parsed.data || null;
    } catch {
      return null;
    }
  }

  function readBlindSpotSpacingContext(input) {
    const flow = readSpacingFlowPayload();
    const area = getActiveBlindSpotArea();

    const flowSpacing = num(flow?.spacing ?? flow?.spacingFt ?? flow?.actualSpacing ?? flow?.actualSpacingFt);
    const areaSpacing = num(area?.spacingFt ?? area?.actualSpacingFt);
    const flowRawWidth = num(flow?.rawWidth ?? flow?.spacingRawCoverageWidthFt);
    const areaRawWidth = num(area?.spacingRawCoverageWidthFt);
    const flowUsableWidth = num(flow?.usableWidth ?? flow?.spacingUsableWidthFt);
    const areaUsableWidth = num(area?.spacingUsableWidthFt);
    const flowSingleCamera = !!flow?.singleCamera || !!flow?.spacingSingleCamera;
    const areaSingleCamera = !!area?.spacingSingleCamera;

    if (Number.isFinite(flowSpacing) && flowSpacing > 0) {
      return {
        spacingFt: flowSpacing,
        rawWidthFt: Number.isFinite(flowRawWidth) ? flowRawWidth : null,
        usableWidthFt: Number.isFinite(flowUsableWidth) ? flowUsableWidth : null,
        singleCamera: flowSingleCamera,
        source: "Camera Spacing handoff"
      };
    }

    if (Number.isFinite(areaSpacing) && areaSpacing > 0) {
      return {
        spacingFt: areaSpacing,
        rawWidthFt: Number.isFinite(areaRawWidth) ? areaRawWidth : null,
        usableWidthFt: Number.isFinite(areaUsableWidth) ? areaUsableWidth : null,
        singleCamera: areaSingleCamera,
        source: "Active area spacing"
      };
    }

    const fallbackSpacing = input.cams <= 1 ? input.w : input.w / Math.max(input.cams, 1);

    return {
      spacingFt: fallbackSpacing,
      rawWidthFt: null,
      usableWidthFt: null,
      singleCamera: input.cams <= 1,
      source: "Blind Spot local estimate"
    };
  }

  function mergeCoverageIntervals(intervals, spanFt) {
    const safeSpan = Math.max(0, Number(spanFt) || 0);

    const clipped = (intervals || [])
      .map((item) => ({
        startFt: Math.max(0, Math.min(safeSpan, Number(item.startFt))),
        endFt: Math.max(0, Math.min(safeSpan, Number(item.endFt)))
      }))
      .filter((item) => Number.isFinite(item.startFt) && Number.isFinite(item.endFt) && item.endFt > item.startFt)
      .sort((a, b) => a.startFt - b.startFt);

    const merged = [];

    clipped.forEach((item) => {
      const last = merged[merged.length - 1];

      if (!last || item.startFt > last.endFt) {
        merged.push({ ...item });
      } else {
        last.endFt = Math.max(last.endFt, item.endFt);
      }
    });

    return merged;
  }

  function buildGapSegments(mergedIntervals, spanFt) {
    const safeSpan = Math.max(0, Number(spanFt) || 0);
    const gaps = [];
    let cursor = 0;

    (mergedIntervals || []).forEach((item) => {
      if (item.startFt > cursor) {
        gaps.push({ startFt: cursor, endFt: item.startFt, lengthFt: item.startFt - cursor });
      }

      cursor = Math.max(cursor, item.endFt);
    });

    if (cursor < safeSpan) {
      gaps.push({ startFt: cursor, endFt: safeSpan, lengthFt: safeSpan - cursor });
    }

    return gaps.filter((item) => item.lengthFt > 0.01);
  }

  function buildBlindSpotLayoutModel(input, coveragePerCameraFt, effectiveCoverageFt) {
    const context = readBlindSpotSpacingContext(input);
    const cams = Math.max(1, Math.round(Number(input.cams) || 1));
    const protectedSpan = Math.max(Number(input.w) || 0, 0);
    const actualSpacingFt = cams <= 1
      ? protectedSpan
      : Math.max(Number(context.spacingFt) || 0, 0);

    const spacingForLayout = actualSpacingFt > 0
      ? actualSpacingFt
      : protectedSpan / Math.max(cams, 1);

    const totalCenterRun = cams <= 1 ? 0 : spacingForLayout * (cams - 1);
    const firstCenter = cams <= 1 ? protectedSpan / 2 : (protectedSpan - totalCenterRun) / 2;

    const cameraPositionsFt = Array.from({ length: cams }, (_, index) => {
      return cams <= 1 ? protectedSpan / 2 : firstCenter + (spacingForLayout * index);
    });

    const rawIntervals = cameraPositionsFt.map((centerFt, index) => ({
      camera: index + 1,
      centerFt,
      startFt: centerFt - (coveragePerCameraFt / 2),
      endFt: centerFt + (coveragePerCameraFt / 2)
    }));

    const layoutIntervals = mergeCoverageIntervals(rawIntervals, protectedSpan);
    const layoutGaps = buildGapSegments(layoutIntervals, protectedSpan);

    const coveredSpanFt = layoutIntervals.reduce((sum, item) => sum + Math.max(0, item.endFt - item.startFt), 0);
    const gapFt = layoutGaps.reduce((sum, item) => sum + item.lengthFt, 0);
    const gapPct = protectedSpan > 0 ? (gapFt / protectedSpan) * 100 : 0;

    const oldStackedCoverageFt = cams <= 1
      ? coveragePerCameraFt
      : coveragePerCameraFt + ((cams - 1) * effectiveCoverageFt);

    const overCoverageFt = gapFt <= 0 ? Math.max(0, oldStackedCoverageFt - protectedSpan) : 0;

    const actualOverlapFt = cams <= 1 ? 0 : Math.max(0, coveragePerCameraFt - spacingForLayout);
    const actualOverlapPct = coveragePerCameraFt > 0 ? (actualOverlapFt / coveragePerCameraFt) * 100 : 0;
    const targetOverlapFt = cams <= 1 ? 0 : coveragePerCameraFt * (input.overlapPct / 100);
    const targetOverlapShortfallFt = cams <= 1 ? 0 : Math.max(0, targetOverlapFt - actualOverlapFt);
    const targetOverlapShortfallPct = coveragePerCameraFt > 0 ? (targetOverlapShortfallFt / coveragePerCameraFt) * 100 : 0;

    return {
      layoutSource: context.source,
      actualSpacingFt: spacingForLayout,
      cameraPositionsFt,
      rawIntervals,
      layoutIntervals,
      layoutGaps,
      totalCoverageFt: coveredSpanFt,
      modeledCoverageAvailableFt: oldStackedCoverageFt,
      gapFt,
      gapPct,
      overCoverageFt,
      coverageMarginPct: protectedSpan > 0 ? (overCoverageFt / protectedSpan) * 100 : 0,
      actualOverlapFt,
      actualOverlapPct,
      targetOverlapFt,
      targetOverlapShortfallFt,
      targetOverlapShortfallPct
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const overlap = input.overlapPct / 100;
    const coveragePerCameraFt = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const overlapFt = coveragePerCameraFt * overlap;
    const effectiveCoverageFt = coveragePerCameraFt - overlapFt;

    const layout = buildBlindSpotLayoutModel(input, coveragePerCameraFt, effectiveCoverageFt);

    const gapPressureMetric = layout.gapFt <= 0 ? 0 : Math.min(layout.gapPct * 4, 100);
    const shortfallMetric = layout.gapFt <= 0 ? 0 : Math.min(layout.gapPct * 3, 100);
    const overlapMetric = input.cams <= 1
      ? 0
      : Math.max(Math.min(input.overlapPct, 100), Math.min(layout.targetOverlapShortfallPct * 2, 100));

    const metrics = [
      {
        label: "Gap Pressure",
        value: gapPressureMetric,
        displayValue: layout.gapFt <= 0 ? "0.0 ft" : fmtFt(layout.gapFt)
      },
      {
        label: "Coverage Shortfall",
        value: shortfallMetric,
        displayValue: fmtPct(layout.gapPct)
      },
      {
        label: input.cams <= 1 ? "Single-Camera Overlap Reference" : "Overlap / Reserve Pressure",
        value: overlapMetric,
        displayValue: input.cams <= 1 ? "N/A" : fmtPct(input.overlapPct)
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
    if (layout.gapFt > 0 && layout.gapPct <= 10) coverageClass = "MINOR GAPS";
    if (layout.gapFt > 0 && layout.gapPct > 10) coverageClass = "BLIND SPOTS";

    const gapSegmentText = layout.layoutGaps.length
      ? " across " + layout.layoutGaps.length + " uncovered segment" + (layout.layoutGaps.length === 1 ? "" : "s")
      : "";

    let interpretation = "Using " + layout.layoutSource + ", Blind Spot places " + fmt(input.cams, 0) + " camera" + (input.cams === 1 ? "" : "s") + " across the protected span and maps each " + fmtFt(coveragePerCameraFt) + " footprint against the " + fmtFt(input.w) + " run. The carried spacing/layout model covers " + fmtFt(layout.totalCoverageFt) + " of the span.";

    if (coverageClass === "BLIND SPOTS") {
      interpretation += " The modeled layout leaves " + fmtFt(layout.gapFt) + " of real uncovered span" + gapSegmentText + ", so blind spots are likely unless spacing, count, or field of view changes.";
    } else if (coverageClass === "MINOR GAPS") {
      interpretation += " Coverage is close, but " + fmtFt(layout.gapFt) + " remains uncovered" + gapSegmentText + ". Field tolerances, edge performance, and aiming drift can still expose weak spots.";
    } else if (layout.targetOverlapShortfallFt > 0.01) {
      interpretation += " The protected span is covered, but actual overlap is below the requested overlap target by about " + fmtFt(layout.targetOverlapShortfallFt) + ". Treat this as a tolerance warning instead of a blind gap.";
    } else if (input.overlapPct >= 25) {
      interpretation += " Coverage is continuous, but the overlap target is high. The layout works geometrically, yet you are giving up footprint efficiency to maintain comfort margin.";
    } else {
      interpretation += " Coverage is continuous with no modeled uncovered segments, so blind spots are not indicated by the spacing-layout model.";
    }

    let dominantConstraint = "";
    if (coverageClass === "BLIND SPOTS") {
      dominantConstraint = "Coverage shortfall is the dominant limiter. The actual camera positions and coverage intervals leave uncovered span inside the protected run.";
    } else if (coverageClass === "MINOR GAPS") {
      dominantConstraint = "Gap pressure is the dominant limiter. The layout is almost workable, but one or more uncovered segments still remain.";
    } else if (layout.targetOverlapShortfallFt > 0.01) {
      dominantConstraint = "Overlap target shortfall is the dominant limiter. The protected span is covered, but the carried spacing does not achieve the requested overlap reserve.";
    } else if (input.overlapPct >= 25) {
      dominantConstraint = "Overlap compression is the dominant limiter. Coverage is complete, but heavy overlap can reduce layout efficiency.";
    } else {
      dominantConstraint = "Field geometry is balanced. The carried spacing, camera count, and footprint intervals cover the protected span.";
    }

    let guidance = "";
    if (coverageClass === "BLIND SPOTS") {
      guidance = "Do not lock this layout yet. Reduce actual spacing, add cameras, widen the effective footprint, or revise upstream Camera Spacing assumptions before moving forward.";
    } else if (coverageClass === "MINOR GAPS") {
      guidance = "Coverage is close, but verify the uncovered segments against real mounting geometry before finalizing the design.";
    } else if (layout.targetOverlapShortfallFt > 0.01) {
      guidance = "Coverage is continuous, but the requested overlap reserve is not fully achieved. Continue only if that lower reserve is intentional, or return to Camera Spacing to tighten the branch.";
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
      totalCoverageFt: layout.totalCoverageFt,
      modeledCoverageAvailableFt: layout.modeledCoverageAvailableFt,
      gapFt: layout.gapFt,
      gapPct: layout.gapPct,
      overCoverageFt: layout.overCoverageFt,
      coverageMarginPct: layout.coverageMarginPct,
      coverageClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      gapPressureMetric,
      shortfallMetric,
      overlapMetric,
      actualSpacingFt: layout.actualSpacingFt,
      layoutSource: layout.layoutSource,
      cameraPositionsFt: layout.cameraPositionsFt,
      rawIntervals: layout.rawIntervals,
      layoutIntervals: layout.layoutIntervals,
      layoutGaps: layout.layoutGaps,
      actualOverlapFt: layout.actualOverlapFt,
      actualOverlapPct: layout.actualOverlapPct,
      targetOverlapFt: layout.targetOverlapFt,
      targetOverlapShortfallFt: layout.targetOverlapShortfallFt,
      targetOverlapShortfallPct: layout.targetOverlapShortfallPct
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
      blindSpotActualSpacingFt: data.actualSpacingFt,
      blindSpotLayoutSource: data.layoutSource,
      blindSpotGapSegments: data.layoutGaps || [],
      blindSpotCameraPositionsFt: data.cameraPositionsFt || [],
      blindSpotLayoutIntervals: data.layoutIntervals || [],
      blindSpotActualOverlapPct: data.actualOverlapPct,
      blindSpotTargetOverlapShortfallFt: data.targetOverlapShortfallFt,
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
        actualSpacingFt: data.actualSpacingFt,
        layoutSource: data.layoutSource,
        gapSegments: data.layoutGaps || [],
        cameraPositionsFt: data.cameraPositionsFt || [],
        layoutIntervals: data.layoutIntervals || [],
        actualOverlapPct: data.actualOverlapPct,
        targetOverlapShortfallFt: data.targetOverlapShortfallFt,
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

  function blindSpotMultiCameraFootprintSvg(data) {
    const requiredSpan = Math.max(0, Number(data?.w) || 0);
    const modeledCoverage = Math.max(0, Number(data?.totalCoverageFt) || 0);
    const gap = Math.max(0, Number(data?.gapFt) || 0);
    const cams = Math.max(1, Math.round(Number(data?.cams) || 1));
    const overlapPct = Math.max(0, Math.min(Number(data?.overlapPct) || 0, 95));
    const actualOverlapPct = Math.max(0, Math.min(Number(data?.actualOverlapPct) || 0, 100));
    const actualSpacingFt = Math.max(0, Number(data?.actualSpacingFt) || 0);
    const perCameraFt = Math.max(0, Number(data?.coveragePerCameraFt) || 0);
    const intervals = Array.isArray(data?.layoutIntervals) ? data.layoutIntervals : [];
    const gaps = Array.isArray(data?.layoutGaps) ? data.layoutGaps : [];
    const positions = Array.isArray(data?.cameraPositionsFt) ? data.cameraPositionsFt : [];
    const rawFromData = Array.isArray(data?.rawIntervals) ? data.rawIntervals : [];

    const safeSpan = Math.max(requiredSpan, 1);
    const coveredPct = Math.max(0, Math.min(100, (modeledCoverage / safeSpan) * 100));
    const gapPct = Math.max(0, Math.min(100, (gap / safeSpan) * 100));

    const labelX = 52;
    const barX = 304;
    const barW = 304;
    const valueX = 728;
    const barH = 10;
    const row1Y = 72;
    const rowGap = 32;

    const coveredBarW = Math.max(8, Math.min(barW, barW * (coveredPct / 100)));
    const gapBarW = gap <= 0 ? 8 : Math.max(8, Math.min(barW, barW * (gapPct / 100)));
    const overlapBarW = Math.max(8, Math.min(barW, barW * (overlapPct / 100)));
    const actualOverlapBarW = Math.max(8, Math.min(barW, barW * (actualOverlapPct / 100)));

    const stageX = 34;
    const stageY = 198;
    const stageW = 732;
    const stageH = 300;

    const runX = 126;
    const runY = 394;
    const runW = 536;
    const bandH = 14;

    const clampFt = (ft) => Math.max(0, Math.min(safeSpan, Number(ft) || 0));
    const xForFt = (ft) => runX + (clampFt(ft) / safeSpan) * runW;

    const cameraCenters = positions.length
      ? positions
      : Array.from({ length: cams }, (_, index) => {
          if (cams <= 1) return safeSpan / 2;
          const spacing = actualSpacingFt > 0 ? actualSpacingFt : safeSpan / Math.max(cams, 1);
          const first = (safeSpan - spacing * (cams - 1)) / 2;
          return first + spacing * index;
        });

    const rawIntervals = rawFromData.length
      ? rawFromData
      : cameraCenters.map((centerFt, index) => ({
          camera: index + 1,
          centerFt,
          startFt: centerFt - perCameraFt / 2,
          endFt: centerFt + perCameraFt / 2
        }));

    const overlapSegments = [];
    for (let i = 0; i < rawIntervals.length - 1; i += 1) {
      const a = rawIntervals[i];
      const b = rawIntervals[i + 1];

      const aStart = clampFt(a.startFt);
      const aEnd = clampFt(a.endFt);
      const bStart = clampFt(b.startFt);
      const bEnd = clampFt(b.endFt);

      const startFt = Math.max(aStart, bStart);
      const endFt = Math.min(aEnd, bEnd);
      const lengthFt = endFt - startFt;

      if (lengthFt > 0.05) {
        overlapSegments.push({
          startFt,
          endFt,
          lengthFt,
          label: "Cam " + (i + 1) + " + " + "Cam " + (i + 2)
        });
      }
    }

    const totalOverlapFt = overlapSegments.reduce((sum, item) => sum + Math.max(0, item.lengthFt), 0);
    const totalOverlapPct = safeSpan > 0 ? (totalOverlapFt / safeSpan) * 100 : 0;

    const coveredRects = intervals.length
      ? intervals.map((item) => {
          const x1 = xForFt(item.startFt);
          const x2 = xForFt(item.endFt);
          const w = Math.max(0, x2 - x1);

          return '<rect x="' + x1.toFixed(1) + '" y="' + (runY - bandH / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bandH + '" rx="5" fill="url(#blindCoveredBand)" stroke="rgba(125,255,152,.86)" stroke-width="1.2" />';
        }).join("")
      : "";

    const overlapRects = overlapSegments.length
      ? overlapSegments.map((item, index) => {
          const x1 = xForFt(item.startFt);
          const x2 = xForFt(item.endFt);
          const w = Math.max(0, x2 - x1);
          const labelXPos = x1 + w / 2;
          const label = w >= 46
            ? '<text x="' + labelXPos.toFixed(1) + '" y="' + (runY + 35 + (index % 2) * 13) + '" text-anchor="middle" fill="rgba(255,230,150,.94)" font-size="10.5" font-weight="900">' + escapeHtml(fmtFt(item.lengthFt)) + ' overlap</text>'
            : "";

          return '<rect x="' + x1.toFixed(1) + '" y="' + (runY + 12).toFixed(1) + '" width="' + w.toFixed(1) + '" height="8" rx="4" fill="rgba(255,211,79,.82)" stroke="rgba(255,235,168,.90)" stroke-width="1" />' + label;
        }).join("")
      : '<text x="' + (runX + runW - 8) + '" y="' + (runY + 35) + '" text-anchor="end" fill="rgba(255,211,79,.78)" font-size="10.5" font-weight="850">No shared overlap segment</text>';

    const gapRects = gaps.length
      ? gaps.map((item, index) => {
          const x1 = xForFt(item.startFt);
          const x2 = xForFt(item.endFt);
          const w = Math.max(0, x2 - x1);
          const labelXPos = x1 + w / 2;
          const labelY = index % 2 === 0 ? runY - 24 : runY + 58;

          return '<rect x="' + x1.toFixed(1) + '" y="' + (runY - bandH / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bandH + '" rx="5" fill="rgba(255,138,102,.18)" stroke="rgba(255,138,102,.90)" stroke-width="1.15" />' +
            '<text x="' + labelXPos.toFixed(1) + '" y="' + labelY + '" text-anchor="middle" fill="rgba(255,188,166,.98)" font-size="11" font-weight="950">' + escapeHtml(fmtFt(item.lengthFt)) + ' gap</text>';
        }).join("")
      : '<text x="' + (runX + runW - 8) + '" y="' + (runY - 24) + '" text-anchor="end" fill="rgba(125,255,152,.96)" font-size="12" font-weight="950">No modeled gap</text>';

    const visiblePositions = cameraCenters.slice(0, 8);
    const camY = 270;
    const coneY = 358;
    const maxConePx = Math.max(72, Math.min(220, (perCameraFt / safeSpan) * runW));

    const camGroups = visiblePositions.map((pos, index) => {
      const cx = xForFt(pos);
      const left = Math.max(runX, cx - maxConePx / 2);
      const right = Math.min(runX + runW, cx + maxConePx / 2);

      return '<path d="M ' + cx.toFixed(1) + ' ' + camY + ' L ' + left.toFixed(1) + ' ' + coneY + ' L ' + right.toFixed(1) + ' ' + coneY + ' Z" fill="rgba(125,255,152,.075)" stroke="rgba(125,255,152,.34)" stroke-width="1.05" />' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + camY + '" r="8.5" fill="rgba(8,18,12,.96)" stroke="rgba(125,255,152,.86)" stroke-width="1.7" />' +
        '<line x1="' + cx.toFixed(1) + '" y1="' + (camY + 10) + '" x2="' + cx.toFixed(1) + '" y2="' + coneY + '" stroke="rgba(226,232,240,.14)" stroke-width="1" stroke-dasharray="4 5" />' +
        '<text x="' + cx.toFixed(1) + '" y="' + (camY - 18) + '" text-anchor="middle" fill="rgba(226,232,240,.70)" font-size="10.5" font-weight="850">Cam ' + (index + 1) + '</text>';
    }).join("");

    const camNote = cams > visiblePositions.length
      ? '<text x="' + (stageX + stageW - 18) + '" y="' + (stageY + 26) + '" text-anchor="end" fill="rgba(226,232,240,.56)" font-size="10.5">Showing first ' + visiblePositions.length + ' of ' + cams + ' cameras</text>'
      : "";

    const gapTone = gap > 0 ? "rgba(255,138,102,.92)" : "rgba(125,255,152,.90)";
    const overlapTone = overlapPct >= 35 ? "rgba(255,138,102,.88)" : overlapPct >= 25 ? "rgba(255,211,79,.88)" : "rgba(255,226,128,.84)";
    const actualOverlapTone = actualOverlapPct + 0.01 < overlapPct ? "rgba(255,211,79,.90)" : "rgba(125,255,152,.88)";

    return '<svg data-export-svg viewBox="0 0 800 520" role="img" aria-label="Blind spot spacing-layout plan view visualization with overlap zones">' +
      '<defs>' +
        '<linearGradient id="blindCoveredBand" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(82,201,112,.62)" />' +
          '<stop offset="100%" stop-color="rgba(151,255,176,.92)" />' +
        '</linearGradient>' +
        '<linearGradient id="blindGreenBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(84,212,116,.70)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.90)" />' +
        '</linearGradient>' +
        '<linearGradient id="blindGapBar" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(255,211,79,.76)" />' +
          '<stop offset="100%" stop-color="rgba(255,138,102,.90)" />' +
        '</linearGradient>' +
      '</defs>' +

      '<text x="52" y="28" fill="rgba(248,250,252,.94)" font-size="18" font-weight="950">Plan view: spacing, overlap, and blind gaps</text>' +
      '<text x="52" y="50" fill="rgba(226,232,240,.62)" font-size="12">Camera centers use the carried Camera Spacing result. Green is covered, amber is shared overlap, red is uncovered.</text>' +

      '<text x="' + labelX + '" y="' + row1Y + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Required protected span</text>' +
      '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(226,232,240,.26)" />' +
      '<text x="' + valueX + '" y="' + row1Y + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(requiredSpan)) + '</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Merged covered span</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(125,255,152,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap - 8) + '" width="' + coveredBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="url(#blindGreenBar)" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap) + '" text-anchor="end" fill="rgba(248,250,252,.92)" font-size="11" font-weight="900">' + escapeHtml(fmtFt(modeledCoverage)) + ' | ' + escapeHtml(fmtPct(coveredPct, 1)) + '</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap * 2) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Uncovered span</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 2 - 8) + '" width="' + gapBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + (gap > 0 ? "url(#blindGapBar)" : "rgba(125,255,152,.50)") + '" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap * 2) + '" text-anchor="end" fill="' + gapTone + '" font-size="11" font-weight="900">' + escapeHtml(fmtFt(gap)) + ' | ' + escapeHtml(fmtPct(gapPct, 1)) + '</text>' +

      '<text x="' + labelX + '" y="' + (row1Y + rowGap * 3) + '" fill="rgba(226,232,240,.72)" font-size="11" font-weight="850">Target / actual overlap</text>' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 - 8) + '" width="' + barW + '" height="' + barH + '" rx="5" fill="rgba(255,255,255,.035)" stroke="rgba(255,211,79,.12)" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 - 8) + '" width="' + overlapBarW.toFixed(1) + '" height="' + barH + '" rx="5" fill="' + overlapTone + '" />' +
      '<rect x="' + barX + '" y="' + (row1Y + rowGap * 3 + 5) + '" width="' + actualOverlapBarW.toFixed(1) + '" height="4" rx="2" fill="' + actualOverlapTone + '" />' +
      '<text x="' + valueX + '" y="' + (row1Y + rowGap * 3) + '" text-anchor="end" fill="' + overlapTone + '" font-size="11" font-weight="900">Target ' + escapeHtml(fmtPct(overlapPct, 1)) + ' | Actual ' + escapeHtml(fmtPct(actualOverlapPct, 1)) + '</text>' +

      '<rect x="' + stageX + '" y="' + stageY + '" width="' + stageW + '" height="' + stageH + '" rx="18" fill="rgba(0,0,0,.13)" stroke="rgba(125,255,152,.16)" />' +
      '<text x="' + (stageX + 18) + '" y="' + (stageY + 26) + '" fill="rgba(125,255,152,.78)" font-size="11" font-weight="950" letter-spacing=".08em">PLAN VIEW / CARRIED CAMERA SPACING</text>' +
      camNote +

      '<rect x="' + (stageX + 18) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(125,255,152,.82)" />' +
      '<text x="' + (stageX + 40) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">covered</text>' +
      '<rect x="' + (stageX + 104) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(255,211,79,.82)" />' +
      '<text x="' + (stageX + 126) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">overlap</text>' +
      '<rect x="' + (stageX + 192) + '" y="' + (stageY + 44) + '" width="16" height="7" rx="3" fill="rgba(255,138,102,.82)" />' +
      '<text x="' + (stageX + 214) + '" y="' + (stageY + 51) + '" fill="rgba(226,232,240,.62)" font-size="10.5">blind gap</text>' +

      camGroups +

      '<line x1="' + runX + '" y1="' + runY + '" x2="' + (runX + runW) + '" y2="' + runY + '" stroke="rgba(226,232,240,.28)" stroke-width="1.05" />' +
      coveredRects +
      overlapRects +
      gapRects +
      '<line x1="' + runX + '" y1="' + (runY + 48) + '" x2="' + (runX + runW) + '" y2="' + (runY + 48) + '" stroke="rgba(226,232,240,.34)" stroke-width="1" />' +
      '<line x1="' + runX + '" y1="' + (runY + 41) + '" x2="' + runX + '" y2="' + (runY + 55) + '" stroke="rgba(226,232,240,.40)" stroke-width="1" />' +
      '<line x1="' + (runX + runW) + '" y1="' + (runY + 41) + '" x2="' + (runX + runW) + '" y2="' + (runY + 55) + '" stroke="rgba(226,232,240,.40)" stroke-width="1" />' +
      '<text x="' + (runX + runW / 2) + '" y="' + (runY + 70) + '" text-anchor="middle" fill="rgba(226,232,240,.78)" font-size="11" font-weight="900">Required span: ' + escapeHtml(fmtFt(requiredSpan)) + ' | Actual spacing: ' + escapeHtml(fmtFt(actualSpacingFt)) + ' | Shared overlap: ' + escapeHtml(fmtFt(totalOverlapFt)) + ' (' + escapeHtml(fmtPct(totalOverlapPct, 1)) + ' of span)</text>' +

      '<text x="' + (stageX + 20) + '" y="' + (stageY + stageH - 15) + '" fill="rgba(226,232,240,.56)" font-size="10.5">Layout source: ' + escapeHtml(data.layoutSource || "Blind Spot") + '. Validate overlap and gaps before carrying the result into Pixel Density.</text>' +
    '</svg>';
  }

  function blindSpotPlanViewSvg(data) {
    return blindSpotMultiCameraFootprintSvg(data);
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
        { label: "Layout Covered Span", value: fmtFt(data.totalCoverageFt) },
        { label: "Result", value: data.coverageClass }
      ],
      derivedRows: [
        { label: "Area Width", value: fmtFt(data.w) },
        { label: "Validation Zone Depth", value: fmtFt(data.d) },
        { label: "Gap", value: data.gapFt <= 0 ? "0.0 ft" : fmtFt(data.gapFt) },
        { label: "Overlap Target", value: fmtPct(data.overlapPct) },
        { label: "Actual Spacing", value: fmtFt(data.actualSpacingFt) },
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