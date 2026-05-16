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
    if (!els.flowNote) return;
    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      This tool starts the design flow by establishing the scene-lighting baseline that downstream geometry and detail steps will build on.
    `;
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.scene);
      clearDownstream();
    }

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

  function updateActiveAreaFromScene(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      sceneWidthFt: data.w,
      sceneDepthFt: data.d,
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

  

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.scene, {
      category: CATEGORY,
      step: STEP,
      data: {
        w: data.w,
        d: data.d,
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

  function renderError(message) {
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
        { label: "Area Width", value: fmtFt(data.w) },
        { label: "Area Depth", value: fmtFt(data.d) },
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

    writeFlow(data);
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