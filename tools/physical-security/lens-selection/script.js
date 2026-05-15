(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

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
  const STEP = "lens-selection";
  const PREVIOUS_STEP = "pixel-density";
  const NEXT_URL = "/tools/physical-security/face-recognition-range/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    dist: $("dist"),
    tw: $("tw"),
    selectedLens: $("selectedLens"),
    cameraFormat: $("cameraFormat"),
    sw: $("sw"),
    customSensorField: $("customSensorField"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    diagnostic: $("diagnostic-panel"),
    designAssistant: $("lensDesignAssistant"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    dist: 80,
    tw: 20,
    selectedLens: 8,
    cameraFormat: "6.4",
    sw: 6.4
  };

  function selectedOptionText(selectEl) {
    if (!selectEl) return "";
    const option = selectEl.options[selectEl.selectedIndex];
    return option ? option.textContent.trim() : "";
  }

  function syncCameraFormatControl() {
    if (!els.cameraFormat || !els.sw) return;

    const isCustom = els.cameraFormat.value === "custom";

    if (els.customSensorField) {
      els.customSensorField.style.display = isCustom ? "" : "none";
    }

    if (!isCustom) {
      els.sw.value = els.cameraFormat.value;
    }
  }

  let prev = null;

  function num(value, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(value, fallback);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtFt(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ft` : "—";
  }

  function fmtMm(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} mm` : "—";
  }

  function fmtPpf(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} PPF` : "—";
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
    if (field === "tw") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "sw") return number.toFixed(2).replace(/\.00$/, "") + " mm";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Distance to target plane";
    if (field === "tw") return "Target width";
    if (field === "sw") return "Sensor width";
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

  

  

  

  

  function applyDefaults() {
    if (els.dist) els.dist.value = String(DEFAULTS.dist);
    if (els.tw) els.tw.value = String(DEFAULTS.tw);
    if (els.selectedLens) els.selectedLens.value = String(DEFAULTS.selectedLens);
    if (els.cameraFormat) els.cameraFormat.value = String(DEFAULTS.cameraFormat);
    if (els.sw) els.sw.value = String(DEFAULTS.sw);
    syncCameraFormatControl();
    applyAreaPlanInputs();
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
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const body = document.body;
    const category = String(body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    const lockedCard = document.getElementById("lockedCard");
    const toolCard = document.getElementById("toolCard");

    if (signedIn && unlocked) {
      if (lockedCard) lockedCard.style.display = "none";
      if (toolCard) toolCard.style.display = "";
      return true;
    }

    if (lockedCard) lockedCard.style.display = "";
    if (toolCard) toolCard.style.display = "none";
    return false;
  }

  function clearDownstream() {
    [
      FLOW_KEYS.face,
      FLOW_KEYS.plate,
      "scopedlabs:pipeline:last-result"
    ].forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
    });

    window.ScopedLabsLensPipelineCarryForward = null;
  }

  function classifyLens(focal) {
    if (focal < 3) return "Ultra-Wide (2.8mm)";
    if (focal < 5) return "Wide (4mm)";
    if (focal < 8) return "Mid (6mm)";
    if (focal < 12) return "Telephoto (8–12mm)";
    return "Long Range (12mm+)";
  }

  function classifyRequirement(ppf) {
    if (ppf >= 250) return "High Detail";
    if (ppf >= 150) return "Recognition";
    if (ppf >= 80) return "Observation";
    return "Low Detail";
  }

  function lensInterpretation(focal) {
    if (focal < 4) {
      return "Wide coverage, but reduced detail concentration at distance.";
    }
    if (focal < 8) {
      return "Balanced field of view and usable subject detail.";
    }
    if (focal < 12) {
      return "Narrower view with stronger subject concentration and better target detail.";
    }
    return "Highly focused view intended for long-range identification or constrained corridors.";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getActiveLensArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    try {
      return api.getActiveArea();
    } catch {
      return null;
    }
  }

  function targetWidthFromActiveArea(area) {
    if (!area) return NaN;

    const direct = num(area.pixelDensityTargetWidthFt);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const protectedLength = num(area.protectedLengthFt);
    const cameras = num(area.cameraCount || area.targetCameraCount);
    if (Number.isFinite(protectedLength) && protectedLength > 0 && Number.isFinite(cameras) && cameras > 0) {
      return protectedLength / cameras;
    }

    return protectedLength;
  }

  function applyAreaPlanInputs() {
    const area = getActiveLensArea();
    if (!area) return false;

    const dist = num(area.distanceToTargetPlaneFt);
    const tw = targetWidthFromActiveArea(area);

    if (Number.isFinite(dist) && dist > 0) {
      captureImportedFlowValue("dist", dist);
      if (els.dist && canApplyFlowInputs()) els.dist.value = String(Number(dist.toFixed(1)));
    }

    if (Number.isFinite(tw) && tw > 0) {
      captureImportedFlowValue("tw", tw);
      if (els.tw && canApplyFlowInputs()) els.tw.value = String(Number(tw.toFixed(1)));
    }

    return true;
  }

  function activeAreaLensContextHtml() {
    const area = getActiveLensArea();
    if (!area) return "";

    const tw = targetWidthFromActiveArea(area);
    const parts = [];
    if (area.name) parts.push("Current Area: <strong>" + escapeHtml(area.name) + "</strong>");
    if (Number.isFinite(num(area.distanceToTargetPlaneFt))) parts.push("Distance: <strong>" + fmtFt(num(area.distanceToTargetPlaneFt)) + "</strong>");
    if (Number.isFinite(num(area.assumedHfovDeg))) parts.push("Spacing HFOV assumption: <strong>" + fmt(num(area.assumedHfovDeg), 1) + " deg</strong>");
    if (Number.isFinite(tw)) parts.push("Target width: <strong>" + fmtFt(tw) + "</strong>");
    if (area.detailGoal) parts.push("Detail goal: <strong>" + escapeHtml(area.detailGoal) + "</strong>");

    if (!parts.length) return "";

    return '<strong>Area Context</strong><br>' +
      parts.join(" | ") +
      '<br><span class="muted">Lens Selection validates a real lens against this active area. If selected lens HFOV differs from the spacing HFOV assumption, this area may need spacing revalidation.</span>';
  }

  function lensFramedWidthFt(distanceFt, sensorWidthMm, focalMm) {
    const distance = cleanNumber(distanceFt);
    const sensor = cleanNumber(sensorWidthMm);
    const focal = cleanNumber(focalMm);

    if (!distance || !sensor || !focal) return null;
    return (distance * sensor) / focal;
  }

  function lensRevalidationSummary(area, lensHfovDeg) {
    const assumed = cleanNumber(area?.assumedHfovDeg);
    const actual = cleanNumber(lensHfovDeg);

    if (!assumed || !actual) {
      return {
        required: false,
        deltaDeg: null,
        note: "No prior spacing HFOV assumption was available for comparison."
      };
    }

    const delta = actual - assumed;
    const required = Math.abs(delta) > 5;

    return {
      required,
      deltaDeg: delta,
      note: required
        ? "Selected lens HFOV differs from the spacing assumption by more than 5 degrees. Return to Camera Spacing if this lens is accepted for the area."
        : "Selected lens HFOV is close enough to the earlier spacing assumption for planning continuity."
    };
  }

  function updateActiveAreaFromLens(data, sourceLabel = "live-lens-selection", assistantPayload = null) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    const area = getActiveLensArea();
    const selectedLensMm = cleanNumber(data.selectedLensMm, cleanNumber(data.adjustedFocalMm, cleanNumber(data.adjustedFocal, cleanNumber(data.selectedLens))));
    const calculatedLensMm = cleanNumber(data.calculatedLensMm, cleanNumber(data.calculatedTargetFocalMm, cleanNumber(data.calculatedTargetFocal, cleanNumber(data.baseFocal))));
    const distanceFt = cleanNumber(data.distanceFt, cleanNumber(data.dist));
    const targetWidthFt = cleanNumber(data.targetWidthFt, cleanNumber(data.requiredSceneWidthFt, cleanNumber(data.tw)));
    const sensorWidthMm = cleanNumber(data.sensorWidthMm, cleanNumber(data.sw));
    const framedWidthFt = cleanNumber(data.framedWidthFt, lensFramedWidthFt(distanceFt, sensorWidthMm, selectedLensMm));
    const derivedHfov = cleanNumber(data.hfov, hfovFromLens(sensorWidthMm, selectedLensMm) || hfovFromWidth(distanceFt, framedWidthFt));
    const cameraCount = cleanNumber(data.cameraCount, cleanNumber(area?.cameraCount, cleanNumber(area?.targetCameraCount)));
    const revalidation = lensRevalidationSummary(area, derivedHfov);
    const manualOverrideMeta = getManualOverrideMetadata({ dist: distanceFt, tw: targetWidthFt });
    const sourceMode = data.sourceMode || (data.assistantSelected ? "assistant-scenario" : manualOverrideMeta.length ? "manual-override" : "pipeline");

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      distanceToTargetPlaneFt: distanceFt,
      selectedLensMm,
      calculatedLensMm,
      adjustedFocalMm: selectedLensMm,
      lensClass: data.lensClass || (selectedLensMm ? classifyLens(selectedLensMm) : null),
      lensStatus: data.status,
      lensSourceMode: sourceMode,
      lensSelectedScenario: data.selectedScenario || data.scenarioMode || null,
      lensAssistantSelected: !!data.assistantSelected,
      lensManualOverrides: manualOverrideMeta,
      lensTargetWidthFt: targetWidthFt,
      lensFramedWidthFt: framedWidthFt,
      lensDerivedHfovDeg: derivedHfov,
      lensSensorWidthMm: sensorWidthMm,
      lensCameraFormatLabel: data.cameraFormatLabel || null,
      lensPixelDensityPpf: cleanNumber(data.pixelDensityPpf, cleanNumber(data.availablePpf, cleanNumber(data.ppf))),
      lensRequiredPpf: cleanNumber(data.requiredPpf, cleanNumber(data.tppf)),
      lensCameraCount: cameraCount,
      cameraCount: cameraCount || area?.cameraCount || null,
      lensFitRatio: cleanNumber(data.fitRatio),
      lensGapPct: cleanNumber(data.lensGapPct, cleanNumber(data.adjustmentPct)),
      spacingRevalidationRequired: revalidation.required,
      spacingRevalidationDeltaDeg: revalidation.deltaDeg,
      spacingRevalidationNote: revalidation.note,
      lensInterpretation: data.interpretation || null,
      lensDominantConstraint: data.dominantConstraint || null,
      lensGuidance: data.guidance || null,
      lensWritebackSource: sourceLabel,
      lensAssistantPayload: assistantPayload,
      lensUpdatedAt: new Date().toISOString()
    });
  }



  let lensInitialFlowImportApplied = false;

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.pixel);
    prev = null;

    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const areaContext = activeAreaLensContextHtml();
    const hasPixelFlow = parsed && parsed.category === CATEGORY && parsed.step === PREVIOUS_STEP;

    if (hasPixelFlow) {
      prev = parsed.data || {};
    }

    const area = getActiveLensArea();
    const dist = num(hasPixelFlow ? prev.dist : area?.distanceToTargetPlaneFt);
    const tw = num(hasPixelFlow ? (prev.tw ?? prev.targetWidthFt) : targetWidthFromActiveArea(area));
    const ppf = num(hasPixelFlow ? prev.ppf : area?.pixelDensityPpf);
    const level = hasPixelFlow ? (prev.level || prev.classification || "") : (area?.pixelDensityLevel || "");

    const shouldApplyInitialImport = !lensInitialFlowImportApplied;

    if (shouldApplyInitialImport || canApplyFlowInputs()) {
      if (Number.isFinite(dist) && dist > 0 && els.dist) els.dist.value = String(Number(dist.toFixed(1)));
      if (Number.isFinite(tw) && tw > 0 && els.tw) els.tw.value = String(Number(tw.toFixed(1)));
      lensInitialFlowImportApplied = true;
    }

    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("tw", tw);

    const parts = [];
    if (level) {
      parts.push("Pixel Density: <strong>" + escapeHtml(level) + "</strong>");
    } else if (Number.isFinite(ppf) && ppf > 0) {
      parts.push("Pixel Density: <strong>" + fmtPpf(ppf) + "</strong>");
    }
    if (Number.isFinite(dist) && dist > 0) parts.push("Distance: <strong>" + fmtFt(dist) + "</strong>");
    if (Number.isFinite(tw) && tw > 0) parts.push("Target width: <strong>" + fmtFt(tw) + "</strong>");

    if (!parts.length && !areaContext) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML =
      (areaContext ? areaContext + "<br><br>" : "") +
      (parts.length ? "<strong>Flow Context</strong><br>" + parts.join(" | ") : "") +
      renderManualOverrideNote() +
      "<br><br>" +
      "This step converts the active area's validated detail requirement into a practical focal-length recommendation.";
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstream();

    clearDiagnosticPanel();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: null,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.lens,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Evaluate Lens."
    });

    prev = null;
    renderFlowNote();
  }

  function getInputs() {
    syncCameraFormatControl();

    const dist = num(els.dist?.value);
    const tw = num(els.tw?.value);
    const selectedLens = num(els.selectedLens?.value);
    const cameraFormat = els.cameraFormat ? String(els.cameraFormat.value || "") : "";
    const sw = cameraFormat === "custom" ? num(els.sw?.value) : num(cameraFormat);
    const cameraFormatLabel = cameraFormat === "custom"
      ? "Custom sensor width"
      : selectedOptionText(els.cameraFormat);

    if (
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(tw) || tw <= 0 ||
      !Number.isFinite(selectedLens) || selectedLens <= 0 ||
      !Number.isFinite(sw) || sw <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Evaluate Lens." };
    }

    return {
      ok: true,
      dist,
      tw,
      sw,
      selectedLens,
      cameraFormat,
      cameraFormatLabel
    };
  }

  function adjustForPPF(focal) {
    if (!prev) return focal;

    const ppf = num(prev.ppf, 0);

    if (ppf < 40) return focal * 1.4;
    if (ppf < 80) return focal * 1.2;
    if (ppf > 120) return focal * 0.9;

    return focal;
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const baseFocal = (input.sw * input.dist) / input.tw;
    const calculatedTargetFocal = adjustForPPF(baseFocal);
    const selectedLens = input.selectedLens;
    const adjustedFocal = selectedLens;
    const lensClass = classifyLens(selectedLens);
    const interp = lensInterpretation(selectedLens);

    const ppf = prev ? num(prev.ppf, 0) : 0;
    const requirementClass = classifyRequirement(ppf);

    const lensGapPct = calculatedTargetFocal > 0
      ? ((selectedLens - calculatedTargetFocal) / calculatedTargetFocal) * 100
      : 0;

    const fitRatio = calculatedTargetFocal > 0
      ? selectedLens / calculatedTargetFocal
      : 1;

    const widthPerMm = selectedLens > 0 ? input.tw / selectedLens : 0;

    const detailPressureMetric =
      ppf > 0
        ? ppf < 40 ? 85
        : ppf < 80 ? 60
        : ppf > 120 ? 20
        : 35
        : 45;

    let focalPressureMetric = 25;
    if (fitRatio < 0.8) {
      focalPressureMetric = 85;
    } else if (fitRatio < 0.95) {
      focalPressureMetric = 60;
    } else if (fitRatio <= 1.25) {
      focalPressureMetric = 20;
    } else if (fitRatio <= 1.75) {
      focalPressureMetric = 45;
    } else {
      focalPressureMetric = 70;
    }

    const adjustmentMetric = Math.min(Math.abs(lensGapPct) * 1.2, 100);
    const adjustmentPct = lensGapPct;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(detailPressureMetric, focalPressureMetric, adjustmentMetric),
      metrics: [
        {
          label: "Detail Context",
          value: detailPressureMetric,
          displayValue: ppf > 0 ? fmtPpf(ppf) : "No prior PPF"
        },
        {
          label: "Lens Fit",
          value: focalPressureMetric,
          displayValue: fmtMm(selectedLens)
        },
        {
          label: "Selection Gap",
          value: adjustmentMetric,
          displayValue: fmt(adjustmentPct, 1) + "%"
        }
      ],
      healthyMax: 25,
      watchMax: 60
    });

    let dominantConstraint = "";
    if (fitRatio < 0.8) {
      dominantConstraint = "The selected lens appears too wide for the calculated target. The camera may frame more scene than the selected detail objective can support.";
    } else if (fitRatio > 1.75) {
      dominantConstraint = "The selected lens is much tighter than the calculated target. It may preserve detail but can reduce scene coverage and layout flexibility.";
    } else if (ppf <= 0) {
      dominantConstraint = "No upstream pixel-density result was provided, so this should be treated as a planning check rather than a confirmed detail result.";
    } else if (ppf < 80) {
      dominantConstraint = "Detail pressure is the dominant limiter. The selected lens may need tighter framing or the scene may need to be split across more cameras.";
    } else {
      dominantConstraint = "The selected lens and calculated target are reasonably aligned for the current planning inputs.";
    }

    let guidance = "Verify the selected lens against the manufacturer?s actual FOV chart before locking the bill of materials.";
    if (fitRatio < 0.8) {
      guidance = "The selected lens is likely too wide for this target. Evaluate a tighter lens, shorter distance, smaller scene width, or split coverage.";
    } else if (fitRatio > 1.75) {
      guidance = "The selected lens is much tighter than the calculated target. Confirm the narrower view still covers the intended scene.";
    } else if (ppf <= 0) {
      guidance = "No prior PPF was provided. Continue through the detail validation steps before treating this lens as final.";
    } else if (ppf < 80) {
      guidance = "Pixel density is weak for the selected detail objective. Re-check target width, distance, selected lens, and whether the scene should be split.";
    }

    const interpretation = `At ${fmtFt(input.dist)} with a target width of ${fmtFt(input.tw)}, ${input.cameraFormatLabel || "the selected camera format"} uses about ${fmtMm(input.sw, 2)} sensor width. The calculated target lens is about ${fmtMm(calculatedTargetFocal)}. The selected / available lens is ${fmtMm(selectedLens)}, which falls into the ${lensClass} class. ${interp}`;

    return {
      ok: true,
      ...input,
      baseFocal,
      calculatedTargetFocal,
      adjustedFocal,
      selectedLens,
      cameraFormat: input.cameraFormat,
      cameraFormatLabel: input.cameraFormatLabel,
      lensClass,
      ppf,
      requirementClass,
      adjustmentPct,
      lensGapPct,
      fitRatio,
      widthPerMm,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      detailPressureMetric,
      focalPressureMetric,
      adjustmentMetric
    };
  }

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.lens, {
      category: CATEGORY,
      step: STEP,
      data: {
        focal: data.adjustedFocal,
        selectedLensMm: data.adjustedFocal,
        baseFocal: data.baseFocal,
        calculatedLensMm: data.calculatedTargetFocal,
        calculatedTargetFocalMm: data.calculatedTargetFocal,
        lensClass: data.lensClass,
        dist: data.dist,
        distanceFt: data.dist,
        tw: data.tw,
        targetWidthFt: data.tw,
        sw: data.sw,
        sensorWidthMm: data.sw,
        cameraFormatLabel: data.cameraFormatLabel,
        ppf: data.ppf,
        pixelDensityPpf: data.ppf,
        requirementClass: data.requirementClass,
        adjustmentPct: data.adjustmentPct,
        lensGapPct: data.lensGapPct,
        fitRatio: data.fitRatio,
        widthPerMm: data.widthPerMm,
        status: data.status,
        interpretation: data.interpretation,
        dominantConstraint: data.dominantConstraint,
        guidance: data.guidance,
        sourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromLens(data, "live-lens-selection");
  }


  function clearDiagnosticPanel() {
    if (window.ScopedLabsDiagnostic && els.diagnostic) {
      window.ScopedLabsDiagnostic.clear(els.diagnostic);
    } else if (els.diagnostic) {
      els.diagnostic.hidden = true;
      els.diagnostic.innerHTML = "";
    }

    window.ScopedLabsDiagnosticData = null;
    window.ScopedLabsExportData = null;
    window.ScopedLabsReportV2Data = null;

    const reportV2Btn = document.getElementById("openReportV2");
    if (reportV2Btn) reportV2Btn.disabled = true;
    clearDesignAssistant();
  }

  function getDiagnosticDriver(data) {
    const metrics = [
      {
        key: "detailPressure",
        label: "Detail Pressure",
        value: data.detailPressureMetric,
        summary: "The upstream pixel-density requirement is influencing how aggressively the lens recommendation is adjusted."
      },
      {
        key: "focalDemand",
        label: "Focal Demand",
        value: data.focalPressureMetric,
        summary: "Scene geometry is driving focal length demand based on distance, target width, and sensor width."
      },
      {
        key: "adjustmentShift",
        label: "Selection Gap",
        value: data.adjustmentMetric,
        summary: "The lens recommendation had to move away from the calculated target lens to stay aligned with the prior detail requirement."
      }
    ];

    return metrics.sort((a, b) => b.value - a.value)[0];
  }

  function buildDiagnosticData(data) {
    const driver = getDiagnosticDriver(data);
    const pressureScore = Math.max(
      data.detailPressureMetric,
      data.focalPressureMetric,
      data.adjustmentMetric
    );

    const status = data.status;
    const isHealthy = status === "HEALTHY";
    const isRisk = status === "RISK";

    const likelyDrivers = [];

    if (data.adjustedFocal >= 12) {
      likelyDrivers.push("Long-range focal demand is being driven by the distance-to-target and target-width relationship.");
      likelyDrivers.push("The design is asking one camera/lens combination to hold a relatively tight field of view.");
    }

    if (data.ppf > 0 && data.ppf < 40) {
      likelyDrivers.push("The upstream pixel-density requirement is weak, so the lens recommendation tightens to recover subject detail.");
    }

    if (Math.abs(data.adjustmentPct) > 15) {
      likelyDrivers.push("The upstream detail requirement is creating a meaningful shift away from the raw geometry solution.");
    }

    if (likelyDrivers.length === 0) {
      likelyDrivers.push("Scene geometry, sensor width, and the upstream detail requirement are staying within a practical planning range.");
    }

    const possiblePlanningActions = isHealthy
      ? [
          "Keep the current geometry and detail assumptions documented with the project.",
          "Verify the final lens option against the manufacturer field-of-view chart.",
          "Re-run this check if distance, target width, sensor width, or detail requirement changes."
        ]
      : [
          "Evaluate whether the camera can be moved closer to the target area.",
          "Evaluate whether the acceptable target or scene width can be increased without losing the operational objective.",
          "Consider a larger sensor format or a different lens class if the selected camera family allows it.",
          "Split the view across more than one camera if one narrow view is being asked to do too much.",
          "Recheck whether the upstream pixel-density/detail target matches the actual use case."
        ];

    const inputAssumptions = [
      {
        label: "Distance to target",
        value: fmtFt(data.dist),
        note: "Measured or estimated distance from camera position to the target plane."
      },
      {
        label: "Target width",
        value: fmtFt(data.tw),
        note: "Horizontal scene or subject width expected to be covered by the lens selection."
      },
      {
        label: "Camera format",
        value: data.cameraFormatLabel ? data.cameraFormatLabel + " (" + fmtMm(data.sw, 2) + ")" : fmtMm(data.sw, 2),
        note: "Camera format preset used to supply the sensor-width value behind the lens-fit check."
      },
      {
        label: "Pixel-density input",
        value: data.ppf > 0 ? fmtPpf(data.ppf) : "No prior PPF",
        note: "Optional upstream detail target used to adjust the calculated target lens."
      },
      {
        label: "Adjustment shift",
        value: fmt(data.adjustmentPct, 1) + "%",
        note: "How much the detail requirement shifted the lens recommendation from raw geometry."
      }
    ];

    const keyDrivers = [
      {
        label: "Focal demand pressure",
        value: fmt(data.focalPressureMetric, 0) + "/100",
        note: "Pressure created by the adjusted focal length and practical lens-class range."
      },
      {
        label: "Detail requirement pressure",
        value: fmt(data.detailPressureMetric, 0) + "/100",
        note: "Pressure created by the upstream pixel-density or detail target."
      },
      {
        label: "Adjustment pressure",
        value: fmt(data.adjustmentMetric, 0) + "/100",
        note: "Pressure created by how far the adjusted focal length moved away from the calculated target lens."
      }
    ];

    const whyThisStatus = isHealthy
      ? "The current lens recommendation stays within the preferred planning band for this scene geometry and detail context."
      : "The current combination of distance, target width, sensor width, and upstream detail requirement is increasing lens pressure and reducing layout flexibility.";

    const statusHeadline = isHealthy
      ? "Lens selection is inside the preferred planning band."
      : isRisk
        ? "Lens selection is under high planning pressure."
        : "Lens selection is workable but should be reviewed.";

    const healthyTarget = "Bring lens-selection pressure back into the preferred planning band while preserving the required scene detail objective.";

    const followUpChecks = [
      "Validate the selected focal length against the manufacturer actual field-of-view chart.",
      "Confirm mounting location, camera angle, and alignment tolerance before final selection.",
      "Continue to Face Recognition Range if identification detail is required.",
      "Re-run this tool if the distance, target width, sensor size, or upstream pixel-density target changes."
    ];

    const revisionTriggers = [
      "Camera mounting location changes.",
      "Target width or scene objective changes.",
      "Sensor size or lens family changes.",
      "Upstream pixel-density requirement changes."
    ];

    const planningLimitations = [
      "This is a planning estimate, not a manufacturer-certified lens selection.",
      "Actual field of view depends on the selected camera model, lens family, mounting angle, and installation tolerance.",
      "Lighting, motion, compression, image quality, and camera placement can affect usable identification detail.",
      "Final selection should be checked against manufacturer data and project requirements."
    ];

    const whatThisSupports = [
      "Comparing whether the current scene geometry is reasonable for one camera view.",
      "Identifying when lens demand is being pushed by distance, scene width, sensor size, or detail target.",
      "Carrying structured focal-length assumptions into downstream physical-security planning steps."
    ];

    const whatThisDoesNotProve = [
      "It does not certify that a specific camera and lens combination will meet code, contract, or compliance requirements.",
      "It does not validate lighting, image quality, compression, motion blur, or final identification performance.",
      "It does not replace manufacturer field-of-view charts or project-specific engineering review."
    ];

    return {
      schema: "scopedlabs.diagnostic.v2",
      schemaVersion: 2,
      rendererProfile: "diagnostic-gauge-v1",
      category: CATEGORY,
      toolSlug: STEP,
      toolLabel: "Lens Selection Helper",
      status,
      objective: "Evaluate whether the selected lens fits the scene geometry and upstream detail requirements.",
      method: "Uses distance to target, required scene width, selected lens, camera format, and pixel-density context to evaluate lens fit and planning pressure.",
      resultSummary: statusHeadline,
      gauge: {
        label: "Lens Selection Pressure",
        score: pressureScore,
        value: pressureScore,
        max: 100,
        displayValue: fmtMm(data.adjustedFocal),
        markerLabel: "Adjusted focal length",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        targetBand: {
          label: "Preferred planning band",
          min: 0,
          max: 35
        }
      },
      keyResults: [
        {
          label: "Selected / Available Lens",
          value: fmtMm(data.adjustedFocal),
          rawValue: Number(data.adjustedFocal.toFixed(2)),
          unit: "mm",
          role: "primary"
        },
        {
          label: "Lens Class",
          value: data.lensClass,
          role: "classification"
        },
        {
          label: "Detail Requirement",
          value: data.ppf > 0 ? data.requirementClass : "No prior PPF",
          rawValue: data.ppf > 0 ? Number(data.ppf.toFixed(2)) : null,
          unit: data.ppf > 0 ? "PPF" : "",
          role: "context"
        }
      ],
      statusSummary: {
        headline: statusHeadline,
        detail: whyThisStatus,
        healthyTarget
      },
      dominantDriver: {
        key: driver.key,
        label: driver.label,
        summary: driver.summary
      },
      whyThisStatus,
      likelyDrivers,
      keyDrivers,
      possiblePlanningActions,
      healthyTarget,
      followUpChecks,
      revisionTriggers,
      inputAssumptions,
      assumptions: inputAssumptions,
      planningLimitations,
      whatThisSupports,
      whatThisDoesNotProve,
      flowOutputs: {
        adjustedFocalMm: Number(data.adjustedFocal.toFixed(2)),
        baseFocalMm: Number(data.baseFocal.toFixed(2)),
        lensClass: data.lensClass,
        distanceFt: Number(data.dist.toFixed(2)),
        targetWidthFt: Number(data.tw.toFixed(2)),
        sensorWidthMm: Number(data.sw.toFixed(2)),
        pixelDensityPpf: Number(data.ppf.toFixed(2)),
        adjustmentPct: Number(data.adjustmentPct.toFixed(2)),
        pressureScore: Number(pressureScore.toFixed(2)),
        status
      },
      reportSections: [
        {
          label: "Planning Objective",
          body: "Evaluate whether the selected lens fits the scene geometry and upstream detail requirements."
        },
        {
          label: "Method / Basis of Estimate",
          body: "Distance to target, target width, sensor width, and optional pixel-density context are used to estimate focal demand and classify planning pressure."
        },
        {
          label: "Status / Risk Summary",
          body: whyThisStatus
        },
        {
          label: "Input Assumptions",
          items: inputAssumptions.map((item) => item.label + ": " + item.value + " - " + item.note)
        },
        {
          label: "Assumption Sensitivity / Key Drivers",
          items: keyDrivers.map((item) => item.label + ": " + item.value + " - " + item.note)
        },
        {
          label: "Possible Planning Actions to Evaluate",
          items: possiblePlanningActions
        },
        {
          label: "Follow-up Checks",
          items: followUpChecks
        },
        {
          label: "Revision Triggers",
          items: revisionTriggers
        },
        {
          label: "Planning Limitations",
          items: planningLimitations
        }
      ]
    };
  }

  const REPORT_V2_STORAGE_KEY = "scopedlabs:prototype:lens-design-lab:selected-scenario";

  function buildReportV2Payload(data, diagnostic) {
    const pressureScore = diagnostic?.gauge?.score ?? Math.max(
      data.detailPressureMetric,
      data.focalPressureMetric,
      data.adjustmentMetric
    );

    return {
      schema: "scopedlabs.prototype.lens-design-scenario.v2",
      sourceTool: "live-lens-selection",
      savedAt: new Date().toISOString(),
      category: CATEGORY,
      step: STEP,
      tool: "Lens Selection Helper",
      selectedScenario: "Live Lens Selection",
      selectedLensMm: Number(data.adjustedFocal.toFixed(2)),
      calculatedLensMm: Number((data.calculatedTargetFocal || data.baseFocal).toFixed(2)),
      status: data.status,
      coverageStatus: data.status,
      detailStatus: data.ppf > 0 && data.ppf < 80 ? "RISK" : data.ppf > 0 ? "HEALTHY" : "WATCH",
      pressure: Number(pressureScore.toFixed(0)),
      assumptions: {
        distanceFt: Number(data.dist.toFixed(2)),
        requiredSceneWidthFt: Number(data.tw.toFixed(2)),
        sceneWidthFt: Number(data.tw.toFixed(2)),
        selectedLensMm: Number(data.adjustedFocal.toFixed(2)),
        cameraFormatLabel: data.cameraFormatLabel || null,
        sensorWidthMm: Number(data.sw.toFixed(2)),
        horizontalPixels: null,
        requiredPpf: data.ppf > 0 ? Number(data.ppf.toFixed(2)) : null,
        availablePpf: data.ppf > 0 ? Number(data.ppf.toFixed(2)) : null,
        coverageCount: 1,
        framedWidthFt: Number(data.tw.toFixed(2))
      },
      designTargets: {
        suggestedCameras: 1,
        recommendedOverlapPercent: 0,
        overlapWidthFt: 0,
        centerSpacingFt: 0,
        cameraPositionsFt: [0],
        maxWidthPerCameraFt: Number(data.tw.toFixed(2)),
        requiredLensForTargetMm: Number((data.calculatedTargetFocal || data.baseFocal).toFixed(2)),
        pixelsNeededOneCamera: null,
        mainBlocker: diagnostic?.dominantDriver?.label || data.dominantConstraint || "Review required"
      },
      diagnostics: diagnostic,
      interpretation: data.interpretation,
      guidance: data.guidance,
      flowOutputs: diagnostic?.flowOutputs || null
    };
  }

  function saveReportV2Payload(data, diagnostic) {
    const payload = buildReportV2Payload(data, diagnostic);
    localStorage.setItem(REPORT_V2_STORAGE_KEY, JSON.stringify(payload, null, 2));
    sessionStorage.setItem(REPORT_V2_STORAGE_KEY, JSON.stringify(payload, null, 2));
    return payload;
  }

  function prepareDiagnosticData(data) {
    const diagnostic = buildDiagnosticData(data);

    window.ScopedLabsDiagnosticData = diagnostic;
    window.ScopedLabsExportData = diagnostic;
    window.ScopedLabsReportV2Data = saveReportV2Payload(data, diagnostic);

    if (els.diagnostic) {
      els.diagnostic.hidden = true;
      els.diagnostic.innerHTML = "";
    }

    return diagnostic;
  }

  function renderDiagnosticPanel(data) {
    const diagnostic = buildDiagnosticData(data);

    window.ScopedLabsDiagnosticData = diagnostic;
    window.ScopedLabsExportData = diagnostic;
    window.ScopedLabsReportV2Data = saveReportV2Payload(data, diagnostic);

    if (!window.ScopedLabsDiagnostic || !els.diagnostic) return;

    window.ScopedLabsDiagnostic.render({
      target: els.diagnostic,
      title: "Lens Selection Diagnostic",
      status: diagnostic.status,
      summary: diagnostic.whyThisStatus,
      gauge: diagnostic.gauge,
      keyMetrics: diagnostic.keyResults,
      dominantDriver: diagnostic.dominantDriver,
      sections: [
        {
          label: "Why this status?",
          body: diagnostic.whyThisStatus
        },
        {
          label: "Likely drivers",
          items: diagnostic.likelyDrivers
        },
        {
          label: "Path to healthy",
          items: diagnostic.possiblePlanningActions
        },
        {
          label: "Follow-up checks",
          items: diagnostic.followUpChecks
        },
        {
          label: "Assumptions used",
          items: [
            "Distance to target: " + fmtFt(data.dist),
            "Target width: " + fmtFt(data.tw),
            "Camera format: " + fmtMm(data.sw, 2),
            "Pixel-density input: " + (data.ppf > 0 ? fmtPpf(data.ppf) : "No prior PPF"),
            "Adjustment shift: " + fmt(data.adjustmentPct, 1) + "%"
          ]
        }
      ]
    });
  }

  function ensureDesignAssistantEl() {
    let section = els.designAssistant || document.getElementById("lensDesignAssistant");

    if (!section) {
      section = document.createElement("section");
      section.id = "lensDesignAssistant";
      section.className = "lens-design-assistant";
      section.hidden = true;
    }

    const resultsCard = els.results?.closest(".card");
    if (resultsCard && resultsCard.parentNode) {
      resultsCard.parentNode.insertBefore(section, resultsCard.nextSibling);
    } else {
      const continueRow = els.continueWrap || document.getElementById("next-step-row");
      if (continueRow && continueRow.parentNode) {
        continueRow.parentNode.insertBefore(section, continueRow);
      }
    }

    els.designAssistant = section;
    return section;
  }

  function clearDesignAssistant() {
    const assistant = ensureDesignAssistantEl();
    if (!assistant) return;
    assistant.hidden = true;
    assistant.innerHTML = "";
  }

  function hasLensPipelineBaseline() {
    try {
      if (prev && typeof prev === "object") return true;

      const raw = sessionStorage.getItem(FLOW_KEYS.pixel);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.data);
    } catch {
      return false;
    }
  }

  function clearAssistantScenarioModeCallout(assistant) {
    if (!assistant) return;

    const existing = assistant.querySelector(".assistant-scenario-note");
    if (existing) existing.remove();
  }

  function setAssistantScenarioSourceMetadata() {
    window.ScopedLabsLensAssistantScenarioTouched = true;

    const hasBaseline = hasLensPipelineBaseline();
    const scenarioMode = hasBaseline ? "custom-design" : "standalone-validation";
    const scenarioContext = hasBaseline ? "pipeline-baseline" : "single-validation";

    ["ScopedLabsLensDesignAssistantReportData", "ScopedLabsReportV2Data"].forEach((key) => {
      const payload = window[key];
      if (!payload || typeof payload !== "object") return;

      payload.sourceMode = "assistant-scenario";
      payload.scenarioMode = payload.selectedScenario || scenarioMode;
      payload.scenarioContext = scenarioContext;
      payload.assistantScenarioTouched = true;

      if (payload.flowOutputs && typeof payload.flowOutputs === "object") {
        payload.flowOutputs.sourceMode = "assistant-scenario";
        payload.flowOutputs.scenarioMode = payload.scenarioMode;
        payload.flowOutputs.scenarioContext = scenarioContext;
        payload.flowOutputs.assistantScenarioTouched = true;
      }
    });
  }

  function renderAssistantScenarioModeCallout(assistant) {
    if (!assistant) return;

    clearAssistantScenarioModeCallout(assistant);

    const hasBaseline = hasLensPipelineBaseline();

    const copy = hasBaseline
      ? '<strong>Custom Design Mode Active:</strong> You are editing outside the carried pipeline baseline. The selected Design Assistant scenario will be treated as an assisted what-if branch for Report V2 and downstream handoff.'
      : '<strong>Standalone Design Mode Active:</strong> This assisted scenario was created without upstream pipeline values. Results are valid as a single validation scenario, not a full guided pipeline run.';

    assistant.insertAdjacentHTML(
      "afterbegin",
      '<div class="assistant-scenario-note" role="note" aria-label="Design scenario mode">' + copy + '</div>'
    );
  }

  function bindAssistantScenarioModeActivation(assistant) {
    if (!assistant) return;

    if (window.ScopedLabsLensAssistantScenarioTouched) {
      renderAssistantScenarioModeCallout(assistant);
    } else {
      clearAssistantScenarioModeCallout(assistant);
    }

    if (assistant.dataset.scenarioModeBound === "true") return;
    assistant.dataset.scenarioModeBound = "true";

    const activate = () => {
      setAssistantScenarioSourceMetadata();
      renderAssistantScenarioModeCallout(assistant);
    };

    assistant.addEventListener("input", activate);
    assistant.addEventListener("change", activate);
    assistant.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || !target.closest) return;

      if (target.closest("button, [role='button'], [data-scenario], [data-action]")) {
        activate();
      }
    });
  }

  function renderLensDesignAssistant(data) {
    const assistant = ensureDesignAssistantEl();
    if (!assistant || !data) return;

    if (window.ScopedLabsLensDesignAssistant && typeof window.ScopedLabsLensDesignAssistant.render === "function") {
      window.ScopedLabsLensDesignAssistant.render(assistant, data);
      bindAssistantScenarioModeActivation(assistant);
      return;
    }

    assistant.hidden = false;
    assistant.innerHTML = '<div class="muted">Lens Design Assistant module did not load.</div>';
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    clearDesignAssistant();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Calculated Target Lens", value: fmtMm(data.baseFocal) },
        { label: "Selected / Available Lens", value: fmtMm(data.adjustedFocal) },
        { label: "Selected Lens Class", value: data.lensClass },
        { label: "Upstream Detail Requirement", value: data.ppf > 0 ? data.requirementClass : "No prior PPF" }
      ],
      derivedRows: [
        { label: "Distance to Target", value: fmtFt(data.dist) },
        { label: "Target Width", value: fmtFt(data.tw) },
        { label: "Camera Format", value: data.cameraFormatLabel ? data.cameraFormatLabel + " (" + fmtMm(data.sw, 2) + ")" : fmtMm(data.sw, 2) },
        { label: "Pixel Density Input", value: data.ppf > 0 ? fmtPpf(data.ppf) : "N/A" },
        { label: "Selection Gap", value: `${fmt(data.adjustmentPct, 1)}%` },
        { label: "Width per mm of Focal Length", value: data.widthPerMm > 0 ? `${fmt(data.widthPerMm, 2)} ft/mm` : "N/A" }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.hidden = true;
    }

    prepareDiagnosticData(data);
    renderLensDesignAssistant(data);

    els.selectedLens?.addEventListener("change", () => invalidate());
    els.cameraFormat?.addEventListener("change", () => {
      syncCameraFormatControl();
      invalidate();
    });
    els.sw?.addEventListener("input", () => invalidate());

    const openReportV2 = document.getElementById("openReportV2");
    if (openReportV2) openReportV2.disabled = false;

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    window.ScopedLabsLensAssistantScenarioTouched = false;
    resetFlowOverrideState();
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function safeJsonParse(value, fallback = null) {
    if (!value) return fallback;

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function cleanNumber(value, fallback = null) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function hfovFromLens(sensorWidthMm, focalMm) {
    const sensor = cleanNumber(sensorWidthMm);
    const focal = cleanNumber(focalMm);

    if (!sensor || !focal || focal <= 0) return null;

    return (2 * Math.atan(sensor / (2 * focal))) * (180 / Math.PI);
  }

  function hfovFromWidth(distanceFt, framedWidthFt) {
    const distance = cleanNumber(distanceFt);
    const width = cleanNumber(framedWidthFt);

    if (!distance || !width || distance <= 0) return null;

    return (2 * Math.atan(width / (2 * distance))) * (180 / Math.PI);
  }

  function saveAssistantScenarioForPipeline() {
    const assistantPayload = window.ScopedLabsLensDesignAssistantReportData || null;

    if (!assistantPayload || !assistantPayload.flowOutputs) {
      return false;
    }

    const existing = safeJsonParse(sessionStorage.getItem(FLOW_KEYS.lens), {}) || {};
    const flow = assistantPayload.flowOutputs || {};
    const assumptions = assistantPayload.assumptions || {};
    const targets = assistantPayload.designTargets || {};
    const diagnostics = assistantPayload.diagnostics || {};

    const selectedLensMm = cleanNumber(flow.selectedLensMm, cleanNumber(assumptions.selectedLensMm));
    const calculatedLensMm = cleanNumber(flow.calculatedLensMm, cleanNumber(assistantPayload.calculatedLensMm));
    const distanceFt = cleanNumber(flow.distanceFt, cleanNumber(assumptions.distanceFt));
    const targetWidthFt = cleanNumber(flow.requiredSceneWidthFt, cleanNumber(assumptions.requiredSceneWidthFt || assumptions.sceneWidthFt));
    const framedWidthFt = cleanNumber(flow.framedWidthFt, cleanNumber(assumptions.framedWidthFt));
    const sensorWidthMm = cleanNumber(assumptions.sensorWidthMm);
    const availablePpf = cleanNumber(flow.availablePpf, cleanNumber(assumptions.availablePpf));
    const requiredPpf = cleanNumber(flow.requiredPpf, cleanNumber(assumptions.requiredPpf));
    const cameraCount = cleanNumber(flow.cameraCount, cleanNumber(assumptions.coverageCount, cleanNumber(targets.suggestedCameras, 1)));
    const pressureScore = cleanNumber(assistantPayload.pressure, cleanNumber(diagnostics?.gauge?.score, 0));
    const status = flow.status || assistantPayload.status || "WATCH";
    const selectedScenario = flow.selectedScenario || assistantPayload.selectedScenario || "Custom Design";
    const normalManualOverrideMeta = getManualOverrideMetadata({ dist: distanceFt });
    const assistantScenarioTouched = window.ScopedLabsLensAssistantScenarioTouched === true || assistantPayload.assistantScenarioTouched === true;
    const lensSourceMode = assistantScenarioTouched && normalManualOverrideMeta.length
      ? "mixed"
      : assistantScenarioTouched
        ? "assistant-scenario"
        : normalManualOverrideMeta.length
          ? "manual-override"
          : "pipeline";

    const hfov = hfovFromLens(sensorWidthMm, selectedLensMm) || hfovFromWidth(distanceFt, framedWidthFt);
    const lensClass = selectedLensMm ? classifyLens(selectedLensMm) : null;

    const carryData = {
      focal: selectedLensMm,
      hfov,
      dist: distanceFt,
      lensClass,

      assistantSelected: assistantScenarioTouched,
      sourceMode: lensSourceMode,
      scenarioMode: assistantScenarioTouched ? selectedScenario : null,
      manualOverrides: normalManualOverrideMeta,
      selectedScenario,
      selectedLensMm,
      calculatedLensMm,
      adjustedFocalMm: selectedLensMm,
      baseFocalMm: calculatedLensMm,
      calculatedTargetFocalMm: calculatedLensMm,

      distanceFt,
      targetWidthFt,
      requiredSceneWidthFt: targetWidthFt,
      framedWidthFt,
      sensorWidthMm,
      cameraFormatLabel: assumptions.cameraFormatLabel || null,

      pixelDensityPpf: availablePpf,
      availablePpf,
      requiredPpf,

      cameraCount,
      coverageStatus: assistantPayload.coverageStatus || diagnostics.coverageStatus || null,
      detailStatus: assistantPayload.detailStatus || diagnostics.detailStatus || null,
      pressureScore,
      status
    };

    const carryPayload = {
      ...existing,
      schema: "scopedlabs.pipeline.physical-security.lens-selection.v2",
      category: CATEGORY,
      lane: LANE,
      step: STEP,
      source: "lens-design-assistant-selected-scenario",
      sourceMode: lensSourceMode,
      scenarioMode: assistantScenarioTouched ? selectedScenario : null,
      manualOverrides: normalManualOverrideMeta,
      assistantScenarioTouched,
      savedAt: new Date().toISOString(),
      selectedScenario,
      status,
      summary: selectedScenario + ": " + (selectedLensMm || "selected") + " mm lens, " + (cameraCount || 1) + " camera" + (Number(cameraCount) === 1 ? "" : "s") + ", " + status + ".",
      data: carryData,
      flowOutputs: carryData,
      assistantReportPayload: assistantPayload
    };

    sessionStorage.setItem(FLOW_KEYS.lens, JSON.stringify(carryPayload));
    sessionStorage.setItem("scopedlabs:pipeline:last-result", JSON.stringify(carryPayload));

    clearDownstream();

    window.ScopedLabsLensPipelineCarryForward = carryPayload;

    updateActiveAreaFromLens(carryData, "lens-design-assistant", carryPayload);

    return true;
  }

  function bind() {
    ["dist", "tw", "sw"].forEach((id) => {
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
    const openReportV2 = document.getElementById("openReportV2");
    if (openReportV2) {
      openReportV2.addEventListener("click", () => {
        const reportPayload = window.ScopedLabsLensDesignAssistantReportData || window.ScopedLabsReportV2Data;
        if (!reportPayload) return;

        window.ScopedLabsReportV2Data = reportPayload;
        localStorage.setItem(REPORT_V2_STORAGE_KEY, JSON.stringify(reportPayload, null, 2));
        sessionStorage.setItem(REPORT_V2_STORAGE_KEY, JSON.stringify(reportPayload, null, 2));
        window.open("/prototypes/lens-report-v2/?source=live-lens-assistant&rev=assistant-notes-017", "_blank", "noopener");
      });
    }

    els.continueBtn?.addEventListener("click", () => {
      saveAssistantScenarioForPipeline();
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    lensInitialFlowImportApplied = false;
    applyDefaults();
    bind();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    let unlocked = unlockCategoryPage();
    if (unlocked) init();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        init();
      }
    }, 400);
  });
})();