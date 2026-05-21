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
  const STEP = "camera-spacing";
  const PREVIOUS_STEP = "camera-coverage-area";

  const $ = (id) => document.getElementById(id);

  const els = {
    len: $("len"),
    dist: $("dist"),
    hfov: $("hfov"),
    ov: $("ov"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    assistant: $("spacingDesignAssistant"),
    exportSection: $("spacingExportSection"),
    assistantModeNote: $("spacingAssistantModeNote"),
    assistantDiagnosis: $("spacingAssistantDiagnosis"),
    assistantBranches: $("spacingAssistantBranches"),
    assistantRecommendation: $("spacingAssistantRecommendation"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    len: 300,
    dist: 60,
    hfov: 90,
    ov: 15
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

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
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

  let flowInputsImported = false;
  const importedFlowValues = {};
  const manualFlowOverrides = {};
  let activeAssistantScenario = null;
  let latestAssistantScenarios = [];

  function cleanOverrideNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function formatOverrideValue(field, value) {
    const number = cleanOverrideNumber(value);
    if (number === null) return "n/a";

    if (field === "len") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "dist") return number.toFixed(1).replace(/\.0$/, "") + " ft";
    if (field === "hfov") return number.toFixed(1).replace(/\.0$/, "") + "?";
    if (field === "ov") return number.toFixed(1).replace(/\.0$/, "") + "%";

    return String(number);
  }

  function overrideLabel(field) {
    if (field === "len") return "Protected length";
    if (field === "dist") return "Distance to target plane";
    if (field === "hfov") return "Horizontal FOV";
    if (field === "ov") return "Camera-to-camera overlap target";
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

function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hasPipelineBaseline() {
    if (Object.keys(importedFlowValues).length > 0) return true;

    try {
      const raw = sessionStorage.getItem(FLOW_KEYS.area);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.data);
    } catch {
      return false;
    }
  }

  function clearAssistantScenario() {
    activeAssistantScenario = null;
  }

  function sourceModeForCurrentResult(manualOverrideMeta) {
    if (activeAssistantScenario && manualOverrideMeta.length) return "mixed";
    if (activeAssistantScenario) return "assistant-scenario";
    if (manualOverrideMeta.length) return "manual-override";
    return "pipeline";
  }

  function assistantScenarioMetadata() {
    if (!activeAssistantScenario) return null;

    return {
      id: activeAssistantScenario.id,
      label: activeAssistantScenario.label,
      intent: activeAssistantScenario.intent,
      controlledFields: Object.keys(activeAssistantScenario.changes || {}),
      changes: activeAssistantScenario.changes || {},
      targetCameraCount: activeAssistantScenario.targetCams || activeAssistantScenario.cams,
      overlapTargetPct: activeAssistantScenario.ovPct,
      cameraCount: activeAssistantScenario.cams,
      actualSpacingFt: activeAssistantScenario.spacing,
      usableWidthFt: activeAssistantScenario.usableWidth,
      rawWidthFt: activeAssistantScenario.rawWidth,
      spacingRatio: activeAssistantScenario.ratio,
      spacingClass: activeAssistantScenario.spacingClass,
      scenarioContext: hasPipelineBaseline() ? "pipeline-baseline" : "single-validation",
      note: activeAssistantScenario.note
    };
  }

  function simulateSpacingBranch(data, ovPct) {
    const overlap = Math.min(95, Math.max(0, Number(ovPct)));
    const usableWidth = data.rawWidth * (1 - (overlap / 100));
    const cams = Math.max(1, Math.ceil(data.len / usableWidth));
    const spacing = data.len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;

    return {
      ovPct: overlap,
      rawWidth: data.rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass: classifySpacing(ratio)
    };
  }

  function overlapForTarget(data, targetCount, targetRatio) {
    if (!Number.isFinite(targetCount) || targetCount < 1) return null;
    if (!Number.isFinite(data.rawWidth) || data.rawWidth <= 0) return null;

    const spacing = data.len / targetCount;
    const desiredUsableWidth = spacing / targetRatio;
    const overlap = (1 - (desiredUsableWidth / data.rawWidth)) * 100;

    if (!Number.isFinite(overlap) || overlap < 0 || overlap > 95) return null;
    return overlap;
  }

  function makeAssistantScenario(id, label, intent, model, note, canApply) {
    return {
      id,
      label,
      intent,
      ovPct: model?.ovPct,
      cams: model?.cams,
      spacing: model?.spacing,
      usableWidth: model?.usableWidth,
      ratio: model?.ratio,
      spacingClass: model?.spacingClass,
      note,
      canApply: !!canApply && !!model && Number.isFinite(model.ovPct)
    };
  }

  function spacingSourceLabel(mode) {
    if (mode === "manual-override") return "Manual override";
    if (mode === "assistant-scenario") return "Assisted scenario";
    if (mode === "mixed") return "Mixed scenario";
    return "Clean pipeline";
  }

  function spacingProblemLabel(data) {
    if (!data) return "Review required";
    if (Number(data.cams) <= 1 || data.singleCamera) return "Single-camera coverage check";

    if (data.spacingClass === "Wide Spacing") return "Spacing is too wide for the usable footprint";
    if (data.spacingClass === "Tight Spacing") return "Spacing is conservative and camera-heavy";
    if (Number(data.ovPct) >= 25) return "Camera-to-camera overlap target is compressing useful coverage width";

    return "Spacing is balanced for this protected run";
  }

  function spacingRecommendedAction(data) {
    if (!data) return "Review the spacing result before continuing.";
    if (Number(data.cams) <= 1 || data.singleCamera) {
      return "Treat this as a single-camera coverage validation. Camera-to-camera overlap pressure is not applicable; continue to Blind Spot Check to verify edge and gap conditions.";
    }

    if (data.spacingClass === "Wide Spacing") {
      return "Apply a correction branch that shortens spacing, increases camera count, or revisits upstream geometry before Blind Spot Check.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return "Keep the conservative layout if continuity matters, or test the efficiency branch if camera count is under pressure.";
    }

    if (Number(data.ovPct) >= 25) {
      return "Spacing is workable, but camera-to-camera overlap target is high. Use the balanced branch if the layout feels over-compressed.";
    }

    return "Keep the baseline and continue to Blind Spot Check unless the project priority changes.";
  }

  function simulateSpacingDesignValues(data, changes) {
    const len = Number.isFinite(Number(changes?.len)) ? Number(changes.len) : Number(data.len);
    const dist = Number.isFinite(Number(changes?.dist)) ? Number(changes.dist) : Number(data.dist);
    const hfov = Number.isFinite(Number(changes?.hfov)) ? Number(changes.hfov) : Number(data.hfov);
    const ovPct = Number.isFinite(Number(changes?.ovPct)) ? Number(changes.ovPct) : Number(data.ovPct);

    if (
      !Number.isFinite(len) || len <= 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return null;
    }

    const rawWidth = 2 * Math.tan((hfov / 2) * Math.PI / 180) * dist;
    const usableWidth = rawWidth * (1 - (ovPct / 100));

    if (!Number.isFinite(rawWidth) || rawWidth <= 0 || !Number.isFinite(usableWidth) || usableWidth <= 0) {
      return null;
    }

    const cams = hasExplicitTargetCams ? targetCams : Math.max(1, Math.ceil(len / usableWidth));
    const spacing = len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;
    const spacingClass = classifySpacing(ratio);
    const singleCamera = cams <= 1;

    return {
      len,
      dist,
      hfov,
      ovPct,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass
    };
  }

  function makeSpacingDesignScenario(data, id, label, intent, changes, note, actionLabel, canApply = true) {
    const model = simulateSpacingDesignValues(data, changes || {});

    if (!model || !canApply) {
      return {
        id,
        label,
        intent,
        note,
        actionLabel: actionLabel || "Unavailable",
        canApply: false,
        changes: changes || {},
        disabledReason: "This branch is not available for the current geometry."
      };
    }

    return {
      id,
      label,
      intent,
      note,
      actionLabel,
      canApply: true,
      changes: changes || {},
      ...model
    };
  }

  function spacingControlFieldsLabel(scenario) {
    if (!scenario || !scenario.changes) return "No field changes";

    const labels = [];
    const singleCamera = Number(scenario.cams) <= 1 || scenario.singleCamera || Number(scenario.targetCams) <= 1 || Number(scenario.changes.targetCams) <= 1;

    if (Number.isFinite(Number(scenario.changes.len))) labels.push("perimeter length");
    if (Number.isFinite(Number(scenario.changes.dist))) labels.push("distance");
    if (Number.isFinite(Number(scenario.changes.hfov))) labels.push("HFOV");
    if (Number.isFinite(Number(scenario.changes.ovPct))) labels.push(singleCamera ? "single-camera overlap disabled" : "camera-to-camera overlap target");

    return labels.length ? labels.join(", ") : "baseline values";
  }

  function spacingScenarioSummary(scenario) {
    if (!scenario || !scenario.canApply) return "Unavailable for current geometry";

    const singleCamera = Number(scenario.cams) <= 1 || scenario.singleCamera || Number(scenario.targetCams) <= 1;

    return [
      Number.isFinite(scenario.cams) ? scenario.cams + " camera" + (Number(scenario.cams) === 1 ? "" : "s") : null,
      Number.isFinite(scenario.spacing) ? (singleCamera ? fmtFt(scenario.spacing) + " coverage check" : fmtFt(scenario.spacing) + " spacing") : null,
      Number.isFinite(scenario.usableWidth) ? fmtFt(scenario.usableWidth) + " usable width" : null,
      singleCamera ? "overlap N/A" : (Number.isFinite(scenario.ovPct) ? fmtPct(scenario.ovPct, 1) + " overlap" : null)
    ].filter(Boolean).join(" | ");
  }

  function spacingApplyButtonHtml(scenario) {
    if (!scenario || !scenario.canApply) {
      return '<button class="btn spacing-assistant-apply" type="button" disabled>Unavailable</button>';
    }

    const label = scenario.actionLabel || ("Apply: " + spacingScenarioSummary(scenario));

    return '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">' + escapeHtml(label) + '</button>';
  }

  function spacingAssistantHeroHtml(data) {
    const mode = sourceModeForCurrentResult(getManualOverrideMetadata(data));
    const blocker = spacingProblemLabel(data);

    return '' +
      '<div class="spacing-advice-card spacing-hero-card">' +
        '<div class="spacing-section-kicker">Executive Diagnostic Snapshot</div>' +
        '<h4 class="spacing-section-title">' + escapeHtml(blocker) + '</h4>' +
        '<p class="spacing-section-copy">' + escapeHtml(spacingRecommendedAction(data)) + '</p>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Status", assistantStatusLabel(data)) +
          miniCard("Source", spacingSourceLabel(mode)) +
          miniCard("Main Blocker", blocker) +
          miniCard("Recommended Next Step", "Blind Spot Check") +
        '</div>' +
      '</div>';
  }

  

  function spacingPathToHealthyHtml(data) {
    const items = [];

    if (data.spacingClass === "Wide Spacing") {
      items.push("Add one camera or tighten the spacing so actual spacing no longer outruns usable width.");
      items.push("Widen the effective HFOV only if the wider view still preserves downstream detail requirements.");
      items.push("Revisit Coverage Area if the imported distance or HFOV is not the true project geometry.");
      items.push("Confirm the corrected branch in Blind Spot Check before treating it as clean.");
    } else if (data.spacingClass === "Tight Spacing") {
      items.push("Keep the current result when continuity is more important than camera-count efficiency.");
      items.push("Try the efficiency branch only if the next Blind Spot Check remains healthy.");
      items.push("Avoid relaxing overlap so far that hidden seam risk gets pushed downstream.");
    } else {
      items.push("Preserve the current baseline and continue to Blind Spot Check.");
      items.push("Use the continuity branch if seam closure matters more than camera efficiency.");
      items.push("Use the efficiency branch only if the project needs fewer cameras and Blind Spot Check still passes.");
    }

    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Path to Healthy</div>' +
        '<h4 class="spacing-section-title">How to correct or preserve this result</h4>' +
        '<ul class="spacing-action-list">' +
          items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") +
        '</ul>' +
      '</div>';
  }

  function spacingCarryForwardHtml(data) {
    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Carry Forward</div>' +
        '<h4 class="spacing-section-title">What Blind Spot Check will receive</h4>' +
        '<p class="spacing-section-copy">The next step should validate whether this spacing plan actually closes the coverage seams.</p>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Cameras", String(data.cams)) +
          miniCard("Actual Spacing", fmtFt(data.spacing)) +
          miniCard("Distance", fmtFt(data.dist)) +
          miniCard("HFOV", fmt(data.hfov, 1) + " deg") +
        '</div>' +
        '<div class="spacing-mini-grid">' +
          miniCard("Camera-to-Camera Overlap Target", fmtPct(data.ovPct, 1)) +
          miniCard("Usable Width", fmtFt(data.usableWidth)) +
          miniCard("Raw Width", fmtFt(data.rawWidth)) +
          miniCard("Spacing Class", data.spacingClass) +
        '</div>' +
      '</div>';
  }

  function spacingOverlapForTargetCameraCount(data, targetCams, ratioTarget = 0.9) {
    const cams = Number(targetCams);
    const len = Number(data?.len);
    const rawWidth = Number(data?.rawWidth);

    if (!Number.isFinite(cams) || cams < 1 || !Number.isFinite(len) || len <= 0 || !Number.isFinite(rawWidth) || rawWidth <= 0) {
      return null;
    }

    const spacing = len / cams;
    const desiredUsableWidth = spacing / ratioTarget;
    const ovPct = (1 - (desiredUsableWidth / rawWidth)) * 100;

    if (!Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95) return null;

    return ovPct;
  }

  function spacingLensCustomAssumptionsHtml(data) {
    return '' +
      '<div class="lens-advice-card spacing-lens-custom">' +
        '<div class="lens-design-head spacing-lens-inner-head">' +
          '<div>' +
            '<div class="lens-design-kicker">Custom planning assumptions</div>' +
            '<h4 class="lens-design-title">Edit the spacing assumptions without leaving the assistant</h4>' +
            '<p class="lens-design-copy">Use these controls to test perimeter length, target camera count, distance, HFOV, and overlap before carrying the result into Blind Spot Check.</p>' +
          '</div>' +
          '<div class="lens-design-status healthy">Custom What-If</div>' +
        '</div>' +
        '<div class="spacing-control-grid">' +
          '<label class="field"><span class="label">Perimeter Length</span><input data-spacing-whatif="len" type="number" min="1" step="1" value="' + escapeHtml(String(Number(data.len || 0).toFixed(0))) + '"></label>' +
          '<label class="field"><span class="label">Target Cameras</span><input data-spacing-whatif="targetCams" type="number" min="1" step="1" value="' + escapeHtml(String(Number(data.cams || 1).toFixed(0))) + '"></label>' +
          '<label class="field"><span class="label">Distance</span><input data-spacing-whatif="dist" type="number" min="0.1" step="0.1" value="' + escapeHtml(String(Number(data.dist || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">HFOV</span><input data-spacing-whatif="hfov" type="number" min="1" max="179" step="0.1" value="' + escapeHtml(String(Number(data.hfov || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">Overlap Target</span><input data-spacing-whatif="ovPct" type="number" min="0" max="95" step="0.1" value="' + escapeHtml(String(Number(data.ovPct || 0).toFixed(1))) + '"></label>' +
        '</div>' +
        '<p class="lens-design-copy" style="margin-top:10px;"><strong>Tip:</strong> Change Target Cameras to 2, 3, or more to test what overlap is needed for that camera count. If the required overlap is unrealistic, the assistant will show the result as a pressure/tradeoff scenario.</p>' +
        '<div class="btn-row" style="margin-top:12px;"><button id="spacingApplyCustomScenario" class="btn btn-primary" type="button">Apply Custom Spacing Check</button></div>' +
      '</div>';
  }

  function spacingLensReadCustomInputs() {
    if (!els.assistant) return null;

    const values = {};
    els.assistant.querySelectorAll("[data-spacing-whatif]").forEach((input) => {
      values[input.dataset.spacingWhatif] = Number(input.value);
    });

    return values;
  }

  function spacingLensMakeCustomScenario(data, changes) {
    const len = Number.isFinite(Number(changes?.len)) ? Number(changes.len) : Number(data.len);
    const dist = Number.isFinite(Number(changes?.dist)) ? Number(changes.dist) : Number(data.dist);
    const hfov = Number.isFinite(Number(changes?.hfov)) ? Number(changes.hfov) : Number(data.hfov);
    const targetCams = Number.isFinite(Number(changes?.targetCams)) ? Math.max(1, Math.round(Number(changes.targetCams))) : Number(data.cams);

    let ovPct = Number.isFinite(Number(changes?.ovPct)) ? Number(changes.ovPct) : Number(data.ovPct);

    const rawWidth = 2 * Math.tan((hfov / 2) * Math.PI / 180) * dist;

    if (targetCams !== Number(data.cams)) {
      const targetOverlap = spacingOverlapForTargetCameraCount({ ...data, len, dist, hfov, rawWidth }, targetCams, 0.9);
      if (Number.isFinite(targetOverlap)) ovPct = targetOverlap;
    }

    if (targetCams <= 1) ovPct = 0;

    const usableWidth = rawWidth * (1 - (ovPct / 100));

    if (!Number.isFinite(rawWidth) || !Number.isFinite(usableWidth) || usableWidth <= 0) {
      return null;
    }

    const cams = targetCams;
    const spacing = len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;
    const singleCamera = cams <= 1;

    return {
      id: "custom-spacing-check",
      label: "Custom Spacing Check",
      intent: "User-defined spacing correction using target camera count and geometry assumptions.",
      actionLabel: "Apply Custom Spacing Check",
      canApply: true,
      changes: { len, dist, hfov, ovPct, targetCams },
      targetCams,
      singleCamera,
      len,
      dist,
      hfov,
      ovPct,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass: classifySpacing(ratio),
      note: "Use when preset branches do not match the real project constraint."
    };
  }

    function factorySpacingOverlapForTargetCams(data, targetCams, ratioTarget = 0.9) {
    const cams = Number(targetCams);
    const len = Number(data?.len);
    const rawWidth = Number(data?.rawWidth);

    if (!Number.isFinite(cams) || cams < 1 || !Number.isFinite(len) || len <= 0 || !Number.isFinite(rawWidth) || rawWidth <= 0) {
      return null;
    }

    const spacing = len / cams;
    const desiredUsableWidth = spacing / ratioTarget;
    const ovPct = (1 - (desiredUsableWidth / rawWidth)) * 100;

    if (!Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95) return null;
    return ovPct;
  }

  function factorySpacingScenario(data, id, label, intent, changes, note, actionLabel, canApply = true) {
    const len = Number.isFinite(Number(changes?.len)) ? Number(changes.len) : Number(data.len);
    const dist = Number.isFinite(Number(changes?.dist)) ? Number(changes.dist) : Number(data.dist);
    const hfov = Number.isFinite(Number(changes?.hfov)) ? Number(changes.hfov) : Number(data.hfov);
    let ovPct = Number.isFinite(Number(changes?.ovPct)) ? Number(changes.ovPct) : Number(data.ovPct);
    const hasExplicitTargetCams = Number.isFinite(Number(changes?.targetCams));
    const targetCams = hasExplicitTargetCams ? Math.max(1, Math.round(Number(changes.targetCams))) : null;

    if (targetCams <= 1) ovPct = 0;

    const rawWidth = 2 * Math.tan((hfov / 2) * Math.PI / 180) * dist;
    const usableWidth = rawWidth * (1 - (ovPct / 100));

    if (!canApply || !Number.isFinite(rawWidth) || rawWidth <= 0 || !Number.isFinite(usableWidth) || usableWidth <= 0) {
      return {
        id,
        label,
        pillLabel: label,
        intent,
        note,
        actionLabel: actionLabel || "Unavailable",
        canApply: false,
        changes: changes || {},
        summary: "Unavailable for current geometry"
      };
    }

    const cams = Math.max(1, Math.ceil(len / usableWidth));
    const spacing = len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;
    const spacingClass = classifySpacing(ratio);
    const singleCamera = cams <= 1;

    return {
      id,
      label,
      pillLabel: label,
      intent,
      note,
      actionLabel,
      canApply: true,
      changes: changes || {},
      targetCams,
      singleCamera,
      len,
      dist,
      hfov,
      ovPct,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass,
      summary: [
        cams + " camera" + (cams === 1 ? "" : "s"),
        singleCamera ? fmtFt(spacing) + " coverage check" : fmtFt(spacing) + " spacing",
        singleCamera ? "overlap N/A" : fmtPct(ovPct, 1) + " overlap"
      ].join(" | ")
    };
  }

  function factorySpacingPressureMetrics(data) {
    const ratio = Number(data?.ratio);
    const ovPct = Number(data?.ovPct);
    const cams = Number(data?.cams);
    const singleCamera = cams <= 1 || data?.singleCamera;

    const gap = singleCamera ? 0 : (ratio > 0.92 ? Math.min((ratio - 0.92) * 220, 100) : 0);
    const compression = singleCamera ? 0 : (ratio < 0.72 ? Math.min((0.72 - ratio) * 180, 100) : 0);
    const overlap = singleCamera ? 0 : (Number.isFinite(ovPct) ? Math.min(Math.max(ovPct, 0), 100) * 0.72 : 0);
    const camera = singleCamera ? 0 : (Number.isFinite(cams) ? Math.min(Math.max((cams - 1) * 10, 0), 100) : 0);

    return { gap, compression, overlap, camera };
  }

  function factorySpacingPressureScore(data) {
    const m = factorySpacingPressureMetrics(data);
    return Math.max(m.gap, m.compression, m.overlap, m.camera);
  }

  function factorySpacingScenarioChartSvg(data, scenarios) {
    const candidates = [{ label: "Custom Design", score: factorySpacingPressureScore(data) }];

    scenarios.filter((scenario) => scenario && scenario.canApply).slice(0, 4).forEach((scenario) => {
      candidates.push({ label: scenario.pillLabel || scenario.label, score: factorySpacingPressureScore(scenario) });
    });

    const width = 900;
    const height = 250;
    const left = 64;
    const right = 36;
    const top = 28;
    const bottom = 52;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const xStep = candidates.length > 1 ? plotW / (candidates.length - 1) : plotW;

    const points = candidates.map((item, index) => {
      const x = left + (xStep * index);
      const y = top + plotH - ((Math.max(0, Math.min(100, item.score)) / 100) * plotH);
      return { x, y };
    });

    const polyline = points.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");

    return '' +
      '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Planning pressure by scenario">' +
        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + plotH + '" fill="rgba(125,255,152,.08)"></rect>' +
        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + (plotH * .62).toFixed(1) + '" fill="rgba(255,211,79,.08)"></rect>' +
        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + (plotH * .34).toFixed(1) + '" fill="rgba(255,96,88,.09)"></rect>' +
        '<text x="' + (width - right) + '" y="' + (top + 12) + '" text-anchor="end" fill="rgba(226,232,240,.75)" font-size="12" font-weight="800">Lower is better</text>' +
        '<polyline points="' + polyline + '" fill="none" stroke="#7dff98" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
        points.map((p, index) => {
          const item = candidates[index];
          const score = Math.round(item.score);
          const fill = score <= 25 ? "#7dff98" : score <= 60 ? "#ffd34f" : "#ff8f88";

          return '' +
            '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="' + fill + '" stroke="rgba(255,255,255,.80)" stroke-width="2"></circle>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 16).toFixed(1) + '" text-anchor="middle" fill="' + fill + '" font-size="13" font-weight="950">' + score + '</text>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (height - 20) + '" text-anchor="middle" fill="rgba(226,232,240,.82)" font-size="11" font-weight="800">' + escapeHtml(item.label.slice(0, 18)) + '</text>';
        }).join("") +
      '</svg>';
  }

  function factorySpacingProblemLabel(data) {
    if (Number(data.cams) <= 1 || data.singleCamera) return "Single-camera coverage check";
    if (data.spacingClass === "Wide Spacing") return "Spacing gap risk";
    if (data.spacingClass === "Tight Spacing") return "Camera count pressure";
    if (Number(data.ovPct) >= 35) return "High overlap efficiency pressure";
    if (Number(data.ovPct) >= 25) return "Elevated overlap";
    return "Spacing balance";
  }

  function factorySpacingRecommendation(data) {
    if (Number(data.cams) <= 1 || data.singleCamera) {
      return "Camera-to-camera overlap is not applicable for a one-camera area. Continue to Blind Spot Check to validate edge margin and remaining gap risk.";
    }
    if (data.spacingClass === "Wide Spacing") {
      return "Reduce spacing pressure by shortening spacing, increasing camera count, or revisiting upstream geometry before Blind Spot Check.";
    }
    if (data.spacingClass === "Tight Spacing") {
      return "This is likely safe for continuity, but review whether the layout is using more cameras than the project requires.";
    }
    if (Number(data.ovPct) >= 35) {
      return "Spacing continuity passes, but the overlap target is high. Treat this as a valid but camera-heavy branch unless the project intentionally needs redundant shared coverage.";
    }
    if (Number(data.ovPct) >= 25) {
      return "The spacing works, but overlap is elevated. Confirm the target is intentional before carrying it forward.";
    }
    return "This scenario is within current planning guardrails. Validate the field gap condition in Blind Spot Check before relying on it.";
  }

    let customAssistantNotice = null;

  function factorySpacingMakeCustomScenario(data, values) {
    const len = Number.isFinite(Number(values?.len)) ? Number(values.len) : Number(data.len);
    const dist = Number.isFinite(Number(values?.dist)) ? Number(values.dist) : Number(data.dist);
    const hfov = Number.isFinite(Number(values?.hfov)) ? Number(values.hfov) : Number(data.hfov);
    const targetCams = Number.isFinite(Number(values?.targetCams)) ? Math.max(1, Math.round(Number(values.targetCams))) : Number(data.cams);

    let ovPct = Number.isFinite(Number(values?.ovPct)) ? Number(values.ovPct) : Number(data.ovPct);

    const disabled = (reason) => ({
      id: "custom-spacing-check",
      label: "Custom What-If",
      intent: "User-defined spacing correction using target camera count and geometry assumptions.",
      actionLabel: "Apply Custom Spacing Check",
      canApply: false,
      disabledReason: reason,
      changes: { len, dist, hfov, ovPct, targetCams },
      summary: reason,
      note: reason
    });

    if (
      !Number.isFinite(len) || len <= 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return disabled("Custom spacing values are outside the valid input range.");
    }

    const rawWidth = 2 * Math.tan((hfov / 2) * Math.PI / 180) * dist;

    if (!Number.isFinite(rawWidth) || rawWidth <= 0) {
      return disabled("Current distance and HFOV do not produce a usable camera width.");
    }

    const minimumCamsAtZeroOverlap = Math.max(1, Math.ceil(len / rawWidth));

    if (targetCams < minimumCamsAtZeroOverlap) {
      return disabled(
        "Target of " + targetCams + " camera" + (targetCams === 1 ? "" : "s") +
        " is not viable with the current protected length, distance, and HFOV. " +
        "Even at 0.0% overlap, this geometry needs at least " +
        minimumCamsAtZeroOverlap + " camera" + (minimumCamsAtZeroOverlap === 1 ? "" : "s") +
        ". Increase distance, widen HFOV, shorten the protected run, or accept at least " +
        minimumCamsAtZeroOverlap + " camera" + (minimumCamsAtZeroOverlap === 1 ? "" : "s") + "."
      );
    }

    if (targetCams !== Number(data.cams)) {
      const targetOverlap = factorySpacingOverlapForTargetCams({ ...data, len, dist, hfov, rawWidth }, targetCams, 0.9);

      if (!Number.isFinite(targetOverlap)) {
        return disabled(
          "Target of " + targetCams + " camera" + (targetCams === 1 ? "" : "s") +
          " cannot be produced cleanly from overlap alone with the current geometry. " +
          "Revise distance, HFOV, or protected length before applying this target."
        );
      }

      ovPct = targetOverlap;
    }

    const scenario = factorySpacingScenario(
      data,
      "custom-spacing-check",
      targetCams !== Number(data.cams) ? "Custom: " + targetCams + " Cameras" : "Custom What-If",
      "User-defined spacing correction using target camera count and geometry assumptions.",
      { len, dist, hfov, ovPct, targetCams },
      "Use when preset branches do not match the real project constraint.",
      "Apply Custom Spacing Check",
      true
    );

    scenario.targetCams = targetCams;
    scenario.requestedTargetCams = targetCams;

    return scenario;
  }

    function factorySpacingResultSummary(model) {
    if (!model || model.canApply === false) return "Unavailable";

    const singleCamera = Number(model.cams) <= 1 || model.singleCamera || Number(model.targetCams) <= 1;

    return [
      Number.isFinite(model.cams) ? model.cams + " camera" + (model.cams === 1 ? "" : "s") : null,
      Number.isFinite(model.spacing) ? (singleCamera ? fmtFt(model.spacing) + " coverage check" : fmtFt(model.spacing) + " spacing") : null,
      singleCamera ? "overlap N/A" : (Number.isFinite(model.ovPct) ? fmtPct(model.ovPct, 1) + " overlap" : null)
    ].filter(Boolean).join(" | ");
  }

  function factorySpacingBestScenario(data, scenarios) {
    const currentPressure = factorySpacingPressureScore(data);
    const viable = (scenarios || [])
      .filter((scenario) => scenario && scenario.canApply)
      .map((scenario) => ({ scenario, pressure: factorySpacingPressureScore(scenario) }))
      .sort((a, b) => a.pressure - b.pressure);

    const clearlyBetter = viable.find((item) => item.pressure < currentPressure - 1);
    return clearlyBetter ? clearlyBetter.scenario : viable[0]?.scenario || null;
  }

  function factorySpacingPrimaryRecommendation(data, scenarios) {
    const currentPressure = factorySpacingPressureScore(data);
    const currentSummary = factorySpacingResultSummary(data);
    const bestScenario = factorySpacingBestScenario(data, scenarios);
    const bestSummary = bestScenario ? factorySpacingResultSummary(bestScenario) : currentSummary;

    if (Number(data.cams) <= 1 || data.singleCamera) {
      return {
        scenarioId: "current",
        action: "Keep Single-Camera Coverage Check",
        buttonLabel: "Keep Current Baseline",
        reason: "This area is using one camera, so camera-to-camera overlap pressure is not applicable.",
        expectedResult: currentSummary,
        confidence: "Single-camera validation",
        nextStep: "Blind Spot Check",
        detail: "Validate the usable footprint, edge margin, and any remaining blind-zone risk downstream instead of treating overlap as an adjacent-camera requirement."
      };
    }

    if (data.status === "HEALTHY" && data.spacingClass !== "Wide Spacing") {
      return {
        scenarioId: "current",
        action: "Keep Current Baseline",
        buttonLabel: "Keep Current Baseline",
        reason: "Actual spacing is inside the usable coverage width and the camera-to-camera overlap target is not forcing a correction.",
        expectedResult: currentSummary,
        confidence: "No correction required",
        nextStep: "Blind Spot Check",
        detail: "The assistant is not recommending a change because the current spacing path is already acceptable for downstream blind-spot validation."
      };
    }

    if (bestScenario && factorySpacingPressureScore(bestScenario) < currentPressure - 1) {
      const action = bestScenario.label || bestScenario.actionLabel || "Apply Recommended Correction";

      return {
        scenarioId: bestScenario.id,
        action,
        buttonLabel: bestScenario.actionLabel || action,
        reason: data.spacingClass === "Wide Spacing"
          ? "Actual spacing is too close to the usable coverage width. This is the best local correction the assistant can model from the current inputs."
          : data.spacingClass === "Tight Spacing"
            ? "The current design is conservative and camera-count pressure is higher than necessary. This correction improves balance without hiding the tradeoff."
            : "This correction produces the lowest planning pressure among the available local spacing branches.",
        expectedResult: bestSummary,
        confidence: "Best local correction",
        nextStep: "Validate in Blind Spot Check",
        detail: "This recommendation is shown before secondary options so the user has a clear primary path instead of a list of equal guesses."
      };
    }

    return {
      scenarioId: null,
      action: "Review Upstream Geometry",
      reason: "The local spacing branches do not clearly improve this result because the outcome depends on upstream protected length, distance, HFOV, and overlap assumptions.",
      expectedResult: "Review Coverage Area if the protected run, HFOV, or usable width should change before using this spacing result downstream.",
      confidence: "Upstream review recommended",
      nextStep: "Review Coverage Area",
      detail: "No one-click spacing correction is being applied because this result depends on upstream coverage assumptions. Continue if those assumptions are intentional, or review Coverage Area to change protected length, HFOV, or usable width."
    };
  }



  function factoryCameraSpacingAssistantModel(data) {
    const scenarios = latestAssistantScenarios || [];
    const m = factorySpacingPressureMetrics(data);
    const pressure = Math.round(factorySpacingPressureScore(data));
    const active = activeAssistantScenario ? activeAssistantScenario.id : "current";
    const selectedPath = activeAssistantScenario ? activeAssistantScenario.label : "Custom Design";
    const singleCamera = Number(data.cams) <= 1 || data.singleCamera;
    const actualOverlapPct = !singleCamera && Number(data.rawWidth) > 0
      ? Math.max(0, ((Number(data.rawWidth) - Number(data.spacing)) / Number(data.rawWidth)) * 100)
      : 0;
    const highOverlap = !singleCamera && (Number(data.ovPct) >= 35 || actualOverlapPct >= 45);

    const coverageCheck = data.spacingClass === "Wide Spacing"
      ? "No - spacing is too close to the usable limit"
      : highOverlap
        ? "Yes - spacing passes with high overlap"
        : "Yes - spacing is inside the usable range";

    const reserveCheck = singleCamera
      ? "Not applicable - one camera"
      : highOverlap
        ? "High overlap - valid but inefficient"
        : data.spacingClass === "Tight Spacing"
          ? "Conservative - camera-heavy"
          : data.ovPct >= 25
            ? "Elevated overlap - review efficiency"
            : "Practical overlap";

    const designPath = data.spacingClass === "Wide Spacing"
      ? "Apply correction before Blind Spot"
      : highOverlap
        ? "Validate downstream or reduce camera count"
        : "Continue to Blind Spot validation";

    return {
      mount: els.assistant,
      kicker: "Design Assistant",
      title: "Camera spacing design path",
      copy: "This module uses the shared Lens-style assistant shell while keeping Camera Spacing math, inputs, outputs, and downstream handoff.",
      status: data.status,
      currentScenarioId: active,
      currentLabel: "Custom Design",
      scenarios,
      modeNoticeHtml: assistantModeHtml() + (customAssistantNotice ? '<div class="flow-override-note"><strong>Custom target not applied:</strong> ' + escapeHtml(customAssistantNotice) + '</div>' : ""),
      recommendation: factorySpacingPrimaryRecommendation(data, scenarios),
      custom: {
        kicker: "Custom planning assumptions",
        title: "Edit the spacing assumptions without leaving the assistant",
        copy: singleCamera ? "Use these controls to test perimeter length, target camera count, distance, HFOV, and overlap assumptions. Overlap becomes camera-to-camera only when Target Cameras is 2 or more." : "Use these controls to test perimeter length, target camera count, distance, HFOV, and overlap before carrying the result into Blind Spot Check.",
        pill: "Custom What-If",
        buttonLabel: "Apply Custom Spacing Check",
        inputs: [
          { key: "len", label: "Perimeter Length", value: Number(data.len || 0).toFixed(0), min: 1, step: 1 },
          { key: "targetCams", label: "Target Cameras", value: Number(data.cams || 1).toFixed(0), min: 1, step: 1 },
          { key: "dist", label: "Distance", value: Number(data.dist || 0).toFixed(1), min: 0.1, step: 0.1 },
          { key: "hfov", label: "HFOV", value: Number(data.hfov || 0).toFixed(1), min: 1, max: 179, step: 0.1 },
          { key: "ovPct", label: "Overlap Target", value: Number(data.ovPct || 0).toFixed(1), min: 0, max: 95, step: 0.1 }
        ]
      },
      selectedResult: {
        kicker: "Selected scenario result",
        title: data.cams + " camera" + (data.cams === 1 ? "" : "s"),
        copy: singleCamera
          ? "This is a single-camera coverage check. Actual camera-to-camera spacing is not applicable; compare protected length against usable width instead."
          : highOverlap
            ? "This spacing plan passes continuity, but overlap is high. Treat it as a valid camera-heavy branch unless the project intentionally needs extra shared coverage."
            : "This spacing plan uses " + fmtFt(data.spacing) + " actual spacing against " + fmtFt(data.usableWidth) + " usable width.",
        metrics: [
          { label: singleCamera ? "Protected run" : "Actual spacing", value: singleCamera ? fmtFt(data.len) : fmtFt(data.spacing), note: singleCamera ? "Single-camera span." : "Center spacing." },
          { label: "Usable width", value: fmtFt(data.usableWidth), note: singleCamera ? "After coverage reserve." : "After overlap." },
          { label: singleCamera ? "Overlap reference" : "Overlap", value: singleCamera ? "N/A" : fmtPct(data.ovPct, 1), note: singleCamera ? "No adjacent camera." : "Current target." },
          { label: "Status", value: data.status, note: "Combined status." }
        ]
      },
      driver: {
        kicker: "Dominant driver",
        title: singleCamera ? "Single-camera coverage check" : highOverlap ? "High overlap is creating efficiency pressure." : factorySpacingProblemLabel(data) + " is creating planning pressure.",
        copy: singleCamera
          ? "This area has one camera, so adjacent-camera overlap pressure is not scored. Validate usable width, reserve margin, and blind spots instead."
          : highOverlap
            ? "Spacing continuity passes, but the current branch uses heavy shared coverage. That can be valid for critical zones, but it may overuse cameras or reduce layout efficiency."
            : "The bars show which spacing condition is pushing the current result toward Watch or Risk.",
        bars: singleCamera ? [
          { label: "Protected run", value: 0, display: fmtFt(data.len) },
          { label: "Usable width", value: 0, display: fmtFt(data.usableWidth) },
          { label: "Overlap pressure", value: 0, display: "N/A" },
          { label: "Camera count pressure", value: 0, display: "1 camera" }
        ] : [
          { label: "Gap exposure", value: m.gap, display: fmtPct(Math.max((data.ratio - 0.92) * 100, 0), 1) },
          { label: "Spacing compression", value: m.compression, display: fmtPct(Math.max((0.72 - data.ratio) * 100, 0), 1) },
          { label: "Overlap pressure", value: m.overlap, display: fmtPct(data.ovPct, 1) },
          { label: "Camera count pressure", value: m.camera, display: String(data.cams) + " cameras" }
        ]
      },
      visual: {
        kicker: "FOV / coverage layout",
        title: singleCamera
          ? "1 camera | " + fmtFt(data.len) + " protected run | overlap N/A"
          : data.cams + (data.cams === 1 ? " camera" : " cameras") + " | " + fmtFt(data.spacing) + " spacing | " + fmtPct(data.ovPct, 1) + " overlap",
        copy: singleCamera
          ? "Protected run is compared against usable camera width. Camera-to-camera overlap is not applied because there is no adjacent camera."
          : "Actual spacing is compared against usable camera width after camera-to-camera overlap target is applied.",
        html: spacingVisualSvg(data),
        metrics: []
      },
      checks: [
        { kicker: "Coverage check", title: coverageCheck, copy: highOverlap ? "Spacing stays inside the usable footprint, but the layout is doing that by carrying a lot of shared coverage." : "Does spacing stay inside the effective usable footprint?" },
        { kicker: singleCamera ? "Single-camera check" : "Overlap check", title: reserveCheck, copy: singleCamera ? "Camera-to-camera overlap is not applicable without an adjacent camera." : highOverlap ? "The overlap target is helping continuity, but it is also making the branch camera-heavy. Keep it only if that redundancy is intentional." : "Is the camera-to-camera overlap target helping continuity without over-compressing layout?" },
        { kicker: "Design path", title: designPath, copy: highOverlap ? "Continue to Blind Spot validation if the redundancy is intentional, or test fewer cameras / lower overlap if efficiency matters." : "Use this to decide whether to correct now or validate downstream." }
      ],
      targets: {
        kicker: "Design targets / path to acceptable",
        title: "What needs to change to reach a usable design?",
        copy: singleCamera ? "This section explains whether the single camera has enough usable footprint, or whether distance, HFOV, protected length, or detail assumptions need to change." : "This section explains whether changing overlap is enough, or whether the real blocker is distance, HFOV, protected length, or camera count.",
        pill: "Design Targets",
        metrics: [
          { label: "Max spacing / camera", value: fmtFt(data.usableWidth), note: "Actual spacing should stay at or below this." },
          { label: "Suggested cameras", value: String(data.cams), note: "Based on usable width and protected run." },
          { label: singleCamera ? "Overlap reference" : "Overlap", value: singleCamera ? "N/A" : fmtPct(data.ovPct, 1), note: singleCamera ? "No adjacent camera." : "Current target." },
          { label: "Main blocker", value: factorySpacingProblemLabel(data), note: "Primary condition shaping this scenario." }
        ],
        banner: highOverlap
          ? "Spacing continuity can pass while still being inefficient. This branch is valid for redundancy, but review camera count or overlap target if efficiency matters."
          : data.status === "HEALTHY"
            ? "This scenario is within current planning guardrails. Validate blind spots before relying on it."
            : "This scenario needs correction or downstream validation before it should be treated as healthy."
      },
      comparison: {
        kicker: "Scenario comparison",
        title: "Scenario pressure comparison",
        copy: singleCamera ? "The chart shows this as a single-camera validation path. Lower pressure means overlap is not being treated as an adjacent-camera requirement." : "The chart compares planning pressure across available spacing paths. Lower is better; healthy spacing and useful reserve should stay near the bottom band.",
        pill: "Scenario Analytics",
        metrics: [
          { label: "Selected path", value: selectedPath, note: "Scenario currently selected." },
          { label: "Spacing class", value: data.spacingClass, note: "Current spacing classification." },
          { label: "Coverage status", value: data.status, note: "Status from the current model." },
          { label: "Pressure", value: pressure + " / 100", note: "Scenario comparison value." }
        ],
        chartHtml: factorySpacingScenarioChartSvg(data, scenarios),
        banner: factorySpacingRecommendation(data)
      },
      controls: {
        kicker: "Correction controls",
        title: "Choose a spacing path",
        copy: activeAssistantScenario
        ? "Secondary options are recalculated from the currently selected branch, so Add 1 Camera adds to the active scenario instead of stacking from the original baseline."
        : "Secondary options remain available below the primary recommendation. Use them only when the project priority differs from the assistant selected path.",
        pill: "Correction Path"
      },
      carryForward: {
        kicker: "Pipeline / report carry-forward",
        title: "Use the selected scenario in the next sanity check",
        copy: singleCamera ? "Blind Spot Check should validate the usable footprint, edge margin, distance, and HFOV before the single-camera layout is treated as reliable." : "Blind Spot Check should validate the selected camera count, spacing, overlap, distance, and HFOV before the layout is treated as reliable.",
        pill: "Live Shadow Path",
        metrics: [
          { label: "Cameras", value: String(data.cams), note: "Sent to Blind Spot Check." },
          { label: "Spacing", value: fmtFt(data.spacing), note: "Center-to-center spacing." },
          { label: "Distance", value: fmtFt(data.dist), note: "Target-plane distance." },
          { label: "HFOV", value: fmt(data.hfov, 1) + " deg", note: "Horizontal field of view." }
        ]
      },
      onSelectCurrent: () => { restoreSpacingAssistantBaseline(); },
      onApplyScenario: applyAssistantScenario,
      onApplyCustom: (values) => {
        const scenario = factorySpacingMakeCustomScenario(data, values);

        if (!scenario) return;

        if (scenario.canApply === false) {
          customAssistantNotice = scenario.disabledReason || scenario.note || "That custom target is not viable with the current geometry.";
          renderSpacingAssistant(data);
          return;
        }

        customAssistantNotice = null;
        applyAssistantScenario(scenario);
      }
    };
  }

    let assistantBaselineData = null;

  function snapshotSpacingAssistantData(data) {
    if (!data || typeof data !== "object") return null;

    return {
      ...data,
      len: Number(data.len),
      dist: Number(data.dist),
      hfov: Number(data.hfov),
      ovPct: Number(data.ovPct),
      rawWidth: Number(data.rawWidth),
      usableWidth: Number(data.usableWidth),
      cams: Number(data.cams),
      spacing: Number(data.spacing),
      ratio: Number(data.ratio),
      spacingClass: data.spacingClass,
      status: data.status
    };
  }

  function setSpacingAssistantBaseline(data) {
    if (!assistantBaselineData || !activeAssistantScenario) {
      assistantBaselineData = snapshotSpacingAssistantData(data);
    }
  }

  function getSpacingAssistantScenarioBase(data) {
    return snapshotSpacingAssistantData(assistantBaselineData || data);
  }

  function getSpacingAssistantBranchBase(data) {
    if (activeAssistantScenario && data) {
      return snapshotSpacingAssistantData(data);
    }

    return getSpacingAssistantScenarioBase(data);
  }

  function restoreSpacingAssistantBaseline() {
    const base = getSpacingAssistantScenarioBase(null);

    if (!base) {
      activeAssistantScenario = null;
      calc();
      return;
    }

    activeAssistantScenario = null;

    if (els.len && Number.isFinite(base.len)) els.len.value = String(Number(base.len.toFixed(1)));
    if (els.dist && Number.isFinite(base.dist)) els.dist.value = String(Number(base.dist.toFixed(1)));
    if (els.hfov && Number.isFinite(base.hfov)) els.hfov.value = String(Number(base.hfov.toFixed(1)));
    if (els.ov && Number.isFinite(base.ovPct)) els.ov.value = String(Number(base.ovPct.toFixed(1)));

    renderFlowNote();
    calc();
  }



  function buildAssistantScenarios(data) {
    const scenarios = [];

    const addOneTarget = data.cams + 1;
    const addOneOverlap = factorySpacingOverlapForTargetCams(data, addOneTarget, 0.9);
    scenarios.push(factorySpacingScenario(
      data,
      "add-one-camera",
      "Add 1 Camera",
      "Test whether increasing the camera count improves continuity and reduces gap pressure before Blind Spot Check.",
      Number.isFinite(addOneOverlap) ? { ovPct: addOneOverlap, targetCams: addOneTarget } : {},
      Number.isFinite(addOneOverlap)
        ? "Use when spacing is too wide, seam closure matters, or the current layout feels too close to the usable-width limit."
        : "Adding one camera cannot be modeled from overlap alone with the current geometry. Revisit distance, HFOV, or protected length.",
      "Apply: " + addOneTarget + " Cameras",
      Number.isFinite(addOneOverlap)
    ));

    const addTwoTarget = data.cams + 2;
    const addTwoOverlap = factorySpacingOverlapForTargetCams(data, addTwoTarget, 0.9);
    scenarios.push(factorySpacingScenario(
      data,
      "add-two-cameras",
      "Add 2 Cameras",
      "Test a stronger continuity branch when the design needs more seam reserve or shorter spacing intervals.",
      Number.isFinite(addTwoOverlap) ? { ovPct: addTwoOverlap, targetCams: addTwoTarget } : {},
      Number.isFinite(addTwoOverlap)
        ? "Use when the current spacing is risky and one added camera still does not create enough margin."
        : "Adding two cameras cannot be modeled from overlap alone with the current geometry.",
      "Apply: " + addTwoTarget + " Cameras",
      Number.isFinite(addTwoOverlap)
    ));

    const balancedOverlap = factorySpacingOverlapForTargetCams(data, data.cams, 0.88);
    scenarios.push(factorySpacingScenario(
      data,
      "balanced-layout",
      "Balanced Layout",
      "Keep the same camera count while moving camera-to-camera overlap target toward a practical middle range.",
      Number.isFinite(balancedOverlap) ? { ovPct: balancedOverlap, targetCams: data.cams } : { ovPct: data.ovPct, targetCams: data.cams },
      "Use as the default correction when the goal is a clean handoff to Blind Spot Check without over-compressing spacing.",
      "Apply Balanced Layout",
      true
    ));

    const efficiencyTarget = data.cams > 1 ? data.cams - 1 : null;
    const efficiencyOverlap = efficiencyTarget ? factorySpacingOverlapForTargetCams(data, efficiencyTarget, 0.95) : null;
    const efficiencyChanges = Number.isFinite(efficiencyOverlap)
      ? { ovPct: efficiencyTarget <= 1 ? 0 : efficiencyOverlap, targetCams: efficiencyTarget }
      : {};
    scenarios.push(factorySpacingScenario(
      data,
      "camera-count-efficiency",
      "Efficiency Check",
      "Test whether the protected run can stay viable with fewer cameras.",
      efficiencyChanges,
      Number.isFinite(efficiencyOverlap)
        ? (efficiencyTarget <= 1 ? "Use only as a single-camera coverage validation. Overlap is treated as N/A until another adjacent camera exists." : "Use only when reducing camera count matters and Blind Spot Check still confirms continuity.")
        : "Dropping a camera is not viable from the current geometry without changing upstream assumptions or accepting gap risk.",
      efficiencyTarget ? "Apply: " + efficiencyTarget + " Camera" + (efficiencyTarget === 1 ? "" : "s") : "Unavailable",
      Number.isFinite(efficiencyOverlap)
    ));

    const widerHfov = Math.min(179, data.hfov * 1.1);
    scenarios.push(factorySpacingScenario(
      data,
      "wider-hfov-check",
      "Wider HFOV Check",
      "Model the effect of a wider effective view to increase usable footprint before Blind Spot validation.",
      { hfov: widerHfov, targetCams: data.cams },
      "Use only when the camera/lens choice can actually support a wider view without breaking detail requirements.",
      "Apply Wider HFOV Check",
      widerHfov > data.hfov && widerHfov < 180
    ));

    return scenarios;
  }

  function assistantStatusCopy(data) {
    if (data.spacingClass === "Wide Spacing") {
      return "Risk: spacing is outrunning the usable footprint. Increase continuity before downstream validation.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return "Watch: the layout is conservative. It may be safe, but camera count pressure is higher than necessary.";
    }

    return "Healthy: spacing, usable width, and reserve are working together in a practical range.";
  }

  function recommendationForAssistant(data, scenarios) {
    const continuity = scenarios.find((item) => item.id === "continuity-priority");
    const balanced = scenarios.find((item) => item.id === "balanced-layout");
    const efficiency = scenarios.find((item) => item.id === "camera-count-efficiency");

    if (data.spacingClass === "Wide Spacing") {
      return continuity && continuity.canApply
        ? "Recommendation: apply Continuity Priority before continuing. Wide spacing should not be treated as clean pipeline truth until Blind Spot Check confirms the seams."
        : "Recommendation: do not continue as a final layout yet. Recalculate upstream with a wider usable footprint, shorter distance, or additional cameras.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return efficiency && efficiency.canApply
        ? "Recommendation: keep the current conservative result if risk tolerance is low, or test Camera Count Efficiency if budget and device count are the dominant constraints."
        : "Recommendation: keep the conservative branch. Efficiency pressure exists, but the current geometry does not support a clean camera-count reduction through overlap alone.";
    }

    return balanced && balanced.canApply
      ? "Recommendation: use the Balanced Layout branch or continue with the current result. Blind Spot Check is still required before treating the layout as final."
      : "Recommendation: continue with the current result, then use Blind Spot Check to verify coverage continuity under the real layout geometry.";
  }

function assistantStatusClass(data) {
    if (data.spacingClass === "Balanced Spacing") return "healthy";
    if (data.spacingClass === "Tight Spacing") return "watch";
    return "risk";
  }

  function assistantStatusLabel(data) {
    if (data.spacingClass === "Balanced Spacing") return "Healthy";
    if (data.spacingClass === "Tight Spacing") return "Watch";
    return "Risk";
  }

  function assistantModeHtml() {
    if (!activeAssistantScenario) return "";

    const copy = hasPipelineBaseline()
      ? "<strong>Custom Design Mode Active:</strong> " + escapeHtml(activeAssistantScenario.label) + " is being used as an assisted camera-spacing branch for downstream Blind Spot validation."
      : "<strong>Standalone Design Mode Active:</strong> This assisted scenario was created without upstream pipeline values. Results are valid as a single validation scenario, not a full guided pipeline run.";

    return '<div class="spacing-mode-note" role="note" aria-label="Design assistant mode">' + copy + '</div>';
  }

  function hideSpacingAssistant() {
    if (els.assistant) {
      els.assistant.hidden = true;
      els.assistant.innerHTML = "";
    }

    if (els.assistantDiagnosis) els.assistantDiagnosis.innerHTML = "";
    if (els.assistantBranches) els.assistantBranches.innerHTML = "";
    if (els.assistantRecommendation) els.assistantRecommendation.innerHTML = "";
    if (els.assistantModeNote) {
      els.assistantModeNote.hidden = true;
      els.assistantModeNote.innerHTML = "";
    }

    latestAssistantScenarios = [];
  }

  function spacingLegacyVisualSvg(data) {
    const singleCamera = Number(data?.cams) <= 1 || data?.singleCamera;
    const cameraCount = singleCamera ? 1 : Math.min(Math.max(Number(data?.cams) || 2, 2), 6);

    const svgW = 800;
    const svgH = 280;

    const axisX1 = 92;
    const axisX2 = 708;
    const axisW = axisX2 - axisX1;
    const axisY = 214;

    const cameraY = 84;
    const coneY = 162;
    const labelY = 44;

    const protectedLen = Math.max(Number(data?.len) || 1, 1);
    const usableFt = Math.max(Number(data?.usableWidth) || 1, 1);
    const spacingFt = Math.max(Number(data?.spacing) || protectedLen, 1);
    const overlapTargetPct = Math.max(0, Number(data?.ovPct) || 0);

    const overlapRatio = Math.min(overlapTargetPct / 100, 0.95);
    const rawWidthFt = singleCamera
      ? usableFt
      : Math.max(usableFt, usableFt / Math.max(1 - overlapRatio, 0.05));

    const targetOverlapFt = singleCamera
      ? 0
      : Math.max(0, rawWidthFt - usableFt);

    const actualOverlapFt = singleCamera
      ? 0
      : Math.max(0, rawWidthFt - spacingFt);

    const actualOverlapPct = singleCamera || rawWidthFt <= 0
      ? 0
      : (actualOverlapFt / rawWidthFt) * 100;

    const scale = axisW / protectedLen;
    const rawFootprintPx = Math.max(36, Math.min(axisW, rawWidthFt * scale));

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const cameraX = (index) => {
      if (singleCamera) return (axisX1 + axisX2) / 2;
      if (cameraCount === 2) return index === 0 ? axisX1 + axisW * 0.25 : axisX1 + axisW * 0.75;
      const step = axisW / (cameraCount - 1);
      return axisX1 + step * index;
    };

    const parts = [];

    parts.push(
      '<defs>' +
        '<linearGradient id="spacingConeFill" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="rgba(125,255,152,.03)" />' +
          '<stop offset="100%" stop-color="rgba(125,255,152,.10)" />' +
        '</linearGradient>' +
      '</defs>'
    );

    parts.push(
      '<line x1="' + axisX1 + '" y1="' + axisY + '" x2="' + axisX2 + '" y2="' + axisY + '" stroke="rgba(226,232,240,.28)" stroke-width="1.2" />' +
      '<line x1="' + axisX1 + '" y1="' + (axisY - 8) + '" x2="' + axisX1 + '" y2="' + (axisY + 8) + '" stroke="rgba(226,232,240,.30)" stroke-width="1" />' +
      '<line x1="' + axisX2 + '" y1="' + (axisY - 8) + '" x2="' + axisX2 + '" y2="' + (axisY + 8) + '" stroke="rgba(226,232,240,.30)" stroke-width="1" />' +
      '<text x="' + axisX1 + '" y="' + (axisY + 25) + '" text-anchor="middle" fill="rgba(226,232,240,.42)" font-size="11">0 ft</text>' +
      '<text x="' + axisX2 + '" y="' + (axisY + 25) + '" text-anchor="middle" fill="rgba(226,232,240,.42)" font-size="11">' + escapeHtml(fmtFt(data.len)) + '</text>' +
      '<text x="' + ((axisX1 + axisX2) / 2) + '" y="' + (axisY + 14) + '" text-anchor="middle" fill="rgba(226,232,240,.68)" font-size="12" font-weight="800">Protected run</text>'
    );

    const footprints = [];

    for (let i = 0; i < cameraCount; i += 1) {
      const cx = cameraX(i);
      const left = clamp(cx - rawFootprintPx / 2, axisX1, axisX2);
      const right = clamp(cx + rawFootprintPx / 2, axisX1, axisX2);

      footprints.push({ left, right, cx });

      parts.push(
        '<path d="M ' + cx.toFixed(1) + ' ' + cameraY + ' L ' + left.toFixed(1) + ' ' + coneY + ' L ' + right.toFixed(1) + ' ' + coneY + ' Z" fill="url(#spacingConeFill)" stroke="rgba(125,255,152,.34)" stroke-width="1.05" />' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cameraY + '" r="8.5" fill="rgba(8,18,12,.96)" stroke="rgba(125,255,152,.86)" stroke-width="1.7" />' +
        '<line x1="' + left.toFixed(1) + '" y1="' + (coneY - 8) + '" x2="' + left.toFixed(1) + '" y2="' + (coneY + 8) + '" stroke="rgba(125,255,152,.20)" stroke-width="1" />' +
        '<line x1="' + right.toFixed(1) + '" y1="' + (coneY - 8) + '" x2="' + right.toFixed(1) + '" y2="' + (coneY + 8) + '" stroke="rgba(125,255,152,.20)" stroke-width="1" />' +
        '<line x1="' + cx.toFixed(1) + '" y1="' + (cameraY + 10) + '" x2="' + cx.toFixed(1) + '" y2="' + coneY + '" stroke="rgba(226,232,240,.14)" stroke-width="1" stroke-dasharray="4 5" />' +
        '<text x="' + cx.toFixed(1) + '" y="' + labelY + '" text-anchor="middle" fill="rgba(226,232,240,.68)" font-size="11" font-weight="800">' + escapeHtml('Cam ' + (i + 1)) + '</text>'
      );
    }

    if (!singleCamera && footprints.length >= 2) {
      const a = footprints[0];
      const b = footprints[1];

      const targetPx = Math.max(0, targetOverlapFt * scale);
      const actualPx = Math.max(0, actualOverlapFt * scale);
      const centerX = (a.cx + b.cx) / 2;

      const targetLeft = clamp(centerX - targetPx / 2, axisX1, axisX2);
      const targetRight = clamp(centerX + targetPx / 2, axisX1, axisX2);

      const actualLeft = clamp(centerX - actualPx / 2, axisX1, axisX2);
      const actualRight = clamp(centerX + actualPx / 2, axisX1, axisX2);

      parts.push(
        '<line x1="' + a.cx.toFixed(1) + '" y1="118" x2="' + b.cx.toFixed(1) + '" y2="118" stroke="rgba(226,232,240,.24)" stroke-width="1" />' +
        '<line x1="' + a.cx.toFixed(1) + '" y1="112" x2="' + a.cx.toFixed(1) + '" y2="124" stroke="rgba(226,232,240,.28)" stroke-width="1" />' +
        '<line x1="' + b.cx.toFixed(1) + '" y1="112" x2="' + b.cx.toFixed(1) + '" y2="124" stroke="rgba(226,232,240,.28)" stroke-width="1" />' +
        '<text x="' + ((a.cx + b.cx) / 2).toFixed(1) + '" y="108" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="12" font-weight="800">Spacing: ' + escapeHtml(fmtFt(data.spacing)) + '</text>'
      );

      if (targetPx > 2) {
        parts.push(
          '<line x1="' + targetLeft.toFixed(1) + '" y1="150" x2="' + targetRight.toFixed(1) + '" y2="150" stroke="rgba(255,211,79,.82)" stroke-width="2" />' +
          '<line x1="' + targetLeft.toFixed(1) + '" y1="145" x2="' + targetLeft.toFixed(1) + '" y2="155" stroke="rgba(255,211,79,.82)" stroke-width="1" />' +
          '<line x1="' + targetRight.toFixed(1) + '" y1="145" x2="' + targetRight.toFixed(1) + '" y2="155" stroke="rgba(255,211,79,.82)" stroke-width="1" />' +
          '<text x="' + centerX.toFixed(1) + '" y="142" text-anchor="middle" fill="rgba(255,226,128,.88)" font-size="11" font-weight="800">Target overlap</text>'
        );
      }

      if (actualPx > 2) {
        parts.push(
          '<line x1="' + actualLeft.toFixed(1) + '" y1="168" x2="' + actualRight.toFixed(1) + '" y2="168" stroke="rgba(125,255,152,.88)" stroke-width="2" />' +
          '<line x1="' + actualLeft.toFixed(1) + '" y1="163" x2="' + actualLeft.toFixed(1) + '" y2="173" stroke="rgba(125,255,152,.88)" stroke-width="1" />' +
          '<line x1="' + actualRight.toFixed(1) + '" y1="163" x2="' + actualRight.toFixed(1) + '" y2="173" stroke="rgba(125,255,152,.88)" stroke-width="1" />' +
          '<text x="' + centerX.toFixed(1) + '" y="184" text-anchor="middle" fill="rgba(125,255,152,.82)" font-size="11" font-weight="800">Actual overlap achieved</text>'
        );
      }

      parts.push(
        '<text x="' + ((axisX1 + axisX2) / 2) + '" y="248" text-anchor="middle" fill="rgba(226,232,240,.58)" font-size="12">Usable width: ' + escapeHtml(fmtFt(data.usableWidth)) + ' | Target: ' + escapeHtml(fmtPct(overlapTargetPct, 1)) + ' | Actual: ' + escapeHtml(fmtPct(actualOverlapPct, 1)) + '</text>'
      );
    } else {
      const only = footprints[0];

      parts.push(
        '<line x1="' + only.left.toFixed(1) + '" y1="118" x2="' + only.right.toFixed(1) + '" y2="118" stroke="rgba(226,232,240,.24)" stroke-width="1" />' +
        '<line x1="' + only.left.toFixed(1) + '" y1="112" x2="' + only.left.toFixed(1) + '" y2="124" stroke="rgba(226,232,240,.28)" stroke-width="1" />' +
        '<line x1="' + only.right.toFixed(1) + '" y1="112" x2="' + only.right.toFixed(1) + '" y2="124" stroke="rgba(226,232,240,.28)" stroke-width="1" />' +
        '<text x="' + ((only.left + only.right) / 2).toFixed(1) + '" y="108" text-anchor="middle" fill="rgba(226,232,240,.72)" font-size="12" font-weight="800">Usable width: ' + escapeHtml(fmtFt(data.usableWidth)) + '</text>' +
        '<text x="' + ((axisX1 + axisX2) / 2) + '" y="248" text-anchor="middle" fill="rgba(255,211,79,.82)" font-size="12" font-weight="800">Single-camera coverage check | Overlap: N/A</text>'
      );
    }

    return '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" role="img" aria-label="Camera spacing visualization">' +
      parts.join('') +
    '</svg>';
  }


  function spacingNormalizeInterval(item) {
    if (!item || typeof item !== "object") return null;

    const startFt = Number(item.startFt);
    const endFt = Number(item.endFt);

    if (!Number.isFinite(startFt) || !Number.isFinite(endFt) || endFt <= startFt) return null;

    return {
      startFt,
      endFt,
      lengthFt: endFt - startFt
    };
  }

  function spacingMergeIntervals(intervals, spanFt) {
    const span = Math.max(1, Number(spanFt) || 1);

    const sorted = (Array.isArray(intervals) ? intervals : [])
      .map(spacingNormalizeInterval)
      .filter(Boolean)
      .map((item) => ({
        startFt: Math.max(0, Math.min(span, item.startFt)),
        endFt: Math.max(0, Math.min(span, item.endFt))
      }))
      .filter((item) => item.endFt > item.startFt)
      .sort((a, b) => a.startFt - b.startFt);

    const merged = [];

    sorted.forEach((item) => {
      const last = merged[merged.length - 1];

      if (!last || item.startFt > last.endFt) {
        merged.push({
          startFt: item.startFt,
          endFt: item.endFt,
          lengthFt: item.endFt - item.startFt
        });
        return;
      }

      last.endFt = Math.max(last.endFt, item.endFt);
      last.lengthFt = last.endFt - last.startFt;
    });

    return merged;
  }

  function spacingGapIntervals(mergedIntervals, spanFt) {
    const span = Math.max(1, Number(spanFt) || 1);
    const gaps = [];
    let cursor = 0;

    (Array.isArray(mergedIntervals) ? mergedIntervals : []).forEach((item) => {
      const startFt = Math.max(0, Math.min(span, Number(item.startFt) || 0));
      const endFt = Math.max(0, Math.min(span, Number(item.endFt) || 0));

      if (startFt > cursor) {
        gaps.push({
          startFt: cursor,
          endFt: startFt,
          lengthFt: startFt - cursor
        });
      }

      cursor = Math.max(cursor, endFt);
    });

    if (cursor < span) {
      gaps.push({
        startFt: cursor,
        endFt: span,
        lengthFt: span - cursor
      });
    }

    return gaps.filter((item) => item.lengthFt > 0.01);
  }

  function spacingOverlapIntervals(rawIntervals, spanFt) {
    const span = Math.max(1, Number(spanFt) || 1);

    const sorted = (Array.isArray(rawIntervals) ? rawIntervals : [])
      .map(spacingNormalizeInterval)
      .filter(Boolean)
      .sort((a, b) => a.startFt - b.startFt);

    const overlaps = [];

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const startFt = Math.max(0, Math.min(span, Math.max(sorted[i].startFt, sorted[i + 1].startFt)));
      const endFt = Math.max(0, Math.min(span, Math.min(sorted[i].endFt, sorted[i + 1].endFt)));

      if (endFt > startFt) {
        overlaps.push({
          startFt,
          endFt,
          lengthFt: endFt - startFt
        });
      }
    }

    return overlaps;
  }

  function spacingSumIntervals(intervals) {
    return (Array.isArray(intervals) ? intervals : []).reduce((sum, item) => {
      return sum + Math.max(0, (Number(item.endFt) || 0) - (Number(item.startFt) || 0));
    }, 0);
  }

  function spacingGraphicsModel(data) {
    const source = data && typeof data === "object" ? data : {};

    const spanFt = Math.max(1, Number(source.len) || Number(source.protectedLengthFt) || 1);
    const camsRaw = Number(source.cams) || Number(source.cameraCount) || 1;
    const singleCamera = Number(camsRaw) <= 1 || !!source.singleCamera;
    const cameraCount = singleCamera ? 1 : Math.max(2, Math.round(camsRaw));

    const spacingFt = singleCamera
      ? 0
      : Math.max(0, Number(source.spacing) || Number(source.spacingFt) || (spanFt / Math.max(cameraCount, 1)));

    const usableWidthFt = Math.max(0, Number(source.usableWidth) || Number(source.spacingUsableWidthFt) || 0);
    const rawWidthFt = Math.max(
      usableWidthFt,
      Number(source.rawWidth) || Number(source.spacingRawCoverageWidthFt) || usableWidthFt || 0
    );

    const requestedOverlapPct = Number.isFinite(Number(source.appliedOverlapTargetPct))
      ? Number(source.appliedOverlapTargetPct)
      : Number.isFinite(Number(source.ovPct))
        ? Number(source.ovPct)
        : Number.isFinite(Number(source.spacingOverlapTargetPct))
          ? Number(source.spacingOverlapTargetPct)
          : 0;

    const actualOverlapFt = singleCamera || rawWidthFt <= 0
      ? 0
      : Math.max(0, rawWidthFt - spacingFt);

    const actualOverlapPct = singleCamera || rawWidthFt <= 0
      ? 0
      : (actualOverlapFt / rawWidthFt) * 100;

    const totalCenterRun = singleCamera ? 0 : spacingFt * (cameraCount - 1);
    const startCenter = singleCamera
      ? spanFt / 2
      : Math.max(0, Math.min(spanFt, (spanFt - totalCenterRun) / 2));

    const cameras = [];
    const rawIntervals = [];

    for (let i = 0; i < cameraCount; i += 1) {
      const centerFt = singleCamera ? spanFt / 2 : startCenter + (spacingFt * i);
      const footprintStartFt = centerFt - (rawWidthFt / 2);
      const footprintEndFt = centerFt + (rawWidthFt / 2);

      cameras.push({
        label: "Cam " + (i + 1),
        centerFt,
        footprintStartFt,
        footprintEndFt
      });

      rawIntervals.push({
        startFt: footprintStartFt,
        endFt: footprintEndFt,
        lengthFt: footprintEndFt - footprintStartFt
      });
    }

    const coverageSegments = spacingMergeIntervals(rawIntervals, spanFt);
    const gapSegments = spacingGapIntervals(coverageSegments, spanFt);
    const overlapSegments = singleCamera ? [] : spacingOverlapIntervals(rawIntervals, spanFt);

    const coveredSpanFt = Math.max(0, Math.min(spanFt, spacingSumIntervals(coverageSegments)));
    const uncoveredSpanFt = Math.max(0, Math.min(spanFt, spacingSumIntervals(gapSegments)));

    return {
      tool: "camera-spacing",
      title: "Isometric spacing layout",
      subtitle: singleCamera
        ? "Single-camera coverage check. Overlap is not applied without an adjacent camera."
        : "Camera Spacing layout rendered through the ScopedLabs Graphics Engine.",
      stageKicker: "ISO / CAMERA SPACING",
      hideOverlapSegmentLabels: true,
      protectedSpanFt: spanFt,
      coveredSpanFt,
      uncoveredSpanFt,
      targetOverlapPct: singleCamera ? 0 : requestedOverlapPct,
      actualOverlapPct,
      actualSpacingFt: singleCamera ? 0 : spacingFt,
      depthLabel: "Coverage depth (visual)",
      cameras,
      coverageSegments,
      overlapSegments,
      gapSegments,
      footer: singleCamera
        ? "Single-camera scenario: validate coverage width before continuing downstream."
        : "Spacing intent: validate continuity in Blind Spot Check before accepting final seam coverage."
    };
  }

  function spacingVisualSvg(data, visualOptions = {}) {
    const legacyFallback = () => spacingLegacyVisualSvg(data);

    const frameOptions = visualOptions && typeof visualOptions === "object" ? visualOptions : {};
    const frameSize = frameOptions.size || "tall";
    const frameMaxWidth = frameOptions.maxWidth || (frameSize === "report" ? "860px" : "1040px");
    const frameMinHeight = Object.prototype.hasOwnProperty.call(frameOptions, "minHeight")
      ? frameOptions.minHeight
      : (frameSize === "report" ? "" : "760px");
    const frameClassName = frameOptions.className || (
      frameSize === "report"
        ? "sl-spacing-iso-svg sl-spacing-iso-svg--report"
        : "sl-spacing-iso-svg sl-spacing-iso-svg--page"
    );
    const shouldTuneFrame = frameOptions.tune !== false;
    const tuneSelector = frameOptions.selector || ".sl-spacing-iso-svg--page";

    try {
      if (!window.ScopedLabsGraphics || typeof window.ScopedLabsGraphics.render !== "function") {
        if (window.ScopedLabsDiagnostics && typeof window.ScopedLabsDiagnostics.report === "function") {
          window.ScopedLabsDiagnostics.report({
            code: "SL-GFX-CAMERASPACING-ENGINE-MISSING",
            severity: "warn",
            engine: "graphics",
            renderer: "camera-layout-iso",
            tool: "camera-spacing",
            message: "ScopedLabsGraphics was not available. Camera Spacing used its legacy renderer.",
            fallback: "legacy Camera Spacing SVG"
          });
        }

        return legacyFallback();
      }

      const model = spacingGraphicsModel(data);
      const rendered = window.ScopedLabsGraphics.render("camera-layout-iso", model);

      if (typeof rendered === "string" && rendered.includes('data-sl-renderer="camera-layout-iso"')) {
        const framed = typeof window.ScopedLabsGraphics.frameSvg === "function"
          ? window.ScopedLabsGraphics.frameSvg(rendered, {
              tool: "camera-spacing",
              renderer: "camera-layout-iso",
              size: frameSize,
              className: frameClassName,
              maxWidth: frameMaxWidth,
              minHeight: frameMinHeight
            })
          : rendered.replace(
              "<svg ",
              '<svg class="' + frameClassName + '" style="width:100%;max-width:' + frameMaxWidth + ';height:auto;display:block;margin:0 auto;" '
            );

        if (
          shouldTuneFrame &&
          typeof window.ScopedLabsGraphics.tuneFrame === "function" &&
          typeof window.requestAnimationFrame === "function"
        ) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              try {
                window.ScopedLabsGraphics.tuneFrame(document, {
                  selector: tuneSelector,
                  size: frameSize,
                  maxWidth: frameMaxWidth,
                  minHeight: frameMinHeight
                });
              } catch (error) {
                if (window.ScopedLabsDiagnostics && typeof window.ScopedLabsDiagnostics.report === "function") {
                  window.ScopedLabsDiagnostics.report({
                    code: "SL-GFX-CAMERASPACING-FRAME-TUNE",
                    severity: "warn",
                    engine: "graphics",
                    renderer: "camera-layout-iso",
                    tool: "camera-spacing",
                    message: "Camera Spacing graphics frame tune could not complete.",
                    cause: error && error.message
                  });
                }
              }
            });
          });
        }

        return framed;
      }

      if (window.ScopedLabsDiagnostics && typeof window.ScopedLabsDiagnostics.report === "function") {
        window.ScopedLabsDiagnostics.report({
          code: "SL-GFX-CAMERASPACING-BAD-RENDER",
          severity: "error",
          engine: "graphics",
          renderer: "camera-layout-iso",
          tool: "camera-spacing",
          message: "Graphics Engine returned fallback or invalid SVG. Camera Spacing used its legacy renderer.",
          fallback: "legacy Camera Spacing SVG"
        });
      }

      return legacyFallback();
    } catch (error) {
      if (window.ScopedLabsDiagnostics && typeof window.ScopedLabsDiagnostics.report === "function") {
        window.ScopedLabsDiagnostics.report({
          code: "SL-GFX-CAMERASPACING-ADAPTER-EXCEPTION",
          severity: "error",
          engine: "graphics",
          renderer: "camera-layout-iso",
          tool: "camera-spacing",
          message: "Camera Spacing graphics adapter threw an exception.",
          cause: error && error.message,
          fallback: "legacy Camera Spacing SVG"
        });
      }

      return legacyFallback();
    }
  }


  function spacingActualOverlapPercent(data) {
    const rawWidth = Number(data?.rawWidth);
    const spacing = Number(data?.spacing);

    if (Number(data?.cams) <= 1 || data?.singleCamera) return null;
    if (!Number.isFinite(rawWidth) || rawWidth <= 0 || !Number.isFinite(spacing)) return null;

    return Math.max(0, ((rawWidth - spacing) / rawWidth) * 100);
  }

  function spacingExportRow(label, value) {
    return '<tr><td>' + escapeHtml(label) + '</td><td>' + escapeHtml(value) + '</td></tr>';
  }

  function spacingExportSourceNotes(data) {
    const notes = [];
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const sourceMode = sourceModeForCurrentResult(manualOverrideMeta);
    const assistantMeta = assistantScenarioMetadata();
    const area = getActiveSpacingArea();
    const coverageReservePct = num(area?.usableCoverageReservePct ?? area?.coverageReservePct ?? area?.overlapTargetPct);
    const actualOverlapPct = spacingActualOverlapPercent(data);
    const appliedOverlapPct = Number(data?.appliedOverlapTargetPct ?? data?.ovPct);

    if (data.singleCamera) {
      notes.push("Single-camera coverage check: camera-to-camera overlap is not applicable because there is no adjacent camera.");
    }

    if (Number.isFinite(coverageReservePct)) {
      notes.push("Coverage Area reserve was carried as context only (" + fmtPct(coverageReservePct, 1) + ") and was not imported as Camera Spacing overlap.");
    } else {
      notes.push("Coverage Area reserve and Camera Spacing overlap are treated as separate assumptions.");
    }

    if (!data.singleCamera && (appliedOverlapPct >= 35 || (Number.isFinite(actualOverlapPct) && actualOverlapPct >= 45))) {
      notes.push("High-overlap branch: spacing continuity may pass, but the branch should be treated as valid but camera-heavy unless redundancy is intentional.");
    }

    if (assistantMeta && assistantMeta.label) {
      notes.push("Assistant branch: " + assistantMeta.label + ".");
    } else {
      notes.push("Assistant branch: baseline/current inputs.");
    }

    notes.push("Source mode: " + sourceMode + ".");

    return notes;
  }

  function renderSpacingExportSection(data) {
    if (!els.exportSection || !data || !data.ok) return;

    const actualOverlapPct = spacingActualOverlapPercent(data);
    const appliedOverlapPct = data.singleCamera ? null : Number(data.appliedOverlapTargetPct ?? data.ovPct);
    const requestedOverlapPct = Number(data.requestedOverlapTargetPct ?? data.ovPct);
    const assistantMeta = assistantScenarioMetadata();
    const sourceMode = sourceModeForCurrentResult(getManualOverrideMetadata(data));
    const notes = spacingExportSourceNotes(data);

    const summaryRows = [
      ["Protected run", fmtFt(data.len)],
      ["Distance to target plane", fmtFt(data.dist)],
      ["Horizontal FOV", fmt(data.hfov, 1) + " deg"],
      ["Raw camera footprint", fmtFt(data.rawWidth)],
      ["Usable spacing width", fmtFt(data.usableWidth)],
      ["Camera count", String(data.cams)],
      ["Actual spacing", data.singleCamera ? "N/A - single-camera coverage check" : fmtFt(data.spacing)],
      ["Spacing classification", data.spacingClass],
      ["Spacing status", data.status],
      ["Requested overlap target", data.singleCamera ? "N/A" : fmtPct(requestedOverlapPct, 1)],
      ["Applied overlap target", data.singleCamera ? "N/A" : fmtPct(appliedOverlapPct, 1)],
      ["Actual overlap achieved", data.singleCamera ? "N/A" : (Number.isFinite(actualOverlapPct) ? fmtPct(actualOverlapPct, 1) : "N/A")],
      ["Assistant branch", assistantMeta && assistantMeta.label ? assistantMeta.label : "Baseline/current inputs"],
      ["Source mode", sourceMode]
    ];

    const tableRows = summaryRows
      .map(([label, value]) => spacingExportRow(label, value))
      .join("");
const exportNarrativeHtml = spacingExportNarrativeHtml(data, notes, sourceMode, assistantMeta);

    els.exportSection.innerHTML =
      '<div data-export-svg>' + spacingVisualSvg(data, {
        size: "report",
        maxWidth: "860px",
        minHeight: "",
        tune: false,
        className: "sl-spacing-iso-svg sl-spacing-iso-svg--report"
      }) + '</div>' +
      '<table>' +
        '<thead><tr><th>Metric</th><th>Value</th></tr></thead>' +
        '<tbody>' + tableRows + '</tbody>' +
      '</table>' +
      exportNarrativeHtml;
  }


  function spacingExportMiniTable(title, rows) {
    const cleanRows = (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.length >= 2 && row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== "");

    if (!cleanRows.length) return "";

    return '' +
      '<div style="border:1px solid #d8dee6;border-radius:10px;padding:12px 14px;margin:0 0 12px 0;break-inside:avoid;">' +
        '<h3 style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px 0;color:#111827;">' + escapeHtml(title) + '</h3>' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
          '<thead><tr><th style="padding:7px 8px;border-bottom:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Metric</th><th style="padding:7px 8px;border-bottom:1px solid #d8dee6;background:#f7faf8;text-align:right;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Value</th></tr></thead>' +
          '<tbody>' +
            cleanRows.map((row) => {
              return '<tr>' +
                '<td style="padding:5px 8px 5px 0;border-bottom:1px solid #eef2f7;color:#4b5563;width:52%;">' + escapeHtml(row[0]) + '</td>' +
                '<td style="padding:5px 0 5px 8px;border-bottom:1px solid #eef2f7;color:#111827;font-weight:700;text-align:right;">' + escapeHtml(row[1]) + '</td>' +
              '</tr>';
            }).join("") +
          '</tbody>' +
        '</table>' +
      '</div>';
  }

  function spacingExportParagraph(title, text) {
    const clean = String(text || "").trim();
    if (!clean) return "";

    return '' +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;break-inside:avoid;font-size:12.5px;">' +
        '<thead><tr><th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Section</th><th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Detail</th></tr></thead>' +
        '<tbody>' +
          '<tr>' +
            '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">' + escapeHtml(title) + ':</td>' +
            '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' + escapeHtml(clean) + '</td>' +
          '</tr>' +
        '</tbody>' +
      '</table>';
  }

  function spacingExportNarrativeHtml(data, notes = [], sourceMode = "pipeline", assistantMeta = null) {
    const source = data && typeof data === "object" ? data : {};
    const overlapValue = source.singleCamera ? "N/A" : fmtPct(source.ovPct, 1);
    const statusValue = source.status || source.spacingClass || "N/A";
    const assistantLabel = assistantMeta && assistantMeta.label ? assistantMeta.label : "Baseline/current inputs";

    const primaryRows = [
      ["Camera count", String(source.cams || "N/A")],
      ["Actual spacing", fmtFt(source.spacing)],
      ["Usable width", fmtFt(source.usableWidth)],
      ["Layout status", statusValue]
    ];

    const inputRows = [
      ["Protected run", fmtFt(source.len)],
      ["Distance to target", fmtFt(source.dist)],
      ["Horizontal FOV", fmt(source.hfov, 1) + " deg"],
      ["Overlap reference", overlapValue]
    ];

    const continuityRows = [
      ["Raw coverage width", fmtFt(source.rawWidth)],
      ["Spacing source mode", sourceMode],
      ["Assistant branch", assistantLabel],
      ["Single-camera mode", source.singleCamera ? "Yes - overlap not applicable" : "No"]
    ];

    const noteList = (Array.isArray(notes) ? notes : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return '' +
      '<div class="spacing-export-clean-summary" style="margin-top:14px;break-inside:avoid;">' +
        '<h2 style="font-size:16px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 10px 0;color:#111827;">Camera Spacing Summary</h2>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:2px;">' +
          spacingExportMiniTable("Primary result", primaryRows) +
          spacingExportMiniTable("Design inputs", inputRows) +
          spacingExportMiniTable("Continuity context", continuityRows) +
        '</div>' +
        spacingExportParagraph("Engineering interpretation", source.interpretation) +
        spacingExportParagraph("Dominant constraint", source.dominantConstraint) +
        spacingExportParagraph("Recommended action", source.guidance) +
        (noteList.length
          ? '<table style="width:100%;border-collapse:collapse;margin:0 0 12px 0;break-inside:avoid;font-size:12.5px;">' +
              '<thead><tr><th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Section</th><th style="padding:7px 10px;border:1px solid #d8dee6;background:#f7faf8;text-align:left;color:#111827;font-size:11px;letter-spacing:.06em;text-transform:uppercase;">Detail</th></tr></thead>' +
              '<tbody>' +
                '<tr>' +
                  '<td style="width:30%;padding:9px 10px;border:1px solid #d8dee6;background:#f7faf8;color:#111827;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:top;">Additional notes:</td>' +
                  '<td style="padding:9px 10px;border:1px solid #d8dee6;color:#111827;line-height:1.55;vertical-align:top;">' +
                    noteList.map((item) => '&bull; ' + escapeHtml(item)).join("<br>") +
                  '</td>' +
                '</tr>' +
              '</tbody>' +
            '</table>'
          : '') +
      '</div>';
  }


  function clearSpacingExportSection() {
    if (els.exportSection) els.exportSection.innerHTML = "";
  }

  function miniCard(label, value) {
    return '<div class="spacing-mini-card"><span class="spacing-mini-label">' + escapeHtml(label) + '</span><span class="spacing-mini-value">' + escapeHtml(value) + '</span></div>';
  }

  function dominantDriverHtml(data) {
    let headline = "Spacing and overlap are balanced.";
    let copy = "The current camera-to-camera spacing is staying inside the usable footprint while preserving practical camera-to-camera overlap target.";

    if (data.spacingClass === "Wide Spacing") {
      headline = "Spacing is creating continuity pressure.";
      copy = "The actual spacing is too close to the edge of the usable footprint. Increase reserve before treating this as a clean handoff.";
    } else if (data.spacingClass === "Tight Spacing") {
      headline = "Camera count is carrying the design.";
      copy = "The layout is conservative. That may be acceptable, but it can create budget, installation, and device-count pressure.";
    }

    return '<div class="spacing-section-kicker">Dominant Driver</div>' +
      '<h4 class="spacing-section-title">' + escapeHtml(headline) + '</h4>' +
      '<p class="spacing-section-copy">' + escapeHtml(copy) + '</p>' +
      '<ul class="spacing-action-list">' +
        '<li>Use Blind Spot Check before accepting final seam continuity.</li>' +
        '<li>Recalculate upstream if the distance or HFOV assumption is not real-world accurate.</li>' +
        '<li>Choose an assistant branch only when that branch matches the design priority.</li>' +
      '</ul>';
  }

  function branchHtml(scenario) {
    if (!scenario || !scenario.canApply) {
      return '<div class="spacing-branch-item">' +
        '<div><span class="spacing-branch-title">' + escapeHtml(scenario?.label || "Unavailable Branch") + '</span>' +
        '<span class="spacing-branch-meta">Unavailable for current geometry</span>' +
        '<span class="spacing-branch-note">' + escapeHtml(scenario?.note || "This branch cannot be calculated from the current inputs.") + '</span></div>' +
        '<button class="btn" type="button" disabled>Unavailable</button>' +
      '</div>';
    }

    return '<div class="spacing-branch-item">' +
      '<div>' +
        '<span class="spacing-branch-title">' + escapeHtml(scenario.label) + '</span>' +
        '<span class="spacing-branch-meta">' + escapeHtml(scenario.cams + " cameras | " + fmtFt(scenario.spacing) + " spacing | " + fmtPct(scenario.ovPct, 1) + " overlap") + '</span>' +
        '<span class="spacing-branch-note">' + escapeHtml(scenario.note) + '</span>' +
      '</div>' +
      '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">Apply Branch</button>' +
    '</div>';
  }

  function recommendationHtml(data, scenarios) {
    const recommendation = recommendationForAssistant(data, scenarios);
    const source = activeAssistantScenario ? "Assistant Scenario" : (getManualOverrideMetadata(data).length ? "Manual Override" : "Clean Pipeline");

    return '<div class="spacing-section-kicker">Recommendation</div>' +
      '<h4 class="spacing-section-title">Recommended path forward</h4>' +
      '<p class="spacing-section-copy">' + escapeHtml(recommendation) + '</p>' +
      '<ul class="spacing-action-list">' +
        '<li><strong>Pipeline integrity:</strong> ' + escapeHtml(source) + '</li>' +
        '<li><strong>Next validation:</strong> Continue to Blind Spot Check with the final spacing result.</li>' +
        '<li><strong>Correction path:</strong> If this result is risky, adjust overlap, reduce distance, widen usable FOV, or increase camera count.</li>' +
      '</ul>';
  }

  function renderAssistantModeNote() {
    return;
  }

  

  

  

  

  

  

  

  

  function spacingPressureMetric(data) {
    const ratio = Number(data?.ratio);
    const ovPct = Number(data?.ovPct);
    const cams = Number(data?.cams);
    const singleCamera = cams <= 1 || data?.singleCamera;

    const gapExposure = singleCamera ? 0 : (ratio > 0.92 ? Math.min((ratio - 0.92) * 220, 100) : 0);
    const compression = singleCamera ? 0 : (ratio < 0.72 ? Math.min((0.72 - ratio) * 180, 100) : 0);
    const overlapPressure = singleCamera ? 0 : (Number.isFinite(ovPct) ? Math.min(Math.max(ovPct, 0), 100) : 0);
    const cameraPressure = singleCamera ? 0 : (Number.isFinite(cams) ? Math.min(Math.max((cams - 1) * 12, 0), 100) : 0);

    return {
      gapExposure,
      compression,
      overlapPressure,
      cameraPressure
    };
  }

  function spacingPressureBarHtml(label, value, display, help) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
    const tone = safeValue <= 20 ? "healthy" : safeValue <= 35 ? "watch" : "risk";

    return '' +
      '<div class="spacing-pressure-row ' + tone + '">' +
        '<div class="spacing-pressure-head">' +
          '<strong>' + escapeHtml(label) + '</strong>' +
          '<span>' + escapeHtml(display) + '</span>' +
        '</div>' +
        '<div class="spacing-pressure-track" aria-label="' + escapeHtml(label) + '">' +
          '<div class="spacing-pressure-fill" style="width:' + safeValue.toFixed(0) + '%"></div>' +
        '</div>' +
        '<p>' + escapeHtml(help) + '</p>' +
      '</div>';
  }

  function spacingPressureGraphHtml(data) {
    const metric = spacingPressureMetric(data);
    const singleCamera = Number(data?.cams) <= 1 || data?.singleCamera;

    if (singleCamera) {
      return '' +
        '<div class="spacing-advice-card spacing-pressure-card">' +
          '<div class="spacing-section-kicker">Single-camera coverage check</div>' +
          '<h4 class="spacing-section-title">Camera-to-camera overlap is not applicable.</h4>' +
          '<p class="spacing-section-copy">Review usable width, reserve margin, and Blind Spot Check instead of adjacent-camera overlap pressure.</p>' +
        '</div>';
    }

    return '' +
      '<div class="spacing-advice-card spacing-pressure-card">' +
        '<div class="spacing-section-kicker">Pressure Graph</div>' +
        '<h4 class="spacing-section-title">What is pushing this spacing result?</h4>' +
        '<p class="spacing-section-copy">These bars show which design pressure is driving the current status. Use them to decide whether to shorten spacing, relax efficiency, change the overlap target, or revisit upstream geometry.</p>' +
        spacingPressureBarHtml(
          "Gap Exposure Pressure",
          metric.gapExposure,
          data.ratio > 0 ? fmtPct(Math.max((data.ratio - 0.92) * 100, 0), 1) : "0.0%",
          "Higher pressure means actual spacing is getting too close to the usable footprint."
        ) +
        spacingPressureBarHtml(
          "Spacing Compression",
          metric.compression,
          data.ratio > 0 ? fmtPct(Math.max((0.72 - data.ratio) * 100, 0), 1) : "0.0%",
          "Higher pressure means the layout is overlap-heavy and likely camera-count intensive."
        ) +
        spacingPressureBarHtml(
          "Camera-to-Camera Overlap Pressure",
          metric.overlapPressure,
          fmtPct(data.ovPct, 1),
          "Higher pressure means camera-to-camera overlap target is reducing usable coverage width."
        ) +
        spacingPressureBarHtml(
          "Camera Count Pressure",
          metric.cameraPressure,
          String(data.cams) + " cameras",
          "Higher pressure means the spacing plan is becoming more camera-intensive."
        ) +
      '</div>';
  }

  function spacingScenarioDecisionHelp(scenario) {
    if (!scenario || !scenario.canApply) {
      return "This option is unavailable because the current geometry cannot support it without changing upstream assumptions.";
    }

    if (scenario.id === "continuity-priority") {
      return "Choose this when the current layout is too close to seam/gap risk and continuity matters more than camera-count efficiency.";
    }

    if (scenario.id === "balanced-layout") {
      return "Choose this when the layout is workable but you want a cleaner middle-ground before Blind Spot Check.";
    }

    if (scenario.id === "camera-count-efficiency") {
      return "Choose this only when reducing camera count matters and you are willing to verify the added risk downstream.";
    }

    if (scenario.id === "widen-effective-view") {
      return "Choose this only if the actual lens/camera choice can support a wider view without sacrificing required detail.";
    }

    return "Choose this when the branch matches the project priority better than the current baseline.";
  }

  function spacingWhatIfControlsHtml(data) {
    return '' +
      '<div class="spacing-advice-card spacing-control-panel">' +
        '<div class="spacing-section-kicker">User-Controlled What-If</div>' +
        '<h4 class="spacing-section-title">Try your own correction</h4>' +
        '<p class="spacing-section-copy">Use these fields to test a custom correction instead of only using predefined branches. Applying this check updates the actual tool inputs and recalculates the assistant as an assisted scenario.</p>' +
        '<div class="spacing-control-grid">' +
          '<label class="field"><span class="label">Perimeter Length (ft)</span><input data-spacing-whatif="len" type="number" min="1" step="1" value="' + escapeHtml(String(Number(data.len || 0).toFixed(0))) + '"></label>' +
          '<label class="field"><span class="label">Distance (ft)</span><input data-spacing-whatif="dist" type="number" min="0.1" step="0.1" value="' + escapeHtml(String(Number(data.dist || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">HFOV (deg)</span><input data-spacing-whatif="hfov" type="number" min="1" max="179" step="0.1" value="' + escapeHtml(String(Number(data.hfov || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">Overlap Target (%)</span><input data-spacing-whatif="ovPct" type="number" min="0" max="95" step="0.1" value="' + escapeHtml(String(Number(data.ovPct || 0).toFixed(1))) + '"></label>' +
        '</div>' +
        '<div class="btn-row" style="margin-top: 12px;">' +
          '<button id="spacingApplyCustomScenario" class="btn btn-primary" type="button">Apply Custom Spacing Check</button>' +
        '</div>' +
        '<p class="spacing-section-copy"><strong>Correction hints:</strong> reduce distance, widen HFOV, increase overlap enough to force safer spacing, or shorten the protected run if the imported perimeter assumption is wrong.</p>' +
      '</div>';
  }

  function readSpacingWhatIfInputs() {
    if (!els.assistant) return null;

    const values = {};
    els.assistant.querySelectorAll("[data-spacing-whatif]").forEach((input) => {
      values[input.dataset.spacingWhatif] = Number(input.value);
    });

    return values;
  }

  function applyCustomSpacingScenario(data) {
    const changes = readSpacingWhatIfInputs();
    if (!changes) return;

    const scenario = makeSpacingDesignScenario(
      data,
      "custom-spacing-check",
      "Custom Spacing Check",
      "User-defined correction using the assistant what-if controls.",
      changes,
      "Use this when the predefined branches do not match the real project constraint.",
      "Apply Custom Spacing Check",
      true
    );

    applyAssistantScenario(scenario);
  }

  function spacingDesignControlHtml(data, scenarios) {
    return '' +
      '<div class="spacing-advice-card">' +
        '<div class="spacing-section-kicker">Guided Correction Branches</div>' +
        '<h4 class="spacing-section-title">Choose why you are changing the design</h4>' +
        '<p class="spacing-section-copy">Each branch has a different design intent. Use the explanation before applying a correction so the result is traceable downstream.</p>' +
        '<div class="spacing-branch-list">' +
          scenarios.map((scenario) => {
            const disabled = !scenario || !scenario.canApply;
            const result = disabled ? "Unavailable for current geometry" : spacingScenarioSummary(scenario);
            const button = disabled
              ? '<button class="btn spacing-assistant-apply" type="button" disabled>Unavailable</button>'
              : '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">' + escapeHtml(scenario.actionLabel || "Apply Branch") + '</button>';

            return '' +
              '<div class="spacing-branch-item">' +
                '<div>' +
                  '<strong>' + escapeHtml(scenario.label || "Design Branch") + '</strong>' +
                  '<p>' + escapeHtml(spacingScenarioDecisionHelp(scenario)) + '</p>' +
                  '<p><strong>What changes:</strong> ' + escapeHtml(spacingControlFieldsLabel(scenario)) + '</p>' +
                  '<p><strong>Expected result:</strong> ' + escapeHtml(result) + '</p>' +
                '</div>' +
                button +
              '</div>';
          }).join("") +
        '</div>' +
      '</div>' +
      spacingWhatIfControlsHtml(data);
  }

  

  function spacingLensActionList(items) {
    return '<ul class="lens-action-list">' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul>';
  }

  

  

  

  

  

  

  

  

  

  

  function spacingLensCustomControlHtml(data) {
    return '' +
      '<div class="lens-advice-card spacing-lens-custom">' +
        '<div class="lens-design-kicker">Custom design check</div>' +
        '<h4 class="lens-design-title">Try your own spacing correction</h4>' +
        '<p class="lens-design-copy">Use this when the preset branches do not match the real field constraint. Applying the custom check updates the actual tool inputs.</p>' +
        '<div class="spacing-control-grid">' +
          '<label class="field"><span class="label">Perimeter Length (ft)</span><input data-spacing-whatif="len" type="number" min="1" step="1" value="' + escapeHtml(String(Number(data.len || 0).toFixed(0))) + '"></label>' +
          '<label class="field"><span class="label">Distance (ft)</span><input data-spacing-whatif="dist" type="number" min="0.1" step="0.1" value="' + escapeHtml(String(Number(data.dist || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">HFOV (deg)</span><input data-spacing-whatif="hfov" type="number" min="1" max="179" step="0.1" value="' + escapeHtml(String(Number(data.hfov || 0).toFixed(1))) + '"></label>' +
          '<label class="field"><span class="label">Overlap Target (%)</span><input data-spacing-whatif="ovPct" type="number" min="0" max="95" step="0.1" value="' + escapeHtml(String(Number(data.ovPct || 0).toFixed(1))) + '"></label>' +
        '</div>' +
        '<div class="btn-row" style="margin-top:12px;"><button id="spacingApplyCustomScenario" class="btn btn-primary" type="button">Apply Custom Spacing Check</button></div>' +
      '</div>';
  }

  

  

  

  function spacingLensPillLabel(scenario) {
    if (!scenario) return "Custom Design";

    if (scenario.id === "continuity-priority") return "Continuity Check";
    if (scenario.id === "balanced-layout") return "Balanced Layout";
    if (scenario.id === "camera-count-efficiency") return "Efficiency Check";
    if (scenario.id === "widen-effective-view") return "Wider HFOV Check";
    if (scenario.id === "custom-spacing-check") return "Custom What-If";

    return String(scenario.label || "Design Path")
      .replace("Apply Correction: ", "")
      .replace("Apply Branch: ", "")
      .replace("Recalculate: ", "")
      .replace("Try ", "");
  }

  function spacingAssistantStatusPillHtml(data) {
    const status = String(data?.status || "WATCH").toUpperCase();
    const cls = status === "HEALTHY" ? "healthy" : status === "RISK" ? "risk" : "watch";
    return '<div class="lens-design-status ' + cls + '">' + escapeHtml(status) + '</div>';
  }

  function spacingLensTopPillsHtml(data, scenarios) {
    const currentId = activeAssistantScenario?.id || "current";

    const button = (id, label, active) => {
      return '' +
        '<button class="lens-scenario-pill' + (active ? ' active' : '') + '"' +
        ' type="button" data-spacing-pill="' + escapeHtml(id) + '">' +
        escapeHtml(label) +
        '</button>';
    };

    const pills = [
      button("current", "Custom Design", currentId === "current")
    ];

    scenarios.forEach((scenario) => {
      if (!scenario || !scenario.canApply) return;
      pills.push(button(scenario.id, spacingLensPillLabel(scenario), currentId === scenario.id));
    });

    return '<div class="lens-scenario-pill-row">' + pills.join("") + '</div>';
  }

  function spacingLensMiniCard(label, value, note) {
    return '' +
      '<div class="lens-mini-card">' +
        '<div class="lens-mini-label">' + escapeHtml(label) + '</div>' +
        '<span class="lens-mini-value">' + escapeHtml(value) + '</span>' +
        (note ? '<div class="spacing-lens-note">' + escapeHtml(note) + '</div>' : '') +
      '</div>';
  }

  function spacingLensProblemLabel(data) {
    if (Number(data.cams) <= 1 || data.singleCamera) return "Single-camera coverage check";
    if (data.spacingClass === "Wide Spacing") return "Spacing gap risk";
    if (data.spacingClass === "Tight Spacing") return "Camera count pressure";
    if (Number(data.ovPct) >= 25) return "Overlap compression";
    return "Spacing balance";
  }

  function spacingLensRecommendation(data) {
    if (Number(data.cams) <= 1 || data.singleCamera) {
      return "Camera-to-camera overlap is not applicable for a one-camera area. Validate usable width and edge margin in Blind Spot Check.";
    }
    if (data.spacingClass === "Wide Spacing") {
      return "Reduce spacing pressure by shortening spacing, increasing camera count, or revisiting upstream geometry before Blind Spot Check.";
    }

    if (data.spacingClass === "Tight Spacing") {
      return "This is likely safe for continuity, but review whether the layout is using more cameras than the project requires.";
    }

    if (Number(data.ovPct) >= 25) {
      return "The spacing works, but camera-to-camera overlap target is high. Confirm the reserve is intentional before carrying it forward.";
    }

    return "This scenario is within current planning guardrails. Validate the field gap condition in Blind Spot Check before relying on it.";
  }

  function spacingLensPressureMetrics(data) {
    const ratio = Number(data?.ratio);
    const ovPct = Number(data?.ovPct);
    const cams = Number(data?.cams);
    const singleCamera = cams <= 1 || data?.singleCamera;

    const gapPressure = singleCamera ? 0 : (ratio > 0.92 ? Math.min((ratio - 0.92) * 220, 100) : 0);
    const compressionPressure = singleCamera ? 0 : (ratio < 0.72 ? Math.min((0.72 - ratio) * 180, 100) : 0);
    const overlapPressure = singleCamera ? 0 : (Number.isFinite(ovPct) ? Math.min(Math.max(ovPct, 0), 100) * 0.72 : 0);
    const cameraPressure = singleCamera ? 0 : (Number.isFinite(cams) ? Math.min(Math.max((cams - 1) * 10, 0), 100) : 0);

    return {
      gapPressure,
      compressionPressure,
      overlapPressure,
      cameraPressure
    };
  }

  function spacingLensPressureScore(model) {
    if (!model) return 100;
    const m = spacingLensPressureMetrics(model);
    return Math.max(m.gapPressure, m.compressionPressure, m.overlapPressure, m.cameraPressure);
  }

  function spacingLensDriverBarHtml(label, value, display) {
    const safe = Math.max(0, Math.min(100, Number(value) || 0));
    return '' +
      '<div class="spacing-lens-driver-row">' +
        '<div class="spacing-lens-driver-head">' +
          '<strong>' + escapeHtml(label) + '</strong>' +
          '<span>' + escapeHtml(display) + '</span>' +
        '</div>' +
        '<div class="spacing-lens-driver-track">' +
          '<div class="spacing-lens-driver-fill" style="width:' + safe.toFixed(0) + '%"></div>' +
        '</div>' +
      '</div>';
  }

  function spacingLensDriverBarsHtml(data) {
    const m = spacingLensPressureMetrics(data);
    const singleCamera = Number(data?.cams) <= 1 || data?.singleCamera;

    if (singleCamera) {
      return '' +
        '<div class="lens-advice-card spacing-lens-driver-card">' +
          '<div class="lens-design-kicker">Single-camera coverage check</div>' +
          '<h4 class="lens-design-title">Camera-to-camera overlap is not applicable.</h4>' +
          '<p class="lens-design-copy">This area has one camera, so validate usable footprint, edge margin, and blind spots instead of overlap pressure.</p>' +
        '</div>';
    }

    return '' +
      '<div class="lens-advice-card spacing-lens-driver-card">' +
        '<div class="lens-design-kicker">Dominant driver</div>' +
        '<h4 class="lens-design-title">' + escapeHtml(spacingLensProblemLabel(data)) + ' is creating planning pressure.</h4>' +
        '<p class="lens-design-copy">The bars show which spacing condition is pushing the current result toward Watch or Risk.</p>' +
        spacingLensDriverBarHtml("Gap exposure", m.gapPressure, fmtPct(Math.max((data.ratio - 0.92) * 100, 0), 1)) +
        spacingLensDriverBarHtml("Spacing compression", m.compressionPressure, fmtPct(Math.max((0.72 - data.ratio) * 100, 0), 1)) +
        spacingLensDriverBarHtml("Overlap pressure", m.overlapPressure, fmtPct(data.ovPct, 1)) +
        spacingLensDriverBarHtml("Camera count pressure", m.cameraPressure, String(data.cams) + " cameras") +
      '</div>';
  }

  function spacingLensSelectedResultHtml(data) {
    return '' +
      '<div class="lens-advice-card spacing-lens-result-card">' +
        '<div class="lens-design-kicker">Selected scenario result</div>' +
        '<h4 class="lens-design-title">' + escapeHtml(data.cams + (data.cams === 1 ? " camera" : " cameras")) + '</h4>' +
        '<p class="lens-design-copy">This spacing plan uses ' + escapeHtml(fmtFt(data.spacing)) + ' actual spacing against ' + escapeHtml(fmtFt(data.usableWidth)) + ' usable width.</p>' +
        '<div class="lens-target-strip">' +
          spacingLensMiniCard("Actual spacing", fmtFt(data.spacing), "Center spacing.") +
          spacingLensMiniCard("Usable width", fmtFt(data.usableWidth), "After overlap.") +
          spacingLensMiniCard("Overlap", fmtPct(data.ovPct, 1), "Current target.") +
          spacingLensMiniCard("Status", data.status, "Combined status.") +
        '</div>' +
      '</div>';
  }

  function spacingLensScenarioPressure(item) {
    if (!item || !item.canApply) return 95;
    return spacingLensPressureScore(item);
  }

  function spacingLensScenarioChartSvg(data, scenarios) {
    const candidates = [
      { label: "Custom Design", score: spacingLensPressureScore(data) }
    ];

    scenarios.filter((scenario) => scenario && scenario.canApply).slice(0, 4).forEach((scenario) => {
      candidates.push({
        label: spacingLensPillLabel(scenario),
        score: spacingLensScenarioPressure(scenario)
      });
    });

    const width = 900;
    const height = 250;
    const left = 64;
    const right = 36;
    const top = 28;
    const bottom = 52;
    const plotW = width - left - right;
    const plotH = height - top - bottom;

    const xStep = candidates.length > 1 ? plotW / (candidates.length - 1) : plotW;
    const points = candidates.map((item, index) => {
      const x = left + (xStep * index);
      const y = top + plotH - ((Math.max(0, Math.min(100, item.score)) / 100) * plotH);
      return { x, y };
    });

    const polyline = points.map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");

    return '' +
      '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Planning pressure by scenario">' +
        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + plotH + '" fill="rgba(125,255,152,.08)"></rect>' +
        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + (plotH * .62).toFixed(1) + '" fill="rgba(255,211,79,.08)"></rect>' +
        '<rect x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + (plotH * .34).toFixed(1) + '" fill="rgba(255,96,88,.09)"></rect>' +
        '<text x="' + (width - right) + '" y="' + (top + 12) + '" text-anchor="end" fill="rgba(226,232,240,.75)" font-size="12" font-weight="800">Lower is better</text>' +
        '<polyline points="' + polyline + '" fill="none" stroke="#7dff98" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
        points.map((p, index) => {
          const item = candidates[index];
          const score = Math.round(item.score);
          const fill = score <= 25 ? "#7dff98" : score <= 60 ? "#ffd34f" : "#ff8f88";

          return '' +
            '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="7" fill="' + fill + '" stroke="rgba(255,255,255,.80)" stroke-width="2"></circle>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 16).toFixed(1) + '" text-anchor="middle" fill="' + fill + '" font-size="13" font-weight="950">' + score + '</text>' +
            '<text x="' + p.x.toFixed(1) + '" y="' + (height - 20) + '" text-anchor="middle" fill="rgba(226,232,240,.82)" font-size="11" font-weight="800">' + escapeHtml(item.label.slice(0, 18)) + '</text>';
        }).join("") +
      '</svg>';
  }

  

  function spacingLensCheckCardsHtml(data) {
    const coverageCheck = data.spacingClass === "Wide Spacing"
      ? "No - spacing is too close to the usable limit"
      : "Yes - spacing is inside the usable range";

    const reserveCheck = data.spacingClass === "Tight Spacing"
      ? "Conservative - camera-heavy"
      : data.ovPct >= 25
        ? "High reserve - review efficiency"
        : "Practical reserve";

    const designPath = data.spacingClass === "Wide Spacing"
      ? "Apply correction before Blind Spot"
      : "Continue to Blind Spot validation";

    return '' +
      '<div class="spacing-lens-check-grid">' +
        '<div class="lens-advice-card"><div class="lens-design-kicker">Coverage check</div><strong>' + escapeHtml(coverageCheck) + '</strong><p>Does spacing stay inside the effective usable footprint?</p></div>' +
        '<div class="lens-advice-card"><div class="lens-design-kicker">Reserve check</div><strong>' + escapeHtml(reserveCheck) + '</strong><p>Is the camera-to-camera overlap target helping continuity without over-compressing layout?</p></div>' +
        '<div class="lens-advice-card"><div class="lens-design-kicker">Design path</div><strong>' + escapeHtml(designPath) + '</strong><p>Use this to decide whether to correct now or validate downstream.</p></div>' +
      '</div>';
  }

  function spacingLensDesignTargetsHtml(data) {
    const maxSpacing = data.usableWidth;
    const mainBlocker = spacingLensProblemLabel(data);
    const message = data.status === "HEALTHY"
      ? "This scenario is within current planning guardrails. Validate blind spots before relying on it."
      : "This scenario needs correction or downstream validation before it should be treated as healthy.";

    return '' +
      '<div class="lens-advice-card spacing-lens-design-targets">' +
        '<div class="lens-design-head spacing-lens-inner-head">' +
          '<div>' +
            '<div class="lens-design-kicker">Design targets / path to acceptable</div>' +
            '<h4 class="lens-design-title">What needs to change to reach a usable design?</h4>' +
            '<p class="lens-design-copy">This section explains whether changing overlap is enough, or whether the real blocker is distance, HFOV, protected length, or camera count.</p>' +
          '</div>' +
          '<div class="lens-design-status healthy">Design Targets</div>' +
        '</div>' +
        '<div class="lens-target-strip">' +
          spacingLensMiniCard("Max spacing / camera", fmtFt(maxSpacing), "Actual spacing should stay at or below this.") +
          spacingLensMiniCard("Suggested cameras", String(data.cams), "Based on usable width and protected run.") +
          spacingLensMiniCard("Camera-to-camera overlap target", fmtPct(data.ovPct, 1), "Reserve applied before spacing is calculated.") +
          spacingLensMiniCard("Main blocker", mainBlocker, "Primary condition shaping this scenario.") +
        '</div>' +
        '<div class="spacing-lens-banner">' + escapeHtml(message) + '</div>' +
      '</div>';
  }

  function spacingLensScenarioComparisonHtml(data, scenarios) {
    const active = activeAssistantScenario ? activeAssistantScenario.label : "Custom Design";
    const pressure = Math.round(spacingLensPressureScore(data));

    return '' +
      '<div class="lens-advice-card spacing-lens-comparison">' +
        '<div class="lens-design-head spacing-lens-inner-head">' +
          '<div>' +
            '<div class="lens-design-kicker">Scenario comparison</div>' +
            '<h4 class="lens-design-title">Scenario pressure comparison</h4>' +
            '<p class="lens-design-copy">The chart compares planning pressure across available spacing paths. Lower is better; healthy spacing and useful reserve should stay near the bottom band.</p>' +
          '</div>' +
          '<div class="lens-design-status healthy">Scenario Analytics</div>' +
        '</div>' +
        '<div class="lens-target-strip">' +
          spacingLensMiniCard("Selected path", active, "Scenario currently selected.") +
          spacingLensMiniCard("Spacing class", data.spacingClass, "Current spacing classification.") +
          spacingLensMiniCard("Coverage status", data.status, "Status from the current model.") +
          spacingLensMiniCard("Pressure", pressure + " / 100", "Scenario comparison value.") +
        '</div>' +
        '<div class="spacing-lens-chart-stage">' + spacingLensScenarioChartSvg(data, scenarios) + '</div>' +
        '<div class="spacing-lens-banner">' + escapeHtml(spacingLensRecommendation(data)) + '</div>' +
      '</div>';
  }

  function spacingLensBranchControlsHtml(data, scenarios) {
    return '' +
      '<div class="lens-advice-card spacing-lens-controls">' +
        '<div class="lens-design-head spacing-lens-inner-head">' +
          '<div>' +
            '<div class="lens-design-kicker">Correction controls</div>' +
            '<h4 class="lens-design-title">Choose a spacing path</h4>' +
            '<p class="lens-design-copy">Each action changes the actual spacing inputs, recalculates the tool, and marks the result as an assisted scenario for downstream handoff.</p>' +
          '</div>' +
          '<div class="lens-design-status healthy">Correction Path</div>' +
        '</div>' +
        '<div class="spacing-lens-control-list">' +
          scenarios.map((scenario) => {
            const disabled = !scenario || !scenario.canApply;
            const singleCameraScenario = Number(scenario?.cams) <= 1 || scenario?.singleCamera || Number(scenario?.targetCams) <= 1;
            const result = disabled
              ? "Unavailable for current geometry"
              : [
                  Number.isFinite(scenario.cams) ? scenario.cams + " camera" + (scenario.cams === 1 ? "" : "s") : null,
                  Number.isFinite(scenario.spacing) ? (singleCameraScenario ? fmtFt(scenario.spacing) + " coverage check" : fmtFt(scenario.spacing) + " spacing") : null,
                  singleCameraScenario ? "overlap N/A" : (Number.isFinite(scenario.ovPct) ? fmtPct(scenario.ovPct, 1) + " overlap" : null)
                ].filter(Boolean).join(" | ");

            const button = disabled
              ? '<button class="btn spacing-assistant-apply" type="button" disabled>Unavailable</button>'
              : '<button class="btn btn-primary spacing-assistant-apply" type="button" data-spacing-scenario="' + escapeHtml(scenario.id) + '">' + escapeHtml(scenario.actionLabel || "Apply Branch") + '</button>';

            return '' +
              '<div class="spacing-lens-control-row">' +
                '<div>' +
                  '<strong>' + escapeHtml(spacingLensPillLabel(scenario)) + '</strong>' +
                  '<p>' + escapeHtml(scenario.intent || "Review this branch against the current design priority.") + '</p>' +
                  '<p><strong>Expected result:</strong> ' + escapeHtml(result) + '</p>' +
                '</div>' +
                button +
              '</div>';
          }).join("") +
        '</div>' +
      '</div>';
  }

  function spacingLensCarryForwardHtml(data) {
    return '' +
      '<div class="lens-advice-card spacing-lens-carry">' +
        '<div class="lens-design-head spacing-lens-inner-head">' +
          '<div>' +
            '<div class="lens-design-kicker">Pipeline / report carry-forward</div>' +
            '<h4 class="lens-design-title">Use the selected scenario in the next sanity check</h4>' +
            '<p class="lens-design-copy">Blind Spot Check should validate the selected camera count, spacing, overlap, distance, and HFOV before the layout is treated as reliable.</p>' +
          '</div>' +
          '<div class="lens-design-status healthy">Live Shadow Path</div>' +
        '</div>' +
        '<div class="lens-target-strip">' +
          spacingLensMiniCard("Cameras", String(data.cams), "Sent to Blind Spot Check.") +
          spacingLensMiniCard("Spacing", fmtFt(data.spacing), "Center-to-center spacing.") +
          spacingLensMiniCard("Distance", fmtFt(data.dist), "Target-plane distance.") +
          spacingLensMiniCard("HFOV", fmt(data.hfov, 1) + " deg", "Horizontal field of view.") +
        '</div>' +
      '</div>';
  }

  

  

  function spacingLensApplyCustomScenario(data) {
    const changes = spacingLensReadCustomInputs();
    const scenario = spacingLensMakeCustomScenario(data, changes);
    if (!scenario) return;
    applyAssistantScenario(scenario);
  }

  function renderSpacingAssistant(data) {
    if (!els.assistant) return;

    setSpacingAssistantBaseline(data);

    const scenarioBase = getSpacingAssistantBranchBase(data);
    latestAssistantScenarios = buildAssistantScenarios(scenarioBase || data);

    if (!window.ScopedLabsDesignAssistant || typeof window.ScopedLabsDesignAssistant.render !== "function") {
      els.assistant.hidden = false;
      els.assistant.innerHTML = '<div class="muted">Design Assistant engine did not load.</div>';
      return;
    }

    window.ScopedLabsDesignAssistant.render(factoryCameraSpacingAssistantModel(data));
  }

  function applyAssistantScenario(scenario) {
    if (!scenario || !scenario.canApply) return;

    customAssistantNotice = null;

    const changes = scenario.changes || {};

    activeAssistantScenario = {
      id: scenario.id,
      label: scenario.label,
      intent: scenario.intent,
      changes,
      targetCams: scenario.targetCams || changes.targetCams || scenario.cams,
      len: scenario.len,
      dist: scenario.dist,
      hfov: scenario.hfov,
      ovPct: scenario.ovPct,
      cams: scenario.cams,
      spacing: scenario.spacing,
      usableWidth: scenario.usableWidth,
      rawWidth: scenario.rawWidth,
      ratio: scenario.ratio,
      spacingClass: scenario.spacingClass,
      note: scenario.note
    };

    if (Number.isFinite(Number(changes.len))) {
      els.len.value = String(Number(Number(changes.len).toFixed(1)));
      delete manualFlowOverrides.len;
    }

    if (Number.isFinite(Number(changes.dist))) {
      els.dist.value = String(Number(Number(changes.dist).toFixed(1)));
      delete manualFlowOverrides.dist;
    }

    if (Number.isFinite(Number(changes.hfov))) {
      els.hfov.value = String(Number(Number(changes.hfov).toFixed(1)));
      delete manualFlowOverrides.hfov;
    }

    if (Number.isFinite(Number(changes.ovPct))) {
      els.ov.value = String(Number(Number(changes.ovPct).toFixed(1)));
      delete manualFlowOverrides.ov;
    } else if (Number.isFinite(Number(scenario.ovPct))) {
      els.ov.value = String(Number(Number(scenario.ovPct).toFixed(1)));
      delete manualFlowOverrides.ov;
    }

    renderFlowNote();
    calc();
  }

  function getActiveSpacingArea() {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.getActiveArea !== "function") return null;

    try {
      return api.getActiveArea();
    } catch {
      return null;
    }
  }

  function applyAreaPlanInputs() {
    const area = getActiveSpacingArea();
    if (!area) return false;

    const len = num(area.protectedLengthFt);
    const dist = num(area.distanceToTargetPlaneFt);
    const hfov = num(area.assumedHfovDeg);
    const spacingOverlapTargetPct = num(area.spacingOverlapTargetPct);
    const coverageReservePct = num(area.usableCoverageReservePct ?? area.coverageReservePct ?? area.overlapTargetPct);

    if (Number.isFinite(len) && len > 0) {
      captureImportedFlowValue("len", len);
      els.len.value = String(Number(len.toFixed(1)));
    }

    if (Number.isFinite(dist) && dist > 0) {
      captureImportedFlowValue("dist", dist);
      els.dist.value = String(Number(dist.toFixed(1)));
    }

    if (Number.isFinite(hfov) && hfov > 0) {
      captureImportedFlowValue("hfov", hfov);
      els.hfov.value = String(Number(hfov.toFixed(1)));
    }

    if (Number.isFinite(spacingOverlapTargetPct) && spacingOverlapTargetPct >= 0 && spacingOverlapTargetPct <= 95) {
      captureImportedFlowValue("ov", spacingOverlapTargetPct);
      els.ov.value = String(Number(spacingOverlapTargetPct.toFixed(1)));
    }

    return true;
  }

  function activeAreaFlowContextHtml() {
    const area = getActiveSpacingArea();
    if (!area) return "";

    const coverageReservePct = num(area.usableCoverageReservePct ?? area.coverageReservePct ?? area.overlapTargetPct);

    const parts = [];
    if (area.name) parts.push("Current Area: <strong>" + escapeHtml(area.name) + "</strong>");
    if (Number.isFinite(num(area.protectedLengthFt))) parts.push("Protected length: <strong>" + fmtFt(num(area.protectedLengthFt)) + "</strong>");
    if (Number.isFinite(num(area.distanceToTargetPlaneFt))) parts.push("Distance: <strong>" + fmtFt(num(area.distanceToTargetPlaneFt)) + "</strong>");
    if (Number.isFinite(num(area.assumedHfovDeg))) parts.push("Assumed HFOV: <strong>" + fmt(num(area.assumedHfovDeg), 1) + "&deg;</strong>");
    if (Number.isFinite(coverageReservePct)) parts.push("Coverage reserve: <strong>" + fmtPct(coverageReservePct, 1) + "</strong> <span class=\"muted\">(not spacing overlap)</span>");

    if (!parts.length) return "";

    return '<strong>Area Context</strong><br>' +
      parts.join(" | ") +
      '<br><span class="muted">Camera Spacing imports protected length from Area Planner. Editing it here creates a local what-if branch for this area.</span>';
  }

  function renderAreaOnlyFlowContext() {
    const html = activeAreaFlowContextHtml();
    if (!html || !els.flowNote) return false;

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = html + renderManualOverrideNote();
    return true;
  }

  function applyDefaults() {
    els.len.value = String(DEFAULTS.len);
    els.dist.value = String(DEFAULTS.dist);
    els.hfov.value = String(DEFAULTS.hfov);
    els.ov.value = String(DEFAULTS.ov);

    applyAreaPlanInputs();
  }

  function clearDownstream() {
    [
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

  function renderFlowNote() {
    const areaContext = activeAreaFlowContextHtml();
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS.spacing,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow Context",
      intro: "This step converts effective single-camera coverage into real camera-to-camera spacing along the protected perimeter."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) {
      renderAreaOnlyFlowContext();
      return;
    }

    const prev = flow.data || {};
    const dist = num(prev.dist);
    const hfov = num(prev.hfov);
    const coverageReservePct = num(prev.usableCoverageReservePct ?? prev.coverageReservePct ?? prev.ovPct);
    const effWidth = num(prev.effWidth);
    const width = num(prev.width);
    captureImportedFlowValue("dist", dist);
    captureImportedFlowValue("hfov", hfov);

    if (canApplyFlowInputs()) {
      if (Number.isFinite(dist) && dist > 0) els.dist.value = String(Number(dist.toFixed(1)));
      if (Number.isFinite(hfov) && hfov > 0) els.hfov.value = String(Number(hfov.toFixed(1)));
    }

    const parts = [];
    if (Number.isFinite(effWidth) && effWidth > 0) parts.push(`Effective width: <strong>${fmtFt(effWidth)}</strong>`);
    if (Number.isFinite(width) && width > 0) parts.push(`Raw width: <strong>${fmtFt(width)}</strong>`);
    if (Number.isFinite(dist) && dist > 0) parts.push(`Distance: <strong>${fmtFt(dist)}</strong>`);
    if (Number.isFinite(hfov) && hfov > 0) parts.push(`HFOV: <strong>${fmt(hfov, 1)}&deg;</strong>`);
    if (Number.isFinite(coverageReservePct) && coverageReservePct >= 0) parts.push(`Coverage reserve: <strong>${fmtPct(coverageReservePct, 1)}</strong> <span class="muted">(not spacing overlap)</span>`);

    if (parts.length || areaContext) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        ${areaContext ? areaContext + "<br><br>" : ""}
        <strong>Flow Context</strong><br>
        ${parts.join(" | ")}
        ${renderManualOverrideNote()}
      `;
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    assistantBaselineData = null;
    activeAssistantScenario = null;
    customAssistantNotice = null;
    if (clearFlow) {
      sessionStorage.removeItem(FLOW_KEYS.spacing);
      clearDownstream();
    }

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS.spacing,
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter valid values and press Calculate."
    });
    hideSpacingAssistant();
    clearSpacingExportSection();

    renderFlowNote();
  }

  function getInputs() {
    const len = num(els.len.value);
    const dist = num(els.dist.value);
    const hfov = num(els.hfov.value);
    const ovPct = num(els.ov.value);

    if (
      !Number.isFinite(len) || len <= 0 ||
      !Number.isFinite(dist) || dist <= 0 ||
      !Number.isFinite(hfov) || hfov <= 0 || hfov >= 180 ||
      !Number.isFinite(ovPct) || ovPct < 0 || ovPct > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, len, dist, hfov, ovPct };
  }

  function classifySpacing(ratio) {
    if (ratio < 0.8) return "Tight Spacing";
    if (ratio <= 1.05) return "Balanced Spacing";
    return "Wide Spacing";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const rawWidth = 2 * Math.tan(deg2rad(input.hfov / 2)) * input.dist;
    const explicitTargetCams = activeAssistantScenario && Number.isFinite(Number(activeAssistantScenario.targetCams))
      ? Math.max(1, Math.round(Number(activeAssistantScenario.targetCams)))
      : null;
    const rawCoversSingleCamera = !explicitTargetCams && rawWidth >= input.len;
    const appliedOverlapTargetPct = (rawCoversSingleCamera || explicitTargetCams === 1) ? 0 : input.ovPct;
    const usableWidth = rawWidth * (1 - (appliedOverlapTargetPct / 100));

    const cams = explicitTargetCams || (rawCoversSingleCamera ? 1 : Math.max(1, Math.ceil(input.len / usableWidth)));
    const spacing = input.len / cams;
    const ratio = usableWidth > 0 ? spacing / usableWidth : 0;

    const isSingleCamera = cams <= 1;
    const gapExposureMetric = ratio > 1 ? Math.min((ratio - 1) * 250, 100) : 0;
    const compressionMetric = isSingleCamera ? 0 : (ratio < 1 ? Math.min((1 - ratio) * 100, 100) : 0);
    const reserveMetric = isSingleCamera ? 0 : appliedOverlapTargetPct;

    const metrics = [
      {
        label: "Gap Exposure",
        value: gapExposureMetric,
        displayValue: ratio > 1 ? fmtPct((ratio - 1) * 100, 1) : "0.0%"
      },
      {
        label: "Spacing Compression",
        value: compressionMetric,
        displayValue: ratio < 1 ? fmtPct((1 - ratio) * 100, 1) : "0.0%"
      },
      {
        label: isSingleCamera ? "Single-Camera Overlap Reference" : "Camera-to-Camera Overlap Target",
        value: reserveMetric,
        displayValue: isSingleCamera ? "N/A" : fmtPct(appliedOverlapTargetPct, 1)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(gapExposureMetric, compressionMetric, reserveMetric),
      metrics,
      healthyMax: 20,
      watchMax: 35
    });

    const spacingClass = classifySpacing(ratio);

    let interpretation = isSingleCamera
      ? `With a usable camera footprint of about ${fmtFt(usableWidth)}, the ${fmtFt(input.len)} protected run fits within one camera under the current coverage assumptions. Camera-to-camera overlap is not applicable because there is no adjacent camera to overlap.`
      : `With a usable camera footprint of about ${fmtFt(usableWidth)}, a ${fmtFt(input.len)} perimeter needs ${cams} cameras to maintain the requested overlap. That produces an actual spacing of about ${fmtFt(spacing)} between camera centers.`;

    if (isSingleCamera) {
      interpretation += ` Use Coverage Area reserve and Blind Spot Check to validate edge margin, aim tolerance, and any remaining gap risk.`;
    } else if (spacingClass === "Wide Spacing") {
      interpretation += ` The layout is running wider than the usable footprint, which raises the chance of soft gaps or outright blind zones once real mounting tolerances and scene geometry are applied.`;
    } else if (spacingClass === "Tight Spacing") {
      interpretation += ` The layout is conservative and overlap-heavy, which reduces blind-spot risk but drives camera count and compresses coverage efficiency.`;
    } else {
      interpretation += ` The spacing is balanced against usable width, which is typically the healthiest tradeoff between continuity and camera efficiency.`;
    }

    let dominantConstraint = "";
    if (isSingleCamera) {
      dominantConstraint = "Single-camera coverage is the active condition. Camera-to-camera overlap pressure is not applicable; the key question is whether the usable footprint and reserve margin cover the protected run cleanly.";
    } else if (spacingClass === "Wide Spacing") {
      dominantConstraint = "Gap exposure is the dominant limiter. Camera spacing is outrunning the usable footprint, so weak zones between views become the first operational risk.";
    } else if (spacingClass === "Tight Spacing") {
      dominantConstraint = "Spacing compression is the dominant limiter. The design is safe from a continuity standpoint, but it is consuming more cameras than the coverage width strictly requires.";
    } else if (input.ovPct >= 25) {
      dominantConstraint = "Camera-to-camera overlap target is the dominant limiter. The spacing still works, but the reserve target is starting to compress usable width enough to affect layout efficiency.";
    } else {
      dominantConstraint = "The layout is balanced. Spacing, usable width, and reserve target are still working together without a strong limiting factor.";
    }

    let guidance = "";
    if (isSingleCamera) {
      guidance = "Continue to Blind Spot Check as a single-camera coverage validation. Use Coverage Area reserve, usable width, and field geometry to confirm the single view still closes the protected span.";
    } else if (spacingClass === "Wide Spacing") {
      guidance = "Reduce spacing, widen usable footprint, or increase camera count before treating this as a final layout. Then use Blind Spot Check to confirm the remaining continuity risk.";
    } else if (spacingClass === "Tight Spacing") {
      guidance = "This layout is conservative. Review whether the camera-to-camera overlap target or camera count can be relaxed without creating coverage gaps, then confirm in Blind Spot Check.";
    } else {
      guidance = "Spacing is in a practical range. Continue to Blind Spot Check next to verify that the geometry still closes gaps across the protected span.";
    }

    return {
      ok: true,
      ...input,
      rawWidth,
      usableWidth,
      cams,
      spacing,
      ratio,
      spacingClass,
      singleCamera: isSingleCamera,
      explicitTargetCameraCount: explicitTargetCams,
      targetCameraCount: explicitTargetCams || cams,
      requestedOverlapTargetPct: input.ovPct,
      appliedOverlapTargetPct,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function updateActiveAreaFromSpacing(data) {
    const api = window.ScopedLabsPhysicalSecurityAreaState;
    if (!api || typeof api.updateActiveAreaResult !== "function") return;

    const manualOverrideMeta = getManualOverrideMetadata(data);
    const assistantScenarioMeta = assistantScenarioMetadata();
    const sourceMode = sourceModeForCurrentResult(manualOverrideMeta);

    api.updateActiveAreaResult({
      status: "IN PROGRESS",
      protectedLengthFt: data.len,
      distanceToTargetPlaneFt: data.dist,
      assumedHfovDeg: data.hfov,
      overlapTargetPct: data.singleCamera ? null : data.appliedOverlapTargetPct,
      spacingOverlapTargetPct: data.singleCamera ? null : data.appliedOverlapTargetPct,
      spacingOverlapApplicable: !data.singleCamera,
      cameraCount: data.cams,
      spacingFt: data.spacing,
      spacingRatio: data.ratio,
      spacingClass: data.spacingClass,
      spacingSingleCamera: !!data.singleCamera,
      spacingStatus: data.status,
      spacingRawCoverageWidthFt: data.rawWidth,
      spacingUsableWidthFt: data.usableWidth,
      spacingSourceMode: sourceMode,
      spacingAssistantSelected: !!assistantScenarioMeta,
      spacingAssistantScenario: assistantScenarioMeta,
      spacingManualOverrides: manualOverrideMeta,
      spacingInterpretation: data.interpretation,
      spacingDominantConstraint: data.dominantConstraint,
      spacingGuidance: data.guidance,
      spacingUpdatedAt: new Date().toISOString()
    });
  }

  

  function writeFlow(data) {
    const manualOverrideMeta = getManualOverrideMetadata(data);
    const assistantScenarioMeta = assistantScenarioMetadata();
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.spacing, {
      category: CATEGORY,
      step: STEP,
      data: {
        len: data.len,
        dist: data.dist,
        hfov: data.hfov,
        ovPct: data.ovPct,
        rawWidth: data.rawWidth,
        usableWidth: data.usableWidth,
        cams: data.cams,
        spacing: data.spacing,
        ratio: data.ratio,
        spacingClass: data.spacingClass,
        singleCamera: !!data.singleCamera,
        interpretation: data.interpretation,
        guidance: data.guidance,
        sourceMode: sourceModeForCurrentResult(manualOverrideMeta),
        scenarioMode: assistantScenarioMeta ? assistantScenarioMeta.label : null,
        assistantSelected: !!assistantScenarioMeta,
        assistantScenario: assistantScenarioMeta,
        manualOverrides: manualOverrideMeta
      }
    });
  

    updateActiveAreaFromSpacing(data);
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    hideSpacingAssistant();
    clearSpacingExportSection();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      summaryRows: [
        { label: "Raw Coverage Width", value: fmtFt(data.rawWidth) },
        { label: "Usable Width", value: fmtFt(data.usableWidth) },
        { label: "Camera Count", value: `${data.cams}` },
        { label: "Actual Spacing", value: fmtFt(data.spacing) }
      ],
      derivedRows: [
        { label: "Perimeter Length", value: fmtFt(data.len, 0) },
        { label: "Distance to Target", value: fmtFt(data.dist) },
        { label: "Horizontal FOV", value: `${fmt(data.hfov, 1)}°` },
        { label: data.singleCamera ? "Overlap Reference" : "Overlap", value: data.singleCamera ? "N/A" : fmtPct(data.ovPct, 1) },
        { label: "Spacing Ratio", value: fmt(data.ratio, 2) },
        { label: "Spacing Classification", value: data.spacingClass },
        { label: "Source Mode", value: sourceModeForCurrentResult(getManualOverrideMetadata(data)) },
        ...(activeAssistantScenario ? [{ label: "Assistant Branch", value: activeAssistantScenario.label }] : [])
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    writeFlow(data);
    renderSpacingAssistant(data);
    renderSpacingExportSection(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function reset() {
    assistantBaselineData = null;
    customAssistantNotice = null;
    resetFlowOverrideState();
    clearAssistantScenario();
    hideSpacingAssistant();
    applyDefaults();
    renderFlowNote();
    invalidate({ clearFlow: true });
  }

  function bind() {
    ["len", "dist", "hfov", "ov"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => {
        clearAssistantScenario();
        markFlowInputOverride(id);
        renderFlowNote();
        invalidate({ clearFlow: true });
      });
      el.addEventListener("change", () => {
        clearAssistantScenario();
        markFlowInputOverride(id);
        renderFlowNote();
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
    applyDefaults();
    bind();
    renderFlowNote();
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