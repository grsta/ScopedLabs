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
    sw: $("sw"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    diagnostic: $("diagnostic-panel"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    dist: 80,
    tw: 20,
    sw: 6.4
  };

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
    els.dist.value = String(DEFAULTS.dist);
    els.tw.value = String(DEFAULTS.tw);
    els.sw.value = String(DEFAULTS.sw);
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
      emptyMessage: "Enter values and press Suggest Lens."
    });

    prev = null;
    renderFlowNote();
  }

  function getInputs() {
    const dist = num(els.dist.value);
    const tw = num(els.tw.value);
    const sw = num(els.sw.value);

    if (
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(tw) || tw <= 0 ||
      !Number.isFinite(sw) || sw <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Suggest Lens." };
    }

    return { ok: true, dist, tw, sw };
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
    const adjustedFocal = adjustForPPF(baseFocal);
    const lensClass = classifyLens(adjustedFocal);
    const interp = lensInterpretation(adjustedFocal);

    const ppf = prev ? num(prev.ppf, 0) : 0;
    const requirementClass = classifyRequirement(ppf);

    const adjustmentPct = baseFocal > 0
      ? ((adjustedFocal - baseFocal) / baseFocal) * 100
      : 0;

    const widthPerMm = adjustedFocal > 0 ? input.tw / adjustedFocal : 0;

    const detailPressureMetric =
      ppf > 0
        ? ppf < 40 ? 85
        : ppf < 80 ? 60
        : ppf > 120 ? 20
        : 35
        : 25;

    const focalPressureMetric =
      adjustedFocal >= 12 ? 75
      : adjustedFocal >= 8 ? 45
      : adjustedFocal >= 4 ? 20
      : 10;

    const adjustmentMetric = Math.min(Math.abs(adjustmentPct) * 1.5, 100);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(detailPressureMetric, focalPressureMetric, adjustmentMetric),
      metrics: [
        {
          label: "Detail Pressure",
          value: detailPressureMetric,
          displayValue: ppf > 0 ? fmtPpf(ppf) : "No prior PPF"
        },
        {
          label: "Focal Demand",
          value: focalPressureMetric,
          displayValue: fmtMm(adjustedFocal)
        },
        {
          label: "Adjustment Shift",
          value: adjustmentMetric,
          displayValue: `${fmt(adjustmentPct, 1)}%`
        }
      ],
      healthyMax: 25,
      watchMax: 60
    });

    let dominantConstraint = "";
    if (ppf > 0 && ppf < 40) {
      dominantConstraint = "Detail pressure is the dominant limiter. The upstream pixel-density requirement is weak, so this tool is tightening focal length to recover usable subject detail.";
    } else if (adjustedFocal >= 12) {
      dominantConstraint = "Focal demand is the dominant limiter. The scene geometry is pushing the design toward a long-range lens class, which narrows field of view and reduces layout flexibility.";
    } else if (Math.abs(adjustmentPct) > 15) {
      dominantConstraint = "Adjustment shift is the dominant limiter. The lens choice has to move meaningfully away from the raw geometry solution to satisfy the prior detail requirement.";
    } else {
      dominantConstraint = "The lens requirement is balanced. Scene width, distance, and detail expectation are staying in a practical range for a standard lens choice.";
    }

    let guidance = "Verify the final option against the manufacturer’s real FOV chart before locking the bill of materials.";
    if (ppf > 0 && ppf < 40) {
      guidance = "Pixel density is low, so a tighter lens is recommended to recover detail. Re-check subject framing and verify that the scene width still matches the operational requirement.";
    } else if (ppf > 120) {
      guidance = "Pixel density is already strong, so a slightly wider lens may still be acceptable. Validate whether broader coverage is worth the detail tradeoff.";
    } else if (adjustedFocal >= 12) {
      guidance = "This is a long-range optic recommendation. Check depth-of-field, mounting precision, and scene alignment before treating it as final.";
    }

    const interpretation = `At ${fmtFt(input.dist)} with a target width of ${fmtFt(input.tw)} and a ${fmtMm(input.sw, 2)} sensor, the raw geometry calls for about ${fmtMm(baseFocal)}. After applying the upstream detail requirement, the adjusted recommendation becomes ${fmtMm(adjustedFocal)}, which falls into the ${lensClass} class. ${interp}`;

    return {
      ok: true,
      ...input,
      baseFocal,
      adjustedFocal,
      lensClass,
      ppf,
      requirementClass,
      adjustmentPct,
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
        label: "Adjustment Shift",
        value: data.adjustmentMetric,
        summary: "The lens recommendation had to move away from the raw geometry result to stay aligned with the prior detail requirement."
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
        label: "Sensor width",
        value: fmtMm(data.sw, 2),
        note: "Camera sensor width used for the focal-length estimate."
      },
      {
        label: "Pixel-density input",
        value: data.ppf > 0 ? fmtPpf(data.ppf) : "No prior PPF",
        note: "Optional upstream detail target used to adjust the raw geometry result."
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
        note: "Pressure created by how far the adjusted focal length moved away from the raw geometry result."
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
      objective: "Estimate lens class and focal-length pressure from scene geometry and upstream detail requirements.",
      method: "Uses distance to target, target width, sensor width, and pixel-density context to estimate focal demand and classify planning pressure.",
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
          label: "Adjusted Focal Length",
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
          body: "Estimate lens class and focal-length pressure from scene geometry and upstream detail requirements."
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
      calculatedLensMm: Number(data.baseFocal.toFixed(2)),
      status: data.status,
      coverageStatus: data.status,
      detailStatus: data.ppf > 0 && data.ppf < 80 ? "RISK" : data.ppf > 0 ? "HEALTHY" : "WATCH",
      pressure: Number(pressureScore.toFixed(0)),
      assumptions: {
        distanceFt: Number(data.dist.toFixed(2)),
        requiredSceneWidthFt: Number(data.tw.toFixed(2)),
        sceneWidthFt: Number(data.tw.toFixed(2)),
        selectedLensMm: Number(data.adjustedFocal.toFixed(2)),
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
        requiredLensForTargetMm: Number(data.baseFocal.toFixed(2)),
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
            "Sensor width: " + fmtMm(data.sw, 2),
            "Pixel-density input: " + (data.ppf > 0 ? fmtPpf(data.ppf) : "No prior PPF"),
            "Adjustment shift: " + fmt(data.adjustmentPct, 1) + "%"
          ]
        }
      ]
    });
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
        { label: "Raw Focal Length", value: fmtMm(data.baseFocal) },
        { label: "Adjusted Focal Length", value: fmtMm(data.adjustedFocal) },
        { label: "Suggested Lens Class", value: data.lensClass },
        { label: "Upstream Detail Requirement", value: data.ppf > 0 ? data.requirementClass : "No prior PPF" }
      ],
      derivedRows: [
        { label: "Distance to Target", value: fmtFt(data.dist) },
        { label: "Target Width", value: fmtFt(data.tw) },
        { label: "Sensor Width", value: fmtMm(data.sw, 2) },
        { label: "Pixel Density Input", value: data.ppf > 0 ? fmtPpf(data.ppf) : "N/A" },
        { label: "Adjustment Shift", value: `${fmt(data.adjustmentPct, 1)}%` },
        { label: "Width per mm of Focal Length", value: data.widthPerMm > 0 ? `${fmt(data.widthPerMm, 2)} ft/mm` : "N/A" }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    renderDiagnosticPanel(data);

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