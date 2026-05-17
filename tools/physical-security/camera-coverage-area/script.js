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
  const STEP = "camera-coverage-area";
  const PREVIOUS_STEP = "field-of-view";

  const $ = (id) => document.getElementById(id);

  const els = {
    hfov: $("hfov"),
    vfov: $("vfov"),
    dist: $("dist"),
    ov: $("ov"),
    reserveStrategy: $("reserveStrategy"),
    reserveGuidance: $("reserveGuidance"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    coverageGeometry: $("coverageGeometry"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    hfov: 90,
    vfov: 55,
    dist: 60,
    ov: 15
  };

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function deg2rad(deg) {
    return (deg * Math.PI) / 180;
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—";
  }

  function fmtSqFt(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} sq ft` : "—";
  }

  function fmtPct(value, digits = 0) {
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
    if (overlapClass === "Low Overlap") {
      return "Low overlap maximizes individual camera footprint, but increases the chance of soft gaps between adjacent views.";
    }
    if (overlapClass === "Balanced Overlap") {
      return "Balanced overlap is usually the best planning range for continuous scene coverage without wasting too much usable width.";
    }
    return "High overlap improves continuity and handoff between cameras, but reduces usable coverage efficiency and can increase camera count.";
  }

  function reserveGuidance(effWidthRatioPct) {
    if (effWidthRatioPct < 70) {
      return "Usable width drops quickly once overlap reserve gets aggressive. This is appropriate when continuity matters more than raw coverage efficiency.";
    }
    if (effWidthRatioPct < 90) {
      return "This is a healthy reserve range for many practical layouts. You preserve usable width while still protecting against blind edges.";
    }
    return "Very little width is being reserved for overlap. Coverage efficiency is high, but spacing tolerance between cameras will be tighter.";
  }

  function clearDownstream() {
    [
      FLOW_KEYS.spacing,
      FLOW_KEYS.blind,
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

    if (field === "dist") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return number.toFixed(1).replace(/\.0$/, "") + " deg";
    if (field === "vfov") return number.toFixed(1).replace(/\.0$/, "") + " deg";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Target distance";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "vfov") return "Vertical FOV";
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

  function refreshManualOverrideBanner() {
    if (!els.flowNote) return;

    const existing = els.flowNote.querySelector(".flow-override-note");
    if (existing) existing.remove();

    const note = renderManualOverrideNote();
    if (note) els.flowNote.insertAdjacentHTML("beforeend", note);
  }

  const COVERAGE_RESERVE_PRESETS = {
    minimal: {
      id: "minimal",
      label: "Minimal overlap reserve",
      value: 5,
      note: "Use this when cameras are not expected to provide much side-to-side overlap. It keeps more usable width but leaves less layout tolerance."
    },
    typical: {
      id: "typical",
      label: "Typical spacing reserve",
      value: 15,
      note: "A practical baseline for many layouts before camera spacing is finalized."
    },
    conservative: {
      id: "conservative",
      label: "Conservative overlap reserve",
      value: 25,
      note: "Use this when you want more overlap/tolerance between adjacent cameras. It reduces usable spacing width."
    },
    custom: {
      id: "custom",
      label: "Custom reserve",
      value: null,
      note: "Use this when a project standard or layout assumption already defines the reserve."
    }
  };

  function reservePreset(id) {
    return COVERAGE_RESERVE_PRESETS[id] || COVERAGE_RESERVE_PRESETS.typical;
  }

  function reserveSourceInfo(ovPct) {
    const preset = reservePreset(els.reserveStrategy?.value || "typical");
    const current = Number(ovPct);
    const manual =
      preset.id === "custom" ||
      !Number.isFinite(preset.value) ||
      !Number.isFinite(current) ||
      Math.abs(current - preset.value) > 0.01;

    return {
      reserveStrategyId: preset.id,
      reserveStrategyLabel: preset.label,
      reserveSourceMode: manual ? "manual-override" : "preset",
      reserveManualOverride: manual
    };
  }

  function renderReserveGuidance() {
    if (!els.reserveGuidance) return;

    const preset = reservePreset(els.reserveStrategy?.value || "typical");
    const ovPct = num(els.ov?.value);
    const source = reserveSourceInfo(ovPct);

    els.reserveGuidance.innerHTML =
      '<strong>' + preset.label + '</strong><br>' +
      preset.note +
      '<br><span class="muted">Coverage Area converts raw lens footprint into usable planning width by subtracting side-to-side overlap reserve before Camera Spacing.</span>' +
      (source.reserveManualOverride
        ? '<div class="coverage-reserve-warning">Current overlap reserve does not match the selected strategy. This is allowed, but it will be treated as a manual coverage reserve assumption.</div>'
        : '');
  }

  function safeCoverageJsonParse(value, fallback = null) {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function readCoverageStoredJson(key) {
    return safeCoverageJsonParse(sessionStorage.getItem(key), null) ||
      safeCoverageJsonParse(localStorage.getItem(key), null);
  }

  function firstFiniteCoverageValue(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }

    return null;
  }

  function flowDataForCoverage(key) {
    const stored = readCoverageStoredJson(key);
    return stored && typeof stored === "object" && stored.data && typeof stored.data === "object"
      ? stored.data
      : {};
  }

  function activeAreaForCoverage() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;

    if (api && typeof api.getActiveArea === "function") {
      const area = api.getActiveArea();
      if (area) return area;
    }

    const ledger = readCoverageStoredJson("scopedlabs:pipeline:physical-security:areas");
    if (ledger && Array.isArray(ledger.areas) && ledger.areas.length) {
      return ledger.areas.find((area) => area.id === ledger.activeAreaId) || ledger.areas[0] || null;
    }

    return null;
  }

  function applyCoverageValue(el, value) {
    const number = Number(value);
    if (!el || !Number.isFinite(number) || number <= 0) return false;
    el.value = String(number);
    return true;
  }

  function hydrateCoverageInputsFromPipeline() {
    const area = activeAreaForCoverage() || {};
    const fovFlow = flowDataForCoverage(FLOW_KEYS.fov);
    const mountFlow = flowDataForCoverage(FLOW_KEYS.mount);

    const hfov = firstFiniteCoverageValue(
      fovFlow.hfov,
      area.fovAssumedHfovDeg,
      area.assumedHfovDeg,
      area.horizontalFovDeg,
      area.hfovDeg
    );

    const vfov = firstFiniteCoverageValue(
      mountFlow.vfov,
      area.verticalFovDeg,
      area.verticalFovProfileRecommendedDeg
    );

    const dist = firstFiniteCoverageValue(
      fovFlow.dist,
      mountFlow.dist,
      area.fovTargetDistanceFt,
      area.mountingTargetDistanceFt,
      area.distanceToTargetPlaneFt,
      area.targetDistanceFt
    );

    if (canApplyFlowInputs()) {
      if (hfov !== null) {
        captureImportedFlowValue("hfov", hfov);
        applyCoverageValue(els.hfov, hfov);
      }

      if (vfov !== null) {
        captureImportedFlowValue("vfov", vfov);
        applyCoverageValue(els.vfov, vfov);
      }

      if (dist !== null) {
        captureImportedFlowValue("dist", dist);
        applyCoverageValue(els.dist, dist);
      }
    }
  }

  function hideCoverageContinue() {
    if (!els.continueWrap) return;
    els.continueWrap.classList.remove("is-visible");
    els.continueWrap.hidden = true;
    els.continueWrap.style.display = "none";
  }

  function clearCoverageGeometryDiagram() {
    if (!els.coverageGeometry) return;
    els.coverageGeometry.hidden = true;
    els.coverageGeometry.innerHTML = "";
  }

  function escapeCoverageHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderCoverageGeometryDiagram(data) {
    if (!els.coverageGeometry || !data || !data.ok) return;

    const svgW = 620;
    const svgH = 250;
    const centerX = svgW / 2;
    const centerY = 128;
    const maxW = 410;
    const maxH = 150;

    const scale = Math.min(
      maxW / Math.max(data.width, 1),
      maxH / Math.max(data.height, 1)
    );

    const rawW = Math.max(16, data.width * scale);
    const rawH = Math.max(16, data.height * scale);
    const effW = Math.max(12, data.effWidth * scale);
    const effH = Math.max(12, data.effHeight * scale);

    const rawX = centerX - rawW / 2;
    const rawY = centerY - rawH / 2;
    const effX = centerX - effW / 2;
    const effY = centerY - effH / 2;

    const rawStroke = "rgba(255,255,255,.64)";
    const effStroke = data.status === "HEALTHY" ? "rgba(125,255,158,.95)" : data.status === "WATCH" ? "rgba(255,220,120,.95)" : "rgba(255,170,120,.95)";
    const effFill = data.status === "HEALTHY" ? "rgba(125,255,158,.12)" : data.status === "WATCH" ? "rgba(255,220,120,.12)" : "rgba(255,170,120,.12)";

    const svg =
      '<svg class="coverage-geometry-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="Coverage footprint diagram">' +
        '<rect x="0" y="0" width="' + svgW + '" height="' + svgH + '" fill="rgba(255,255,255,.01)"></rect>' +
        '<line x1="' + centerX + '" y1="28" x2="' + centerX + '" y2="' + (svgH - 26) + '" stroke="rgba(255,255,255,.16)" stroke-width="1" stroke-dasharray="5 6"></line>' +
        '<line x1="58" y1="' + centerY + '" x2="' + (svgW - 58) + '" y2="' + centerY + '" stroke="rgba(255,255,255,.16)" stroke-width="1" stroke-dasharray="5 6"></line>' +
        '<rect x="' + rawX + '" y="' + rawY + '" width="' + rawW + '" height="' + rawH + '" rx="12" fill="rgba(255,255,255,.03)" stroke="' + rawStroke + '" stroke-width="2" stroke-dasharray="8 6"></rect>' +
        '<rect x="' + effX + '" y="' + effY + '" width="' + effW + '" height="' + effH + '" rx="12" fill="' + effFill + '" stroke="' + effStroke + '" stroke-width="3"></rect>' +
        '<circle cx="' + centerX + '" cy="' + centerY + '" r="5" fill="rgba(125,255,158,.95)"></circle>' +
        '<text x="' + centerX + '" y="22" fill="rgba(255,255,255,.76)" font-size="12" font-weight="800" text-anchor="middle">Coverage footprint at target plane</text>' +
        '<text x="' + (rawX + rawW - 8) + '" y="' + Math.max(44, rawY - 8) + '" fill="rgba(255,255,255,.68)" font-size="11" font-weight="800" text-anchor="end">raw lens footprint</text>' +
        '<text x="' + (effX + effW - 8) + '" y="' + Math.min(svgH - 18, effY + effH + 18) + '" fill="rgba(255,255,255,.88)" font-size="11" font-weight="800" text-anchor="end">usable after reserve</text>' +
      '</svg>';

    els.coverageGeometry.hidden = false;
    els.coverageGeometry.innerHTML =
      '<div class="coverage-geometry-head">' +
        '<div>' +
          '<p class="coverage-geometry-title">Coverage Footprint</p>' +
          '<div class="coverage-geometry-subtitle">Raw lens footprint compared with usable coverage after overlap reserve. This is the planning footprint passed into Camera Spacing.</div>' +
        '</div>' +
        '<div class="coverage-geometry-pill">' + escapeCoverageHtml(data.efficiencyClass) + '</div>' +
      '</div>' +
      '<div class="coverage-geometry-metrics">' +
        '<div class="coverage-geometry-metric">Raw width<strong>' + escapeCoverageHtml(fmtFt(data.width)) + '</strong></div>' +
        '<div class="coverage-geometry-metric">Usable width<strong>' + escapeCoverageHtml(fmtFt(data.effWidth)) + '</strong></div>' +
        '<div class="coverage-geometry-metric">Raw area<strong>' + escapeCoverageHtml(fmtSqFt(data.area)) + '</strong></div>' +
        '<div class="coverage-geometry-metric">Usable area<strong>' + escapeCoverageHtml(fmtSqFt(data.effArea)) + '</strong></div>' +
      '</div>' +
      '<div class="coverage-geometry-svg-wrap">' + svg + '</div>' +
      '<div class="coverage-geometry-note">Planning note: the dashed rectangle is the raw field-of-view footprint. The solid rectangle is the effective planning footprint after side-to-side reserve is applied.</div>';
  }

  function applyDefaults() {
    els.hfov.value = "";
    els.vfov.value = "";
    els.dist.value = "";
    if (els.reserveStrategy) els.reserveStrategy.value = "typical";
    els.ov.value = "15";
    renderReserveGuidance();
  }

  function renderFlowNote() {
    const fovFlow = flowDataForCoverage(FLOW_KEYS.fov);
    const mountFlow = flowDataForCoverage(FLOW_KEYS.mount);
    const area = activeAreaForCoverage() || {};

    const sceneWidth = firstFiniteCoverageValue(fovFlow.sceneWidth, area.estimatedSceneWidthFt, area.targetSceneWidthFt, area.protectedLengthFt);
    const dist = firstFiniteCoverageValue(fovFlow.dist, mountFlow.dist, area.fovTargetDistanceFt, area.mountingTargetDistanceFt, area.distanceToTargetPlaneFt);
    const hfov = firstFiniteCoverageValue(fovFlow.hfov, area.fovAssumedHfovDeg, area.assumedHfovDeg);
    const vfov = firstFiniteCoverageValue(mountFlow.vfov, area.verticalFovDeg, area.verticalFovProfileRecommendedDeg);

    const parts = [];
    if (sceneWidth !== null) parts.push("Field of View width: <strong>" + fmtFt(sceneWidth) + "</strong>");
    if (dist !== null) parts.push("Distance: <strong>" + fmtFt(dist) + "</strong>");
    if (hfov !== null) parts.push("HFOV: <strong>" + fmt(hfov, 1) + " deg</strong>");
    if (vfov !== null) parts.push("VFOV: <strong>" + fmt(vfov, 1) + " deg</strong>");

    if (!parts.length) {
      if (els.flowNote) {
        els.flowNote.hidden = true;
        els.flowNote.innerHTML = "";
      }
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML =
      '<strong>Flow Context</strong><br>' +
      parts.join(" | ");

    refreshManualOverrideBanner();
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.area);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });

    hideCoverageContinue();
    clearCoverageGeometryDiagram();
    renderFlowNote();
  } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.area);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.area,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });

    renderFlowNote();
  }

  function getInputs() {
    const hfovRaw = String(els.hfov?.value || "").trim();
    const vfovRaw = String(els.vfov?.value || "").trim();
    const distRaw = String(els.dist?.value || "").trim();
    const ovRaw = String(els.ov?.value || "").trim();

    const hfov = hfovRaw === "" ? NaN : num(hfovRaw);
    const vfov = vfovRaw === "" ? NaN : num(vfovRaw);
    const dist = distRaw === "" ? NaN : num(distRaw);
    const ovPct = ovRaw === "" ? NaN : num(ovRaw);
    const reserveInfo = reserveSourceInfo(ovPct);

    if (
      hfovRaw === "" ||
      vfovRaw === "" ||
      distRaw === "" ||
      ovRaw === "" ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(vfov) || vfov <= 0 || vfov >= 180 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return { ok: false, message: "Enter horizontal FOV, vertical FOV, target distance, and overlap reserve before calculating." };
    }

    return { ok: true, hfov, vfov, dist, ovPct, ...reserveInfo };
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
    const effHeight = height;

    const area = width * height;
    const effArea = effWidth * effHeight;

    const widthRetentionPct = width > 0 ? (effWidth / width) * 100 : 0;
    const areaRetentionPct = area > 0 ? (effArea / area) * 100 : 0;
    const reserveLossPct = 100 - areaRetentionPct;

    const overlapClass = classifyOverlap(input.ovPct);
    const efficiencyClass = classifyCoverageEfficiency(areaRetentionPct);

    const metrics = [
      { label: "Reserve Pressure", value: reserveLossPct, displayValue: fmtPct(reserveLossPct, 1) },
      { label: "Width Retention Loss", value: 100 - widthRetentionPct, displayValue: fmtPct(100 - widthRetentionPct, 1) },
      { label: "Area Retention Loss", value: 100 - areaRetentionPct, displayValue: fmtPct(100 - areaRetentionPct, 1) }
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
    if (reserveLossPct >= 35) {
      dominantConstraint = "Reserve pressure is the dominant limiter. Too much usable scene area is being sacrificed to overlap, which can drive camera count and reduce layout efficiency.";
    } else if (reserveLossPct >= 20) {
      dominantConstraint = "Coverage efficiency is the dominant limiter. The reserve strategy is still workable, but it is beginning to compress usable scene width enough to affect downstream spacing.";
    } else {
      dominantConstraint = "Coverage footprint is balanced. Most of the lens footprint remains usable after reserve is applied, which gives the next spacing step a healthier starting point.";
    }

    const reserveSourceNote = input.reserveSourceMode === "manual-override"
      ? "The overlap reserve is being treated as a manual coverage assumption."
      : "The overlap reserve came from the selected coverage reserve strategy.";

    const interpretation = "Coverage reserve strategy is " + input.reserveStrategyLabel + ". At " + fmtFt(input.dist) + ", the modeled lens footprint is about " + fmtFt(width) + " wide by " + fmtFt(height) + " high, producing " + fmtSqFt(area) + " of raw area. After reserving " + fmtPct(input.ovPct) + " for side-to-side overlap, effective usable width drops to " + fmtFt(effWidth) + " while vertical coverage remains " + fmtFt(effHeight) + ", leaving about " + fmtSqFt(effArea) + " of usable scene coverage. " + reserveSourceNote + " " + interpretationCore;

    const guidance = guidanceCore + " Continue to Camera Spacing next so you can translate this usable width into actual camera-to-camera placement.";

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

  function updateActiveAreaFromCoverage(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    const overrides = Array.isArray(data.manualOverrides) ? data.manualOverrides : [];
    const hasOverride = (field) => overrides.some((item) => item.field === field);

    const payload = {
      status: "IN PROGRESS",
      coverageTargetDistanceFt: data.dist,
      coverageHfovDeg: data.hfov,
      coverageVfovDeg: data.vfov,
      coverageReserveStrategyId: data.reserveStrategyId,
      coverageReserveStrategyLabel: data.reserveStrategyLabel,
      coverageReserveSourceMode: data.reserveSourceMode,
      coverageReserveManualOverride: data.reserveManualOverride,
      overlapTargetPct: data.ovPct,
      rawCoverageWidthFt: data.width,
      rawCoverageHeightFt: data.height,
      rawCoverageAreaSqFt: data.area,
      effectiveCoverageWidthFt: data.effWidth,
      effectiveCoverageHeightFt: data.effHeight,
      effectiveCoverageAreaSqFt: data.effArea,
      widthRetentionPct: data.widthRetentionPct,
      areaRetentionPct: data.areaRetentionPct,
      reserveLossPct: data.reserveLossPct,
      coverageOverlapClass: data.overlapClass,
      coverageEfficiencyClass: data.efficiencyClass,
      coverageStatus: data.status,
      coverageInterpretation: data.interpretation,
      coverageDominantConstraint: data.dominantConstraint,
      coverageGuidance: data.guidance,
      coverageManualOverrides: overrides,
      coverageUpdatedAt: new Date().toISOString()
    };

    if (!hasOverride("dist")) payload.distanceToTargetPlaneFt = data.dist;
    if (!hasOverride("hfov")) payload.assumedHfovDeg = data.hfov;
    if (!hasOverride("vfov")) payload.verticalFovDeg = data.vfov;

    api.updateActiveAreaResult(payload);
  }

  

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    data.sourceMode = manualOverrideMeta.length ? "manual-override" : "pipeline";
    data.manualOverrides = manualOverrideMeta;

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.area, {
      category: CATEGORY,
      step: STEP,
      data: {
        hfov: data.hfov,
        vfov: data.vfov,
        dist: data.dist,
        ov: data.ov,
        ovPct: data.ovPct,
        reserveStrategyId: data.reserveStrategyId,
        reserveStrategyLabel: data.reserveStrategyLabel,
        reserveSourceMode: data.reserveSourceMode,
        reserveManualOverride: data.reserveManualOverride,
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
        guidance: data.guidance,
        sourceMode: data.sourceMode,
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromCoverage(data);
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    hideCoverageContinue();
    clearCoverageGeometryDiagram();
    els.results.innerHTML = '<div class="muted">' + message + '</div>';
  }

  function forceCoverageContinueVisible() {
    if (els.continueWrap) {
      els.continueWrap.hidden = false;
      els.continueWrap.removeAttribute("hidden");
      els.continueWrap.classList.add("is-visible");
      els.continueWrap.style.display = "flex";
      els.continueWrap.style.marginTop = "0";
    }

    if (els.continueBtn) {
      els.continueBtn.hidden = false;
      els.continueBtn.removeAttribute("hidden");
    }
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Raw Coverage Width", value: fmtFt(data.width) },
        { label: "Usable Coverage Width", value: fmtFt(data.effWidth) },
        { label: "Raw Coverage Area", value: fmtSqFt(data.area) },
        { label: "Usable Coverage Area", value: fmtSqFt(data.effArea) }
      ],
      derivedRows: [
        { label: "Coverage Reserve Strategy", value: data.reserveStrategyLabel },
        { label: "Overlap Reserve", value: fmtPct(data.ovPct) },
        { label: "Coverage Height", value: fmtFt(data.height) },
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

    renderCoverageGeometryDiagram(data);
    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
    forceCoverageContinueVisible();
  }

  function calc() {
    const result = calculateModel();
    if (!result.ok) return renderError(result.message);
    renderSuccess(result);
  }

  function reset() {
    resetFlowOverrideState();
    applyDefaults();
    hydrateCoverageInputsFromPipeline();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    if (els.reserveStrategy) {
      els.reserveStrategy.addEventListener("change", () => {
        const preset = reservePreset(els.reserveStrategy.value);
        if (preset.id !== "custom" && Number.isFinite(preset.value)) {
          els.ov.value = String(preset.value);
        }
        renderReserveGuidance();
        invalidate({ clearFlow: true });
      });
    }

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    ["hfov", "vfov", "dist", "ov"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      const handleEdit = () => {
        if (id === "ov") renderReserveGuidance();
        markFlowInputOverride(id);
        invalidate({ clearFlow: true });
        renderFlowNote();
        refreshManualOverrideBanner();
      };

      el.addEventListener("input", handleEdit);
      el.addEventListener("change", handleEdit);
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

  function initTool() {
    bind();
    applyDefaults();
    hydrateCoverageInputsFromPipeline();
    renderReserveGuidance();
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