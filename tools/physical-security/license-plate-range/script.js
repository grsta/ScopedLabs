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
  const STEP = "license-plate-range";
  const PREVIOUS_STEP = "face-recognition-range";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  // data-license-plate-user-guidance-adapter-001
  let latestLicensePlateGuidance = null;

  function cloneLicensePlateGuidance(value) {
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
    ppp: $("ppp"),
    pppPreset: $("pppPreset"),
    pw: $("pw"),
    pwPreset: $("pwPreset"),
    dist: $("dist"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    liveVisual: $("licensePlateLiveVisual"),
    flowNote: $("flow-note"),
    planningFlowContext: $("planning-flow-context"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    completeWrap: $("complete-wrap"),
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
    hfov: 50,
    ppp: 130,
    pw: 1.0,
    dist: 60
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

  function fmtPx(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} px` : "—";
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
    if (field === "hfov") return number.toFixed(1).replace(/\.0$/, "") + " deg";
    if (field === "res") return Math.round(number).toLocaleString() + " px";
    if (field === "ppp") return number.toFixed(1).replace(/\.0$/, "") + " px/plate";
    if (field === "pw") return number.toFixed(2).replace(/\.00$/, "") + " ft";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "dist") return "Working distance";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "res") return "Horizontal resolution";
    if (field === "ppp") return "Target pixels per plate";
    if (field === "pw") return "Plate width";
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
    if (!visibleFlowContextEl()) return;

    const existing = els.flowNote.querySelector(".flow-override-note");
    if (existing) existing.remove();

    const note = renderManualOverrideNote();
    if (note) els.flowNote.insertAdjacentHTML("beforeend", note);
  }

  let plateInitialFlowImportApplied = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getActivePlateArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    try {
      return api.getActiveArea();
    } catch {
      return null;
    }
  }

  function targetPlatePppForGoal(goal) {
    const value = String(goal || "").toLowerCase();

    if (value.includes("license")) return 130;
    if (value.includes("identification")) return 130;
    if (value.includes("recognition")) return 100;

    return null;
  }

  function plateImportValuesFromArea() {
    const area = getActivePlateArea();

    return {
      area,
      res: num(area?.lensHorizontalResolutionPx ?? area?.horizontalResolutionPx ?? DEFAULTS.res),
      hfov: num(area?.lensDerivedHfovDeg ?? area?.assumedHfovDeg ?? DEFAULTS.hfov),
      ppp: num(area?.licensePlateTargetPpp ?? targetPlatePppForGoal(area?.detailGoal) ?? DEFAULTS.ppp),
      pw: num(area?.licensePlateWidthFt ?? DEFAULTS.pw),
      dist: num(area?.distanceToTargetPlaneFt ?? area?.faceRecognitionActualDistanceFt ?? DEFAULTS.dist)
    };
  }

  function applyAreaPlanInputs() {
    const values = plateImportValuesFromArea();
    if (!values.area) return false;

    if (Number.isFinite(values.res) && values.res > 0) {
      captureImportedFlowValue("res", values.res);
      if (els.res) els.res.value = String(Math.round(values.res));
    }

    if (Number.isFinite(values.hfov) && values.hfov > 0) {
      captureImportedFlowValue("hfov", values.hfov);
      if (els.hfov) els.hfov.value = String(Number(values.hfov.toFixed(1)));
    }

    if (Number.isFinite(values.ppp) && values.ppp > 0) {
      captureImportedFlowValue("ppp", values.ppp);
      if (els.ppp) els.ppp.value = String(Number(values.ppp.toFixed(1)));
    }

    if (Number.isFinite(values.pw) && values.pw > 0) {
      captureImportedFlowValue("pw", values.pw);
      if (els.pw) els.pw.value = String(Number(values.pw.toFixed(2)));
    }

    if (Number.isFinite(values.dist) && values.dist > 0) {
      captureImportedFlowValue("dist", values.dist);
      if (els.dist) els.dist.value = String(Number(values.dist.toFixed(1)));
    }

    return true;
  }

  function activeAreaPlateContextHtml() {
    const values = plateImportValuesFromArea();
    const area = values.area;
    if (!area) return "";

    const parts = [];
    if (area.name) parts.push("Current Area: <strong>" + escapeHtml(area.name) + "</strong>");
    if (area.selectedLensMm) parts.push("Lens: <strong>" + Number(area.selectedLensMm).toFixed(1).replace(/\.0$/, "") + " mm</strong>");
    if (Number.isFinite(values.res)) parts.push("Resolution: <strong>" + Math.round(values.res).toLocaleString() + " px</strong>");
    if (Number.isFinite(values.hfov)) parts.push("HFOV: <strong>" + fmt(values.hfov, 1) + " deg</strong>");
    if (Number.isFinite(values.dist)) parts.push("Working distance: <strong>" + fmtFt(values.dist) + "</strong>");
    if (Number.isFinite(values.ppp)) parts.push("Plate target: <strong>" + fmtPx(values.ppp) + "</strong>");

    if (!parts.length) return "";

    return '<strong>Area Context</strong><br>' +
      parts.join(" | ") +
      '<br><span class="muted">License Plate validates whether the active area lens/detail path can support readable plate capture at the intended working distance. Editing imported values here creates a local what-if branch for this area.</span>';
  }

  function renderAreaOnlyFlowContext() {
    hideVisibleFlowContext();
    return false;
  }



  function applyDefaults() {
    els.res.value = String(DEFAULTS.res);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ppp.value = String(DEFAULTS.ppp);
    els.pw.value = String(DEFAULTS.pw);
    els.dist.value = String(DEFAULTS.dist);

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

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function showComplete() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.completeWrap) els.completeWrap.style.display = "block";
  }

  function hideComplete() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.completeWrap) els.completeWrap.style.display = "none";
  }

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.face);

    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }

    const areaContext = "";
    const areaValues = plateImportValuesFromArea();
    const hasFaceFlow = parsed && parsed.category === CATEGORY && parsed.step === PREVIOUS_STEP;
    const prev = hasFaceFlow ? (parsed.data || {}) : {};

    const classification = prev.classification || areaValues.area?.faceRecognitionClass || "";
    const hfov = num(prev.hfov ?? areaValues.hfov);
    const dist = num(areaValues.dist ?? prev.actualDist ?? prev.dist);
    const res = num(prev.res ?? areaValues.res);
    const ppp = num(areaValues.ppp);
    const pw = num(areaValues.pw);
    const deliveredFacePpf = num(prev.deliveredPpf ?? areaValues.area?.faceRecognitionDeliveredPpf);

    const shouldApplyInitialImport = !plateInitialFlowImportApplied || canApplyFlowInputs();

    if (shouldApplyInitialImport) {
      if (Number.isFinite(res) && res > 0 && els.res) els.res.value = String(Math.round(res));
      if (Number.isFinite(hfov) && hfov > 0 && els.hfov) els.hfov.value = String(Number(hfov.toFixed(1)));
      if (Number.isFinite(ppp) && ppp > 0 && els.ppp) els.ppp.value = String(Number(ppp.toFixed(1)));
      if (Number.isFinite(pw) && pw > 0 && els.pw) els.pw.value = String(Number(pw.toFixed(2)));
      if (Number.isFinite(dist) && dist > 0 && els.dist) els.dist.value = String(Number(dist.toFixed(1)));
      plateInitialFlowImportApplied = true;
    }

    captureImportedFlowValue("res", res);
    captureImportedFlowValue("hfov", hfov);
    captureImportedFlowValue("ppp", ppp);
    captureImportedFlowValue("pw", pw);
    captureImportedFlowValue("dist", dist);

    const parts = [];
    if (classification) parts.push("face result <strong>" + escapeHtml(classification) + "</strong>");
    if (Number.isFinite(deliveredFacePpf)) parts.push("face detail <strong>" + fmtPx(deliveredFacePpf, 1) + "</strong>");
    if (Number.isFinite(res) && res > 0) parts.push("resolution <strong>" + Math.round(res).toLocaleString() + " px</strong>");
    if (Number.isFinite(hfov) && hfov > 0) parts.push("HFOV <strong>" + fmt(hfov, 1) + " deg</strong>");
    if (Number.isFinite(dist) && dist > 0) parts.push("working distance <strong>" + fmtFt(dist) + "</strong>");
    if (Number.isFinite(ppp) && ppp > 0) parts.push("plate target <strong>" + fmtPx(ppp) + "</strong>");

    if (!parts.length) {
      hideVisibleFlowContext();
      return;
    }

    visibleFlowContextEl().hidden = false;
    visibleFlowContextEl().innerHTML =
      (areaContext ? areaContext + "<br><br>" : "") +
      (parts.length ? "<strong>Imported Assumptions</strong><br>Face / area results detected \u2192 " + parts.join(", ") + "." : "") +
      "<br><br>This final step checks whether the same active-area optic can support readable license plate capture." +
      renderManualOverrideNote();
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) {
      [
        FLOW_KEYS.plate,
        "scopedlabs:pipeline:last-result"
      ].forEach((key) => {
        try {
          sessionStorage.removeItem(key);
        } catch {}
      });
    }

    clearLicensePlateLiveVisual();



    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.plate,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hideComplete();
    renderFlowNote();
  }


  // data-scopedlabs-license-plate-guided-presets-001
  const PLATE_GUIDED_PRESETS = {
    res: [1920, 2688, 3072, 3840, 4000],
    hfov: [12, 20, 30, 45, 60],
    ppp: [80, 100, 130, 160, 200],
    pw: [1.00, 1.08, 0.92]
  };

  function presetSelectForPlateField(field) {
    if (field === "res") return els.resPreset;
    if (field === "hfov") return els.hfovPreset;
    if (field === "ppp") return els.pppPreset;
    if (field === "pw") return els.pwPreset;
    return null;
  }

  function inputForPlatePresetField(field) {
    if (field === "res") return els.res;
    if (field === "hfov") return els.hfov;
    if (field === "ppp") return els.ppp;
    if (field === "pw") return els.pw;
    return null;
  }

  function platePresetTolerance(field) {
    if (field === "pw") return 0.005;
    if (field === "hfov") return 0.05;
    return 0.5;
  }

  function syncPlatePresetSelect(field) {
    const select = presetSelectForPlateField(field);
    const input = inputForPlatePresetField(field);
    const presets = PLATE_GUIDED_PRESETS[field];

    if (!select || !input || !Array.isArray(presets)) return;

    const current = Number(input.value);
    if (!Number.isFinite(current)) {
      select.value = "custom";
      return;
    }

    const match = presets.find((value) => Math.abs(Number(value) - current) <= platePresetTolerance(field));
    select.value = match == null ? "custom" : String(match);
  }

  function syncAllPlatePresetSelects() {
    ["res", "hfov", "ppp", "pw"].forEach(syncPlatePresetSelect);
  }

  function applyPlateGuidedPreset(field) {
    const select = presetSelectForPlateField(field);
    const input = inputForPlatePresetField(field);
    if (!select || !input) return;

    const value = String(select.value || "custom");
    if (value === "custom") {
      input.focus();
      return;
    }

    const number = Number(value);
    if (!Number.isFinite(number)) return;

    if (field === "res") input.value = String(Math.round(number));
    else if (field === "pw") input.value = number.toFixed(2);
    else input.value = String(number);

    markFlowInputOverride(field);
    syncPlatePresetSelect(field);
    renderFlowNote();
    invalidate({ clearFlow: true });
    refreshManualOverrideBanner();
  }

  function bindPlateGuidedPresets() {
    ["res", "hfov", "ppp", "pw"].forEach((field) => {
      const select = presetSelectForPlateField(field);
      const input = inputForPlatePresetField(field);

      if (select) {
        select.addEventListener("change", () => {
          clearLicensePlateGuidanceEventMemory();
          applyPlateGuidedPreset(field);
        });
      }

      if (input) {
        input.addEventListener("input", () => {
          clearLicensePlateGuidanceEventMemory();
          syncPlatePresetSelect(field);
        });
        input.addEventListener("change", () => {
          clearLicensePlateGuidanceEventMemory();
          syncPlatePresetSelect(field);
        });
      }
    });

    syncAllPlatePresetSelects();
  }


  function getInputs() {
    const res = num(els.res.value);
    const hfov = num(els.hfov.value);
    const ppp = num(els.ppp.value);
    const pw = num(els.pw.value);
    const dist = num(els.dist.value);

    if (
      !Number.isFinite(res) || res <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ppp) || ppp <= 0 ||
      !Number.isFinite(pw) || pw <= 0 ||
      !Number.isFinite(dist) || dist <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, res, hfov, ppp, pw, dist };
  }

  function classifyPlateTarget(ppp) {
    if (ppp >= 160) return "High Certainty";
    if (ppp >= 130) return "Readable";
    if (ppp >= 100) return "Marginal";
    return "Weak Capture";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const maxDist =
      (input.res * input.pw) /
      (2 * Math.tan(deg2rad(input.hfov / 2)) * input.ppp);

    const marginFt = maxDist - input.dist;
    const utilizationPct = maxDist > 0 ? (input.dist / maxDist) * 100 : 100;
    const deliveredPpp =
      (input.res * input.pw) /
      (2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist);

    const classification = classifyPlateTarget(input.ppp);

    const shortfallMetric =
      marginFt < 0 && maxDist > 0
        ? ScopedLabsAnalyzer.clamp((Math.abs(marginFt) / maxDist) * 100, 0, 100)
        : 0;

    const utilizationMetric = ScopedLabsAnalyzer.clamp(utilizationPct, 0, 100);

    const requirementMetric =
      input.ppp >= 160 ? 30 :
      input.ppp >= 130 ? 20 :
      input.ppp >= 100 ? 12 : 5;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(utilizationMetric, shortfallMetric, requirementMetric),
      metrics: [
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
          label: "Plate Readability Demand",
          value: requirementMetric,
          displayValue: fmtPx(input.ppp)
        }
      ],
      healthyMax: 75,
      watchMax: 95
    });

    let interpretation = `With ${fmtPx(input.res)} horizontal resolution, ${fmt(input.hfov, 1)}° HFOV, and a plate width assumption of ${fmtFt(input.pw, 2)}, the modeled maximum readable plate distance for ${fmtPx(input.ppp)} is about ${fmtFt(maxDist)}. At the entered working distance of ${fmtFt(input.dist)}, the scene would deliver roughly ${fmtPx(deliveredPpp, 1)} across the plate.`;

    if (marginFt < 0) {
      interpretation += ` The requested working distance is beyond the modeled plate-capture envelope, so reliable readability falls off before the target position is reached.`;
    } else if (utilizationPct > 95) {
      interpretation += ` The design is operating right at the edge of readable plate capture. Mounting angle, shutter speed, glare, and vehicle speed will strongly affect real results.`;
    } else if (utilizationPct > 75) {
      interpretation += ` The optics can support the requirement, but most of the available plate-capture range is already being consumed. Field conditions matter.`;
    } else {
      interpretation += ` The design retains usable range margin, so the plate-capture requirement is not yet running at the edge of the optical envelope.`;
    }

    let dominantConstraint = "";
    if (marginFt < 0) {
      dominantConstraint = "Distance shortfall is the dominant limiter. The target range exceeds what the current optical setup can support for readable plate capture.";
    } else if (utilizationPct > 95) {
      dominantConstraint = "Range utilization is the dominant limiter. The design is operating at the boundary where real-world degradation becomes operationally significant.";
    } else if (input.ppp >= 160) {
      dominantConstraint = "Plate readability demand is the dominant limiter. The design is being held to a stricter capture standard, which compresses usable distance more aggressively.";
    } else {
      dominantConstraint = "The optical setup and plate requirement are reasonably balanced. The layout still has measurable distance headroom.";
    }

    let guidance = "";
    if (marginFt < 0) {
      guidance = "Tighten the field of view, increase resolution, reduce working distance, or lower the pixels-per-plate requirement before relying on this setup for plate capture.";
    } else if (utilizationPct > 95) {
      guidance = "Treat this as edge-of-range performance. Validate shutter speed, glare control, IR behavior, and capture angle before finalizing the design.";
    } else if (utilizationPct > 75) {
      guidance = "The design is workable, but verify real vehicle speed, plate angle, and scene lighting because plate-capture margin is not generous.";
    } else {
      guidance = "Plate-capture range has practical headroom. Return to the category and continue building the rest of the design around the same optical assumptions.";
    }

    return {
      ok: true,
      ...input,
      maxDist,
      marginFt,
      utilizationPct,
      deliveredPpp,
      classification,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      utilizationMetric,
      shortfallMetric,
      requirementMetric
    };
  }


  // data-scopedlabs-license-plate-live-visual-001
  function licensePlateGraphicsModel(data) {
    return {
      tool: STEP,
      status: data.status,
      classification: data.classification,
      maxDistFt: data.maxDist,
      actualDistanceFt: data.dist,
      marginFt: data.marginFt,
      utilizationPct: data.utilizationPct,
      deliveredPpp: data.deliveredPpp,
      targetPpp: data.ppp,
      plateWidthFt: data.pw,
      horizontalResolutionPx: data.res,
      hfovDeg: data.hfov
    };
  }

  function clearLicensePlateLiveVisual() {
    if (!els.liveVisual) return;
    els.liveVisual.hidden = true;
    els.liveVisual.innerHTML = "";
  }

  function renderLicensePlateLiveVisual(data) {
    if (!els.liveVisual) return;

    const gfx = window.ScopedLabsGraphics;
    if (!gfx || typeof gfx.render !== "function") {
      clearLicensePlateLiveVisual();
      return;
    }

    const svg = gfx.render("license-plate-range-plan", licensePlateGraphicsModel(data));
    if (typeof svg !== "string" || !svg.includes("<svg")) {
      clearLicensePlateLiveVisual();
      return;
    }

    els.liveVisual.innerHTML = svg;
    els.liveVisual.hidden = false;
  }


  function updateActiveAreaFromLicensePlate(data, manualOverrideMeta = []) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      licensePlateStatus: data.status,
      licensePlateClass: data.classification,
      licensePlateMaxDistanceFt: data.maxDist,
      licensePlateActualDistanceFt: data.dist,
      licensePlateRangeMarginFt: data.marginFt,
      licensePlateUtilizationPct: data.utilizationPct,
      licensePlateDeliveredPpp: data.deliveredPpp,
      licensePlateTargetPpp: data.ppp,
      licensePlateWidthFt: data.pw,
      licensePlateHorizontalResolutionPx: data.res,
      licensePlateHfovDeg: data.hfov,
      licensePlateSourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
      licensePlateManualOverrides: manualOverrideMeta,
      licensePlateInterpretation: data.interpretation,
      licensePlateDominantConstraint: data.dominantConstraint,
      licensePlateGuidance: data.guidance,
      licensePlateUpdatedAt: new Date().toISOString()
    });
  }




  // data-license-plate-user-guidance-adapter-001
  function licensePlateGuidanceStatus(data) {
    if (!data) return "unknown";

    const status = String(data.status || "").toLowerCase();
    const delivered = Number(data.deliveredPpp);
    const target = Number(data.ppp);
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

  function licensePlateSourceMode(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    return manualOverrideMeta.length ? "manual-override" : "pipeline";
  }

  function licensePlateExpectedResult(data) {
    const delivered = Number(data.deliveredPpp);
    const target = Number(data.ppp);
    const margin = Number(data.marginFt);
    const maxDist = Number(data.maxDist);
    const actualDist = Number(data.dist);

    const parts = [];

    if (Number.isFinite(delivered) && Number.isFinite(target)) {
      parts.push(fmtPx(delivered, 1) + " delivered pixels/plate vs " + fmtPx(target, 0) + " target");
    }

    if (Number.isFinite(margin)) {
      parts.push(margin >= 0 ? fmtFt(margin) + " range margin" : fmtFt(Math.abs(margin)) + " shortfall");
    }

    if (Number.isFinite(maxDist) && Number.isFinite(actualDist)) {
      parts.push(fmtFt(actualDist) + " actual distance vs " + fmtFt(maxDist) + " modeled max");
    }

    return parts.filter(Boolean).join(" | ") || "Review delivered plate detail against the target requirement.";
  }

  function licensePlatePrimaryRecommendation(data) {
    const status = licensePlateGuidanceStatus(data);
    const delivered = Number(data.deliveredPpp);
    const target = Number(data.ppp);
    const margin = Number(data.marginFt);
    const expectedResult = licensePlateExpectedResult(data);

    if (status === "healthy") {
      return {
        action: "Keep Current License Plate Baseline",
        reason: "Delivered pixels per plate and working distance are inside the current capture target.",
        expectedResult,
        confidence: "No correction required",
        nextStep: "Use this result as the license plate validation branch for the active area."
      };
    }

    if (status === "watch") {
      return {
        action: "Preserve the baseline, but keep margin visible",
        reason: "The plate capture plan is close enough to continue, but the distance or utilization margin should be reviewed before treating it as final.",
        expectedResult,
        confidence: "Watch margin",
        nextStep: "Confirm field distance, angle, illumination, and plate width assumptions."
      };
    }

    if (Number.isFinite(delivered) && Number.isFinite(target) && delivered < target) {
      return {
        action: "Increase delivered plate detail",
        reason: "Delivered pixels per plate are below the target needed for the selected license plate readability goal.",
        expectedResult,
        confidence: "Detail shortfall",
        nextStep: "Reduce HFOV, increase horizontal resolution, or move the camera closer before using this as final."
      };
    }

    if (Number.isFinite(margin) && margin < 0) {
      return {
        action: "Reduce working distance or tighten the optical setup",
        reason: "The actual working distance is beyond the modeled max capture distance for the current plate target.",
        expectedResult,
        confidence: "Range shortfall",
        nextStep: "Move the camera closer, reduce HFOV, or increase resolution."
      };
    }

    return {
      action: "Review License Plate Capture Assumptions",
      reason: "The current result needs review before being treated as a final license plate capture branch.",
      expectedResult,
      confidence: "Review required",
      nextStep: "Confirm plate width, target pixels per plate, distance, resolution, and HFOV."
    };
  }

  function licensePlateSecondaryOptions(data) {
    const delivered = Number(data.deliveredPpp);
    const target = Number(data.ppp);
    const margin = Number(data.marginFt);

    const options = [
      {
        label: "Reduce HFOV",
        intent: "Concentrate more horizontal pixels across the plate at the same distance.",
        expectedResult: "Delivered pixels per plate should increase if lens selection can support the tighter view.",
        tradeoff: "Narrower view may reduce surrounding scene context.",
        canApply: true
      },
      {
        label: "Increase horizontal resolution",
        intent: "Raise the pixel budget available across the same field of view.",
        expectedResult: "Delivered pixels per plate should move closer to or above the target.",
        tradeoff: "May increase camera cost, bandwidth, and storage requirements.",
        canApply: true
      },
      {
        label: "Move camera closer",
        intent: "Reduce target distance so the plate occupies more of the image.",
        expectedResult: "Range margin should improve and delivered plate detail should increase.",
        tradeoff: "Mounting location and angle may become more constrained.",
        canApply: true
      },
      {
        label: "Review target pixels per plate",
        intent: "Use only when the capture goal or evidence standard has changed.",
        expectedResult: "A lower target can improve pass/fail margin, but may reduce evidentiary confidence.",
        tradeoff: "Do not lower the target simply to make a weak design pass.",
        canApply: true
      }
    ];

    if (Number.isFinite(delivered) && Number.isFinite(target) && delivered >= target && Number.isFinite(margin) && margin >= 0) {
      return options.slice(0, 2);
    }

    return options;
  }

  function buildLicensePlateUserGuidance(data) {
    const helper = window.ScopedLabsUserAssistantGuidance;
    const mode = licensePlateSourceMode(data);
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const primary = licensePlatePrimaryRecommendation(data);
    const sourceLabel = helper && typeof helper.sourceLabelForMode === "function"
      ? helper.sourceLabelForMode(mode)
      : (mode === "manual-override" ? "Manual override" : "Clean pipeline");
    const sourceMessage = helper && typeof helper.sourceMessageForMode === "function"
      ? helper.sourceMessageForMode(mode)
      : "Use this result only when the assumptions match the intended design path.";

    const input = {
      status: licensePlateGuidanceStatus(data),
      mode,
      primaryRecommendation: primary,
      secondaryOptions: licensePlateSecondaryOptions(data),
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
        nextTool: "",
        message: "Use this license plate validation only when the working distance, HFOV, resolution, plate width, and target pixels-per-plate assumptions match the real capture lane."
      }
    };

    if (helper && typeof helper.createGuidance === "function") {
      return helper.createGuidance(input);
    }

    return Object.assign({
      version: "license-plate-user-guidance-adapter-001-fallback"
    }, input);
  }

  function updateLicensePlateUserGuidance(data) {
    try {
      latestLicensePlateGuidance = buildLicensePlateUserGuidance(data);
      return latestLicensePlateGuidance;
    } catch (error) {
      latestLicensePlateGuidance = {
        version: "license-plate-user-guidance-adapter-001-error",
        status: "unknown",
        mode: "unknown",
        error: error && error.message ? error.message : String(error || "Unknown guidance adapter error")
      };

      return latestLicensePlateGuidance;
    }
  }

  function getLastLicensePlateGuidance() {
    return cloneLicensePlateGuidance(latestLicensePlateGuidance);
  }

  function explainLastLicensePlateGuidance() {
    if (!latestLicensePlateGuidance) {
      return {
        ok: false,
        summary: "No License Plate guidance has been generated yet.",
        nextStep: "Run a License Plate calculation first."
      };
    }

    const helper = window.ScopedLabsUserAssistantGuidance;

    if (helper && typeof helper.explainGuidance === "function") {
      return helper.explainGuidance(latestLicensePlateGuidance);
    }

    return cloneLicensePlateGuidance(latestLicensePlateGuidance);
  }


  
  function getLicensePlateBridgeGuidance() {
    const guidanceApi = window.ScopedLabsLicensePlateGuidance;

    if (guidanceApi && typeof guidanceApi.getLastGuidance === "function") {
      return guidanceApi.getLastGuidance();
    }

    return null;
  }

  function publishLicensePlateGuidanceEvent(source) {
    const bridge = window.ScopedLabsPhysicalSecurityGuidanceEventBridge;
    const guidance = getLicensePlateBridgeGuidance();

    if (!bridge || typeof bridge.publishIfChanged !== "function" || !guidance) {
      return false;
    }

    return !!bridge.publishIfChanged({
      category: "physical-security",
      tool: "license-plate-range",
      guidance,
      source: source || "license-plate-guidance-update"
    });
  }

  function clearLicensePlateGuidanceEventMemory() {
    const bridge = window.ScopedLabsPhysicalSecurityGuidanceEventBridge;

    if (bridge && typeof bridge.clearTool === "function") {
      bridge.clearTool("license-plate-range");
      return true;
    }

    const memory = window.ScopedLabsPhysicalSecurityGuidanceMemory;

    if (memory && typeof memory.clearToolGuidance === "function") {
      return memory.clearToolGuidance("license-plate-range");
    }

    return false;
  }

function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.plate, {
      category: CATEGORY,
      step: STEP,
      data: {
        dist: data.maxDist,
        actualDist: data.dist,
        classification: data.classification,
        ppp: data.ppp,
        pw: data.pw,
        hfov: data.hfov,
        res: data.res,
        deliveredPpp: data.deliveredPpp,
        maxDist: data.maxDist,
        marginFt: data.marginFt,
        utilizationPct: data.utilizationPct,
        interpretation: data.interpretation,
        guidance: data.guidance,
        sourceMode: manualOverrideMeta.length ? "manual-override" : "pipeline",
        manualOverrides: manualOverrideMeta
      }
    });

    updateActiveAreaFromLicensePlate(data, manualOverrideMeta);
  }

  
  // data-scopedlabs-plate-structured-export-001
  function plateExportRoot() {
    return els.toolCard || document.getElementById("toolCard") || document.querySelector("main .container") || document.body;
  }

  function escapePlateExportHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function plateFallbackExportTable(title, rows) {
    const cleanRows = (Array.isArray(rows) ? rows : []).filter((row) => row && row[0] && row[1] != null);
    if (!cleanRows.length) return "";

    return "" +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">' + escapePlateExportHtml(title) + '</th>' +
          '<th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Value</th>' +
        '</tr></thead>' +
        '<tbody>' +
          cleanRows.map((row) =>
            '<tr>' +
              '<td style="width:42%;padding:8px 10px;border-bottom:1px solid #d8dee6;color:#4b5563;vertical-align:top;">' + escapePlateExportHtml(row[0]) + '</td>' +
              '<td style="padding:8px 10px;border-bottom:1px solid #d8dee6;color:#111827;font-weight:700;text-align:left;vertical-align:top;">' + escapePlateExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function plateFallbackNotesTable(rows) {
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
              '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapePlateExportHtml(row[0]) + '</td>' +
              '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapePlateExportHtml(row[1]) + '</td>' +
            '</tr>'
          ).join("") +
        '</tbody>' +
      '</table>';
  }

  function clearPlateStructuredExport() {
    document.querySelectorAll('[data-plate-structured-export="true"]').forEach((node) => node.remove());
  }


  // data-scopedlabs-license-plate-export-visual-001
  function licensePlateExportVisualSvg(data) {
    if (!data || !data.ok) return "";

    const gfx = window.ScopedLabsGraphics;
    if (!gfx || typeof gfx.render !== "function" || typeof licensePlateGraphicsModel !== "function") {
      return "";
    }

    const svg = gfx.render("license-plate-range-plan", licensePlateGraphicsModel(data));
    if (typeof svg !== "string" || !svg.includes("<svg")) return "";

    return "" +
      '<div data-license-plate-export-visual="true" style="break-inside:avoid;margin:0 0 12px 0;">' +
        svg +
      '</div>';
  }


  function plateStructuredExportTables(data) {
    if (!data || !data.ok) return "";

    const metrics = [
      ["Plate readability target", data.classification],
      ["Max capture distance", fmtFt(data.maxDist)],
      ["Actual working distance", fmtFt(data.dist)],
      ["Range margin", data.marginFt >= 0 ? fmtFt(data.marginFt) : "-" + fmtFt(Math.abs(data.marginFt))],
      ["Horizontal resolution", fmtPx(data.res)],
      ["Horizontal FOV", fmt(data.hfov, 1) + "°"],
      ["Target pixels per plate", fmtPx(data.ppp)],
      ["Delivered pixels per plate", fmtPx(data.deliveredPpp, 1)],
      ["Plate width assumption", fmtFt(data.pw, 2)],
      ["Range utilization", fmtPct(data.utilizationPct)],
      ["Assistant status", data.status],
      ["Validation type", "Optional license plate validation"]
    ];

    const handoff = "Use this result as a specialist vehicle-detail validation branch. Plate capture should be validated separately from general coverage because shutter speed, glare, plate angle, IR behavior, and vehicle speed can dominate real-world readability.";

    const notes = [
      ["Engineering interpretation", data.interpretation],
      ["Dominant constraint", data.dominantConstraint],
      ["Recommended action", data.guidance],
      ["Final validation note", handoff]
    ];

    const metricHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderMetricTable === "function"
      ? window.ScopedLabsAssistantExport.renderMetricTable("License Plate Design Summary", metrics)
      : plateFallbackExportTable("License Plate Design Summary", metrics);

    const notesHtml = window.ScopedLabsAssistantExport && typeof window.ScopedLabsAssistantExport.renderNotesTable === "function"
      ? window.ScopedLabsAssistantExport.renderNotesTable(notes)
      : plateFallbackNotesTable(notes);

    const visualHtml = licensePlateExportVisualSvg(data);

    return "" +
      '<div class="plate-export-structured-tables" data-plate-structured-export="true" data-export-section data-export-suppress-title="true" style="position:absolute;left:-10000px;top:auto;width:820px;max-height:1px;overflow:hidden;opacity:0;pointer-events:none;">' +
        visualHtml +

        metricHtml +

        notesHtml +
      '</div>';
  }

  function renderPlateStructuredExport(data) {
    clearPlateStructuredExport();

    const html = plateStructuredExportTables(data);
    if (!html) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const node = wrapper.firstElementChild;
    if (!node) return;

    plateExportRoot().appendChild(node);
  }
  function renderError(message) {
    clearPlateStructuredExport();
    clearLicensePlateLiveVisual();
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideComplete();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Plate Readability Target", value: data.classification },
        { label: "Max Capture Distance", value: fmtFt(data.maxDist) },
        { label: "Actual Working Distance", value: fmtFt(data.dist) },
        { label: "Range Margin", value: data.marginFt >= 0 ? fmtFt(data.marginFt) : `-${fmtFt(Math.abs(data.marginFt))}` }
      ],
      derivedRows: [
        { label: "Horizontal Resolution", value: fmtPx(data.res) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: "Target Pixels per Plate", value: fmtPx(data.ppp) },
        { label: "Delivered Pixels per Plate", value: fmtPx(data.deliveredPpp, 1) },
        { label: "Plate Width Assumption", value: fmtFt(data.pw, 2) },
        { label: "Range Utilization", value: fmtPct(data.utilizationPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Range Utilization", "Distance Shortfall", "Plate Readability Demand"],
        values: [
          Number(data.utilizationMetric.toFixed(1)),
          Number(data.shortfallMetric.toFixed(1)),
          Number(data.requirementMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.utilizationPct),
          data.marginFt < 0 ? fmtFt(Math.abs(data.marginFt)) : "0.0 ft",
          fmtPx(data.ppp)
        ],
        referenceValue: 75,
        healthyMax: 75,
        watchMax: 95,
        axisTitle: "Plate Capture Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
renderLicensePlateLiveVisual(data);

renderPlateStructuredExport(data);
    writeFlow(data);
    updateLicensePlateUserGuidance(data);
        publishLicensePlateGuidanceEvent("license-plate-guidance-update");
showComplete();
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    plateInitialFlowImportApplied = false;
    resetFlowOverrideState();
    applyDefaults();
    syncAllPlatePresetSelects();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["res", "hfov", "ppp", "pw", "dist"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      const handleEdit = () => {
        clearLicensePlateGuidanceEventMemory();
        markFlowInputOverride(id);
        invalidate({ clearFlow: true });
        renderFlowNote();
        refreshManualOverrideBanner();
      };

      el.addEventListener("input", handleEdit);
      el.addEventListener("change", handleEdit);
    });

    bindPlateGuidedPresets();



    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);
  }

  function init() {
    plateInitialFlowImportApplied = false;
    applyDefaults();
    bind();
    syncAllPlatePresetSelects();
    renderFlowNote();
    invalidate({ clearFlow: false });
  }

  window.ScopedLabsLicensePlateGuidance = Object.freeze({
    version: "license-plate-user-guidance-adapter-001",
    getLastGuidance: getLastLicensePlateGuidance,
    explainLastGuidance: explainLastLicensePlateGuidance
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    init();
  });
})();

/* ScopedLabs License Plate Capture Range Local Assistant Proof
   Version: license-plate-range-local-assistant-proof-001
   Purpose: visible local assistant proof for License Plate Capture Range only.
   Notes:
   - Uses the shared Physical Security local assistant module.
   - Listens for validated Physical Security guidance events.
   - Clears stale local assistant output on raw input/change.
   - Does not touch Area Planner, Lens Selection, category renderer, export, auth, checkout, KB, or pipeline behavior.
*/
(function licensePlateRangeLocalAssistantProof() {
  "use strict";

  const VERSION = "license-plate-range-local-assistant-proof-001";
  const TOOL_SLUG = "license-plate-range";
  const TOOL_TEXT = "license plate";
  const MOUNT_ID = "licensePlateRangeLocalAssistantMount";

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
    if (Array.isArray(value)) return value.map(asText).filter(Boolean);
    if (typeof value === "string" && value.trim()) return value.split(/\n|;|\|/).map(asText).filter(Boolean);
    return [];
  }

  function pickRecord(detail) {
    const data = detail || {};
    return data.guidance || data.record || data.model || data.data || data.payload || data;
  }

  function eventBelongsToTool(detail) {
    const data = detail || {};
    const record = pickRecord(data) || {};
    const haystack = [data.tool, data.slug, data.toolSlug, data.source, data.id, record.tool, record.slug, record.toolSlug, record.source, record.id].map(asText).join(" ").toLowerCase();
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
    return asText(record.summary || record.headline || record.message || record.detail || record.description || record.primaryText) || "License plate capture range has been evaluated. Review plate width, distance, pixel density, angle, and specialty-zone assumptions before attaching this result to the area summary.";
  }

  function readAssumptions(record) {
    return compactList(record.assumptions || record.assumptionList || record.inputs || record.inputSummary || record.context);
  }

  function readActions(record) {
    const actions = compactList(record.actions || record.recommendedActions || record.recommendations || record.nextSteps || record.requiredActions);
    const singleAction = asText(record.action || record.requiredAction || record.nextStep);
    if (singleAction && !actions.includes(singleAction)) actions.push(singleAction);
    if (!actions.length) actions.push("Confirm the license plate capture zone assumptions before returning to the Area Planner or attaching this specialty zone to the Physical Security summary.");
    return actions;
  }

  function buildModel(recordInput) {
    const record = recordInput || {};
    const adapters = adapterApi();
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(TOOL_SLUG) : null;
    return {
      tool: TOOL_SLUG,
      title: adapter && adapter.title ? adapter.title : "License Plate Capture Assistant",
      status: readStatus(record),
      summary: readSummary(record),
      assumptions: readAssumptions(record),
      actions: readActions(record),
      iconKey: adapter && adapter.iconKey ? adapter.iconKey : "licensePlate",
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

  window.ScopedLabsLicensePlateRangeLocalAssistantProof = Object.freeze({ version: VERSION, buildModel: buildModel, render: render, clear: clear });
})();
