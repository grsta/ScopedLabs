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
  const STEP = "mounting-height";
  const PREVIOUS_STEP = "scene-illumination";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    h: $("h"),
    mountContext: $("mountContext"),
    mountContextGuidance: $("mountContextGuidance"),
    dist: $("dist"),
    th: $("th"),
    vfov: $("vfov"),
    vfovProfile: $("vfovProfile"),
    vfovGuidance: $("vfovGuidance"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    planningFlowContext: $("planning-flow-context"),
    overrideNotice: $("mountingOverrideNotice"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    toolCard: $("toolCard")
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
    h: "",
    mountContext: "residential",
    dist: 40,
    th: "",
    vfov: 55,
    vfovProfile: "area-hfov"
  };

  let importedMountingDistanceFt = null;

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function rad2deg(x) {
    return x * 180 / Math.PI;
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

  function fmtDeg(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}°` : "—";
  }

  function classifyTilt(tilt) {
    if (tilt < 10) return "Too Shallow";
    if (tilt < 25) return "Balanced";
    if (tilt < 45) return "Strong";
    return "Too Steep";
  }

  function angleInterpretation(tilt) {
    if (tilt < 10) {
      return "Angle is very shallow. This tends to overemphasize the horizon, weakens face detail, and reduces practical identification quality.";
    }
    if (tilt < 25) {
      return "Angle is balanced for general surveillance. It supports broad situational awareness, but may still be light on subject detail for stronger identification tasks.";
    }
    if (tilt < 45) {
      return "Angle is strong for practical surveillance design. It usually provides a better compromise between coverage and usable subject geometry.";
    }
    return "Angle is steep. Coverage may still work, but top-down compression can reduce face detail and make subjects look visually flattened.";
  }

  function heightGuidance(h) {
    if (h < 9) {
      return "Mount height is relatively low. This can improve subject angle and detail, but raises tamper and vandalism risk.";
    }
    if (h <= 15) {
      return "Mount height is in a practical working range for many building exteriors and perimeter applications.";
    }
    return "Mount height is relatively high. This helps with tamper resistance and broad coverage, but can hurt identification geometry if tilt becomes too steep.";
  }

  function clearDownstream() {
    [
      FLOW_KEYS.fov,
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

  function firstFiniteMountingValue(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }

    return null;
  }

  function hydrateMountingInputsFromActiveArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return;

    const area = api.getActiveArea();
    if (!area) return;

    const targetDistance = firstFiniteMountingValue(
      area.distanceToTargetPlaneFt,
      area.mountingTargetDistanceFt,
      area.targetDistanceFt
    );

    importedMountingDistanceFt = targetDistance;

    if (targetDistance !== null && els.dist) {
      els.dist.value = String(targetDistance);
    }

    renderMountingOverrideNotice();
  }

  const VFOV_PROFILES = {
    "area-hfov": {
      id: "area-hfov",
      label: "Estimated from active area HFOV",
      value: null,
      note: "Uses the active area horizontal FOV with a 16:9 camera assumption to estimate vertical FOV."
    },
    narrow: {
      id: "narrow",
      label: "Narrow / telephoto view",
      value: 30,
      note: "Use when the view is tighter or lensing is expected to be more telephoto."
    },
    standard: {
      id: "standard",
      label: "Standard security camera view",
      value: 45,
      note: "Use as a conservative baseline when camera/lens details are not finalized yet."
    },
    wide: {
      id: "wide",
      label: "Wide camera view",
      value: 60,
      note: "Use when the camera is expected to cover a wider vertical scene."
    },
    verywide: {
      id: "verywide",
      label: "Very wide camera view",
      value: 75,
      note: "Use for very wide-angle assumptions. Final lens/FOV validation should confirm this later."
    },
    custom: {
      id: "custom",
      label: "Custom vertical FOV",
      value: null,
      note: "Use when the manufacturer spec, lens calculator, or final camera model already provides VFOV."
    }
  };

  function vfovProfilePreset(id) {
    return VFOV_PROFILES[id] || VFOV_PROFILES.standard;
  }

  function activeAreaHfovForMounting() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    const area = api.getActiveArea();
    if (!area) return null;

    return firstFiniteMountingValue(
      area.lensDerivedHfovDeg,
      area.assumedHfovDeg,
      area.horizontalFovDeg,
      area.hfovDeg
    );
  }

  function estimateVfovFromHfov(hfovDeg) {
    const hfov = Number(hfovDeg);
    if (!Number.isFinite(hfov) || hfov <= 0 || hfov >= 179) return null;

    const aspectHeight = 9;
    const aspectWidth = 16;
    return rad2deg(2 * Math.atan(Math.tan(deg2rad(hfov / 2)) * (aspectHeight / aspectWidth)));
  }

  function recommendedVfovForProfile(profileId) {
    const preset = vfovProfilePreset(profileId);

    if (preset.id === "custom") return null;

    if (preset.id === "area-hfov") {
      const activeHfov = activeAreaHfovForMounting();
      return estimateVfovFromHfov(activeHfov) || VFOV_PROFILES.standard.value;
    }

    return preset.value;
  }

  function applyVfovProfileToInput({ force = false } = {}) {
    if (!els.vfovProfile || !els.vfov) return;

    const profileId = els.vfovProfile.value || DEFAULTS.vfovProfile;
    const preset = vfovProfilePreset(profileId);

    if (preset.id === "custom") {
      renderVfovProfileGuidance();
      return;
    }

    const recommended = recommendedVfovForProfile(profileId);
    if (!Number.isFinite(recommended) || recommended <= 0) return;

    if (force || !String(els.vfov.value || "").trim()) {
      els.vfov.value = String(Number(recommended.toFixed(1)));
    }

    renderVfovProfileGuidance();
  }

  function selectedVfovProfileInfo(vfovValue) {
    const profileId = els.vfovProfile?.value || DEFAULTS.vfovProfile;
    const preset = vfovProfilePreset(profileId);
    const recommended = recommendedVfovForProfile(profileId);
    const current = Number(vfovValue);

    const manual =
      preset.id === "custom" ||
      !Number.isFinite(recommended) ||
      !Number.isFinite(current) ||
      Math.abs(current - recommended) > 0.1;

    return {
      vfovProfileId: preset.id,
      vfovProfileLabel: preset.label,
      vfovProfileRecommendedDeg: recommended,
      vfovSourceMode: manual ? "manual-override" : "profile",
      vfovManualOverride: manual
    };
  }

  function renderVfovProfileGuidance() {
    if (!els.vfovGuidance) return;

    const profileId = els.vfovProfile?.value || DEFAULTS.vfovProfile;
    const preset = vfovProfilePreset(profileId);
    const recommended = recommendedVfovForProfile(profileId);
    const current = num(els.vfov?.value);
    const activeHfov = activeAreaHfovForMounting();
    const info = selectedVfovProfileInfo(current);

    let detail = preset.note;

    if (preset.id === "area-hfov") {
      if (Number.isFinite(activeHfov)) {
        detail += " Active area HFOV is " + fmtDeg(activeHfov) + ", estimated VFOV is " + fmtDeg(recommended) + ".";
      } else {
        detail += " No active area HFOV was available, so Standard security camera view is used as the fallback.";
      }
    } else if (Number.isFinite(recommended)) {
      detail += " Recommended VFOV is " + fmtDeg(recommended) + ".";
    }

    els.vfovGuidance.innerHTML =
      '<strong>' + preset.label + '</strong><br>' +
      detail +
      '<br><span class="muted">VFOV is an early camera-profile assumption. Final lens/FOV validation later in the pipeline may update this.</span>' +
      (info.vfovManualOverride
        ? '<div class="vfov-profile-warning">Current VFOV does not match the selected profile estimate. This is allowed, but it will be treated as a manual VFOV assumption.</div>'
        : '');
  }

  const MOUNT_CONTEXTS = {
    residential: {
      id: "residential",
      label: "Residential / eave constrained",
      preferredLow: 8,
      preferredHigh: 10,
      workableLow: 7,
      workableHigh: 12,
      note: "Residential cameras are often limited by soffit or eave height. An 8-10 ft mount can be realistic, but shallow subject angle at long distance may still require a closer target zone or secondary camera."
    },
    commercial: {
      id: "commercial",
      label: "Commercial wall / building exterior",
      preferredLow: 10,
      preferredHigh: 16,
      workableLow: 8,
      workableHigh: 20,
      note: "Commercial walls usually allow more mounting flexibility. Higher placement can improve coverage and tamper resistance, but detail angle still needs validation."
    },
    pole: {
      id: "pole",
      label: "Pole / dedicated mount",
      preferredLow: 12,
      preferredHigh: 20,
      workableLow: 10,
      workableHigh: 25,
      note: "Pole mounts are usually more adjustable. If detail at distance is required, pole height and camera placement should be selected together instead of accepting a fixed wall height."
    },
    indoor: {
      id: "indoor",
      label: "Indoor ceiling / corridor",
      preferredLow: 8,
      preferredHigh: 12,
      workableLow: 7,
      workableHigh: 14,
      note: "Indoor ceiling and corridor cameras are often height constrained. Use the result to check angle and framing rather than assuming height can be changed freely."
    },
    custom: {
      id: "custom",
      label: "Custom mounting condition",
      preferredLow: 9,
      preferredHigh: 15,
      workableLow: 7,
      workableHigh: 20,
      note: "Use this when the mounting condition is project-specific. ScopedLabs uses a general practical range unless the assistant or final design step narrows it later."
    }
  };

  function mountContextPreset(id) {
    return MOUNT_CONTEXTS[id] || MOUNT_CONTEXTS.residential;
  }

  function selectedMountContextInfo(height) {
    const context = mountContextPreset(els.mountContext?.value || DEFAULTS.mountContext);
    const h = Number(height);
    const outsideWorkable = Number.isFinite(h) && (h < context.workableLow || h > context.workableHigh);
    const outsidePreferred = Number.isFinite(h) && (h < context.preferredLow || h > context.preferredHigh);

    return {
      mountContextId: context.id,
      mountContextLabel: context.label,
      mountPreferredLowFt: context.preferredLow,
      mountPreferredHighFt: context.preferredHigh,
      mountWorkableLowFt: context.workableLow,
      mountWorkableHighFt: context.workableHigh,
      mountHeightOutsidePreferred: outsidePreferred,
      mountHeightOutsideWorkable: outsideWorkable
    };
  }

  function renderMountContextGuidance() {
    if (!els.mountContextGuidance) return;

    const context = mountContextPreset(els.mountContext?.value || DEFAULTS.mountContext);
    const h = num(els.h?.value);
    const hasHeight = Number.isFinite(h) && h >= 0;
    const info = selectedMountContextInfo(h);

    els.mountContextGuidance.innerHTML =
      '<strong>' + context.label + '</strong><br>' +
      context.note +
      '<br><span class="muted">Preferred height band: ' +
      fmtFt(context.preferredLow) +
      ' - ' +
      fmtFt(context.preferredHigh) +
      '. Workable review band: ' +
      fmtFt(context.workableLow) +
      ' - ' +
      fmtFt(context.workableHigh) +
      '.</span>' +
      (hasHeight && info.mountHeightOutsidePreferred
        ? '<div class="mount-context-warning">Mount height is outside the preferred band for this context. That may be acceptable in the field, but subject angle and detail should be reviewed.</div>'
        : '');
  }

  function applyDefaults() {
    if (els.mountContext) els.mountContext.value = DEFAULTS.mountContext;
    if (els.h) els.h.value = "";
    els.dist.value = String(DEFAULTS.dist);
    els.th.value = "";
    if (els.vfovProfile) els.vfovProfile.value = DEFAULTS.vfovProfile;
    els.vfov.value = String(DEFAULTS.vfov);
    applyVfovProfileToInput({ force: true });
    renderMountContextGuidance();
  }

  

  

  

  

  function ensureMountingOverrideNotice() {
    let notice = document.getElementById("mountingOverrideNotice");
    if (notice) {
      els.overrideNotice = notice;
      return notice;
    }

    notice = document.createElement("div");
    notice.id = "mountingOverrideNotice";
    notice.className = "mounting-override-notice";
    notice.hidden = true;

    const anchor = els.flowNote || document.getElementById("flow-note") || document.querySelector(".tool-card") || document.querySelector("main");
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(notice, anchor.nextSibling);
    } else {
      document.body.appendChild(notice);
    }

    els.overrideNotice = notice;
    return notice;
  }

  function mountingDistanceOverride() {
    if (!Number.isFinite(importedMountingDistanceFt) || importedMountingDistanceFt <= 0) return null;

    const currentValue = num(els.dist?.value);
    if (!Number.isFinite(currentValue) || currentValue <= 0) return null;

    if (Math.abs(currentValue - importedMountingDistanceFt) < 0.01) return null;

    return {
      field: "targetDistanceFt",
      label: "Target Distance",
      source: "Area Planner Distance to Target Plane",
      importedValue: importedMountingDistanceFt,
      currentValue,
      note: "Mounting Height target distance was changed locally from the active area baseline."
    };
  }

  function renderMountingOverrideNotice() {
    const notice = ensureMountingOverrideNotice();
    const override = mountingDistanceOverride();

    if (!override) {
      notice.hidden = true;
      notice.innerHTML = "";
      return;
    }

    notice.hidden = false;
    notice.innerHTML =
      '<strong>Manual override active.</strong> Target Distance was imported from Area Planner as <strong>' +
      fmtFt(override.importedValue) +
      '</strong> and changed locally to <strong>' +
      fmtFt(override.currentValue) +
      '</strong>. This Mounting Height result is valid for this local branch, but downstream pipeline values may need revalidation.';
  }

  function mountingSourceMode() {
    return mountingDistanceOverride() ? "manual-override" : "pipeline";
  }

  function mountingManualOverrides() {
    const override = mountingDistanceOverride();
    return override ? [override] : [];
  }

  function renderFlowNote() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: visibleFlowContextEl(),
      flowKey: FLOW_KEYS.mount,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Imported Assumptions",
      intro: "This step uses the prior illumination plan to choose a workable install height before locking field of view."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const data = flow.data || {};
    const area = num(data.area || 0);
    const fc = num(data.fc || 0);
    const lumens = num(data.lumens || 0);

    const parts = [];
    if (area > 0) parts.push(`Area: <strong>${fmt(area, 0)} sq ft</strong>`);
    if (fc > 0) parts.push(`Target illumination: <strong>${fmt(fc, 2)} fc</strong>`);
    if (lumens > 0) parts.push(`Estimated lumens: <strong>${fmt(lumens, 0)} lm</strong>`);

    if (parts.length) {
      visibleFlowContextEl().hidden = false;
      visibleFlowContextEl().innerHTML = `
        <strong>Imported Assumptions</strong><br>
        ${parts.join(" | ")}
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.mount);
      clearDownstream();
    }

    clearMountingLiveVisual();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.mount,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });

    renderFlowNote();
  }

  function getInputs() {
    const hRaw = String(els.h?.value || "").trim();
    const thRaw = String(els.th?.value || "").trim();

    const h = hRaw === "" ? NaN : num(hRaw);
    const dist = num(els.dist.value);
    const th = thRaw === "" ? NaN : num(thRaw);
    const vfov = num(els.vfov.value);
    const contextInfo = selectedMountContextInfo(h);

    if (
      hRaw === "" ||
      thRaw === "" ||
      !Number.isFinite(h) || h < 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(th) || th < 0 ||
      !Number.isFinite(vfov) || vfov <= 0 || vfov >= 180
    ) {
      return { ok: false, message: "Enter mount height, target height, target distance, and VFOV before calculating." };
    }

    return {
      ok: true,
      h,
      dist,
      th,
      vfov,
      ...contextInfo,
      sourceMode: mountingSourceMode(),
      manualOverrides: mountingManualOverrides(),
      importedTargetDistanceFt: importedMountingDistanceFt
    };
  }


  // data-mounting-objective-aware-status-001
  function mountingObjectiveFromActiveArea() {
    try {
      const api = window.ScopedLabsPhysicalSecurityAreaState;
      const area = api && typeof api.getActiveArea === "function" ? api.getActiveArea() : null;

      if (!area || typeof area !== "object") return "general";

      const candidates = [
        area.detailGoal,
        area.targetDetailGoal,
        area.securityDetailGoal,
        area.coverageGoal,
        area.objective,
        area.goal,
        area.areaType,
        area.type,
        area.name
      ];

      const text = candidates
        .map((value) => String(value || "").toLowerCase())
        .filter(Boolean)
        .join(" ");

      if (/license|plate|lpr|face|facial|recognition|identify|identification|detail|forensic/.test(text)) {
        return "detail";
      }

      return "general";
    } catch {
      return "general";
    }
  }

  function objectiveAwareSubjectAngleStatusPressure(tilt, rawPressure, objective) {
    const raw = Number(rawPressure);

    if (!Number.isFinite(raw)) return 100;

    if (String(objective || "").toLowerCase() === "detail") {
      return raw;
    }

    // For general overview/awareness areas, shallow angle should warn that detail is limited,
    // but it should not automatically fail the whole mounting placement if framing and mount
    // height are otherwise workable.
    if (tilt < 4) return Math.min(raw, 44);
    if (tilt < 8) return Math.min(raw, 38);
    if (tilt < 12) return Math.min(raw, 28);

    return raw;
  }

  function subjectAngleFitPressure(tilt) {
    if (!Number.isFinite(tilt)) return 100;

    // Smooth subject-angle scoring:
    // <4 deg = severe shallow angle
    // 4-8 deg = risk tapering toward watch
    // 8-12 deg = borderline/watch transition
    // 12-35 deg = preferred working range
    // 35-45 deg = upper workable transition
    // >45 deg = increasingly steep
    if (tilt < 4) return 88;
    if (tilt < 8) return 68 - ((tilt - 4) / 4) * 23;
    if (tilt < 12) return 45 - ((tilt - 8) / 4) * 31;
    if (tilt <= 35) return 14;
    if (tilt <= 45) return 20 + ((tilt - 35) / 10) * 25;
    if (tilt <= 55) return 45 + ((tilt - 45) / 10) * 25;
    return Math.min(100, 70 + ((tilt - 55) / 20) * 30);
  }

  function mountHeightBalancePressure(height, contextId) {
    if (!Number.isFinite(height)) return 100;

    const context = mountContextPreset(contextId);
    const preferredLow = context.preferredLow;
    const preferredHigh = context.preferredHigh;
    const workableLow = context.workableLow;
    const workableHigh = context.workableHigh;

    if (height >= preferredLow && height <= preferredHigh) return 14;

    if (height >= workableLow && height < preferredLow) {
      return 22 + ((preferredLow - height) / Math.max(0.1, preferredLow - workableLow)) * 18;
    }

    if (height > preferredHigh && height <= workableHigh) {
      return 22 + ((height - preferredHigh) / Math.max(0.1, workableHigh - preferredHigh)) * 18;
    }

    if (height < workableLow) {
      return Math.min(100, 48 + ((workableLow - height) / Math.max(1, workableLow)) * 45);
    }

    return Math.min(100, 48 + ((height - workableHigh) / Math.max(1, workableHigh)) * 35);
  }

  function verticalFramingFitPressure(topEdgeHeight, bottomEdgeHeight, targetHeight) {
    if (!Number.isFinite(topEdgeHeight) || !Number.isFinite(bottomEdgeHeight)) return 100;

    if (bottomEdgeHeight > 0) {
      return Math.min(100, 32 + bottomEdgeHeight * 8);
    }

    if (topEdgeHeight < targetHeight) {
      return Math.min(100, 45 + (targetHeight - topEdgeHeight) * 10);
    }

    return 12;
  }

  function subjectAngleFitText(tilt) {
    if (tilt < 8) return "Too shallow";
    if (tilt < 12) return "Borderline shallow";
    if (tilt <= 35) return "Good fit";
    if (tilt <= 45) return "Steep but usable";
    return "Too steep";
  }

  function mountHeightBalanceText(height, contextId) {
    const context = mountContextPreset(contextId);

    if (!Number.isFinite(height)) return "Mount height not set";

    if (height >= context.preferredLow && height <= context.preferredHigh) {
      return "Practical for " + context.label;
    }

    if (height >= context.workableLow && height <= context.workableHigh) {
      return "Workable but review";
    }

    if (height < context.workableLow) return "Low for " + context.label;

    return "High for " + context.label;
  }

  function verticalFramingFitText(topEdgeHeight, bottomEdgeHeight, targetHeight) {
    if (bottomEdgeHeight > 0) return "Lower view edge above grade";
    if (topEdgeHeight < targetHeight) return "Target may sit above view";
    return "Target zone framed";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const vfovProfileInfo = selectedVfovProfileInfo(input.vfov);

    const drop = input.h - input.th;
    const tilt = rad2deg(Math.atan2(drop, input.dist));
    const span = 2 * Math.tan(deg2rad(input.vfov / 2)) * input.dist;
    const topEdgeHeight =
      input.h - Math.tan(deg2rad(Math.max(0, tilt - (input.vfov / 2)))) * input.dist;
    const bottomEdgeHeight =
      input.h - Math.tan(deg2rad(tilt + (input.vfov / 2))) * input.dist;

    const tiltClass = classifyTilt(tilt);
    const angleText = angleInterpretation(tilt);
    const heightText = heightGuidance(input.h);

    const subjectAngleMetric = subjectAngleFitPressure(tilt);
    const mountPressureMetric = mountHeightBalancePressure(input.h, input.mountContextId);
    const framingPressureMetric = verticalFramingFitPressure(topEdgeHeight, bottomEdgeHeight, input.th);

    const subjectFitText = subjectAngleFitText(tilt);
    const mountFitText = mountHeightBalanceText(input.h, input.mountContextId);
    const framingFitText = verticalFramingFitText(topEdgeHeight, bottomEdgeHeight, input.th);

    const metrics = [
      {
        label: "Subject Angle Fit",
        value: subjectAngleMetric,
        displayValue: fmtDeg(tilt) + " actual / 12-35 deg preferred"
      },
      {
        label: "Mount Height Balance",
        value: mountPressureMetric,
        displayValue: fmtFt(input.h) + " mount / " + mountFitText
      },
      {
        label: "Vertical Framing Fit",
        value: framingPressureMetric,
        displayValue: fmtFt(topEdgeHeight) + " to " + fmtFt(bottomEdgeHeight)
      }
    ];

    const mountingObjective = mountingObjectiveFromActiveArea();
    const subjectAngleStatusMetric = objectiveAwareSubjectAngleStatusPressure(tilt, subjectAngleMetric, mountingObjective);
    const statusMetrics = metrics.map((metric) => {
      if (metric.label !== "Subject Angle Fit") return metric;

      return Object.assign({}, metric, {
        value: subjectAngleStatusMetric,
        displayValue: metric.displayValue + (mountingObjective === "detail" ? " / detail objective" : " / overview objective")
      });
    });

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(subjectAngleStatusMetric, mountPressureMetric, framingPressureMetric),
      metrics: statusMetrics,
      healthyMax: 20,
      watchMax: 45
    });

    let dominantConstraint = "";
    if (tilt < 8) {
      if (mountingObjective === "detail") {
        dominantConstraint = "Subject angle fit is the dominant limiter for the selected detail objective. The camera is only " + fmtFt(drop) + " above the target height while viewing " + fmtFt(input.dist) + " away, creating a very shallow " + fmtDeg(tilt) + " subject angle. Detail and identification quality are likely limited unless the camera is raised, moved closer, or the area is treated as overview coverage.";
      } else {
        dominantConstraint = "Subject angle fit is shallow. This can still be usable for general overview or awareness coverage, but it should be treated as detail-limited. Do not rely on this mounting geometry for strong face or identification detail unless the camera is raised, moved closer, or validated in a specialist detail step.";
      }
    } else if (tilt < 12) {
      dominantConstraint = "Subject angle fit is near the lower edge. The camera is only " + fmtFt(drop) + " above the target height while viewing " + fmtFt(input.dist) + " away, creating a borderline " + fmtDeg(tilt) + " subject angle. A small height or placement change can improve the result, but this should be treated as Watch rather than a clean pass.";
    } else if (tilt >= 45) {
      dominantConstraint = "Subject angle fit is the dominant limiter. The camera is looking too steeply downward, which compresses subjects and reduces usable face detail.";
    } else if (mountPressureMetric > 45) {
      dominantConstraint = "Mount height balance is the dominant limiter. The selected height is outside the normal review band for " + input.mountContextLabel + ". This may be a real field constraint, but the design should be checked against subject angle, target distance, tamper exposure, and detail objective.";
    } else if (framingPressureMetric > 45) {
      dominantConstraint = "Vertical framing fit is the dominant limiter. The selected VFOV and tilt do not frame the target zone cleanly at this distance.";
    } else {
      dominantConstraint = "The geometry is balanced. Mount height, target distance, subject angle, and vertical framing remain in a practical range for the next field-of-view step.";
    }

    const interpretation = "Mounting context is " + input.mountContextLabel + ". With a mount height of " + fmtFt(input.h) + " and a target point " + fmtFt(input.dist) + " away at " + fmtFt(input.th) + ", the suggested down-tilt is about " + fmtDeg(tilt) + ". Preferred subject-angle band is roughly 12-35 deg for detail-oriented placement, with 8-45 deg generally workable. Current objective mode is " + (mountingObjective === "detail" ? "detail/identification" : "general overview") + ", so this result is classified as " + subjectFitText + ". At that distance, a " + fmtDeg(input.vfov) + " vertical field of view spans about " + fmtFt(span) + " vertically, with the view landing from roughly " + fmtFt(topEdgeHeight) + " down to " + fmtFt(bottomEdgeHeight) + ". " + angleText;

    let guidance = "";
    if (tilt < 8) {
      guidance = "Increase subject angle by raising the camera, reducing target distance, choosing a closer target zone, or revisiting placement before locking the design. Then continue to Field of View once subject angle is healthier.";
    } else if (tilt < 12) {
      guidance = "This is a borderline shallow angle. Consider slightly raising the camera, reducing target distance, or choosing a closer target zone before treating the mounting geometry as fully healthy.";
    } else if (tilt >= 45) {
      guidance = "Reduce mount height or increase standoff distance before finalizing the view. Excessive top-down angle can make downstream detail goals harder to reach.";
    } else if (bottomEdgeHeight > 0) {
      guidance = "Check whether the lower edge of view needs to reach grade at the target distance. If so, revise height, tilt, or VFOV assumptions before moving forward.";
    } else {
      guidance = "Mounting geometry is workable. Continue to Field of View next to translate this setup into actual scene width coverage.";
    }

    return {
      ok: true,
      ...input,
      ...vfovProfileInfo,
      drop,
      tilt,
      span,
      topEdgeHeight,
      bottomEdgeHeight,
      tiltClass,
      angleText,
      heightText,
      subjectFitText,
      mountFitText,
      framingFitText,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      subjectAngleMetric,
      mountPressureMetric,
      framingPressureMetric
    };
  }

  function updateActiveAreaFromMounting(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    const payload = {
      status: "IN PROGRESS",
      mountingHeightFt: data.h,
      mountingContextId: data.mountContextId,
      mountingContextLabel: data.mountContextLabel,
      mountPreferredLowFt: data.mountPreferredLowFt,
      mountPreferredHighFt: data.mountPreferredHighFt,
      mountWorkableLowFt: data.mountWorkableLowFt,
      mountWorkableHighFt: data.mountWorkableHighFt,
      mountingTargetDistanceFt: data.dist,
      mountingTargetDistanceImportedFt: data.importedTargetDistanceFt,
      mountingSourceMode: data.sourceMode,
      mountingManualOverrides: data.manualOverrides,
      targetHeightFt: data.th,
      verticalFovDeg: data.vfov,
      verticalFovProfileId: data.vfovProfileId,
      verticalFovProfileLabel: data.vfovProfileLabel,
      verticalFovProfileRecommendedDeg: data.vfovProfileRecommendedDeg,
      verticalFovSourceMode: data.vfovSourceMode,
      verticalFovManualOverride: data.vfovManualOverride,
      mountingDropFt: data.drop,
      mountingTiltDeg: data.tilt,
      verticalCoverageSpanFt: data.span,
      topEdgeHeightFt: data.topEdgeHeight,
      bottomEdgeHeightFt: data.bottomEdgeHeight,
      mountingTiltClass: data.tiltClass,
      mountingStatus: data.status,
      mountingInterpretation: data.interpretation,
      mountingGuidance: data.guidance,
      mountingUpdatedAt: new Date().toISOString()
    };

    if (data.sourceMode !== "manual-override") {
      payload.distanceToTargetPlaneFt = data.dist;
    }

    api.updateActiveAreaResult(payload);
  }

  

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.mount, {
      category: CATEGORY,
      step: STEP,
      data: {
        h: data.h,
        mountContextId: data.mountContextId,
        mountContextLabel: data.mountContextLabel,
        mountPreferredLowFt: data.mountPreferredLowFt,
        mountPreferredHighFt: data.mountPreferredHighFt,
        mountWorkableLowFt: data.mountWorkableLowFt,
        mountWorkableHighFt: data.mountWorkableHighFt,
        dist: data.dist,
        th: data.th,
        vfov: data.vfov,
        vfovProfileId: data.vfovProfileId,
        vfovProfileLabel: data.vfovProfileLabel,
        vfovProfileRecommendedDeg: data.vfovProfileRecommendedDeg,
        vfovSourceMode: data.vfovSourceMode,
        vfovManualOverride: data.vfovManualOverride,
        drop: data.drop,
        tilt: data.tilt,
        span: data.span,
        topEdgeHeight: data.topEdgeHeight,
        bottomEdgeHeight: data.bottomEdgeHeight,
        tiltClass: data.tiltClass,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });
  

    updateActiveAreaFromMounting(data);
  }

  
  // data-scopedlabs-mounting-structured-export-001
  function mountingExportRoot() {
    return els.toolCard || document.getElementById("toolCard") || document.querySelector("main .container") || document.body;
  }

  function escapeMountingExportHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function mountingFallbackExportTable(title, rows) {
    const cleanRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row[0] && row[1] != null);
    if (!cleanRows.length) return "";

    return "" +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">' + escapeMountingExportHtml(title) + '</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Value</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cleanRows.map((row) =>
            '<tr>' +
              '<td style="width:42%;padding:8px 10px;border-bottom:1px solid #d8dee6;color:#4b5563;vertical-align:top;">' + escapeMountingExportHtml(row[0]) + '</td>' +
              '<td style="padding:8px 10px;border-bottom:1px solid #d8dee6;color:#111827;font-weight:700;text-align:left;vertical-align:top;">' + escapeMountingExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function mountingFallbackNotesTable(rows) {
    const cleanRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row[0] && row[1]);
    if (!cleanRows.length) return "";

    return "" +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0 0 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Section</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Detail</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cleanRows.map((row) =>
            '<tr>' +
              '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeMountingExportHtml(row[0]) + '</td>' +
              '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapeMountingExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function clearMountingStructuredExport() {
    document.querySelectorAll('[data-mounting-structured-export="true"]').forEach((node) => node.remove());
  }


  // data-scopedlabs-mounting-export-visual-001
  function mountingExportVisualSvg(data) {
    if (!data || !data.ok) return "";

    const h = Number(data.h);
    const th = Number(data.th);
    const dist = Number(data.dist);
    const topEdge = Number(data.topEdgeHeight);
    const bottomEdge = Number(data.bottomEdgeHeight);
    const tilt = Number(data.tilt);
    const vfov = Number(data.vfov);

    if (![h, th, dist, topEdge, bottomEdge, tilt, vfov].every(Number.isFinite)) return "";

    function clampExportNumber(value, min, max) {
      const number = Number(value);
      if (!Number.isFinite(number)) return min;
      return Math.min(max, Math.max(min, number));
    }

    function pressureColor(value) {
      const score = Number(value);
      if (!Number.isFinite(score)) return "#64748b";
      if (score > 45) return "#dc2626";
      if (score > 20) return "#d97706";
      return "#15803d";
    }

    function pressureLabel(value) {
      const score = Number(value);
      if (!Number.isFinite(score)) return "Review";
      if (score > 45) return "Risk";
      if (score > 20) return "Watch";
      return "Healthy";
    }

    function exportCameraSvg(x, y, rotationDeg) {
      const rotation = Number.isFinite(Number(rotationDeg)) ? Number(rotationDeg) : 0;

      return "" +
        '<g transform="translate(' + fmt(x, 2) + ' ' + fmt(y, 2) + ') rotate(' + fmt(rotation, 2) + ') scale(0.46)" data-export-graphic-part="camera-marker">' +
          '<rect x="-22" y="-13" width="44" height="26" rx="4" fill="#0f172a" stroke="#15803d" stroke-width="1.8" />' +
          '<path d="M 22 -8 L 42 -14 L 42 14 L 22 8 Z" fill="#0f172a" stroke="#15803d" stroke-width="1.8" stroke-linejoin="round" />' +
          '<line x1="42" y1="-12" x2="42" y2="12" stroke="#15803d" stroke-width="1.8" stroke-linecap="round" />' +
          '<line x1="-13" y1="-13" x2="-13" y2="13" stroke="#16a34a" stroke-opacity=".42" stroke-width="1" />' +
          '<circle cx="-5" cy="0" r="4" fill="none" stroke="#16a34a" stroke-opacity=".56" stroke-width="1.2" />' +
          '<circle cx="-30" cy="0" r="5" fill="#020617" stroke="#15803d" stroke-width="1.8" />' +
          '<line x1="-25" y1="0" x2="-22" y2="0" stroke="#15803d" stroke-width="1.8" stroke-linecap="round" />' +
        '</g>';
    }

    const svgW = 820;
    const svgH = 350;
    const floorY = 260;
    const camX = 112;
    const targetX = 660;

    const minH = Math.min(0, bottomEdge, th);
    const maxH = Math.max(8, h, th, topEdge);
    const rangeH = Math.max(8, maxH - minH);

    function yFor(height) {
      return floorY - ((height - minH) / rangeH) * 185;
    }

    const camY = yFor(h);
    const targetY = yFor(th);
    const topY = yFor(topEdge);
    const bottomY = yFor(bottomEdge);
    const gradeY = yFor(0);
    const cameraTilt = clampExportNumber(tilt, -75, 75);
    const tiltRad = deg2rad(cameraTilt);
    const lensReach = 21;
    const lensTipX = camX + Math.cos(tiltRad) * lensReach;
    const lensTipY = camY + Math.sin(tiltRad) * lensReach;
    const dimensionY = Math.min(svgH - 28, Math.max(gradeY, bottomY) + 44);

    const lowerRayAngleDeg = clampExportNumber(tilt + (vfov / 2), 0.1, 89.5);
    const lowerRayGroundDistanceFt = h / Math.tan(deg2rad(lowerRayAngleDeg));

    let groundHitMarkup = "";
    if (bottomEdge < 0 && Number.isFinite(lowerRayGroundDistanceFt) && lowerRayGroundDistanceFt > 0 && lowerRayGroundDistanceFt < dist) {
      const hitX = camX + ((targetX - camX) * (lowerRayGroundDistanceFt / dist));
      if (Number.isFinite(hitX) && hitX > camX && hitX < targetX) {
        groundHitMarkup =
          '<circle cx="' + fmt(hitX, 2) + '" cy="' + fmt(gradeY, 2) + '" r="4" fill="#d97706" />' +
          '<line x1="' + fmt(hitX, 2) + '" y1="' + fmt(gradeY - 12, 2) + '" x2="' + fmt(hitX, 2) + '" y2="' + fmt(gradeY + 12, 2) + '" stroke="#d97706" stroke-width="1" />' +
          '<text x="' + fmt(hitX + 10, 2) + '" y="' + fmt(gradeY - 12, 2) + '" fill="#92400e" font-size="11" font-weight="800">Lower ray hits grade</text>' +
          '<text x="' + fmt(hitX + 10, 2) + '" y="' + fmt(gradeY + 5, 2) + '" fill="#92400e" font-size="10.5" font-weight="700">~' + escapeMountingExportHtml(fmtFt(lowerRayGroundDistanceFt, 0)) + ' from camera</text>';
      }
    }

    const subjectScore = clampExportNumber(data.subjectAngleMetric, 0, 100);
    const mountScore = clampExportNumber(data.mountPressureMetric, 0, 100);
    const framingScore = clampExportNumber(data.framingPressureMetric, 0, 100);

    const pressureRows = [
      ["Subject Angle Fit", subjectScore, fmtDeg(tilt) + " actual / 12-35° preferred"],
      ["Mount Height Balance", mountScore, fmtFt(h) + " mount / " + (data.mountFitText || "review")],
      ["Vertical Framing Fit", framingScore, fmtFt(topEdge) + " to " + fmtFt(bottomEdge)]
    ];

    const pressureHtml =
      '<table style="width:100%;border-collapse:collapse;margin:10px 0 0 0;font-size:12px;break-inside:avoid;">' +
        '<thead><tr>' +
          '<th style="padding:7px 9px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;">Pressure Metric</th>' +
          '<th style="padding:7px 9px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;">Status</th>' +
          '<th style="padding:7px 9px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;">Score</th>' +
          '<th style="padding:7px 9px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;">Detail</th>' +
        '</tr></thead>' +
        '<tbody>' +
          pressureRows.map((row) =>
            '<tr>' +
              '<td style="padding:7px 9px;border:1px solid #d8dee6;color:#111827;font-weight:800;">' + escapeMountingExportHtml(row[0]) + '</td>' +
              '<td style="padding:7px 9px;border:1px solid #d8dee6;color:' + pressureColor(row[1]) + ';font-weight:900;">' + pressureLabel(row[1]) + '</td>' +
              '<td style="padding:7px 9px;border:1px solid #d8dee6;color:#111827;font-weight:800;">' + row[1].toFixed(0) + '/100</td>' +
              '<td style="padding:7px 9px;border:1px solid #d8dee6;color:#374151;">' + escapeMountingExportHtml(row[2]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';

    const svg =
      '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mounting geometry export visual" style="display:block;width:100%;height:auto;background:#ffffff;border:1px solid #d8dee6;border-radius:10px;">' +
        '<defs>' +
          '<linearGradient id="mountingExportFovFill" x1="0" x2="1" y1="0" y2="1">' +
            '<stop offset="0%" stop-color="#16a34a" stop-opacity=".20"/>' +
            '<stop offset="100%" stop-color="#16a34a" stop-opacity=".04"/>' +
          '</linearGradient>' +
        '</defs>' +

        '<rect x="0" y="0" width="' + svgW + '" height="' + svgH + '" fill="#ffffff"/>' +
        '<text x="30" y="34" fill="#111827" font-size="16" font-weight="900">Mounting Geometry Visual</text>' +

        '<line x1="44" y1="' + fmt(gradeY, 2) + '" x2="760" y2="' + fmt(gradeY, 2) + '" stroke="#9ca3af" stroke-width="1"/>' +
        '<text x="46" y="' + fmt(gradeY + 20, 2) + '" fill="#6b7280" font-size="11" font-weight="700">Grade / 0 ft reference</text>' +

        '<polygon points="' + fmt(lensTipX, 2) + ',' + fmt(lensTipY, 2) + ' ' + targetX + ',' + fmt(topY, 2) + ' ' + targetX + ',' + fmt(bottomY, 2) + '" fill="url(#mountingExportFovFill)" stroke="#15803d" stroke-opacity=".55" stroke-width="1"/>' +
        '<line x1="' + fmt(lensTipX, 2) + '" y1="' + fmt(lensTipY, 2) + '" x2="' + targetX + '" y2="' + fmt(targetY, 2) + '" stroke="#15803d" stroke-width="2"/>' +
        '<line x1="' + fmt(lensTipX, 2) + '" y1="' + fmt(lensTipY, 2) + '" x2="' + targetX + '" y2="' + fmt(topY, 2) + '" stroke="#15803d" stroke-opacity=".45" stroke-width="1" stroke-dasharray="5 5"/>' +
        '<line x1="' + fmt(lensTipX, 2) + '" y1="' + fmt(lensTipY, 2) + '" x2="' + targetX + '" y2="' + fmt(bottomY, 2) + '" stroke="#15803d" stroke-opacity=".45" stroke-width="1" stroke-dasharray="5 5"/>' +

        '<line x1="' + camX + '" y1="' + fmt(gradeY, 2) + '" x2="' + camX + '" y2="' + fmt(camY, 2) + '" stroke="#64748b" stroke-width="1.3"/>' +
        exportCameraSvg(camX, camY, cameraTilt) +
        '<text x="' + (camX - 44) + '" y="' + fmt(camY - 26, 2) + '" fill="#111827" font-size="11.5" font-weight="800">Mount ' + escapeMountingExportHtml(fmtFt(h)) + '</text>' +

        '<line x1="' + targetX + '" y1="' + fmt(gradeY, 2) + '" x2="' + targetX + '" y2="' + fmt(targetY, 2) + '" stroke="#d97706" stroke-width="2"/>' +
        '<circle cx="' + targetX + '" cy="' + fmt(targetY, 2) + '" r="5" fill="#d97706"/>' +
        '<text x="' + (targetX - 18) + '" y="' + fmt(targetY - 16, 2) + '" fill="#92400e" font-size="11.5" font-weight="800">Target ' + escapeMountingExportHtml(fmtFt(th)) + '</text>' +

        groundHitMarkup +

        '<line x1="' + camX + '" y1="' + fmt(dimensionY, 2) + '" x2="' + targetX + '" y2="' + fmt(dimensionY, 2) + '" stroke="#9ca3af" stroke-width="1" stroke-dasharray="4 5"/>' +
        '<line x1="' + camX + '" y1="' + fmt(dimensionY - 8, 2) + '" x2="' + camX + '" y2="' + fmt(dimensionY + 8, 2) + '" stroke="#9ca3af" stroke-width="1"/>' +
        '<line x1="' + targetX + '" y1="' + fmt(dimensionY - 8, 2) + '" x2="' + targetX + '" y2="' + fmt(dimensionY + 8, 2) + '" stroke="#9ca3af" stroke-width="1"/>' +
        '<text x="' + ((camX + targetX) / 2 - 52) + '" y="' + fmt(dimensionY + 18, 2) + '" fill="#374151" font-size="11.5" font-weight="800">Distance ' + escapeMountingExportHtml(fmtFt(dist)) + '</text>' +

        '<line x1="' + (targetX + 32) + '" y1="' + fmt(topY, 2) + '" x2="' + (targetX + 32) + '" y2="' + fmt(bottomY, 2) + '" stroke="#2563eb" stroke-width="2"/>' +
        '<line x1="' + (targetX + 24) + '" y1="' + fmt(topY, 2) + '" x2="' + (targetX + 40) + '" y2="' + fmt(topY, 2) + '" stroke="#2563eb" stroke-width="2"/>' +
        '<line x1="' + (targetX + 24) + '" y1="' + fmt(bottomY, 2) + '" x2="' + (targetX + 40) + '" y2="' + fmt(bottomY, 2) + '" stroke="#2563eb" stroke-width="2"/>' +
        '<text x="' + (targetX + 48) + '" y="' + fmt(topY + 4, 2) + '" fill="#1d4ed8" font-size="11" font-weight="800">Top ' + escapeMountingExportHtml(fmtFt(topEdge)) + '</text>' +
        '<text x="' + (targetX + 48) + '" y="' + fmt(bottomY + 4, 2) + '" fill="#1d4ed8" font-size="11" font-weight="800">Bottom ' + escapeMountingExportHtml(fmtFt(bottomEdge)) + '</text>' +

        '<text x="310" y="86" fill="#15803d" font-size="12" font-weight="900">Down-tilt ' + escapeMountingExportHtml(fmtDeg(tilt)) + '</text>' +
        '<text x="310" y="104" fill="#4b5563" font-size="11" font-weight="700">VFOV ' + escapeMountingExportHtml(fmtDeg(vfov)) + ' / vertical span ' + escapeMountingExportHtml(fmtFt(data.span)) + '</text>' +
      '</svg>';

    return "" +
      '<div data-mounting-export-visual="true" data-export-svg style="break-inside:avoid;margin:0 0 12px 0;">' +
        svg +
        pressureHtml +
      '</div>';
  }


  function mountingStructuredExportTables(data) {
    if (!data || !data.ok) return "";

    const visualHtml = mountingExportVisualSvg(data);
    const sourceMode = data.sourceMode === "manual-override" ? "manual override" : "area planner carry-over";
    const vfovSource = data.vfovSourceMode === "manual-override" ? "manual assumption" : "guided profile";

    const metrics = [
      ["Vertical drop", fmtFt(data.drop)],
      ["Suggested down-tilt", fmtDeg(data.tilt)],
      ["Subject angle fit", data.subjectFitText],
      ["Vertical coverage span", fmtFt(data.span)],
      ["Approx. top of view @ distance", fmtFt(data.topEdgeHeight)],
      ["Approx. bottom of view @ distance", fmtFt(data.bottomEdgeHeight)],
      ["Mount height", fmtFt(data.h)],
      ["Mounting context", data.mountContextLabel],
      ["Mount height balance", data.mountFitText],
      ["Target distance", fmtFt(data.dist)],
      ["Target distance source", data.sourceMode === "manual-override" ? "Manual override" : "Area Planner carry-over"],
      ["Target height", fmtFt(data.th)],
      ["Camera vertical view profile", data.vfovProfileLabel || "Custom vertical FOV"],
      ["Vertical FOV", fmtDeg(data.vfov)],
      ["Vertical FOV source", vfovSource],
      ["Vertical framing fit", data.framingFitText],
      ["Height guidance", data.heightText],
      ["Assistant status", data.status],
      ["Source mode", sourceMode]
    ];

    const handoff = "Carry the mounting height, target distance, target height, and vertical framing assumptions into Field of View so the horizontal scene-width check stays tied to the same physical camera placement.";

    const notes = [
      ["Engineering interpretation", data.interpretation],
      ["Dominant constraint", data.dominantConstraint],
      ["Recommended action", data.guidance],
      ["Field of View handoff", handoff]
    ];

    const metricHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderMetricTable === "function"
      ? window.ScopedLabsAssistantExport.renderMetricTable("Mounting Height Design Summary", metrics)
      : mountingFallbackExportTable("Mounting Height Design Summary", metrics);

    const notesHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderNotesTable === "function"
      ? window.ScopedLabsAssistantExport.renderNotesTable(notes)
      : mountingFallbackNotesTable(notes);

    return "" +
      '<div class="mounting-export-structured-tables" data-mounting-structured-export="true" data-export-section data-export-suppress-title="true" style="position:absolute;left:-10000px;top:auto;width:820px;max-height:1px;overflow:hidden;opacity:0;pointer-events:none;">' +
        visualHtml +
        metricHtml +
        notesHtml +
      '</div>';
  }

  function renderMountingStructuredExport(data) {
    clearMountingStructuredExport();

    const html = mountingStructuredExportTables(data);
    if (!html) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    if (!node) return;

    mountingExportRoot().appendChild(node);
  }
  
  // data-mounting-live-visual-005
  function mountingLiveVisualEl() {
    return document.getElementById("mountingLiveVisual");
  }

  function escapeMountingVisualHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clampMountingVisual(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function mountingPressureClass(value) {
    const score = Number(value);
    if (!Number.isFinite(score)) return "";
    if (score > 45) return "risk";
    if (score > 20) return "watch";
    return "";
  }

  function mountingStatusClass(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("risk")) return "risk";
    if (text.includes("watch")) return "watch";
    return "";
  }


  
  function mountingCadCameraIcon(x, y, rotationDeg) {
    const rotation = Number.isFinite(Number(rotationDeg)) ? Number(rotationDeg) : 0;

    return "" +
      '<g transform="translate(' + fmt(x, 2) + ' ' + fmt(y, 2) + ') rotate(' + fmt(rotation, 2) + ') scale(0.5)" class="sl-cad-camera" data-ps-graphic-part="camera-marker" data-graphics-symbol="camera-cad-small">' +
        '<rect x="-22" y="-13" width="44" height="26" rx="4" fill="rgba(15, 23, 42, 0.92)" stroke="rgba(125,255,158,.92)" stroke-width="1.7" />' +
        '<path d="M 22 -8 L 42 -14 L 42 14 L 22 8 Z" fill="rgba(15, 23, 42, 0.96)" stroke="rgba(125,255,158,.92)" stroke-width="1.7" stroke-linejoin="round" />' +
        '<line x1="42" y1="-12" x2="42" y2="12" stroke="rgba(125,255,158,.92)" stroke-width="1.7" stroke-linecap="round" />' +
        '<line x1="-13" y1="-13" x2="-13" y2="13" stroke="rgba(125, 255, 158, 0.38)" stroke-width=".9" />' +
        '<circle cx="-5" cy="0" r="4" fill="none" stroke="rgba(125, 255, 158, 0.55)" stroke-width="1.2" />' +
        '<circle cx="-30" cy="0" r="5" fill="rgba(2, 6, 23, 0.95)" stroke="rgba(125,255,158,.92)" stroke-width="1.7" />' +
        '<line x1="-25" y1="0" x2="-22" y2="0" stroke="rgba(125,255,158,.92)" stroke-width="1.7" stroke-linecap="round" />' +
      '</g>';
  }

  function clearMountingLiveVisual() {
    const el = mountingLiveVisualEl();
    if (!el) return;
    el.innerHTML = "";
    el.hidden = true;
    el.setAttribute("hidden", "");
    el.setAttribute("aria-hidden", "true");
  }

  
  function renderMountingLiveVisual(data) {
    const el = mountingLiveVisualEl();
    if (!el || !data || !data.ok) {
      clearMountingLiveVisual();
      return;
    }

    const h = Number(data.h);
    const th = Number(data.th);
    const dist = Number(data.dist);
    const topEdge = Number(data.topEdgeHeight);
    const bottomEdge = Number(data.bottomEdgeHeight);

    if (![h, th, dist, topEdge, bottomEdge].every(Number.isFinite)) {
      clearMountingLiveVisual();
      return;
    }

    const svgW = 780;
    const svgH = 330;
    const floorY = 252;
    const camX = 108;
    const targetX = 642;

    const minH = Math.min(0, bottomEdge, th);
    const maxH = Math.max(8, h, th, topEdge);
    const rangeH = Math.max(8, maxH - minH);

    function yFor(height) {
      return floorY - ((height - minH) / rangeH) * 180;
    }

    const camY = yFor(h);
    const targetY = yFor(th);
    const topY = yFor(topEdge);
    const bottomY = yFor(bottomEdge);
    const gradeY = yFor(0);
    const cameraTilt = clampMountingVisual(data.tilt, -75, 75);
    const tiltRad = deg2rad(cameraTilt);
    const lensReach = 21;
    const lensTipX = camX + Math.cos(tiltRad) * lensReach;
    const lensTipY = camY + Math.sin(tiltRad) * lensReach;
    const labelTilt = Number.isFinite(data.tilt) ? fmtDeg(data.tilt) : "—";
    const dimensionY = Math.min(svgH - 24, Math.max(gradeY, bottomY) + 42);
    const lowerRayAngleDeg = clampMountingVisual(Number(data.tilt) + (Number(data.vfov) / 2), 0.1, 89.5);
    const lowerRayGroundDistanceFt = h / Math.tan(deg2rad(lowerRayAngleDeg));

    let groundHitMarkup = "";
    const lowerDenom = bottomY - lensTipY;
    const lowerRayHitsGrade =
      bottomEdge < 0 &&
      Number.isFinite(lowerDenom) &&
      Math.abs(lowerDenom) > 0.001 &&
      gradeY >= Math.min(lensTipY, bottomY) &&
      gradeY <= Math.max(lensTipY, bottomY);

    if (lowerRayHitsGrade) {
      const hitT = (gradeY - lensTipY) / lowerDenom;
      const hitXFromRay = lensTipX + (targetX - lensTipX) * hitT;
      const hitXFromDistance = camX + ((targetX - camX) * (lowerRayGroundDistanceFt / dist));
      const hitX = Number.isFinite(hitXFromDistance) ? hitXFromDistance : hitXFromRay;
      const hitLabel = Number.isFinite(lowerRayGroundDistanceFt)
        ? "~" + fmtFt(lowerRayGroundDistanceFt, 0) + " from camera"
        : "grade intercept";

      if (Number.isFinite(hitX) && hitX > camX && hitX < targetX) {
        groundHitMarkup =
          '<circle cx="' + fmt(hitX, 2) + '" cy="' + fmt(gradeY, 2) + '" r="4" fill="rgba(245,197,66,.96)" />' +
          '<line x1="' + fmt(hitX, 2) + '" y1="' + fmt(gradeY - 12, 2) + '" x2="' + fmt(hitX, 2) + '" y2="' + fmt(gradeY + 12, 2) + '" stroke="rgba(245,197,66,.72)" stroke-width="1" />' +
          '<text x="' + fmt(hitX + 10, 2) + '" y="' + fmt(gradeY - 12, 2) + '" fill="rgba(255,226,128,.94)" font-size="11" font-weight="900">Lower ray hits grade</text>' +
          '<text x="' + fmt(hitX + 10, 2) + '" y="' + fmt(gradeY + 5, 2) + '" fill="rgba(255,226,128,.86)" font-size="10.5" font-weight="800">' + escapeMountingVisualHtml(hitLabel) + '</text>';
      }
    }

    const pressureRows = [
      {
        label: "Subject Angle Fit",
        score: data.subjectAngleMetric,
        detail: fmtDeg(data.tilt) + " actual / 12-35° preferred"
      },
      {
        label: "Mount Height Balance",
        score: data.mountPressureMetric,
        detail: fmtFt(data.h) + " mount / " + (data.mountFitText || "review")
      },
      {
        label: "Vertical Framing Fit",
        score: data.framingPressureMetric,
        detail: fmtFt(data.topEdgeHeight) + " to " + fmtFt(data.bottomEdgeHeight)
      }
    ];

    const pressureHtml = pressureRows.map((row) => {
      const score = clampMountingVisual(row.score, 0, 100);
      const cls = mountingPressureClass(score);
      return '' +
        '<div class="mounting-pressure-item">' +
          '<div class="mounting-pressure-label">' +
            '<span>' + escapeMountingVisualHtml(row.label) + '</span>' +
            '<span class="mounting-pressure-score">' + score.toFixed(0) + '/100</span>' +
          '</div>' +
          '<div class="mounting-pressure-track">' +
            '<div class="mounting-pressure-fill ' + cls + '" style="width:' + score.toFixed(1) + '%"></div>' +
          '</div>' +
          '<div class="mounting-pressure-detail">' + escapeMountingVisualHtml(row.detail) + '</div>' +
        '</div>';
    }).join("");

    const svg = '' +
      '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="Mounting height side-view geometry">' +
        '<defs>' +
          '<linearGradient id="mountingFovFill" x1="0" x2="1" y1="0" y2="1">' +
            '<stop offset="0%" stop-color="rgba(125,255,152,.22)"/>' +
            '<stop offset="100%" stop-color="rgba(125,255,152,.045)"/>' +
          '</linearGradient>' +
        '</defs>' +

        '<rect x="0" y="0" width="' + svgW + '" height="' + svgH + '" fill="rgba(0,0,0,.08)"/>' +
        '<line x1="48" y1="' + fmt(gradeY, 2) + '" x2="735" y2="' + fmt(gradeY, 2) + '" stroke="rgba(148,163,184,.42)" stroke-width="1"/>' +
        '<text x="50" y="' + fmt(gradeY + 22, 2) + '" fill="rgba(148,163,184,.82)" font-size="12" font-weight="700">Grade / 0 ft reference</text>' +

        '<polygon points="' + fmt(lensTipX, 2) + ',' + fmt(lensTipY, 2) + ' ' + targetX + ',' + fmt(topY, 2) + ' ' + targetX + ',' + fmt(bottomY, 2) + '" fill="url(#mountingFovFill)" stroke="rgba(125,255,152,.34)" stroke-width="1"/>' +
        '<line x1="' + fmt(lensTipX, 2) + '" y1="' + fmt(lensTipY, 2) + '" x2="' + targetX + '" y2="' + fmt(targetY, 2) + '" stroke="rgba(125,255,152,.88)" stroke-width="2"/>' +
        '<line x1="' + fmt(lensTipX, 2) + '" y1="' + fmt(lensTipY, 2) + '" x2="' + targetX + '" y2="' + fmt(topY, 2) + '" stroke="rgba(125,255,152,.38)" stroke-width="1" stroke-dasharray="5 5"/>' +
        '<line x1="' + fmt(lensTipX, 2) + '" y1="' + fmt(lensTipY, 2) + '" x2="' + targetX + '" y2="' + fmt(bottomY, 2) + '" stroke="rgba(125,255,152,.38)" stroke-width="1" stroke-dasharray="5 5"/>' +

        '<line x1="' + camX + '" y1="' + fmt(gradeY, 2) + '" x2="' + camX + '" y2="' + fmt(camY, 2) + '" stroke="rgba(226,232,240,.46)" stroke-width="1.4"/>' +
        mountingCadCameraIcon(camX, camY, cameraTilt) +
        '<text x="' + (camX - 44) + '" y="' + fmt(camY - 26, 2) + '" fill="rgba(226,232,240,.88)" font-size="12" font-weight="800">Mount ' + escapeMountingVisualHtml(fmtFt(h)) + '</text>' +

        '<line x1="' + targetX + '" y1="' + fmt(gradeY, 2) + '" x2="' + targetX + '" y2="' + fmt(targetY, 2) + '" stroke="rgba(245,197,66,.72)" stroke-width="2"/>' +
        '<circle cx="' + targetX + '" cy="' + fmt(targetY, 2) + '" r="5" fill="rgba(245,197,66,.96)"/>' +
        '<text x="' + (targetX - 18) + '" y="' + fmt(targetY - 16, 2) + '" fill="rgba(245,197,66,.94)" font-size="12" font-weight="800">Target ' + escapeMountingVisualHtml(fmtFt(th)) + '</text>' +

        groundHitMarkup +

        '<line x1="' + camX + '" y1="' + fmt(dimensionY, 2) + '" x2="' + targetX + '" y2="' + fmt(dimensionY, 2) + '" stroke="rgba(148,163,184,.48)" stroke-width="1" stroke-dasharray="4 5"/>' +
        '<line x1="' + camX + '" y1="' + fmt(dimensionY - 8, 2) + '" x2="' + camX + '" y2="' + fmt(dimensionY + 8, 2) + '" stroke="rgba(148,163,184,.48)" stroke-width="1"/>' +
        '<line x1="' + targetX + '" y1="' + fmt(dimensionY - 8, 2) + '" x2="' + targetX + '" y2="' + fmt(dimensionY + 8, 2) + '" stroke="rgba(148,163,184,.48)" stroke-width="1"/>' +
        '<text x="' + ((camX + targetX) / 2 - 54) + '" y="' + fmt(dimensionY + 18, 2) + '" fill="rgba(226,232,240,.78)" font-size="12" font-weight="800">Distance ' + escapeMountingVisualHtml(fmtFt(dist)) + '</text>' +

        '<line x1="' + (targetX + 32) + '" y1="' + fmt(topY, 2) + '" x2="' + (targetX + 32) + '" y2="' + fmt(bottomY, 2) + '" stroke="rgba(96,165,250,.72)" stroke-width="2"/>' +
        '<line x1="' + (targetX + 24) + '" y1="' + fmt(topY, 2) + '" x2="' + (targetX + 40) + '" y2="' + fmt(topY, 2) + '" stroke="rgba(96,165,250,.72)" stroke-width="2"/>' +
        '<line x1="' + (targetX + 24) + '" y1="' + fmt(bottomY, 2) + '" x2="' + (targetX + 40) + '" y2="' + fmt(bottomY, 2) + '" stroke="rgba(96,165,250,.72)" stroke-width="2"/>' +
        '<text x="' + (targetX + 48) + '" y="' + fmt(topY + 4, 2) + '" fill="rgba(191,219,254,.90)" font-size="12" font-weight="800">Top ' + escapeMountingVisualHtml(fmtFt(topEdge)) + '</text>' +
        '<text x="' + (targetX + 48) + '" y="' + fmt(bottomY + 4, 2) + '" fill="rgba(191,219,254,.90)" font-size="12" font-weight="800">Bottom ' + escapeMountingVisualHtml(fmtFt(bottomEdge)) + '</text>' +

        '<text x="302" y="48" fill="rgba(125,255,152,.96)" font-size="13" font-weight="900">Down-tilt ' + escapeMountingVisualHtml(labelTilt) + '</text>' +
        '<text x="302" y="68" fill="rgba(148,163,184,.84)" font-size="12" font-weight="700">VFOV ' + escapeMountingVisualHtml(fmtDeg(data.vfov)) + ' / vertical span ' + escapeMountingVisualHtml(fmtFt(data.span)) + '</text>' +
      '</svg>';

    el.innerHTML =
      '<div class="mounting-live-visual-card">' +
        '<div class="mounting-live-visual-head">' +
          '<div>' +
            '<h4 class="mounting-live-visual-title">Mounting geometry and assumption pressure</h4>' +
            '<p class="mounting-live-visual-copy">Side-view geometry shows the tilted camera, lens aim, target point, and vertical field of view against the 0 ft grade reference.</p>' +
          '</div>' +
          '<span class="mounting-live-visual-pill ' + mountingStatusClass(data.status) + '">' + escapeMountingVisualHtml(data.status || "Review") + '</span>' +
        '</div>' +
        '<div class="mounting-cad-stage">' + svg + '</div>' +
        '<div class="mounting-pressure-grid">' + pressureHtml + '</div>' +
      '</div>';

    el.hidden = false;
    el.removeAttribute("hidden");
    el.setAttribute("aria-hidden", "false");
  }


  function renderError(message) {
    clearMountingLiveVisual();
clearMountingStructuredExport();
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function forceMountingContinueVisible() {
    if (els.continueWrap) {
      els.continueWrap.hidden = false;
      els.continueWrap.removeAttribute("hidden");
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
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Vertical Drop", value: fmtFt(data.drop) },
        { label: "Suggested Down-Tilt", value: fmtDeg(data.tilt) },
        { label: "Subject Angle Fit", value: data.subjectFitText },
        { label: "Vertical Coverage Span", value: fmtFt(data.span) }
      ],
      derivedRows: [
        { label: "Approx. Top of View @ Distance", value: fmtFt(data.topEdgeHeight) },
        { label: "Approx. Bottom of View @ Distance", value: fmtFt(data.bottomEdgeHeight) },
        { label: "Mount Height", value: fmtFt(data.h) },
        { label: "Mounting Context", value: data.mountContextLabel },
        { label: "Mount Height Balance", value: data.mountFitText },
        { label: "Target Distance", value: fmtFt(data.dist) },
        { label: "Target Distance Source", value: data.sourceMode === "manual-override" ? "Manual override" : "Area Planner carry-over" },
        { label: "Target Height", value: fmtFt(data.th) },
        { label: "Camera Vertical View Profile", value: data.vfovProfileLabel || "Custom vertical FOV" },
        { label: "Vertical FOV Source", value: data.vfovSourceMode === "manual-override" ? "Manual assumption" : "Guided profile" },
        { label: "Vertical Framing Fit", value: data.framingFitText },
        { label: "Height Guidance", value: data.heightText }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Subject Angle Fit", "Mount Height Balance", "Vertical Framing Fit"],
        values: [
          Number(data.subjectAngleMetric.toFixed(1)),
          Number(data.mountPressureMetric.toFixed(1)),
          Number(data.framingPressureMetric.toFixed(1))
        ],
        displayValues: [
          fmtDeg(data.tilt) + " actual / 12-35 deg preferred",
          fmtFt(data.h) + " mount / " + data.mountFitText,
          fmtFt(data.topEdgeHeight) + " to " + fmtFt(data.bottomEdgeHeight)
        ],
        referenceValue: 20,
        healthyMax: 20,
        watchMax: 45,
        axisTitle: "Mounting Assumption Fit",
        referenceLabel: "Healthy Fit",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
    renderMountingLiveVisual(data);
renderMountingStructuredExport(data);
    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
    forceMountingContinueVisible();

    if (els.continueWrap) {
      els.continueWrap.hidden = false;
      els.continueWrap.removeAttribute("hidden");
      els.continueWrap.style.display = "flex";
      els.continueWrap.style.marginTop = "0";
    }
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    hydrateMountingInputsFromActiveArea();
    applyVfovProfileToInput({ force: true });
    renderVfovProfileGuidance();
    renderMountContextGuidance();
    renderFlowNote();
    renderMountingOverrideNotice();
    invalidate({ clearFlow: true });
  }

  function bind() {
    if (els.mountContext) {
      els.mountContext.addEventListener("change", () => {
        renderMountContextGuidance();
        invalidate({ clearFlow: true });
      });
    }

    if (els.h) {
      els.h.addEventListener("input", renderMountContextGuidance);
      els.h.addEventListener("change", renderMountContextGuidance);
    }

    if (els.vfovProfile) {
      els.vfovProfile.addEventListener("change", () => {
        applyVfovProfileToInput({ force: true });
        renderVfovProfileGuidance();
        invalidate({ clearFlow: true });
      });
    }

    if (els.vfov) {
      els.vfov.addEventListener("input", renderVfovProfileGuidance);
      els.vfov.addEventListener("change", renderVfovProfileGuidance);
    }

    ["h", "dist", "th", "vfov"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("input", () => {
        renderMountingOverrideNotice();
        invalidate({ clearFlow: true });
      });

      el.addEventListener("change", () => {
        renderMountingOverrideNotice();
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

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    bind();
    if (els.mountContext) els.mountContext.value = DEFAULTS.mountContext;
    if (els.h) els.h.value = "";
    hydrateMountingInputsFromActiveArea();
    applyVfovProfileToInput({ force: true });
    renderVfovProfileGuidance();
    renderMountContextGuidance();
    renderFlowNote();
    renderMountingOverrideNotice();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", init);
})();