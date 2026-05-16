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
  const STEP = "field-of-view";
  const PREVIOUS_STEP = "mounting-height";

  const $ = (id) => document.getElementById(id);

  const els = {
    dist: $("dist"),
    hfov: $("hfov"),
    scene: $("scene"),
    h: $("h"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    fovGeometry: $("fovGeometry"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    dist: 40,
    hfov: 90,
    scene: 60,
    h: 12
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

  function fmtRatio(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}x` : "—";
  }

  function fmtDeg(value, digits = 1) {
    const degree = String.fromCharCode(176);
    return Number.isFinite(value) ? value.toFixed(digits) + degree : "?";
  }

  function classifyFit(coverageRatio) {
    if (coverageRatio < 0.9) return "Too Narrow";
    if (coverageRatio <= 1.15) return "Good Fit";
    return "Too Wide";
  }

  function interpretationForFit(fitClass) {
    if (fitClass === "Too Narrow") {
      return "Current field of view does not cover the full target scene width. You will likely need a wider lens, shorter standoff distance, or more cameras.";
    }
    if (fitClass === "Good Fit") {
      return "Field of view is in a practical range for the intended scene width. This is a workable baseline for downstream coverage-area and spacing decisions.";
    }
    return "Field of view is wider than necessary for the target scene width. This improves coverage breadth, but may dilute detail and weaken identification performance.";
  }

  function lensGuidance(hfov) {
    if (hfov < 50) {
      return "This is a relatively tight view. Good for concentrating detail, but scene coverage width will be limited.";
    }
    if (hfov <= 90) {
      return "This is a balanced field of view for many general surveillance applications.";
    }
    return "This is a wide view. Useful for broad awareness, but watch for reduced target detail at the far edges of coverage.";
  }

  function clearDownstream() {
    [
      FLOW_KEYS.area,
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
    if (field === "h") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "scene") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return number.toFixed(1).replace(/\.0$/, "") + " deg";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Target distance";
    if (field === "h") return "Mount height";
    if (field === "scene") return "Target scene width";
    if (field === "hfov") return "Horizontal FOV";
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

  

  

  

  

  

  function safeFovJsonParse(value, fallback = null) {
    if (!value) return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  }

  function readFovStoredJson(key) {
    return safeFovJsonParse(sessionStorage.getItem(key), null) ||
      safeFovJsonParse(localStorage.getItem(key), null);
  }

  function firstFiniteFovValue(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }

    return null;
  }

  function activeAreaForFieldOfView() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;

    if (api && typeof api.getActiveArea === "function") {
      const area = api.getActiveArea();
      if (area) return area;
    }

    const ledger = readFovStoredJson("scopedlabs:pipeline:physical-security:areas");
    if (ledger && Array.isArray(ledger.areas) && ledger.areas.length) {
      return ledger.areas.find((area) => area.id === ledger.activeAreaId) || ledger.areas[0] || null;
    }

    return null;
  }

  function flowDataForFov(key) {
    const stored = readFovStoredJson(key);
    return stored && typeof stored === "object" && stored.data && typeof stored.data === "object"
      ? stored.data
      : {};
  }

  function applyFovValue(el, value) {
    const number = Number(value);
    if (!el || !Number.isFinite(number) || number <= 0) return false;
    el.value = String(number);
    return true;
  }

  function hydrateFovInputsFromActiveArea() {
    const area = activeAreaForFieldOfView() || {};
    const mountFlow = flowDataForFov(FLOW_KEYS.mount);
    const areaFlow = flowDataForFov("scopedlabs:pipeline:physical-security:area-planner");

    const sceneWidth = firstFiniteFovValue(
      area.fovTargetSceneWidthFt,
      area.targetSceneWidthFt,
      area.protectedLengthFt,
      area.sceneWidthFt,
      areaFlow.protectedLengthFt
    );

    const hfov = firstFiniteFovValue(
      area.fovAssumedHfovDeg,
      area.assumedHfovDeg,
      area.horizontalFovDeg,
      area.hfovDeg,
      areaFlow.assumedHfovDeg
    );

    const distance = firstFiniteFovValue(
      mountFlow.dist,
      area.mountingTargetDistanceFt,
      area.fovTargetDistanceFt,
      area.distanceToTargetPlaneFt,
      area.targetDistanceFt,
      areaFlow.distanceToTargetPlaneFt
    );

    const mountHeight = firstFiniteFovValue(
      mountFlow.h,
      area.mountingHeightFt,
      area.fovMountHeightFt,
      area.mountHeightFt
    );

    if (sceneWidth !== null) {
      captureImportedFlowValue("scene", sceneWidth);
      applyFovValue(els.scene, sceneWidth);
    }

    if (hfov !== null) {
      captureImportedFlowValue("hfov", hfov);
      applyFovValue(els.hfov, hfov);
    }

    if (distance !== null) {
      captureImportedFlowValue("dist", distance);
      applyFovValue(els.dist, distance);
    }

    if (mountHeight !== null) {
      captureImportedFlowValue("h", mountHeight);
      applyFovValue(els.h, mountHeight);
    }
  }

  function hideFovContinue() {
    if (!els.continueWrap) return;
    els.continueWrap.classList.remove("is-visible");
    els.continueWrap.hidden = true;
    els.continueWrap.style.display = "none";
  }

  function forceFovContinueVisible() {
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

  function applyDefaults() {
    els.dist.value = "";
    els.hfov.value = "";
    els.scene.value = "";
    els.h.value = "";
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.fov,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow Context",
      intro: "This step uses the prior mounting-height recommendation to estimate how much scene width the selected field of view can realistically cover at the target distance."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const data = flow.data || {};
    const h = num(data.h || 0);
    const dist = num(data.dist || 0);
    const tilt = num(data.tilt || 0);
    const tiltClass = data.tiltClass || "";

    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("h", h);

    if (canApplyFlowInputs()) {
      if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Math.round(dist));
      if (Number.isFinite(h) && h > 0) els.h.value = String(Math.round(h));
    }

    const parts = [];
    if (Number.isFinite(h) && h > 0) parts.push(`Mount height: <strong>${fmtFt(h)}</strong>`);
    if (Number.isFinite(dist) && dist > 0) parts.push(`Target distance: <strong>${fmtFt(dist)}</strong>`);
    if (Number.isFinite(tilt) && tilt > 0) parts.push(`Suggested tilt: <strong>${fmtDeg(tilt)}</strong>`);
    if (tiltClass) parts.push(`Angle quality: <strong>${tiltClass}</strong>`);

    if (parts.length) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Flow Context</strong><br>
        ${parts.join(" | ")}\n        ${renderManualOverrideNote()}
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.fov);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.fov,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hideFovContinue();

    if (typeof clearFovGeometryDiagram === "function") {
      clearFovGeometryDiagram();
    }

    renderFlowNote();
  }

  function getInputs() {
    const distRaw = String(els.dist?.value || "").trim();
    const hfovRaw = String(els.hfov?.value || "").trim();
    const sceneRaw = String(els.scene?.value || "").trim();
    const hRaw = String(els.h?.value || "").trim();

    const dist = distRaw === "" ? NaN : num(distRaw);
    const hfov = hfovRaw === "" ? NaN : num(hfovRaw);
    const scene = sceneRaw === "" ? NaN : num(sceneRaw);
    const h = hRaw === "" ? NaN : num(hRaw);

    if (
      distRaw === "" ||
      hfovRaw === "" ||
      sceneRaw === "" ||
      hRaw === "" ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(scene) || scene <= 0 ||
      !Number.isFinite(h) || h <= 0
    ) {
      return { ok: false, message: "Enter target distance, horizontal FOV, target scene width, and mount height before calculating." };
    }

    return { ok: true, dist, hfov, scene, h };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const sceneWidth = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const halfWidth = sceneWidth / 2;
    const coverageRatio = input.scene > 0 ? sceneWidth / input.scene : 0;
    const fitClass = classifyFit(coverageRatio);
    const fitText = interpretationForFit(fitClass);
    const lensText = lensGuidance(input.hfov);
    const diagonalReach = Math.sqrt((sceneWidth * sceneWidth) + (input.dist * input.dist));
    const widthPerFootHeight = input.h > 0 ? sceneWidth / input.h : 0;

    const shortfallPct = input.scene > 0 && sceneWidth < input.scene
      ? ((input.scene - sceneWidth) / input.scene) * 100
      : 0;

    const overshootPct = input.scene > 0 && sceneWidth > input.scene
      ? ((sceneWidth - input.scene) / input.scene) * 100
      : 0;

    const fitPressureMetric = fitClass === "Too Narrow"
      ? Math.min(shortfallPct * 2.5, 100)
      : fitClass === "Too Wide"
        ? Math.min(overshootPct * 0.9, 100)
        : Math.min(Math.abs(coverageRatio - 1) * 100, 100);

    const lensBreadthMetric = input.hfov > 90 ? Math.min((input.hfov - 90) * 1.25, 100) : 0;
    const geometryMetric = input.h > 0 && widthPerFootHeight > 8
      ? Math.min((widthPerFootHeight - 8) * 8, 100)
      : 0;

    const metrics = [
      {
        label: "Fit Pressure",
        value: fitPressureMetric,
        displayValue: fitClass === "Good Fit" ? fitClass : fmtRatio(coverageRatio)
      },
      {
        label: "Lens Breadth",
        value: lensBreadthMetric,
        displayValue: fmtDeg(input.hfov)
      },
      {
        label: "Geometry Spread",
        value: geometryMetric,
        displayValue: input.h > 0 ? `${fmt(widthPerFootHeight, 2)} ft/ft` : "N/A"
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(fitPressureMetric, lensBreadthMetric, geometryMetric),
      metrics,
      healthyMax: 20,
      watchMax: 40
    });

    const interpretation = `At ${fmtFt(input.dist)}, a ${fmtDeg(input.hfov)} horizontal field of view covers about ${fmtFt(sceneWidth)} of scene width, or ${fmtFt(halfWidth)} to either side of centerline. Against the requested scene width of ${fmtFt(input.scene)}, the layout is classified as ${fitClass}. ${fitText}`;

    let dominantConstraint = "";
    if (fitClass === "Too Narrow") {
      dominantConstraint = "Fit pressure is the dominant limiter. The lens footprint is not wide enough for the target scene, so coverage gaps or extra cameras become the first downstream issue.";
    } else if (fitClass === "Too Wide") {
      dominantConstraint = "Lens breadth is the dominant limiter. You can cover the width, but the view is spreading scene detail across a broader footprint than necessary.";
    } else if (input.h > 0 && widthPerFootHeight > 8) {
      dominantConstraint = "Geometry spread is the dominant limiter. The scene width is expanding quickly relative to mount height, which can make detail distribution less efficient.";
    } else {
      dominantConstraint = "The field geometry is balanced. Distance, horizontal angle, and target scene width are aligned well enough for the next planning steps.";
    }

    let guidance = "";
    if (fitClass === "Too Narrow") {
      guidance = "Widen the lens, move closer, or plan on additional cameras before trusting this layout. Then continue to Coverage Area once the width fit is acceptable.";
    } else if (fitClass === "Too Wide") {
      guidance = "Coverage is broad enough, but verify whether this much width is actually desirable for the target detail level. Continue to Coverage Area to translate this width into usable scene footprint.";
    } else {
      guidance = "This is a workable starting point. Continue to Coverage Area to convert the lens footprint into usable width, height, and effective coverage after reserve is applied.";
    }

    return {
      ok: true,
      ...input,
      sceneWidth,
      halfWidth,
      coverageRatio,
      fitClass,
      fitText,
      lensText,
      diagonalReach,
      widthPerFootHeight,
      interpretation,
      dominantConstraint,
      guidance,
      status: statusPack.status
    };
  }

  function updateActiveAreaFromFov(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    const overrides = Array.isArray(data.manualOverrides) ? data.manualOverrides : [];
    const hasOverride = (field) => overrides.some((item) => item.field === field);

    const payload = {
      status: "IN PROGRESS",
      fovTargetDistanceFt: data.dist,
      fovAssumedHfovDeg: data.hfov,
      fovTargetSceneWidthFt: data.scene,
      fovMountHeightFt: data.h,
      estimatedSceneWidthFt: data.sceneWidth,
      halfWidthFt: data.halfWidth,
      coverageRatio: data.coverageRatio,
      fovFitClass: data.fitClass,
      fovStatus: data.status,
      fovLensGuidance: data.lensText,
      fovDiagonalReachFt: data.diagonalReach,
      fovWidthPerFootHeight: data.widthPerFootHeight,
      fovSourceMode: data.sourceMode,
      fovManualOverrides: overrides,
      fovInterpretation: data.interpretation,
      fovDominantConstraint: data.dominantConstraint,
      fovGuidance: data.guidance,
      fovUpdatedAt: new Date().toISOString()
    };

    if (!hasOverride("dist")) payload.distanceToTargetPlaneFt = data.dist;
    if (!hasOverride("hfov")) payload.assumedHfovDeg = data.hfov;
    if (!hasOverride("scene")) payload.targetSceneWidthFt = data.scene;
    if (!hasOverride("h")) payload.mountingHeightFt = data.h;

    api.updateActiveAreaResult(payload);
  }

  

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    data.sourceMode = manualOverrideMeta.length ? "manual-override" : "pipeline";
    data.manualOverrides = manualOverrideMeta;

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.fov, {
      category: CATEGORY,
      step: STEP,
      data: {
        dist: data.dist,
        hfov: data.hfov,
        scene: data.scene,
        h: data.h,
        sceneWidth: data.sceneWidth,
        halfWidth: data.halfWidth,
        coverageRatio: data.coverageRatio,
        fitClass: data.fitClass,
        fitText: data.fitText,
        lensText: data.lensText,
        diagonalReach: data.diagonalReach,
        widthPerFootHeight: data.widthPerFootHeight,
        interpretation: data.interpretation,
        guidance: data.guidance,
        sourceMode: data.sourceMode,
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromFov(data);
  }

  function escapeFovHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function fmtFtShort(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "n/a";
    return number.toFixed(1).replace(/\.0$/, "") + " ft";
  }

  function fmtDegText(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "n/a";
    return number.toFixed(1).replace(/\.0$/, "") + " deg";
  }

  function fovStatusLabel(data) {
    if (!data || !data.fitClass) return "Planning View";
    if (data.fitClass === "Good Fit") return "Geometry Fit";
    return data.fitClass;
  }

  function clearFovGeometryDiagram() {
    if (!els.fovGeometry) return;
    els.fovGeometry.hidden = true;
    els.fovGeometry.innerHTML = "";
  }

  function renderFovGeometryDiagram(data) {
    if (!els.fovGeometry || !data || !data.ok) return;

    const cameraX = 82;
    const targetX = 560;
    const centerY = 150;
    const maxSpanPx = 170;
    const svgW = 680;
    const svgH = 290;

    const calculatedWidth = Math.max(Number(data.sceneWidth) || 0, 0.1);
    const requiredWidth = Math.max(Number(data.scene) || 0, 0.1);
    const maxWidth = Math.max(calculatedWidth, requiredWidth, 1);
    const scale = maxSpanPx / maxWidth;

    const calculatedPx = Math.max(12, calculatedWidth * scale);
    const requiredPx = Math.max(12, requiredWidth * scale);

    const coneTopY = centerY - calculatedPx / 2;
    const coneBottomY = centerY + calculatedPx / 2;
    const requiredTopY = centerY - requiredPx / 2;
    const requiredBottomY = centerY + requiredPx / 2;

    const axisY = 252;
    const goodFit = data.fitClass === "Good Fit";
    const tooNarrow = data.fitClass === "Too Narrow";
    const coneStroke = goodFit ? "rgba(125,255,158,.95)" : tooNarrow ? "rgba(255,190,120,.95)" : "rgba(255,220,120,.95)";
    const coneFill = goodFit ? "rgba(125,255,158,.14)" : tooNarrow ? "rgba(255,150,80,.14)" : "rgba(255,210,90,.13)";
    const requiredStroke = "rgba(255,255,255,.78)";
    const centerStroke = "rgba(255,255,255,.28)";

    const widthLabelY = Math.max(26, coneTopY - 8);
    const requiredLabelY = Math.min(svgH - 58, requiredBottomY + 16);
    const requiredX = Math.min(svgW - 128, targetX + 26);

    const svg =
      '<svg class="fov-geometry-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="Field of view geometry diagram">' +
        '<defs>' +
          '<marker id="fovArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">' +
            '<path d="M0,0 L8,4 L0,8 Z" fill="rgba(255,255,255,.62)"></path>' +
          '</marker>' +
        '</defs>' +

        '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + centerY + '" stroke="' + centerStroke + '" stroke-width="2" stroke-dasharray="5 7"></line>' +

        '<polygon points="' + cameraX + ',' + centerY + ' ' + targetX + ',' + coneTopY + ' ' + targetX + ',' + coneBottomY + '" fill="' + coneFill + '" stroke="' + coneStroke + '" stroke-width="2"></polygon>' +

        '<line x1="' + targetX + '" y1="' + coneTopY + '" x2="' + targetX + '" y2="' + coneBottomY + '" stroke="' + coneStroke + '" stroke-width="5" stroke-linecap="round"></line>' +
        '<line x1="' + (targetX + 26) + '" y1="' + requiredTopY + '" x2="' + (targetX + 26) + '" y2="' + requiredBottomY + '" stroke="' + requiredStroke + '" stroke-width="4" stroke-linecap="round"></line>' +

        '<circle cx="' + cameraX + '" cy="' + centerY + '" r="8" fill="rgba(125,255,158,.95)"></circle>' +
        '<circle cx="' + cameraX + '" cy="' + centerY + '" r="17" fill="none" stroke="rgba(125,255,158,.26)" stroke-width="2"></circle>' +

        '<line x1="' + cameraX + '" y1="' + axisY + '" x2="' + targetX + '" y2="' + axisY + '" stroke="rgba(255,255,255,.52)" stroke-width="2" marker-end="url(#fovArrow)"></line>' +
        '<line x1="' + cameraX + '" y1="' + (axisY - 7) + '" x2="' + cameraX + '" y2="' + (axisY + 7) + '" stroke="rgba(255,255,255,.52)" stroke-width="2"></line>' +
        '<line x1="' + targetX + '" y1="' + (axisY - 7) + '" x2="' + targetX + '" y2="' + (axisY + 7) + '" stroke="rgba(255,255,255,.52)" stroke-width="2"></line>' +

        '<text x="' + cameraX + '" y="' + (centerY - 27) + '" fill="rgba(255,255,255,.86)" font-size="12" font-weight="800" text-anchor="middle">Camera</text>' +
        '<text x="' + cameraX + '" y="' + (centerY + 40) + '" fill="rgba(255,255,255,.62)" font-size="11" text-anchor="middle">Mount ' + escapeFovHtml(fmtFtShort(data.h)) + '</text>' +

        '<text x="' + ((cameraX + targetX) / 2) + '" y="' + (axisY + 22) + '" fill="rgba(255,255,255,.72)" font-size="12" font-weight="800" text-anchor="middle">Target distance: ' + escapeFovHtml(fmtFtShort(data.dist)) + '</text>' +

        '<text x="' + (targetX - 8) + '" y="' + widthLabelY + '" fill="rgba(255,255,255,.86)" font-size="12" font-weight="800" text-anchor="end">Coverage: ' + escapeFovHtml(fmtFtShort(data.sceneWidth)) + '</text>' +
        '<text x="' + requiredX + '" y="' + requiredLabelY + '" fill="rgba(255,255,255,.78)" font-size="12" font-weight="800">Required: ' + escapeFovHtml(fmtFtShort(data.scene)) + '</text>' +

        '<text x="' + ((cameraX + targetX) / 2) + '" y="36" fill="rgba(255,255,255,.70)" font-size="12" font-weight="800" text-anchor="middle">HFOV ' + escapeFovHtml(fmtDegText(data.hfov)) + '</text>' +

        '<rect x="22" y="20" width="170" height="54" rx="13" fill="rgba(0,0,0,.24)" stroke="rgba(255,255,255,.10)"></rect>' +
        '<text x="38" y="42" fill="rgba(255,255,255,.68)" font-size="11" font-weight="800">Coverage ratio</text>' +
        '<text x="38" y="64" fill="rgba(255,255,255,.94)" font-size="18" font-weight="900">' + escapeFovHtml(fmtRatio(data.coverageRatio)) + '</text>' +
      '</svg>';

    els.fovGeometry.hidden = false;
    els.fovGeometry.innerHTML =
      '<div class="fov-geometry-head">' +
        '<div>' +
          '<p class="fov-geometry-title">Field of View Geometry</p>' +
          '<div class="fov-geometry-subtitle">Top-view planning diagram showing the camera cone, target distance, calculated scene width, and required scene width.</div>' +
        '</div>' +
        '<div class="fov-geometry-pill">' + escapeFovHtml(fovStatusLabel(data)) + '</div>' +
      '</div>' +
      '<div class="fov-geometry-svg-wrap">' + svg + '</div>' +
      '<div class="fov-geometry-note">Planning note: this is a simplified horizontal field-of-view diagram. Mount height is shown as context from the previous step, but horizontal width is driven by target distance and HFOV.</div>';
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    hideFovContinue();

    if (typeof clearFovGeometryDiagram === "function") {
      clearFovGeometryDiagram();
    }

    els.results.innerHTML = '<div class="muted">' + message + '</div>';
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Estimated Scene Width @ Distance", value: fmtFt(data.sceneWidth) },
        { label: "Half-Width from Centerline", value: fmtFt(data.halfWidth) },
        { label: "Target Scene Width", value: fmtFt(data.scene) },
        { label: "Coverage Fit", value: data.fitClass }
      ],
      derivedRows: [
        { label: "Coverage Ratio", value: data.scene > 0 ? fmtRatio(data.coverageRatio) : "N/A" },
        { label: "Approx. Diagonal Reach", value: fmtFt(data.diagonalReach) },
        { label: "Scene Width per Foot of Mount Height", value: data.h > 0 ? fmt(data.widthPerFootHeight, 2) + " ft/ft" : "N/A" },
        { label: "Mount Height", value: fmtFt(data.h) },
        { label: "Lens Guidance", value: data.lensText }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    renderFovGeometryDiagram(data);
    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);

    if (typeof forceFovContinueVisible === "function") {
      forceFovContinueVisible();
    }
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    resetFlowOverrideState();
    applyDefaults();
    hydrateFovInputsFromActiveArea();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);

    ["dist", "hfov", "scene", "h"].forEach((id) => {
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

    bind();
    applyDefaults();
    hydrateFovInputsFromActiveArea();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
