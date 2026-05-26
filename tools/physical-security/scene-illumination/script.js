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
  const STEP = "scene-illumination";
  const NEXT_URL = "/tools/physical-security/mounting-height/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    w: $("w"),
    d: $("d"),
    fc: $("fc"),
    lightingGoal: $("lightingGoal"),
    lightingRange: $("lightingRange"),
    uf: $("uf"),
    ufPreset: $("ufPreset"),
    llf: $("llf"),
    llfPreset: $("llfPreset"),
    factorGuidance: $("factorGuidance"),
    liveVisual: $("sceneIlluminationLiveVisual"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    planningFlowContext: $("planning-flow-context"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
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
    w: 60,
    d: 40,
    fc: 2.0,
    lightingGoal: "general",
    uf: 70,
    ufPreset: "typical",
    llf: 80,
    llfPreset: "typical"
  };

  const LIGHTING_GOALS = {
    basic: { id: "basic", label: "Basic visibility / orientation", low: 0.2, typical: 0.5, high: 1.0, note: "Use this for simple orientation where cameras mostly need scene awareness, not strong detail." },
    general: { id: "general", label: "General surveillance", low: 1.0, typical: 2.0, high: 3.0, note: "A practical baseline for many general surveillance scenes before geometry and detail checks are finalized." },
    entrance: { id: "entrance", label: "Entrance / doorway detail", low: 3.0, typical: 5.0, high: 10.0, note: "Use this when facial detail, doorway transitions, or subject quality matter more than simple visibility." },
    parking: { id: "parking", label: "Parking / open area", low: 0.5, typical: 1.0, high: 2.0, note: "A lower exterior baseline where coverage area can be large and fixture count grows quickly." },
    lowlight: { id: "lowlight", label: "Low-light camera support", low: 0.1, typical: 0.5, high: 1.0, note: "Use this when cameras are expected to work with minimal visible light, IR support, or strong low-light sensors." },
    custom: { id: "custom", label: "Custom target", low: null, typical: null, high: null, note: "Use this when a project specification, owner standard, or fixture plan already defines the target footcandle value." }
  };

  function lightingGoalPreset(id) {
    return LIGHTING_GOALS[id] || LIGHTING_GOALS.general;
  }

  function lightingGoalRangeText(rangeOrPreset) {
    if (!rangeOrPreset || rangeOrPreset.id === "custom") return "Custom target";
    return fmtFc(rangeOrPreset.low, 1) + " - " + fmtFc(rangeOrPreset.high, 1) + " range, " + fmtFc(rangeOrPreset.typical, 1) + " typical";
  }

  function estimatedLumensForTarget(fc, w, d, ufPct, llfPct) {
    const area = w * d;
    const effectiveFactor = Math.max(0.05, (ufPct / 100) * (llfPct / 100));
    return (fc * area) / effectiveFactor;
  }

  function renderLightingGoalGuidance() {
    if (!els.lightingRange) return;

    const preset = lightingGoalPreset(els.lightingGoal?.value || DEFAULTS.lightingGoal);
    const w = num(els.w?.value);
    const d = num(els.d?.value);
    const ufPct = num(els.uf?.value);
    const llfPct = num(els.llf?.value);
    const currentFc = num(els.fc?.value);

    if (preset.id === "custom") {
      els.lightingRange.innerHTML = '<strong>Custom lighting target</strong><br>Use this when a project specification, owner standard, or fixture plan already defines the target footcandle value. The result will be treated as a manual lighting assumption.';
      return;
    }

    const canEstimate = Number.isFinite(w) && w > 0 && Number.isFinite(d) && d > 0 && Number.isFinite(ufPct) && ufPct > 0 && Number.isFinite(llfPct) && llfPct > 0;
    const currentOutsideRange = Number.isFinite(currentFc) && (currentFc < preset.low || currentFc > preset.high);

    const rangeHtml = canEstimate
      ? '<div class="lighting-goal-grid">' +
          '<div class="lighting-goal-metric">Low<br><strong>' + fmtFc(preset.low, 1) + '</strong><span class="muted">' + fmtLumens(estimatedLumensForTarget(preset.low, w, d, ufPct, llfPct)) + '</span></div>' +
          '<div class="lighting-goal-metric">Typical<br><strong>' + fmtFc(preset.typical, 1) + '</strong><span class="muted">' + fmtLumens(estimatedLumensForTarget(preset.typical, w, d, ufPct, llfPct)) + '</span></div>' +
          '<div class="lighting-goal-metric">High<br><strong>' + fmtFc(preset.high, 1) + '</strong><span class="muted">' + fmtLumens(estimatedLumensForTarget(preset.high, w, d, ufPct, llfPct)) + '</span></div>' +
        '</div>'
      : '<div class="mini-note">Enter area width, depth, utilization factor, and light-loss factor to compare lumen demand across the range.</div>';

    els.lightingRange.innerHTML =
      '<strong>' + preset.label + '</strong><br>' +
      preset.note + '<br><span class="muted">Recommended target: ' + lightingGoalRangeText(preset) + '.</span>' +
      rangeHtml +
      (currentOutsideRange ? '<div class="lighting-goal-warning">Current target is outside the selected goal range. This is allowed, but it should be treated as a manual lighting assumption.</div>' : '');
  }

  function selectedLightingGoalInfo(fc) {
    const preset = lightingGoalPreset(els.lightingGoal?.value || DEFAULTS.lightingGoal);
    const outsideRange = preset.id !== "custom" && Number.isFinite(fc) && (fc < preset.low || fc > preset.high);

    return {
      id: preset.id,
      label: preset.label,
      range: preset.id === "custom" ? null : { low: preset.low, typical: preset.typical, high: preset.high },
      sourceMode: preset.id === "custom" || outsideRange ? "manual-override" : "preset",
      outsideRange
    };
  }

  

  function num(v) {
    return ScopedLabsAnalyzer.safeNumber(v, NaN);
  }

  function fmt(v, digits = 1) {
    return Number.isFinite(v) ? v.toFixed(digits) : "—";
  }

  function fmtFt(v, digits = 1) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} ft` : "—";
  }

  function fmtSqFt(v, digits = 0) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} sq ft` : "—";
  }

  function fmtPct(v, digits = 1) {
    return Number.isFinite(v) ? `${v.toFixed(digits)}%` : "—";
  }

  function fmtFc(v, digits = 2) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} fc` : "—";
  }

  function fmtLumens(v, digits = 0) {
    return Number.isFinite(v) ? `${v.toFixed(digits)} lm` : "—";
  }

  function fmtFactor(v, digits = 2) {
    return Number.isFinite(v) ? v.toFixed(digits) : "—";
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
      FLOW_KEYS.mount,
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

  const UTILIZATION_PRESETS = {
    efficient: { id: "efficient", label: "Efficient direct coverage", value: 80, note: "Most fixture output is aimed into the useful target area with limited spill or obstruction." },
    typical: { id: "typical", label: "Typical site lighting", value: 70, note: "A practical baseline for normal outdoor/site lighting with reasonable aiming and fixture placement." },
    mixed: { id: "mixed", label: "Mixed / partially obstructed", value: 55, note: "Use this when layout, mounting, obstructions, or spill reduce useful light reaching the target area." },
    poor: { id: "poor", label: "Poor distribution / spill loss", value: 40, note: "Use this for conservative planning where much of the raw output is not useful to the protected area." },
    custom: { id: "custom", label: "Custom utilization factor", value: null, note: "Use this when fixture photometrics, layout software, or a project standard already defines the utilization factor." }
  };

  const LIGHT_LOSS_PRESETS = {
    clean: { id: "clean", label: "Clean / regularly maintained", value: 90, note: "Fixtures are expected to stay clean and maintained, so less output is lost over time." },
    typical: { id: "typical", label: "Typical maintained outdoor system", value: 80, note: "A practical maintained-light baseline for normal exterior environments." },
    dirty: { id: "dirty", label: "Dirty / aging / exposed environment", value: 70, note: "Use this when dirt, aging, weather exposure, or lens degradation will reduce delivered light." },
    harsh: { id: "harsh", label: "Harsh / low-maintenance environment", value: 60, note: "Use this for conservative planning where maintenance is limited or the environment is demanding." },
    custom: { id: "custom", label: "Custom light loss factor", value: null, note: "Use this when a maintenance plan, standard, or lighting model already defines the light loss factor." }
  };

  function utilizationPreset(id) {
    return UTILIZATION_PRESETS[id] || UTILIZATION_PRESETS.typical;
  }

  function lightLossPreset(id) {
    return LIGHT_LOSS_PRESETS[id] || LIGHT_LOSS_PRESETS.typical;
  }

  function factorSourceInfo(ufPct, llfPct) {
    const ufPreset = utilizationPreset(els.ufPreset?.value || DEFAULTS.ufPreset);
    const llfPreset = lightLossPreset(els.llfPreset?.value || DEFAULTS.llfPreset);

    const ufManual = ufPreset.id === "custom" || (Number.isFinite(ufPct) && Number.isFinite(ufPreset.value) && Math.abs(ufPct - ufPreset.value) > 0.01);
    const llfManual = llfPreset.id === "custom" || (Number.isFinite(llfPct) && Number.isFinite(llfPreset.value) && Math.abs(llfPct - llfPreset.value) > 0.01);

    return {
      utilizationPresetId: ufPreset.id,
      utilizationPresetLabel: ufPreset.label,
      utilizationSourceMode: ufManual ? "manual-override" : "preset",
      utilizationManualOverride: ufManual,
      lightLossPresetId: llfPreset.id,
      lightLossPresetLabel: llfPreset.label,
      lightLossSourceMode: llfManual ? "manual-override" : "preset",
      lightLossManualOverride: llfManual,
      effectiveSourceMode: ufManual || llfManual ? "manual-override" : "preset"
    };
  }

  function renderFactorGuidance() {
    if (!els.factorGuidance) return;

    const ufPreset = utilizationPreset(els.ufPreset?.value || DEFAULTS.ufPreset);
    const llfPreset = lightLossPreset(els.llfPreset?.value || DEFAULTS.llfPreset);
    const ufPct = num(els.uf?.value);
    const llfPct = num(els.llf?.value);
    const effective = Number.isFinite(ufPct) && Number.isFinite(llfPct) ? (ufPct / 100) * (llfPct / 100) : null;
    const info = factorSourceInfo(ufPct, llfPct);

    els.factorGuidance.innerHTML =
      '<strong>Effective planning factor</strong><br>' +
      'Utilization factor estimates how much fixture output reaches the useful area. Light loss factor accounts for dirt, aging, environment, and maintenance.' +
      '<div class="lighting-factor-grid">' +
        '<div class="lighting-factor-metric">Layout efficiency<br><strong>' + (Number.isFinite(ufPct) ? fmtPct(ufPct) : "n/a") + '</strong><span class="muted">' + ufPreset.label + '</span></div>' +
        '<div class="lighting-factor-metric">Maintenance condition<br><strong>' + (Number.isFinite(llfPct) ? fmtPct(llfPct) : "n/a") + '</strong><span class="muted">' + llfPreset.label + '</span></div>' +
        '<div class="lighting-factor-metric">Useful maintained light<br><strong>' + (effective === null ? "n/a" : fmtPct(effective * 100)) + '</strong><span class="muted">UF x LLF</span></div>' +
      '</div>' +
      '<div class="mini-note">' + ufPreset.note + ' ' + llfPreset.note + '</div>' +
      (info.effectiveSourceMode === "manual-override" ? '<div class="lighting-goal-warning">One or more lighting factor values do not match the selected preset. This is allowed, but it will be treated as a manual lighting assumption.</div>' : '');
  }

  

  function firstFiniteValue(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return number;
    }

    return null;
  }

  function activeAreaForSceneLighting() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;
    return api.getActiveArea();
  }

  function applySceneValue(el, value) {
    const number = Number(value);
    if (!el || !Number.isFinite(number) || number <= 0) return false;
    el.value = String(number);
    return true;
  }

  function hydrateSceneInputsFromActiveArea() {
    const area = activeAreaForSceneLighting();
    if (!area) return;

    const width = firstFiniteValue(
      area.protectedLengthFt,
      area.sceneWidthFt,
      area.coverageWidthFt,
      area.estimatedSceneWidthFt
    );

    const lightingDepth = firstFiniteValue(
      area.sceneDepthFt,
      area.lightingAreaDepthFt
    );

    applySceneValue(els.w, width);

    if (lightingDepth !== null) {
      applySceneValue(els.d, lightingDepth);
    } else if (els.d) {
      els.d.value = "";
      els.d.placeholder = "Depth of lit/evaluated zone";
    }

    if (els.lightingGoal && area.lightingGoalId) {
      els.lightingGoal.value = area.lightingGoalId;
    }

    if (els.fc && Number.isFinite(Number(area.targetIlluminationFc)) && Number(area.targetIlluminationFc) > 0) {
      els.fc.value = String(area.targetIlluminationFc);
    }

    if (els.ufPreset && area.utilizationPresetId) {
      els.ufPreset.value = area.utilizationPresetId;
    }

    if (els.llfPreset && area.lightLossPresetId) {
      els.llfPreset.value = area.lightLossPresetId;
    }

    if (els.uf && Number.isFinite(Number(area.utilizationFactor)) && Number(area.utilizationFactor) > 0) {
      els.uf.value = String(Math.round(Number(area.utilizationFactor) * 100));
    }

    if (els.llf && Number.isFinite(Number(area.lightLossFactor)) && Number(area.lightLossFactor) > 0) {
      els.llf.value = String(Math.round(Number(area.lightLossFactor) * 100));
    }
  }

  function applyDefaults() {
    if (els.lightingGoal) els.lightingGoal.value = DEFAULTS.lightingGoal;
    if (els.ufPreset) els.ufPreset.value = DEFAULTS.ufPreset;
    if (els.llfPreset) els.llfPreset.value = DEFAULTS.llfPreset;
    els.w.value = String(DEFAULTS.w);
    els.d.value = String(DEFAULTS.d);
    els.fc.value = String(DEFAULTS.fc);
    els.uf.value = String(DEFAULTS.uf);
    els.llf.value = String(DEFAULTS.llf);
    renderLightingGoalGuidance();
    renderFactorGuidance();
  }

  function renderFlowNote() {
    if (!visibleFlowContextEl()) return;
    visibleFlowContextEl().hidden = false;
    visibleFlowContextEl().innerHTML = `
      <strong>Planning Context</strong><br>
      This tool starts the design flow by establishing the scene-lighting baseline that downstream geometry and detail steps will build on.
    `;
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.scene);
      clearDownstream();
    }

    clearSceneIlluminationLiveVisual();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.scene,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Estimate Lighting."
    });

    renderFlowNote();
  }

  function classifyFootcandles(fc) {
    if (fc < 1) return "Very Low";
    if (fc < 3) return "Low Light";
    if (fc < 10) return "Moderate";
    return "High";
  }

  function suitability(fc) {
    if (fc < 1) {
      return "Scene illumination is very weak. The design will depend heavily on IR, aggressive gain, or extreme low-light camera behavior, which raises noise and reduces dependable evidence quality.";
    }
    if (fc < 3) {
      return "Lighting is workable for general awareness, but still light-starved for stronger identification work. Exposure stress, blur, and color loss are more likely in real conditions.";
    }
    if (fc < 10) {
      return "Lighting is in a practical planning range for many exterior and perimeter scenes. Cameras should perform more comfortably, especially for general surveillance and improved image clarity.";
    }
    return "Lighting is strong and gives the optical design a healthier starting point. Better exposure control and lower low-light stress improve downstream detail performance.";
  }

  function nextStepGuidance(fc, lumens, area) {
    if (fc < 2) {
      return "Before moving into mounting height and field-of-view decisions, confirm whether fixture output or lighting strategy should be improved. Weak illumination can undermine otherwise-correct camera geometry.";
    }
    if (lumens > 30000 && area < 5000) {
      return "Required lumen output is aggressive for the scene size. Re-check whether the footcandle target is truly necessary, or whether fixture aiming and zone coverage should be adjusted.";
    }
    return "This lighting baseline is workable for continuing into mounting height and field-of-view design. Next steps should validate angle, coverage, and detail against the surveillance objective.";
  }

  function getInputs() {
    const w = num(els.w.value);
    const d = num(els.d.value);
    const fc = num(els.fc.value);
    const ufPct = num(els.uf.value);
    const llfPct = num(els.llf.value);
    const goalInfo = selectedLightingGoalInfo(fc);
    const factorInfo = factorSourceInfo(ufPct, llfPct);

    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(d) || d <= 0 || !Number.isFinite(fc) || fc <= 0 || !Number.isFinite(ufPct) || ufPct <= 0 || ufPct > 100 || !Number.isFinite(llfPct) || llfPct <= 0 || llfPct > 100) {
      return { ok: false, message: "Enter valid values and press Estimate Lighting." };
    }

    return {
      ok: true,
      w,
      d,
      fc,
      ufPct,
      llfPct,
      uf: ufPct / 100,
      llf: llfPct / 100,
      lightingGoalId: goalInfo.id,
      lightingGoalLabel: goalInfo.label,
      targetFootcandleRange: goalInfo.range,
      footcandleSourceMode: goalInfo.sourceMode,
      footcandleOutsideRange: goalInfo.outsideRange,
      ...factorInfo
    };
  }

  function pressureFromEffectiveFactor(effectiveFactor) {
    if (!Number.isFinite(effectiveFactor)) return 100;

    if (effectiveFactor >= 0.55) {
      return Math.max(0, Math.min(20, ((0.75 - effectiveFactor) / 0.20) * 20));
    }

    if (effectiveFactor >= 0.40) {
      return 20 + ((0.55 - effectiveFactor) / 0.15) * 25;
    }

    return Math.min(100, 45 + ((0.40 - effectiveFactor) / 0.35) * 55);
  }

  function pressureFromTargetFit(input) {
    const fc = input.fc;
    const range = input.targetFootcandleRange;

    if (!Number.isFinite(fc)) return 100;

    if (!range) {
      if (fc <= 10) return 25;
      if (fc <= 20) return 45;
      return 75;
    }

    if (fc >= range.low && fc <= range.high) {
      const span = Math.max(0.1, range.high - range.low);
      return 8 + ((fc - range.low) / span) * 10;
    }

    if (fc < range.low) {
      return fc < range.low * 0.5 ? 55 : 35;
    }

    return fc > range.high * 1.5 ? 70 : 40;
  }

  function pressureFromOutputLoad(input, effectiveFactor, lumenDensity) {
    const range = input.targetFootcandleRange;

    if (!Number.isFinite(lumenDensity)) return 100;

    if (range) {
      const expectedHighDensity = range.high / Math.max(effectiveFactor, 0.05);

      if (lumenDensity <= expectedHighDensity) {
        return 8 + Math.min(12, (lumenDensity / Math.max(expectedHighDensity, 0.1)) * 12);
      }

      return Math.min(100, 30 + ((lumenDensity - expectedHighDensity) / Math.max(expectedHighDensity, 0.1)) * 45);
    }

    if (lumenDensity <= 8) return 20;
    if (lumenDensity <= 15) return 40;
    return Math.min(100, 55 + ((lumenDensity - 15) / 15) * 45);
  }

  function lightingHealthNarrative(input, effectiveFactor, lumenDensity) {
    const notes = [];

    if (input.footcandleOutsideRange) {
      notes.push("The target footcandle value is outside the selected lighting-goal range.");
    }

    if (input.effectiveSourceMode === "manual-override") {
      notes.push("One or more lighting factor values were manually adjusted away from the selected preset.");
    }

    if (effectiveFactor < 0.40) {
      notes.push("The combined utilization and light-loss factor is low, so the useful maintained light is heavily reduced.");
    } else if (effectiveFactor >= 0.55) {
      notes.push("The combined utilization and light-loss factor is within a practical planning range.");
    }

    if (input.targetFootcandleRange && input.fc >= input.targetFootcandleRange.low && input.fc <= input.targetFootcandleRange.high) {
      notes.push("The selected target is inside the recommended range for this lighting goal.");
    }

    if (!notes.length) {
      notes.push("Lighting assumptions are recorded for downstream camera planning.");
    }

    return notes.join(" ");
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const area = input.w * input.d;
    const effectiveFactor = Math.max(0.05, input.uf * input.llf);
    const lumens = (input.fc * area) / effectiveFactor;
    const lumenDensity = area > 0 ? lumens / area : 0;

    const lightingClass = classifyFootcandles(input.fc);
    const interpretationBase = suitability(input.fc);
    const guidance = nextStepGuidance(input.fc, lumens, area);

    const factorPressureMetric = pressureFromEffectiveFactor(effectiveFactor);
    const targetDemandMetric = pressureFromTargetFit(input);
    const outputLoadMetric = pressureFromOutputLoad(input, effectiveFactor, lumenDensity);

    const metrics = [
      { label: "Planning Factor Fit", value: factorPressureMetric, displayValue: fmtFactor(effectiveFactor) },
      { label: "Target Range Fit", value: targetDemandMetric, displayValue: input.targetFootcandleRange ? lightingGoalRangeText(input.targetFootcandleRange) : "Custom target" },
      { label: "Output Load Fit", value: outputLoadMetric, displayValue: fmt(lumenDensity, 2) + " lm/sq ft" }
    ];

    const dominantMetric = Math.max(factorPressureMetric, targetDemandMetric, outputLoadMetric);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: dominantMetric,
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let dominantConstraint = "";
    if (input.footcandleOutsideRange) {
      dominantConstraint = "Target range fit is the dominant limiter. The selected footcandle target is outside the recommended range for the chosen lighting goal.";
    } else if (effectiveFactor < 0.45) {
      dominantConstraint = "Planning factor fit is the dominant limiter. The selected layout efficiency and maintenance assumptions reduce useful maintained light, so the scene demands more lumens than it first appears.";
    } else if (outputLoadMetric > 45) {
      dominantConstraint = "Output load fit is the dominant limiter. The lumen demand is unusually high for the selected goal and effective planning factor.";
    } else {
      dominantConstraint = "The lighting baseline is internally consistent. The target illumination, layout efficiency, and maintenance assumptions fit the selected lighting goal.";
    }

    const rangeText = input.targetFootcandleRange ? lightingGoalRangeText(input.targetFootcandleRange) : "custom target";
    const fcSourceNote = input.footcandleSourceMode === "manual-override" ? "The footcandle target is being treated as a manual lighting assumption." : "The footcandle target came from the selected lighting goal preset.";
    const factorSourceNote = input.effectiveSourceMode === "manual-override" ? "One or more lighting factor values are being treated as manual assumptions." : "The utilization and light loss values came from guided presets.";
    const healthNote = lightingHealthNarrative(input, effectiveFactor, lumenDensity);

    const interpretation = "Lighting goal is " + input.lightingGoalLabel + " using " + rangeText + ". Fixture/layout efficiency is " + input.utilizationPresetLabel + " and maintenance/environment is " + input.lightLossPresetLabel + ". For an area of " + fmtSqFt(area) + " at a target of " + fmtFc(input.fc) + ", with a utilization factor of " + fmtPct(input.ufPct) + " and light-loss factor of " + fmtPct(input.llfPct) + ", the effective planning factor is " + fmtFactor(effectiveFactor) + ". The estimated lumen requirement is about " + fmtLumens(lumens) + ". Lighting condition is classified as " + lightingClass + ". " + healthNote + " " + fcSourceNote + " " + factorSourceNote + " " + interpretationBase;

    return {
      ok: true,
      ...input,
      area,
      effectiveFactor,
      lumens,
      lumenDensity,
      lightingClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      factorPressureMetric,
      targetDemandMetric,
      outputLoadMetric
    };
  }


  // data-scopedlabs-scene-live-visual-001
  function sceneIlluminationGraphicsModel(data) {
    return {
      tool: "scene-illumination",
      ariaLabel: "Scene Illumination lighting baseline CAD view",
      areaWidthFt: data && data.w,
      areaDepthFt: data && data.d,
      areaSqFt: data && data.area,
      targetFootcandles: data && data.fc,
      estimatedLumens: data && data.lumens,
      effectiveFactor: data && data.effectiveFactor,
      utilizationPct: data && data.ufPct,
      lightLossPct: data && data.llfPct,
      lumenDensity: data && data.lumenDensity,
      status: data && data.status,
      lightingClass: data && data.lightingClass,
      lightingGoalLabel: data && data.lightingGoalLabel
    };
  }

  function clearSceneIlluminationLiveVisual() {
    if (!els.liveVisual) return;
    els.liveVisual.hidden = true;
    els.liveVisual.innerHTML = "";
    els.liveVisual.setAttribute("aria-hidden", "true");
  }

  function renderSceneIlluminationLiveVisual(data) {
    if (!els.liveVisual || !data || !data.ok) return;

    const gfx = window.ScopedLabsGraphics;
    let svg = "";

    if (gfx && typeof gfx.render === "function") {
      svg = gfx.render("scene-illumination-lighting-plan", sceneIlluminationGraphicsModel(data));

      if (typeof svg === "string" && svg.includes("<svg")) {
        svg = svg.replace(/\sdata-export-svg\b/g, "");

        if (typeof gfx.frameSvg === "function") {
          svg = gfx.frameSvg(svg, {
            renderer: "scene-illumination-lighting-plan",
            tool: "scene-illumination",
            size: "wide"
          });
        }
      }
    }

    if (typeof svg !== "string" || !svg.includes("<svg")) {
      clearSceneIlluminationLiveVisual();
      return;
    }

    els.liveVisual.innerHTML = svg;
    els.liveVisual.hidden = false;
    els.liveVisual.removeAttribute("hidden");
    els.liveVisual.setAttribute("aria-hidden", "false");

    if (gfx && typeof gfx.tuneFrame === "function") {
      gfx.tuneFrame(els.liveVisual, {
        selector: ".sl-graphics-frame-svg, [data-sl-renderer]",
        size: "wide"
      });
    }
  }


  function updateActiveAreaFromScene(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      sceneWidthFt: data.w,
      sceneDepthFt: data.d,
      lightingAreaWidthFt: data.w,
      lightingAreaDepthFt: data.d,
      sceneAreaSqFt: data.area,
      targetIlluminationFc: data.fc,
      lightingGoalId: data.lightingGoalId,
      lightingGoalLabel: data.lightingGoalLabel,
      targetFootcandleRange: data.targetFootcandleRange,
      footcandleSourceMode: data.footcandleSourceMode,
      footcandleOutsideRange: data.footcandleOutsideRange,
      utilizationPresetId: data.utilizationPresetId,
      utilizationPresetLabel: data.utilizationPresetLabel,
      utilizationSourceMode: data.utilizationSourceMode,
      lightLossPresetId: data.lightLossPresetId,
      lightLossPresetLabel: data.lightLossPresetLabel,
      lightLossSourceMode: data.lightLossSourceMode,
      effectiveLightingSourceMode: data.effectiveSourceMode,
      utilizationFactor: data.uf,
      lightLossFactor: data.llf,
      effectiveLightingFactor: data.effectiveFactor,
      estimatedLumensRequired: data.lumens,
      lumenDensity: data.lumenDensity,
      lightingClass: data.lightingClass,
      lightingStatus: data.status,
      lightingInterpretation: data.interpretation,
      lightingGuidance: data.guidance,
      lightingUpdatedAt: new Date().toISOString()
    });
  }

  


  // data-scene-illumination-guidance-factory-adapter-001
  let sceneIlluminationGuidanceAdapter = null;

  function cloneSceneIlluminationGuidance(value) {
    if (!value || typeof value !== "object") return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function sceneIlluminationManualSourceFields(data) {
    const fields = [];

    if (String(data.footcandleSourceMode || "").toLowerCase() === "manual-override") {
      fields.push("Target illumination");
    }

    if (String(data.effectiveSourceMode || "").toLowerCase() === "manual-override") {
      fields.push("Effective planning factor");
    }

    if (String(data.utilizationSourceMode || "").toLowerCase() === "manual-override") {
      fields.push("Utilization factor");
    }

    if (String(data.lightLossSourceMode || "").toLowerCase() === "manual-override") {
      fields.push("Light loss factor");
    }

    return fields;
  }

  function sceneIlluminationSourceMode(data) {
    return sceneIlluminationManualSourceFields(data).length ? "manual-override" : "pipeline";
  }

  function sceneIlluminationGuidanceStatus(data) {
    const status = String(data && data.status || "").toLowerCase();
    const factorPressure = Number(data && data.factorPressureMetric);
    const targetDemand = Number(data && data.targetDemandMetric);
    const outputLoad = Number(data && data.outputLoadMetric);
    const effectiveFactor = Number(data && data.effectiveFactor);

    if (status.includes("risk")) return "risk";
    if (Number.isFinite(factorPressure) && factorPressure > 70) return "risk";
    if (Number.isFinite(targetDemand) && targetDemand > 70) return "risk";
    if (Number.isFinite(outputLoad) && outputLoad > 70) return "risk";

    if (status.includes("watch")) return "watch";
    if (data && data.footcandleOutsideRange) return "watch";
    if (Number.isFinite(effectiveFactor) && effectiveFactor < 0.45) return "watch";
    if (Number.isFinite(factorPressure) && factorPressure > 45) return "watch";
    if (Number.isFinite(targetDemand) && targetDemand > 45) return "watch";
    if (Number.isFinite(outputLoad) && outputLoad > 45) return "watch";

    if (status.includes("healthy")) return "healthy";

    return "unknown";
  }

  function sceneIlluminationExpectedResult(data) {
    const parts = [];

    if (data.lightingGoalLabel) parts.push(data.lightingGoalLabel);
    if (Number.isFinite(Number(data.area))) parts.push(fmtSqFt(data.area) + " lighting area");
    if (Number.isFinite(Number(data.fc))) parts.push(fmtFc(data.fc) + " target");
    if (Number.isFinite(Number(data.effectiveFactor))) parts.push(fmtFactor(data.effectiveFactor) + " effective factor");
    if (Number.isFinite(Number(data.lumens))) parts.push(fmtLumens(data.lumens) + " estimated");
    if (Number.isFinite(Number(data.lumenDensity))) parts.push(fmt(data.lumenDensity, 2) + " lm/sq ft");
    if (data.lightingClass) parts.push(data.lightingClass);

    return parts.filter(Boolean).join(" | ");
  }

  function sceneIlluminationPrimaryRecommendation(data) {
    const status = sceneIlluminationGuidanceStatus(data);
    const expectedResult = sceneIlluminationExpectedResult(data);
    const affectedFields = sceneIlluminationManualSourceFields(data);

    if (status === "healthy") {
      return {
        action: "Keep Current Scene Illumination Baseline",
        reason: "The lighting target, planning factor, and output load fit the selected scene goal well enough for the next planning step.",
        expectedResult,
        confidence: affectedFields.length ? "Manual lighting assumptions present" : "Preset lighting assumptions",
        nextStep: "Carry this lighting baseline into Mounting Height."
      };
    }

    if (status === "risk") {
      return {
        action: "Correct Scene Illumination Assumptions",
        reason: "The scene lighting assumptions are producing a high-pressure lumen requirement or target mismatch before mounting geometry is evaluated.",
        expectedResult,
        confidence: "Lighting assumption risk",
        nextStep: "Review the lighting goal, footcandle target, utilization factor, light loss factor, or split the scene before continuing."
      };
    }

    if (status === "watch") {
      return {
        action: "Validate Lighting Assumptions Before Mounting Height",
        reason: "The lighting baseline is usable, but one or more target, efficiency, or output-load assumptions should be confirmed before it is carried forward.",
        expectedResult,
        confidence: affectedFields.length ? "Manual lighting assumptions present" : "Lighting watch item",
        nextStep: "Confirm the target range and effective planning factor before continuing to Mounting Height."
      };
    }

    return {
      action: "Review Scene Illumination Assumptions",
      reason: "The current scene illumination result needs review before it is carried into mounting geometry.",
      expectedResult,
      confidence: "Review required",
      nextStep: "Confirm area dimensions, lighting goal, target footcandles, utilization factor, and light loss factor."
    };
  }

  function sceneIlluminationSecondaryOptions(data) {
    const status = sceneIlluminationGuidanceStatus(data);

    const options = [
      {
        label: "Use guided lighting presets",
        intent: "Return the target and planning factors to expected preset values.",
        expectedResult: "Source integrity should move toward a clean pipeline baseline.",
        tradeoff: "Preset values may not capture every site-specific lighting condition.",
        canApply: sceneIlluminationManualSourceFields(data).length > 0
      },
      {
        label: "Adjust target footcandles",
        intent: "Bring the lighting target back into the recommended range for the selected goal.",
        expectedResult: "Target range fit should improve.",
        tradeoff: "Lowering the target may reduce scene visibility if the goal was intentionally aggressive.",
        canApply: status === "watch" || status === "risk" || !!data.footcandleOutsideRange
      },
      {
        label: "Improve planning factor",
        intent: "Use better fixture/layout efficiency or maintenance assumptions.",
        expectedResult: "Effective planning factor should increase and lumen demand should drop.",
        tradeoff: "May require better fixtures, layout changes, or cleaner environmental assumptions.",
        canApply: status === "watch" || status === "risk"
      },
      {
        label: "Split the lighting area",
        intent: "Break a high-demand area into smaller lighting zones.",
        expectedResult: "Each zone can carry a clearer lighting baseline into Mounting Height.",
        tradeoff: "Adds planning complexity but improves assumption control.",
        canApply: status === "watch" || status === "risk"
      },
      {
        label: "Continue to Mounting Height",
        intent: "Carry the lighting baseline into camera mounting geometry.",
        expectedResult: "Mounting Height can evaluate geometry using the selected scene assumptions.",
        tradeoff: "Only continue when the lighting target and planning factors are intentional.",
        canApply: status === "healthy" || status === "watch"
      }
    ];

    return options.filter((option) => option.canApply !== false);
  }

  function buildSceneIlluminationGuidanceInput(data) {
    const mode = sceneIlluminationSourceMode(data);
    const affectedFields = sceneIlluminationManualSourceFields(data);
    const primary = sceneIlluminationPrimaryRecommendation(data);
    const helper = window.ScopedLabsUserAssistantGuidance;

    const sourceLabel = helper && typeof helper.sourceLabelForMode === "function"
      ? helper.sourceLabelForMode(mode)
      : (mode === "manual-override" ? "Manual override" : "Clean pipeline");

    const sourceMessage = helper && typeof helper.sourceMessageForMode === "function"
      ? helper.sourceMessageForMode(mode)
      : "Use this result only when the assumptions match the intended design branch.";

    return {
      status: sceneIlluminationGuidanceStatus(data),
      mode,
      primaryRecommendation: primary,
      secondaryOptions: sceneIlluminationSecondaryOptions(data),
      sourceIntegrity: {
        label: sourceLabel,
        mode,
        affectedFields,
        message: sourceMessage
      },
      reportSummary: [
        primary.action,
        primary.reason,
        "Expected result: " + primary.expectedResult
      ].filter(Boolean).join(" "),
      carryForward: {
        allowed: true,
        nextTool: "mounting-height",
        message: "Carry this lighting baseline into Mounting Height only when the scene dimensions, lighting goal, target footcandles, utilization factor, and light-loss assumptions match the intended protected area."
      }
    };
  }

  function getSceneIlluminationGuidanceAdapter() {
    if (sceneIlluminationGuidanceAdapter) return sceneIlluminationGuidanceAdapter;

    const factory = window.ScopedLabsUserGuidanceAdapterFactory;

    if (factory && typeof factory.createAdapter === "function") {
      sceneIlluminationGuidanceAdapter = factory.createAdapter({
        toolKey: "scene-illumination",
        globalName: "ScopedLabsSceneIlluminationGuidance",
        version: "scene-illumination-guidance-adapter-001-factory",
        nextTool: "mounting-height",
        carryForwardMessage: "Carry this lighting baseline into Mounting Height only when scene and lighting assumptions match the intended protected area.",
        buildGuidance: buildSceneIlluminationGuidanceInput
      });

      return sceneIlluminationGuidanceAdapter;
    }

    let latestGuidance = null;

    sceneIlluminationGuidanceAdapter = {
      version: "scene-illumination-guidance-adapter-001-fallback",
      update(data) {
        latestGuidance = Object.assign({
          version: "scene-illumination-guidance-adapter-001-fallback"
        }, buildSceneIlluminationGuidanceInput(data));
        return cloneSceneIlluminationGuidance(latestGuidance);
      },
      getLastGuidance() {
        return cloneSceneIlluminationGuidance(latestGuidance);
      },
      explainLastGuidance() {
        if (!latestGuidance) {
          return {
            ok: false,
            summary: "No Scene Illumination guidance has been generated yet.",
            nextStep: "Run a Scene Illumination calculation first."
          };
        }

        return {
          ok: true,
          status: latestGuidance.status,
          mode: latestGuidance.mode,
          action: latestGuidance.primaryRecommendation && latestGuidance.primaryRecommendation.action,
          reason: latestGuidance.primaryRecommendation && latestGuidance.primaryRecommendation.reason,
          expected: latestGuidance.primaryRecommendation && latestGuidance.primaryRecommendation.expectedResult,
          guidance: cloneSceneIlluminationGuidance(latestGuidance)
        };
      },
      attachGlobal() {
        window.ScopedLabsSceneIlluminationGuidance = Object.freeze({
          version: this.version,
          toolKey: "scene-illumination",
          getLastGuidance: this.getLastGuidance,
          explainLastGuidance: this.explainLastGuidance,
          updateFromData: this.update
        });
        return window.ScopedLabsSceneIlluminationGuidance;
      }
    };

    return sceneIlluminationGuidanceAdapter;
  }

  function updateSceneIlluminationUserGuidance(data) {
    const adapter = getSceneIlluminationGuidanceAdapter();
    return adapter.update(data);
  }

  function getLastSceneIlluminationGuidance() {
    const adapter = getSceneIlluminationGuidanceAdapter();
    return adapter.getLastGuidance();
  }

  function explainLastSceneIlluminationGuidance() {
    const adapter = getSceneIlluminationGuidanceAdapter();
    return adapter.explainLastGuidance();
  }

  function attachSceneIlluminationGuidanceGlobal() {
    const adapter = getSceneIlluminationGuidanceAdapter();

    if (adapter && typeof adapter.attachGlobal === "function") {
      return adapter.attachGlobal();
    }

    window.ScopedLabsSceneIlluminationGuidance = Object.freeze({
      version: "scene-illumination-guidance-adapter-001-factory",
      toolKey: "scene-illumination",
      getLastGuidance: getLastSceneIlluminationGuidance,
      explainLastGuidance: explainLastSceneIlluminationGuidance
    });

    return window.ScopedLabsSceneIlluminationGuidance;
  }

  attachSceneIlluminationGuidanceGlobal();


  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.scene, {
      category: CATEGORY,
      step: STEP,
      data: {
        w: data.w,
        d: data.d,
        lightingAreaWidthFt: data.w,
        lightingAreaDepthFt: data.d,
        fc: data.fc,
        lightingGoalId: data.lightingGoalId,
        lightingGoalLabel: data.lightingGoalLabel,
        targetFootcandleRange: data.targetFootcandleRange,
        footcandleSourceMode: data.footcandleSourceMode,
        footcandleOutsideRange: data.footcandleOutsideRange,
        utilizationPresetId: data.utilizationPresetId,
        utilizationPresetLabel: data.utilizationPresetLabel,
        utilizationSourceMode: data.utilizationSourceMode,
        lightLossPresetId: data.lightLossPresetId,
        lightLossPresetLabel: data.lightLossPresetLabel,
        lightLossSourceMode: data.lightLossSourceMode,
        effectiveLightingSourceMode: data.effectiveSourceMode,
        uf: data.uf,
        llf: data.llf,
        ufPct: data.ufPct,
        llfPct: data.llfPct,
        area: data.area,
        effectiveFactor: data.effectiveFactor,
        lumens: data.lumens,
        lumenDensity: data.lumenDensity,
        lightingClass: data.lightingClass,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });

    updateActiveAreaFromScene(data);
  }

  
  // data-scopedlabs-scene-structured-export-001
  function sceneExportRoot() {
    return els.toolCard || document.getElementById("toolCard") || document.querySelector("main .container") || document.body;
  }

  function escapeSceneExportHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sceneFallbackExportTable(title, rows) {
    const cleanRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row[0] && row[1] != null);
    if (!cleanRows.length) return "";

    return "" +
      '<h2 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:20px 0 8px;color:#111827;">' + escapeSceneExportHtml(title) + '</h2>' +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">' + escapeSceneExportHtml(title) + '</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Value</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cleanRows.map((row) =>
            '<tr>' +
              '<td style="width:42%;padding:8px 10px;border-bottom:1px solid #d8dee6;color:#4b5563;vertical-align:top;">' + escapeSceneExportHtml(row[0]) + '</td>' +
              '<td style="padding:8px 10px;border-bottom:1px solid #d8dee6;color:#111827;font-weight:700;text-align:left;vertical-align:top;">' + escapeSceneExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function sceneFallbackNotesTable(rows) {
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
              '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeSceneExportHtml(row[0]) + '</td>' +
              '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapeSceneExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function clearSceneStructuredExport() {
    document.querySelectorAll('[data-scene-structured-export="true"]').forEach((node) => node.remove());
  }


  // data-scopedlabs-scene-export-visual-001
  function sceneIlluminationExportVisualSvg(data) {
    if (!data || !data.ok) return "";

    const gfx = window.ScopedLabsGraphics;
    if (!gfx || typeof gfx.render !== "function" || typeof sceneIlluminationGraphicsModel !== "function") {
      return "";
    }

    const svg = gfx.render("scene-illumination-lighting-plan", sceneIlluminationGraphicsModel(data));
    if (typeof svg !== "string" || !svg.includes("<svg")) return "";

    return "" +
      '<div data-scene-export-visual="true" style="break-inside:avoid;margin:0 0 12px 0;">' +
        svg +
      '</div>';
  }


  function sceneStructuredExportTables(data) {
    if (!data || !data.ok) return "";

    const sourceMode = data.footcandleSourceMode === "manual-override" || data.effectiveSourceMode === "manual-override"
      ? "manual assumption"
      : "guided presets";

    const metrics = [
      ["Area", fmtSqFt(data.area)],
      ["Lighting goal", data.lightingGoalLabel],
      ["Target illumination", fmtFc(data.fc)],
      ["Effective planning factor", fmtFactor(data.effectiveFactor)],
      ["Estimated lumens required", fmtLumens(data.lumens)],
      ["Lighting area width", fmtFt(data.w)],
      ["Lighting area depth", fmtFt(data.d)],
      ["Recommended range", data.targetFootcandleRange ? lightingGoalRangeText(data.targetFootcandleRange) : "Custom target"],
      ["Footcandle source", data.footcandleSourceMode === "manual-override" ? "Manual assumption" : "Preset typical"],
      ["Fixture / layout efficiency", data.utilizationPresetLabel],
      ["Maintenance / environment", data.lightLossPresetLabel],
      ["Utilization factor", fmtPct(data.ufPct)],
      ["Light loss factor", fmtPct(data.llfPct)],
      ["Lighting factor source", data.effectiveSourceMode === "manual-override" ? "Manual assumption" : "Guided presets"],
      ["Lighting condition", data.lightingClass],
      ["Lumen density", fmt(data.lumenDensity, 2) + " lm/sq ft"],
      ["Assistant status", data.status],
      ["Source mode", sourceMode]
    ];

    const handoff = "Carry this lighting baseline into Mounting Height and downstream visibility checks. Exposure stress, blur, and color loss become more likely in real conditions when the lighting condition is weak.";

    const notes = [
      ["Engineering interpretation", data.interpretation],
      ["Dominant constraint", data.dominantConstraint],
      ["Recommended action", data.guidance],
      ["Mounting Height handoff", handoff]
    ];

    const metricHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderMetricTable === "function"
      ? window.ScopedLabsAssistantExport.renderMetricTable("Scene Illumination Design Summary", metrics)
      : sceneFallbackExportTable("Scene Illumination Design Summary", metrics);

    const notesHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderNotesTable === "function"
      ? window.ScopedLabsAssistantExport.renderNotesTable(notes)
      : sceneFallbackNotesTable(notes);

    const visualHtml = sceneIlluminationExportVisualSvg(data);

    return "" +
      '<div class="scene-export-structured-tables" data-scene-structured-export="true" data-export-section data-export-suppress-title="true" style="position:absolute;left:-10000px;top:auto;width:820px;max-height:1px;overflow:hidden;opacity:0;pointer-events:none;">' +
        visualHtml +
        metricHtml +
        notesHtml +
      '</div>';
  }

  function renderSceneStructuredExport(data) {
    clearSceneStructuredExport();

    const html = sceneStructuredExportTables(data);
    if (!html) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    if (!node) return;

    sceneExportRoot().appendChild(node);
  }
  function renderError(message) {
clearSceneIlluminationLiveVisual();
clearSceneStructuredExport();
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function forceSceneContinueVisible() {
    if (els.continueWrap) {
      els.continueWrap.hidden = false;
      els.continueWrap.removeAttribute("hidden");
      els.continueWrap.style.display = "flex";
      els.continueWrap.style.marginTop = "0";
    }

    if (els.continueBtn) {
      els.continueBtn.hidden = false;
      els.continueBtn.removeAttribute("hidden");
      if (els.continueBtn.tagName === "A" && !els.continueBtn.getAttribute("href")) {
        els.continueBtn.setAttribute("href", NEXT_URL);
      }
    }
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Area", value: fmtSqFt(data.area) },
        { label: "Lighting Goal", value: data.lightingGoalLabel },
        { label: "Target Illumination", value: fmtFc(data.fc) },
        { label: "Effective Planning Factor", value: fmtFactor(data.effectiveFactor) },
        { label: "Estimated Lumens Required", value: fmtLumens(data.lumens) }
      ],
      derivedRows: [
        { label: "Lighting Area Width", value: fmtFt(data.w) },
        { label: "Lighting Area Depth", value: fmtFt(data.d) },
        { label: "Recommended Range", value: data.targetFootcandleRange ? lightingGoalRangeText(data.targetFootcandleRange) : "Custom target" },
        { label: "Footcandle Source", value: data.footcandleSourceMode === "manual-override" ? "Manual assumption" : "Preset typical" },
        { label: "Fixture / Layout Efficiency", value: data.utilizationPresetLabel },
        { label: "Maintenance / Environment", value: data.lightLossPresetLabel },
        { label: "Utilization Factor", value: fmtPct(data.ufPct) },
        { label: "Light Loss Factor", value: fmtPct(data.llfPct) },
        { label: "Lighting Factor Source", value: data.effectiveSourceMode === "manual-override" ? "Manual assumption" : "Guided presets" },
        { label: "Lighting Condition", value: data.lightingClass },
        { label: "Lumen Density", value: fmt(data.lumenDensity, 2) + " lm/sq ft" }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Planning Factor Fit", "Target Range Fit", "Output Load Fit"],
        values: [
          Number(data.factorPressureMetric.toFixed(1)),
          Number(data.targetDemandMetric.toFixed(1)),
          Number(data.outputLoadMetric.toFixed(1))
        ],
        displayValues: [
          fmtFactor(data.effectiveFactor),
          data.targetFootcandleRange ? lightingGoalRangeText(data.targetFootcandleRange) : "Custom target",
          fmt(data.lumenDensity, 2) + " lm/sq ft"
        ],
        referenceValue: 20,
        healthyMax: 20,
        watchMax: 45,
        axisTitle: "Lighting Assumption Fit",
        referenceLabel: "Healthy Fit",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
renderSceneIlluminationLiveVisual(data);
renderSceneStructuredExport(data);
    writeFlow(data);
    updateSceneIlluminationUserGuidance(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
    forceSceneContinueVisible();

    if (els.continueWrap) {
      els.continueWrap.hidden = false;
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
    hydrateSceneInputsFromActiveArea();
    renderFlowNote();
    renderLightingGoalGuidance();
    renderFactorGuidance();
    invalidate({ clearFlow: true });
  }

  function bind() {
    if (els.lightingGoal) {
      els.lightingGoal.addEventListener("change", () => {
        const preset = lightingGoalPreset(els.lightingGoal.value);
        if (preset.id !== "custom" && Number.isFinite(preset.typical)) {
          els.fc.value = String(preset.typical);
        }
        renderLightingGoalGuidance();
        invalidate({ clearFlow: true });
      });
    }

    if (els.ufPreset) {
      els.ufPreset.addEventListener("change", () => {
        const preset = utilizationPreset(els.ufPreset.value);
        if (preset.id !== "custom" && Number.isFinite(preset.value)) {
          els.uf.value = String(preset.value);
        }
        renderFactorGuidance();
        invalidate({ clearFlow: true });
      });
    }

    if (els.llfPreset) {
      els.llfPreset.addEventListener("change", () => {
        const preset = lightLossPreset(els.llfPreset.value);
        if (preset.id !== "custom" && Number.isFinite(preset.value)) {
          els.llf.value = String(preset.value);
        }
        renderFactorGuidance();
        invalidate({ clearFlow: true });
      });
    }

    ["w", "d", "fc", "uf", "llf"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("input", () => {
        renderLightingGoalGuidance();
        renderFactorGuidance();
        invalidate({ clearFlow: true });
      });

      el.addEventListener("change", () => {
        renderLightingGoalGuidance();
        renderFactorGuidance();
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
    bind();
    hydrateSceneInputsFromActiveArea();
    renderFlowNote();
    renderLightingGoalGuidance();
    renderFactorGuidance();
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