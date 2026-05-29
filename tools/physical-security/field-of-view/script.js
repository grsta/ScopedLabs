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
    planningFlowContext: $("planning-flow-context"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue")
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
    const contextEl = els.planningFlowContext || els.flowNote;
    if (els.flowNote && els.flowNote !== contextEl) {
      visibleFlowContextEl().hidden = true;
    }

    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: contextEl,
      flowKey: FLOW_KEYS.fov,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Imported Assumptions",
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

    if (parts.length && contextEl) {
      contextEl.hidden = false;
      contextEl.innerHTML = `
        <strong>Imported Assumptions</strong><br>
        ${parts.join(" | ")}
        ${renderManualOverrideNote()}
      `;
    }

    if (els.flowNote && els.flowNote !== contextEl) {
      visibleFlowContextEl().hidden = true;
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

  


  // data-field-of-view-guidance-factory-adapter-001
  let fieldOfViewGuidanceAdapter = null;

  function cloneFieldOfViewGuidance(value) {
    if (!value || typeof value !== "object") return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function fieldOfViewSourceMode(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    return manualOverrideMeta.length ? "manual-override" : "pipeline";
  }

  function fieldOfViewGuidanceStatus(data) {
    const status = String(data && data.status || "").toLowerCase();
    const fitClass = String(data && data.fitClass || "").toLowerCase();

    if (fitClass === "too narrow") return "risk";
    if (fitClass === "too wide") return status.includes("risk") ? "watch" : "watch";
    if (status.includes("risk") || status.includes("watch")) return "watch";
    if (fitClass === "good fit") return "healthy";

    return "unknown";
  }

  function fieldOfViewExpectedResult(data) {
    const parts = [];

    if (data.fitClass) parts.push(data.fitClass);
    if (Number.isFinite(Number(data.sceneWidth))) parts.push(fmtFt(data.sceneWidth) + " scene width at " + fmtFt(data.dist));
    if (Number.isFinite(Number(data.scene))) parts.push(fmtFt(data.scene) + " target scene");
    if (Number.isFinite(Number(data.coverageRatio)) && Number(data.scene) > 0) parts.push(fmtRatio(data.coverageRatio) + " coverage ratio");
    if (Number.isFinite(Number(data.hfov))) parts.push(fmtDeg(data.hfov) + " HFOV");
    if (Number.isFinite(Number(data.halfWidth))) parts.push(fmtFt(data.halfWidth) + " each side of centerline");

    return parts.filter(Boolean).join(" | ");
  }

  function fieldOfViewPrimaryRecommendation(data) {
    const fitClass = String(data.fitClass || "");
    const normalizedFit = fitClass.toLowerCase();
    const expectedResult = fieldOfViewExpectedResult(data);

    if (normalizedFit === "too narrow") {
      return {
        action: "Widen Field of View Before Coverage Area",
        reason: "The modeled lens footprint is narrower than the target scene width, so downstream coverage planning may inherit a width gap.",
        expectedResult,
        confidence: "Width shortfall",
        nextStep: "Use a wider HFOV, move the camera closer, split the scene, or plan additional cameras before carrying this into Coverage Area."
      };
    }

    if (normalizedFit === "too wide") {
      return {
        action: "Validate Detail Before Carry Forward",
        reason: "The view covers the requested scene width, but it may spread detail across more scene than needed.",
        expectedResult,
        confidence: "Broad footprint",
        nextStep: "Continue to Coverage Area only if this wide footprint is intentional for the protected scene."
      };
    }

    if (normalizedFit === "good fit") {
      return {
        action: "Keep Current Field of View Baseline",
        reason: "The modeled horizontal field of view aligns with the requested scene width well enough for the next planning step.",
        expectedResult,
        confidence: "Balanced footprint",
        nextStep: "Carry this lens footprint into Coverage Area."
      };
    }

    return {
      action: "Review Field of View Assumptions",
      reason: "The current field-of-view result needs review before it is carried into the next planning step.",
      expectedResult,
      confidence: "Review required",
      nextStep: "Confirm distance, HFOV, target scene width, and mount-height assumptions."
    };
  }

  function fieldOfViewSecondaryOptions(data) {
    const fitClass = String(data.fitClass || "").toLowerCase();

    const options = [
      {
        label: "Use a wider HFOV",
        intent: "Increase horizontal scene width when the view is too narrow.",
        expectedResult: "Scene width should move closer to or above the target scene width.",
        tradeoff: "A wider view can reduce downstream pixel density.",
        canApply: fitClass === "too narrow"
      },
      {
        label: "Move the camera closer",
        intent: "Increase usable scene coverage without changing lens assumptions.",
        expectedResult: "The same HFOV covers more of the required scene width relative to the target.",
        tradeoff: "May affect mounting, obstruction, and placement constraints.",
        canApply: fitClass === "too narrow"
      },
      {
        label: "Use a narrower HFOV",
        intent: "Preserve detail when the current view is much wider than needed.",
        expectedResult: "Coverage ratio should move closer to the target scene width.",
        tradeoff: "May require more cameras for wide areas.",
        canApply: fitClass === "too wide"
      },
      {
        label: "Split the scene",
        intent: "Break a wide protected area into smaller planning zones.",
        expectedResult: "Each zone can keep a cleaner field-of-view and downstream detail target.",
        tradeoff: "Adds planning complexity but improves assumption clarity.",
        canApply: true
      },
      {
        label: "Continue to Coverage Area",
        intent: "Translate this lens footprint into usable scene coverage.",
        expectedResult: "Coverage Area will apply reserve assumptions to the field-of-view footprint.",
        tradeoff: "Only carry forward when the FOV assumptions match the intended design branch.",
        canApply: fitClass === "good fit" || fitClass === "too wide"
      }
    ];

    return options.filter((option) => option.canApply !== false);
  }

  function buildFieldOfViewGuidanceInput(data) {
    const mode = fieldOfViewSourceMode(data);
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const primary = fieldOfViewPrimaryRecommendation(data);
    const helper = window.ScopedLabsUserAssistantGuidance;

    const sourceLabel = helper && typeof helper.sourceLabelForMode === "function"
      ? helper.sourceLabelForMode(mode)
      : (mode === "manual-override" ? "Manual override" : "Clean pipeline");

    const sourceMessage = helper && typeof helper.sourceMessageForMode === "function"
      ? helper.sourceMessageForMode(mode)
      : "Use this result only when the assumptions match the intended design branch.";

    return {
      status: fieldOfViewGuidanceStatus(data),
      mode,
      primaryRecommendation: primary,
      secondaryOptions: fieldOfViewSecondaryOptions(data),
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
        nextTool: "camera-coverage-area",
        message: "Carry this field-of-view footprint into Coverage Area only when distance, HFOV, target scene width, and mount-height assumptions match the intended protected scene."
      }
    };
  }

  function getFieldOfViewGuidanceAdapter() {
    if (fieldOfViewGuidanceAdapter) return fieldOfViewGuidanceAdapter;

    const factory = window.ScopedLabsUserGuidanceAdapterFactory;

    if (factory && typeof factory.createAdapter === "function") {
      fieldOfViewGuidanceAdapter = factory.createAdapter({
        toolKey: "field-of-view",
        globalName: "ScopedLabsFieldOfViewGuidance",
        version: "field-of-view-guidance-adapter-001-factory",
        nextTool: "camera-coverage-area",
        carryForwardMessage: "Carry this field-of-view footprint into Coverage Area only when assumptions match the intended protected scene.",
        buildGuidance: buildFieldOfViewGuidanceInput
      });

      return fieldOfViewGuidanceAdapter;
    }

    let latestGuidance = null;

    fieldOfViewGuidanceAdapter = {
      version: "field-of-view-guidance-adapter-001-fallback",
      update(data) {
        latestGuidance = Object.assign({
          version: "field-of-view-guidance-adapter-001-fallback"
        }, buildFieldOfViewGuidanceInput(data));
        return cloneFieldOfViewGuidance(latestGuidance);
      },
      getLastGuidance() {
        return cloneFieldOfViewGuidance(latestGuidance);
      },
      explainLastGuidance() {
        if (!latestGuidance) {
          return {
            ok: false,
            summary: "No Field of View guidance has been generated yet.",
            nextStep: "Run a Field of View calculation first."
          };
        }

        return {
          ok: true,
          status: latestGuidance.status,
          mode: latestGuidance.mode,
          action: latestGuidance.primaryRecommendation && latestGuidance.primaryRecommendation.action,
          reason: latestGuidance.primaryRecommendation && latestGuidance.primaryRecommendation.reason,
          expected: latestGuidance.primaryRecommendation && latestGuidance.primaryRecommendation.expectedResult,
          guidance: cloneFieldOfViewGuidance(latestGuidance)
        };
      },
      attachGlobal() {
        window.ScopedLabsFieldOfViewGuidance = Object.freeze({
          version: this.version,
          toolKey: "field-of-view",
          getLastGuidance: this.getLastGuidance,
          explainLastGuidance: this.explainLastGuidance,
          updateFromData: this.update
        });
        return window.ScopedLabsFieldOfViewGuidance;
      }
    };

    return fieldOfViewGuidanceAdapter;
  }

  function updateFieldOfViewUserGuidance(data) {
    const adapter = getFieldOfViewGuidanceAdapter();
    return adapter.update(data);
  }

  function getLastFieldOfViewGuidance() {
    const adapter = getFieldOfViewGuidanceAdapter();
    return adapter.getLastGuidance();
  }

  function explainLastFieldOfViewGuidance() {
    const adapter = getFieldOfViewGuidanceAdapter();
    return adapter.explainLastGuidance();
  }

  function attachFieldOfViewGuidanceGlobal() {
    const adapter = getFieldOfViewGuidanceAdapter();

    if (adapter && typeof adapter.attachGlobal === "function") {
      return adapter.attachGlobal();
    }

    window.ScopedLabsFieldOfViewGuidance = Object.freeze({
      version: "field-of-view-guidance-adapter-001-factory",
      toolKey: "field-of-view",
      getLastGuidance: getLastFieldOfViewGuidance,
      explainLastGuidance: explainLastFieldOfViewGuidance
    });

    return window.ScopedLabsFieldOfViewGuidance;
  }

  attachFieldOfViewGuidanceGlobal();


  
  function getFieldOfViewBridgeGuidance() {
    const guidanceApi = window.ScopedLabsFieldOfViewGuidance;

    if (guidanceApi && typeof guidanceApi.getLastGuidance === "function") {
      return guidanceApi.getLastGuidance();
    }

    return null;
  }

  function publishFieldOfViewGuidanceEvent(source) {
    const bridge = window.ScopedLabsPhysicalSecurityGuidanceEventBridge;
    const guidance = getFieldOfViewBridgeGuidance();

    if (!bridge || typeof bridge.publishIfChanged !== "function" || !guidance) {
      return false;
    }

    return !!bridge.publishIfChanged({
      category: "physical-security",
      tool: "field-of-view",
      guidance,
      source: source || "field-of-view-guidance-update"
    });
  }

  function clearFieldOfViewGuidanceEventMemory() {
    const bridge = window.ScopedLabsPhysicalSecurityGuidanceEventBridge;

    if (bridge && typeof bridge.clearTool === "function") {
      bridge.clearTool("field-of-view");
      return true;
    }

    const memory = window.ScopedLabsPhysicalSecurityGuidanceMemory;

    if (memory && typeof memory.clearToolGuidance === "function") {
      return memory.clearToolGuidance("field-of-view");
    }

    return false;
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

  function fovGeometryGraphicsModel(data) {
    return {
      tool: "field-of-view",
      ariaLabel: "Field of view geometry diagram",
      calculatedWidthFt: data && data.sceneWidth,
      requiredWidthFt: data && data.scene,
      targetDistanceFt: data && data.dist,
      hfovDeg: data && data.hfov,
      mountHeightFt: data && data.h,
      fitClass: data && data.fitClass,
      coverageRatio: data && data.coverageRatio,
      status: data && data.status
    };
  }

  function fovGeometrySvg(data, fallbackSvg, options = {}) {
    const gfx = window.ScopedLabsGraphics;
    const renderForExport = options && options.exportSvg === true;

    if (gfx && typeof gfx.render === "function") {
      const model = Object.assign({}, fovGeometryGraphicsModel(data), {
        exportMode: renderForExport
      });
      let svg = gfx.render("fov-geometry-plan", model);

      if (typeof svg === "string" && svg.includes("<svg") && !svg.includes("data-sl-diagnostic-code")) {
        if (!renderForExport) {
          svg = svg.replace(/\sdata-export-svg\b/g, "");
        }

        if (typeof gfx.frameSvg === "function") {
          svg = gfx.frameSvg(svg, {
            renderer: "fov-geometry-plan",
            tool: "field-of-view",
            size: "wide"
          });
        }

        return svg;
      }
    }

    return fallbackSvg || "";
  }

  function renderFovGeometryDiagram(data) {
    if (!els.fovGeometry || !data || !data.ok) return;

    const cameraX = 72;
    const targetX = 492;
    const centerY = 122;
    const maxSpanPx = 126;
    const svgW = 610;
    const svgH = 232;

    const calculatedWidth = Math.max(Number(data.sceneWidth) || 0, 0.1);
    const requiredWidth = Math.max(Number(data.scene) || 0, 0.1);
    const maxWidth = Math.max(calculatedWidth, requiredWidth, 1);
    const scale = maxSpanPx / maxWidth;

    const calculatedPx = Math.max(10, calculatedWidth * scale);
    const requiredPx = Math.max(10, requiredWidth * scale);

    const coneTopY = centerY - calculatedPx / 2;
    const coneBottomY = centerY + calculatedPx / 2;
    const requiredTopY = centerY - requiredPx / 2;
    const requiredBottomY = centerY + requiredPx / 2;

    const axisY = 202;
    const goodFit = data.fitClass === "Good Fit";
    const tooNarrow = data.fitClass === "Too Narrow";
    const coneStroke = goodFit ? "rgba(125,255,158,.95)" : tooNarrow ? "rgba(255,190,120,.95)" : "rgba(255,220,120,.95)";
    const coneFill = goodFit ? "rgba(125,255,158,.14)" : tooNarrow ? "rgba(255,150,80,.14)" : "rgba(255,210,90,.13)";
    const requiredStroke = "rgba(255,255,255,.78)";
    const centerStroke = "rgba(255,255,255,.28)";
    const requiredX = targetX + 28;

    const fallbackLiveSvg =
      '<svg class="fov-geometry-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="Field of view geometry diagram">' +
        '<defs><marker id="fovArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="rgba(255,255,255,.62)"></path></marker></defs>' +
        '<line x1="' + cameraX + '" y1="' + centerY + '" x2="' + targetX + '" y2="' + centerY + '" stroke="' + centerStroke + '" stroke-width="2" stroke-dasharray="5 7"></line>' +
        '<polygon points="' + cameraX + ',' + centerY + ' ' + targetX + ',' + coneTopY + ' ' + targetX + ',' + coneBottomY + '" fill="' + coneFill + '" stroke="' + coneStroke + '" stroke-width="2"></polygon>' +
        '<line x1="' + targetX + '" y1="' + coneTopY + '" x2="' + targetX + '" y2="' + coneBottomY + '" stroke="' + coneStroke + '" stroke-width="5" stroke-linecap="round"></line>' +
        '<line x1="' + requiredX + '" y1="' + requiredTopY + '" x2="' + requiredX + '" y2="' + requiredBottomY + '" stroke="' + requiredStroke + '" stroke-width="4" stroke-linecap="round"></line>' +
        '<circle cx="' + cameraX + '" cy="' + centerY + '" r="8" fill="rgba(125,255,158,.95)"></circle>' +
        '<circle cx="' + cameraX + '" cy="' + centerY + '" r="16" fill="none" stroke="rgba(125,255,158,.26)" stroke-width="2"></circle>' +
        '<line x1="' + cameraX + '" y1="' + axisY + '" x2="' + targetX + '" y2="' + axisY + '" stroke="rgba(255,255,255,.52)" stroke-width="2" marker-end="url(#fovArrow)"></line>' +
        '<line x1="' + cameraX + '" y1="' + (axisY - 7) + '" x2="' + cameraX + '" y2="' + (axisY + 7) + '" stroke="rgba(255,255,255,.52)" stroke-width="2"></line>' +
        '<line x1="' + targetX + '" y1="' + (axisY - 7) + '" x2="' + targetX + '" y2="' + (axisY + 7) + '" stroke="rgba(255,255,255,.52)" stroke-width="2"></line>' +
        '<text x="' + cameraX + '" y="' + (centerY - 25) + '" fill="rgba(255,255,255,.86)" font-size="11" font-weight="800" text-anchor="middle">Camera</text>' +
        '<text x="' + cameraX + '" y="' + (centerY + 36) + '" fill="rgba(255,255,255,.62)" font-size="10" text-anchor="middle">Mount ' + escapeFovHtml(fmtFtShort(data.h)) + '</text>' +
        '<text x="' + ((cameraX + targetX) / 2) + '" y="' + (axisY + 21) + '" fill="rgba(255,255,255,.72)" font-size="11" font-weight="800" text-anchor="middle">Target distance: ' + escapeFovHtml(fmtFtShort(data.dist)) + '</text>' +
        '<text x="' + ((cameraX + targetX) / 2) + '" y="27" fill="rgba(255,255,255,.70)" font-size="11" font-weight="800" text-anchor="middle">HFOV ' + escapeFovHtml(fmtDegText(data.hfov)) + '</text>' +
        '<text x="' + targetX + '" y="' + Math.max(18, coneTopY - 8) + '" fill="rgba(255,255,255,.80)" font-size="10" font-weight="800" text-anchor="middle">calculated</text>' +
        '<text x="' + requiredX + '" y="' + Math.max(18, requiredTopY - 8) + '" fill="rgba(255,255,255,.72)" font-size="10" font-weight="800" text-anchor="middle">required</text>' +
      '</svg>';

    const liveSvg = fovGeometrySvg(data, fallbackLiveSvg);

    const exportSvg = fovGeometrySvg(data, "", { exportSvg: true });

    els.fovGeometry.hidden = false;
    els.fovGeometry.setAttribute("data-export-section", "true");
    els.fovGeometry.setAttribute("data-export-title", "\u00A0\u00A0Field of View Geometry");
    els.fovGeometry.setAttribute("data-export-compact-svg", "true");

    // data-scopedlabs-fov-export-notes-001
    const fovExportHandoff =
      "Carry the calculated scene width of " + fmtFtShort(data.sceneWidth) +
      " and target distance of " + fmtFtShort(data.dist) +
      " into Coverage Area. Coverage Area will apply usable coverage reserve to convert this raw lens footprint into practical coverage width before Camera Spacing.";

    const fovExportNotes = [
      ["Engineering interpretation", data.interpretation],
      ["Dominant constraint", data.dominantConstraint],
      ["Recommended action", data.guidance],
      ["Coverage Area handoff", fovExportHandoff]
    ];

    const fovExportNotesTable =
      '<table style="width:100%;border-collapse:collapse;margin:12px 0 0 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Section</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Detail</th>' +
        '</tr></thead>' +
        '<tbody>' +
          fovExportNotes
            .filter((row) => row && row[0] && row[1])
            .map((row) =>
              '<tr>' +
                '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeFovHtml(row[0]) + '</td>' +
                '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapeFovHtml(row[1]) + '</td>' +
              '</tr>'
            ).join("") +
        '</tbody>' +
      '</table>';

    els.fovGeometry.innerHTML =
      '<div class="fov-geometry-head">' +
        '<div>' +
          '<p class="fov-geometry-title">Field of View Geometry</p>' +
          '<div class="fov-geometry-subtitle">CAD-style plan view showing the camera position, target plane, calculated footprint, and requested scene width.</div>' +
        '</div>' +
        '<div class="fov-geometry-pill">' + escapeFovHtml(fovStatusLabel(data)) + '</div>' +
      '</div>' +
      '<div class="fov-geometry-metrics">' +
        '<div class="fov-geometry-metric">Coverage ratio<strong>' + escapeFovHtml(fmtRatio(data.coverageRatio)) + '</strong></div>' +
        '<div class="fov-geometry-metric">Calculated coverage<strong>' + escapeFovHtml(fmtFtShort(data.sceneWidth)) + '</strong></div>' +
        '<div class="fov-geometry-metric">Required width<strong>' + escapeFovHtml(fmtFtShort(data.scene)) + '</strong></div>' +
        '<div class="fov-geometry-metric">Target distance<strong>' + escapeFovHtml(fmtFtShort(data.dist)) + '</strong></div>' +
      '</div>' +
      '<div class="fov-geometry-svg-wrap">' + liveSvg + '</div>' +
      '<div class="fov-geometry-note" data-export-text>Planning note: this CAD plan view renders the existing Field of View result model. Mount height is context from the previous step; horizontal footprint is still driven by target distance and HFOV.</div>' +
      '<div class="fov-geometry-export-only">' +
        '<table><thead><tr><th>Geometry Metric</th><th>Value</th></tr></thead><tbody>' +
          '<tr><td>Coverage ratio</td><td>' + escapeFovHtml(fmtRatio(data.coverageRatio)) + '</td></tr>' +
          '<tr><td>Calculated coverage</td><td>' + escapeFovHtml(fmtFtShort(data.sceneWidth)) + '</td></tr>' +
          '<tr><td>Required width</td><td>' + escapeFovHtml(fmtFtShort(data.scene)) + '</td></tr>' +
          '<tr><td>Target distance</td><td>' + escapeFovHtml(fmtFtShort(data.dist)) + '</td></tr>' +
          '<tr><td>Horizontal FOV</td><td>' + escapeFovHtml(fmtDegText(data.hfov)) + '</td></tr>' +
          '<tr><td>Mount height context</td><td>' + escapeFovHtml(fmtFtShort(data.h)) + '</td></tr>' +
        '</tbody></table>' +
        fovExportNotesTable +
        exportSvg +
      '</div>';
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
    updateFieldOfViewUserGuidance(data);
        publishFieldOfViewGuidanceEvent("field-of-view-guidance-update");
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
        clearFieldOfViewGuidanceEventMemory();
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
      el.addEventListener("change", () => {
        clearFieldOfViewGuidanceEventMemory();
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


/* ScopedLabs Field of View Local Assistant Proof
   Version: field-of-view-local-assistant-proof-001
   Purpose: visible local assistant proof for Field of View only.
   Notes:
   - Uses the shared Physical Security local assistant module.
   - Listens for validated Physical Security guidance events.
   - Clears stale local assistant output on raw input/change.
   - Does not touch Area Planner, Lens Selection, category renderer, export, auth, checkout, KB, or pipeline behavior.
*/
(function fieldOfViewLocalAssistantProof() {
  "use strict";

  const VERSION = "field-of-view-local-assistant-proof-001";
  const TOOL_SLUG = "field-of-view";
  const TOOL_TEXT = "field of view";
  const MOUNT_ID = "fieldOfViewLocalAssistantMount";

  function getMount() {
    return document.getElementById(MOUNT_ID);
  }

  function localAssistantApi() {
    return window.ScopedLabsPhysicalSecurityLocalAssistant || null;
  }

  function adapterApi() {
    return window.ScopedLabsPhysicalSecurityToolAssistantAdapters || null;
  }

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function compactList(value) {
    if (Array.isArray(value)) {
      return value.map(asText).filter(Boolean);
    }

    if (typeof value === "string" && value.trim()) {
      return value.split(/\n|;|\|/).map(asText).filter(Boolean);
    }

    return [];
  }

  function pickRecord(detail) {
    const data = detail || {};
    return data.guidance || data.record || data.model || data.data || data.payload || data;
  }

  function eventBelongsToTool(detail) {
    const data = detail || {};
    const record = pickRecord(data) || {};

    const haystack = [
      data.tool,
      data.slug,
      data.toolSlug,
      data.source,
      data.id,
      record.tool,
      record.slug,
      record.toolSlug,
      record.source,
      record.id
    ].map(asText).join(" ").toLowerCase();

    return haystack.includes(TOOL_SLUG) || haystack.includes(TOOL_TEXT);
  }

  function readStatus(record) {
    const raw = asText(
      record.status ||
      record.severity ||
      record.level ||
      record.state ||
      record.classification
    ).toUpperCase();

    if (raw.includes("RISK")) return "RISK";
    if (raw.includes("WATCH") || raw.includes("WARN")) return "WATCH";
    if (raw.includes("HEALTHY") || raw.includes("SAFE") || raw.includes("OK")) return "HEALTHY";

    return "WATCH";
  }

  function readSummary(record) {
    return asText(
      record.summary ||
      record.headline ||
      record.message ||
      record.detail ||
      record.description ||
      record.primaryText
    ) || "Field of view has been evaluated. Review lens angle, target width, and distance assumptions before carrying this area into camera coverage planning.";
  }

  function readAssumptions(record) {
    return compactList(
      record.assumptions ||
      record.assumptionList ||
      record.inputs ||
      record.inputSummary ||
      record.context
    );
  }

  function readActions(record) {
    const actions = compactList(
      record.actions ||
      record.recommendedActions ||
      record.recommendations ||
      record.nextSteps ||
      record.requiredActions
    );

    const singleAction = asText(record.action || record.requiredAction || record.nextStep);
    if (singleAction && !actions.includes(singleAction)) {
      actions.push(singleAction);
    }

    if (!actions.length) {
      actions.push("Confirm the horizontal field-of-view assumption before continuing into coverage-area and spacing checks.");
    }

    return actions;
  }

  function buildModel(recordInput) {
    const record = recordInput || {};
    const adapters = adapterApi();
    const adapter = adapters && typeof adapters.getAdapter === "function"
      ? adapters.getAdapter(TOOL_SLUG)
      : null;

    return {
      tool: TOOL_SLUG,
      title: adapter && adapter.title ? adapter.title : "Field of View Assistant",
      status: readStatus(record),
      summary: readSummary(record),
      assumptions: readAssumptions(record),
      actions: readActions(record),
      iconKey: adapter && adapter.iconKey ? adapter.iconKey : "coverageArea",
      visible: true
    };
  }

  function render(recordInput) {
    const mount = getMount();
    const assistant = localAssistantApi();

    if (!mount || !assistant || typeof assistant.mount !== "function") {
      return false;
    }

    return assistant.mount(mount, buildModel(recordInput));
  }

  function clear() {
    const mount = getMount();
    const assistant = localAssistantApi();

    if (!mount) return false;

    if (assistant && typeof assistant.clear === "function") {
      return assistant.clear(mount);
    }

    mount.innerHTML = "";
    mount.hidden = true;
    return true;
  }

  document.addEventListener("scopedlabs:physical-security-guidance-updated", function (event) {
    const detail = event && event.detail ? event.detail : {};

    if (!eventBelongsToTool(detail)) {
      return;
    }

    render(pickRecord(detail));
  });

  ["input", "change"].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      const target = event && event.target ? event.target : null;

      if (target && target.closest && target.closest("#" + MOUNT_ID)) {
        return;
      }

      clear();
    }, true);
  });

  window.ScopedLabsFieldOfViewLocalAssistantProof = Object.freeze({
    version: VERSION,
    buildModel: buildModel,
    render: render,
    clear: clear
  });
})();
