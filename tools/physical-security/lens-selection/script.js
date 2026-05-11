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

  function applyDefaults() {
    if (els.dist) els.dist.value = String(DEFAULTS.dist);
    if (els.tw) els.tw.value = String(DEFAULTS.tw);
    if (els.selectedLens) els.selectedLens.value = String(DEFAULTS.selectedLens);
    if (els.cameraFormat) els.cameraFormat.value = String(DEFAULTS.cameraFormat);
    if (els.sw) els.sw.value = String(DEFAULTS.sw);
    syncCameraFormatControl();
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
    try {
      sessionStorage.removeItem(FLOW_KEYS.face);
      sessionStorage.removeItem(FLOW_KEYS.plate);
    } catch {}
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

  function renderFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS.pixel);
    prev = null;

    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    prev = parsed.data || {};

    const dist = num(prev.dist);
    const ppf = num(prev.ppf);
    const level = prev.level || prev.classification || "";

    if (Number.isFinite(dist) && dist > 0) {
      els.dist.value = String(Math.round(dist));
    }

    const parts = [];
    if (level) {
      parts.push(`Pixel Density: <strong>${level}</strong>`);
    } else if (Number.isFinite(ppf) && ppf > 0) {
      parts.push(`Pixel Density: <strong>${fmtPpf(ppf)}</strong>`);
    }
    if (Number.isFinite(dist) && dist > 0) {
      parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
    }

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This step converts the validated detail requirement from Pixel Density into a practical focal-length recommendation.
    `;
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstream();

    clearDiagnosticPanel();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
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
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.lens, {
      category: CATEGORY,
      step: STEP,
      data: {
        focal: data.adjustedFocal,
        baseFocal: data.baseFocal,
        lensClass: data.lensClass,
        dist: data.dist,
        tw: data.tw,
        ppf: data.ppf,
        requirementClass: data.requirementClass,
        adjustmentPct: data.adjustmentPct,
        interpretation: data.interpretation,
        guidance: data.guidance
      }
    });
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

  function designStatusClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "healthy") return "healthy";
    if (s === "watch") return "watch";
    return "risk";
  }

  function lensDesignActions(data) {
    const actions = [];
    const fit = Number(data.fitRatio || 1);
    const hasPpf = Number(data.ppf || 0) > 0;

    if (fit < 0.8) {
      actions.push("Selected lens appears wider than the calculated target. Evaluate a tighter lens, shorter distance, reduced scene width, or split coverage.");
    } else if (fit > 1.75) {
      actions.push("Selected lens is much tighter than the calculated target. Confirm the narrower view still covers the intended scene.");
    } else {
      actions.push("Selected lens and calculated target are reasonably aligned. Manufacturer FOV validation is still required.");
    }

    if (!hasPpf) {
      actions.push("No prior PPF/detail validation is available. Treat this as a lens-fit check, not a final recognition/identification result.");
    } else if (data.ppf < 80) {
      actions.push("Upstream detail context is weak. Recheck target width, camera distance, resolution, or split the view across more cameras.");
    } else {
      actions.push("Upstream detail context is present. Continue to downstream face-recognition or license-plate checks as needed.");
    }

    actions.push("Use Report V2 to document the selected lens, calculated target, assumptions, and remaining validation checks.");

    return actions;
  }

  function clearDesignAssistant() {
    if (!els.designAssistant) return;
    els.designAssistant.hidden = true;
    els.designAssistant.innerHTML = "";
  }

  function renderLensDesignAssistant(data) {
    if (!els.designAssistant) return;

    const status = data.status || "WATCH";
    const statusClass = designStatusClass(status);
    const selectedLens = data.selectedLens || data.adjustedFocal;
    const targetLens = data.calculatedTargetFocal || data.baseFocal;
    const gap = Number.isFinite(data.lensGapPct) ? data.lensGapPct : data.adjustmentPct;
    const fit = Number(data.fitRatio || 1);
    const fitPct = Number.isFinite(fit) ? fit * 100 : 100;
    const targetWidth = data.tw;
    const distance = data.dist;
    const ppfLabel = data.ppf > 0 ? fmtPpf(data.ppf) : "No prior PPF";
    const formatLabel = data.cameraFormatLabel
      ? data.cameraFormatLabel + " (" + fmtMm(data.sw, 2) + ")"
      : fmtMm(data.sw, 2);

    const coneColor = status === "HEALTHY"
      ? "rgba(125,255,152,.22)"
      : status === "WATCH"
        ? "rgba(255,211,79,.20)"
        : "rgba(255,96,88,.20)";

    const strokeColor = status === "HEALTHY"
      ? "#7dff98"
      : status === "WATCH"
        ? "#ffd34f"
        : "#ff8f88";

    const actions = lensDesignActions(data).map((item) => "<li>" + item + "</li>").join("");

    const fovSvg =
      '<svg viewBox="0 0 760 230" role="img" aria-label="Lens design assistant FOV summary">' +
        '<rect x="0" y="0" width="760" height="230" fill="rgba(2,6,12,.18)" />' +
        '<text x="22" y="28" fill="rgba(125,255,152,.92)" font-size="11" font-weight="950" letter-spacing="1.5">SELECTED LENS CHECK</text>' +
        '<text x="22" y="50" fill="rgba(248,250,252,.82)" font-size="13" font-weight="900">' + fmtMm(selectedLens) + ' selected | ' + fmtMm(targetLens) + ' calculated target | ' + fmtFt(distance, 0) + ' distance</text>' +
        '<text x="22" y="70" fill="rgba(203,213,225,.66)" font-size="11">Camera format: ' + formatLabel + ' | target width: ' + fmtFt(targetWidth) + ' | detail context: ' + ppfLabel + '</text>' +
        '<path d="M 96 128 L 622 72 L 622 184 Z" fill="' + coneColor + '" stroke="rgba(226,232,240,.38)" stroke-width="1.5" />' +
        '<line x1="96" y1="128" x2="622" y2="128" stroke="rgba(226,232,240,.24)" stroke-dasharray="6 7" />' +
        '<circle cx="96" cy="128" r="12" fill="rgba(125,255,152,.16)" stroke="rgba(125,255,152,.82)" stroke-width="2" />' +
        '<text x="66" y="105" fill="rgba(248,250,252,.80)" font-size="11" font-weight="900">Camera</text>' +
        '<line x1="622" y1="72" x2="622" y2="184" stroke="' + strokeColor + '" stroke-width="4" />' +
        '<text x="474" y="64" fill="' + strokeColor + '" font-size="11" font-weight="950">Required scene width</text>' +
        '<line x1="96" y1="205" x2="622" y2="205" stroke="rgba(226,232,240,.34)" stroke-width="1" />' +
        '<text x="330" y="222" fill="rgba(226,232,240,.68)" font-size="10" font-weight="850">Distance to target: ' + fmtFt(distance, 0) + '</text>' +
      '</svg>';

    els.designAssistant.hidden = false;
    els.designAssistant.innerHTML =
      '<div class="lens-design-head">' +
        '<div>' +
          '<div class="lens-design-kicker">Design Assistant</div>' +
          '<h3 class="lens-design-title">Selected lens versus calculated target</h3>' +
          '<p class="lens-design-copy">' + data.dominantConstraint + '</p>' +
        '</div>' +
        '<div class="lens-design-status ' + statusClass + '">' + status + '</div>' +
      '</div>' +
      '<div class="lens-design-layout">' +
        '<div class="lens-fov-card">' +
          '<div class="lens-fov-stage">' + fovSvg + '</div>' +
          '<div class="lens-mini-grid">' +
            '<div class="lens-mini-card"><div class="lens-mini-label">Selected lens</div><span class="lens-mini-value">' + fmtMm(selectedLens) + '</span></div>' +
            '<div class="lens-mini-card"><div class="lens-mini-label">Calculated target</div><span class="lens-mini-value">' + fmtMm(targetLens) + '</span></div>' +
            '<div class="lens-mini-card"><div class="lens-mini-label">Selection gap</div><span class="lens-mini-value">' + fmt(gap, 1) + '%</span></div>' +
            '<div class="lens-mini-card"><div class="lens-mini-label">Detail context</div><span class="lens-mini-value">' + ppfLabel + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="lens-advice-card">' +
          '<div class="lens-design-kicker">Recommended review path</div>' +
          '<h3 class="lens-design-title">What to verify next</h3>' +
          '<p class="lens-design-copy">' + data.guidance + '</p>' +
          '<ul class="lens-action-list">' + actions + '</ul>' +
        '</div>' +
      '</div>';
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
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

    renderDiagnosticPanel(data);

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
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["dist", "tw", "sw"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });

    els.calc?.addEventListener("click", calc);
    els.reset?.addEventListener("click", reset);
    const openReportV2 = document.getElementById("openReportV2");
    if (openReportV2) {
      openReportV2.addEventListener("click", () => {
        if (!window.ScopedLabsReportV2Data) return;
        localStorage.setItem(REPORT_V2_STORAGE_KEY, JSON.stringify(window.ScopedLabsReportV2Data, null, 2));
        sessionStorage.setItem(REPORT_V2_STORAGE_KEY, JSON.stringify(window.ScopedLabsReportV2Data, null, 2));
        window.open("/prototypes/lens-report-v2/?source=live-lens-selection&rev=live-shadow-001", "_blank", "noopener");
      });
    }

    els.continueBtn?.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
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