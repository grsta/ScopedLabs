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
  const STEP = "face-recognition-range";
  const PREVIOUS_STEP = "lens-selection";

  const $ = (id) => document.getElementById(id);

  // data-face-recognition-user-guidance-adapter-001
  let latestFaceRecognitionGuidance = null;

  function cloneFaceRecognitionGuidance(value) {
    if (!value || typeof value !== "object") return value;

    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  const els = {
    res: $("res"),
    resPreset: $("resPreset"),
    hfov: $("hfov"),
    hfovPreset: $("hfovPreset"),
    ppf: $("ppf"),
    ppfPreset: $("ppfPreset"),
    fw: $("fw"),
    dist: $("dist"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    liveVisual: $("faceRecognitionLiveVisual"),
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
    res: 3840,
    hfov: 90,
    ppf: 250,
    fw: 0.6,
    dist: 60
  };

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

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

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

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtPx(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} px` : "—";
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
    if (field === "res") return Math.round(number).toLocaleString() + " px";
    if (field === "ppf") return number.toFixed(1).replace(/\.0$/, "") + " PPF";
    if (field === "fw") return number.toFixed(2).replace(/\.00$/, "") + " ft";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Working distance";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "res") return "Horizontal resolution";
    if (field === "ppf") return "Target pixels per face";
    if (field === "fw") return "Face width";
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

  let faceInitialFlowImportApplied = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getActiveFaceArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    try {
      return api.getActiveArea();
    } catch {
      return null;
    }
  }

  function targetFacePpfForGoal(goal) {
    const value = String(goal || "").toLowerCase();

    if (value.includes("identification")) return 300;
    if (value.includes("recognition")) return 250;
    if (value.includes("observation")) return 180;
    if (value.includes("detection")) return 120;

    return null;
  }

  function faceImportValuesFromArea() {
    const area = getActiveFaceArea();

    return {
      area,
      res: num(area?.lensHorizontalResolutionPx ?? area?.horizontalResolutionPx ?? DEFAULTS.res),
      hfov: num(area?.lensDerivedHfovDeg ?? area?.assumedHfovDeg ?? DEFAULTS.hfov),
      ppf: num(area?.faceRecognitionTargetPpf ?? targetFacePpfForGoal(area?.detailGoal) ?? DEFAULTS.ppf),
      fw: num(area?.faceWidthFt ?? DEFAULTS.fw),
      dist: num(area?.distanceToTargetPlaneFt ?? DEFAULTS.dist)
    };
  }

  function applyAreaPlanInputs() {
    const values = faceImportValuesFromArea();
    if (!values.area) return false;

    if (Number.isFinite(values.res) && values.res > 0) {
      captureImportedFlowValue("res", values.res);
      if (els.res) els.res.value = String(Math.round(values.res));
    }

    if (Number.isFinite(values.hfov) && values.hfov > 0) {
      captureImportedFlowValue("hfov", values.hfov);
      if (els.hfov) els.hfov.value = String(Number(values.hfov.toFixed(1)));
    }

    if (Number.isFinite(values.ppf) && values.ppf > 0) {
      captureImportedFlowValue("ppf", values.ppf);
      if (els.ppf) els.ppf.value = String(Number(values.ppf.toFixed(1)));
    }

    if (Number.isFinite(values.fw) && values.fw > 0) {
      captureImportedFlowValue("fw", values.fw);
      if (els.fw) els.fw.value = String(Number(values.fw.toFixed(2)));
    }

    if (Number.isFinite(values.dist) && values.dist > 0) {
      captureImportedFlowValue("dist", values.dist);
      if (els.dist) els.dist.value = String(Number(values.dist.toFixed(1)));
    }

    return true;
  }

  function activeAreaFaceContextHtml() {
    const values = faceImportValuesFromArea();
    const area = values.area;
    if (!area) return "";

    const parts = [];
    if (area.name) parts.push("Current Area: <strong>" + escapeHtml(area.name) + "</strong>");
    if (area.selectedLensMm) parts.push("Lens: <strong>" + Number(area.selectedLensMm).toFixed(1).replace(/\.0$/, "") + " mm</strong>");
    if (Number.isFinite(values.res)) parts.push("Resolution: <strong>" + Math.round(values.res).toLocaleString() + " px</strong>");
    if (Number.isFinite(values.hfov)) parts.push("HFOV: <strong>" + fmt(values.hfov, 1) + " deg</strong>");
    if (Number.isFinite(values.dist)) parts.push("Working distance: <strong>" + fmtFt(values.dist) + "</strong>");
    if (Number.isFinite(values.ppf)) parts.push("Face target: <strong>" + fmtPx(values.ppf) + "</strong>");

    if (!parts.length) return "";

    return '<strong>Area Context</strong><br>' +
      parts.join(" | ") +
      '<br><span class="muted">Face Recognition validates whether the active area lens/detail path can support facial detail at the intended working distance. Editing imported values here creates a local what-if branch for this area.</span>';
  }

  function renderAreaOnlyFlowContext() {
    hideVisibleFlowContext();
    return false;
  }



  function applyDefaults() {
    els.res.value = String(DEFAULTS.res);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ppf.value = String(DEFAULTS.ppf);
    els.fw.value = String(DEFAULTS.fw);
    els.dist.value = String(DEFAULTS.dist);

    applyAreaPlanInputs();
  }

  function clearDownstream() {
    [
      FLOW_KEYS.plate,
      "scopedlabs:pipeline:last-result"
    ].forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {}
    });
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.lens);

    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const areaContext = "";
    const areaValues = faceImportValuesFromArea();
    const hasLensFlow = parsed && parsed.category === CATEGORY && parsed.step === PREVIOUS_STEP;
    const prev = hasLensFlow ? (parsed.data || {}) : {};

    const focal = num(prev.focal ?? areaValues.area?.selectedLensMm);
    const hfov = num(prev.hfov ?? prev.lensDerivedHfovDeg ?? areaValues.hfov);
    const dist = num(prev.distanceFt ?? prev.actualDist ?? prev.dist ?? areaValues.dist);
    const res = num(prev.horizontalResolutionPx ?? prev.res ?? areaValues.res);
    const ppf = num(prev.requiredPpf ?? prev.ppf ?? areaValues.ppf);
    const fw = num(areaValues.fw);
    const lensClass = prev.lensClass || areaValues.area?.lensClass || "";

    const shouldApplyInitialImport = !faceInitialFlowImportApplied || canApplyFlowInputs();

    if (shouldApplyInitialImport) {
      if (Number.isFinite(res) && res > 0 && els.res) els.res.value = String(Math.round(res));
      if (Number.isFinite(hfov) && hfov > 0 && els.hfov) els.hfov.value = String(Number(hfov.toFixed(1)));
      if (Number.isFinite(ppf) && ppf > 0 && els.ppf) els.ppf.value = String(Number(ppf.toFixed(1)));
      if (Number.isFinite(fw) && fw > 0 && els.fw) els.fw.value = String(Number(fw.toFixed(2)));
      if (Number.isFinite(dist) && dist > 0 && els.dist) els.dist.value = String(Number(dist.toFixed(1)));
      faceInitialFlowImportApplied = true;
    }

    captureImportedFlowValue("res", res);
    captureImportedFlowValue("hfov", hfov);
    captureImportedFlowValue("ppf", ppf);
    captureImportedFlowValue("fw", fw);
    captureImportedFlowValue("dist", dist);

    const parts = [];
    if (lensClass) parts.push("lens <strong>" + escapeHtml(lensClass) + "</strong>");
    if (Number.isFinite(focal) && focal > 0) parts.push("~<strong>" + fmt(focal, 1) + " mm</strong>");
    if (Number.isFinite(res) && res > 0) parts.push("resolution <strong>" + Math.round(res).toLocaleString() + " px</strong>");
    if (Number.isFinite(hfov) && hfov > 0) parts.push("HFOV <strong>" + fmt(hfov, 1) + " deg</strong>");
    if (Number.isFinite(dist) && dist > 0) parts.push("working distance <strong>" + fmtFt(dist) + "</strong>");
    if (Number.isFinite(ppf) && ppf > 0) parts.push("face target <strong>" + fmtPx(ppf) + "</strong>");

    if (!parts.length) {
      hideVisibleFlowContext();
      return;
    }

    visibleFlowContextEl().hidden = false;
    visibleFlowContextEl().innerHTML =
      (areaContext ? areaContext + "<br><br>" : "") +
      (parts.length ? "<strong>Imported Assumptions</strong><br>Lens / area results detected ? " + parts.join(", ") + "." : "") +
      "<br><br>This step checks whether that optic can still deliver the face detail needed at the intended working distance." +
      renderManualOverrideNote();
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstream();

    clearFaceRecognitionLiveVisual();



    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      flowKey: FLOW_KEYS.face,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    renderFlowNote();
  }


  // data-scopedlabs-face-guided-presets-001
  const FACE_GUIDED_PRESETS = {
    res: [1920, 2688, 3072, 3840, 4000],
    hfov: [25, 45, 60, 75, 90],
    ppf: [120, 180, 250, 300]
  };

  function presetSelectForField(field) {
    if (field === "res") return els.resPreset;
    if (field === "hfov") return els.hfovPreset;
    if (field === "ppf") return els.ppfPreset;
    return null;
  }

  function inputForPresetField(field) {
    if (field === "res") return els.res;
    if (field === "hfov") return els.hfov;
    if (field === "ppf") return els.ppf;
    return null;
  }

  function presetTolerance(field) {
    return field === "hfov" ? 0.05 : 0.5;
  }

  function syncFacePresetSelect(field) {
    const select = presetSelectForField(field);
    const input = inputForPresetField(field);
    const presets = FACE_GUIDED_PRESETS[field];

    if (!select || !input || !Array.isArray(presets)) return;

    const current = Number(input.value);
    if (!Number.isFinite(current)) {
      select.value = "custom";
      return;
    }

    const match = presets.find((value) => Math.abs(Number(value) - current) <= presetTolerance(field));
    select.value = match == null ? "custom" : String(match);
  }

  function syncAllFacePresetSelects() {
    ["res", "hfov", "ppf"].forEach(syncFacePresetSelect);
  }

  function applyFaceGuidedPreset(field) {
    const select = presetSelectForField(field);
    const input = inputForPresetField(field);
    if (!select || !input) return;

    const value = String(select.value || "custom");
    if (value === "custom") {
      input.focus();
      return;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) return;

    input.value = field === "hfov" ? String(number) : String(Math.round(number));

    markFlowInputOverride(field);
    syncFacePresetSelect(field);
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bindFaceGuidedPresets() {
    ["res", "hfov", "ppf"].forEach((field) => {
      const select = presetSelectForField(field);
      const input = inputForPresetField(field);

      if (select) {
        select.addEventListener("change", () => {
          clearFaceRecognitionGuidanceEventMemory();
          applyFaceGuidedPreset(field);
        });
      }

      if (input) {
        input.addEventListener("input", () => {
          clearFaceRecognitionGuidanceEventMemory();
          syncFacePresetSelect(field);
        });
        input.addEventListener("change", () => {
          clearFaceRecognitionGuidanceEventMemory();
          syncFacePresetSelect(field);
        });
      }
    });

    syncAllFacePresetSelects();
  }


  function getInputs() {
    const res = num(els.res.value);
    const hfov = num(els.hfov.value);
    const ppf = num(els.ppf.value);
    const fw = num(els.fw.value);
    const dist = num(els.dist.value);

    if (
      !Number.isFinite(res) || res <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ppf) || ppf <= 0 ||
      !Number.isFinite(fw) || fw <= 0 ||
      !Number.isFinite(dist) || dist <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, res, hfov, ppf, fw, dist };
  }

  function classifyRequirement(ppf) {
    if (ppf >= 300) return "Identification";
    if (ppf >= 250) return "Strong Recognition";
    if (ppf >= 180) return "Recognition";
    return "Basic Facial Detail";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const maxDist = (input.res * input.fw) / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.ppf);
    const marginFt = maxDist - input.dist;
    const utilizationPct = maxDist > 0 ? (input.dist / maxDist) * 100 : 100;
    const deliveredPpf = (input.res * input.fw) / (2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist);

    const shortfallMetric = marginFt < 0 ? Math.min(Math.abs(marginFt / maxDist) * 100, 100) : 0;
    const utilizationMetric = ScopedLabsAnalyzer.clamp(utilizationPct, 0, 100);
    const requirementMetric = input.ppf >= 300 ? 30 : input.ppf >= 250 ? 20 : input.ppf >= 180 ? 10 : 5;

    const metrics = [
      {
        label: "Range Utilization",
        value: utilizationMetric,
        displayValue: fmtPct(utilizationPct)
      },
      {
        label: "Distance Shortfall",
        value: shortfallMetric,
        displayValue: marginFt < 0 ? fmtFt(Math.abs(marginFt)) : "0.0 ft"
      },
      {
        label: "Recognition Requirement",
        value: requirementMetric,
        displayValue: fmtPx(input.ppf)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(utilizationMetric, shortfallMetric, requirementMetric),
      metrics,
      healthyMax: 75,
      watchMax: 95
    });

    const classification = classifyRequirement(input.ppf);

    let interpretation = `With ${fmtPx(input.res)} horizontal resolution, ${fmt(input.hfov, 1)}° HFOV, and a face width assumption of ${fmtFt(input.fw, 2)}, the modeled maximum distance to hold ${fmtPx(input.ppf)} is about ${fmtFt(maxDist)}. At the entered working distance of ${fmtFt(input.dist)}, the scene would deliver roughly ${fmtPx(deliveredPpf)} across the face.`;

    if (marginFt < 0) {
      interpretation += ` The target is beyond the modeled recognition envelope, so face detail falls off before the requested distance is reached.`;
    } else if (utilizationPct > 95) {
      interpretation += ` The target distance is right at the edge of the recognition envelope, so mounting error, lighting loss, compression, or motion blur can easily push performance below the requirement.`;
    } else if (utilizationPct > 75) {
      interpretation += ` The optic can support the requirement, but most of the available recognition range is already being consumed. Field conditions will matter.`;
    } else {
      interpretation += ` The optic still has usable range margin, so the design is not yet riding the edge of facial-recognition performance.`;
    }

    let dominantConstraint = "";
    if (marginFt < 0) {
      dominantConstraint = "Distance shortfall is the dominant limiter. The target range exceeds what the current resolution, field of view, and facial-detail requirement can support.";
    } else if (utilizationPct > 95) {
      dominantConstraint = "Range utilization is the dominant limiter. The design is operating at the boundary, where any real-world degradation becomes operationally meaningful.";
    } else if (input.ppf >= 300) {
      dominantConstraint = "Recognition requirement is the dominant limiter. The design is being held to an identification-grade standard, which compresses usable range more aggressively.";
    } else {
      dominantConstraint = "The lens and recognition requirement are reasonably balanced. The design still has measurable working-distance headroom.";
    }

    let guidance = "";
    if (marginFt < 0) {
      guidance = "Tighten the field of view, increase resolution, reduce working distance, or lower the facial-detail target before relying on this lens for recognition at that range.";
    } else if (utilizationPct > 95) {
      guidance = "Treat this as edge-of-range performance. Validate on the real mounting angle and scene lighting before finalizing the design.";
    } else if (utilizationPct > 75) {
      guidance = "The design is workable, but verify lighting, shutter behavior, and subject motion because the recognition margin is not generous.";
    } else {
      guidance = "Recognition range has practical headroom. Continue to License Plate next if the same corridor or approach lane also needs vehicle detail validation.";
    }

    return {
      ok: true,
      ...input,
      maxDist,
      marginFt,
      utilizationPct,
      deliveredPpf,
      classification,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function updateActiveAreaFromFaceRecognition(data, manualOverrideMeta = []) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      faceRecognitionStatus: data.status,
      faceRecognitionClass: data.classification,
      faceRecognitionMaxDistanceFt: data.maxDist,
      faceRecognitionActualDistanceFt: data.dist,
      faceRecognitionRangeMarginFt: data.marginFt,
      faceRecognitionUtilizationPct: data.utilizationPct,
      faceRecognitionDeliveredPpf: data.deliveredPpf,
      faceRecognitionTargetPpf: data.ppf,
      faceRecognitionFaceWidthFt: data.fw,
      faceRecognitionHorizontalResolutionPx: data.res,
      faceRecognitionHfovDeg: data.hfov,
      faceRecognitionSourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
      faceRecognitionManualOverrides: manualOverrideMeta,
      faceRecognitionInterpretation: data.interpretation,
      faceRecognitionDominantConstraint: data.dominantConstraint,
      faceRecognitionGuidance: data.guidance,
      faceRecognitionUpdatedAt: new Date().toISOString()
    });
  }




  // data-scopedlabs-face-live-visual-001
  function faceRecognitionGraphicsModel(data) {
    return {
      tool: STEP,
      status: data.status,
      classification: data.classification,
      maxDistFt: data.maxDist,
      actualDistanceFt: data.dist,
      marginFt: data.marginFt,
      utilizationPct: data.utilizationPct,
      deliveredPpf: data.deliveredPpf,
      targetPpf: data.ppf,
      faceWidthFt: data.fw,
      horizontalResolutionPx: data.res,
      hfovDeg: data.hfov
    };
  }

  function clearFaceRecognitionLiveVisual() {
    if (!els.liveVisual) return;
    els.liveVisual.hidden = true;
    els.liveVisual.innerHTML = "";
  }

  function renderFaceRecognitionLiveVisual(data) {
    if (!els.liveVisual) return;

    const gfx = window.ScopedLabsGraphics;
    if (!gfx || typeof gfx.render !== "function") {
      clearFaceRecognitionLiveVisual();
      return;
    }

    const svg = gfx.render("face-recognition-range-plan", faceRecognitionGraphicsModel(data));
    if (typeof svg !== "string" || !svg.includes("<svg")) {
      clearFaceRecognitionLiveVisual();
      return;
    }

    els.liveVisual.innerHTML = svg;
    els.liveVisual.hidden = false;
  }



  // data-face-recognition-user-guidance-adapter-001
  function faceRecognitionGuidanceStatus(data) {
    if (!data) return "unknown";

    const status = String(data.status || "").toLowerCase();
    const delivered = Number(data.deliveredPpf);
    const target = Number(data.ppf);
    const margin = Number(data.marginFt);
    const utilization = Number(data.utilizationPct);

    if (status.includes("risk") || margin < 0 || (Number.isFinite(delivered) && Number.isFinite(target) && delivered < target)) {
      return "risk";
    }

    if (status.includes("watch") || utilization >= 75) {
      return "watch";
    }

    if (status.includes("healthy")) {
      return "healthy";
    }

    return "unknown";
  }

  function faceRecognitionSourceMode(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    return manualOverrideMeta.length ? "manual-override" : "pipeline";
  }

  function faceRecognitionExpectedResult(data) {
    const delivered = Number(data.deliveredPpf);
    const target = Number(data.ppf);
    const margin = Number(data.marginFt);
    const maxDist = Number(data.maxDist);
    const actualDist = Number(data.dist);

    const parts = [];

    if (Number.isFinite(delivered) && Number.isFinite(target)) {
      parts.push(fmtPx(delivered, 1) + " delivered pixels/face vs " + fmtPx(target, 0) + " target");
    }

    if (Number.isFinite(margin)) {
      parts.push(margin >= 0 ? fmtFt(margin) + " range margin" : fmtFt(Math.abs(margin)) + " shortfall");
    }

    if (Number.isFinite(maxDist) && Number.isFinite(actualDist)) {
      parts.push(fmtFt(actualDist) + " actual distance vs " + fmtFt(maxDist) + " modeled max");
    }

    return parts.filter(Boolean).join(" | ") || "Review delivered facial detail against the target requirement.";
  }

  function faceRecognitionPrimaryRecommendation(data) {
    const status = faceRecognitionGuidanceStatus(data);
    const delivered = Number(data.deliveredPpf);
    const target = Number(data.ppf);
    const margin = Number(data.marginFt);
    const utilization = Number(data.utilizationPct);
    const expectedResult = faceRecognitionExpectedResult(data);

    if (status === "healthy") {
      return {
        action: "Keep Current Face Recognition Baseline",
        reason: "Delivered pixels per face and working distance are inside the current facial-detail target.",
        expectedResult,
        confidence: "No correction required",
        nextStep: "Use this result as the face recognition validation branch for the active area."
      };
    }

    if (Number.isFinite(delivered) && Number.isFinite(target) && delivered < target) {
      return {
        action: "Increase delivered facial detail",
        reason: "Delivered pixels per face are below the selected recognition target.",
        expectedResult,
        confidence: "Detail shortfall",
        nextStep: "Reduce HFOV, increase horizontal resolution, move the camera closer, or lower the recognition target only if the design intent changes."
      };
    }

    if (Number.isFinite(margin) && margin < 0) {
      return {
        action: "Reduce working distance or tighten the optical setup",
        reason: "The actual working distance is beyond the modeled face recognition envelope.",
        expectedResult,
        confidence: "Range shortfall",
        nextStep: "Move the camera closer, reduce HFOV, increase resolution, or review the required pixels-per-face target."
      };
    }

    if (Number.isFinite(utilization) && utilization >= 95) {
      return {
        action: "Treat Face Recognition as At Limit",
        reason: "The target distance is right at the edge of the modeled recognition envelope, so lighting, compression, angle, or motion can push the result below target.",
        expectedResult,
        confidence: "At limit",
        nextStep: "Validate real mounting angle, scene lighting, and shutter/compression assumptions before treating this as final."
      };
    }

    if (status === "watch") {
      return {
        action: "Preserve the baseline, but keep margin visible",
        reason: "The face recognition plan is workable, but recognition margin is not generous.",
        expectedResult,
        confidence: "Watch margin",
        nextStep: "Confirm field distance, lighting, subject motion, and face-width assumptions."
      };
    }

    return {
      action: "Review Face Recognition Assumptions",
      reason: "The current result needs review before being treated as a final face recognition branch.",
      expectedResult,
      confidence: "Review required",
      nextStep: "Confirm face width, target pixels per face, distance, resolution, and HFOV."
    };
  }

  function faceRecognitionSecondaryOptions(data) {
    const delivered = Number(data.deliveredPpf);
    const target = Number(data.ppf);
    const margin = Number(data.marginFt);

    const options = [
      {
        label: "Reduce HFOV",
        intent: "Concentrate more horizontal pixels across the face at the same distance.",
        expectedResult: "Delivered pixels per face should increase if lens selection can support the tighter view.",
        tradeoff: "Narrower view may reduce surrounding scene context.",
        canApply: true
      },
      {
        label: "Increase horizontal resolution",
        intent: "Raise the pixel budget available across the same field of view.",
        expectedResult: "Delivered pixels per face should move closer to or above the target.",
        tradeoff: "May increase camera cost, bandwidth, and storage requirements.",
        canApply: true
      },
      {
        label: "Move camera closer",
        intent: "Reduce target distance so the face occupies more of the image.",
        expectedResult: "Range margin should improve and delivered facial detail should increase.",
        tradeoff: "Mounting location and viewing angle may become more constrained.",
        canApply: true
      },
      {
        label: "Review target pixels per face",
        intent: "Use only when the recognition goal has changed.",
        expectedResult: "A lower target can improve pass/fail margin, but may reduce identification confidence.",
        tradeoff: "Do not lower the target simply to make a weak design pass.",
        canApply: true
      }
    ];

    if (Number.isFinite(delivered) && Number.isFinite(target) && delivered >= target && Number.isFinite(margin) && margin >= 0) {
      return options.slice(0, 2);
    }

    return options;
  }

  function buildFaceRecognitionUserGuidance(data) {
    const helper = window.ScopedLabsUserAssistantGuidance;
    const mode = faceRecognitionSourceMode(data);
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const primary = faceRecognitionPrimaryRecommendation(data);
    const sourceLabel = helper && typeof helper.sourceLabelForMode === "function"
      ? helper.sourceLabelForMode(mode)
      : (mode === "manual-override" ? "Manual override" : "Clean pipeline");
    const sourceMessage = helper && typeof helper.sourceMessageForMode === "function"
      ? helper.sourceMessageForMode(mode)
      : "Use this result only when the assumptions match the intended design path.";

    const input = {
      status: faceRecognitionGuidanceStatus(data),
      mode,
      primaryRecommendation: primary,
      secondaryOptions: faceRecognitionSecondaryOptions(data),
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
        nextTool: "area-planner",
        message: "Use this face recognition validation as an optional specialty result for the active area, then return to Area Planner to review the area or choose another branch."
      }
    };

    if (helper && typeof helper.createGuidance === "function") {
      return helper.createGuidance(input);
    }

    return Object.assign({
      version: "face-recognition-user-guidance-adapter-001-fallback"
    }, input);
  }

  function updateFaceRecognitionUserGuidance(data) {
    try {
      latestFaceRecognitionGuidance = buildFaceRecognitionUserGuidance(data);
      return latestFaceRecognitionGuidance;
    } catch (error) {
      latestFaceRecognitionGuidance = {
        version: "face-recognition-user-guidance-adapter-001-error",
        status: "unknown",
        mode: "unknown",
        error: error && error.message ? error.message : String(error || "Unknown guidance adapter error")
      };

      return latestFaceRecognitionGuidance;
    }
  }

  function getLastFaceRecognitionGuidance() {
    return cloneFaceRecognitionGuidance(latestFaceRecognitionGuidance);
  }

  function explainLastFaceRecognitionGuidance() {
    if (!latestFaceRecognitionGuidance) {
      return {
        ok: false,
        summary: "No Face Recognition guidance has been generated yet.",
        nextStep: "Run a Face Recognition calculation first."
      };
    }

    const helper = window.ScopedLabsUserAssistantGuidance;

    if (helper && typeof helper.explainGuidance === "function") {
      return helper.explainGuidance(latestFaceRecognitionGuidance);
    }

    return cloneFaceRecognitionGuidance(latestFaceRecognitionGuidance);
  }


  
  function getFaceRecognitionBridgeGuidance() {
    const guidanceApi = window.ScopedLabsFaceRecognitionGuidance;

    if (guidanceApi && typeof guidanceApi.getLastGuidance === "function") {
      return guidanceApi.getLastGuidance();
    }

    return null;
  }

  function publishFaceRecognitionGuidanceEvent(source) {
    const bridge = window.ScopedLabsPhysicalSecurityGuidanceEventBridge;
    const guidance = getFaceRecognitionBridgeGuidance();

    if (!bridge || typeof bridge.publishIfChanged !== "function" || !guidance) {
      return false;
    }

    return !!bridge.publishIfChanged({
      category: "physical-security",
      tool: "face-recognition-range",
      guidance,
      source: source || "face-recognition-guidance-update"
    });
  }

  function clearFaceRecognitionGuidanceEventMemory() {
    const bridge = window.ScopedLabsPhysicalSecurityGuidanceEventBridge;

    if (bridge && typeof bridge.clearTool === "function") {
      bridge.clearTool("face-recognition-range");
      return true;
    }

    const memory = window.ScopedLabsPhysicalSecurityGuidanceMemory;

    if (memory && typeof memory.clearToolGuidance === "function") {
      return memory.clearToolGuidance("face-recognition-range");
    }

    return false;
  }

function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.face, {
      category: CATEGORY,
      step: STEP,
      data: {
        dist: data.maxDist,
        actualDist: data.dist,
        hfov: data.hfov,
        res: data.res,
        ppf: data.ppf,
        deliveredPpf: data.deliveredPpf,
        classification: data.classification,
        maxDist: data.maxDist,
        marginFt: data.marginFt,
        utilizationPct: data.utilizationPct,
        faceWidthFt: data.fw,
        interpretation: data.interpretation,
        dominantConstraint: data.dominantConstraint,
        guidance: data.guidance,
        sourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromFaceRecognition(data, manualOverrideMeta);
  }

  
  // data-scopedlabs-face-structured-export-001
  function faceExportRoot() {
    return els.toolCard || document.getElementById("toolCard") || document.querySelector("main .container") || document.body;
  }

  function escapeFaceExportHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function faceFallbackExportTable(title, rows) {
    const cleanRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row[0] && row[1] != null);
    if (!cleanRows.length) return "";

    return "" +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">' + escapeFaceExportHtml(title) + '</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Value</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cleanRows.map((row) =>
            '<tr>' +
              '<td style="width:42%;padding:8px 10px;border-bottom:1px solid #d8dee6;color:#4b5563;vertical-align:top;">' + escapeFaceExportHtml(row[0]) + '</td>' +
              '<td style="padding:8px 10px;border-bottom:1px solid #d8dee6;color:#111827;font-weight:700;text-align:left;vertical-align:top;">' + escapeFaceExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function faceFallbackNotesTable(rows) {
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
              '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeFaceExportHtml(row[0]) + '</td>' +
              '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapeFaceExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function clearFaceStructuredExport() {
    document.querySelectorAll('[data-face-structured-export="true"]').forEach((node) => node.remove());
  }


  // data-scopedlabs-face-export-visual-001
  function faceRecognitionExportVisualSvg(data) {
    if (!data || !data.ok) return "";

    const gfx = window.ScopedLabsGraphics;
    if (!gfx || typeof gfx.render !== "function" || typeof faceRecognitionGraphicsModel !== "function") {
      return "";
    }

    const svg = gfx.render("face-recognition-range-plan", faceRecognitionGraphicsModel(data));
    if (typeof svg !== "string" || !svg.includes("<svg")) return "";

    return "" +
      '<div data-face-export-visual="true" style="break-inside:avoid;margin:0 0 12px 0;">' +
        svg +
      '</div>';
  }


  function faceStructuredExportTables(data) {
    if (!data || !data.ok) return "";

    const metrics = [
      ["Target requirement", data.classification],
      ["Max recognition distance", fmtFt(data.maxDist)],
      ["Actual working distance", fmtFt(data.dist)],
      ["Range margin", data.marginFt >= 0 ? fmtFt(data.marginFt) : "-" + fmtFt(Math.abs(data.marginFt))],
      ["Horizontal resolution", fmtPx(data.res)],
      ["Horizontal FOV", fmt(data.hfov, 1) + "°"],
      ["Target pixels per face", fmtPx(data.ppf)],
      ["Delivered pixels per face", fmtPx(data.deliveredPpf, 1)],
      ["Face width assumption", fmtFt(data.fw, 2)],
      ["Range utilization", fmtPct(data.utilizationPct)],
      ["Assistant status", data.status],
      ["Validation type", "Optional face recognition validation"]
    ];

    const handoff = "Use this result as a specialist validation branch for recognition areas only. Return to Area Planner to review the area summary. If the same site also needs a vehicle-detail zone, create or select a License Plate zone and validate that branch separately.";

    const notes = [
      ["Engineering interpretation", data.interpretation],
      ["Dominant constraint", data.dominantConstraint],
      ["Recommended action", data.guidance],
      ["License Plate handoff", handoff]
    ];

    const metricHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderMetricTable === "function"
      ? window.ScopedLabsAssistantExport.renderMetricTable("Face Recognition Design Summary", metrics)
      : faceFallbackExportTable("Face Recognition Design Summary", metrics);

    const notesHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderNotesTable === "function"
      ? window.ScopedLabsAssistantExport.renderNotesTable(notes)
      : faceFallbackNotesTable(notes);

    const visualHtml = faceRecognitionExportVisualSvg(data);

    return "" +
      '<div class="face-export-structured-tables" data-face-structured-export="true" data-export-section data-export-suppress-title="true" style="position:absolute;left:-10000px;top:auto;width:820px;max-height:1px;overflow:hidden;opacity:0;pointer-events:none;">' +
        visualHtml +

        metricHtml +

        notesHtml +
      '</div>';
  }

  function renderFaceStructuredExport(data) {
    clearFaceStructuredExport();

    const html = faceStructuredExportTables(data);
    if (!html) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    if (!node) return;

    faceExportRoot().appendChild(node);
  }
  function renderError(message) {
    clearFaceStructuredExport();
    clearFaceRecognitionLiveVisual();
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Target Requirement", value: data.classification },
        { label: "Max Recognition Distance", value: fmtFt(data.maxDist) },
        { label: "Actual Working Distance", value: fmtFt(data.dist) },
        { label: "Range Margin", value: data.marginFt >= 0 ? fmtFt(data.marginFt) : `-${fmtFt(Math.abs(data.marginFt))}` }
      ],
      derivedRows: [
        { label: "Horizontal Resolution", value: fmtPx(data.res) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Target Pixels per Face", value: fmtPx(data.ppf) },
        { label: "Delivered Pixels per Face", value: fmtPx(data.deliveredPpf, 1) },
        { label: "Face Width Assumption", value: fmtFt(data.fw, 2) },
        { label: "Range Utilization", value: fmtPct(data.utilizationPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });
renderFaceRecognitionLiveVisual(data);

renderFaceStructuredExport(data);
    writeFlow(data);
    updateFaceRecognitionUserGuidance(data);
        publishFaceRecognitionGuidanceEvent("face-recognition-guidance-update");
ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    faceInitialFlowImportApplied = false;
    resetFlowOverrideState();
    applyDefaults();
    syncAllFacePresetSelects();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["res", "hfov", "ppf", "fw", "dist"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        clearFaceRecognitionGuidanceEventMemory();
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
      el.addEventListener("change", () => {
        clearFaceRecognitionGuidanceEventMemory();
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
    });

    bindFaceGuidedPresets();



    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);
  }

  function init() {
    faceInitialFlowImportApplied = false;
    applyDefaults();
    bind();
    syncAllFacePresetSelects();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.ScopedLabsFaceRecognitionGuidance = Object.freeze({
    version: "face-recognition-user-guidance-adapter-001",
    getLastGuidance: getLastFaceRecognitionGuidance,
    explainLastGuidance: explainLastFaceRecognitionGuidance
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    init();
  });
})();

/* ScopedLabs Face Recognition Range Local Assistant Proof
   Version: face-recognition-range-local-assistant-proof-001
   Purpose: visible local assistant proof for Face Recognition Range only.
   Notes:
   - Uses the shared Physical Security local assistant module.
   - Listens for validated Physical Security guidance events.
   - Clears stale local assistant output on raw input/change.
   - Does not touch Area Planner, Lens Selection, category renderer, export, auth, checkout, KB, or pipeline behavior.
*/
(function faceRecognitionRangeLocalAssistantProof() {
  "use strict";

  const VERSION = "face-recognition-range-local-assistant-proof-001";
  const TOOL_SLUG = "face-recognition-range";
  const TOOL_TEXT = "face recognition";
  const MOUNT_ID = "faceRecognitionRangeLocalAssistantMount";

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
    const raw = asText(record.status || record.severity || record.level || record.state || record.classification).toUpperCase();

    if (raw.includes("RISK")) return "RISK";
    if (raw.includes("WATCH") || raw.includes("WARN")) return "WATCH";
    if (raw.includes("HEALTHY") || raw.includes("SAFE") || raw.includes("OK")) return "HEALTHY";

    return "WATCH";
  }

  function readSummary(record) {
    return asText(record.summary || record.headline || record.message || record.detail || record.description || record.primaryText) || "Face recognition range has been evaluated. Review face target size, distance, pixel density, and specialty-zone assumptions before carrying this result into the area summary.";
  }

  function readAssumptions(record) {
    return compactList(record.assumptions || record.assumptionList || record.inputs || record.inputSummary || record.context);
  }

  function readActions(record) {
    const actions = compactList(record.actions || record.recommendedActions || record.recommendations || record.nextSteps || record.requiredActions);
    const singleAction = asText(record.action || record.requiredAction || record.nextStep);

    if (singleAction && !actions.includes(singleAction)) actions.push(singleAction);
    if (!actions.length) actions.push("Confirm the face recognition zone assumptions before returning to the Area Planner or attaching this specialty zone to the Physical Security summary.");

    return actions;
  }

  function buildModel(recordInput) {
    const record = recordInput || {};
    const adapters = adapterApi();
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(TOOL_SLUG) : null;

    return {
      tool: TOOL_SLUG,
      title: adapter && adapter.title ? adapter.title : "Face Recognition Assistant",
      status: readStatus(record),
      summary: readSummary(record),
      assumptions: readAssumptions(record),
      actions: readActions(record),
      iconKey: adapter && adapter.iconKey ? adapter.iconKey : "person",
      visible: true
    };
  }

  function render(recordInput) {
    const mount = getMount();
    const assistant = localAssistantApi();

    if (!mount || !assistant || typeof assistant.mount !== "function") return false;
    return assistant.mount(mount, buildModel(recordInput));
  }

  function clear() {
    const mount = getMount();
    const assistant = localAssistantApi();

    if (!mount) return false;
    if (assistant && typeof assistant.clear === "function") return assistant.clear(mount);

    mount.innerHTML = "";
    mount.hidden = true;
    return true;
  }

  document.addEventListener("scopedlabs:physical-security-guidance-updated", function (event) {
    const detail = event && event.detail ? event.detail : {};
    if (!eventBelongsToTool(detail)) return;
    render(pickRecord(detail));
  });

  ["input", "change"].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      const target = event && event.target ? event.target : null;
      if (target && target.closest && target.closest("#" + MOUNT_ID)) return;
      clear();
    }, true);
  });

  window.ScopedLabsFaceRecognitionRangeLocalAssistantProof = Object.freeze({
    version: VERSION,
    buildModel: buildModel,
    render: render,
    clear: clear
  });
})();
